import type { BlockCategory, CodeGenContext } from '../types.js';

const COLOR = '#7c3aed'; // violet-600

function register420Helper(
    registerPreprocessor: CodeGenContext['registerPreprocessor'],
    registerGlobal: CodeGenContext['registerGlobal'],
    registerFunction: CodeGenContext['registerFunction'],
    address: string,
) {
    registerPreprocessor('#include <Wire.h>');
    registerPreprocessor('#include <IOXESP32_4-20mA_Receiver.h>');

    registerGlobal(`Receiver4_20 _r420(&Wire, ${address});`);
    registerGlobal('bool _r420_init = false;');
    registerGlobal('int16_t _r420_cal[5] = { 6410, INT16_MIN, INT16_MIN, INT16_MIN, 31952 }; // 4, 8, 12, 16, 20mA');

    registerFunction(
        'bool r420_read(int16_t *raw, float *current)',
        [
            '  static uint32_t _r420_last_measure = 0;',
            '  if (!_r420_init) {',
            '    Wire.begin();',
            '    if (!_r420.begin(_r420_cal[0], _r420_cal[4], _r420_cal[1], _r420_cal[2], _r420_cal[3])) {',
            '      return false;',
            '    }',
            '    _r420_last_measure = 0;',
            '    _r420_init = true;',
            '  }',
            '  if ((_r420_last_measure == 0) || ((millis() - _r420_last_measure) >= 100) || (millis() < _r420_last_measure)) {',
            '    _r420_last_measure = millis();',
            '    if (!_r420.measure()) {',
            '      _r420_init = false;',
            '      return false;',
            '    }',
            '  }',
            '  if (raw) *raw = _r420.raw();',
            '  if (current) *current = _r420.current();',
            '  return true;',
        ].join('\n'),
        'bool r420_read(int16_t *raw, float *current);'
    );
}

