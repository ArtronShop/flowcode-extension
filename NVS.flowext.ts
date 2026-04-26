import type { BlockCategory } from '../types.js';

const COLOR = '#ea580c'; // orange-600

const NVS_TYPES = [
    { label: 'Bool', value: 'bool' },
    { label: 'Int', value: 'int' },
    { label: 'Float', value: 'float' },
    { label: 'String', value: 'String' },
];

function nvsRegister(
    registerPreprocessor: (d: string) => void,
    registerGlobal: (d: string) => void,
) {
    registerPreprocessor('#include <Preferences.h>');
    registerGlobal('Preferences _nvs;');
}

function fmtValue(dataType: string, params: Record<string, string>): string {
    switch (dataType) {
        case 'bool': return params.val_bool === 'true' ? 'true' : 'false';
        case 'int': return params.val_int ?? '0';
        case 'float': return params.val_float ?? '0.0';
        case 'String': return `"${(params.val_str ?? '').replaceAll('"', '\\"')}"`;
        default: return '0';
    }
}

function fmtDefault(dataType: string, params: Record<string, string>): string {
    switch (dataType) {
        case 'bool': return params.def_bool === 'true' ? 'true' : 'false';
        case 'int': return params.def_int ?? '0';
        case 'float': return params.def_float ?? '0.0';
        case 'String': return `"${(params.def_str ?? '').replaceAll('"', '\\"')}"`;
        default: return '0';
    }
}

