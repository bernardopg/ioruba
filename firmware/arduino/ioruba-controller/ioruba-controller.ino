#include <EEPROM.h>
#include <ctype.h>
#include <stdlib.h>
#include <string.h>

#include "config_parser.h"

// Active Ioruba controller firmware for Arduino/ESP32-compatible boards.
//
// Hardware:
// - NUM_KNOBS linear 10k potentiometers (3 by default)
// - center pins wired to the first NUM_KNOBS analog channels of the board
//   (ANALOG_PINS table below, selected per board at compile time)
// - outer pins wired to 5V/3V3 and GND
//
// Serial contract:
// - 9600 baud
// - handshake command: "HELLO?" -> "HELLO board=...; fw=...; protocol=...; knobs=...; mcu=...; adcBits=..."
//   (mcu/adcBits sao campos aditivos do protocolo v2: hosts antigos ignoram;
//    novos usam adcBits para normalizar a resolucao, suportando 10-bit e 12-bit)
// - config command:
//   "CONFIG threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023"
// - optional control event opt-in: "EVENTS ON" enables button/encoder frames
//   such as "EV type=button; id=0; event=press" and
//   "EV type=encoder; id=0; delta=1". Events are disabled by default so older
//   desktop builds that only parse slider frames remain compatible.
// - full frames such as "512|768|1023"
// - smoothed readings
// - snaps near the calibrated ADC edges so full travel can still reach 0 / ADC_MAX
// - sends updates roughly every 40 ms when values move
// - emits a heartbeat frame while idle to keep the desktop runtime alive
// - persists controller tuning and knob calibration in EEPROM

// Constantes de domínio e a struct ControllerConfig vivem em config_parser.h
// (lógica pura, testável em host). Aqui só ficam os apelidos e as constantes
// específicas do runtime Arduino.
const int NUM_KNOBS = IORUBA_NUM_KNOBS;

#ifndef IORUBA_NUM_BUTTONS
#define IORUBA_NUM_BUTTONS 0
#endif

#ifndef IORUBA_NUM_ENCODERS
#define IORUBA_NUM_ENCODERS 0
#endif

#ifndef IORUBA_CONTROL_DEBOUNCE_MS
#define IORUBA_CONTROL_DEBOUNCE_MS 30
#endif

#ifndef IORUBA_ENCODER_STEPS_PER_EVENT
#define IORUBA_ENCODER_STEPS_PER_EVENT 4
#endif

const int NUM_BUTTONS = IORUBA_NUM_BUTTONS;
const int NUM_ENCODERS = IORUBA_NUM_ENCODERS;

// Tabela de pinos analogicos por placa, selecionada em compile-time. Os knobs
// usam os primeiros NUM_KNOBS canais desta lista. O teto de knobs por placa e a
// quantidade de canais aqui (Mega habilita >6; ESP32 usa apenas pinos do ADC1,
// pois o ADC2 conflita com o Wi-Fi). Os pinos AVR sao contiguos a partir de A0;
// no ESP32 nao sao, por isso a lista explicita.
#if defined(ARDUINO_AVR_MEGA2560)
const uint8_t ANALOG_PINS[] = {A0, A1, A2,  A3,  A4,  A5,  A6,  A7,
                               A8, A9, A10, A11, A12, A13, A14, A15};
#elif defined(ARDUINO_AVR_LEONARDO) || defined(ARDUINO_AVR_MICRO)
const uint8_t ANALOG_PINS[] = {A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11};
#elif defined(ARDUINO_AVR_NANO)
const uint8_t ANALOG_PINS[] = {A0, A1, A2, A3, A4, A5, A6, A7};
#elif defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
// ESP32: somente entradas do ADC1 (GPIO32..39), livres durante o uso do Wi-Fi.
const uint8_t ANALOG_PINS[] = {A0, A3, A4, A5, A6, A7};
#elif defined(ARDUINO_ARCH_RP2040)
// RP2040/Pico: ADC0..ADC2 (GPIO26..28); ADC3 e usado para sensar VSYS.
const uint8_t ANALOG_PINS[] = {A0, A1, A2};
#else
// Uno e fallback generico: A0..A5 (universalmente expostos).
const uint8_t ANALOG_PINS[] = {A0, A1, A2, A3, A4, A5};
#endif

