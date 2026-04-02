// Active Ioruba controller firmware for Arduino Nano-compatible boards.
//
// Hardware:
// - 3x linear 10k potentiometers
// - center pins wired to A0, A1, A2
// - outer pins wired to 5V and GND
//
// Serial contract:
// - 9600 baud
// - full frames such as "512|768|1023"
// - smoothed readings
// - snaps near the ADC edges so full travel can still reach 0 / 1023
// - sends updates roughly every 40 ms when values move
// - emits a heartbeat frame while idle to keep the desktop runtime alive

const int NUM_KNOBS = 3;
const int ANALOG_PINS[NUM_KNOBS] = {A0, A1, A2};
const long BAUD_RATE = 9600;
const int CHANGE_THRESHOLD = 4;
const int ADC_MIN = 0;
const int ADC_MAX = 1023;
const int EDGE_SNAP_THRESHOLD = 7;
const unsigned long SEND_INTERVAL_MS = 40;
const unsigned long HEARTBEAT_INTERVAL_MS = 500;

int knobValues[NUM_KNOBS];
int lastSentValues[NUM_KNOBS];
unsigned long lastSendTime = 0;
unsigned long lastHeartbeatTime = 0;

int clampAdcValue(int value) {
  return constrain(value, ADC_MIN, ADC_MAX);
}

int snapToEdge(int value) {
  const int clamped = clampAdcValue(value);

  if (clamped <= ADC_MIN + EDGE_SNAP_THRESHOLD) {
    return ADC_MIN;
  }

  if (clamped >= ADC_MAX - EDGE_SNAP_THRESHOLD) {
    return ADC_MAX;
  }

  return clamped;
}

int smoothValue(int previousValue, int rawValue) {
  const int smoothed = (previousValue * 3 + rawValue + 2) / 4;
  return snapToEdge(smoothed);
}

bool valuesChanged() {
  for (int index = 0; index < NUM_KNOBS; index++) {
    if (abs(knobValues[index] - lastSentValues[index]) >= CHANGE_THRESHOLD) {
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

void setup() {
  Serial.begin(BAUD_RATE);

  for (int index = 0; index < NUM_KNOBS; index++) {
    knobValues[index] = snapToEdge(analogRead(ANALOG_PINS[index]));
    lastSentValues[index] = knobValues[index];
  }

  sendFrame();
  lastSendTime = millis();
  lastHeartbeatTime = lastSendTime;
}

void loop() {
  const unsigned long now = millis();

  for (int index = 0; index < NUM_KNOBS; index++) {
    const int rawValue = snapToEdge(analogRead(ANALOG_PINS[index]));
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