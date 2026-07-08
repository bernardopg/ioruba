use std::ffi::c_void;
use std::{mem, ptr};

use super::common::{volume_percent, MasterOnlyBackend};
use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError,
    AudioInventory, ControlAction, ControlActionOutcome,
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
    match default_output_device() {
        Ok(device) => {
            let current_percent = read_current_scalar(device)
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
    let device = default_output_device()?;
    Ok(BACKEND.apply_batch(request, |normalized| set_master_volume(device, normalized)))
}

pub fn dispatch_control_action(action: ControlAction) -> Result<ControlActionOutcome, AudioError> {
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

fn read_current_scalar(device: AudioObjectId) -> Option<f32> {
    read_scalar(device, K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN).or_else(|| read_scalar(device, 1))
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

/// Writes the scalar to a single channel element.
/// `Ok(true)` when written, `Ok(false)` when the element has no settable
/// volume scalar, `Err` on an actual CoreAudio failure.
fn write_scalar(device: AudioObjectId, element: u32, value: f32) -> Result<bool, OsStatus> {
    let address = volume_address(element);
    if unsafe { AudioObjectHasProperty(device, &address) } == 0 {
        return Ok(false);
    }

    let mut settable: Boolean = 0;
    let settable_status = unsafe { AudioObjectIsPropertySettable(device, &address, &mut settable) };
    if settable_status != 0 || settable == 0 {
        return Ok(false);
    }

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
        Ok(true)
    } else {
        Err(status)
    }
}

fn set_master_volume(device: AudioObjectId, normalized: f64) -> Result<(), AudioError> {
    let scalar = normalized.clamp(0.0, 1.0) as f32;

    // Prefer the master element; fall back to per-channel scalars when the
    // device only exposes them (common on multi-channel outputs).
    match write_scalar(device, K_AUDIO_OBJECT_PROPERTY_ELEMENT_MAIN, scalar) {
        Ok(true) => return Ok(()),
        Ok(false) => {}
        Err(status) => {
            return Err(AudioError::CommandFailed(format!(
                "CoreAudio: failed to set master volume (OSStatus {status})"
            )))
        }
    }

    let mut wrote_any = false;
    let mut last_error: Option<OsStatus> = None;
    for channel in 1..=MAX_VOLUME_CHANNELS {
        match write_scalar(device, channel, scalar) {
            Ok(true) => wrote_any = true,
            Ok(false) => {}
            Err(status) => last_error = Some(status),
        }
    }

    if wrote_any {
        Ok(())
    } else if let Some(status) = last_error {
        Err(AudioError::CommandFailed(format!(
            "CoreAudio: failed to set output volume (OSStatus {status})"
        )))
    } else {
        Err(AudioError::BackendUnavailable(
            "CoreAudio: the default output device exposes no settable volume control".to_string(),
        ))
    }
}
