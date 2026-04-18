import type { BlockCategory } from '../types.js';

const COLOR = '#10b981'; // emerald

// Global variable names (single sensor per project, deduplicated via registerGlobal)
const G = {
    serial: '_pms_serial',
    buf: '_pms_buf',
    idx: '_pms_idx',
    valid: '_pms_valid',
    pm1: '_pms_pm1',
    pm25: '_pms_pm25',
    pm10: '_pms_pm10',
    pm1_atm: '_pms_pm1_atm',
    pm25_atm: '_pms_pm25_atm',
    pm10_atm: '_pms_pm10_atm',
};

const VALUE_OPTIONS = [
    { label: 'PM1.0 (µg/m³)', value: 'pm1', varName: G.pm1 },
    { label: 'PM2.5 (µg/m³)', value: 'pm25', varName: G.pm25 },
    { label: 'PM10 (µg/m³)', value: 'pm10', varName: G.pm10 },
    { label: 'PM1.0 Atmospheric', value: 'pm1_atm', varName: G.pm1_atm },
    { label: 'PM2.5 Atmospheric', value: 'pm25_atm', varName: G.pm25_atm },
    { label: 'PM10 Atmospheric', value: 'pm10_atm', varName: G.pm10_atm },
];

function registerPMS7003(
    serialPort: string,
    rx: string,
    tx: string,
    registerGlobal: (d: string) => void,
    registerFunction: (h: string, b: string, decl?: string) => void,
    registerPollingCode: (code: string) => void,
) {
    // Global variables
    registerGlobal(`HardwareSerial ${G.serial}(${serialPort === 'Serial1' ? '1' : serialPort === 'Serial3' ? '3' : '2'});`);
    registerGlobal(`uint8_t ${G.buf}[32];`);
    registerGlobal(`uint8_t ${G.idx} = 0;`);
    registerGlobal(`bool ${G.valid} = false;`);
    registerGlobal(`uint16_t ${G.pm1}  = 0, ${G.pm25}  = 0, ${G.pm10}  = 0;`);
    registerGlobal(`uint16_t ${G.pm1_atm} = 0, ${G.pm25_atm} = 0, ${G.pm10_atm} = 0;`);

    // Parse function
    registerFunction(
        `void pms7003_parse()`,
        [
            `  while (${G.serial}.available()) {`,
            `    uint8_t b = ${G.serial}.read();`,
            `    if (${G.idx} == 0 && b != 0x42) continue;`,
            `    if (${G.idx} == 1 && b != 0x4D) { ${G.idx} = 0; continue; }`,
            `    ${G.buf}[${G.idx}++] = b;`,
            `    if (${G.idx} < 32) continue;`,
            `    ${G.idx} = 0;`,
            `    // Verify checksum`,
            `    uint16_t sum = 0;`,
            `    for (int i = 0; i < 30; i++) sum += ${G.buf}[i];`,
            `    uint16_t chk = ((uint16_t)${G.buf}[30] << 8) | ${G.buf}[31];`,
            `    if (sum != chk) continue;`,
            `    // Parse PM values (big-endian)`,
            `    ${G.pm1} = ((uint16_t)${G.buf}[4] << 8) | ${G.buf}[5];`,
            `    ${G.pm25} = ((uint16_t)${G.buf}[6] << 8) | ${G.buf}[7];`,
            `    ${G.pm10} = ((uint16_t)${G.buf}[8] << 8) | ${G.buf}[9];`,
            `    ${G.pm1_atm} = ((uint16_t)${G.buf}[10] << 8) | ${G.buf}[11];`,
            `    ${G.pm25_atm} = ((uint16_t)${G.buf}[12] << 8) | ${G.buf}[13];`,
            `    ${G.pm10_atm} = ((uint16_t)${G.buf}[14] << 8) | ${G.buf}[15];`,
            `    ${G.valid} = true;`,
            `  }`,
        ].join('\n'),
        `void pms7003_parse();`,
    );

    // Polling: call parse every loop
    registerPollingCode(`pms7003_parse();`);
}

const pms7003Extension: BlockCategory = {
    id: 'pms7003',
    name: 'PMS7003',
    blocks: [
        // ── Config block ────────────────────────────────────────────────────
        {
            id: 'pms7003_config',
            name: 'PMS7003 Config',
            color: COLOR,
            icon: '🌫️',
            category: 'PMS7003',
            description: 'ตั้งค่า Serial สำหรับเซ็นเซอร์ฝุ่น PMS7003\nต้องวางก่อนบล็อก PMS7003 Read',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'serial_port', label: 'Serial Port', type: 'option',
                    options: [
                        { label: 'Serial1', value: 'Serial1' },
                        { label: 'Serial2', value: 'Serial2' },
                        { label: 'Serial3', value: 'Serial3' },
                    ],
                    default: 'Serial2',
                    description: 'HardwareSerial ที่ใช้ต่อ PMS7003',
                },
                {
                    id: 'rx', label: 'RX Pin', type: 'number',
                    validation: n => Math.trunc(n), default: '16',
                    description: 'GPIO pin ที่ต่อขา TX ของ PMS7003',
                },
            ],
            toCode({ pad, params, registerGlobal, registerFunction, registerPollingCode }) {
                const serialPort = params.serial_port ?? 'Serial2';
                const rx = params.rx ?? '-1';
                const tx = params.tx ?? '-1';

                registerPMS7003(serialPort, rx, tx, registerGlobal, registerFunction, registerPollingCode);

                return {
                    parts: [
                        [`${pad}${G.serial}.begin(9600, SERIAL_8N1, ${rx}, ${tx});`],
                        { portId: 'out', depthDelta: 0 },
                    ],
                };
            },
        },

        // ── Read block ──────────────────────────────────────────────────────
        {
            id: 'pms7003_read',
            name: 'PMS7003 Read',
            color: COLOR,
            icon: '🌫️',
            category: 'PMS7003',
            description: 'อ่านค่าฝุ่นจาก PMS7003 ที่ถูก parse ไว้ใน loop() แล้ว\nต้องมี PMS7003 Config ก่อนเสมอ',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'int', description: 'ค่าฝุ่นที่อ่านได้ (µg/m³)' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่อยังไม่เคยรับข้อมูลจากเซ็นเซอร์' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'จุดต่อสายบล็อกถัดไป' },
            ],
            params: [
                {
                    id: 'value_type', label: 'Value', type: 'option',
                    description: 'ค่าที่ต้องการอ่าน',
                    options: VALUE_OPTIONS.map(({ label, value }) => ({ label, value })),
                },
            ],
            toCode({ block, pad, safeId, params, registerGlobal, registerFunction, registerPollingCode }) {
                const id = safeId(block.id);
                const valueType = params.value_type ?? 'pm25';
                const entry = VALUE_OPTIONS.find(o => o.value === valueType) ?? VALUE_OPTIONS[1];

                // Ensure globals & polling exist even if Config block is missing
                registerPMS7003('Serial2', '16', '17', registerGlobal, registerFunction, registerPollingCode);

                return {
                    parts: [
                        [`${pad}int ${id} = (int)${entry.varName};`],
                        [`${pad}if (${G.valid}) {`],
                        { portId: 'value', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'error', depthDelta: 1 },
                        [`${pad}}`],
                    ],
                };
            },
        },
    ],
};

export default pms7003Extension;
