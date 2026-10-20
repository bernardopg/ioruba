#pragma once
#include <array>
#include <cstring>

struct MockEEPROM {
  std::array<unsigned char, 512> bytes{};
  unsigned writes = 0;
  void begin(unsigned) {}
  void commit() {}
  template<class T> void get(unsigned address, T &value) { std::memcpy(&value, bytes.data() + address, sizeof(T)); }
  template<class T> void put(unsigned address, const T &value) { std::memcpy(bytes.data() + address, &value, sizeof(T)); ++writes; }
};
inline MockEEPROM EEPROM;
