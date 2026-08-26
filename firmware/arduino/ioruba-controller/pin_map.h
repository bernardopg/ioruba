#ifndef IORUBA_PIN_MAP_H
#define IORUBA_PIN_MAP_H

// Pin maps used by the Ioruba controller. Knobs always occupy the first N
// entries of ANALOG_PINS. Button and encoder maps can be overridden at compile
// time with comma-separated lists, for example:
//
// -DIORUBA_BUTTON_PINS=2,3 -DIORUBA_ENCODER_A_PINS=10 -DIORUBA_ENCODER_B_PINS=11
//
// The sketch validates every enabled pin at compile time: a pin cannot be used
// twice or shared by a knob, button, or encoder channel.

#include <stddef.h>
#include <stdint.h>

#if defined(ARDUINO_AVR_MEGA2560)
constexpr uint8_t ANALOG_PINS[] = {A0, A1, A2,  A3,  A4,  A5,  A6,  A7,
                                   A8, A9, A10, A11, A12, A13, A14, A15};
const char *const ANALOG_PIN_LABELS[] = {"A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7",
                                        "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"};
#ifndef IORUBA_BUTTON_PINS
#define IORUBA_BUTTON_PINS 2, 3, 4, 5, 6, 7, 8, 9
#endif
#ifndef IORUBA_ENCODER_A_PINS
#define IORUBA_ENCODER_A_PINS 10, 12, 14, 16
#endif
#ifndef IORUBA_ENCODER_B_PINS
#define IORUBA_ENCODER_B_PINS 11, 13, 15, 17
#endif
const char IORUBA_DIGITAL_PIN_PREFIX[] = "D";
#elif defined(ARDUINO_AVR_LEONARDO) || defined(ARDUINO_AVR_MICRO)
constexpr uint8_t ANALOG_PINS[] = {A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11};
const char *const ANALOG_PIN_LABELS[] = {"A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11"};
#ifndef IORUBA_BUTTON_PINS
#define IORUBA_BUTTON_PINS 2, 3, 4, 5, 6, 7, 8, 9
#endif
#ifndef IORUBA_ENCODER_A_PINS
#define IORUBA_ENCODER_A_PINS 10, 12, 14, 16
#endif
#ifndef IORUBA_ENCODER_B_PINS
#define IORUBA_ENCODER_B_PINS 11, 13, 15, 17
#endif
const char IORUBA_DIGITAL_PIN_PREFIX[] = "D";
#elif defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
// ADC1 only: ADC2 is unavailable while Wi-Fi is enabled on common ESP32 boards.
constexpr uint8_t ANALOG_PINS[] = {A0, A3, A4, A5, A6, A7};
const char *const ANALOG_PIN_LABELS[] = {"A0", "A3", "A4", "A5", "A6", "A7"};
#ifndef IORUBA_BUTTON_PINS
#define IORUBA_BUTTON_PINS 12, 13, 14, 16, 17, 18, 19, 21
#endif
#ifndef IORUBA_ENCODER_A_PINS
#define IORUBA_ENCODER_A_PINS 23, 25, 26, 27
#endif
#ifndef IORUBA_ENCODER_B_PINS
#define IORUBA_ENCODER_B_PINS 4, 5, 15, 2
#endif
const char IORUBA_DIGITAL_PIN_PREFIX[] = "GPIO";
#elif defined(ARDUINO_ARCH_RP2040)
constexpr uint8_t ANALOG_PINS[] = {A0, A1, A2};
const char *const ANALOG_PIN_LABELS[] = {"A0", "A1", "A2"};
#ifndef IORUBA_BUTTON_PINS
#define IORUBA_BUTTON_PINS 2, 3, 4, 5, 6, 7, 8, 9
#endif
#ifndef IORUBA_ENCODER_A_PINS
#define IORUBA_ENCODER_A_PINS 10, 12, 14, 16
#endif
#ifndef IORUBA_ENCODER_B_PINS
#define IORUBA_ENCODER_B_PINS 11, 13, 15, 17
#endif
const char IORUBA_DIGITAL_PIN_PREFIX[] = "GP";
#elif defined(ESP8266) || defined(ARDUINO_ARCH_ESP8266)
constexpr uint8_t ANALOG_PINS[] = {A0};
const char *const ANALOG_PIN_LABELS[] = {"A0"};
// GPIO0, GPIO2 and GPIO15 are boot-strapping pins and intentionally excluded.
#ifndef IORUBA_BUTTON_PINS
#define IORUBA_BUTTON_PINS 4, 5, 14, 16
#endif
#ifndef IORUBA_ENCODER_A_PINS
#define IORUBA_ENCODER_A_PINS 12
#endif
#ifndef IORUBA_ENCODER_B_PINS
#define IORUBA_ENCODER_B_PINS 13
#endif
const char IORUBA_DIGITAL_PIN_PREFIX[] = "GPIO";
#else
// Nano, Uno and the generic AVR fallback use the safe digital pins D2..D13.
constexpr uint8_t ANALOG_PINS[] = {A0, A1, A2, A3, A4, A5
#if defined(ARDUINO_AVR_NANO)
                                   , A6, A7
#endif
};
const char *const ANALOG_PIN_LABELS[] = {"A0", "A1", "A2", "A3", "A4", "A5"
#if defined(ARDUINO_AVR_NANO)
                                        , "A6", "A7"
#endif
};
#ifndef IORUBA_BUTTON_PINS
#define IORUBA_BUTTON_PINS 2, 3, 4, 5, 6, 7, 8, 9
#endif
#ifndef IORUBA_ENCODER_A_PINS
#define IORUBA_ENCODER_A_PINS 10, 12
#endif
#ifndef IORUBA_ENCODER_B_PINS
#define IORUBA_ENCODER_B_PINS 11, 13
#endif
const char IORUBA_DIGITAL_PIN_PREFIX[] = "D";
#endif

