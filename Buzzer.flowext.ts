import type { BlockCategory } from '../types.js';

const COLOR = '#7c3aed'; // violet

const buzzerExtension: BlockCategory = {
	id: 'buzzer',
	name: 'Buzzer',
	blocks: [
		// ─── Tone ────────────────────────────────────────────────────────────
		{
			id: 'buzzer_tone',
			name: 'Tone',
			color: COLOR,
			icon: '🔊',
			category: 'Buzzer',
			description: 'เล่นเสียงที่ความถี่ที่กำหนดออก Buzzer (tone)\nถ้า Duration = 0 จะเล่นไปเรื่อย ๆ จนกว่าจะเรียก No Tone',
			inputs: [
				{ id: 'in',        type: 'input', label: '➜',        dataType: 'any'   },
				{ id: 'frequency', type: 'input', label: 'Frequency', dataType: 'int',  description: 'ความถี่ Hz' },
				{ id: 'duration',  type: 'input', label: 'Duration',  dataType: 'long', description: 'ระยะเวลา ms (0 = ไม่หยุด)' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'pin', type: 'number', label: 'Pin', default: '4',
					description: 'GPIO pin ที่ต่อ Buzzer',
					validation: (n: number) => Math.trunc(n),
				},
				{
					id: 'frequency', type: 'number', label: 'Frequency (Hz)', default: '1000',
					description: 'ความถี่ fallback (Hz) เช่น 261=C4, 440=A4, 1000=1kHz',
					validation: (n: number) => Math.max(0, Math.trunc(n)),
				},
				{
					id: 'duration', type: 'number', label: 'Duration (ms)', default: '500',
					description: 'ระยะเวลา fallback (ms), 0 = เล่นต่อเนื่อง',
					validation: (n: number) => Math.max(0, Math.trunc(n)),
				},
			],
			toCode({ pad, params, resolveInput }) {
				const pin  = params.pin       ?? '4';
				const freq = resolveInput('frequency') ?? params.frequency ?? '1000';
				const dur  = resolveInput('duration')  ?? params.duration  ?? '500';
				const line = String(dur) === '0'
					? `${pad}tone(${pin}, ${freq});`
					: `${pad}tone(${pin}, ${freq}, ${dur});`;
				return {
					parts: [
						[line],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── No Tone ─────────────────────────────────────────────────────────
		{
			id: 'buzzer_no_tone',
			name: 'No Tone',
			color: COLOR,
			icon: '🔇',
			category: 'Buzzer',
			description: 'หยุดเล่นเสียง Buzzer (noTone)',
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'pin', type: 'number', label: 'Pin', default: '4',
					validation: (n: number) => Math.trunc(n),
				},
			],
			toCode({ pad, params }) {
				const pin = params.pin ?? '4';
				return {
					parts: [
						[`${pad}noTone(${pin});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default buzzerExtension;
