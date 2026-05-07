import type { BlockCategory } from '../types.js';

const COLOR = '#6d28d9'; // violet-700

const MACHINE_PARAM = {
    id: 'machine_name', type: 'varname' as const,
    category: 'state_machine',
    label: 'Machine', default: 'main',
    description: 'ชื่อ State Machine — ใช้ชื่อเดียวกันในทุกบล็อกของ machine เดียวกัน',
};

function safeName(raw: string) {
    return (raw ?? 'main').replace(/\W/g, '_') || 'main';
}

const stateMachineExtension: BlockCategory = {
    id: 'state-machine',
    name: 'State Machine',
    blocks: [

        // ─── State ───────────────────────────────────────────────────────
        {
            id: 'sm_state',
            name: 'State',
            color: COLOR,
            icon: '🔀',
            category: 'State Machine',
            description: 'ตรวจสอบ state ปัจจุบันแล้วแยกทาง\nแต่ละ output port ตรงกับ state หนึ่ง\nตั้งชื่อ Machine Name ให้ตรงกับ State Change',
            inputs:  [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'state_0', type: 'output', label: 'State 1', dataType: 'void' },
                { id: 'out',     type: 'output', label: '➜',       dataType: 'void' },
            ],
            params: [
                MACHINE_PARAM,
                {
                    id: 'num_states', type: 'number', label: 'Number of States', default: '3',
                    description: 'จำนวน state (1–10)',
                    validation: (n: number) => Math.min(10, Math.max(1, Math.round(n))),
                },
                // Label params for each state (hidden beyond num_states)
                { id: 'label_1',  type: 'text', label: 'State 1 Label',  default: 'State 1' },
                { id: 'label_2',  type: 'text', label: 'State 2 Label',  default: 'State 2',  hidden: ({ params }) => Number(params.num_states ?? '3') < 2  },
                { id: 'label_3',  type: 'text', label: 'State 3 Label',  default: 'State 3',  hidden: ({ params }) => Number(params.num_states ?? '3') < 3  },
                { id: 'label_4',  type: 'text', label: 'State 4 Label',  default: 'State 4',  hidden: ({ params }) => Number(params.num_states ?? '3') < 4  },
                { id: 'label_5',  type: 'text', label: 'State 5 Label',  default: 'State 5',  hidden: ({ params }) => Number(params.num_states ?? '3') < 5  },
                { id: 'label_6',  type: 'text', label: 'State 6 Label',  default: 'State 6',  hidden: ({ params }) => Number(params.num_states ?? '3') < 6  },
                { id: 'label_7',  type: 'text', label: 'State 7 Label',  default: 'State 7',  hidden: ({ params }) => Number(params.num_states ?? '3') < 7  },
                { id: 'label_8',  type: 'text', label: 'State 8 Label',  default: 'State 8',  hidden: ({ params }) => Number(params.num_states ?? '3') < 8  },
                { id: 'label_9',  type: 'text', label: 'State 9 Label',  default: 'State 9',  hidden: ({ params }) => Number(params.num_states ?? '3') < 9  },
                { id: 'label_10', type: 'text', label: 'State 10 Label', default: 'State 10', hidden: ({ params }) => Number(params.num_states ?? '3') < 10 },
            ],
            dynamicPorts(params) {
                const n       = Math.min(10, Math.max(1, Number(params.num_states ?? '3')));
                const outputs = Array.from({ length: n }, (_, i) => ({
                    id:       `state_${i}`,
                    type:     'output' as const,
                    label:    params[`label_${i + 1}`] || `State ${i + 1}`,
                    dataType: 'void' as const,
                    description: `รันเมื่ออยู่ใน state ${i + 1}`,
                }));
                outputs.push({ id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'รันเสมอหลังจาก state branch' });
                return { outputs };
            },
            toCode({ pad, params, registerGlobal }) {
                const machine = safeName(params.machine_name);
                const n       = Math.min(10, Math.max(1, Number(params.num_states ?? '3')));

                registerGlobal(`int _sm_${machine} = 0; // State machine: ${machine}`);

                // Generate if / else-if chain for each state
                type Part = string[] | { portId: string; depthDelta: number };
                const parts: Part[] = [];
                for (let i = 0; i < n; i++) {
                    parts.push([i === 0
                        ? `${pad}if (_sm_${machine} == ${i}) {`
                        : `${pad}} else if (_sm_${machine} == ${i}) {`]);
                    parts.push({ portId: `state_${i}`, depthDelta: 1 });
                }
                parts.push([`${pad}}`]);
                parts.push({ portId: 'out', depthDelta: 0 });
                return { parts };
            }
        },

        // ─── State Change ────────────────────────────────────────────────
        {
            id: 'sm_change',
            name: 'State Change',
            color: COLOR,
            icon: '⚡',
            category: 'State Machine',
            description: 'เปลี่ยน state ของ State Machine\nState index เริ่มที่ 0 (State 1 = 0, State 2 = 1, ...)',
            inputs:  [
                { id: 'in',    type: 'input', label: '➜',    dataType: 'any' },
                { id: 'state', type: 'input', label: 'State', dataType: 'int', description: 'index ของ state ที่ต้องการ (ถ้าไม่ต่อสาย ใช้ค่าจาก param)' },
            ],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                MACHINE_PARAM,
                {
                    id: 'state_val', type: 'number', label: 'State Index', default: '0',
                    description: 'index ของ state (0 = State 1, 1 = State 2, ...)\nใช้เมื่อไม่มีบล็อกต่อเข้า State',
                    validation: (n: number) => Math.max(0, Math.round(n)),
                },
            ],
            toCode({ pad, params, resolveInput, registerGlobal }) {
                const machine    = safeName(params.machine_name);
                const stateExpr  = resolveInput('state') ?? (params.state_val ?? '0');
                registerGlobal(`int _sm_${machine} = 0; // State machine: ${machine}`);
                return {
                    parts: [
                        [`${pad}_sm_${machine} = ${stateExpr};`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Current State ────────────────────────────────────────────────
        {
            id: 'sm_current',
            name: 'Current State',
            color: COLOR,
            icon: '🔢',
            category: 'State Machine',
            description: 'ค่า index ของ state ปัจจุบัน\n0 = State 1, 1 = State 2, ...',
            inputs:  [],
            outputs: [{ id: 'value', type: 'output', label: 'State', dataType: 'int' }],
            params:  [ MACHINE_PARAM ],
            toExpr(params) {
                return `_sm_${safeName(params.machine_name)}`;
            },
            toCode({ params, registerGlobal }) {
                const machine = safeName(params.machine_name);
                registerGlobal(`int _sm_${machine} = 0; // State machine: ${machine}`);
                return { parts: [] };
            }
        },
    ]
};

export default stateMachineExtension;
