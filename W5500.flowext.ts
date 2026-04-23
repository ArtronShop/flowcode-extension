import type { BlockCategory } from '../types.js';

const COLOR = '#1d4ed8'; // blue-700

function registerW5500Base(
    registerPreprocessor: (d: string) => void,
    registerGlobal: (d: string) => void,
) {
    registerPreprocessor('#include <ETH.h>');
    registerPreprocessor('#include <SPI.h>');
    registerGlobal('bool _eth_connected = false;');
}

const w5500Extension: BlockCategory = {
    id: 'w5500',
    name: 'W5500 Ethernet',
    blocks: [

        // ─── On Connected ────────────────────────────────────────────────
        {
            id: 'w5500_on_connected',
            name: 'W5500 On Connected',
            trigger: true,
            color: COLOR,
            icon: '🔗',
            category: 'W5500',
            description: 'เรียกเมื่อ W5500 ได้รับ IP address สำเร็จ\nวางก่อนหรือหลัง W5500 Begin ก็ได้',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ captureCode, registerPreprocessor, registerGlobal, registerFunction }) {
                registerW5500Base(registerPreprocessor, registerGlobal);
                const body = captureCode('out', 1) ?? '';
                registerFunction(
                    'void _w5500_on_connected()',
                    body,
                    'void _w5500_on_connected();'
                );
                registerPreprocessor('#define W5500_ON_CONNECTED_CB _w5500_on_connected');
                return { parts: [] };
            }
        },

        // ─── On Disconnected ─────────────────────────────────────────────
        {
            id: 'w5500_on_disconnected',
            name: 'W5500 On Disconnected',
            trigger: true,
            color: COLOR,
            icon: '🔌',
            category: 'W5500',
            description: 'เรียกเมื่อ W5500 หลุดการเชื่อมต่อหรือเสีย IP\nวางก่อนหรือหลัง W5500 Begin ก็ได้',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ captureCode, registerPreprocessor, registerGlobal, registerFunction }) {
                registerW5500Base(registerPreprocessor, registerGlobal);
                const body = captureCode('out', 1) ?? '';
                registerFunction(
                    'void _w5500_on_disconnected()',
                    body,
                    'void _w5500_on_disconnected();'
                );
                registerPreprocessor('#define W5500_ON_DISCONNECTED_CB _w5500_on_disconnected');
                return { parts: [] };
            }
        },

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'w5500_begin',
            name: 'W5500 Begin',
            color: COLOR,
            icon: '🌐',
            category: 'W5500',
            description: 'เริ่มต้น W5500 Ethernet ผ่าน SPI\nเชื่อมต่อแบบ event-driven — ใช้ W5500 On Connected เพื่อรับ callback เมื่อได้ IP',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'hostname', type: 'text', label: 'Hostname', default: 'esp32-eth0', description: 'ชื่อ hostname ของ ESP32 บนเครือข่าย' },
                { id: 'mosi', type: 'number', label: 'MOSI Pin', default: '23', description: 'SPI MOSI pin', validation: (n: number) => Math.trunc(n) },
                { id: 'miso', type: 'number', label: 'MISO Pin', default: '19', description: 'SPI MISO pin', validation: (n: number) => Math.trunc(n) },
                { id: 'sck', type: 'number', label: 'SCK Pin', default: '18', description: 'SPI Clock pin', validation: (n: number) => Math.trunc(n) },
                { id: 'cs', type: 'number', label: 'CS Pin', default: '15', description: 'SPI Chip Select pin', validation: (n: number) => Math.trunc(n) },
                { id: 'irq', type: 'number', label: 'IRQ Pin', default: '17', description: 'Interrupt pin (-1 = ไม่ใช้)', validation: (n: number) => Math.trunc(n) },
                { id: 'rst', type: 'number', label: 'RST Pin', default: '-1', description: 'Reset pin (-1 = ไม่ใช้)', validation: (n: number) => Math.trunc(n) },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerFunction }) {
                registerW5500Base(registerPreprocessor, registerGlobal);

                const hostname = (params.hostname ?? 'esp32-eth0').replaceAll('"', '\\"');
                const cs = params.cs ?? '15';
                const irq = params.irq ?? '4';
                const rst = params.rst ?? '5';
                const sck = params.sck ?? '14';
                const miso = params.miso ?? '12';
                const mosi = params.mosi ?? '13';

                registerFunction(
                    'void _w5500_event_handler(arduino_event_id_t event, arduino_event_info_t info)',
                    [
                        '  switch (event) {',
                        '    case ARDUINO_EVENT_ETH_START:',
                        `      ETH.setHostname("${hostname}");`,
                        '      break;',
                        '    case ARDUINO_EVENT_ETH_GOT_IP:',
                        '      _eth_connected = true;',
                        '#ifdef W5500_ON_CONNECTED_CB',
                        '      W5500_ON_CONNECTED_CB();',
                        '#endif',
                        '      break;',
                        '    case ARDUINO_EVENT_ETH_LOST_IP:',
                        '    case ARDUINO_EVENT_ETH_DISCONNECTED:',
                        '    case ARDUINO_EVENT_ETH_STOP:',
                        '      _eth_connected = false;',
                        '#ifdef W5500_ON_DISCONNECTED_CB',
                        '      W5500_ON_DISCONNECTED_CB();',
                        '#endif',
                        '      break;',
                        '    default: break;',
                        '  }',
                    ].join('\n'),
                    'void _w5500_event_handler(arduino_event_id_t, arduino_event_info_t);'
                );

                return {
                    parts: [
                        [
                            `${pad}Network.onEvent(_w5500_event_handler);`,
                            `${pad}SPI.begin(${sck}, ${miso}, ${mosi});`,
                            `${pad}ETH.begin(ETH_PHY_W5500, 1, ${cs}, ${irq}, ${rst}, SPI);`,
                        ],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Is Connected ────────────────────────────────────────────────
        {
            id: 'w5500_is_connected',
            name: 'W5500 Is Connected',
            color: COLOR,
            icon: '✅',
            category: 'W5500',
            description: 'ตรวจสอบสถานะการเชื่อมต่อ Ethernet ปัจจุบัน (_eth_connected)',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'connected', type: 'output', label: 'Connected', dataType: 'void' },
                { id: 'disconnected', type: 'output', label: 'Disconnected', dataType: 'void' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            toCode({ pad, registerPreprocessor, registerGlobal }) {
                registerW5500Base(registerPreprocessor, registerGlobal);
                return {
                    parts: [
                        [`${pad}if (_eth_connected) {`],
                        { portId: 'connected', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'disconnected', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default w5500Extension;
