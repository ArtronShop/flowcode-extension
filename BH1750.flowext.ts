import type { BlockCategory, CodeGenContext } from '../types.js';

const COLOR = '#f59e0b'; // amber

function bh1750Register(
	registerPreprocessor: CodeGenContext['registerPreprocessor'],
	registerGlobal: CodeGenContext['registerGlobal'],
	registerFunction: CodeGenContext['registerFunction'],
	addr: string,
) {
	registerPreprocessor('#include <Wire.h>');
	registerPreprocessor('#include <ArtronShop_BH1750.h>');

	registerGlobal(`ArtronShop_BH1750 _bh1750(${addr});`);

	registerFunction(
		'bool bh1750_read(float *lux)',
		[
			'  static bool init = false;',
			'  if (!init) {',
			'    if (!_bh1750.begin()) return false;',
			'    init = true;',
			'  }',
			'  float light = _bh1750.light();',
			'  if (lux) *lux = light;',
			'  return light >= 0;',
		].join('\n'),
		'bool bh1750_read(float *lux);'
	);
}

const bh1750Extension: BlockCategory = {
	id: 'bh1750',
	name: 'BH1750',
	blocks: [
		{
			id: 'bh1750_read',
			name: 'BH1750 Read',
			color: COLOR,
			icon: '💡',
			category: 'BH1750',
			description: 'อ่านค่าความสว่าง (lux) จากเซ็นเซอร์ BH1750 ผ่าน I2C\nต้องเรียก Wire.begin() ก่อนหรือตั้ง I2C ให้เรียบร้อยก่อน',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'value', type: 'output', label: 'Lux', dataType: 'float', description: 'ค่าความสว่างที่อ่านได้ (lux)' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่อ sensor ไม่พบหรืออ่านไม่ได้' },
			],
			params: [
				{
					id: 'address', type: 'option', label: 'I2C Address',
					options: [
						{ label: '0x23 (ADDR = LOW)', value: '0x23' },
						{ label: '0x5C (ADDR = HIGH)', value: '0x5C' },
					],
					description: 'I2C address ของ BH1750 ขึ้นอยู่กับสถานะขา ADDR',
				},
			],
			toCode({ block, pad, safeId, params, registerPreprocessor, registerGlobal, registerFunction }) {
				const addr = params.address ?? '0x23';
				bh1750Register(registerPreprocessor, registerGlobal, registerFunction, addr);

				const id = safeId(block.id);

				return {
					parts: [
						[`${pad}float ${id} = 0;`],
						[`${pad}if (bh1750_read(&${id})) {`],
						{ portId: 'value', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'error', depthDelta: 1 },
						[`${pad}}`],
					]
				};
			}
		},
	]
};

export default bh1750Extension;
