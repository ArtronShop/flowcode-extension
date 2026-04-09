import type { ExtensionProps } from "./types";

import sht4xExtension from "./SHT4x.flowext";
import sht3xExtension from "./SHT3x.flowext";
import xymd02Extension from "./XY-MD02.flowext";
import mqttExtension from "./MQTT.flowext";
import blynkExtension from "./Blynk.flowext";

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
        id: 'XY-MD02',
        name: 'XY-MD02 Temp & Humid Sensor',
        author: 'ArtronShop CO.,LTD.',
        description: 'Get temperature and humidity from XY-MD02 sensor',
        version: '1.0.0',
        depends: [ 'ModbusMaster@2.0.1' ],
        src: xymd02Extension,
    },
];

export default extensionIndex;