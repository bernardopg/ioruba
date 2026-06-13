#include <EEPROM.h>
#include <ctype.h>
#include <stdlib.h>
#include <string.h>

#include "config_parser.h"

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

// Constantes de domínio e a struct ControllerConfig vivem em config_parser.h
// (lógica pura, testável em host). Aqui só ficam os apelidos e as constantes
// específicas do runtime Arduino.
const int NUM_KNOBS = IORUBA_NUM_KNOBS;
const int ANALOG_PINS[NUM_KNOBS] = {A0, A1, A2};
const long BAUD_RATE = 9600;
const char BOARD_NAME[] = "Ioruba Nano";
// O firmware versiona de forma independente do app desktop: FIRMWARE_VERSION
// rastreia mudancas no sketch, enquanto PROTOCOL_VERSION rastreia o contrato
// serial. O desktop valida apenas PROTOCOL_VERSION (ver SUPPORTED_PROTOCOL_VERSION
// em packages/shared). Bump FIRMWARE_VERSION em qualquer mudanca de comportamento
// do controlador; bump PROTOCOL_VERSION apenas em mudanca incompativel do frame
// ou do handshake.
const char FIRMWARE_VERSION[] = "0.5.0";
const int PROTOCOL_VERSION = 2;
const int ADC_MIN = IORUBA_ADC_MIN;
const int ADC_MAX = IORUBA_ADC_MAX;
const unsigned long SEND_INTERVAL_MS = 40;
const unsigned long HEARTBEAT_INTERVAL_MS = 500;
const unsigned long STARTUP_SERIAL_DELAY_MS = 120;

const uint16_t EEPROM_MAGIC = IORUBA_EEPROM_MAGIC;
const uint8_t EEPROM_SCHEMA_VERSION = IORUBA_EEPROM_SCHEMA_VERSION;

ControllerConfig controllerConfig;
int knobValues[NUM_KNOBS];
int lastSentValues[NUM_KNOBS];
unsigned long lastSendTime = 0;
unsigned long lastHeartbeatTime = 0;

int clampAdcValue(int value) {
  return constrain(value, ADC_MIN, ADC_MAX);
}

bool validateControllerConfig(const ControllerConfig &config) {
  return iorubaValidateControllerConfig(config);
}

void applyDefaultControllerConfig() {
  iorubaApplyDefaultControllerConfig(controllerConfig);
}

void saveControllerConfig() {
  controllerConfig.magic = EEPROM_MAGIC;
  controllerConfig.schemaVersion = EEPROM_SCHEMA_VERSION;
  controllerConfig.knobCount = NUM_KNOBS;
  // EEPROM.put usa EEPROM.update por baixo: bytes ja iguais nao sao reescritos,
  // entao chamar isto com a mesma struct nao gasta ciclos de escrita. Ainda
  // assim, evitamos a chamada quando o config nao muda (ver applyConfigCommand)
  // para nao tocar magic/schema/knobCount a cada CONFIG repetido do host.
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

void refreshKnobBuffers() {
  for (int index = 0; index < NUM_KNOBS; index++) {
    knobValues[index] = readKnobValue(index);
    lastSentValues[index] = knobValues[index];
  }

  lastSendTime = millis();
  lastHeartbeatTime = lastSendTime;
}

bool applyConfigCommand(char *payload) {
  // Parsing e validacao puros vivem em config_parser.h (testados em host). Aqui
  // so cuidamos do efeito colateral: persistir e reaplicar buffers.
  ControllerConfig nextConfig;
  if (!iorubaApplyConfigFields(controllerConfig, payload, &nextConfig)) {
    return false;
  }

  // So persiste quando algo de fato mudou: economiza ciclos de escrita da EEPROM
  // em hosts que reenviam o mesmo CONFIG (ex.: reaplicacao no boot/reconexao).
  if (!iorubaControllerConfigEquals(controllerConfig, nextConfig)) {
    controllerConfig = nextConfig;
    saveControllerConfig();
    refreshKnobBuffers();
  }

  sendHandshake();
  sendFrame();
  return true;
}

void sendError(const char *reason) {
  Serial.print("ERR ");
  Serial.println(reason);
}

void processIncomingSerial() {
  static char commandBuffer[192];
  static int commandLength = 0;
  static bool overflowed = false;

  while (Serial.available() > 0) {
    const char incoming = static_cast<char>(Serial.read());

    if (incoming == '\r') {
      continue;
    }

    if (incoming == '\n') {
      if (overflowed) {
        // Um comando longo demais foi truncado: avisa o host em vez de
        // descartar metade de um CONFIG silenciosamente. O host pode reenviar.
        sendError("command-too-long");
        overflowed = false;
        commandLength = 0;
        continue;
      }

      commandBuffer[commandLength] = '\0';

      if (commandLength > 0) {
        if (strcmp(commandBuffer, "HELLO?") == 0) {
          sendHandshake();
        } else if (strncmp(commandBuffer, "CONFIG ", 7) == 0) {
          char payloadBuffer[192];
          strncpy(payloadBuffer, commandBuffer + 7, sizeof(payloadBuffer) - 1);
          payloadBuffer[sizeof(payloadBuffer) - 1] = '\0';

          if (!applyConfigCommand(payloadBuffer)) {
            sendError("config-rejected");
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
      // Marca overflow e segue consumindo ate o '\n' para nao reinterpretar a
      // cauda do comando truncado como um novo comando.
      overflowed = true;
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
