import type { BlockCategory } from '../types.js';

const COLOR = '#2563eb'; // blue-600

function getPrintfSpecifiers(format: string): string[] {
    const matches = format.match(/%%|%[-+0 #]*(?:\*|\d+)?(?:\.(?:\*|\d+))?(?:hh?|ll?|[ljztL])?[diouxXeEfgGaAcspn]/g) ?? [];
    return matches.filter(m => m !== '%%').map(m => m[m.length - 1]);
}

function specifierToDataType(spec: string): string {
    if ('diouxX'.includes(spec)) return 'int';
    if ('eEfgGaA'.includes(spec)) return 'float';
    if (spec === 's') return 'String';
    if (spec === 'c') return 'char';
    return 'any';
}

function wrapPrintfArgs(args: string[], specs: string[]): string[] {
    return args.map((a, i) => specs[i] === 's' ? `String(${a}).c_str()` : a);
}

function registerBT(
    registerPreprocessor: (d: string) => void,
    registerGlobal: (d: string) => void,
) {
    registerPreprocessor('#include "BluetoothSerial.h"');
    registerGlobal('BluetoothSerial SerialBT;');
    registerGlobal('String _bt_rx_str = "";');
}

const btExtension: BlockCategory = {
    id: 'bluetooth-serial',
    name: 'Bluetooth Serial',
    blocks: [

        // ─── On Receive ──────────────────────────────────────────────────
        {
            id: 'bt_on_receive',
            name: 'BT On Receive',
            trigger: true,
            color: COLOR,
            icon: '📲',
            category: 'Bluetooth',
            description: 'เรียกเมื่อรับข้อมูลจาก Bluetooth\nภายใน handler ใช้ BT Received String เพื่ออ่านข้อมูลที่รับมา\nวางก่อนหรือหลัง BT Begin ก็ได้',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ captureCode, registerPreprocessor, registerGlobal, registerFunction }) {
                registerBT(registerPreprocessor, registerGlobal);
                const body = captureCode('out', 1) ?? '';
                registerFunction(
                    'void _bt_on_receive()',
                    body,
                    'void _bt_on_receive();'
                );
                registerPreprocessor('#define BT_ON_RECEIVE_CB _bt_on_receive');
                return { parts: [] };
            }
        },

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'bt_begin',
            name: 'BT Begin',
            color: COLOR,
            icon: '🔵',
            category: 'Bluetooth',
            description: 'เริ่มต้น Bluetooth Serial (Classic BT — SPP)\nไม่ต้องติดตั้ง library เพิ่ม — ใช้ BluetoothSerial.h ที่ฝังใน Arduino Core',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'name', type: 'text', label: 'Device Name', default: 'ESP32-BT', description: 'ชื่อ Bluetooth ที่แสดงบนอุปกรณ์อื่น' },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerBT(registerPreprocessor, registerGlobal);
                const name = (params.name ?? 'ESP32-BT').replaceAll('"', '\\"');

                registerPollingCode([
                    '#ifdef BT_ON_RECEIVE_CB',
                    'if (SerialBT.available()) {',
                    '  _bt_rx_str = "";',
                    '  while (SerialBT.available()) {',
                    '    _bt_rx_str += (char)SerialBT.read();',
                    '  }',
                    '  BT_ON_RECEIVE_CB();',
                    '}',
                    '#endif',
                ].join('\n'));

                return {
                    parts: [
                        [`${pad}SerialBT.begin("${name}");`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Received String ─────────────────────────────────────────────
        {
            id: 'bt_received',
            name: 'BT Received String',
            color: COLOR,
            icon: '📨',
            category: 'Bluetooth',
            description: 'ข้อมูลที่รับมาล่าสุดจาก Bluetooth (_bt_rx_str)\nใช้ภายใน BT On Receive เท่านั้น',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'data', type: 'output', label: 'Data', dataType: 'String' }],
            toExpr: () => '_bt_rx_str',
            toCode({ registerPreprocessor, registerGlobal }) {
                registerBT(registerPreprocessor, registerGlobal);
                return {
                    parts: [
                        { portId: 'data', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Available ───────────────────────────────────────────────────
        {
            id: 'bt_available',
            name: 'BT Available',
            color: COLOR,
            icon: '📬',
            category: 'Bluetooth',
            description: 'ตรวจสอบว่ามีข้อมูลรอรับจาก Bluetooth หรือไม่',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'has_data', type: 'output', label: 'Has Data', dataType: 'void', description: 'มีข้อมูลรอรับ' },
                { id: 'empty', type: 'output', label: 'Empty', dataType: 'void', description: 'ไม่มีข้อมูล' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            toCode({ pad, registerPreprocessor, registerGlobal }) {
                registerBT(registerPreprocessor, registerGlobal);
                return {
                    parts: [
                        [`${pad}if (SerialBT.available()) {`],
                        { portId: 'has_data', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'empty', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Print ───────────────────────────────────────────────────────
        {
            id: 'bt_print',
            name: 'BT Print',
            color: COLOR,
            icon: '📤',
            category: 'Bluetooth',
            description: 'ส่งข้อมูลออกทาง Bluetooth Serial',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
                { id: 'value', type: 'input', label: 'Value', dataType: 'any', description: 'ข้อมูลที่จะส่ง (ถ้าไม่ต่อสาย ใช้ค่าจาก param)' },
            ],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'value', type: 'text', label: 'Value', default: '', description: 'ใช้เมื่อไม่มีบล็อกต่อเข้ามา' },
                {
                    id: 'newline', type: 'option', label: 'New Line', default: 'yes',
                    options: [
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                    ],
                },
            ],
            toCode({ pad, params, resolveInput, registerPreprocessor, registerGlobal }) {
                registerBT(registerPreprocessor, registerGlobal);
                const fn = params.newline === 'no' ? 'print' : 'println';
                const val = params.value ?? '';
                const expr = resolveInput('value') ?? `"${val.replaceAll('"', '\\"')}"`;
                return {
                    parts: [
                        [`${pad}SerialBT.${fn}(${expr});`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Printf ──────────────────────────────────────────────────────
        {
            id: 'bt_printf',
            name: 'BT Print Format',
            color: COLOR,
            icon: '📝',
            category: 'serial',
            description: 'พิมพ์ค่าตัวแปรจากบล็อกอื่น',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: 'Out', dataType: 'void' }],
            params: [
                { id: 'format', type: 'text', label: 'Format', default: 'Value=%d\\n', description: 'รูปแบบ printf เช่น "Temp: %.1f" หรือ "Count: %d, Name: %s" (จำนวน input จะปรับตาม specifier อัตโนมัติ)' }
            ],
            dynamicPorts({ format }) {
                const specs = getPrintfSpecifiers(format ?? '%d');
                return {
                    inputs: [
                        { id: 'inp', type: 'input', label: '➜', dataType: 'void', description: 'สายลำดับการทำงาน' },
                        ...specs.map((spec, i) => ({
                            id: `arg${i + 1}`, type: 'input' as const, label: `Arg ${i + 1}`, dataType: specifierToDataType(spec) as import('./types.js').DataType
                        }))
                    ]
                };
            },
            toCode({ pad, resolveInput, params }) {
                const fmt = (params.format ?? '%d').replaceAll('"', '\\"');
                const specs = getPrintfSpecifiers(fmt);
                const args = specs.map((_, i) => resolveInput(`arg${i + 1}`) ?? '0');
                const wrappedArgs = wrapPrintfArgs(args, specs);
                const argsPart = wrappedArgs.length > 0 ? `, ${wrappedArgs.join(', ')}` : '';
                return {
                    parts: [
                        [`${pad}SerialBT.printf("${fmt}"${argsPart});`],
                        { portId: 'out', depthDelta: 0 }
                    ]
                };
            }
        },
    ]
};

export default btExtension;
