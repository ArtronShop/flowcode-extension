import type { BlockCategory } from '../types.js';

const COLOR = '#0891b2'; // cyan-600

const smartConfigExtension: BlockCategory = {
    id: 'smart-config',
    name: 'SmartConfig',
    blocks: [

        // ─── WiFi Begin (Saved) ──────────────────────────────────────────
        {
            id: 'sc_wifi_begin',
            name: 'WiFi Begin (Saved)',
            color: COLOR,
            icon: '📶',
            category: 'SmartConfig',
            description: 'เชื่อมต่อ WiFi จากค่าที่บันทึกไว้ใน NVS (flash) โดยไม่ต้องใส่ SSID/Password\nเปิดตัวเลือก Auto SmartConfig เพื่อให้เปิด SmartConfig อัตโนมัติหากเชื่อมต่อไม่สำเร็จ',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
            outputs: [
                { id: 'connected', type: 'output', label: 'Connected', dataType: 'void', description: 'เชื่อมต่อ WiFi สำเร็จ (จาก NVS หรือ SmartConfig)' },
                { id: 'failed',    type: 'output', label: 'Failed',    dataType: 'void', description: 'เชื่อมต่อไม่สำเร็จ (และ SmartConfig ล้มเหลว หากเปิดใช้)' },
                { id: 'out',       type: 'output', label: '➜',         dataType: 'void' },
            ],
            params: [
                {
                    id: 'timeout', type: 'number', label: 'Timeout (s)', default: '10',
                    description: 'ระยะเวลาสูงสุดในการรอเชื่อมต่อ WiFi จาก NVS (วินาที)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
                {
                    id: 'auto_smartconfig', type: 'option', label: 'Start SmartConfig if WiFi Connect Fail?', default: 'true',
                    description: 'หากเชื่อมต่อจาก NVS ไม่สำเร็จ ให้เปิด SmartConfig อัตโนมัติ',
                    options: [
                        { label: 'No',  value: 'false' },
                        { label: 'Yes', value: 'true'  },
                    ],
                },
                {
                    id: 'sc_timeout', type: 'number', label: 'Max wait SmartConfig time (s)', default: '60',
                    description: '[Auto SmartConfig] ระยะเวลาสูงสุดในการรอรับค่า WiFi จากสมาร์ทโฟน (วินาที)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                    hidden: ({ params }) => params.auto_smartconfig !== 'true',
                },
                {
                    id: 'sc_type', type: 'option', label: 'Protocol', default: 'SC_TYPE_ESPTOUCH',
                    description: '[Auto SmartConfig] โปรโตคอล SmartConfig',
                    options: [
                        { label: 'ESPTouch',           value: 'SC_TYPE_ESPTOUCH' },
                        { label: 'AirKiss',            value: 'SC_TYPE_AIRKISS' },
                        { label: 'ESPTouch + AirKiss', value: 'SC_TYPE_ESPTOUCH_AIRKISS' },
                        { label: 'ESPTouch V2',        value: 'SC_TYPE_ESPTOUCH_V2' },
                    ],
                    hidden: ({ params }) => params.auto_smartconfig !== 'true',
                },
            ],
            toCode({ block, safeId, pad, params, registerPreprocessor }) {
                registerPreprocessor('#include <WiFi.h>');

                const id = safeId(block.id);
                const timeoutMs = Number(params.timeout ?? 10) * 1000;
                const autoSC = params.auto_smartconfig === 'true';

                const lines: string[] = [
                    `${pad}WiFi.mode(WIFI_STA);`,
                    `${pad}WiFi.begin();`,
                    `${pad}{ unsigned long ${id}_t = millis();`,
                    `${pad}  while (WiFi.status() != WL_CONNECTED && millis() - ${id}_t < ${timeoutMs}UL) delay(100); }`,
                ];

                if (autoSC) {
                    const scTimeoutMs  = Number(params.sc_timeout  ?? 60) * 1000;
                    const connTimeoutMs = Number(params.timeout ?? 10) * 1000;
                    const scType = params.sc_type ?? 'SC_TYPE_ESPTOUCH';
                    lines.push(
                        `${pad}if (WiFi.status() != WL_CONNECTED) {`,
                        `${pad}  WiFi.beginSmartConfig(${scType});`,
                        `${pad}  { unsigned long ${id}_sc_t = millis();`,
                        `${pad}    while (!WiFi.smartConfigDone() && millis() - ${id}_sc_t < ${scTimeoutMs}UL) delay(100); }`,
                        `${pad}  if (WiFi.smartConfigDone()) {`,
                        `${pad}    unsigned long ${id}_ct = millis();`,
                        `${pad}    while (WiFi.status() != WL_CONNECTED && millis() - ${id}_ct < ${connTimeoutMs}UL) delay(100);`,
                        `${pad}  }`,
                        `${pad}  WiFi.stopSmartConfig();`,
                        `${pad}}`,
                    );
                }

                lines.push(`${pad}if (WiFi.status() == WL_CONNECTED) {`);

                return {
                    parts: [
                        lines,
                        { portId: 'connected', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'failed', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── SmartConfig Begin ───────────────────────────────────────────
        {
            id: 'sc_begin',
            name: 'SmartConfig Begin',
            color: COLOR,
            icon: '📲',
            category: 'SmartConfig',
            description: 'เริ่ม SmartConfig เพื่อรับค่า WiFi SSID/Password จากสมาร์ทโฟน (blocking)\nใช้แอป ESP Touch / EspBlufi บน iOS หรือ Android',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
            outputs: [
                { id: 'connected', type: 'output', label: 'Connected', dataType: 'void', description: 'ได้รับค่า WiFi และเชื่อมต่อสำเร็จ' },
                { id: 'timeout',   type: 'output', label: 'Timeout',   dataType: 'void', description: 'หมดเวลาโดยยังไม่ได้รับค่าหรือเชื่อมต่อไม่สำเร็จ' },
                { id: 'out',       type: 'output', label: '➜',         dataType: 'void' },
            ],
            params: [
                {
                    id: 'sc_timeout', type: 'number', label: 'SC Timeout (s)', default: '60',
                    description: 'ระยะเวลาสูงสุดในการรอรับค่า WiFi จากสมาร์ทโฟน (วินาที)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
                {
                    id: 'conn_timeout', type: 'number', label: 'Connect Timeout (s)', default: '10',
                    description: 'ระยะเวลาสูงสุดในการรอเชื่อมต่อ WiFi หลังได้รับค่า (วินาที)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
                {
                    id: 'sc_type', type: 'option', label: 'Protocol', default: 'SC_TYPE_ESPTOUCH',
                    description: 'โปรโตคอล SmartConfig',
                    options: [
                        { label: 'ESPTouch',           value: 'SC_TYPE_ESPTOUCH' },
                        { label: 'AirKiss',            value: 'SC_TYPE_AIRKISS' },
                        { label: 'ESPTouch + AirKiss', value: 'SC_TYPE_ESPTOUCH_AIRKISS' },
                        { label: 'ESPTouch V2',        value: 'SC_TYPE_ESPTOUCH_V2' },
                    ],
                },
            ],
            toCode({ block, safeId, pad, params, registerPreprocessor }) {
                registerPreprocessor('#include <WiFi.h>');

                const id = safeId(block.id);
                const scTimeoutMs  = Number(params.sc_timeout  ?? 60) * 1000;
                const connTimeoutMs = Number(params.conn_timeout ?? 10) * 1000;
                const scType = params.sc_type ?? 'SC_TYPE_ESPTOUCH';

                return {
                    parts: [
                        [
                            `${pad}WiFi.mode(WIFI_STA);`,
                            `${pad}WiFi.beginSmartConfig(${scType});`,
                            `${pad}{ unsigned long ${id}_t = millis();`,
                            `${pad}  while (!WiFi.smartConfigDone() && millis() - ${id}_t < ${scTimeoutMs}UL) delay(100); }`,
                            `${pad}if (WiFi.smartConfigDone()) {`,
                            `${pad}  unsigned long ${id}_ct = millis();`,
                            `${pad}  while (WiFi.status() != WL_CONNECTED && millis() - ${id}_ct < ${connTimeoutMs}UL) delay(100);`,
                            `${pad}}`,
                            `${pad}if (WiFi.status() == WL_CONNECTED) {`,
                        ],
                        { portId: 'connected', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'timeout', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Stop ────────────────────────────────────────────────────────
        {
            id: 'sc_stop',
            name: 'SmartConfig Stop',
            color: COLOR,
            icon: '⏹️',
            category: 'SmartConfig',
            description: 'หยุด SmartConfig mode\nเรียกหลังจาก SmartConfig Begin สำเร็จ หรือเมื่อต้องการยกเลิก',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ pad, registerPreprocessor }) {
                registerPreprocessor('#include <WiFi.h>');
                return {
                    parts: [
                        [`${pad}WiFi.stopSmartConfig();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default smartConfigExtension;
