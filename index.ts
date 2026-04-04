import type { ExtensionProps } from "./types";

import sht4xExtension from "./SHT4x.flowext";
import sht3xExtension from "./SHT3x.flowext";

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
];

export default extensionIndex;