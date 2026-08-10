use std::ffi::c_void;
use std::sync::{Mutex, OnceLock};
use std::{mem, ptr};

use super::common::{volume_percent, MasterOnlyBackend, TtlCache, INVENTORY_TTL};
use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError,
    AudioInventory, AudioTarget, ControlAction, ControlActionOutcome,
};

// CoreAudio is a thin, stable C API, so we bind the small surface we need by
// hand instead of pulling a large `-sys` crate. Only the default output device
// and its volume scalar are required for master volume control.
type AudioObjectId = u32;
type OsStatus = i32;
type Boolean = u8;

#[repr(C)]
struct AudioObjectPropertyAddress {
    selector: u32,
    scope: u32,
    element: u32,
}

const fn four_char_code(code: &[u8; 4]) -> u32 {
    ((code[0] as u32) << 24) | ((code[1] as u32) << 16) | ((code[2] as u32) << 8) | (code[3] as u32)
}

const K_AUDIO_OBJECT_SYSTEM_OBJECT: AudioObjectId = 1;
const K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN: u32 = 0;
const K_AUDIO_OBJECT_PROPERTY_SCOPE_GLOBAL: u32 = four_char_code(b"glob");
const K_AUDIO_OBJECT_PROPERTY_SCOPE_OUTPUT: u32 = four_char_code(b"outp");
const K_AUDIO_HARDWARE_PROPERTY_DEFAULT_OUTPUT_DEVICE: u32 = four_char_code(b"dOut");
const K_AUDIO_DEVICE_PROPERTY_VOLUME_SCALAR: u32 = four_char_code(b"volm");

// Stereo devices expose the master scalar on element 0; many multi-channel
// devices only expose per-channel scalars (1..=N). We scan a small range so a
// default stereo or surround output is covered without over-reaching.
const MAX_VOLUME_CHANNELS: u32 = 8;
const DEFAULT_OUTPUT_ID: &str = "@DEFAULT_OUTPUT@";

const BACKEND: MasterOnlyBackend = MasterOnlyBackend {
    platform: "macOS",
    output_id: DEFAULT_OUTPUT_ID,
};

/// Where a device actually accepts a volume scalar.
///
/// Resolving this is the expensive part of a write: `AudioObjectHasProperty` +
/// `AudioObjectIsPropertySettable` on the master element and, when the device
/// only exposes per-channel controls, on up to `MAX_VOLUME_CHANNELS` more. Doing
/// that probe sweep on every frame of a knob sweep is pure waste — the answer
/// only changes when the device does.
#[derive(Clone, Debug, PartialEq, Eq)]
enum VolumeElements {
    /// Element 0 carries a settable master scalar (typical stereo output).
    Master,
    /// The device only exposes settable per-channel scalars.
    Channels(Vec<u32>),
}

impl VolumeElements {
    /// Elements to write, in order.
    fn write_targets(&self) -> &[u32] {
        match self {
            Self::Master => std::slice::from_ref(&K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN),
            Self::Channels(channels) => channels,
        }
    }

    /// Element to read the current level from.
    fn read_target(&self) -> Option<u32> {
        self.write_targets().first().copied()
    }
}

/// A resolved default output: the device id plus how to drive its volume.
#[derive(Clone, Debug)]
struct OutputDevice {
    id: AudioObjectId,
    elements: VolumeElements,
}

static OUTPUT_CACHE: OnceLock<Mutex<TtlCache<OutputDevice>>> = OnceLock::new();

fn output_cache() -> &'static Mutex<TtlCache<OutputDevice>> {
    OUTPUT_CACHE.get_or_init(|| Mutex::new(TtlCache::new(INVENTORY_TTL)))
}

/// Returns the cached default output, re-resolving when the entry is cold or
/// stale.
///
/// `OutputDevice` is cheap to clone, so the lock is taken twice for a moment
/// each and never held across a CoreAudio call. Two threads racing on an expired
/// entry may both probe; the result is identical, so the duplicate work is
/// preferable to serializing every caller behind the FFI.
fn resolve_output_device() -> Result<OutputDevice, AudioError> {
    if let Ok(guard) = output_cache().lock() {
        if let Some(device) = guard.get() {
            return Ok(device.clone());
        }
    }

    let device = probe_output_device()?;

    if let Ok(mut guard) = output_cache().lock() {
        guard.store(device.clone());
    }

    Ok(device)
}

