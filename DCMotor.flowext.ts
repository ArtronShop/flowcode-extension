import type { BlockCategory } from '../types.js';

const COLOR = '#dc2626'; // red-600

const dcMotorExtension: BlockCategory = {
    id: 'dc-motor',
    name: 'DC Motor',
    blocks: [
        {
            id: 'dc_motor',
            name: 'DC Motor',
            color: COLOR,
            icon: '⚙️',
            category: 'DC Motor',
            description: 'ควบคุม DC Motor ผ่าน L298N, L293D หรือ motor driver อื่น ๆ\n1-Pin: ควบคุมความเร็วด้วย PWM อย่างเดียว\n2-Pin (IN1, IN2): ควบคุมความเร็วและทิศทาง (CW / CCW)',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'pin_count', type: 'option', label: 'Pins', default: '2pin',
                    options: [
                        { label: '2-Pin (IN1, IN2)', value: '2pin' },
                        { label: '1-Pin (PWM only)', value: '1pin' },
                    ],
                },
                {
                    id: 'pin1', type: 'number', label: 'IN1 / PWM Pin', default: '14',
                    validation: (n: number) => Math.trunc(n),
                },
                {
                    id: 'pin2', type: 'number', label: 'IN2 Pin', default: '27',
                    validation: (n: number) => Math.trunc(n),
                    hidden: ({ params }) => params.pin_count !== '2pin',
                },
                {
                    id: 'mode', type: 'option', label: 'Mode', default: 'on',
                    options: [
                        { label: 'OFF', value: 'off' },
                        { label: 'ON (Full Speed)', value: 'on' },
                        { label: 'Adjust Speed (PWM)', value: 'speed' },
                    ],
                    hidden: ({ params }) => params.pin_count === '2pin',
                },
                {
                    id: 'direction', type: 'option', label: 'Direction', default: 'FORWARD',
                    options: [
                        { label: 'Open', value: '0' },
                        { label: 'Forward (CW)', value: '1' },
                        { label: 'Backward (CCW)', value: '2' },
                        { label: 'Break', value: '3' },
                    ],
                    hidden: ({ params }) => params.pin_count !== '2pin' || params.mode === 'off',
                },
                {
                    id: 'speed_val', type: 'number', label: 'Speed (0–100%)', default: '50',
                    description: 'ใช้เมื่อไม่มีบล็อกต่อเข้า Speed input',
                    validation: (n: number) => Math.min(100, Math.max(0, Math.round(n))),
                    hidden: ({ params }) => (params.pin_count === '1pin' && params.mode !== 'speed') || (params.pin_count === '2pin' && (params.direction === '0' || params.direction === '3')),
                },
            ],
            dynamicPorts(params) {
                const showSpeed = params.mode === 'speed';
                return {
                    inputs: [
                        { id: 'in', type: 'input', label: '➜', dataType: 'any' },
                        ...(showSpeed ? [{
                            id: 'speed', type: 'input' as const, label: 'Speed',
                            dataType: 'int' as const, description: 'ความเร็ว 0–255 (ถ้าไม่ต่อสาย ใช้ค่าจาก param)'
                        }] : []),
                    ]
                };
            },
            toCode({ pad, params, resolveInput, registerFunction, registerPreprocessor }) {
                const twoPin = params.pin_count !== '1pin';
                const pin1 = params.pin1 ?? '14';
                const pin2 = params.pin2 ?? '27';
                const mode = params.mode ?? 'on';
                const direction = params.direction ?? 'OPEN';
                const speed = resolveInput('speed') ?? (params.speed_val ?? '50');

                if (!twoPin) {
                    const setupFn = `void _motor_${pin1}(uint8_t speed)`;
                    registerFunction(setupFn, [
                        `  static bool init = false;`,
                        `  if (!init) {`,
                        `    pinMode(${pin1}, OUTPUT);`,
                        `    init = true;`,
                        `  }`,
                        `  uint8_t pwm = constrain(speed, 0, 100) * 255 / 100;`,
                        `  analogWrite(${pin1}, pwm);`
                    ].join('\n') , setupFn + ' ;');

                    return {
                        parts: [
                            [`${pad}_motor_${pin1}(${mode == 'on' ? '100' : mode === 'off' ? '0' : speed});`],
                            { portId: 'out', depthDelta: 0 },
                        ]
                    };
                } else {
                    const setupFn = `void _motor_${pin1}_${pin2}(uint8_t dir, uint8_t speed)`;
                    registerFunction(setupFn, [
                        `  static bool done = false;`,
                        `  if (!done) {`,
                        `    done = true;`,
                        `    pinMode(${pin1}, OUTPUT);`,
                        `    pinMode(${pin2}, OUTPUT);`,
                        `  }`,
                        `  uint8_t pwm = constrain(speed, 0, 100) * 255 / 100;`,
                        `  if (dir == 0) { // Open`,
                        `    analogWrite(${pin1}, 0);`,
                        `    analogWrite(${pin2}, 0);`,
                        `  } else if (dir == 1) { // Forward`,
                        `    analogWrite(${pin1}, pwm);`,
                        `    analogWrite(${pin2}, 0);`,
                        `  } else if (dir == 2) { // Backward`,
                        `    analogWrite(${pin1}, 0);`,
                        `    analogWrite(${pin2}, pwm);`,
                        `  } else if (dir == 3) { // Break`,
                        `    analogWrite(${pin1}, 255);`,
                        `    analogWrite(${pin2}, 255);`,
                        `  }`,
                    ].join('\n') , setupFn + ' ;');

                    return {
                        parts: [
                            [`${pad}_motor_${pin1}_${pin2}(${direction}, ${speed});`],
                            { portId: 'out', depthDelta: 0 },
                        ]
                    };
                }
            }
        },
    ]
};

export default dcMotorExtension;
