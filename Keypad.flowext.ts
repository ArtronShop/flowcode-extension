import type { BlockCategory } from '../types.js';

const COLOR = '#9333ea'; // purple-600

function buildKeymap(layout: string, rows: number, cols: number): string {
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
        const cells = Array.from({ length: cols }, (_, c) => {
            const ch = layout[r * cols + c] ?? '?';
            if (ch === "'")  return `'\\''`;
            if (ch === '\\') return `'\\\\'`;
            return `'${ch}'`;
        });
        lines.push(`  { ${cells.join(', ')} }`);
    }
    return `{\n${lines.join(',\n')}\n}`;
}

const keypadExtension: BlockCategory = {
    id: 'keypad',
    name: 'Keypad',
    blocks: [

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'kp_begin',
            name: 'Keypad Begin',
            color: COLOR,
            icon: '⌨️',
            category: 'Keypad',
            description: 'กำหนดชนิด Keypad และขาเชื่อมต่อ\nต้องวางก่อน Keypad On Press / Keypad Read',
            inputs:  [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'type', type: 'option', label: 'Keypad Type', default: '4x4',
                    options: [
                        { label: '4×4 (16 keys)', value: '4x4' },
                        { label: '4×3 (12 keys)', value: '4x3' },
                    ],
                },
                { id: 'r1', type: 'number', label: 'Row 1 Pin', default: '13', validation: (n: number) => Math.trunc(n) },
                { id: 'r2', type: 'number', label: 'Row 2 Pin', default: '12', validation: (n: number) => Math.trunc(n) },
                { id: 'r3', type: 'number', label: 'Row 3 Pin', default: '14', validation: (n: number) => Math.trunc(n) },
                { id: 'r4', type: 'number', label: 'Row 4 Pin', default: '27', validation: (n: number) => Math.trunc(n) },
                { id: 'c1', type: 'number', label: 'Col 1 Pin', default: '26', validation: (n: number) => Math.trunc(n) },
                { id: 'c2', type: 'number', label: 'Col 2 Pin', default: '25', validation: (n: number) => Math.trunc(n) },
                { id: 'c3', type: 'number', label: 'Col 3 Pin', default: '33', validation: (n: number) => Math.trunc(n) },
                {
                    id: 'c4', type: 'number', label: 'Col 4 Pin', default: '32',
                    validation: (n: number) => Math.trunc(n),
                    hidden: ({ params }) => params.type !== '4x4',
                },
                {
                    id: 'layout_4x4', type: 'text', label: 'Key Layout', default: '123A456B789C*0#D',
                    description: 'รูปแบบปุ่มเรียงจากซ้ายบน → ขวาล่าง (16 ตัวอักษร)',
                    hidden: ({ params }) => params.type !== '4x4',
                },
                {
                    id: 'layout_4x3', type: 'text', label: 'Key Layout', default: '123456789*0#',
                    description: 'รูปแบบปุ่มเรียงจากซ้ายบน → ขวาล่าง (12 ตัวอักษร)',
                    hidden: ({ params }) => params.type !== '4x3',
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerPreprocessor('#include <Keypad.h>');

                const type   = params.type ?? '4x4';
                const rows   = 4;
                const cols   = type === '4x3' ? 3 : 4;
                const layout = type === '4x3'
                    ? (params.layout_4x3 ?? '123456789*0#')
                    : (params.layout_4x4 ?? '123A456B789C*0#D');

                const rowPins = [params.r1 ?? '13', params.r2 ?? '12', params.r3 ?? '14', params.r4 ?? '27'];
                const colPins = [params.c1 ?? '26', params.c2 ?? '25', params.c3 ?? '33'];
                if (cols === 4) colPins.push(params.c4 ?? '32');

                registerGlobal([
                    `const byte _kp_rows = ${rows};`,
                    `const byte _kp_cols = ${cols};`,
                    `char _kp_keys[${rows}][${cols}] = ${buildKeymap(layout, rows, cols)};`,
                    `byte _kp_row_pins[${rows}] = { ${rowPins.join(', ')} };`,
                    `byte _kp_col_pins[${cols}] = { ${colPins.join(', ')} };`,
                    `Keypad _kp = Keypad(makeKeymap(_kp_keys), _kp_row_pins, _kp_col_pins, _kp_rows, _kp_cols);`,
                    `char _kp_key = 0;`,
                ].join('\n'));

                registerPollingCode([
                    '#ifdef KEYPAD_ON_PRESS_CB',
                    '  {',
                    '    char _new_key = _kp.getKey();',
                    '    if (_new_key) {',
                    '      _kp_key = _new_key;',
                    '      KEYPAD_ON_PRESS_CB();',
                    '    }',
                    '  }',
                    '#endif',
                ].join('\n'));

                return {
                    parts: [
                        [`${pad}// Keypad initialized via globals`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── On Press ────────────────────────────────────────────────────
        {
            id: 'kp_on_press',
            name: 'Keypad On Press',
            trigger: true,
            color: COLOR,
            icon: '🔔',
            category: 'Keypad',
            requires: ['kp_begin'],
            description: 'เรียกทุกครั้งที่มีการกดปุ่มบน Keypad\nวางก่อนหรือหลัง Keypad Begin ก็ได้\nอ่านค่าปุ่มด้วยบล็อก Keypad Key',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [],
            toCode({ captureCode, registerPreprocessor, registerFunction }) {
                registerPreprocessor('#include <Keypad.h>');
                const body = captureCode('out', 1) ?? '';
                registerFunction('void _kp_on_press()', body, 'void _kp_on_press();');
                registerPreprocessor('#define KEYPAD_ON_PRESS_CB _kp_on_press');
                return { parts: [] };
            }
        },

        // ─── Key Value ───────────────────────────────────────────────────
        {
            id: 'kp_key',
            name: 'Keypad Key',
            color: COLOR,
            icon: '🔑',
            category: 'Keypad',
            description: 'ค่าปุ่มที่กดล่าสุด (_kp_key)\nใช้ภายใน Keypad On Press handler เท่านั้น',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜',  dataType: 'any'    }],
            outputs: [{ id: 'key', type: 'output', label: 'Key', dataType: 'String' }],
            toExpr: () => 'String(_kp_key)',
            toCode({ registerPreprocessor }) {
                registerPreprocessor('#include <Keypad.h>');
                return {
                    parts: [
                        { portId: 'key', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Read ────────────────────────────────────────────────────────
        {
            id: 'kp_read',
            name: 'Keypad Read',
            color: COLOR,
            icon: '🔢',
            category: 'Keypad',
            requires: ['kp_begin'],
            description: 'อ่านค่าปุ่มที่กดในรอบ loop นี้แบบ manual\nKey branch จะ fire เฉพาะเมื่อมีปุ่มกด\nหากใช้คู่กับ Keypad On Press อาจ miss key ได้',
            inputs:  [{ id: 'in',     type: 'input',  label: '➜',     dataType: 'any'    }],
            outputs: [
                { id: 'key',    type: 'output', label: 'Key',    dataType: 'String', description: 'ปุ่มที่กด' },
                { id: 'no_key', type: 'output', label: 'No Key', dataType: 'void',   description: 'ไม่มีปุ่มกดในรอบนี้' },
                { id: 'out',    type: 'output', label: '➜',      dataType: 'void'   },
            ],
            toCode({ pad, block, safeId, registerPreprocessor }) {
                registerPreprocessor('#include <Keypad.h>');
                const id = safeId(block.id);
                return {
                    parts: [
                        [
                            `${pad}char ${id} = _kp.getKey();`,
                            `${pad}if (${id}) {`,
                        ],
                        { portId: 'key',    depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'no_key', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out',    depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default keypadExtension;