constexpr int ANALOG_PIN_COUNT =
  static_cast<int>(sizeof(ANALOG_PINS) / sizeof(ANALOG_PINS[0]));
static_assert(IORUBA_NUM_KNOBS >= 1,
              "IORUBA_NUM_KNOBS deve ser >= 1");
static_assert(IORUBA_NUM_BUTTONS >= 0,
              "IORUBA_NUM_BUTTONS deve ser >= 0");
static_assert(IORUBA_NUM_ENCODERS >= 0,
              "IORUBA_NUM_ENCODERS deve ser >= 0");
static_assert(IORUBA_NUM_KNOBS <= ANALOG_PIN_COUNT,
              "IORUBA_NUM_KNOBS excede os canais analogicos da placa selecionada");

#if IORUBA_NUM_BUTTONS > 0
const uint8_t BUTTON_PINS[] = {2, 3, 4, 5, 6, 7, 8, 9};
constexpr int BUTTON_PIN_COUNT =
  static_cast<int>(sizeof(BUTTON_PINS) / sizeof(BUTTON_PINS[0]));
static_assert(IORUBA_NUM_BUTTONS <= BUTTON_PIN_COUNT,
              "IORUBA_NUM_BUTTONS excede os pinos digitais padrao");
#endif

#if IORUBA_NUM_ENCODERS > 0
const uint8_t ENCODER_A_PINS[] = {6, 8, 10, 12};
const uint8_t ENCODER_B_PINS[] = {7, 9, 11, 13};
constexpr int ENCODER_PIN_COUNT =
  static_cast<int>(sizeof(ENCODER_A_PINS) / sizeof(ENCODER_A_PINS[0]));
static_assert(IORUBA_NUM_ENCODERS <= ENCODER_PIN_COUNT,
              "IORUBA_NUM_ENCODERS excede os pares digitais padrao");
#endif

const long BAUD_RATE = 9600;
// Prefixo IORUBA_ evita colisao com a macro BOARD_NAME definida por alguns cores
// (ex.: arduino-pico para RP2040).
const char IORUBA_BOARD_NAME[] = "Ioruba Nano";

// Nome do MCU deduzido em compile-time a partir das macros de arquitetura. O
// host exibe isto como diagnostico de hardware; nao afeta o frame de knobs.
#if defined(__AVR_ATmega2560__)
const char MCU_NAME[] = "ATmega2560";
#elif defined(__AVR_ATmega32U4__)
const char MCU_NAME[] = "ATmega32U4";
#elif defined(__AVR_ATmega328P__) || defined(__AVR_ATmega328__)
const char MCU_NAME[] = "ATmega328P";
#elif defined(ARDUINO_ARCH_RP2040)
const char MCU_NAME[] = "RP2040";
#elif defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
const char MCU_NAME[] = "ESP32";
#else
const char MCU_NAME[] = "unknown";
#endif
// O firmware versiona de forma independente do app desktop: FIRMWARE_VERSION
// rastreia mudancas no sketch, enquanto PROTOCOL_VERSION rastreia o contrato
// serial. O desktop valida apenas PROTOCOL_VERSION (ver SUPPORTED_PROTOCOL_VERSION
// em packages/shared). Bump FIRMWARE_VERSION em qualquer mudanca de comportamento
// do controlador; bump PROTOCOL_VERSION apenas em mudanca incompativel do frame
// ou do handshake.
const char FIRMWARE_VERSION[] = "0.5.1";
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
bool controlEventsEnabled = false;

#if IORUBA_NUM_BUTTONS > 0
bool buttonStates[NUM_BUTTONS];
bool buttonReadings[NUM_BUTTONS];
unsigned long buttonChangedAt[NUM_BUTTONS];
#endif

#if IORUBA_NUM_ENCODERS > 0
uint8_t encoderStates[NUM_ENCODERS];
int8_t encoderSteps[NUM_ENCODERS];
#endif

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

void sendButtonEvent(int buttonIndex, bool pressed) {
  if (!controlEventsEnabled) {
    return;
  }

  Serial.print("EV type=button; id=");
  Serial.print(buttonIndex);
  Serial.print("; event=");
  Serial.println(pressed ? "press" : "release");
}

