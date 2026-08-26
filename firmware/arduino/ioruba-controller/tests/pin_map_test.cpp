// Host test for the compile-time pin-map guards. It defines the Arduino pin
// aliases needed by the Nano map, then exercises the same constexpr helpers
// used by the sketch's static_asserts.

#include <cstdio>

#define ARDUINO_AVR_NANO 1
#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19
#define A6 20
#define A7 21

#include "../pin_map.h"

static int g_failures = 0;

#define CHECK(condition)                                                  \
  do {                                                                    \
    if (!(condition)) {                                                   \
      std::printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, #condition); \
      g_failures++;                                                       \
    }                                                                     \
  } while (0)

int main() {
  constexpr uint8_t validButtons[] = {2, 3};
  constexpr uint8_t validEncoderA[] = {10, 12};
  constexpr uint8_t validEncoderB[] = {11, 13};
  constexpr uint8_t duplicatePins[] = {2, 2};
  constexpr uint8_t overlappingPins[] = {3, 4};

  CHECK(ANALOG_PIN_COUNT == 8);
  CHECK(BUTTON_PIN_COUNT == 8);
  CHECK(ENCODER_PIN_COUNT == 2);
  CHECK(iorubaPinListIsUnique(validButtons, 2));
  CHECK(iorubaPinListIsUnique(validEncoderA, 2));
  CHECK(!iorubaPinListIsUnique(duplicatePins, 2));
  CHECK(iorubaPinListsAreDisjoint(validButtons, 2, validEncoderA, 2));
  CHECK(iorubaPinListsAreDisjoint(validButtons, 2, validEncoderB, 2));
  CHECK(!iorubaPinListsAreDisjoint(validButtons, 2, overlappingPins, 2));
  CHECK(iorubaPinListsAreDisjoint(ANALOG_PINS, 3, validButtons, 2));

  if (g_failures == 0) {
    std::printf("ok: all pin map host tests passed\n");
    return 0;
  }

  std::printf("FAILED: %d check(s)\n", g_failures);
  return 1;
}
