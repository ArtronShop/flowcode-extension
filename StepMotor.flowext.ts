import type { BlockCategory } from '../types.js';

const COLOR = '#be185d'; // pink-700

function registerStepperBase(
    registerPreprocessor: (d: string) => void,
    registerPollingCode: (code: string) => void,
) {
    registerPreprocessor('#include <AccelStepper.h>');
    // run() must be called every loop for non-blocking movement.
    registerPollingCode('_stepper.run();');
}

const stepMotorExtension: BlockCategory = {
    id: 'step-motor',
    name: 'Step Motor',
    blocks: [

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'stepper_begin',
            name: 'Stepper Begin',
            color: COLOR,
            icon: '⚙️',
            category: 'Step Motor',
            description: 'กำหนดขา STEP / DIR / EN และค่า Speed / Acceleration\nใช้กับ driver แบบ Step+Dir เช่น A4988, DRV8825, TB6600',
            inputs:  [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'step_pin', type: 'number', label: 'STEP Pin', default: '14', validation: (n: number) => Math.trunc(n) },
                { id: 'dir_pin',  type: 'number', label: 'DIR Pin',  default: '27', validation: (n: number) => Math.trunc(n) },
                {
                    id: 'en_pin', type: 'number', label: 'EN Pin', default: '-1',
                    description: 'Enable pin (-1 = ไม่ใช้)\nส่วนใหญ่เป็น Active LOW (ตั้งค่า Invert = Yes)',
                    validation: (n: number) => Math.trunc(n),
                },
                {
                    id: 'en_invert', type: 'option', label: 'EN Active', default: 'low',
                    description: 'ระดับสัญญาณที่ทำให้ driver ทำงาน',
                    options: [
                        { label: 'Active LOW  (A4988, DRV8825)', value: 'low'  },
                        { label: 'Active HIGH',                  value: 'high' },
                    ],
                    hidden: ({ params }) => params.en_pin === '-1',
                },
                {
                    id: 'max_speed', type: 'number', label: 'Max Speed (steps/s)', default: '1000',
                    description: 'ความเร็วสูงสุด (steps ต่อวินาที)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
                {
                    id: 'acceleration', type: 'number', label: 'Acceleration (steps/s²)', default: '500',
                    description: 'อัตราเร่ง (steps ต่อวินาที²)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);

                const stepPin    = params.step_pin    ?? '14';
                const dirPin     = params.dir_pin     ?? '27';
                const enPin      = params.en_pin      ?? '-1';
                const enInvert   = params.en_invert   !== 'high'; // true = active LOW = invert
                const maxSpeed   = params.max_speed   ?? '1000';
                const accel      = params.acceleration ?? '500';
                const hasEn      = enPin !== '-1';

                registerGlobal(`AccelStepper _stepper(AccelStepper::DRIVER, ${stepPin}, ${dirPin});`);

                const lines: string[] = [
                    `${pad}_stepper.setMaxSpeed(${maxSpeed});`,
                    `${pad}_stepper.setAcceleration(${accel});`,
                ];
                if (hasEn) {
                    lines.push(`${pad}_stepper.setEnablePin(${enPin});`);
                    lines.push(`${pad}_stepper.setPinsInverted(false, false, ${enInvert ? 'true' : 'false'});`);
                    lines.push(`${pad}_stepper.enableOutputs();`);
                }

                return {
                    parts: [
                        lines,
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Move (relative) ─────────────────────────────────────────────
        {
            id: 'stepper_move',
            name: 'Stepper Move',
            color: COLOR,
            icon: '➡️',
            category: 'Step Motor',
            requires: ['stepper_begin'],
            description: 'เลื่อน N steps จากตำแหน่งปัจจุบัน\nNon-blocking: ตั้ง target แล้วให้ run() ใน loop ขับเอง\nBlocking: รอจนถึง target แล้วค่อยไปบรรทัดถัดไป',
            inputs:  [
                { id: 'in',    type: 'input', label: '➜',    dataType: 'any' },
                { id: 'steps', type: 'input', label: 'Steps', dataType: 'int', description: 'จำนวน steps (ลบ = ถอยหลัง)' },
            ],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'steps', type: 'number', label: 'Steps', default: '200',
                    description: 'จำนวน steps (ลบ = ถอยหลัง) — ใช้เมื่อไม่มีบล็อกต่อเข้า',
                },
                {
                    id: 'mode', type: 'option', label: 'Mode', default: 'nonblocking',
                    options: [
                        { label: 'Non-blocking (run() ใน loop)', value: 'nonblocking' },
                        { label: 'Blocking (รอจนถึง target)',     value: 'blocking'    },
                    ],
                },
            ],
            toCode({ pad, params, resolveInput, registerPreprocessor, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);
                const steps = resolveInput('steps') ?? (params.steps ?? '200');
                const blocking = params.mode === 'blocking';
                const lines = [
                    `${pad}_stepper.move(${steps});`,
                    ...(blocking ? [`${pad}_stepper.runToPosition();`] : []),
                ];
                return {
                    parts: [
                        lines,
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Move To (absolute) ──────────────────────────────────────────
        {
            id: 'stepper_move_to',
            name: 'Stepper Move To',
            color: COLOR,
            icon: '📍',
            category: 'Step Motor',
            requires: ['stepper_begin'],
            description: 'เลื่อนไปตำแหน่ง absolute (steps จากจุดเริ่มต้น)\nNon-blocking: ตั้ง target แล้วให้ run() ใน loop ขับเอง\nBlocking: รอจนถึง target',
            inputs:  [
                { id: 'in',       type: 'input', label: '➜',        dataType: 'any' },
                { id: 'position', type: 'input', label: 'Position',  dataType: 'int', description: 'ตำแหน่งเป้าหมาย (steps)' },
            ],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'position', type: 'number', label: 'Position (steps)', default: '0',
                    description: 'ตำแหน่งเป้าหมาย — ใช้เมื่อไม่มีบล็อกต่อเข้า',
                },
                {
                    id: 'mode', type: 'option', label: 'Mode', default: 'nonblocking',
                    options: [
                        { label: 'Non-blocking', value: 'nonblocking' },
                        { label: 'Blocking',     value: 'blocking'    },
                    ],
                },
            ],
            toCode({ pad, params, resolveInput, registerPreprocessor, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);
                const pos = resolveInput('position') ?? (params.position ?? '0');
                const blocking = params.mode === 'blocking';
                const lines = [
                    `${pad}_stepper.moveTo(${pos});`,
                    ...(blocking ? [`${pad}_stepper.runToPosition();`] : []),
                ];
                return {
                    parts: [
                        lines,
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Set Speed ───────────────────────────────────────────────────
        {
            id: 'stepper_set_speed',
            name: 'Stepper Set Speed',
            color: COLOR,
            icon: '🎚️',
            category: 'Step Motor',
            requires: ['stepper_begin'],
            description: 'เปลี่ยน Max Speed และ Acceleration ขณะทำงาน',
            inputs:  [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'max_speed', type: 'number', label: 'Max Speed (steps/s)', default: '1000',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
                {
                    id: 'acceleration', type: 'number', label: 'Acceleration (steps/s²)', default: '500',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);
                return {
                    parts: [
                        [
                            `${pad}_stepper.setMaxSpeed(${params.max_speed ?? '1000'});`,
                            `${pad}_stepper.setAcceleration(${params.acceleration ?? '500'});`,
                        ],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Stop ────────────────────────────────────────────────────────
        {
            id: 'stepper_stop',
            name: 'Stepper Stop',
            color: COLOR,
            icon: '🛑',
            category: 'Step Motor',
            requires: ['stepper_begin'],
            description: 'หยุด motor ทันที (ยกเลิก target ปัจจุบัน)',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ pad, registerPreprocessor, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);
                return {
                    parts: [
                        [`${pad}_stepper.stop();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Enable / Disable ────────────────────────────────────────────
        {
            id: 'stepper_enable',
            name: 'Stepper Enable',
            color: COLOR,
            icon: '🔌',
            category: 'Step Motor',
            requires: ['stepper_begin'],
            description: 'เปิด/ปิด driver ผ่าน EN pin\nต้องตั้งค่า EN Pin ใน Stepper Begin ก่อน',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'state', type: 'option', label: 'State', default: 'enable',
                    options: [
                        { label: 'Enable  (เปิด driver)', value: 'enable'  },
                        { label: 'Disable (ปิด driver)',  value: 'disable' },
                    ],
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);
                const fn = params.state === 'disable' ? 'disableOutputs' : 'enableOutputs';
                return {
                    parts: [
                        [`${pad}_stepper.${fn}();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Is Running ──────────────────────────────────────────────────
        {
            id: 'stepper_is_running',
            name: 'Stepper Is Running',
            color: COLOR,
            icon: '✅',
            category: 'Step Motor',
            requires: ['stepper_begin'],
            description: 'ตรวจสอบว่า motor ยังเคลื่อนที่อยู่หรือไม่',
            inputs:  [{ id: 'in',      type: 'input',  label: '➜',      dataType: 'any'  }],
            outputs: [
                { id: 'running', type: 'output', label: 'Running', dataType: 'void', description: 'กำลังเคลื่อนที่ไปยัง target' },
                { id: 'stopped', type: 'output', label: 'Stopped', dataType: 'void', description: 'ถึง target แล้ว หรือหยุดแล้ว' },
                { id: 'out',     type: 'output', label: '➜',       dataType: 'void' },
            ],
            toCode({ pad, registerPreprocessor, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);
                return {
                    parts: [
                        [`${pad}if (_stepper.isRunning()) {`],
                        { portId: 'running', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'stopped', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Position ────────────────────────────────────────────────────
        {
            id: 'stepper_position',
            name: 'Stepper Position',
            color: COLOR,
            icon: '📏',
            category: 'Step Motor',
            requires: ['stepper_begin'],
            description: 'ตำแหน่งปัจจุบันของ motor (steps จากจุดเริ่มต้น)',
            inputs: [],
            outputs: [{ id: 'pos', type: 'output', label: 'Position', dataType: 'int' }],
            toExpr: () => '(int)_stepper.currentPosition()',
            toCode({ registerPreprocessor, registerPollingCode }) {
                registerStepperBase(registerPreprocessor, registerPollingCode);
                return { parts: [] };
            }
        },
    ]
};

export default stepMotorExtension;
