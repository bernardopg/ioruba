// Teste de host parametrizado para o parser CONFIG em placas maiores.
//
// Compila o mesmo config_parser.h com mais knobs e ADC de 12-bit, validando que
// a lógica pura escala com NUM_KNOBS e com a resolução do ADC (sem assumir 3
// knobs / 10-bit). Espelha o gate de hardware (Mega >6 knobs, ESP32/RP2040
// 12-bit) no plano host.
//
//   g++ -std=c++17 -Wall -Wextra -Werror -DIORUBA_NUM_KNOBS=8
//       -DIORUBA_ADC_BITS=12 config_parser_wide_test.cpp -o cpw_test
//   ./cpw_test
//
// Retorna 0 em sucesso, 1 em falha.

#include <cstdio>
#include <cstring>
#include <string>

#include "../config_parser.h"

static int g_failures = 0;

#define CHECK(cond)                                                       \
  do {                                                                    \
    if (!(cond)) {                                                        \
      std::printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond);         \
      g_failures++;                                                       \
    }                                                                     \
  } while (0)

static ControllerConfig defaultConfig() {
  ControllerConfig config;
  iorubaApplyDefaultControllerConfig(config);
  return config;
}

static bool applyOn(const ControllerConfig &base, const std::string &payload,
                    ControllerConfig *out) {
  char buffer[512];
  std::strncpy(buffer, payload.c_str(), sizeof(buffer) - 1);
  buffer[sizeof(buffer) - 1] = '\0';
  return iorubaApplyConfigFields(base, buffer, out);
}

// Monta uma lista CSV de `count` cópias de `value`.
static std::string csv(int value, int count) {
  std::string out;
  for (int index = 0; index < count; index++) {
    if (index > 0) {
      out += ",";
    }
    out += std::to_string(value);
  }
  return out;
}

static void test_adc_max_follows_bit_depth() {
  // Com -DIORUBA_ADC_BITS=12 o teto do ADC deve ser 4095, não 1023.
  CHECK(IORUBA_ADC_MAX == 4095);
}

static void test_accepts_full_width_config() {
  const int n = IORUBA_NUM_KNOBS_VALUE;
  ControllerConfig out;
  const std::string payload =
    "threshold=4; deadzone=7; smooth=75; mins=" + csv(0, n) +
    "; maxs=" + csv(4095, n);
  CHECK(applyOn(defaultConfig(), payload, &out));
  CHECK(out.maxRaw[0] == 4095);
  CHECK(out.maxRaw[n - 1] == 4095);
}

static void test_rejects_calibration_above_12bit_max() {
  const int n = IORUBA_NUM_KNOBS_VALUE;
  ControllerConfig out;
  // 5000 > 4095 → fora do range do ADC de 12-bit.
  const std::string payload = "maxs=" + csv(5000, n);
  CHECK(!applyOn(defaultConfig(), payload, &out));
}

static void test_rejects_wrong_width_list() {
  const int n = IORUBA_NUM_KNOBS_VALUE;
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "mins=" + csv(0, n - 1), &out));  // poucos
  CHECK(!applyOn(defaultConfig(), "mins=" + csv(0, n + 1), &out));  // demais
}

int main() {
  test_adc_max_follows_bit_depth();
  test_accepts_full_width_config();
  test_rejects_calibration_above_12bit_max();
  test_rejects_wrong_width_list();

  if (g_failures == 0) {
    std::printf("ok: all wide config parser host tests passed (knobs=%d, adcMax=%d)\n",
                IORUBA_NUM_KNOBS_VALUE, IORUBA_ADC_MAX);
    return 0;
  }

  std::printf("FAILED: %d check(s)\n", g_failures);
  return 1;
}
