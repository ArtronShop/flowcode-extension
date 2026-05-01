import type { BlockCategory } from '../types.js';

const COLOR = '#78716c'; // stone-500

function registerSDBase(
    registerPreprocessor: (d: string) => void,
    registerFunction: (header: string, body: string, declaration?: string | undefined) => void,
) {
    registerPreprocessor('#include <SPI.h>');
    registerPreprocessor('#include <SD.h>');

    registerFunction(
        'bool sd_init()',
        [
            `  if (_sd_spi_cd_pin >= 0) {`,
            `    if (digitalRead(_sd_spi_cd_pin) == HIGH) {`,
            `      if (SD.cardType() != CARD_NONE) {`,
            `        SD.end();`,
            `      }`,
            `      return false;`,
            `    }`,
            `  }`,
            `  if (SD.cardType() == CARD_NONE) {`,
            `#ifndef SD_CUSTOM_PIN`,
            `    return SD.begin(_sd_spi_cs_pin);`,
            `#else`,
            `    _sd_spi.begin(_sd_spi_sck_pin, _sd_spi_miso_pin, _sd_spi_mosi_pin, _sd_spi_cs_pin);`,
            `    return SD.begin(_sd_spi_cs_pin, _sd_spi);`,
            `#endif`,
            `  }`,
            `  return true;`
        ].join('\n'),
        'bool sd_init() ;',
    );

    registerFunction(
        'File sd_open(const String &path, const char *mode, const bool create)',
        [
            `  if (!sd_init()) return File();`,
            `  return SD.open(path, mode, create);`,
        ].join('\n'),
        'File sd_open(const String &path, const char *mode = FILE_READ, const bool create = false) ;'
    );
}

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

