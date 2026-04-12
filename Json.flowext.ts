import type { BlockCategory, ParamVarname } from '../types.js';

const COLOR = '#22d3ee'; // cyan

// ─── Shared param definition ─────────────────────────────────────────────────
const docParam: ParamVarname = {
    id: 'doc',
    label: 'Document',
    type: 'varname',
    category: 'json',
    description: 'ชื่อตัวแปร JsonDocument ที่ต้องการใช้งาน',
    default: 'doc',
};

// C++ type for ArduinoJson .as<T>()
function cppCastType(dataType: string): string {
    switch (dataType) {
        case 'float':  return 'float';
        case 'bool':   return 'bool';
        case 'long':   return 'long';
        case 'String': return 'const char*';
        default:       return 'int';
    }
}

// declare + assign local variable from a JsonVariant expression
function varDecl(dataType: string, varName: string, expr: string): string {
    if (dataType === 'String') return `String ${varName} = String(${expr}.as<const char*>());`;
    return `${dataType} ${varName} = ${expr}.as<${cppCastType(dataType)}>();`;
}

// access suffix  ["key"]  or  [index]
function accSuffix(accessType: string, key: string, index: string): string {
    return accessType === 'index' ? `[${index}]` : `["${key.replaceAll('"', '\\"')}"]`;
}