const r420Extension: BlockCategory = {
    id: '4-20ma-receiver',
    name: '4-20mA Receiver',
    blocks: [

        // ─── Calibration ─────────────────────────────────────────────────
        {
            id: 'r420_cal',
            name: '4-20mA Calibration',
            color: COLOR,
            icon: '🎯',
            category: '4-20mA',
            description: 'ตั้งค่า I2C pins และค่า calibration ของ 4-20mA Receiver\nเรียกใน setup() ก่อน Read — เมื่อเรียก จะ reset sensor ให้ init ใหม่ด้วยค่าที่ตั้ง',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'r4mA', type: 'number', label: '4mA Raw Value', default: '6410',
                    description: 'ค่า raw ADC ที่ตรงกับกระแส 4mA (จุด 0%)',
                    validation: (n: number) => Math.round(n),
                },
                {
                    id: 'r20mA', type: 'number', label: '20mA Raw Value', default: '31952',
                    description: 'ค่า raw ADC ที่ตรงกับกระแส 20mA (จุด 100%)',
                    validation: (n: number) => Math.round(n),
                },
                {
                    id: 'advanced_cal', type: 'option', label: 'Advanced Calibration', default: 'no',
                    description: 'เปิดใช้จุด calibration เพิ่มเติม (8mA, 12mA, 16mA) เพื่อความแม่นยำสูงขึ้น',
                    options: [
                        { label: 'No  (2-point)', value: 'no' },
                        { label: 'Yes (5-point)', value: 'yes' },
                    ],
                },
                {
                    id: 'r8mA', type: 'number', label: '8mA Raw Value', default: '12796',
                    description: 'ค่า raw ADC ที่ตรงกับกระแส 8mA',
                    validation: (n: number) => Math.max(-32768, Math.min(32767, Math.round(n))),
                    hidden: ({ params }) => params.advanced_cal !== 'yes',
                },
                {
                    id: 'r12mA', type: 'number', label: '12mA Raw Value', default: '19181',
                    description: 'ค่า raw ADC ที่ตรงกับกระแส 12mA',
                    validation: (n: number) => Math.max(-32768, Math.min(32767, Math.round(n))),
                    hidden: ({ params }) => params.advanced_cal !== 'yes',
                },
                {
                    id: 'r16mA', type: 'number', label: '16mA Raw Value', default: '25567',
                    description: 'ค่า raw ADC ที่ตรงกับกระแส 16mA',
                    validation: (n: number) => Math.max(-32768, Math.min(32767, Math.round(n))),
                    hidden: ({ params }) => params.advanced_cal !== 'yes',
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerFunction }) {
                const address = params.address ?? '0x45';
                register420Helper(registerPreprocessor, registerGlobal, registerFunction, address);

                const r4mA = params.r4mA ?? '6410';
                const r20mA = params.r20mA ?? '31952';
                const adv = params.advanced_cal === 'yes';
                const r8mA = adv ? (params.r8mA ?? '12796') : 'INT16_MIN';
                const r12mA = adv ? (params.r12mA ?? '19181') : 'INT16_MIN';
                const r16mA = adv ? (params.r16mA ?? '25567') : 'INT16_MIN';

                return {
                    parts: [
                        [
                            `${pad}_r420_cal[0] = ${r4mA};`,
                            `${pad}_r420_cal[1] = ${r8mA};`,
                            `${pad}_r420_cal[2] = ${r12mA};`,
                            `${pad}_r420_cal[3] = ${r16mA};`,
                            `${pad}_r420_cal[4] = ${r20mA};`,
                            `${pad}_r420_init = false;`,
                        ],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Read ─────────────────────────────────────────────────────────
        {
            id: 'r420_read',
            name: '4-20mA Read',
            color: COLOR,
            icon: '📊',
            category: '4-20mA',
            description: 'อ่านค่ากระแส (mA) หรือค่า raw ADC จาก 4-20mA Receiver\nหากยังไม่ได้ init จะ init อัตโนมัติ — เรียก 2 ครั้งติดกัน ใช้รอบการวัดเดียวกัน',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'float', description: 'ค่าที่อ่านได้' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'hardware error หรืออ่านค่าไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                {
                    id: 'address', type: 'option', label: 'I2C Address', default: '0x45',
                    description: 'ต้องตรงกับที่ตั้งใน 4-20mA Calibration (หากใช้)',
                    options: [
                        { label: '0x45 (Default)', value: '0x45' },
                        { label: '0x44', value: '0x44' },
                        { label: '0x46', value: '0x46' },
                        { label: '0x47', value: '0x47' },
                    ],
                },
                {
                    id: 'value_type', type: 'option', label: 'Value', default: 'current',
                    options: [
                        { label: 'Current (mA)', value: 'current' },
                        { label: 'Raw (int16)', value: 'raw' },
                    ],
                },
            ],
            dynamicPorts(params) {
                const isRaw = params.value_type === 'raw';
                return {
                    outputs: [
                        { id: 'value', type: 'output', label: 'Value', dataType: isRaw ? 'int' : 'float', description: isRaw ? 'ค่า raw ADC (-32768 ถึง 32767)' : 'กระแสในหน่วย mA' },
                        { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'hardware error หรืออ่านค่าไม่ได้' },
                        { id: 'out', type: 'output', label: '➜', dataType: 'void' },
                    ]
                };
            },
            toCode({ pad, block, safeId, params, registerPreprocessor, registerGlobal, registerFunction }) {
                const address = params.address ?? '0x45';
                register420Helper(registerPreprocessor, registerGlobal, registerFunction, address);

                const id = safeId(block.id);
                const isRaw = params.value_type === 'raw';
                const cppType = isRaw ? 'int16_t' : 'float';
                const callArgs = isRaw ? `&${id}, NULL` : `NULL, &${id}`;

                return {
                    parts: [
                        [`${pad}${cppType} ${id} = 0;`],
                        [`${pad}if (r420_read(${callArgs})) {`],
                        { portId: 'value', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'error', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default r420Extension;
