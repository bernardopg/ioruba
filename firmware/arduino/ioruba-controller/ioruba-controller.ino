#include <WiFi.h>

const char* ssid = "Bitter";
const char* password = "@25370080!";

void setup() {
  Serial.begin(115200);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("Conectando");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado!");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Reconectando...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
  }
  delay(10000);
}