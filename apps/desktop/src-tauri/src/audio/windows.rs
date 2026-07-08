use std::ptr;

use super::common::{volume_percent, MasterOnlyBackend};
use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError,
    AudioInventory, ControlAction, ControlActionOutcome,
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

pub fn list_audio_inventory() -> AudioInventory {
    match default_endpoint_volume() {
        Ok(endpoint) => {
            let current_percent = endpoint
                .current_volume()
                .map(|volume| format!("Current default output volume: {}%", volume_percent(volume)))
                .unwrap_or_else(|error| {
                    format!("Default output detected, volume read failed: {error}")
                });

            AudioInventory {
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
                    current_percent,
                    "Windows backend currently supports master/default output volume only"
                        .to_string(),
                ],
            }
        }
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
    let endpoint = default_endpoint_volume()?;
    Ok(BACKEND.apply_batch(request, |normalized| endpoint.set_master_volume(normalized)))
}

pub fn dispatch_control_action(action: ControlAction) -> Result<ControlActionOutcome, AudioError> {
    match action {
        ControlAction::Mute => {
            let endpoint = default_endpoint_volume()?;
            let muted = endpoint.toggle_mute()?;
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

struct DefaultEndpointVolume {
    _apartment: ComApartment,
    volume: IAudioEndpointVolume,
}

impl DefaultEndpointVolume {
    fn current_volume(&self) -> Result<f64, AudioError> {
        let scalar = unsafe { self.volume.GetMasterVolumeLevelScalar() }
            .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
        Ok(scalar as f64)
    }

    fn set_master_volume(&self, normalized: f64) -> Result<(), AudioError> {
        let scalar = normalized.clamp(0.0, 1.0) as f32;
        unsafe {
            self.volume
                .SetMasterVolumeLevelScalar(scalar, ptr::null::<GUID>())
        }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))
    }

    fn toggle_mute(&self) -> Result<bool, AudioError> {
        let current = unsafe { self.volume.GetMute() }
            .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
        let next = current.as_bool();
        let next = !next;
        unsafe { self.volume.SetMute(next, ptr::null::<GUID>()) }
            .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
        Ok(next)
    }
}

fn default_endpoint_volume() -> Result<DefaultEndpointVolume, AudioError> {
    let apartment = ComApartment::initialize()?;
    let enumerator: IMMDeviceEnumerator =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
            .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
    let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole) }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;
    let volume = unsafe { device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) }
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;

    Ok(DefaultEndpointVolume {
        _apartment: apartment,
        volume,
    })
}
