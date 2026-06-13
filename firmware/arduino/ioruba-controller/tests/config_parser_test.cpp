// Teste de host para a lógica pura do parser CONFIG do firmware.
//
// Compila e roda fora do AVR (g++), exercitando config_parser.h sem o runtime
// Arduino. Cobre os campos válidos, limites inválidos e entradas malformadas.
//
//   g++ -std=c++17 -Wall -Wextra -Werror config_parser_test.cpp -o config_parser_test
//   ./config_parser_test
//
// Também roda no CI (job firmware). Retorna 0 em sucesso, 1 em falha.

#include <cstdio>
#include <cstring>

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

// iorubaApplyConfigFields muta o payload (strtok_r), então cada caso usa um buffer
// próprio e mutável.
static bool applyOn(const ControllerConfig &base, const char *payload,
                    ControllerConfig *out) {
  char buffer[192];
  std::strncpy(buffer, payload, sizeof(buffer) - 1);
  buffer[sizeof(buffer) - 1] = '\0';
  return iorubaApplyConfigFields(base, buffer, out);
}

static void test_accepts_full_valid_config() {
  ControllerConfig out;
  const bool ok = applyOn(defaultConfig(),
                          "threshold=8; deadzone=10; smooth=60; "
                          "mins=0,5,10; maxs=1000,1015,1023",
                          &out);
  CHECK(ok);
  CHECK(out.changeThreshold == 8);
  CHECK(out.edgeDeadzone == 10);
  CHECK(out.smoothingStrength == 60);
  CHECK(out.minRaw[0] == 0 && out.minRaw[1] == 5 && out.minRaw[2] == 10);
  CHECK(out.maxRaw[0] == 1000 && out.maxRaw[1] == 1015 && out.maxRaw[2] == 1023);
}

static void test_partial_config_keeps_other_fields() {
  ControllerConfig base = defaultConfig();
  base.changeThreshold = 42;
  ControllerConfig out;
  const bool ok = applyOn(base, "smooth=10", &out);
  CHECK(ok);
  CHECK(out.smoothingStrength == 10);
  CHECK(out.changeThreshold == 42);  // inalterado
}

static void test_rejects_smooth_above_100() {
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "smooth=101", &out));
}

static void test_rejects_inverted_calibration_range() {
  ControllerConfig out;
  // min >= max é inválido (iorubaIsValidCalibrationRange exige min < max).
  CHECK(!applyOn(defaultConfig(), "mins=900,0,0; maxs=900,1023,1023", &out));
}

static void test_rejects_calibration_out_of_adc_range() {
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "maxs=2000,1023,1023", &out));
}

static void test_rejects_wrong_knob_count_in_list() {
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "mins=0,0", &out));        // poucos
  CHECK(!applyOn(defaultConfig(), "mins=0,0,0,0", &out));    // demais
}

static void test_rejects_unknown_field() {
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "bogus=1", &out));
}

static void test_rejects_missing_separator() {
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "threshold", &out));
}

static void test_rejects_non_numeric_value() {
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "threshold=abc", &out));
}

static void test_rejects_empty_payload() {
  ControllerConfig out;
  CHECK(!applyOn(defaultConfig(), "", &out));
  CHECK(!applyOn(defaultConfig(), "   ", &out));
}

static void test_equals_detects_changes() {
  ControllerConfig a = defaultConfig();
  ControllerConfig b = defaultConfig();
  CHECK(iorubaControllerConfigEquals(a, b));
  b.edgeDeadzone += 1;
  CHECK(!iorubaControllerConfigEquals(a, b));
}

int main() {
  test_accepts_full_valid_config();
  test_partial_config_keeps_other_fields();
  test_rejects_smooth_above_100();
  test_rejects_inverted_calibration_range();
  test_rejects_calibration_out_of_adc_range();
  test_rejects_wrong_knob_count_in_list();
  test_rejects_unknown_field();
  test_rejects_missing_separator();
  test_rejects_non_numeric_value();
  test_rejects_empty_payload();
  test_equals_detects_changes();

  if (g_failures == 0) {
    std::printf("ok: all config parser host tests passed\n");
    return 0;
  }

  std::printf("FAILED: %d check(s)\n", g_failures);
  return 1;
}