/// Drops the cached device so the next call re-resolves.
///
/// Called when a CoreAudio write fails: the usual cause is the cached device
/// disappearing (headphones unplugged, output switched), and a stale entry would
/// keep failing until the TTL ran out.
fn invalidate_output_cache() {
    if let Ok(mut guard) = output_cache().lock() {
        guard.invalidate();
    }
}

fn probe_output_device() -> Result<OutputDevice, AudioError> {
    let id = default_output_device()?;

    if is_settable(id, K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN) {
        return Ok(OutputDevice {
            id,
            elements: VolumeElements::Master,
        });
    }

    let channels = (1..=MAX_VOLUME_CHANNELS)
        .filter(|channel| is_settable(id, *channel))
        .collect::<Vec<_>>();

    if channels.is_empty() {
        return Err(AudioError::BackendUnavailable(
            "CoreAudio: the default output device exposes no settable volume control".to_string(),
        ));
    }

    Ok(OutputDevice {
        id,
        elements: VolumeElements::Channels(channels),
    })
}

#[link(name = "CoreAudio", kind = "framework")]
extern "C" {
    fn AudioObjectGetPropertyData(
        in_object_id: AudioObjectId,
        in_address: *const AudioObjectPropertyAddress,
        in_qualifier_data_size: u32,
        in_qualifier_data: *const c_void,
        io_data_size: *mut u32,
        out_data: *mut c_void,
    ) -> OsStatus;

    fn AudioObjectSetPropertyData(
        in_object_id: AudioObjectId,
        in_address: *const AudioObjectPropertyAddress,
        in_qualifier_data_size: u32,
        in_qualifier_data: *const c_void,
        in_data_size: u32,
        in_data: *const c_void,
    ) -> OsStatus;

    fn AudioObjectHasProperty(
        in_object_id: AudioObjectId,
        in_address: *const AudioObjectPropertyAddress,
    ) -> Boolean;

    fn AudioObjectIsPropertySettable(
        in_object_id: AudioObjectId,
        in_address: *const AudioObjectPropertyAddress,
        out_is_settable: *mut Boolean,
    ) -> OsStatus;
}

