import type { BlockCategory } from '../types.js';

const COLOR = '#00c9a7';

const blynkExtension: BlockCategory = {
	id: 'blynk',
	name: 'Blynk',
	blocks: [
		// ─── Setup ────────────────────────────────────────────────────────
		{
			id: 'blynk_begin',
			name: 'Blynk Begin',
			color: COLOR,
			icon: '🌐',
			category: 'blynk',
			description:
				'เริ่มต้น Blynk และเชื่อมต่อ WiFi พร้อมกัน\n' +
				'Template ID / Template Name ต้องใส่ถ้าใช้ Blynk Cloud 2.0\n' +
				'ถ้าใช้ Blynk Legacy Local Server ให้เว้นว่างไว้',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'template_id',   type: 'text',   label: 'Template ID',   default: '',          description: 'Blynk Cloud 2.0 เท่านั้น (เช่น TMPLxxxxxxxx) — ว่าง = Legacy' },
				{ id: 'template_name', type: 'text',   label: 'Template Name', default: '',          description: 'Blynk Cloud 2.0 เท่านั้น — ว่าง = Legacy' },
				{ id: 'auth',          type: 'text',   label: 'Auth Token',    default: 'YourAuthToken' },
				{ id: 'ssid',          type: 'text',   label: 'WiFi SSID',     default: 'MyWiFi' },
				{ id: 'pass',          type: 'text',   label: 'WiFi Password', default: 'MyPassword' },
				{
					id: 'host', type: 'text', label: 'Server Host', default: 'blynk.cloud',
					description: 'Legacy Local Server: ใส่ IP เครื่อง server ของคุณ'
				},
				{ id: 'port', type: 'number', label: 'Port', default: '80', description: 'Blynk Cloud = 80, Local = 8080' },
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
				const template_id   = (params.template_id   ?? '').trim();
				const template_name = (params.template_name ?? '').trim();
				const auth = (params.auth ?? 'YourAuthToken').replaceAll('"', '\\"');
				const ssid = (params.ssid ?? 'MyWiFi').replaceAll('"', '\\"');
				const pass = (params.pass ?? 'MyPassword').replaceAll('"', '\\"');
				const host = (params.host ?? 'blynk.cloud').replaceAll('"', '\\"');
				const port = params.port ?? '80';

				if (template_id)   registerPreprocessor(`#define BLYNK_TEMPLATE_ID   "${template_id}"`);
				if (template_name) registerPreprocessor(`#define BLYNK_TEMPLATE_NAME "${template_name}"`);
				registerPreprocessor(`#define BLYNK_AUTH_TOKEN "${auth}"`);
				registerPreprocessor('#include <WiFi.h>');
				registerPreprocessor('#include <BlynkSimpleEsp32.h>');

				registerGlobal('char blynk_auth[] = BLYNK_AUTH_TOKEN;');

				registerPollingCode('Blynk.run();');

				return {
					parts: [
						[`${pad}Blynk.begin(blynk_auth, "${ssid}", "${pass}", "${host}", ${port});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Trigger: BLYNK_WRITE ─────────────────────────────────────────
		{
			id: 'blynk_on_write',
			name: 'Blynk On Write',
			color: COLOR,
			icon: '📲',
			category: 'blynk',
			trigger: true,
			description:
				'Handler ที่รันเมื่อ App เขียนค่าไปยัง Virtual Pin (BLYNK_WRITE)\n' +
				'ภายใน handler ใช้บล็อก "Blynk Param" เพื่อรับค่าที่ส่งมา',
			inputs: [],
			outputs: [
				{ id: 'handler', type: 'output', label: '➜', dataType: 'any', description: 'โค้ดที่รันเมื่อ App เขียนค่า' },
			],
			params: [
				{ id: 'pin', type: 'number', label: 'Virtual Pin', default: '0', description: 'V0–V127' },
			],
			toCode({ pad, block, safeId, params, captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <BlynkSimpleEsp32.h>');
				const pin = params.pin ?? '0';
				const body = captureCode('handler', 1);
				// BLYNK_WRITE is a C macro — no forward declaration needed
				registerFunction(
					`BLYNK_WRITE(V${pin})`,
					body || '  // empty handler',
					undefined
				);
				return { parts: [] };
			}
		},

		// ─── Trigger: BLYNK_CONNECTED ─────────────────────────────────────
		{
			id: 'blynk_on_connect',
			name: 'Blynk On Connected',
			color: COLOR,
			icon: '🔗',
			category: 'blynk',
			trigger: true,
			description: 'Handler ที่รันเมื่อ device เชื่อมต่อ Blynk server สำเร็จ (BLYNK_CONNECTED)\nเหมาะสำหรับ syncVirtual เพื่อดึงค่าล่าสุดจาก server',
			inputs: [],
			outputs: [
				{ id: 'handler', type: 'output', label: '➜', dataType: 'any', description: 'โค้ดที่รันเมื่อเชื่อมต่อสำเร็จ' },
			],
			toCode({ pad, captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <BlynkSimpleEsp32.h>');
				const body = captureCode('handler', 1);
				registerFunction(
					`BLYNK_CONNECTED()`,
					body || '  // empty handler',
					undefined
				);
				return { parts: [] };
			}
		},

		// ─── Virtual Write ────────────────────────────────────────────────
		{
			id: 'blynk_virtual_write',
			name: 'Blynk Virtual Write',
			color: COLOR,
			icon: '📤',
			category: 'blynk',
			description: 'ส่งค่าไปยัง Virtual Pin บน Blynk App (Blynk.virtualWrite)\nรองรับ int, float, String',
			inputs: [
				{ id: 'in',    type: 'input', label: '➜',    dataType: 'any',    description: 'รับสายลำดับการทำงาน' },
				{ id: 'value', type: 'input', label: 'Value', dataType: 'any', description: 'ค่าที่จะส่ง (int / float / String)' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'pin',   type: 'number', label: 'Virtual Pin', default: '0',   description: 'V0–V127' },
				{ id: 'value', type: 'text',   label: 'Value',       default: '0',   description: 'ใช้เมื่อไม่มีบล็อกต่อเข้ามา' },
			],
			toCode({ pad, params, resolveInput }) {
				const pin = params.pin ?? '0';
				const valueInput = resolveInput('value');
				const value = valueInput ?? (params.value ?? '0');
				return {
					parts: [
						[`${pad}Blynk.virtualWrite(V${pin}, ${value});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Sync Virtual ─────────────────────────────────────────────────
		{
			id: 'blynk_sync',
			name: 'Blynk Sync Virtual',
			color: COLOR,
			icon: '🔄',
			category: 'blynk',
			description: 'ขอค่าล่าสุดจาก Blynk server สำหรับ Virtual Pin (Blynk.syncVirtual)\nจะ trigger BLYNK_WRITE handler ของ pin นั้น',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'pin', type: 'number', label: 'Virtual Pin', default: '0', description: 'V0–V127' },
			],
			toCode({ pad, params }) {
				const pin = params.pin ?? '0';
				return {
					parts: [
						[`${pad}Blynk.syncVirtual(V${pin});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Is Connected ─────────────────────────────────────────────────
		{
			id: 'blynk_is_connected',
			name: 'Blynk Is Connected',
			color: COLOR,
			icon: '✅',
			category: 'blynk',
			description: 'ตรวจสอบว่าเชื่อมต่อ Blynk server อยู่หรือไม่ (Blynk.connected)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'connected',    type: 'output', label: 'Connected',    dataType: 'void' },
				{ id: 'disconnected', type: 'output', label: 'Disconnected', dataType: 'void' },
				{ id: 'out',          type: 'output', label: '➜',           dataType: 'void' },
			],
			toCode({ pad }) {
				return {
					parts: [
						[`${pad}if (Blynk.connected()) {`],
						{ portId: 'connected', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'disconnected', depthDelta: 1 },
						[`${pad}}`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Param value blocks (ใช้ใน BLYNK_WRITE handler) ──────────────
		{
			id: 'blynk_param_int',
			name: 'Blynk Param (Int)',
			color: COLOR,
			icon: '🔢',
			category: 'blynk',
			description: 'อ่านค่าที่ App ส่งมาเป็น int (param.asInt()) — ใช้ภายใน Blynk On Write เท่านั้น',
			inputs: [],
			outputs: [{ id: 'value', type: 'output', label: 'Int', dataType: 'int' }],
			toExpr: () => 'param.asInt()',
			toCode({ pad, block, safeId }) {
				const id = safeId(block.id);
				return {
					parts: [
						[`${pad}int ${id} = param.asInt();`],
						{ portId: 'value', depthDelta: 0 },
					]
				};
			}
		},
		{
			id: 'blynk_param_float',
			name: 'Blynk Param (Float)',
			color: COLOR,
			icon: '🔣',
			category: 'blynk',
			description: 'อ่านค่าที่ App ส่งมาเป็น float (param.asFloat()) — ใช้ภายใน Blynk On Write เท่านั้น',
			inputs: [],
			outputs: [{ id: 'value', type: 'output', label: 'Float', dataType: 'float' }],
			toExpr: () => 'param.asFloat()',
			toCode({ pad, block, safeId }) {
				const id = safeId(block.id);
				return {
					parts: [
						[`${pad}float ${id} = param.asFloat();`],
						{ portId: 'value', depthDelta: 0 },
					]
				};
			}
		},
		{
			id: 'blynk_param_string',
			name: 'Blynk Param (String)',
			color: COLOR,
			icon: '🔤',
			category: 'blynk',
			description: 'อ่านค่าที่ App ส่งมาเป็น String (param.asStr()) — ใช้ภายใน Blynk On Write เท่านั้น',
			inputs: [],
			outputs: [{ id: 'value', type: 'output', label: 'String', dataType: 'String' }],
			toExpr: () => 'String(param.asStr())',
			toCode({ pad, block, safeId }) {
				const id = safeId(block.id);
				return {
					parts: [
						[`${pad}String ${id} = String(param.asStr());`],
						{ portId: 'value', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default blynkExtension;
