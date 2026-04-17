import type { ExtensionProps } from "./types";

import sht4xExtension from "./SHT4x.flowext";
import sht3xExtension from "./SHT3x.flowext";
import xymd02Extension from "./XY-MD02.flowext";
import mqttExtension from "./MQTT.flowext";
import blynkExtension from "./Blynk.flowext";
import modbusMasterExtension from "./ModbusMaster.flowext";
import jsonExtension from "./Json.flowext";
import ntpExtension from "./NTP.flowext";
import influxdbExtension from "./InfluxDB.flowext";
import ds18b20Extension from "./DS18B20.flowext";
import ahtExtension from "./AHT.flowext";
import lcdExtension from "./LCD.flowext";
import servoExtension from "./Servo.flowext";
import buzzerExtension from "./Buzzer.flowext";
import telegramExtension from "./Telegram.flowext";
import lineExtension from "./LINE.flowext";
import lowPowerExtension from "./LowPower.flowext";
import websocketExtension from "./WebSocket.flowext";
import otaExtension from "./OTA.flowext";
import rgbMatrixExtension from "./RGBMatrix.flowext";
import atsthExtension from "./ATS-TH.flowext";
import atsluxExtension from "./ATS-LUX.flowext";
import atsco2Extension from "./ATS-CO2.flowext";
import bh1750Extension from "./BH1750.flowext";
import soilRS485Extension from "./SoilRS485.flowext";
import a01nyubExtension from "./A01NYUB.flowext";
import djlk003abExtension from "./DJLK003AB.flowext";

