import type { BlockCategory } from '../types.js';

const COLOR = '#0891b2'; // cyan-dark

const lowPowerExtension: BlockCategory = {
	id: 'lowpower',
	name: 'Low Power',
	blocks: [
		// ─── Deep Sleep ──────────────────────────────────────────────────────
		{
			id: 'deep_sleep_timer',
			name: 'Deep Sleep',
			color: COLOR,
			icon: '😴',
			category: 'LowPower',
			description: 'เข้าโหมด Deep Sleep แล้วตื่นขึ้นอัตโนมัติตามเวลาที่กำหนด\nหลังตื่น ESP32 จะ restart ใหม่ตั้งแต่ต้น',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'duration', type: 'input', label: 'Duration', dataType: 'long', description: 'ระยะเวลา sleep ตามหน่วยที่เลือก' },
			],
			outputs: [
				// { id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'โค้ดหลังนี้จะไม่ถูกเรียก (ESP32 reset แล้ว)' }
			],
			params: [
				{
					id: 'duration', type: 'number', label: 'Duration', default: '10',
					description: 'ระยะเวลา fallback',
					validation: (n: number) => Math.max(0, n),
				},
				{
					id: 'unit', type: 'option', label: 'Unit',
					options: [
						{ label: 'Seconds (s)', value: 's' },
						{ label: 'Millisecond (ms)', value: 'ms' },
						{ label: 'Minute', value: 'min' },
					],
					default: 's',
				},
			],
			toCode({ pad, params, resolveInput }) {
				const dur = resolveInput('duration') ?? params.duration ?? '10';
				const unit = params.unit ?? 's';
				const multiplierMap: Record<string, string> = {
					s: '1000000ULL',
					ms: '1000ULL',
					min: '60000000ULL',
				};
				const mult = multiplierMap[unit] ?? '1000000ULL';
				return {
					parts: [
						[
							`${pad}esp_sleep_enable_timer_wakeup((uint64_t)(${dur}) * ${mult});`,
							`${pad}esp_deep_sleep_start();`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Deep Sleep (Pin Wakeup) ──────────────────────────────────────────
		{
			id: 'deep_sleep_pin',
			name: 'Deep Sleep (Pin Wakeup)',
			color: COLOR,
			icon: '📌',
			category: 'LowPower',
			description: 'เข้าโหมด Deep Sleep แล้วตื่นเมื่อ GPIO ถูก trigger\nรองรับเฉพาะ RTC GPIO (GPIO 0, 2, 4, 12–15, 25–27, 32–39)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				// { id: 'out', type: 'output', label: '➜', dataType: 'void' }
			],
			params: [
				{
					id: 'pin', type: 'number', label: 'Wakeup Pin', default: '33',
					description: 'RTC GPIO ที่จะใช้ปลุก ESP32',
					validation: (n: number) => Math.trunc(n),
				},
				{
					id: 'level', type: 'option', label: 'Wakeup Level',
					options: [
						{ label: 'HIGH (1)', value: '1' },
						{ label: 'LOW (0)', value: '0' },
					],
					default: '1',
				},
			],
			toCode({ pad, params }) {
				const pin = params.pin ?? '33';
				const level = params.level ?? '1';
				return {
					parts: [
						[
							`${pad}esp_sleep_enable_ext0_wakeup((gpio_num_t) ${pin}, ${level});`,
							`${pad}esp_deep_sleep_start();`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Light Sleep ─────────────────────────────────────────────────────
		{
			id: 'light_sleep',
			name: 'Light Sleep',
			color: COLOR,
			icon: '💤',
			category: 'LowPower',
			description: 'เข้าโหมด Light Sleep ตามเวลาที่กำหนด\nหลังตื่น ESP32 ทำงานต่อจากจุดเดิม (ไม่ reset)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'duration', type: 'input', label: 'Duration', dataType: 'long', description: 'ระยะเวลา sleep (ms)' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'duration', type: 'number', label: 'Duration (ms)', default: '5000',
					validation: (n: number) => Math.max(0, n),
				},
			],
			toCode({ pad, params, resolveInput }) {
				const dur = resolveInput('duration') ?? params.duration ?? '5000';
				return {
					parts: [
						[
							`${pad}esp_sleep_enable_timer_wakeup((uint64_t)(${dur}) * 1000ULL);`,
							`${pad}esp_light_sleep_start();`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Wakeup Reason ───────────────────────────────────────────────────
		{
			id: 'wakeup_reason',
			name: 'Wakeup Reason',
			color: COLOR,
			icon: '⏰',
			category: 'LowPower',
			description: 'ตรวจสอบสาเหตุที่ ESP32 ตื่นจาก Deep Sleep\nใช้ในต้น setup() เพื่อแยก flow ตาม wakeup source',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'timer', type: 'output', label: 'Timer', dataType: 'void', description: 'ตื่นจาก timer' },
				{ id: 'ext_pin', type: 'output', label: 'Ext Pin', dataType: 'void', description: 'ตื่นจาก GPIO pin' },
				{ id: 'other', type: 'output', label: 'Other', dataType: 'void', description: 'Reset ปกติ หรือสาเหตุอื่น' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void' },
			],
			toCode({ pad }) {
				return {
					parts: [
						[`${pad}switch (esp_sleep_get_wakeup_cause()) {`],
						[`${pad}  case ESP_SLEEP_WAKEUP_TIMER: {`],
						{ portId: 'timer', depthDelta: 2 },
						[`${pad}    break; }`],
						[`${pad}  case ESP_SLEEP_WAKEUP_EXT0:`],
						[`${pad}  case ESP_SLEEP_WAKEUP_EXT1: {`],
						{ portId: 'ext_pin', depthDelta: 2 },
						[`${pad}    break; }`],
						[`${pad}  default: {`],
						{ portId: 'other', depthDelta: 2 },
						[`${pad}    break; }`],
						[`${pad}}`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default lowPowerExtension;
