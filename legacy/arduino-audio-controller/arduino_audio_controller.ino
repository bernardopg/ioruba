// Legacy Arduino Audio Controller firmware
// Recommended wiring: A0, A1, A2 with three B10K potentiometers.
// Output protocol:
//   P1:512
//   P2:768
//   P3:1023
//
// The desktop app also accepts the newer pipe-separated format used by the
// maintained firmware in `firmware/arduino/ioruba-controller/`, but this
// legacy sketch is kept here as a reference for the original controller flow.

const int NUM_KNOBS = 3;
const int ANALOG_PINS[NUM_KNOBS] = {A0, A1, A2};
const int BAUD_RATE = 9600;
const int CHANGE_THRESHOLD = 4;
const int SEND_INTERVAL_MS = 50;
const int HEARTBEAT_INTERVAL_MS = 500;

int knobValues[NUM_KNOBS];
int lastSentValues[NUM_KNOBS];
unsigned long lastSendTime = 0;
unsigned long lastHeartbeatTime = 0;

int smoothValue(int previousValue, int rawValue) {
  return (previousValue * 3 + rawValue) / 4;
}

bool valuesChanged() {
  for (int i = 0; i < NUM_KNOBS; i++) {
    if (abs(knobValues[i] - lastSentValues[i]) > CHANGE_THRESHOLD) {
      return true;
    }
  }
  return false;
}

void copyValues() {
  for (int i = 0; i < NUM_KNOBS; i++) {
    lastSentValues[i] = knobValues[i];
  }
}

void sendValues() {
  for (int i = 0; i < NUM_KNOBS; i++) {
    Serial.print("P");
    Serial.print(i + 1);
    Serial.print(":");
    Serial.println(knobValues[i]);
  }
}

void setup() {
  Serial.begin(BAUD_RATE);

  for (int i = 0; i < NUM_KNOBS; i++) {
    knobValues[i] = analogRead(ANALOG_PINS[i]);
    lastSentValues[i] = knobValues[i];
  }

  sendValues();
  lastHeartbeatTime = millis();
}

void loop() {
  unsigned long now = millis();

  for (int i = 0; i < NUM_KNOBS; i++) {
    knobValues[i] = smoothValue(knobValues[i], analogRead(ANALOG_PINS[i]));
  }

  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    bool changed = valuesChanged();
    bool heartbeatDue = now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS;

    if (changed || heartbeatDue) {
      sendValues();
      copyValues();
      lastHeartbeatTime = now;
    }

    lastSendTime = now;
  }
}
