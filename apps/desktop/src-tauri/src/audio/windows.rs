use std::ptr;
use std::sync::mpsc::{self, Sender};
use std::sync::OnceLock;
use std::thread;

use super::common::{describe_target, volume_percent, MasterOnlyBackend, TtlCache, INVENTORY_TTL};
use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError,
    AudioInventory, AudioTarget, ControlAction, ControlActionOutcome,
};
use windows::{
    core::GUID,
    Win32::{
        Foundation::RPC_E_CHANGED_MODE,
        Media::Audio::Endpoints::IAudioEndpointVolume,
        Media::Audio::{eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator},
        System::Com::{
            CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_MULTITHREADED,
        },
    },
};

const DEFAULT_RENDER_ID: &str = "@DEFAULT_RENDER@";

const BACKEND: MasterOnlyBackend = MasterOnlyBackend {
    platform: "Windows",
    output_id: DEFAULT_RENDER_ID,
};

struct ComApartment {
    should_uninitialize: bool,
}

impl ComApartment {
    fn initialize() -> Result<Self, AudioError> {
        let hr = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };

        if hr.is_ok() {
            return Ok(Self {
                should_uninitialize: true,
            });
        }

        if hr == RPC_E_CHANGED_MODE {
            return Ok(Self {
                should_uninitialize: false,
            });
        }

        Err(AudioError::CommandFailed(format!(
            "Failed to initialize Windows COM audio apartment: {hr:?}"
        )))
    }
}

impl Drop for ComApartment {
    fn drop(&mut self) {
        if self.should_uninitialize {
            unsafe { CoUninitialize() };
        }
    }
}

// ---------------------------------------------------------------------------
// WASAPI worker thread
// ---------------------------------------------------------------------------
//
// COM objects have thread affinity, so a cached `IAudioEndpointVolume` cannot
// simply be parked in a `static` and used from whichever thread happens to call
// in: the interface pointer is only valid in the apartment that created it, and
// Tauri commands run on a pool where the caller thread is not stable (and may
// itself already be an STA, which is why `ComApartment` has to tolerate
// `RPC_E_CHANGED_MODE`).
//
// Pinning every WASAPI call to one owned thread makes affinity a non-issue by
// construction: the apartment is entered once, the device handle lives on that
// thread and is never shared, and calls are serialized. It also removes the old
// per-call cost — a full `CoInitializeEx` + `CoCreateInstance` +
// `GetDefaultAudioEndpoint` + `Activate` ran on *every* volume write, i.e. once
// per serial frame during a knob sweep.
//
// The thread is intentionally never joined: it owns a process-lifetime COM
// apartment and parks on `recv()` when idle.

/// Unit of work executed on the WASAPI thread, with exclusive access to its
/// cached state.
type Job = Box<dyn FnOnce(&mut WasapiHost) + Send>;

/// State owned by (and confined to) the WASAPI worker thread.
struct WasapiHost {
    /// Kept alive for the thread's lifetime; `CoUninitialize` runs on the same
    /// thread that initialized the apartment, as COM requires.
    apartment: Result<ComApartment, AudioError>,
    /// Resolved default-output volume interface.
    ///
    /// Expires with `INVENTORY_TTL` rather than living forever, so switching the
    /// default output device is picked up without subscribing to
    /// `IMMNotificationClient`. The cost of being wrong is bounded to one window.
    endpoint: TtlCache<IAudioEndpointVolume>,
}

impl WasapiHost {
    /// The cached endpoint, resolving it first when the entry is cold or stale.
    fn endpoint(&mut self) -> Result<&IAudioEndpointVolume, AudioError> {
        match self.apartment.as_ref() {
            Ok(_) => {}
            Err(error) => return Err(AudioError::CommandFailed(error.to_string())),
        }

        self.endpoint.get_or_try_init(resolve_default_endpoint)
    }

    /// Runs `call` against the cached endpoint, dropping the handle on failure.
    ///
    /// A failing WASAPI call usually means the endpoint died under us (device
    /// unplugged, audio service restarted). Keeping the corpse cached would make
    /// every call fail until the TTL expired, so the next caller re-resolves.
    fn with_endpoint<T>(
        &mut self,
        call: impl FnOnce(&IAudioEndpointVolume) -> Result<T, AudioError>,
    ) -> Result<T, AudioError> {
        let result = call(self.endpoint()?);
        if result.is_err() {
            self.endpoint.invalidate();
        }
        result
    }
}

static WORKER: OnceLock<Sender<Job>> = OnceLock::new();

fn worker() -> &'static Sender<Job> {
    WORKER.get_or_init(|| {
        let (sender, receiver) = mpsc::channel::<Job>();

        thread::Builder::new()
            .name("ioruba-wasapi".to_string())
            .spawn(move || {
                let mut host = WasapiHost {
                    apartment: ComApartment::initialize(),
                    endpoint: TtlCache::new(INVENTORY_TTL),
                };

                // Ends when the sender in the `OnceLock` is dropped, i.e. at
                // process teardown.
                while let Ok(job) = receiver.recv() {
                    job(&mut host);
                }
            })
            .expect("failed to spawn the WASAPI worker thread");

        sender
    })
}