constexpr int ANALOG_PIN_COUNT = static_cast<int>(sizeof(ANALOG_PINS) / sizeof(ANALOG_PINS[0]));
constexpr int ANALOG_PIN_LABEL_COUNT = static_cast<int>(sizeof(ANALOG_PIN_LABELS) / sizeof(ANALOG_PIN_LABELS[0]));

constexpr uint8_t BUTTON_PINS[] = {IORUBA_BUTTON_PINS};
constexpr uint8_t ENCODER_A_PINS[] = {IORUBA_ENCODER_A_PINS};
constexpr uint8_t ENCODER_B_PINS[] = {IORUBA_ENCODER_B_PINS};
constexpr int BUTTON_PIN_COUNT = static_cast<int>(sizeof(BUTTON_PINS) / sizeof(BUTTON_PINS[0]));
constexpr int ENCODER_PIN_COUNT = static_cast<int>(sizeof(ENCODER_A_PINS) / sizeof(ENCODER_A_PINS[0]));
static_assert(ENCODER_PIN_COUNT == static_cast<int>(sizeof(ENCODER_B_PINS) / sizeof(ENCODER_B_PINS[0])),
              "IORUBA_ENCODER_A_PINS e IORUBA_ENCODER_B_PINS precisam ter o mesmo tamanho");
static_assert(ANALOG_PIN_COUNT == ANALOG_PIN_LABEL_COUNT,
              "cada pino analogico precisa ter um rotulo para o handshake");

constexpr bool iorubaPinListContains(const uint8_t *pins, int count, uint8_t pin) {
  return count <= 0 ? false : (pins[0] == pin || iorubaPinListContains(pins + 1, count - 1, pin));
}

constexpr bool iorubaPinListIsUnique(const uint8_t *pins, int count) {
  return count <= 1
    ? true
    : (!iorubaPinListContains(pins + 1, count - 1, pins[0]) &&
       iorubaPinListIsUnique(pins + 1, count - 1));
}

constexpr bool iorubaPinListsAreDisjoint(const uint8_t *left, int leftCount,
                                          const uint8_t *right, int rightCount) {
  return leftCount <= 0
    ? true
    : (!iorubaPinListContains(right, rightCount, left[0]) &&
       iorubaPinListsAreDisjoint(left + 1, leftCount - 1, right, rightCount));
}

#endif  // IORUBA_PIN_MAP_H
