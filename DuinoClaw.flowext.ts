import type { BlockCategory } from '../types.js';

const COLOR = '#06b6d4'; // cyan-500

const MODELS = [
    { label: 'GPT-5.5', value: 'GPT_5_5' },
    { label: 'GPT-5.4', value: 'GPT_5_4' },
    { label: 'GPT-5.4 Mini', value: 'GPT_5_4_MINI' },
];

const PROP_TYPES = [
    { label: 'String', value: 'TYPE_STRING' },
    { label: 'Number', value: 'TYPE_NUMBER' },
    { label: 'Integer', value: 'TYPE_INTEGER' },
];



const TOOL_NAME_PARAM = {
    id: 'tool_name', type: 'varname' as const,
    category: 'dc_custom_tool',
    label: 'Tool Name', default: 'my_tool',
    description: 'ชื่อ Custom Tool ที่ต้องการ (ต้องตรงกับ Custom Tool block)',
};

function safeName(raw: string) {
    return (raw ?? 'my_tool').replace(/\W/g, '_').replace(/^(\d)/, '_$1') || 'my_tool';
}

function registerDCBase(
    registerPreprocessor: (d: string) => void,
    registerGlobal: (d: string) => void,
    registerPollingCode: (code: string) => void,
) {
    registerPreprocessor('#include <DuinoClaw.h>');
    registerPollingCode('Claw.loop();');
}

