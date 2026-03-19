/*
 * Ioruba Controller Firmware
 *
 * Hardware:
 * - Arduino Nano / ATmega328P
 * - 3x B10K potentiometers on A0, A1, A2
 *
 * Serial protocol:
 * - Full frame: "512|768|1023\n"
 * - Optional legacy debug output disabled by default
 */

static const uint8_t KNOB_PINS[] = {A0, A1, A2};
static const uint8_t KNOB_COUNT = sizeof(KNOB_PINS) / sizeof(KNOB_PINS[0]);
static const unsigned long BAUD_RATE = 9600;
static const unsigned long SAMPLE_INTERVAL_MS = 12;
static const unsigned long REPORT_INTERVAL_MS = 40;
static const uint8_t CHANGE_THRESHOLD = 3;
static const uint8_t SMOOTHING_WINDOW = 6;
static const bool EMIT_LEGACY_DEBUG = false;

uint16_t smoothedValues[KNOB_COUNT] = {0, 0, 0};
uint16_t lastReportedValues[KNOB_COUNT] = {0, 0, 0};
unsigned long lastSampleAt = 0;
unsigned long lastReportAt = 0;

void setup() {
  Serial.begin(BAUD_RATE);
  while (!Serial) {
    // Keep compatibility with boards that expose native USB.
  }

  for (uint8_t index = 0; index < KNOB_COUNT; index++) {
    uint16_t raw = analogRead(KNOB_PINS[index]);
    smoothedValues[index] = raw;
    lastReportedValues[index] = raw;
  }
}

void loop() {
  const unsigned long now = millis();

  if (now - lastSampleAt >= SAMPLE_INTERVAL_MS) {
    sampleKnobs();
    lastSampleAt = now;
  }

  if (now - lastReportAt >= REPORT_INTERVAL_MS) {
    if (hasRelevantChange() || now < 500) {
      emitFrame();
    }
    lastReportAt = now;
  }
}

void sampleKnobs() {
  for (uint8_t index = 0; index < KNOB_COUNT; index++) {
    const uint16_t raw = analogRead(KNOB_PINS[index]);
    smoothedValues[index] = smoothValue(smoothedValues[index], raw);
  }
}

bool hasRelevantChange() {
  for (uint8_t index = 0; index < KNOB_COUNT; index++) {
    if (distanceBetween(smoothedValues[index], lastReportedValues[index]) >= CHANGE_THRESHOLD) {
      return true;
    }
  }

  return false;
}

void emitFrame() {
  for (uint8_t index = 0; index < KNOB_COUNT; index++) {
    const uint16_t bounded = constrain(smoothedValues[index], 0, 1023);
    Serial.print(bounded);

    if (EMIT_LEGACY_DEBUG) {
      Serial.print("\nP");
      Serial.print(index + 1);
      Serial.print(":");
      Serial.print(bounded);
    }

    if (index + 1 < KNOB_COUNT) {
      Serial.print("|");
    } else {
      Serial.print("\n");
    }

    lastReportedValues[index] = bounded;
  }
}

uint16_t smoothValue(uint16_t current, uint16_t nextValue) {
  return static_cast<uint16_t>(
    ((static_cast<unsigned long>(current) * (SMOOTHING_WINDOW - 1)) + nextValue) /
    SMOOTHING_WINDOW
  );
}

uint16_t distanceBetween(uint16_t left, uint16_t right) {
  if (left > right) {
    return left - right;
  }
  return right - left;
}
