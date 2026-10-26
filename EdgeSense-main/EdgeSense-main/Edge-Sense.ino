#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_INA219.h>
#include <DHT.h>
#include "driver/i2s.h"
#include <math.h>
#include <string.h>
#include <stdio.h>

// ==================== SERIAL / AUDIO ====================

#define SERIAL_BAUD       921600
#define SAMPLE_RATE       16000
#define AUDIO_SAMPLES     256

#define PACKET_AUDIO      0x01
#define PACKET_TELEMETRY  0x02

// Packet format:
// [0xAA][0x55][type][length low][length high][payload...]

#define I2S_BCLK 18
#define I2S_WS   19
#define I2S_SD   23

int32_t rawSamples[AUDIO_SAMPLES];
int16_t pcmSamples[AUDIO_SAMPLES];

// ==================== SENSORS / OUTPUTS ====================

#define DHT_PIN   4
#define DHT_TYPE  DHT22

// Your LDR module uses its digital DO output.
#define LDR_PIN   34

#define LIGHT_PIN 25
#define FAN_PIN   26

// ==================== OLED / INA219 ====================

// OLED and INA219 share I2C: SDA 21, SCL 22.
#define OLED_SDA 21
#define OLED_SCL 22
#define OLED_ADDR 0x3C

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1

Adafruit_SSD1306 display(
  SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET
);

Adafruit_INA219 ina219;
DHT dht(DHT_PIN, DHT_TYPE);

// ==================== HARDWARE STATUS ====================

bool oledReady = false;
bool inaReady = false;
bool dhtReady = false;

bool lightOn = false;
bool fanOn = false;

// LDR module behaviour previously observed:
// LOW = bright, HIGH = dark.
bool roomBright = false;

float temperatureC = NAN;
float humidityPct = NAN;

float busVoltageV = NAN;
float currentMA = NAN;
float powerMW = NAN;

// ==================== TIMING ====================

uint32_t lastTelemetryMs = 0;
uint32_t lastSensorReadMs = 0;
uint32_t lastDisplayMs = 0;

const uint32_t TELEMETRY_INTERVAL_MS = 1000;
const uint32_t SENSOR_INTERVAL_MS = 2000;
const uint32_t DISPLAY_INTERVAL_MS = 500;

// ==================== PACKET TRANSMISSION ====================

void sendPacket(uint8_t packetType,
                const uint8_t* data,
                uint16_t length) {
  uint8_t header[5] = {
    0xAA,
    0x55,
    packetType,
    (uint8_t)(length & 0xFF),
    (uint8_t)((length >> 8) & 0xFF)
  };

  Serial.write(header, sizeof(header));

  if (length > 0 && data != nullptr) {
    Serial.write(data, length);
  }
}

void sendAudioPacket(const uint8_t* data, uint16_t length) {
  sendPacket(PACKET_AUDIO, data, length);
}

void sendTelemetryPacket(const uint8_t* data, uint16_t length) {
  sendPacket(PACKET_TELEMETRY, data, length);
}

// ==================== MICROPHONE ====================

// Keep the I2S settings from your working microphone sketch.
bool setupMicrophone() {
  i2s_config_t config = {};

  config.mode = (i2s_mode_t)(
    I2S_MODE_MASTER | I2S_MODE_RX
  );

  config.sample_rate = SAMPLE_RATE;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT;
  config.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  config.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 8;
  config.dma_buf_len = AUDIO_SAMPLES;
  config.use_apll = false;
  config.tx_desc_auto_clear = false;
  config.fixed_mclk = 0;

  esp_err_t result = i2s_driver_install(
    I2S_NUM_0, &config, 0, nullptr
  );

  if (result != ESP_OK) {
    return false;
  }

  i2s_pin_config_t pins = {};

  pins.bck_io_num = I2S_BCLK;
  pins.ws_io_num = I2S_WS;
  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = I2S_SD;

  result = i2s_set_pin(I2S_NUM_0, &pins);

  if (result != ESP_OK) {
    i2s_driver_uninstall(I2S_NUM_0);
    return false;
  }

  i2s_zero_dma_buffer(I2S_NUM_0);

  return true;
}

void readAndSendAudio() {
  size_t bytesRead = 0;

  esp_err_t result = i2s_read(
    I2S_NUM_0,
    rawSamples,
    sizeof(rawSamples),
    &bytesRead,
    portMAX_DELAY
  );

  if (result != ESP_OK || bytesRead == 0) {
    return;
  }

  size_t count = bytesRead / sizeof(int32_t);

  if (count > AUDIO_SAMPLES) {
    count = AUDIO_SAMPLES;
  }

  for (size_t i = 0; i < count; i++) {
    int32_t sample = rawSamples[i] >> 14;

    if (sample > 32767) sample = 32767;
    if (sample < -32768) sample = -32768;

    pcmSamples[i] = (int16_t)sample;
  }

  uint16_t payloadLength =
    (uint16_t)(count * sizeof(int16_t));

  sendAudioPacket(
    (const uint8_t*)pcmSamples,
    payloadLength
  );
}

// ==================== SENSOR READINGS ====================

