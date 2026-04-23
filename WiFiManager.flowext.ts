import type { BlockCategory } from '../types.js';

const COLOR = '#0d9488'; // teal-600

function registerWm(
    registerPreprocessor: (d: string) => void,
    registerGlobal: (d: string) => void,
) {
    registerPreprocessor('#include <WiFiManager.h>');
    registerGlobal('WiFiManager _wm;');
}

const wifiManagerExtension: BlockCategory = {
    id: 'wifi-manager',
    name: 'WiFiManager',
    blocks: [

        // ─── On AP Mode ──────────────────────────────────────────────────
        {
            id: 'wm_on_ap_mode',
            name: 'WiFiManager On AP Mode',
            trigger: true,
            color: COLOR,
            icon: '📶',
            category: 'WiFiManager',
            description: 'เรียกเมื่อ ESP32 เปิด Access Point เพื่อรับค่า WiFi\nตัวแปร _wm_ap_ssid (String) = ชื่อ AP\nวางก่อนหรือหลัง WiFiManager Begin ก็ได้',
            inputs: [],
            outputs: [
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            toCode({ captureCode, registerPreprocessor, registerGlobal, registerFunction }) {
                registerWm(registerPreprocessor, registerGlobal);
                registerGlobal('String _wm_ap_ssid = "";');

                const body = captureCode('out', 1) ?? '';
                registerFunction(
                    'void _wm_ap_callback(WiFiManager* wm)',
                    [`  _wm_ap_ssid = WiFi.softAPSSID();`, body].filter(Boolean).join('\n'),
                    'void _wm_ap_callback(WiFiManager*);'
                );
                registerPreprocessor('#define WM_AP_CB _wm_ap_callback');
                return { parts: [] };
            }
        },

        // ─── AP SSID ─────────────────────────────────────────────────────
        {
            id: 'wm_ap_ssid',
            name: 'WiFiManager AP SSID',
            color: COLOR,
            icon: '📡',
            category: 'WiFiManager',
            description: 'ชื่อ SSID ของ Access Point ที่เปิดขึ้น (_wm_ap_ssid)\nใช้ภายใน WiFiManager On AP Mode เท่านั้น',
            inputs: [],
            outputs: [{ id: 'ssid', type: 'output', label: 'SSID', dataType: 'String' }],
            toExpr: () => '_wm_ap_ssid',
            toCode() { return { parts: [] }; }
        },

        // ─── On Save ─────────────────────────────────────────────────────
        {
            id: 'wm_on_save',
            name: 'WiFiManager On Save',
            trigger: true,
            color: COLOR,
            icon: '💾',
            category: 'WiFiManager',
            description: 'เรียกเมื่อผู้ใช้บันทึกค่า WiFi ผ่าน Config Portal สำเร็จ\nวางก่อนหรือหลัง WiFiManager Begin ก็ได้',
            inputs: [],
            outputs: [
                { id: 'out', type: 'output', label: '➜', dataType: 'void' },
            ],
            toCode({ captureCode, registerPreprocessor, registerGlobal, registerFunction }) {
                registerWm(registerPreprocessor, registerGlobal);

                const body = captureCode('out', 1) ?? '';
                registerFunction(
                    'void _wm_save_callback()',
                    body,
                    'void _wm_save_callback();'
                );
                registerPreprocessor('#define WM_SAVE_CB _wm_save_callback');
                return { parts: [] };
            }
        },

        // ─── Begin (autoConnect) ─────────────────────────────────────────
        {
            id: 'wm_begin',
            name: 'WiFiManager Begin',
            color: COLOR,
            icon: '🔌',
            category: 'WiFiManager',
            description: 'เชื่อมต่อ WiFi อัตโนมัติจากค่าที่บันทึกไว้\nหากยังไม่มีค่า หรือเชื่อมต่อไม่ได้ จะเปิด Config Portal (AP mode) ให้ผู้ใช้ตั้งค่า\n\nต้องวางหลัง WiFiManager On AP Mode / On Save (ถ้ามี)',
            inputs:  [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [
                { id: 'connected',    type: 'output', label: 'Connected',    dataType: 'void', description: 'เชื่อมต่อสำเร็จ' },
                { id: 'failed',       type: 'output', label: 'Failed',       dataType: 'void', description: 'เชื่อมต่อไม่สำเร็จ' },
                { id: 'out',          type: 'output', label: '➜',            dataType: 'void' },
            ],
            params: [
                { id: 'ap_name',         type: 'text',   label: 'AP Name',             default: 'ESP32-Config', description: 'ชื่อ Wi-Fi AP ที่จะเปิดเมื่อไม่มีค่า WiFi บันทึกไว้' },
                { id: 'ap_password',     type: 'text',   label: 'AP Password',          default: '',            description: 'รหัสผ่าน AP (ว่าง = ไม่มีรหัสผ่าน)' },
                {
                    id: 'connect_timeout', type: 'number', label: 'Connect Timeout (s)', default: '30',
                    description: 'ระยะเวลาสูงสุดในการรอเชื่อมต่อ WiFi (วินาที)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal }) {
                registerWm(registerPreprocessor, registerGlobal);

                const apName  = (params.ap_name     ?? 'ESP32-Config').replaceAll('"', '\\"');
                const apPass  = (params.ap_password ?? '').replaceAll('"', '\\"');
                const timeout = params.connect_timeout ?? '30';

                const connectCall = apPass
                    ? `_wm.autoConnect("${apName}", "${apPass}")`
                    : `_wm.autoConnect("${apName}")`;

                return {
                    parts: [
                        ['#ifdef WM_AP_CB', `${pad}_wm.setAPCallback(WM_AP_CB);`, '#endif'],
                        ['#ifdef WM_SAVE_CB', `${pad}_wm.setSaveConfigCallback(WM_SAVE_CB);`, '#endif'],
                        [`${pad}_wm.setConnectTimeout(${timeout});`],
                        [`${pad}if (${connectCall}) {`],
                        { portId: 'connected', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'failed', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Start Portal ────────────────────────────────────────────────
        {
            id: 'wm_start_portal',
            name: 'WiFiManager Start Portal',
            color: COLOR,
            icon: '🌐',
            category: 'WiFiManager',
            description: 'บังคับเปิด Config Portal ทันที (blocking)\nผู้ใช้สามารถตั้งค่า WiFi ผ่านหน้าเว็บที่ IP: 192.168.4.1',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                { id: 'ap_name',        type: 'text',   label: 'AP Name',            default: 'ESP32-Config' },
                { id: 'ap_password',    type: 'text',   label: 'AP Password',         default: '',           description: 'ว่าง = ไม่มีรหัสผ่าน' },
                {
                    id: 'portal_timeout', type: 'number', label: 'Portal Timeout (s)',  default: '0',
                    description: '0 = ค้างไว้ไม่มีกำหนด',
                    validation: (n: number) => Math.max(0, Math.round(n)),
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal }) {
                registerWm(registerPreprocessor, registerGlobal);

                const apName  = (params.ap_name     ?? 'ESP32-Config').replaceAll('"', '\\"');
                const apPass  = (params.ap_password ?? '').replaceAll('"', '\\"');
                const timeout = params.portal_timeout ?? '0';

                const portalCall = apPass
                    ? `_wm.startConfigPortal("${apName}", "${apPass}")`
                    : `_wm.startConfigPortal("${apName}")`;

                const lines: string[] = [];
                if (timeout !== '0') lines.push(`${pad}_wm.setConfigPortalTimeout(${timeout});`);
                lines.push(`${pad}${portalCall};`);

                return {
                    parts: [
                        ['#ifdef WM_AP_CB', `${pad}_wm.setAPCallback(WM_AP_CB);`, '#endif'],
                        ['#ifdef WM_SAVE_CB', `${pad}_wm.setSaveConfigCallback(WM_SAVE_CB);`, '#endif'],
                        lines,
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Reset Settings ──────────────────────────────────────────────
        {
            id: 'wm_reset',
            name: 'WiFiManager Reset',
            color: COLOR,
            icon: '🗑️',
            category: 'WiFiManager',
            description: 'ล้างค่า WiFi SSID/Password ที่บันทึกไว้ทั้งหมด\n(ESP32 จะเปิด Config Portal ในครั้งถัดไป)',
            inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ pad, registerPreprocessor, registerGlobal }) {
                registerWm(registerPreprocessor, registerGlobal);
                return {
                    parts: [
                        [`${pad}_wm.resetSettings();`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default wifiManagerExtension;
