import type { BlockCategory } from '../types.js';

const COLOR = '#059669'; // emerald-600

function parseMac(mac: string): string {
    const bytes = mac.split(':').map(b => `0x${b.toUpperCase().padStart(2, '0')}`);
    return bytes.length === 6 ? bytes.join(', ') : '0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED';
}

function parseIP(ip: string): string {
    const parts = ip.split('.').map(Number);
    return parts.length === 4 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)
        ? `IPAddress(${parts.join(', ')})`
        : 'IPAddress(192, 168, 1, 100)';
}

const arduinoEthernetExtension: BlockCategory = {
    id: 'arduino-ethernet',
    name: 'Ethernet (Arduino)',
    blocks: [

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'areth_begin',
            name: 'Ethernet Begin',
            color: COLOR,
            icon: '🔌',
            category: 'Ethernet',
            description: 'เริ่มต้น Ethernet ด้วย Arduino Ethernet library\nรองรับ W5100, W5200, W5500 — DHCP หรือ Static IP',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'connected', type: 'output', label: 'Connected', dataType: 'void', description: 'DHCP: ได้รับ IP สำเร็จ | Static: สาย LAN เชื่อมต่ออยู่' },
                { id: 'failed', type: 'output', label: 'Failed', dataType: 'void', description: 'DHCP: ไม่ได้รับ IP | Static: ไม่มีสาย LAN' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                { id: 'mac', type: 'text', label: 'MAC Address', default: 'DE:AD:BE:EF:FE:ED', description: 'MAC address รูปแบบ XX:XX:XX:XX:XX:XX' },
                { id: 'cs', type: 'number', label: 'CS Pin', default: '15', description: 'SPI Chip Select pin', validation: (n: number) => Math.trunc(n) },
                {
                    id: 'mode', type: 'option', label: 'Mode', default: 'dhcp',
                    options: [
                        { label: 'DHCP', value: 'dhcp' },
                        { label: 'Static', value: 'static' },
                    ],
                },
                {
                    id: 'dhcp_timeout', type: 'number', label: 'DHCP Timeout (s)', default: '10',
                    description: 'ระยะเวลาสูงสุดในการรอ DHCP (วินาที)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                    hidden: ({ params }) => params.mode !== 'dhcp',
                },
                { id: 'ip', type: 'text', label: 'IP Address', default: '192.168.1.100', hidden: ({ params }) => params.mode !== 'static' },
                { id: 'dns', type: 'text', label: 'DNS Server', default: '8.8.8.8', hidden: ({ params }) => params.mode !== 'static' },
                { id: 'gateway', type: 'text', label: 'Gateway', default: '192.168.1.1', hidden: ({ params }) => params.mode !== 'static' },
                { id: 'subnet', type: 'text', label: 'Subnet Mask', default: '255.255.255.0', hidden: ({ params }) => params.mode !== 'static' },
            ],
            toCode({ block, safeId, pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerPreprocessor('#include <SPI.h>');
                registerPreprocessor('#include <Ethernet.h>');
                registerPreprocessor('#define USE_ARDUINO_ETHERNET 1');

                const id = safeId(block.id);
                const mac = parseMac(params.mac ?? 'DE:AD:BE:EF:FE:ED');
                const cs = params.cs ?? '15';

                registerGlobal(`byte _eth_mac_${id}[] = { ${mac} };`);
                registerPollingCode('Ethernet.maintain();');

                const mode = params.mode ?? 'dhcp';

                if (mode === 'static') {
                    const ip = parseIP(params.ip ?? '192.168.1.100');
                    const dns = parseIP(params.dns ?? '8.8.8.8');
                    const gateway = parseIP(params.gateway ?? '192.168.1.1');
                    const subnet = parseIP(params.subnet ?? '255.255.255.0');
                    return {
                        parts: [
                            [
                                `${pad}Ethernet.init(${cs});`,
                                `${pad}Ethernet.begin(_eth_mac_${id}, ${ip}, ${dns}, ${gateway}, ${subnet});`,
                                `${pad}if (Ethernet.linkStatus() == LinkON) {`,
                            ],
                            { portId: 'connected', depthDelta: 1 },
                            [`${pad}} else {`],
                            { portId: 'failed', depthDelta: 1 },
                            [`${pad}}`],
                            { portId: 'out', depthDelta: 0 },
                        ]
                    };
                }

                // DHCP mode — Ethernet.begin() returns 1 on success, 0 on failure
                const timeoutMs = Number(params.dhcp_timeout ?? 10) * 1000;
                return {
                    parts: [
                        [
                            `${pad}Ethernet.init(${cs});`,
                            `${pad}if (Ethernet.begin(_eth_mac_${id}, ${timeoutMs}) != 0) {`,
                        ],
                        { portId: 'connected', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'failed', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Is Connected ────────────────────────────────────────────────
        {
            id: 'areth_is_connected',
            name: 'Ethernet Is Connected',
            color: COLOR,
            icon: '✅',
            category: 'Ethernet',
            description: 'ตรวจสอบสถานะสาย Ethernet (Ethernet.linkStatus())',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'connected', type: 'output', label: 'Connected', dataType: 'void', description: 'สายเชื่อมต่ออยู่' },
                { id: 'disconnected', type: 'output', label: 'Disconnected', dataType: 'void', description: 'สายไม่ได้เชื่อมต่อ' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            toCode({ pad, registerPreprocessor }) {
                registerPreprocessor('#include <Ethernet.h>');
                return {
                    parts: [
                        [`${pad}if (Ethernet.linkStatus() == LinkON) {`],
                        { portId: 'connected', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'disconnected', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Local IP ────────────────────────────────────────────────────
        {
            id: 'areth_local_ip',
            name: 'Ethernet Local IP',
            color: COLOR,
            icon: '🏠',
            category: 'Ethernet',
            description: 'ค่า IP address ปัจจุบันของ Ethernet (Ethernet.localIP().toString())',
            inputs: [],
            outputs: [{ id: 'ip', type: 'output', label: 'IP', dataType: 'String' }],
            toExpr: () => 'Ethernet.localIP().toString()',
            toCode() { return { parts: [] }; }
        },
    ]
};

export default arduinoEthernetExtension;
