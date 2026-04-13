import type { BlockCategory } from '../types.js';

const COLOR = '#0284c7'; // sky-blue

const otaExtension: BlockCategory = {
	id: 'ota',
	name: 'OTA Update',
	blocks: [
		// ─── Begin ───────────────────────────────────────────────────────────
		{
			id: 'ota_begin',
			name: 'OTA Begin',
			color: COLOR,
			icon: '⬆️',
			category: 'OTA',
			description: 'เริ่มต้น OTA Update ผ่าน WiFi (ArduinoOTA)\nต้องเรียกหลังเชื่อมต่อ WiFi แล้ว\nอัปโหลด firmware ใหม่ผ่าน Arduino IDE หรือ PlatformIO',
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'hostname', type: 'text',   label: 'Hostname', default: 'esp32-ota',  description: 'ชื่อที่แสดงใน Arduino IDE' },
				{ id: 'password', type: 'text',   label: 'Password', default: '',           description: 'รหัสผ่าน OTA (ว่าง = ไม่ต้องใส่)' },
				{
					id: 'port', type: 'number', label: 'Port', default: '3232',
					description: 'Port OTA (default 3232)',
					validation: (n: number) => Math.trunc(n),
				},
			],
			toCode({ pad, params, registerPreprocessor, registerPollingCode }) {
				registerPreprocessor('#include <ArduinoOTA.h>');
				const hostname = (params.hostname ?? 'esp32-ota').replaceAll('"', '\\"');
				const password = (params.password ?? '').replaceAll('"', '\\"');
				const port     = params.port ?? '3232';

				registerPollingCode('ArduinoOTA.handle();');

				const lines: string[] = [
					`${pad}ArduinoOTA.setHostname("${hostname}");`,
					`${pad}ArduinoOTA.setPort(${port});`,
				];
				if (password) {
					lines.push(`${pad}ArduinoOTA.setPassword("${password}");`);
				}
				lines.push(
					`${pad}ArduinoOTA.begin();`,
				);
				return {
					parts: [
						lines,
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── On Start ────────────────────────────────────────────────────────
		{
			id: 'ota_on_start',
			name: 'OTA On Start',
			trigger: true,
			color: COLOR,
			icon: '▶️',
			category: 'OTA',
			description: 'เรียกเมื่อเริ่ม OTA update — ใช้แสดงสถานะหรือ prep ก่อน flash',
			inputs:  [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <ArduinoOTA.h>');
				const body = captureCode('out', 1);
				registerFunction(
					'void _ota_on_start()',
					body,
					'void _ota_on_start();'
				);
				return {
					parts: [
						[`  ArduinoOTA.onStart(_ota_on_start);`],
					]
				};
			}
		},

		// ─── On End ──────────────────────────────────────────────────────────
		{
			id: 'ota_on_end',
			name: 'OTA On End',
			trigger: true,
			color: COLOR,
			icon: '✅',
			category: 'OTA',
			description: 'เรียกเมื่อ OTA update เสร็จสิ้น — ก่อน ESP32 restart',
			inputs:  [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <ArduinoOTA.h>');
				const body = captureCode('out', 1);
				registerFunction(
					'void _ota_on_end()',
					body,
					'void _ota_on_end();'
				);
				return {
					parts: [
						[`  ArduinoOTA.onEnd(_ota_on_end);`],
					]
				};
			}
		},

		// ─── On Progress ─────────────────────────────────────────────────────
		{
			id: 'ota_on_progress',
			name: 'OTA On Progress',
			trigger: true,
			color: COLOR,
			icon: '📊',
			category: 'OTA',
			description: 'เรียกระหว่าง OTA update — ให้ค่า _ota_progress (%) สำหรับแสดง progress bar',
			inputs:  [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ captureCode, registerPreprocessor, registerFunction, registerGlobal }) {
				registerPreprocessor('#include <ArduinoOTA.h>');
				registerGlobal('int _ota_progress = 0;');
				const body = captureCode('out', 1);
				registerFunction(
					'void _ota_on_progress(unsigned int progress, unsigned int total)',
					[
						`  _ota_progress = (int)(progress * 100 / total);`,
						body,
					].filter(Boolean).join('\n'),
					'void _ota_on_progress(unsigned int, unsigned int);'
				);
				return {
					parts: [
						[`  ArduinoOTA.onProgress(_ota_on_progress);`],
					]
				};
			}
		},

		// ─── Progress Value ───────────────────────────────────────────────────
		{
			id: 'ota_progress',
			name: 'OTA Progress',
			color: COLOR,
			icon: '📈',
			category: 'OTA',
			description: 'ค่า progress OTA ปัจจุบัน (_ota_progress) 0–100%\nใช้ภายใน OTA On Progress เท่านั้น',
			inputs:  [],
			outputs: [{ id: 'value', type: 'output', label: 'Progress (%)', dataType: 'int' }],
			toExpr: () => '_ota_progress',
			toCode() { return { parts: [] }; }
		},
	]
};

export default otaExtension;