const sdCardExtension: BlockCategory = {
    id: 'sd-card',
    name: 'SD Card',
    blocks: [

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'sd_begin',
            name: 'SD Begin',
            color: COLOR,
            icon: '💾',
            category: 'SD Card',
            description: 'เริ่มต้น SD Card ผ่าน SPI\nไม่ต้องติดตั้ง library เพิ่ม — ใช้ SD.h ที่ฝังใน Arduino Core',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                {
                    id: 'cs', type: 'number', label: 'CS Pin', default: '5',
                    description: 'SPI Chip Select pin',
                    validation: (n: number) => Math.trunc(n),
                },
                {
                    id: 'cd', type: 'number', label: 'Card Detect (CD) Pin', default: '-1',
                    description: 'Card Detect pin',
                    validation: (n: number) => Math.trunc(n),
                },
                {
                    id: 'custom_spi', type: 'option', label: 'SPI Pins', default: 'default',
                    options: [
                        { label: 'Default SPI', value: 'default' },
                        { label: 'Custom Pins', value: 'custom' },
                    ],
                },
                {
                    id: 'port', type: 'option', label: 'SPI Interface', default: 'VSPI',
                    options: [
                        { label: 'VSPI', value: 'VSPI' },
                        { label: 'HSPI', value: 'HSPI' },
                    ], hidden: ({ params }) => params.custom_spi !== 'custom'
                },
                { id: 'sck', type: 'number', label: 'SCK Pin', default: '18', validation: (n: number) => Math.trunc(n), hidden: ({ params }) => params.custom_spi !== 'custom' },
                { id: 'miso', type: 'number', label: 'MISO Pin', default: '19', validation: (n: number) => Math.trunc(n), hidden: ({ params }) => params.custom_spi !== 'custom' },
                { id: 'mosi', type: 'number', label: 'MOSI Pin', default: '23', validation: (n: number) => Math.trunc(n), hidden: ({ params }) => params.custom_spi !== 'custom' },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);

                const cs = params.cs ?? '5';
                const cd = params.cd ?? '-1';
                const custom = params.custom_spi === 'custom';
                const port = params.port ?? 'VSPI';
                const sck = params.sck ?? '18';
                const miso = params.miso ?? '19';
                const mosi = params.mosi ?? '23';

                if (custom) {
                    registerPreprocessor('#define SD_CUSTOM_PIN 1');
                    registerGlobal(`SPIClass _sd_spi(${port});`);
                    registerGlobal(`const int _sd_spi_sck_pin = ${sck};`);
                    registerGlobal(`const int _sd_spi_miso_pin = ${miso};`);
                    registerGlobal(`const int _sd_spi_mosi_pin = ${mosi};`);
                }
                registerGlobal(`const int _sd_spi_cs_pin = ${cs};`);
                registerGlobal(`const int _sd_spi_cd_pin = ${cd};`);

                return {
                    parts: [
                        [`${pad}if (_sd_spi_cd_pin >= 0) {`],
                        [`${pad}  pinMode(_sd_spi_cd_pin, INPUT_PULLUP);`],
                        [`${pad}}`],
                        [`${pad}sd_init();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
        {
            id: 'sd_is_dectected',
            name: 'SD is Detected',
            color: COLOR,
            icon: '🔗',
            category: 'SD Card',
            description: 'เช็คว่า SD Card เชื่อมต่ออยู่/ใส่อยู่หรือไม่',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'yes', type: 'output', label: 'Detected', dataType: 'void' },
                { id: 'no', type: 'output', label: 'Not Detect', dataType: 'void' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            toCode({ pad, registerPreprocessor, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);

                return {
                    parts: [
                        [`${pad}if (sd_init()) {`],
                        { portId: 'yes', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'no', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Write ───────────────────────────────────────────────────────
        {
            id: 'sd_write',
            name: 'SD Write',
            color: COLOR,
            icon: '📝',
            category: 'SD Card',
            requires: ['sd_begin'],
            description: 'เขียนข้อมูลลงไฟล์ใน SD Card\npath ต้องขึ้นต้นด้วย / เช่น /data.csv',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any' },
                { id: 'data', type: 'input', label: 'Data', dataType: 'any', description: 'ข้อมูลที่จะเขียน (ถ้าไม่ต่อสาย ใช้ค่าจาก param)' },
            ],
            outputs: [
                { id: 'ok', type: 'output', label: 'OK', dataType: 'void', description: 'เขียนสำเร็จ' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'เปิดไฟล์ไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                {
                    id: 'path', type: 'text', label: 'File Path', default: '/data.csv',
                    description: 'path ของไฟล์ ขึ้นต้นด้วย /',
                },
                {
                    id: 'mode', type: 'option', label: 'Mode', default: 'append',
                    options: [
                        { label: 'Append', value: 'append' },
                        { label: 'Overwrite', value: 'overwrite' },
                    ],
                },
                {
                    id: 'newline', type: 'option', label: 'New Line', default: 'yes',
                    options: [
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                    ],
                },
                {
                    id: 'data', type: 'text', label: 'Data', default: '',
                    description: 'ใช้เมื่อไม่มีบล็อกต่อเข้ามา',
                },
            ],
            toCode({ pad, block, safeId, params, resolveInput, registerPreprocessor, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);

                const id = safeId(block.id);
                const path = (params.path ?? '/data.csv').replaceAll('"', '\\"');
                const fileMode = params.mode === 'overwrite' ? 'FILE_WRITE' : 'FILE_APPEND';
                const fn = params.newline === 'no' ? 'print' : 'println';
                const data = resolveInput('data') ?? `"${(params.data ?? '').replaceAll('"', '\\"')}"`;

                return {
                    parts: [
                        [`${pad}{`],
                        [`${pad}  File ${id}_f = sd_open("${path}", ${fileMode});`],
                        [`${pad}  if (${id}_f) {`],
                        [`${pad}    ${id}_f.${fn}(${data});`],
                        [`${pad}    ${id}_f.close();`],
                        { portId: 'ok', depthDelta: 2 },
                        [`${pad}  } else {`],
                        { portId: 'error', depthDelta: 2 },
                        [`${pad}  }`],
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Write Format ────────────────────────────────────────────────
        {
            id: 'sd_write_format',
            name: 'SD Write Format',
            color: COLOR,
            icon: '🖊️',
            category: 'SD Card',
            requires: ['sd_begin'],
            description: 'เขียนข้อมูลลงไฟล์แบบ printf format\nจำนวน input จะปรับอัตโนมัติตาม specifier ใน format string',
            inputs: [],
            outputs: [
                { id: 'ok', type: 'output', label: 'OK', dataType: 'void', description: 'เขียนสำเร็จ' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'เปิดไฟล์ไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                {
                    id: 'path', type: 'text', label: 'File Path', default: '/data.csv',
                    description: 'path ของไฟล์ ขึ้นต้นด้วย /',
                },
                {
                    id: 'mode', type: 'option', label: 'Mode', default: 'append',
                    options: [
                        { label: 'Append', value: 'append' },
                        { label: 'Overwrite', value: 'overwrite' },
                    ],
                },
                {
                    id: 'format', type: 'text', label: 'Format', default: '%d,%.2f\\n',
                    description: 'รูปแบบ printf เช่น "%d,%.2f\\n" หรือ "%s,%d\\n"\n(จำนวน input จะปรับตาม specifier อัตโนมัติ)',
                },
            ],
            dynamicPorts({ format }) {
                const specs = getPrintfSpecifiers(format ?? '%d');
                return {
                    inputs: [
                        { id: 'inp', type: 'input', label: '➜', dataType: 'void' as const },
                        ...specs.map((spec, i) => ({
                            id: `arg${i + 1}`, type: 'input' as const,
                            label: `Arg ${i + 1}`,
                            dataType: specifierToDataType(spec) as import('../types.js').DataType,
                        })),
                    ]
                };
            },
            toCode({ pad, block, safeId, params, resolveInput, registerPreprocessor, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);

                const id = safeId(block.id);
                const path = (params.path ?? '/data.csv').replaceAll('"', '\\"');
                const fileMode = params.mode === 'overwrite' ? 'FILE_WRITE' : 'FILE_APPEND';
                const fmt = (params.format ?? '%d').replaceAll('"', '\\"');
                const specs = getPrintfSpecifiers(fmt);
                const args = specs.map((_, i) => resolveInput(`arg${i + 1}`) ?? '0');
                const wrapped = wrapPrintfArgs(args, specs);
                const argsPart = wrapped.length > 0 ? `, ${wrapped.join(', ')}` : '';

                return {
                    parts: [
                        [`${pad}{`],
                        [`${pad}  File f = sd_open("${path}", ${fileMode});`],
                        [`${pad}  if (f) {`],
                        [`${pad}    f.printf("${fmt}"${argsPart});`],
                        [`${pad}    f.close();`],
                        { portId: 'ok', depthDelta: 2 },
                        [`${pad}  } else {`],
                        { portId: 'error', depthDelta: 2 },
                        [`${pad}  }`],
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Read ────────────────────────────────────────────────────────
        {
            id: 'sd_read',
            name: 'SD Read',
            color: COLOR,
            icon: '📖',
            category: 'SD Card',
            requires: ['sd_begin'],
            description: 'อ่านไฟล์ทั้งหมดเป็น String\nเหมาะสำหรับไฟล์ config หรือไฟล์ขนาดเล็ก',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'content', type: 'output', label: 'Content', dataType: 'String', description: 'เนื้อหาทั้งหมดของไฟล์' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'เปิดไฟล์ไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                {
                    id: 'path', type: 'text', label: 'File Path', default: '/config.txt',
                    description: 'path ของไฟล์ ขึ้นต้นด้วย /',
                },
            ],
            toCode({ pad, block, safeId, params, registerPreprocessor, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);

                const id = safeId(block.id);
                const path = (params.path ?? '/config.txt').replaceAll('"', '\\"');

                return {
                    parts: [
                        [`${pad}{`],
                        [`${pad}  File f = sd_open("${path}", FILE_READ);`],
                        [`${pad}  if (f) {`],
                        [`${pad}    String ${id} = f.readString();`],
                        [`${pad}    f.close();`],
                        { portId: 'content', depthDelta: 2 },
                        [`${pad}  } else {`],
                        { portId: 'error', depthDelta: 2 },
                        [`${pad}  }`],
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Exists ──────────────────────────────────────────────────────
        {
            id: 'sd_exists',
            name: 'SD Exists',
            color: COLOR,
            icon: '🔍',
            category: 'SD Card',
            requires: ['sd_begin'],
            description: 'ตรวจสอบว่าไฟล์หรือ directory มีอยู่ใน SD Card หรือไม่',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'exists', type: 'output', label: 'Exists', dataType: 'void', description: 'มีไฟล์/directory' },
                { id: 'missing', type: 'output', label: 'Not Exists', dataType: 'void', description: 'ไม่มีไฟล์/directory' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            params: [
                { id: 'path', type: 'text', label: 'Path', default: '/data.csv' },
            ],
            toCode({ pad, params, registerPreprocessor, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);

                const path = (params.path ?? '/data.csv').replaceAll('"', '\\"');

                registerFunction(
                    'void sd_exists(const String &path)',
                    [
                        `  if (!sd_init()) return false;`,
                        `  return SD.exists(path);`,
                    ].join('\n'),
                    'void sd_exists(const String &path) ;'
                );

                return {
                    parts: [
                        [`${pad}if (sd_exists("${path}")) {`],
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
            id: 'sd_remove',
            name: 'SD Remove',
            color: COLOR,
            icon: '🗑️',
            category: 'SD Card',
            requires: ['sd_begin'],
            description: 'ลบไฟล์ออกจาก SD Card',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'path', type: 'text', label: 'File Path', default: '/data.csv' },
            ],
            toCode({ pad, params, registerPreprocessor, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);
                const path = (params.path ?? '/data.csv').replaceAll('"', '\\"');
                return {
                    parts: [
                        [`${pad}if (sd_init()) {`],
                        [`${pad}  SD.remove("${path}");`],
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Mkdir ───────────────────────────────────────────────────────
        {
            id: 'sd_mkdir',
            name: 'SD Mkdir',
            color: COLOR,
            icon: '📁',
            category: 'SD Card',
            requires: ['sd_begin'],
            description: 'สร้าง directory ใน SD Card',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'path', type: 'text', label: 'Directory Path', default: '/logs' },
            ],
            toCode({ pad, params, registerPreprocessor, registerFunction }) {
                registerSDBase(registerPreprocessor, registerFunction);
                const path = (params.path ?? '/logs').replaceAll('"', '\\"');
                return {
                    parts: [
                        [`${pad}if (sd_init()) {`],
                        [`${pad}  SD.mkdir("${path}");`],
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default sdCardExtension;
