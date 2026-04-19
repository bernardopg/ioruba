#include <EEPROM.h>
#include <ctype.h>
#include <stdlib.h>
#include <string.h>

// Active Ioruba controller firmware for Arduino Nano-compatible boards.
//
// Hardware:
// - 3x linear 10k potentiometers
// - center pins wired to A0, A1, A2
// - outer pins wired to 5V and GND
//
// Serial contract:
// - 9600 baud
// - handshake command: "HELLO?" -> "HELLO board=...; fw=...; protocol=...; knobs=..."
// - config command:
//   "CONFIG threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023"
// - full frames such as "512|768|1023"
// - smoothed readings
// - snaps near the calibrated ADC edges so full travel can still reach 0 / 1023
// - sends updates roughly every 40 ms when values move
// - emits a heartbeat frame while idle to keep the desktop runtime alive
// - persists controller tuning and knob calibration in EEPROM

const int NUM_KNOBS = 3;
const int ANALOG_PINS[NUM_KNOBS] = {A0, A1, A2};
const long BAUD_RATE = 9600;
const char BOARD_NAME[] = "Ioruba Nano";
const char FIRMWARE_VERSION[] = "0.4.0";
const int PROTOCOL_VERSION = 2;
const int ADC_MIN = 0;
const int ADC_MAX = 1023;
const unsigned long SEND_INTERVAL_MS = 40;
const unsigned long HEARTBEAT_INTERVAL_MS = 500;
const unsigned long STARTUP_SERIAL_DELAY_MS = 120;

const int DEFAULT_CHANGE_THRESHOLD = 4;
const int DEFAULT_EDGE_DEADZONE = 7;
const int DEFAULT_SMOOTHING_STRENGTH = 75;

const uint16_t EEPROM_MAGIC = 0x49A5;
const uint8_t EEPROM_SCHEMA_VERSION = 1;

struct ControllerConfig {
  uint16_t magic;
  uint8_t schemaVersion;
  uint8_t knobCount;
  uint8_t changeThreshold;
  uint8_t edgeDeadzone;
  uint8_t smoothingStrength;
  uint16_t minRaw[NUM_KNOBS];
  uint16_t maxRaw[NUM_KNOBS];
};

ControllerConfig controllerConfig;
int knobValues[NUM_KNOBS];
int lastSentValues[NUM_KNOBS];
unsigned long lastSendTime = 0;
unsigned long lastHeartbeatTime = 0;

int clampAdcValue(int value) {
  return constrain(value, ADC_MIN, ADC_MAX);
}

bool isValidCalibrationRange(int minRaw, int maxRaw) {
  return minRaw >= ADC_MIN && maxRaw <= ADC_MAX && minRaw < maxRaw;
}

bool validateControllerConfig(const ControllerConfig &config) {
  if (config.knobCount != NUM_KNOBS) {
    return false;
  }

  if (config.smoothingStrength > 100) {
    return false;
  }

  for (int index = 0; index < NUM_KNOBS; index++) {
    if (!isValidCalibrationRange(config.minRaw[index], config.maxRaw[index])) {
      return false;
    }
  }

  return true;
}

void applyDefaultControllerConfig() {
  controllerConfig.magic = EEPROM_MAGIC;
  controllerConfig.schemaVersion = EEPROM_SCHEMA_VERSION;
  controllerConfig.knobCount = NUM_KNOBS;
  controllerConfig.changeThreshold = DEFAULT_CHANGE_THRESHOLD;
  controllerConfig.edgeDeadzone = DEFAULT_EDGE_DEADZONE;
  controllerConfig.smoothingStrength = DEFAULT_SMOOTHING_STRENGTH;

  for (int index = 0; index < NUM_KNOBS; index++) {
    controllerConfig.minRaw[index] = ADC_MIN;
    controllerConfig.maxRaw[index] = ADC_MAX;
  }
}

void saveControllerConfig() {
  controllerConfig.magic = EEPROM_MAGIC;
  controllerConfig.schemaVersion = EEPROM_SCHEMA_VERSION;
  controllerConfig.knobCount = NUM_KNOBS;
  EEPROM.put(0, controllerConfig);
}

void loadControllerConfig() {
  ControllerConfig stored;
  EEPROM.get(0, stored);

  if (stored.magic != EEPROM_MAGIC ||
      stored.schemaVersion != EEPROM_SCHEMA_VERSION ||
      !validateControllerConfig(stored)) {
    applyDefaultControllerConfig();
    saveControllerConfig();
    return;
  }

  controllerConfig = stored;
}

