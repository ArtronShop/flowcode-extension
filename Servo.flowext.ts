import type { BlockCategory, ParamVarname } from '../types.js';

const COLOR = '#f59e0b'; // amber

const servoExtension: BlockCategory = {
	id: 'servo',
	name: 'Servo',
	blocks: [
		{
			id: 'servo_write',
			name: 'Servo Write',
			color: COLOR,
			icon: '🔄',
			category: 'Servo',
			description: 'สั่งให้ Servo หมุนไปที่มุมที่กำหนด 0–180 องศา (servo.write)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'pin', type: 'input', label: 'Pin', dataType: 'int', description: 'GPIO pin' },
				{ id: 'angle', type: 'input', label: 'Angle', dataType: 'int', description: 'มุม 0–180 องศา' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'pin', type: 'number', label: 'Pin', default: '13',
					description: 'GPIO pin ที่ต่อสาย Signal ของ Servo',
					validation: (n: number) => Math.trunc(n),
				},
				{
					id: 'angle', type: 'number', label: 'Angle', default: '90',
					description: 'มุม fallback เมื่อไม่มีสายต่อเข้า (0-200)',
					validation: (n: number) => Math.max(0, Math.min(200, Math.trunc(n))),
				},
			],
			toCode({ pad, params, resolveInput, registerPreprocessor, registerGlobal, registerFunction }) {
				const pin = resolveInput('pin') ?? params.pin ?? '4';
				const angle = resolveInput('angle') ?? params.angle ?? '90';

				const varName = `_servo_p${pin}`;

				registerPreprocessor('#include <ESP32Servo.h>');
				registerGlobal(`Servo ${varName};`);
				registerFunction(
					'void servo_write(Servo *s, int pin, int angle)',
					[
						'  if (angle >= 0) {',
						'    if (!s->attached()) {',
						`      s->attach(pin, 500, 2500);`,
						'    }',
						`    s->write(${angle});`,
						'  } else {',
						'    if (s->attached()) {',
						'      s->detach();',
						'    }',
						'  }',
					].join('\n'),
					'void servo_write(Servo *s, int pin, int angle) ;'
				);
				
				return {
					parts: [
						[`${pad}servo_write(&${varName}, ${pin}, ${angle});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default servoExtension;