/// Runs `job` on the WASAPI thread and waits for its result.
fn on_wasapi_thread<T, F>(job: F) -> Result<T, AudioError>
where
    F: FnOnce(&mut WasapiHost) -> T + Send + 'static,
    T: Send + 'static,
{
    let (tx, rx) = mpsc::channel();

    worker()
        .send(Box::new(move |host| {
            // A send failure means the caller stopped waiting; the work is done
            // either way and there is nobody left to tell.
            let _ = tx.send(job(host));
        }))
        .map_err(|_| {
            AudioError::BackendUnavailable(
                "The Windows audio worker thread is no longer running".to_string(),
            )
        })?;

    rx.recv().map_err(|_| {
        AudioError::BackendUnavailable(
            "The Windows audio worker thread stopped before answering".to_string(),
        )
    })
}

pub fn list_audio_inventory() -> AudioInventory {
    let volume =
        on_wasapi_thread(|host| host.with_endpoint(current_volume)).and_then(|result| result);

    match volume {
        Ok(volume) => AudioInventory {
            backend: "windows".to_string(),
            applications: Vec::new(),
            sinks: vec![AudioEndpoint {
                name: DEFAULT_RENDER_ID.to_string(),
                description: "Windows default output".to_string(),
            }],
            sources: Vec::new(),
            default_sink: Some(DEFAULT_RENDER_ID.to_string()),
            default_source: None,
            summary: "Windows Core Audio default output is available".to_string(),
            diagnostics: vec![
                format!("Current default output volume: {}%", volume_percent(volume)),
                "Windows backend currently supports master/default output volume only".to_string(),
            ],
        },
        Err(error) => AudioInventory {
            backend: "unsupported".to_string(),
            applications: Vec::new(),
            sinks: Vec::<AudioEndpoint>::new(),
            sources: Vec::<AudioEndpoint>::new(),
            default_sink: None,
            default_source: None,
            summary: "Windows Core Audio backend unavailable".to_string(),
            diagnostics: vec![error.to_string()],
        },
    }
}

pub fn apply_slider_targets_batch(
    request: ApplySliderTargetsRequest,
) -> Result<ApplySliderTargetsResponse, AudioError> {
    // The whole batch runs inside a single hop to the WASAPI thread: the
    // per-slider writes then reuse one resolved endpoint instead of paying a
    // channel round-trip each.
    on_wasapi_thread(move |host| {
        BACKEND.apply_batch(request, |normalized| {
            host.with_endpoint(|endpoint| set_master_volume(endpoint, normalized))
        })
    })
}

pub fn dispatch_control_action(
    action: ControlAction,
    target: Option<AudioTarget>,
) -> Result<ControlActionOutcome, AudioError> {
    match action {
        ControlAction::Mute => {
            // O backend WASAPI só cobre o endpoint padrão. Um alvo específico
            // é recusado explicitamente em vez de silenciosamente virar master,
            // que mutaria o sistema inteiro no lugar do app pedido.
            if let Some(target) = target.as_ref() {
                if !matches!(target, AudioTarget::Master) {
                    return Ok(ControlActionOutcome {
                        action,
                        supported: false,
                        detail: format!(
                            "The Windows backend only controls the default output; {} is not addressable yet",
                            describe_target(target)
                        ),
                    });
                }
            }

            let muted = on_wasapi_thread(|host| host.with_endpoint(toggle_mute))??;

            Ok(ControlActionOutcome {
                action,
                supported: true,
                detail: if muted {
                    "Muted Windows default output".to_string()
                } else {
                    "Unmuted Windows default output".to_string()
                },
            })
        }
        ControlAction::Next | ControlAction::Prev => Ok(ControlActionOutcome {
            action,
            supported: false,
            detail: "Windows media next/prev actions are not implemented yet".to_string(),
        }),
    }
}

fn current_volume(endpoint: &IAudioEndpointVolume) -> Result<f64, AudioError> {
    let scalar = unsafe { endpoint.GetMasterVolumeLevelScalar() }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
    Ok(scalar as f64)
}

fn set_master_volume(endpoint: &IAudioEndpointVolume, normalized: f64) -> Result<(), AudioError> {
    let scalar = normalized.clamp(0.0, 1.0) as f32;
    unsafe { endpoint.SetMasterVolumeLevelScalar(scalar, ptr::null::<GUID>()) }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))
}

fn toggle_mute(endpoint: &IAudioEndpointVolume) -> Result<bool, AudioError> {
    let current = unsafe { endpoint.GetMute() }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
    let next = !current.as_bool();
    unsafe { endpoint.SetMute(next, ptr::null::<GUID>()) }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
    Ok(next)
}

/// Resolves the current default render endpoint. Only ever called on the WASAPI
/// worker thread, which owns the apartment the returned interface belongs to.
fn resolve_default_endpoint() -> Result<IAudioEndpointVolume, AudioError> {
    let enumerator: IMMDeviceEnumerator =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
            .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
    let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole) }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;

    unsafe { device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))
}
