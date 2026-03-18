/*
 * Ioruba Audio Mixer - Arduino Firmware
 *
 * Reads 5 analog potentiometers and sends values via serial
 * Format: value0|value1|value2|value3|value4\n
 */

const int NUM_SLIDERS = 5;
const int ANALOG_PINS[NUM_SLIDERS] = {A0, A1, A2, A3, A4};
const int BAUD_RATE = 9600;
const int SEND_INTERVAL_MS = 50;  // Send updates every 50ms (20Hz)

int sliderValues[NUM_SLIDERS];
int lastSentValues[NUM_SLIDERS];
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(BAUD_RATE);

  // Initialize arrays
  for (int i = 0; i < NUM_SLIDERS; i++) {
    sliderValues[i] = 0;
    lastSentValues[i] = 0;
  }

  // Push the initial state so the host starts synchronized.
  for (int i = 0; i < NUM_SLIDERS; i++) {
    sliderValues[i] = analogRead(ANALOG_PINS[i]);
  }
  sendValues();
  copyValues();
}

void loop() {
  unsigned long currentTime = millis();

  // Read all slider values
  for (int i = 0; i < NUM_SLIDERS; i++) {
    sliderValues[i] = analogRead(ANALOG_PINS[i]);
  }

  // Send values if enough time has passed
  if (currentTime - lastSendTime >= SEND_INTERVAL_MS) {
    if (valuesChanged()) {
      sendValues();
      copyValues();
    }
    lastSendTime = currentTime;
  }
}

// Check if any value has changed
bool valuesChanged() {
  for (int i = 0; i < NUM_SLIDERS; i++) {
    // Consider changed if difference > 5 to reduce noise
    if (abs(sliderValues[i] - lastSentValues[i]) > 5) {
      return true;
    }
  }
  return false;
}

// Send values via serial in pipe-separated format
void sendValues() {
  for (int i = 0; i < NUM_SLIDERS; i++) {
    Serial.print(sliderValues[i]);
    if (i < NUM_SLIDERS - 1) {
      Serial.print("|");
    }
  }
  Serial.println();
}

// Copy current values to last sent values
void copyValues() {
  for (int i = 0; i < NUM_SLIDERS; i++) {
    lastSentValues[i] = sliderValues[i];
  }
}
