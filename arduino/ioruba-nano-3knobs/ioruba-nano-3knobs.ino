/*
 * Ioruba Audio Mixer - Arduino Nano Firmware
 *
 * For Arduino Nano (ATmega328P) with 3 potentiometers
 * Reads 3 analog potentiometers and sends values via serial
 * Format: value0|value1|value2\n
 *
 * Notes:
 * - Uses light smoothing to reduce noisy jumps from analog reads
 * - Sends a periodic heartbeat even when knobs stay still so the desktop UI
 *   can distinguish "idle hardware" from "firmware not responding"
 */

const int NUM_KNOBS = 3;
const int ANALOG_PINS[NUM_KNOBS] = {A0, A1, A2};
const int BAUD_RATE = 9600;
const int SEND_INTERVAL_MS = 50;       // Update cadence for responsive UI
const int HEARTBEAT_INTERVAL_MS = 500; // Re-send stable values twice per second
const int CHANGE_THRESHOLD = 4;        // Ignore tiny analog fluctuations

int knobValues[NUM_KNOBS];
int lastSentValues[NUM_KNOBS];
unsigned long lastSendTime = 0;
unsigned long lastHeartbeatTime = 0;

// Onboard LED for status indication
const int LED_PIN = LED_BUILTIN;  // Pin 13 on Nano
unsigned long lastBlinkTime = 0;
bool ledState = false;

void setup() {
  Serial.begin(BAUD_RATE);
  pinMode(LED_PIN, OUTPUT);

  // Initialize arrays
  for (int i = 0; i < NUM_KNOBS; i++) {
    knobValues[i] = 0;
    lastSentValues[i] = 0;
  }

  // Push the initial state so the host starts synchronized.
  for (int i = 0; i < NUM_KNOBS; i++) {
    knobValues[i] = analogRead(ANALOG_PINS[i]);
  }
  sendValues();
  copyValues();
  lastHeartbeatTime = millis();

  // Blink LED quickly on startup
  for (int i = 0; i < 6; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void loop() {
  unsigned long currentTime = millis();

  // Read all knob values
  for (int i = 0; i < NUM_KNOBS; i++) {
    int rawValue = analogRead(ANALOG_PINS[i]);
    knobValues[i] = smoothValue(knobValues[i], rawValue);
  }

  // Send values if enough time has passed
  if (currentTime - lastSendTime >= SEND_INTERVAL_MS) {
    bool changed = valuesChanged();
    bool heartbeatDue = currentTime - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS;

    if (changed || heartbeatDue) {
      sendValues();
      copyValues();
      lastHeartbeatTime = currentTime;

      // Blink LED to show activity
      if (changed) {
        digitalWrite(LED_PIN, HIGH);
        delay(5);
        digitalWrite(LED_PIN, LOW);
      }
    }
    lastSendTime = currentTime;
  }

  // Heartbeat blink (slow)
  if (currentTime - lastBlinkTime >= 1000) {
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
    lastBlinkTime = currentTime;
  }
}

// Check if any value has changed significantly
bool valuesChanged() {
  for (int i = 0; i < NUM_KNOBS; i++) {
    if (abs(knobValues[i] - lastSentValues[i]) > CHANGE_THRESHOLD) {
      return true;
    }
  }
  return false;
}

// Blend the new raw read with the last value to reduce analog jitter
int smoothValue(int previousValue, int rawValue) {
  return (previousValue * 3 + rawValue) / 4;
}

// Send values via serial in pipe-separated format
void sendValues() {
  for (int i = 0; i < NUM_KNOBS; i++) {
    Serial.print(knobValues[i]);
    if (i < NUM_KNOBS - 1) {
      Serial.print("|");
    }
  }
  Serial.println();
}

// Copy current values to last sent values
void copyValues() {
  for (int i = 0; i < NUM_KNOBS; i++) {
    lastSentValues[i] = knobValues[i];
  }
}
