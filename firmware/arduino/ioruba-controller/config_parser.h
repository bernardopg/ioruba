#ifndef IORUBA_CONFIG_PARSER_H
#define IORUBA_CONFIG_PARSER_H

// Lógica pura de configuração do controlador Ioruba, sem dependências do runtime
// Arduino (Serial/EEPROM/analogRead). Isolada aqui para poder ser exercida por
// testes de host (g++) além de compilar dentro do sketch .ino.

#include <ctype.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#ifndef IORUBA_NUM_KNOBS
#define IORUBA_NUM_KNOBS 3
#endif

static const int IORUBA_NUM_KNOBS_VALUE = IORUBA_NUM_KNOBS;
static const int IORUBA_ADC_MIN = 0;
static const int IORUBA_ADC_MAX = 1023;

static const int IORUBA_DEFAULT_CHANGE_THRESHOLD = 4;
static const int IORUBA_DEFAULT_EDGE_DEADZONE = 7;
static const int IORUBA_DEFAULT_SMOOTHING_STRENGTH = 75;

static const uint16_t IORUBA_EEPROM_MAGIC = 0x49A5;
static const uint8_t IORUBA_EEPROM_SCHEMA_VERSION = 1;

struct ControllerConfig {
  uint16_t magic;
  uint8_t schemaVersion;
  uint8_t knobCount;
  uint8_t changeThreshold;
  uint8_t edgeDeadzone;
  uint8_t smoothingStrength;
  uint16_t minRaw[IORUBA_NUM_KNOBS];
  uint16_t maxRaw[IORUBA_NUM_KNOBS];
};

inline bool iorubaIsValidCalibrationRange(int minRaw, int maxRaw) {
  return minRaw >= IORUBA_ADC_MIN && maxRaw <= IORUBA_ADC_MAX && minRaw < maxRaw;
}

inline bool iorubaValidateControllerConfig(const ControllerConfig &config) {
  if (config.knobCount != IORUBA_NUM_KNOBS) {
    return false;
  }

  if (config.smoothingStrength > 100) {
    return false;
  }

  for (int index = 0; index < IORUBA_NUM_KNOBS; index++) {
    if (!iorubaIsValidCalibrationRange(config.minRaw[index], config.maxRaw[index])) {
      return false;
    }
  }

  return true;
}

inline void iorubaApplyDefaultControllerConfig(ControllerConfig &config) {
  config.magic = IORUBA_EEPROM_MAGIC;
  config.schemaVersion = IORUBA_EEPROM_SCHEMA_VERSION;
  config.knobCount = IORUBA_NUM_KNOBS;
  config.changeThreshold = IORUBA_DEFAULT_CHANGE_THRESHOLD;
  config.edgeDeadzone = IORUBA_DEFAULT_EDGE_DEADZONE;
  config.smoothingStrength = IORUBA_DEFAULT_SMOOTHING_STRENGTH;

  for (int index = 0; index < IORUBA_NUM_KNOBS; index++) {
    config.minRaw[index] = IORUBA_ADC_MIN;
    config.maxRaw[index] = IORUBA_ADC_MAX;
  }
}

inline char *iorubaTrimLeadingWhitespace(char *value) {
  // isspace exige um valor representável como unsigned char (ou EOF); passar um
  // char possivelmente negativo é comportamento indefinido em C/C++.
  while (*value != '\0' && isspace(static_cast<unsigned char>(*value))) {
    value++;
  }

  return value;
}

inline void iorubaTrimTrailingWhitespace(char *value) {
  int length = strlen(value);
  while (length > 0 && isspace(static_cast<unsigned char>(value[length - 1]))) {
    value[length - 1] = '\0';
    length--;
  }
}

inline char *iorubaTrimWhitespace(char *value) {
  char *trimmed = iorubaTrimLeadingWhitespace(value);
  iorubaTrimTrailingWhitespace(trimmed);
  return trimmed;
}