int mapCalibratedValue(int rawValue, int knobIndex) {
  const int clamped = clampAdcValue(rawValue);
  const int minRaw = controllerConfig.minRaw[knobIndex];
  const int maxRaw = controllerConfig.maxRaw[knobIndex];

  if (clamped <= minRaw) {
    return ADC_MIN;
  }

  if (clamped >= maxRaw) {
    return ADC_MAX;
  }

  const long numerator = static_cast<long>(clamped - minRaw) * ADC_MAX;
  const long denominator = maxRaw - minRaw;
  return clampAdcValue(static_cast<int>((numerator + denominator / 2) / denominator));
}

int snapToEdge(int value) {
  const int clamped = clampAdcValue(value);
  const int edgeDeadzone = controllerConfig.edgeDeadzone;

  if (clamped <= ADC_MIN + edgeDeadzone) {
    return ADC_MIN;
  }

  if (clamped >= ADC_MAX - edgeDeadzone) {
    return ADC_MAX;
  }

  return clamped;
}

int readKnobValue(int knobIndex) {
  const int rawValue = analogRead(ANALOG_PINS[knobIndex]);
  return snapToEdge(mapCalibratedValue(rawValue, knobIndex));
}

int smoothValue(int previousValue, int rawValue) {
  const int smoothingStrength = controllerConfig.smoothingStrength;
  if (smoothingStrength <= 0) {
    return snapToEdge(rawValue);
  }

  if (smoothingStrength >= 100) {
    return snapToEdge(previousValue);
  }

  const long smoothed =
    static_cast<long>(previousValue) * smoothingStrength +
    static_cast<long>(rawValue) * (100 - smoothingStrength);

  return snapToEdge(static_cast<int>((smoothed + 50) / 100));
}

bool valuesChanged() {
  for (int index = 0; index < NUM_KNOBS; index++) {
    if (abs(knobValues[index] - lastSentValues[index]) >= controllerConfig.changeThreshold) {
      return true;
    }
  }

  return false;
}

void copyValues() {
  for (int index = 0; index < NUM_KNOBS; index++) {
    lastSentValues[index] = knobValues[index];
  }
}

void sendFrame() {
  for (int index = 0; index < NUM_KNOBS; index++) {
    Serial.print(knobValues[index]);
    if (index < NUM_KNOBS - 1) {
      Serial.print("|");
    }
  }

  Serial.println();
}

void sendHandshake() {
  Serial.print("HELLO board=");
  Serial.print(BOARD_NAME);
  Serial.print("; fw=");
  Serial.print(FIRMWARE_VERSION);
  Serial.print("; protocol=");
  Serial.print(PROTOCOL_VERSION);
  Serial.print("; knobs=");
  Serial.print(NUM_KNOBS);
  Serial.print("; threshold=");
  Serial.print(controllerConfig.changeThreshold);
  Serial.print("; deadzone=");
  Serial.print(controllerConfig.edgeDeadzone);
  Serial.print("; smooth=");
  Serial.print(controllerConfig.smoothingStrength);
  Serial.print("; mins=");
  for (int index = 0; index < NUM_KNOBS; index++) {
    Serial.print(controllerConfig.minRaw[index]);
    if (index < NUM_KNOBS - 1) {
      Serial.print(",");
    }
  }
  Serial.print("; maxs=");
  for (int index = 0; index < NUM_KNOBS; index++) {
    Serial.print(controllerConfig.maxRaw[index]);
    if (index < NUM_KNOBS - 1) {
      Serial.print(",");
    }
  }
  Serial.println();
}

char *trimLeadingWhitespace(char *value) {
  while (*value != '\0' && isspace(*value)) {
    value++;
  }

  return value;
}

void trimTrailingWhitespace(char *value) {
  int length = strlen(value);
  while (length > 0 && isspace(value[length - 1])) {
    value[length - 1] = '\0';
    length--;
  }
}

char *trimWhitespace(char *value) {
  char *trimmed = trimLeadingWhitespace(value);
  trimTrailingWhitespace(trimmed);
  return trimmed;
}

bool parseIntegerValue(const char *value, int minimum, int maximum, int *destination) {
  if (value == NULL || *value == '\0') {
    return false;
  }

  char *end = NULL;
  const long parsed = strtol(value, &end, 10);
  if (end == value || *trimLeadingWhitespace(end) != '\0') {
    return false;
  }

  if (parsed < minimum || parsed > maximum) {
    return false;
  }

  *destination = static_cast<int>(parsed);
  return true;
}