const duinoClawExtension: BlockCategory = {
    id: 'duino-claw',
    name: 'DuinoClaw (AI)',
    blocks: [
        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'dc_begin',
            name: 'DuinoClaw Begin',
            color: COLOR,
            icon: '✨',
            category: 'DuinoClaw',
            description: 'เริ่มต้น DuinoClaw AI\nวางหลัง WiFi เชื่อมต่อสำเร็จ และหลัง Custom Tool ทุกตัว',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'provider', type: 'option', label: 'Provider', default: 'OPEN_AI',
                    options: [{ label: 'OpenAI', value: 'OPEN_AI' }],
                },
                { id: 'model', type: 'option', label: 'Model', default: 'GPT_5_4_MINI', options: MODELS },
                { id: 'api_key', type: 'text', label: 'API Key', default: '', description: 'OpenAI API Key' },
                {
                    id: 'built_in_tools', type: 'multiselect' as const,
                    label: 'Built-in Tools',
                    options: [
                        { label: 'GPIO', value: 'gpio', description: 'digitalRead/Write, PWM, analogRead' },
                        { label: 'WiFi', value: 'wifi', description: 'IP, RSSI, SSID, MAC' },
                        { label: 'Time', value: 'time', description: 'เวลาจาก NTP' },
                    ],
                    default: '[]'
                },
                {
                    id: 'timezone', type: 'number', label: 'Timezone (UTC+)', default: '7',
                    description: 'UTC offset ชั่วโมง เช่น ไทย = 7 (แสดงเมื่อเลือก Time)',
                    validation: (n: number) => Math.min(14, Math.max(-12, Math.round(n))),
                    hidden: ({ params }) => {
                        try { return !(JSON.parse(String(params.built_in_tools ?? '[]')) as string[]).includes('time'); }
                        catch { return true; }
                    },
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);

                const apiKey = (params.api_key ?? '').replaceAll('"', '\\"');
                const model = params.model ?? 'GPT_4_1_MINI';
                const provider = params.provider ?? 'OPEN_AI';

                let tools: string[] = [];
                try { tools = JSON.parse(String(params.built_in_tools ?? '[]')); } catch { /**/ }

                const lines: string[] = [];

                // Built-in tools (from multiselect)
                if (tools.includes('gpio')) {
                    registerPreprocessor('#include <Tools/GPIOTool.h>');
                    lines.push(`${pad}static GPIOTool _dc_gpio_tool;`);
                    lines.push(`${pad}Claw.registerTool(&_dc_gpio_tool);`);
                }
                if (tools.includes('wifi')) {
                    registerPreprocessor('#include <Tools/WiFiTool.h>');
                    lines.push(`${pad}static WiFiTool _dc_wifi_tool;`);
                    lines.push(`${pad}Claw.registerTool(&_dc_wifi_tool);`);
                }
                if (tools.includes('time')) {
                    registerPreprocessor('#include <Tools/GetCurrentTimeTool.h>');
                    const tz = params.timezone ?? '7';
                    lines.push(`${pad}static GetCurrentTimeTool _dc_time_tool(${tz});`);
                    lines.push(`${pad}Claw.registerTool(&_dc_time_tool);`);
                }

                // onResponses callback
                lines.push(
                    `#ifdef DC_ON_RESPONSE_CB`,
                    `${pad}Claw.onResponses(DC_ON_RESPONSE_CB);`,
                    `#endif`,
                    `${pad}Claw.begin(${provider}, ${model}, "${apiKey}");`,
                );

                return {
                    parts: [lines, { portId: 'out', depthDelta: 0 }]
                };
            }
        },

        // ─── Set System Message ──────────────────────────────────────────
        {
            id: 'dc_set_system',
            name: 'DuinoClaw Set System',
            color: COLOR,
            icon: '📋',
            category: 'DuinoClaw',
            description: 'กำหนด System Message (บทบาทของ AI)\nต้องวางก่อน DuinoClaw Begin เสมอ',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'message', type: 'text', label: 'System Message',
                    default: 'You are a helpful assistant on an ESP32 device. Keep responses short.',
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);
                const msg = (params.message ?? '').replaceAll('"', '\\"').replaceAll('\n', '\\n');
                return {
                    parts: [[`${pad}Claw.setSystemMessage("${msg}");`], { portId: 'out', depthDelta: 0 }]
                };
            }
        },

        // ─── Prompt ──────────────────────────────────────────────────────
        {
            id: 'dc_prompt',
            name: 'DuinoClaw Prompt',
            color: COLOR,
            icon: '💬',
            category: 'DuinoClaw',
            description: 'ส่งข้อความให้ AI\nAsync: ผลมาที่ On Response | Blocking: รอผลทันที',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
                { id: 'msg', type: 'input', label: 'Message', dataType: 'String' },
            ],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'message', type: 'text', label: 'Message', default: 'Hello!' },
                {
                    id: 'mode', type: 'option', label: 'Mode', default: 'async',
                    options: [
                        { label: 'On Response', value: 'async' },
                        { label: 'Wait', value: 'blocking' },
                    ],
                },
            ],
            dynamicPorts(params) {
                const blocking = params.mode === 'blocking';
                return {
                    outputs: [
                        ...(blocking ? [{ id: 'response', type: 'output' as const, label: 'Response', dataType: 'String' as const }] : []),
                        { id: 'out', type: 'output' as const, label: '➜', dataType: 'void' as const },
                    ]
                };
            },
            toCode({ pad, block, safeId, params, resolveInput, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);
                const id = safeId(block.id);
                const msgExpr = resolveInput('msg') ?? `"${(params.message ?? 'Hello!').replaceAll('"', '\\"')}"`;
                const blocking = params.mode === 'blocking';
                if (blocking) {
                    return {
                        parts: [
                            [`${pad}String ${id} = Claw.prompt(${msgExpr}, true);`, `${pad}_dc_response = ${id}; _dc_response_ok = true;`],
                            { portId: 'response', depthDelta: 0 },
                            { portId: 'out', depthDelta: 0 },
                        ]
                    };
                }
                return { parts: [[`${pad}Claw.prompt(${msgExpr});`], { portId: 'out', depthDelta: 0 }] };
            }
        },

        // ─── On Response ─────────────────────────────────────────────────
        {
            id: 'dc_on_response',
            name: 'DuinoClaw On Response',
            trigger: true,
            color: COLOR,
            icon: '🤖',
            category: 'DuinoClaw',
            description: 'เรียกเมื่อ AI ตอบกลับมา\nใช้ Response Text / Response OK เพื่ออ่านคำตอบ\nวางก่อนหรือหลัง DuinoClaw Begin ก็ได้',
            inputs: [],
            outputs: [
                { id: 'ok', type: 'output', label: 'OK', dataType: 'void' },
                { id: 'error', type: 'output', label: 'ERROR', dataType: 'void' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [],
            toCode({ captureCode, registerPreprocessor, registerGlobal, registerFunction, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);
                const ok = captureCode('ok', 2) ?? '';
                const error = captureCode('error', 2) ?? '';
                const out = captureCode('out', 1) ?? '';
                registerFunction('void _dc_on_response(bool _ok, String _msg)',
                    [
                        '  if (_ok) {',
                        ok,
                        '  } else {',
                        error,
                        '  }',
                        out,
                    ].join('\n')
                    , 'void _dc_on_response(bool _ok, String _msg) ;');
                registerPreprocessor('#define DC_ON_RESPONSE_CB _dc_on_response');
                return { parts: [] };
            }
        },

        // ─── Response Text ───────────────────────────────────────────────
        {
            id: 'dc_response_text',
            name: 'Response Text',
            color: COLOR,
            icon: '📝',
            category: 'DuinoClaw',
            description: 'ข้อความตอบจาก AI ล่าสุด',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'text', type: 'output', label: 'Text', dataType: 'String' }],
            toExpr: () => '_msg',
            toCode({ registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);
                return {
                    parts: [
                        { portId: 'text', depthDelta: 0 }
                    ]
                };
            }
        },

        // ─── Is Processing ───────────────────────────────────────────────
        {
            id: 'dc_is_processing',
            name: 'DuinoClaw Is Processing',
            color: COLOR,
            icon: '⏳',
            category: 'DuinoClaw',
            description: 'ตรวจสอบว่า AI กำลังประมวลผลอยู่หรือไม่',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'processing', type: 'output', label: 'Processing', dataType: 'void' },
                { id: 'idle', type: 'output', label: 'Idle', dataType: 'void' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            toCode({ pad, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);
                return {
                    parts: [
                        [`${pad}if (Claw.isProcessing()) {`],
                        { portId: 'processing', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'idle', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Custom Tool ─────────────────────────────────────────────────
        {
            id: 'dc_create_custom_tool',
            name: 'Create Custom Tool',
            color: COLOR,
            icon: '🔧',
            category: 'DuinoClaw',
            description: 'สร้าง Custom Tool ให้ AI เรียกใช้\nวางก่อน DuinoClaw Begin — ใช้ Custom Tool On Call เพื่อจัดการ callback',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { ...TOOL_NAME_PARAM, description: 'ชื่อ identifier ของ tool (ใช้ตัวอักษร / ตัวเลข / _)' },
                { id: 'description', type: 'text', label: 'Description', default: 'My custom tool', description: 'คำอธิบาย tool ให้ AI เข้าใจว่าใช้ทำอะไร' },
                {
                    id: 'num_props', type: 'option', label: 'Number of Properties', default: '0',
                    options: [
                        { label: 'None (0)', value: '0' },
                        { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' },
                        { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' },
                    ],
                },
                // Property 1–6 (Name / Description / Type / Required)
                ...Array.from({ length: 6 }, (_, i) => {
                    const hide = ({ params }: { params: Record<string, string> }) => Number(params.num_props ?? '0') <= i;
                    return [
                        { id: `prop_${i + 1}_name`, type: 'text' as const, label: `Property ${i + 1} Name`, default: `param${i + 1}`, hidden: hide },
                        { id: `prop_${i + 1}_desc`, type: 'text' as const, label: `Property ${i + 1} Description`, default: '', description: 'คำอธิบาย property ให้ AI เข้าใจว่าควรส่งค่าอะไรมา', hidden: hide },
                        { id: `prop_${i + 1}_type`, type: 'option' as const, label: `Property ${i + 1} Type`, default: 'TYPE_STRING', options: PROP_TYPES, hidden: hide },
                        { id: `prop_${i + 1}_req`, type: 'option' as const, label: `Property ${i + 1} Required`, default: 'true', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }], hidden: hide },
                    ];
                }).flat(),
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);

                const safe = safeName(params.tool_name);
                const SAFE = safe.toUpperCase();
                const name = (params.tool_name ?? 'my_tool').replaceAll('"', '\\"');
                const desc = (params.description ?? 'My custom tool').replaceAll('"', '\\"');
                const n = Number(params.num_props ?? '0');

                // Property setup + onCall + registerTool — once-guarded
                const propLines = Array.from({ length: n }, (_, i) => {
                    const pname = (params[`prop_${i + 1}_name`] ?? `param${i + 1}`).replaceAll('"', '\\"');
                    const pdesc = (params[`prop_${i + 1}_desc`] as string ?? '').replaceAll('"', '\\"');
                    const ptype = params[`prop_${i + 1}_type`] ?? 'TYPE_STRING';
                    const preq = params[`prop_${i + 1}_req`] !== 'false';
                    return `${pad}_dc_tool_${safe}.addProperty("${pname}", "${pdesc}", Tool::${ptype}, ${preq});`;
                });

                const setupLines = [
                    `${pad}static Tool _dc_tool_${safe}("${name}", "${desc}");`,
                    ...propLines,
                    `#ifdef DC_TOOL_${SAFE}_CB`,
                    `${pad}_dc_tool_${safe}.onCall(DC_TOOL_${SAFE}_CB);`,
                    `#endif`,
                    `${pad}Claw.registerTool(&_dc_tool_${safe});`,
                    `${pad}`,
                ];

                return {
                    parts: [setupLines, { portId: 'out', depthDelta: 0 }]
                };
            }
        },

        // ─── Custom Tool On Call ─────────────────────────────────────────
        {
            id: 'dc_tool_on_call',
            name: 'Custom Tool On Call',
            trigger: true,
            color: COLOR,
            icon: '📞',
            category: 'DuinoClaw',
            description: 'เรียกเมื่อ AI invoke Custom Tool\nOK = path สำเร็จ, ERROR = path error\nใช้ Custom Tool Respond เพื่อส่งผลกลับ AI',
            inputs: [],
            outputs: [{ id: 'output', type: 'output', label: '➜', dataType: 'void', description: 'รันเมื่อ tool ถูกเรียก (success path)' }],
            params: [TOOL_NAME_PARAM],
            toCode({ captureCode, params, registerPreprocessor, registerGlobal, registerFunction, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);

                const safe = safeName(params.tool_name);
                const SAFE = safe.toUpperCase();

                const body = captureCode('output', 1) ?? '';

                registerFunction(`String _dc_tool_${safe}_cb(JsonObject _args)`, 
                    [
                        '  String _result = "ERROR";',
                        body,
                        '  return _result;'
                    ].join('\n'), 
                `String _dc_tool_${safe}_cb(JsonObject args) ;`);
                registerPreprocessor(`#define DC_TOOL_${SAFE}_CB _dc_tool_${safe}_cb`);
                return { parts: [] };
            }
        },

        // ─── Custom Tool Respond ─────────────────────────────────────────
        {
            id: 'dc_tool_respond',
            name: 'Custom Tool Respond',
            color: COLOR,
            icon: '↩️',
            category: 'DuinoClaw',
            description: 'ส่งผลลัพธ์กลับให้ AI จาก Custom Tool\nใช้ภายใน Custom Tool On Call',
            inputs: [
                { id: 'msg', type: 'input', label: 'Message', dataType: 'any', description: 'ข้อความตอบกลับ (ถ้าไม่ต่อสาย ใช้จาก param)' },
            ],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'message', type: 'text', label: 'Message', default: 'OK', description: 'ใช้เมื่อไม่มีบล็อกต่อเข้า Message' },
            ],
            toCode({ pad, params, resolveInput, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);
                const expr = resolveInput('msg') ?? `F("${(params.message ?? 'OK').replaceAll('"', '\\"')}")`;
                return {
                    parts: [
                        [`${pad}_result = ${expr};`], 
                        { portId: 'out', depthDelta: 0 }
                    ]
                };
            }
        },

        // ─── Custom Tool Get Arg ─────────────────────────────────────────
        {
            id: 'dc_tool_arg',
            name: 'Custom Tool Arg',
            color: COLOR,
            icon: '📌',
            category: 'DuinoClaw',
            description: 'อ่านค่า argument ที่ AI ส่งมากับ Custom Tool\nใช้ภายใน Custom Tool On Call',
            inputs: [],
            outputs: [{ id: 'value', type: 'output', label: 'Value', dataType: 'String' }],
            params: [
                TOOL_NAME_PARAM,
                { id: 'arg_name', type: 'text', label: 'Arg Name', default: 'param1', description: 'ชื่อ argument (ต้องตรงกับ Property Name ใน Custom Tool)' },
                {
                    id: 'arg_type', type: 'option', label: 'Type', default: 'String', options: [
                        { label: 'String', value: 'String' },
                        { label: 'Float', value: 'float' },
                        { label: 'Integer', value: 'int' },
                    ]
                },
            ],
            dynamicPorts(params) {
                const t = params.arg_type ?? 'String';
                const dt = t === 'String' ? 'String' : (t === 'float' ? 'float' : 'int');
                return { outputs: [{ id: 'value', type: 'output', label: 'Value', dataType: dt as import('../types.js').DataType }] };
            },
            toExpr(params) {
                const safe = safeName(params.tool_name);
                const arg = (params.arg_name ?? 'param1').replaceAll('"', '\\"');
                const t = params.arg_type ?? 'String';
                return `_args["${arg}"].as<${t}>()`;
            },
            toCode({ params, registerPreprocessor, registerGlobal, registerPollingCode }) {
                registerDCBase(registerPreprocessor, registerGlobal, registerPollingCode);
                return { parts: [] };
            }
        },
    ]
};

export default duinoClawExtension;
