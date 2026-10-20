// Exercise the actual sketch with host substitutes for Arduino I/O only.
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <deque>
#include <sstream>
#include <string>

#ifndef ARDUINO_ARCH_RP2040
#define ARDUINO_AVR_NANO 1
#endif
#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19
#define A6 20
#define A7 21

static unsigned long nowMs = 0;
static int resolution = 10;
static int adc = 0;
static int digitalPins[40];
constexpr int HIGH = 1, LOW = 0, INPUT_PULLUP = 2, CHANGE = 3, NOT_AN_INTERRUPT = -1;
void pinMode(int, int) {}
int digitalRead(int pin) { return digitalPins[pin]; }
int digitalPinToInterrupt(int) { return NOT_AN_INTERRUPT; }
void attachInterrupt(int, void (*)(), int) {}
void noInterrupts() {}
void interrupts() {}
unsigned long millis() { return nowMs; }
void delay(unsigned long ms) { nowMs += ms; }
void analogReadResolution(int bits) { resolution = bits; }
int analogRead(int) { return adc; }
int constrain(int value, int low, int high) { return value < low ? low : value > high ? high : value; }
struct MockSerial {
  std::deque<char> input;
  std::ostringstream output;
  void begin(long) {}
  int available() { return static_cast<int>(input.size()); }
  int read() { int value = input.front(); input.pop_front(); return value; }
  template<class T> void print(const T &value) { output << value; }
  void println() { output << "\r\n"; }
  template<class T> void println(const T &value) { print(value); println(); }
} Serial;

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
#include "../ioruba-controller.ino"
#pragma GCC diagnostic pop

static std::string command(const std::string &text) {
  Serial.output.str("");
  for (char c : text) Serial.input.push_back(c);
  processIncomingSerial();
  return Serial.output.str();
}

int main() {
  for (int &pin : digitalPins) pin = HIGH;
  setup();
  assert(Serial.output.str().find("HELLO board=") != std::string::npos);
  assert(resolution == IORUBA_ADC_BITS);
  assert(EEPROM.writes == 1);
  const auto initial = controllerConfig;
  assert(command("HELLO?\n").find("protocol=2") != std::string::npos);
  assert(command("CONFIG smooth=101\n").find("ERR config-rejected") != std::string::npos);
  assert(iorubaControllerConfigEquals(controllerConfig, initial));
  assert(EEPROM.writes == 1);
  assert(command("CONFIG threshold=4;deadzone=7;smooth=75\n").find("HELLO board=") != std::string::npos);
  assert(EEPROM.writes == 1);
  assert(command("CONFIG smooth=50\n").find("HELLO board=") != std::string::npos);
  assert(EEPROM.writes == 2);
  assert(command(std::string(220, 'x') + "\nHELLO?\n").find("ERR command-too-long\r\nHELLO board=") != std::string::npos);
  assert(command("CONFIG smooth=5").empty());
  assert(command("0\r\n").find("HELLO board=") != std::string::npos);
  assert(controllerConfig.smoothingStrength == 50);
  command("RAW ON\n"); assert(rawModeEnabled);
  command("RAW OFF\n"); assert(!rawModeEnabled);
  command("EVENTS ON\n"); assert(controlEventsEnabled);
  command("EVENTS OFF\n"); assert(!controlEventsEnabled);
#if IORUBA_NUM_BUTTONS > 0
  command("EVENTS ON\n");
  digitalPins[BUTTON_PINS[0]] = LOW;
  readControls(nowMs);
  assert(Serial.output.str().empty());
  nowMs += IORUBA_CONTROL_DEBOUNCE_MS + 1;
  readControls(nowMs);
  assert(Serial.output.str().find("EV type=button; id=0; event=press") != std::string::npos);
#endif
#if IORUBA_NUM_ENCODERS > 0
  Serial.output.str("");
  for (int bits : {1, 0, 2, 3}) {
    digitalPins[ENCODER_A_PINS[0]] = (bits & 2) ? HIGH : LOW;
    digitalPins[ENCODER_B_PINS[0]] = (bits & 1) ? HIGH : LOW;
    readControls(nowMs);
  }
  assert(Serial.output.str().find("EV type=encoder; id=0; delta=") != std::string::npos);
#endif
  controllerConfig.smoothingStrength = 0;
  adc = 0; assert(readKnobValue(0) == 0);
  adc = ADC_MAX; assert(readKnobValue(0) == ADC_MAX);
  controllerConfig.minRaw[0] = 20;
  controllerConfig.maxRaw[0] = ADC_MAX - 20;
  assert(mapCalibratedValue(20, 0) == 0);
  assert(mapCalibratedValue(ADC_MAX - 20, 0) == ADC_MAX);
  assert(mapCalibratedValue(ADC_MAX / 2, 0) >= ADC_MAX / 2 - 1);
  std::puts("ok: sketch setup, ADC resolution, serial framing, config validation, EEPROM wear, modes and calibration");
}
