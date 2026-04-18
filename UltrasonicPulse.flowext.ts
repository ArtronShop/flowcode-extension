import type { BlockCategory } from '../types.js';

const COLOR = '#8b5cf6'; // violet

const ultrasonicPulseExtension: BlockCategory = {
    id: 'ultrasonic-pulse',
    name: 'Ultrasonic (Pulse)',
    blocks: [
        {
            id: 'ultrasonic-pulse-read',
            name: 'Ultrasonic Read',
            color: COLOR,
            icon: '📏',
            category: 'Ultrasonic Pulse',
            description: 'อ่านค่าระยะทางจากเซ็นเซอร์อัลตราโซนิกแบบ Pulse (TRIG/ECHO) เช่น HC-SR04',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกก่อนหน้า' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Distance', dataType: 'float', description: 'ระยะทางที่วัดได้ตามหน่วยที่เลือก' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่อวัดค่าไม่ได้ (timeout)' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'จุดต่อสายบล็อกถัดไป' },
            ],
            params: [
                {
                    id: 'trig', label: 'TRIG Pin', description: 'GPIO pin ที่ต่อขา TRIG',
                    type: 'number', validation: n => Math.trunc(n), default: '5',
                },
                {
                    id: 'echo', label: 'ECHO Pin', description: 'GPIO pin ที่ต่อขา ECHO',
                    type: 'number', validation: n => Math.trunc(n), default: '18',
                },
                {
                    id: 'unit', label: 'Unit', description: 'หน่วยของระยะทางที่ต้องการ',
                    type: 'option', options: [
                        { label: 'Centimeters (cm)', value: 'cm' },
                        { label: 'Millimeters (mm)', value: 'mm' },
                        { label: 'Inches (in)', value: 'in' },
                    ],
                },
            ],
            toCode({ block, pad, safeId, params, registerGlobal, registerFunction }) {
                const id = safeId(block.id);
                const trig = params.trig ?? '5';
                const echo = params.echo ?? '18';
                const unit = params.unit ?? 'cm';

                // divisor: duration(µs) → distance
                // sound speed ~343 m/s = 0.0343 cm/µs, round-trip ÷2
                // cm : duration / 58.2
                // mm : duration / 5.82
                // in : duration / 148.0
                const divisor = unit === 'mm' ? '5.82f' : unit === 'in' ? '148.0f' : '58.2f';

                registerFunction(
                    `bool ultrasonic_read_t${trig}_e${echo}(float * out)`,
                    [
                        `  static bool init = false;`,
                        `  if (!init) {`,
                        `    pinMode(${trig}, OUTPUT);`,
                        `    pinMode(${echo}, INPUT);`,
                        `    init = true;`,
                        `  }`,
                        `  digitalWrite(${trig}, LOW);`,
                        `  delayMicroseconds(2);`,
                        `  digitalWrite(${trig}, HIGH);`,
                        `  delayMicroseconds(10);`,
                        `  digitalWrite(${trig}, LOW);`,
                        `  long duration = pulseIn(${echo}, HIGH, 30000UL); // timeout 30 ms (~5 m)`,
                        `  if (duration == 0) return false;`,
                        `  if (out) *out = duration / ${divisor};`,
                        `  return true;`,
                    ].join('\n'),
                    `bool ultrasonic_read_t${trig}_e${echo}() ;`,
                );

                return {
                    parts: [
                        [`${pad}float ${id} = 0;`],
                        [`${pad}if (ultrasonic_read_t${trig}_e${echo}(&${id})) {`],
                        { portId: 'value', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'error', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ],
                };
            },
        },
    ],
};

export default ultrasonicPulseExtension;