void updateSensors() {
  // Digital LDR module.
  roomBright = (digitalRead(LDR_PIN) == LOW);

  if (dhtReady) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t)) temperatureC = t;
    if (!isnan(h)) humidityPct = h;
  }

  if (inaReady) {
    float v = ina219.getBusVoltage_V();
    float c = ina219.getCurrent_mA();
    float p = ina219.getPower_mW();

    if (isfinite(v)) busVoltageV = v;
    if (isfinite(c)) currentMA = c;
    if (isfinite(p)) powerMW = p;
  }
}

// ==================== TELEMETRY ====================

void sendTelemetry() {
  char json[320];

  int n = snprintf(
    json,
    sizeof(json),

    "{\"temperature_c\":%.2f,"
    "\"humidity_pct\":%.2f,"
    "\"ldr\":%d,"
    "\"room_bright\":%s,"
    "\"bus_voltage_v\":%.3f,"
    "\"current_ma\":%.2f,"
    "\"power_mw\":%.2f,"
    "\"light_on\":%s,"
    "\"fan_on\":%s}",

    isfinite(temperatureC) ? temperatureC : -999.0,
    isfinite(humidityPct) ? humidityPct : -999.0,

    roomBright ? 0 : 1,
    roomBright ? "true" : "false",

    isfinite(busVoltageV) ? busVoltageV : -999.0,
    isfinite(currentMA) ? currentMA : -999.0,
    isfinite(powerMW) ? powerMW : -999.0,

    lightOn ? "true" : "false",
    fanOn ? "true" : "false"
  );

  if (n > 0 && n < (int)sizeof(json)) {
    sendTelemetryPacket(
      (const uint8_t*)json,
      (uint16_t)n
    );
  }
}

// ==================== OLED DISPLAY ====================

void updateDisplay() {
  if (!oledReady) return;

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);

  display.println("EdgeSense");

  display.print("Temp: ");
  if (isfinite(temperatureC)) {
    display.print(temperatureC, 1);
    display.print(" C");
  } else {
    display.print("--");
  }
  display.println();

  display.print("Humidity: ");
  if (isfinite(humidityPct)) {
    display.print(humidityPct, 0);
    display.print("%");
  } else {
    display.print("--");
  }
  display.println();

  display.print("Room: ");
  display.println(roomBright ? "BRIGHT" : "DARK");

  display.print("Light: ");
  display.println(lightOn ? "ON" : "OFF");

  display.print("Fan: ");
  display.println(fanOn ? "ON" : "OFF");

  display.print("Power: ");
  if (isfinite(powerMW)) {
    display.print(powerMW, 0);
    display.print(" mW");
  } else {
    display.print("--");
  }

  display.display();
}

// ==================== HOST COMMANDS ====================

// Host sends one command per line, for example:
// LIGHT ON\n
// LIGHT OFF\n
// FAN ON\n
// FAN OFF\n

char commandBuffer[40];
size_t commandLength = 0;

void applyCommand(const char* command) {
  if (strcmp(command, "LIGHT ON") == 0) {
    lightOn = true;
    digitalWrite(LIGHT_PIN, HIGH);

  } else if (strcmp(command, "LIGHT OFF") == 0) {
    lightOn = false;
    digitalWrite(LIGHT_PIN, LOW);

  } else if (strcmp(command, "FAN ON") == 0) {
    fanOn = true;
    digitalWrite(FAN_PIN, HIGH);

  } else if (strcmp(command, "FAN OFF") == 0) {
    fanOn = false;
    digitalWrite(FAN_PIN, LOW);
  }
}

void readCommands() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();

    if (c == '\r') continue;

    if (c == '\n') {
      commandBuffer[commandLength] = '\0';

      applyCommand(commandBuffer);
      commandLength = 0;

    } else if (commandLength < sizeof(commandBuffer) - 1) {
      commandBuffer[commandLength++] = c;

    } else {
      // Discard an oversized command.
      commandLength = 0;
    }
  }
}

// ==================== SETUP ====================

void setup() {
  // USB serial carries framed binary packets only.
  // Never add Serial.println() debugging to this stream.
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  // Start the microphone using the known-working setup.
  if (!setupMicrophone()) {
    // Stop if I2S initialization fails.
    // Do not transmit text on the binary serial connection.
    while (true) {
      delay(1000);
    }
  }

  pinMode(LDR_PIN, INPUT);

  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);

  digitalWrite(LIGHT_PIN, LOW);
  digitalWrite(FAN_PIN, LOW);

  // Shared I2C bus for OLED and INA219.
  Wire.begin(OLED_SDA, OLED_SCL);

  oledReady = display.begin(
    SSD1306_SWITCHCAPVCC,
    OLED_ADDR
  );

  inaReady = ina219.begin(&Wire);

  dht.begin();
  dhtReady = true;

  updateSensors();
  updateDisplay();
}

// ==================== MAIN LOOP ====================

void loop() {
  // Always transmit a complete microphone packet first.
  readAndSendAudio();

  // Read commands arriving from the computer.
  readCommands();

  uint32_t now = millis();

  if (now - lastSensorReadMs >= SENSOR_INTERVAL_MS) {
    lastSensorReadMs = now;
    updateSensors();
  }

  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;
    sendTelemetry();
  }

  if (now - lastDisplayMs >= DISPLAY_INTERVAL_MS) {
    lastDisplayMs = now;
    updateDisplay();
  }
}