bool parseIntegerList(char *value, uint16_t *destination) {
  if (value == NULL || *value == '\0') {
    return false;
  }

  int index = 0;
  char *context = NULL;
  char *entry = strtok_r(value, ",", &context);
  while (entry != NULL) {
    if (index >= NUM_KNOBS) {
      return false;
    }

    int parsed = 0;
    char *trimmed = trimWhitespace(entry);
    if (!parseIntegerValue(trimmed, ADC_MIN, ADC_MAX, &parsed)) {
      return false;
    }

    destination[index++] = static_cast<uint16_t>(parsed);
    entry = strtok_r(NULL, ",", &context);
  }

  return index == NUM_KNOBS;
}

void refreshKnobBuffers() {
  for (int index = 0; index < NUM_KNOBS; index++) {
    knobValues[index] = readKnobValue(index);
    lastSentValues[index] = knobValues[index];
  }

  lastSendTime = millis();
  lastHeartbeatTime = lastSendTime;
}

bool applyConfigCommand(char *payload) {
  if (payload == NULL) {
    return false;
  }

  ControllerConfig nextConfig = controllerConfig;
  bool sawField = false;

  char *context = NULL;
  char *entry = strtok_r(payload, ";", &context);
  while (entry != NULL) {
    char *trimmedEntry = trimWhitespace(entry);
    if (*trimmedEntry != '\0') {
      char *separator = strchr(trimmedEntry, '=');
      if (separator == NULL) {
        return false;
      }

      *separator = '\0';
      char *key = trimWhitespace(trimmedEntry);
      char *value = trimWhitespace(separator + 1);
      sawField = true;

      if (strcmp(key, "threshold") == 0) {
        int parsed = 0;
        if (!parseIntegerValue(value, 0, 255, &parsed)) {
          return false;
        }
        nextConfig.changeThreshold = static_cast<uint8_t>(parsed);
      } else if (strcmp(key, "deadzone") == 0) {
        int parsed = 0;
        if (!parseIntegerValue(value, 0, 255, &parsed)) {
          return false;
        }
        nextConfig.edgeDeadzone = static_cast<uint8_t>(parsed);
      } else if (strcmp(key, "smooth") == 0) {
        int parsed = 0;
        if (!parseIntegerValue(value, 0, 100, &parsed)) {
          return false;
        }
        nextConfig.smoothingStrength = static_cast<uint8_t>(parsed);
      } else if (strcmp(key, "mins") == 0) {
        if (!parseIntegerList(value, nextConfig.minRaw)) {
          return false;
        }
      } else if (strcmp(key, "maxs") == 0) {
        if (!parseIntegerList(value, nextConfig.maxRaw)) {
          return false;
        }
      } else {
        return false;
      }
    }

    entry = strtok_r(NULL, ";", &context);
  }

  if (!sawField || !validateControllerConfig(nextConfig)) {
    return false;
  }

  controllerConfig = nextConfig;
  saveControllerConfig();
  refreshKnobBuffers();
  sendHandshake();
  sendFrame();
  return true;
}

void processIncomingSerial() {
  static char commandBuffer[192];
  static int commandLength = 0;

  while (Serial.available() > 0) {
    const char incoming = static_cast<char>(Serial.read());

    if (incoming == '\r') {
      continue;
    }

    if (incoming == '\n') {
      commandBuffer[commandLength] = '\0';

      if (commandLength > 0) {
        if (strcmp(commandBuffer, "HELLO?") == 0) {
          sendHandshake();
        } else if (strncmp(commandBuffer, "CONFIG ", 7) == 0) {
          char payloadBuffer[192];
          strncpy(payloadBuffer, commandBuffer + 7, sizeof(payloadBuffer) - 1);
          payloadBuffer[sizeof(payloadBuffer) - 1] = '\0';

          if (!applyConfigCommand(payloadBuffer)) {
            sendHandshake();
          }
        }
      }

      commandLength = 0;
      continue;
    }

    if (commandLength < static_cast<int>(sizeof(commandBuffer)) - 1) {
      commandBuffer[commandLength++] = incoming;
    } else {
      commandLength = 0;
    }
  }
}

void setup() {
  Serial.begin(BAUD_RATE);
  delay(STARTUP_SERIAL_DELAY_MS);

  loadControllerConfig();
  refreshKnobBuffers();
  sendHandshake();
  sendFrame();
}

void loop() {
  const unsigned long now = millis();

  processIncomingSerial();

  for (int index = 0; index < NUM_KNOBS; index++) {
    const int rawValue = readKnobValue(index);
    knobValues[index] = smoothValue(knobValues[index], rawValue);
  }

  if (now - lastSendTime < SEND_INTERVAL_MS) {
    return;
  }

  const bool changed = valuesChanged();
  const bool heartbeatDue = now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS;

  if (changed || heartbeatDue) {
    sendFrame();
    copyValues();
    lastHeartbeatTime = now;
  }

  lastSendTime = now;
}