inline bool iorubaParseIntegerValue(const char *value, int minimum, int maximum,
                                    int *destination) {
  if (value == NULL || *value == '\0') {
    return false;
  }

  char *end = NULL;
  const long parsed = strtol(value, &end, 10);
  if (end == value || *iorubaTrimLeadingWhitespace(end) != '\0') {
    return false;
  }

  if (parsed < minimum || parsed > maximum) {
    return false;
  }

  *destination = static_cast<int>(parsed);
  return true;
}

inline bool iorubaParseIntegerList(char *value, uint16_t *destination) {
  if (value == NULL || *value == '\0') {
    return false;
  }

  int index = 0;
  char *context = NULL;
  char *entry = strtok_r(value, ",", &context);
  while (entry != NULL) {
    if (index >= IORUBA_NUM_KNOBS) {
      return false;
    }

    int parsed = 0;
    char *trimmed = iorubaTrimWhitespace(entry);
    if (!iorubaParseIntegerValue(trimmed, IORUBA_ADC_MIN, IORUBA_ADC_MAX, &parsed)) {
      return false;
    }

    destination[index++] = static_cast<uint16_t>(parsed);
    entry = strtok_r(NULL, ",", &context);
  }

  return index == IORUBA_NUM_KNOBS;
}

// Aplica os campos de um payload CONFIG (sem o prefixo "CONFIG ") sobre uma cópia
// de `base`, retornando o resultado em `out`. Não persiste nada: a decisão de
// salvar e o efeito colateral serial ficam no sketch. Retorna false em qualquer
// campo inválido/desconhecido ou quando o config resultante não valida.
inline bool iorubaApplyConfigFields(const ControllerConfig &base, char *payload,
                                    ControllerConfig *out) {
  if (payload == NULL || out == NULL) {
    return false;
  }

  ControllerConfig nextConfig = base;
  bool sawField = false;

  char *context = NULL;
  char *entry = strtok_r(payload, ";", &context);
  while (entry != NULL) {
    char *trimmedEntry = iorubaTrimWhitespace(entry);
    if (*trimmedEntry != '\0') {
      char *separator = strchr(trimmedEntry, '=');
      if (separator == NULL) {
        return false;
      }

      *separator = '\0';
      char *key = iorubaTrimWhitespace(trimmedEntry);
      char *value = iorubaTrimWhitespace(separator + 1);
      sawField = true;

      if (strcmp(key, "threshold") == 0) {
        int parsed = 0;
        if (!iorubaParseIntegerValue(value, 0, 255, &parsed)) {
          return false;
        }
        nextConfig.changeThreshold = static_cast<uint8_t>(parsed);
      } else if (strcmp(key, "deadzone") == 0) {
        int parsed = 0;
        if (!iorubaParseIntegerValue(value, 0, 255, &parsed)) {
          return false;
        }
        nextConfig.edgeDeadzone = static_cast<uint8_t>(parsed);
      } else if (strcmp(key, "smooth") == 0) {
        int parsed = 0;
        if (!iorubaParseIntegerValue(value, 0, 100, &parsed)) {
          return false;
        }
        nextConfig.smoothingStrength = static_cast<uint8_t>(parsed);
      } else if (strcmp(key, "mins") == 0) {
        if (!iorubaParseIntegerList(value, nextConfig.minRaw)) {
          return false;
        }
      } else if (strcmp(key, "maxs") == 0) {
        if (!iorubaParseIntegerList(value, nextConfig.maxRaw)) {
          return false;
        }
      } else {
        return false;
      }
    }

    entry = strtok_r(NULL, ";", &context);
  }

  if (!sawField || !iorubaValidateControllerConfig(nextConfig)) {
    return false;
  }

  *out = nextConfig;
  return true;
}

inline bool iorubaControllerConfigEquals(const ControllerConfig &a,
                                         const ControllerConfig &b) {
  if (a.changeThreshold != b.changeThreshold ||
      a.edgeDeadzone != b.edgeDeadzone ||
      a.smoothingStrength != b.smoothingStrength) {
    return false;
  }

  for (int index = 0; index < IORUBA_NUM_KNOBS; index++) {
    if (a.minRaw[index] != b.minRaw[index] || a.maxRaw[index] != b.maxRaw[index]) {
      return false;
    }
  }

  return true;
}

#endif  // IORUBA_CONFIG_PARSER_H
