// Controlador de Audio - 3 Potenciômetros
// Pinos: A0, A1, A2

const int POT1 = A0;
const int POT2 = A1;
const int POT3 = A2;

int lastValue1 = -1;
int lastValue2 = -1;
int lastValue3 = -1;

const int THRESHOLD = 5; // Margem para evitar ruído

void setup() {
  Serial.begin(9600);
  pinMode(POT1, INPUT);
  pinMode(POT2, INPUT);
  pinMode(POT3, INPUT);

  // Send initial values
  int val1 = analogRead(POT1);
  int val2 = analogRead(POT2);
  int val3 = analogRead(POT3);

  Serial.print("P1:"); Serial.println(val1);
  Serial.print("P2:"); Serial.println(val2);
  Serial.print("P3:"); Serial.println(val3);

  lastValue1 = val1;
  lastValue2 = val2;
  lastValue3 = val3;
}

void loop() {
  int value1 = analogRead(POT1);
  int value2 = analogRead(POT2);
  int value3 = analogRead(POT3);
  
  // Envia apenas se houver mudança significativa
  if (abs(value1 - lastValue1) > THRESHOLD) {
    Serial.print("P1:");
    Serial.println(value1);
    lastValue1 = value1;
  }
  
  if (abs(value2 - lastValue2) > THRESHOLD) {
    Serial.print("P2:");
    Serial.println(value2);
    lastValue2 = value2;
  }
  
  if (abs(value3 - lastValue3) > THRESHOLD) {
    Serial.print("P3:");
    Serial.println(value3);
    lastValue3 = value3;
  }
  
  delay(50); // Leitura a cada 50ms
}