const extensionIndex: ExtensionProps[] = [
    {
        id: 'SHT3x',
        name: 'SHT3x Temp & Humid Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: 'Get temperature and humidity from SHT30, SHT31, SHT35 sensor',
        version: '1.0.0',
        depends: [ 'ArtronShop_SHT3x@1.0.0' ],
        src: sht3xExtension,
    },
    {
        id: 'SHT4x',
        name: 'SHT4x Temp & Humid Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: 'Get temperature and humidity from SHT40, SHT41, SHT45 sensor',
        version: '1.0.0',
        depends: [ 'ArtronShop_SHT45@1.0.0' ],
        src: sht4xExtension,
    },
    {
        id: 'MQTT',
        name: 'MQTT',
        author: 'ArtronShop CO.,LTD.',
        description: 'MQTT publish/subscribe using PubSubClient library. Supports broker config, connect, publish, subscribe, and message callback.',
        version: '1.0.0',
        depends: [ 'PubSubClient@2.8' ],
        src: mqttExtension,
    },
    {
        id: 'Blynk',
        name: 'Blynk IoT',
        author: 'ArtronShop CO.,LTD.',
        description: 'Blynk IoT platform integration. Supports virtual pin read/write, connected callback, and Blynk Cloud 2.0 / Legacy Local Server.',
        version: '1.0.0',
        depends: [ 'blynk@1.3.2' ],
        src: blynkExtension,
    },
    {
        id: 'ModbusMaster',
        name: 'Modbus Master (RTU)',
        author: 'ArtronShop CO.,LTD.',
        description: 'Read/Write Coils and Registers via RS485',
        version: '1.0.0',
        depends: [ 'ModbusMaster@2.0.1' ],
        src: modbusMasterExtension,
    },
    {
        id: 'XY-MD02',
        name: 'XY-MD02 Temp & Humid Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: '(ModbusMaster Request) Get temperature and humidity from XY-MD02 sensor',
        version: '1.0.0',
        depends: [ ],
        src: xymd02Extension,
    },
    {
        id: 'JSON',
        name: 'Json',
        author: 'ArtronShop CO.,LTD.',
        description: 'Parse/Create/Serialize JSON (JavaScript Object Notation)',
        version: '1.0.0',
        depends: [ 'ArduinoJson@7.4.1' ],
        src: jsonExtension,
    },
    {
        id: 'NTP',
        name: 'NTP (Network Time Protocol)',
        author: 'ArtronShop CO.,LTD.',
        description: 'Sync and read real-time clock via NTP server (built-in ESP32, no extra library needed)',
        version: '1.0.0',
        src: ntpExtension,
    },
    {
        id: 'InfluxDB',
        name: 'InfluxDB Client',
        author: 'ArtronShop CO.,LTD.',
        description: 'Write time-series data to InfluxDB v2 using influxdb-client-arduino',
        version: '1.0.0',
        depends: [ 'InfluxDBClient@3.14.0' ],
        src: influxdbExtension,
    },
    {
        id: 'DS18B20',
        name: 'DS18B20 Temperature Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: 'Read temperature from DS18B20 digital sensor via OneWire bus',
        version: '1.0.0',
        depends: [ 'OneWire@2.3.8', 'DallasTemperature@4.0.6' ],
        src: ds18b20Extension,
    },
    {
        id: 'AHT',
        name: 'AHT10 / AHT20 / AHT30 Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: 'Read temperature and humidity from AHT10, AHT20, AHT30 via I2C (Adafruit AHTX0)',
        version: '1.0.0',
        depends: [ 'Adafruit AHTX0@2.0.5', 'Adafruit Unified Sensor@1.1.14' ],
        src: ahtExtension,
    },
    {
        id: 'LCD',
        name: 'LCD I2C (LiquidCrystal_I2C)',
        author: 'ArtronShop CO.,LTD.',
        description: 'Drive I2C LCD displays (HD44780 compatible) — Begin, Print, Clear, SetCursor, Backlight',
        version: '1.0.0',
        depends: [ 'LiquidCrystal_I2C@2.0.0' ],
        src: lcdExtension,
    },
    {
        id: 'Servo',
        name: 'Servo Motor',
        author: 'ArtronShop CO.,LTD.',
        description: 'Control servo motors on ESP32 using ESP32Servo library — Attach, Write angle, Read, Detach',
        version: '1.0.0',
        depends: [ 'ESP32Servo@3.1.3' ],
        src: servoExtension,
    },
    {
        id: 'Buzzer',
        name: 'Buzzer (Tone)',
        author: 'ArtronShop CO.,LTD.',
        description: 'Drive a passive buzzer with tone/noTone (built-in ESP32 Arduino core, no extra library)',
        version: '1.0.0',
        src: buzzerExtension,
    },
    {
        id: 'Telegram',
        name: 'Telegram Bot',
        author: 'ArtronShop CO.,LTD.',
        description: 'Send and receive messages via Telegram Bot API using UniversalTelegramBot library',
        version: '1.0.0',
        depends: [ 'UniversalTelegramBot@1.3.0', 'ArduinoJson@7.4.1' ],
        src: telegramExtension,
    },
    {
        id: 'LINE',
        name: 'LINE Message',
        author: 'ArtronShop CO.,LTD.',
        description: 'Send messages and images via LINE Messaging API using ArtronShop_LineMessaging library',
        version: '1.0.0',
        depends: [ 'ArtronShop_LineMessaging@1.0.1' ],
        src: lineExtension,
    },
    {
        id: 'LowPower',
        name: 'Low Power (Sleep Mode)',
        author: 'ArtronShop CO.,LTD.',
        description: 'ESP32 Deep Sleep (timer/pin wakeup), Light Sleep, and Wakeup Reason — built-in, no extra library',
        version: '1.0.0',
        src: lowPowerExtension,
    },
    {
        id: 'WebSocket',
        name: 'WebSocket Server',
        author: 'ArtronShop CO.,LTD.',
        description: 'WebSocket server on ESP32 using WebSocketsServer — begin, send, broadcast, on-message trigger',
        version: '1.0.0',
        depends: [ 'WebSockets@2.4.1' ],
        src: websocketExtension,
    },
    {
        id: 'OTA',
        name: 'OTA Update (ArduinoOTA)',
        author: 'ArtronShop CO.,LTD.',
        description: 'Over-the-Air firmware update via WiFi using ArduinoOTA (built-in ESP32 Arduino core)',
        version: '1.0.0',
        src: otaExtension,
    },
    {
        id: 'RGBMatrix',
        name: 'RGB LED Matrix (HUB75)',
        author: 'ArtronShop CO.,LTD.',
        description: 'Drive HUB75 RGB LED matrix panels — draw pixels, lines, rectangles, and text',
        version: '1.0.0',
        depends: [ 'Adafruit Protomatter@1.7.1', 'Adafruit GFX Library@1.12.6' ],
        src: rgbMatrixExtension,
    },
    {
        id: 'ATS-TH',
        name: 'ATS-TH Temp & Humid Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: '(ModbusMaster Request) Get temperature and humidity from ATS-TH, ATS-TH-BOX, ATS-TH-DISPLAY',
        version: '1.0.0',
        depends: [ ],
        src: atsthExtension,
    },
    {
        id: 'ATS-LUX',
        name: 'ATS-LUX Light Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: '(ModbusMaster Request) Get Light Illuminance from ATS-LUX',
        version: '1.0.0',
        depends: [ ],
        src: atsluxExtension,
    },
    {
        id: 'ATS-CO2',
        name: 'ATS-CO2 CO2 & Temp & Humid Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: '(ModbusMaster Request) Get co2, temperature and humidity from ATS-CO2',
        version: '1.0.0',
        depends: [ ],
        src: atsco2Extension,
    },
    {
        id: 'BH1750',
        name: 'BH1750 Light Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: 'Read light illuminance (lux) from BH1750 sensor via I2C',
        version: '1.0.0',
        depends: [ 'ArtronShop_BH1750@1.0.0' ],
        src: bh1750Extension,
    },
    {
        id: 'SoilRS485',
        name: 'Soil Sensor RS485 (TH-EC-PH-NPK)',
        author: 'ArtronShop CO.,LTD.',
        description: '(ModbusMaster Request) Read soil moisture, temperature, EC, PH, and NPK from RS485 soil sensor',
        version: '1.0.0',
        depends: [],
        src: soilRS485Extension,
    },
    {
        id: 'A01NYUB',
        name: 'A01NYUB Waterproof Ultrasonic Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: '(ModbusMaster Request) Read distance (mm) from A01NYUB waterproof ultrasonic sensor',
        version: '1.0.0',
        depends: [],
        src: a01nyubExtension,
    },
    {
        id: 'DJLK-003AB',
        name: 'DJLK-003AB Waterproof Ultrasonic Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: '(ModbusMaster Request) Read distance (mm) from DJLK-003AB waterproof ultrasonic sensor',
        version: '1.0.0',
        depends: [],
        src: djlk003abExtension,
    },
];

export default extensionIndex;