const jsonExtension: BlockCategory = {
    id: 'arduino-json',
    name: 'ArduinoJson',
    blocks: [

        // ─── JSON Parse ──────────────────────────────────────────────────
        {
            id: 'json_parse',
            name: 'JSON Parse',
            color: COLOR,
            icon: '📥',
            category: 'ArduinoJson',
            description: 'แปลง JSON String เป็น JsonDocument\nใช้ deserializeJson() จากไลบรารี ArduinoJson',
            inputs: [
                { id: 'in',  type: 'input', label: '➜',   dataType: 'any',    description: 'สายลำดับการทำงาน' },
                { id: 'str', type: 'input', label: 'JSON', dataType: 'String', description: 'JSON String ที่ต้องการ parse' },
            ],
            outputs: [
                { id: 'success', type: 'output', label: 'Success', dataType: 'void', description: 'รันเมื่อ parse สำเร็จ' },
                { id: 'error',   type: 'output', label: 'Error',   dataType: 'void', description: 'รันเมื่อ parse ไม่สำเร็จ' },
                { id: 'out',     type: 'output', label: '➜',       dataType: 'void', description: 'รันเสมอหลัง if/else' },
            ],
            params: [
                docParam,
                { id: 'json_str', label: 'JSON String', type: 'text', default: '{}', description: 'ใช้เมื่อไม่มีสายต่อเข้า JSON port' },
            ],
            toCode({ pad, block, safeId, params, resolveInput, registerPreprocessor, registerGlobal }) {
                registerPreprocessor('#include <ArduinoJson.h>');
                const docVar = params.doc ?? 'doc';
                const id     = safeId(block.id);
                registerGlobal(`JsonDocument ${docVar};`);
                const str = resolveInput('str') ?? `"${(params.json_str ?? '{}').replaceAll('"', '\\"')}"`;
                return {
                    parts: [
                        [`${pad}DeserializationError ${id}_err = deserializeJson(${docVar}, ${str});`],
                        [`${pad}if (!${id}_err) {`],
                        { portId: 'success', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'error',   depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out',     depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── JSON Create ─────────────────────────────────────────────────
        {
            id: 'json_create',
            name: 'JSON Create',
            color: COLOR,
            icon: '📄',
            category: 'ArduinoJson',
            description: 'สร้าง JsonDocument เปล่าแบบ Object หรือ Array\nใช้ต่อกับ JSON Set Value / JSON Create Nested เพื่อสร้าง JSON',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
            ],
            outputs: [
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                docParam,
                {
                    id: 'doc_type', label: 'Type', type: 'option',
                    options: [
                        { label: 'Object { }', value: 'object' },
                        { label: 'Array  [ ]', value: 'array'  },
                    ],
                    default: 'object',
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal }) {
                registerPreprocessor('#include <ArduinoJson.h>');
                const docVar = params.doc ?? 'doc';
                registerGlobal(`JsonDocument ${docVar};`);
                const cType = (params.doc_type ?? 'object') === 'array' ? 'JsonArray' : 'JsonObject';
                return {
                    parts: [
                        [`${pad}${docVar}.clear();`],
                        [`${pad}${docVar}.to<${cType}>();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── JSON Set Value ──────────────────────────────────────────────
        {
            id: 'json_set_value',
            name: 'JSON Set Value',
            color: COLOR,
            icon: '✏️',
            category: 'ArduinoJson',
            description: 'กำหนดค่าให้ Key ใน Object หรือ Add ค่าเข้า Array\nค่ามาจาก input port หรือ param fallback',
            inputs: [
                { id: 'in',    type: 'input', label: '➜',    dataType: 'any', },
                { id: 'value', type: 'input', label: 'Value', dataType: 'any', description: 'ค่าที่ต้องการกำหนด (ถ้าไม่ต่อสายจะใช้ค่า param)' },
            ],
            outputs: [
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                docParam,
                {
                    id: 'access_type', label: 'Set By', type: 'option',
                    options: [
                        { label: 'Key (Object)',       value: 'key' },
                        { label: 'Add / Push (Array)', value: 'add' },
                    ],
                    default: 'key',
                },
                {
                    id: 'key', label: 'Key', type: 'text', default: 'key',
                    hidden: ({ params }) => params.access_type === 'add',
                },
                { id: 'value', label: 'Value', type: 'text', default: '0', description: 'ค่า fallback เมื่อไม่มีสายต่อเข้า Value port' },
            ],
            toCode({ pad, params, resolveInput, registerPreprocessor, registerGlobal }) {
                registerPreprocessor('#include <ArduinoJson.h>');
                const docVar  = params.doc ?? 'doc';
                registerGlobal(`JsonDocument ${docVar};`);
                const valExpr = resolveInput('value') ?? params.value ?? '0';
                const isAdd   = (params.access_type ?? 'key') === 'add';
                const key     = (params.key ?? 'key').replaceAll('"', '\\"');
                const setLine = isAdd
                    ? `${pad}${docVar}.add(${valExpr});`
                    : `${pad}${docVar}["${key}"] = ${valExpr};`;
                return {
                    parts: [
                        [setLine],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── JSON Get Value ──────────────────────────────────────────────
        {
            id: 'json_get_value',
            name: 'JSON Get Value',
            color: COLOR,
            icon: '🔑',
            category: 'ArduinoJson',
            description: 'อ่านค่าสเกลาร์จาก JsonDocument\nเข้าถึงด้วย Key (Object) หรือ Index (Array)',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
            ],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'any' },
                { id: 'out',   type: 'output', label: '➜',     dataType: 'void' },
            ],
            dynamicPorts: (params) => ({
                outputs: [
                    { id: 'value', type: 'output', label: 'Value', dataType: params.data_type ?? 'int' },
                    { id: 'out',   type: 'output', label: '➜',     dataType: 'void' },
                ]
            }),
            params: [
                docParam,
                {
                    id: 'access_type', label: 'Access By', type: 'option',
                    options: [
                        { label: 'Key (Object)',  value: 'key'   },
                        { label: 'Index (Array)', value: 'index' },
                    ],
                    default: 'key',
                },
                {
                    id: 'key', label: 'Key', type: 'text', default: 'value',
                    hidden: ({ params }) => params.access_type === 'index',
                },
                {
                    id: 'index', label: 'Index', type: 'number', default: '0',
                    validation: (n: number) => Math.max(0, Math.round(n)),
                    hidden: ({ params }) => params.access_type !== 'index',
                },
                {
                    id: 'data_type', label: 'Data Type', type: 'option',
                    options: [
                        { label: 'int',    value: 'int'    },
                        { label: 'float',  value: 'float'  },
                        { label: 'String', value: 'String' },
                        { label: 'bool',   value: 'bool'   },
                        { label: 'long',   value: 'long'   },
                    ],
                    default: 'int',
                },
            ],
            toCode({ pad, block, safeId, params, registerPreprocessor, registerGlobal }) {
                registerPreprocessor('#include <ArduinoJson.h>');
                const docVar = params.doc ?? 'doc';
                registerGlobal(`JsonDocument ${docVar};`);
                const id  = safeId(block.id);
                const acc = accSuffix(params.access_type ?? 'key', params.key ?? 'value', params.index ?? '0');
                const dt  = params.data_type ?? 'int';
                return {
                    parts: [
                        [`${pad}${varDecl(dt, id, `${docVar}${acc}`)}`],
                        { portId: 'value', depthDelta: 0 },
                        { portId: 'out',   depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── JSON Get Nested ─────────────────────────────────────────────
        {
            id: 'json_get_nested',
            name: 'JSON Get Nested',
            color: COLOR,
            icon: '🗂️',
            category: 'ArduinoJson',
            description: 'ดึง Nested Object หรือ Array ออกมาเป็น JsonDocument ใหม่\nเข้าถึงด้วย Key หรือ Index จาก Document ต้นทาง',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
            ],
            outputs: [
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                docParam,
                {
                    id: 'out_doc', label: 'Output Doc', type: 'varname',
                    category: 'json',
                    description: 'ชื่อตัวแปร JsonDocument ที่จะเก็บ nested ที่ copy มา',
                    default: 'doc',
                } satisfies ParamVarname,
                {
                    id: 'access_type', label: 'Access By', type: 'option',
                    options: [
                        { label: 'Key (Object)',  value: 'key'   },
                        { label: 'Index (Array)', value: 'index' },
                    ],
                    default: 'key',
                },
                {
                    id: 'key', label: 'Key', type: 'text', default: 'data',
                    hidden: ({ params }) => params.access_type === 'index',
                },
                {
                    id: 'index', label: 'Index', type: 'number', default: '0',
                    validation: (n: number) => Math.max(0, Math.round(n)),
                    hidden: ({ params }) => params.access_type !== 'index',
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal }) {
                registerPreprocessor('#include <ArduinoJson.h>');
                const srcDoc = params.doc     ?? 'doc';
                const outDoc = params.out_doc ?? 'doc';
                registerGlobal(`JsonDocument ${srcDoc};`);
                registerGlobal(`JsonDocument ${outDoc};`);
                const acc = accSuffix(params.access_type ?? 'key', params.key ?? 'data', params.index ?? '0');
                return {
                    parts: [
                        // copy nested into a separate JsonDocument so it can be used standalone
                        [`${pad}${outDoc}.set(${srcDoc}${acc});`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── JSON Create Nested ──────────────────────────────────────────
        {
            id: 'json_create_nested',
            name: 'JSON Create Nested',
            color: COLOR,
            icon: '🗃️',
            category: 'ArduinoJson',
            description: 'สร้าง Nested Object หรือ Array ภายใน Document\nKey → doc["key"].to<JsonObject/Array>()\nAdd → doc.add<JsonObject/Array>()',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
            ],
            outputs: [
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                docParam,
                {
                    id: 'access_type', label: 'Add By', type: 'option',
                    options: [
                        { label: 'Key (Object)',       value: 'key' },
                        { label: 'Add / Push (Array)', value: 'add' },
                    ],
                    default: 'key',
                },
                {
                    id: 'key', label: 'Key', type: 'text', default: 'nested',
                    hidden: ({ params }) => params.access_type === 'add',
                },
                {
                    id: 'nested_type', label: 'Nested Type', type: 'option',
                    options: [
                        { label: 'Object { }', value: 'object' },
                        { label: 'Array  [ ]', value: 'array'  },
                    ],
                    default: 'object',
                },
                {
                    id: 'nested_doc', label: 'Nested Doc', type: 'varname',
                    category: 'json',
                    description: 'ชื่อตัวแปร JsonDocument ที่จะเก็บ nested ที่สร้างใหม่ (optional: ว่าง = ไม่ export)',
                    default: 'doc',
                } satisfies ParamVarname,
            ],
            toCode({ pad, block, safeId, params, registerPreprocessor, registerGlobal }) {
                registerPreprocessor('#include <ArduinoJson.h>');
                const docVar     = params.doc        ?? 'doc';
                const nestedDoc  = params.nested_doc ?? '';
                registerGlobal(`JsonDocument ${docVar};`);
                const isAdd      = (params.access_type ?? 'key') === 'add';
                const nestedType = params.nested_type ?? 'object';
                const cType      = nestedType === 'array' ? 'JsonArray' : 'JsonObject';
                const key        = (params.key ?? 'nested').replaceAll('"', '\\"');
                const createExpr = isAdd
                    ? `${docVar}.add<${cType}>()`
                    : `${docVar}["${key}"].to<${cType}>()`;
                const id = safeId(block.id);
                const lines: string[] = [];
                if (nestedDoc && nestedDoc !== docVar) {
                    registerGlobal(`JsonDocument ${nestedDoc};`);
                    lines.push(`${pad}${nestedDoc}.set(${createExpr});`);
                } else {
                    lines.push(`${pad}${createExpr};`);
                }
                return {
                    parts: [
                        lines,
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── JSON Serialize ──────────────────────────────────────────────
        {
            id: 'json_serialize',
            name: 'JSON Serialize',
            color: COLOR,
            icon: '📤',
            category: 'ArduinoJson',
            description: 'แปลง JsonDocument เป็น JSON String\nใช้ serializeJson()',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
            ],
            outputs: [
                { id: 'str', type: 'output', label: 'JSON', dataType: 'String', description: 'JSON String ที่ได้' },
                { id: 'out', type: 'output', label: '➜',    dataType: 'void'   },
            ],
            params: [
                docParam,
            ],
            toCode({ pad, block, safeId, params, registerPreprocessor, registerGlobal }) {
                registerPreprocessor('#include <ArduinoJson.h>');
                const docVar = params.doc ?? 'doc';
                registerGlobal(`JsonDocument ${docVar};`);
                const id = safeId(block.id);
                return {
                    parts: [
                        [`${pad}String ${id};`],
                        [`${pad}serializeJson(${docVar}, ${id});`],
                        { portId: 'str', depthDelta: 0 },
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default jsonExtension;