pub fn list_audio_inventory() -> AudioInventory {
    match resolve_output_device() {
        Ok(device) => {
            let current_percent = read_current_scalar(&device)
                .map(|volume| {
                    format!(
                        "Current default output volume: {}%",
                        volume_percent(volume as f64)
                    )
                })
                .unwrap_or_else(|| "Default output detected, volume read unavailable".to_string());

            AudioInventory {
                backend: "macos".to_string(),
                applications: Vec::new(),
                sinks: vec![AudioEndpoint {
                    name: DEFAULT_OUTPUT_ID.to_string(),
                    description: "macOS default output".to_string(),
                }],
                sources: Vec::new(),
                default_sink: Some(DEFAULT_OUTPUT_ID.to_string()),
                default_source: None,
                summary: "macOS Core Audio default output is available".to_string(),
                diagnostics: vec![
                    current_percent,
                    "macOS backend currently supports master/default output volume only"
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
            summary: "macOS Core Audio backend unavailable".to_string(),
            diagnostics: vec![error.to_string()],
        },
    }
}

pub fn apply_slider_targets_batch(
    request: ApplySliderTargetsRequest,
) -> Result<ApplySliderTargetsResponse, AudioError> {
    // Resolved once for the whole batch, then reused per slider.
    let device = resolve_output_device()?;
    Ok(BACKEND.apply_batch(request, |normalized| {
        set_master_volume(&device, normalized)
    }))
}

pub fn dispatch_control_action(
    action: ControlAction,
    _target: Option<AudioTarget>,
) -> Result<ControlActionOutcome, AudioError> {
    Ok(ControlActionOutcome {
        action,
        supported: false,
        detail: "macOS control actions are not implemented yet".to_string(),
    })
}

fn default_output_device() -> Result<AudioObjectId, AudioError> {
    let address = AudioObjectPropertyAddress {
        selector: K_AUDIO_HARDWARE_PROPERTY_DEFAULT_OUTPUT_DEVICE,
        scope: K_AUDIO_OBJECT_PROPERTY_SCOPE_GLOBAL,
        element: K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN,
    };
    let mut device_id: AudioObjectId = 0;
    let mut size = mem::size_of::<AudioObjectId>() as u32;

    let status = unsafe {
        AudioObjectGetPropertyData(
            K_AUDIO_OBJECT_SYSTEM_OBJECT,
            &address,
            0,
            ptr::null(),
            &mut size,
            &mut device_id as *mut AudioObjectId as *mut c_void,
        )
    };

    if status != 0 {
        return Err(AudioError::CommandFailed(format!(
            "CoreAudio: failed to query the default output device (OSStatus {status})"
        )));
    }
    if device_id == 0 {
        return Err(AudioError::BackendUnavailable(
            "CoreAudio: no default output device is configured".to_string(),
        ));
    }

    Ok(device_id)
}

fn volume_address(element: u32) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress {
        selector: K_AUDIO_DEVICE_PROPERTY_VOLUME_SCALAR,
        scope: K_AUDIO_OBJECT_PROPERTY_SCOPE_OUTPUT,
        element,
    }
}

fn read_current_scalar(device: &OutputDevice) -> Option<f32> {
    read_scalar(device.id, device.elements.read_target()?)
}

/// Whether `element` exists on `device` and accepts a volume scalar write.
fn is_settable(device: AudioObjectId, element: u32) -> bool {
    let address = volume_address(element);
    if unsafe { AudioObjectHasProperty(device, &address) } == 0 {
        return false;
    }

    let mut settable: Boolean = 0;
    let status = unsafe { AudioObjectIsPropertySettable(device, &address, &mut settable) };

    status == 0 && settable != 0
}

fn read_scalar(device: AudioObjectId, element: u32) -> Option<f32> {
    let address = volume_address(element);
    if unsafe { AudioObjectHasProperty(device, &address) } == 0 {
        return None;
    }

    let mut value: f32 = 0.0;
    let mut size = mem::size_of::<f32>() as u32;
    let status = unsafe {
        AudioObjectGetPropertyData(
            device,
            &address,
            0,
            ptr::null(),
            &mut size,
            &mut value as *mut f32 as *mut c_void,
        )
    };

    (status == 0).then_some(value)
}

/// Writes the scalar to a single element that was already probed as settable.
fn write_scalar(device: AudioObjectId, element: u32, value: f32) -> Result<(), OsStatus> {
    let address = volume_address(element);

    let status = unsafe {
        AudioObjectSetPropertyData(
            device,
            &address,
            0,
            ptr::null(),
            mem::size_of::<f32>() as u32,
            &value as *const f32 as *const c_void,
        )
    };

    if status == 0 {
        Ok(())
    } else {
        Err(status)
    }
}

fn set_master_volume(device: &OutputDevice, normalized: f64) -> Result<(), AudioError> {
    let scalar = normalized.clamp(0.0, 1.0) as f32;

    let mut wrote_any = false;
    let mut last_error: Option<OsStatus> = None;
    for element in device.elements.write_targets() {
        match write_scalar(device.id, *element, scalar) {
            Ok(()) => wrote_any = true,
            Err(status) => last_error = Some(status),
        }
    }

    if wrote_any {
        return Ok(());
    }

    // Every write failed: the cached device is very likely stale (unplugged or
    // switched), so force the next call to re-resolve instead of hammering a
    // dead id until the TTL expires.
    invalidate_output_cache();

    Err(AudioError::CommandFailed(format!(
        "CoreAudio: failed to set output volume (OSStatus {})",
        last_error.unwrap_or(0)
    )))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn master_elements_write_and_read_element_zero() {
        let elements = VolumeElements::Master;

        assert_eq!(
            elements.write_targets(),
            &[K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN]
        );
        assert_eq!(
            elements.read_target(),
            Some(K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN)
        );
    }

    #[test]
    fn channel_elements_write_every_channel_and_read_the_first() {
        let elements = VolumeElements::Channels(vec![1, 2, 5]);

        assert_eq!(elements.write_targets(), &[1, 2, 5]);
        assert_eq!(
            elements.read_target(),
            Some(1),
            "reading one channel is enough to report a level"
        );
    }

    #[test]
    fn empty_channel_list_has_nothing_to_read() {
        // `probe_output_device` rejects this case, so it should never reach a
        // read; assert the accessor stays total instead of panicking if it does.
        let elements = VolumeElements::Channels(Vec::new());

        assert!(elements.write_targets().is_empty());
        assert_eq!(elements.read_target(), None);
    }

    #[test]
    fn output_device_clone_is_cheap_and_faithful() {
        // The cache hands out clones so the lock is never held across CoreAudio
        // calls; the clone has to carry the resolved strategy, not re-probe.
        let device = OutputDevice {
            id: 42,
            elements: VolumeElements::Channels(vec![1, 2]),
        };

        let cloned = device.clone();

        assert_eq!(cloned.id, 42);
        assert_eq!(cloned.elements, VolumeElements::Channels(vec![1, 2]));
    }
}