const nvsExtension: BlockCategory = {
    id: 'nvs',
    name: 'NVS (Preferences)',
    blocks: [

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'nvs_begin',
            name: 'NVS Begin',
            color: COLOR,
            icon: '🗄️',
            category: 'NVS',
            description: 'เปิด NVS namespace — เรียกก่อนใช้ NVS Put/Get\nชื่อ namespace ยาวสูงสุด 15 ตัวอักษร',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'ok', type: 'output', label: 'OK', dataType: 'void', description: 'เปิด namespace สำเร็จ' },
                { id: 'failed', type: 'output', label: 'Failed', dataType: 'void', description: 'เปิดไม่สำเร็จ (ชื่อยาวเกิน หรือ flash error)' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                { id: 'ns', type: 'text', label: 'Namespace', default: 'storage', description: 'ชื่อ namespace (สูงสุด 15 ตัวอักษร)' },
                {
                    id: 'readonly', type: 'option', label: 'Mode', default: 'false',
                    options: [
                        { label: 'Read/Write', value: 'false' },
                        { label: 'Read Only', value: 'true' },
                    ],
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal }) {
                nvsRegister(registerPreprocessor, registerGlobal);
                const ns = (params.ns ?? 'storage').replaceAll('"', '\\"');
                const ro = params.readonly ?? 'false';
                return {
                    parts: [
                        [`${pad}if (_nvs.begin("${ns}", ${ro})) {`],
                        { portId: 'ok', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'failed', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── End ─────────────────────────────────────────────────────────
        {
            id: 'nvs_end',
            name: 'NVS End',
            color: COLOR,
            icon: '🔒',
            category: 'NVS',
            description: 'ปิด NVS namespace และ commit การเปลี่ยนแปลงลง flash',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ pad, registerPreprocessor, registerGlobal }) {
                nvsRegister(registerPreprocessor, registerGlobal);
                return {
                    parts: [
                        [`${pad}_nvs.end();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Put ─────────────────────────────────────────────────────────
        {
            id: 'nvs_put',
            name: 'NVS Put',
            color: COLOR,
            icon: '💾',
            category: 'NVS',
            description: 'เขียนค่าลง NVS ตาม key',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
                { id: 'value', type: 'input', label: 'Value', dataType: 'any', description: 'ค่าที่จะเขียน (ถ้าไม่ต่อสาย ใช้ค่าจาก param)' },
            ],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'key', type: 'text', label: 'Key', default: 'myKey', description: 'ชื่อ key (สูงสุด 15 ตัวอักษร)' },
                { id: 'data_type', type: 'option', label: 'Type', default: 'int', options: NVS_TYPES },
                { id: 'val_bool', type: 'option', label: 'Value', default: 'false', options: [{ label: 'true', value: 'true' }, { label: 'false', value: 'false' }], hidden: ({ params }) => params.data_type !== 'bool' },
                { id: 'val_int', type: 'number', label: 'Value', default: '0', hidden: ({ params }) => params.data_type !== 'int' },
                { id: 'val_float', type: 'number', label: 'Value', default: '0.0', hidden: ({ params }) => params.data_type !== 'float' },
                { id: 'val_str', type: 'text', label: 'Value', default: '', hidden: ({ params }) => params.data_type !== 'String' },
            ],
            toCode({ pad, params, resolveInput, registerPreprocessor, registerGlobal }) {
                nvsRegister(registerPreprocessor, registerGlobal);
                const key = (params.key ?? 'myKey').replaceAll('"', '\\"');
                const dataType = params.data_type ?? 'int';
                const putMap: Record<string, string> = { bool: 'putBool', int: 'putInt', float: 'putFloat', String: 'putString' };
                const putFn = putMap[dataType] ?? 'putInt';
                const valueExpr = resolveInput('value') ?? fmtValue(dataType, params);
                return {
                    parts: [
                        [`${pad}_nvs.${putFn}("${key}", ${valueExpr});`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Get ─────────────────────────────────────────────────────────
        {
            id: 'nvs_get',
            name: 'NVS Get',
            color: COLOR,
            icon: '📖',
            category: 'NVS',
            description: 'อ่านค่าจาก NVS ตาม key\nหากไม่พบ key จะใช้ค่า default',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'int' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                { id: 'key', type: 'text', label: 'Key', default: 'myKey', description: 'ชื่อ key (สูงสุด 15 ตัวอักษร)' },
                { id: 'data_type', type: 'option', label: 'Type', default: 'int', options: NVS_TYPES },
                { id: 'def_bool', type: 'option', label: 'Default', default: 'false', options: [{ label: 'true', value: 'true' }, { label: 'false', value: 'false' }], hidden: ({ params }) => params.data_type !== 'bool' },
                { id: 'def_int', type: 'number', label: 'Default', default: '0', hidden: ({ params }) => params.data_type !== 'int' },
                { id: 'def_float', type: 'number', label: 'Default', default: '0.0', hidden: ({ params }) => params.data_type !== 'float' },
                { id: 'def_str', type: 'text', label: 'Default', default: '', hidden: ({ params }) => params.data_type !== 'String' },
            ],
            dynamicPorts(params) {
                const dtMap: Record<string, string> = { bool: 'bool', int: 'int', float: 'float', String: 'String' };
                const dataType = dtMap[params.data_type ?? 'int'] ?? 'int';
                return {
                    outputs: [
                        { id: 'value', type: 'output', label: 'Value', dataType, description: 'ค่าที่อ่านได้' },
                    ]
                };
            },
            toCode({ pad, block, safeId, params, registerPreprocessor, registerGlobal }) {
                nvsRegister(registerPreprocessor, registerGlobal);
                const id = safeId(block.id);
                const key = (params.key ?? 'myKey').replaceAll('"', '\\"');
                const dataType = params.data_type ?? 'int';
                const getMap: Record<string, string> = { bool: 'getBool', int: 'getInt', float: 'getFloat', String: 'getString' };
                const cppMap: Record<string, string> = { bool: 'bool', int: 'int', float: 'float', String: 'String' };
                const getFn = getMap[dataType] ?? 'getInt';
                const cppType = cppMap[dataType] ?? 'int';
                const defVal = fmtDefault(dataType, params);
                return {
                    parts: [
                        [`${pad}${cppType} ${id} = _nvs.${getFn}("${key}", ${defVal});`],
                        { portId: 'value', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Is Key ──────────────────────────────────────────────────────
        {
            id: 'nvs_is_key',
            name: 'NVS Is Key',
            color: COLOR,
            icon: '🔍',
            category: 'NVS',
            description: 'ตรวจสอบว่า key มีอยู่ใน NVS หรือไม่',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'exists', type: 'output', label: 'Exists', dataType: 'void', description: 'มี key อยู่' },
                { id: 'missing', type: 'output', label: 'Not Exists', dataType: 'void', description: 'ไม่มี key' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                { id: 'key', type: 'text', label: 'Key', default: 'myKey' },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal }) {
                nvsRegister(registerPreprocessor, registerGlobal);
                const key = (params.key ?? 'myKey').replaceAll('"', '\\"');
                return {
                    parts: [
                        [`${pad}if (_nvs.isKey("${key}")) {`],
                        { portId: 'exists', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'missing', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Remove ──────────────────────────────────────────────────────
        {
            id: 'nvs_remove',
            name: 'NVS Remove',
            color: COLOR,
            icon: '🗑️',
            category: 'NVS',
            description: 'ลบ key ออกจาก NVS',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'key', type: 'text', label: 'Key', default: 'myKey' },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal }) {
                nvsRegister(registerPreprocessor, registerGlobal);
                const key = (params.key ?? 'myKey').replaceAll('"', '\\"');
                return {
                    parts: [
                        [`${pad}_nvs.remove("${key}");`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Clear ───────────────────────────────────────────────────────
        {
            id: 'nvs_clear',
            name: 'NVS Clear',
            color: COLOR,
            icon: '🧹',
            category: 'NVS',
            description: 'ล้าง key ทั้งหมดใน namespace ที่เปิดอยู่',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ pad, registerPreprocessor, registerGlobal }) {
                nvsRegister(registerPreprocessor, registerGlobal);
                return {
                    parts: [
                        [`${pad}_nvs.clear();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default nvsExtension;