void sendEncoderEvent(int encoderIndex, int delta) {
  if (!controlEventsEnabled || delta == 0) {
    return;
  }

  Serial.print("EV type=encoder; id=");
  Serial.print(encoderIndex);
  Serial.print("; delta=");
  Serial.println(delta);
}

void sendHandshake() {
  Serial.print("HELLO board=");
  Serial.print(IORUBA_BOARD_NAME);
  Serial.print("; fw=");
  Serial.print(FIRMWARE_VERSION);
  Serial.print("; protocol=");
  Serial.print(PROTOCOL_VERSION);
  Serial.print("; knobs=");
  Serial.print(NUM_KNOBS);
  Serial.print("; buttons=");
  Serial.print(NUM_BUTTONS);
  Serial.print("; encoders=");
  Serial.print(NUM_ENCODERS);
  Serial.print("; mcu=");
  Serial.print(MCU_NAME);
  Serial.print("; adcBits=");
  Serial.print(IORUBA_ADC_BITS_VALUE);
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

void setupControls() {
#if IORUBA_NUM_BUTTONS > 0
  for (int index = 0; index < NUM_BUTTONS; index++) {
    pinMode(BUTTON_PINS[index], INPUT_PULLUP);
    const bool pressed = digitalRead(BUTTON_PINS[index]) == LOW;
    buttonStates[index] = pressed;
    buttonReadings[index] = pressed;
    buttonChangedAt[index] = millis();
  }
#endif

#if IORUBA_NUM_ENCODERS > 0
  for (int index = 0; index < NUM_ENCODERS; index++) {
    pinMode(ENCODER_A_PINS[index], INPUT_PULLUP);
    pinMode(ENCODER_B_PINS[index], INPUT_PULLUP);
    encoderStates[index] =
      (digitalRead(ENCODER_A_PINS[index]) == HIGH ? 2 : 0) |
      (digitalRead(ENCODER_B_PINS[index]) == HIGH ? 1 : 0);
    encoderSteps[index] = 0;
  }
#endif
}

void readControls(unsigned long now) {
#if IORUBA_NUM_BUTTONS > 0
  for (int index = 0; index < NUM_BUTTONS; index++) {
    const bool pressed = digitalRead(BUTTON_PINS[index]) == LOW;
    if (pressed != buttonReadings[index]) {
      buttonReadings[index] = pressed;
      buttonChangedAt[index] = now;
    }

    if (pressed != buttonStates[index] &&
        now - buttonChangedAt[index] >= IORUBA_CONTROL_DEBOUNCE_MS) {
      buttonStates[index] = pressed;
      sendButtonEvent(index, pressed);
    }
  }
#endif

#if IORUBA_NUM_ENCODERS > 0
  const int8_t transitionTable[16] = {
    0, -1, 1, 0,
    1, 0, 0, -1,
    -1, 0, 0, 1,
    0, 1, -1, 0
  };

  for (int index = 0; index < NUM_ENCODERS; index++) {
    const uint8_t nextState =
      (digitalRead(ENCODER_A_PINS[index]) == HIGH ? 2 : 0) |
      (digitalRead(ENCODER_B_PINS[index]) == HIGH ? 1 : 0);
    const uint8_t transition = (encoderStates[index] << 2) | nextState;
    const int8_t step = transitionTable[transition & 0x0F];
    encoderStates[index] = nextState;

    if (step == 0) {
      continue;
    }

    encoderSteps[index] += step;
    if (encoderSteps[index] >= IORUBA_ENCODER_STEPS_PER_EVENT) {
      encoderSteps[index] = 0;
      sendEncoderEvent(index, 1);
    } else if (encoderSteps[index] <= -IORUBA_ENCODER_STEPS_PER_EVENT) {
      encoderSteps[index] = 0;
      sendEncoderEvent(index, -1);
    }
  }
#endif
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
        } else if (strcmp(commandBuffer, "EVENTS ON") == 0) {
          controlEventsEnabled = true;
        } else if (strcmp(commandBuffer, "EVENTS OFF") == 0) {
          controlEventsEnabled = false;
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
  setupControls();
  refreshKnobBuffers();
  sendHandshake();
  sendFrame();
}

void loop() {
  const unsigned long now = millis();

  processIncomingSerial();
  readControls(now);

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
