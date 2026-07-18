import type { BlockCategory, CodeGenContext } from '../types.js';

const COLOR = '#22c55e';

function scd4xRegister(
	registerPreprocessor: CodeGenContext['registerPreprocessor'],
	registerGlobal: CodeGenContext['registerGlobal'],
	registerFunction: CodeGenContext['registerFunction'],
) {
	registerPreprocessor('#include <Wire.h>');
	registerPreprocessor('#include <SparkFun_SCD4x_Arduino_Library.h>');

	registerGlobal('SCD4x _scd4x;');

	registerFunction(
		'bool scd4x_read(float *co2, float *t, float *h)',
		[
			'  static bool init = false;',
			'  if (!init) {',
			'    Wire.begin();',
			'    if (!_scd4x.begin()) {',
			'      return false;',
			'    }',
			'    init = true;',
			'  }',
			'  static float _co2 = 0, _t = 0, _h = 0;',
			'  static bool hasData = false;',
			'  static uint32_t last_measure = 0;',
			'  static uint8_t fail_count = 0;',
			'  if ((last_measure == 0) || ((millis() - last_measure) >= 5000) || (millis() < last_measure)) {',
			'    last_measure = millis();',
			'    if (_scd4x.readMeasurement()) {',
			'      _co2 = (float)_scd4x.getCO2();',
			'      _t   = _scd4x.getTemperature();',
			'      _h   = _scd4x.getHumidity();',
			'      hasData = true;',
			'      fail_count = 0;',
			'    } else {',
			'      if (++fail_count >= 3) {',
			'        init = false;',
			'        hasData = false;',
			'        fail_count = 0;',
			'        return false;',
			'      }',
			'    }',
			'  }',
			'  if (!hasData) return false;',
			'  if (co2) *co2 = _co2;',
			'  if (t)   *t   = _t;',
			'  if (h)   *h   = _h;',
			'  return true;',
		].join('\n'),
		'bool scd4x_read(float *co2, float *t, float *h);'
	);
}

const scd4xExtension: BlockCategory = {
	id: 'scd4x',
	name: 'SCD4x',
	blocks: [
		{
			id: 'scd4x_read',
			name: 'SCD4x Read',
			color: COLOR,
			icon: '🌿',
			category: 'SCD4x',
			description: 'อ่านค่า CO2, อุณหภูมิ และความชื้นจากเซ็นเซอร์ SCD40 / SCD41 ผ่าน I2C\nSensor จะมีค่าใหม่ทุก 5 วินาที (periodic measurement mode)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'value', type: 'output', label: 'Value', dataType: 'float', description: 'ค่าที่อ่านได้' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่อ sensor ไม่พบหรือข้อมูลยังไม่พร้อม' },
			],
			params: [
				{
					id: 'value_type', type: 'option', label: 'Value',
					options: [
						{ label: 'CO2 (ppm)', value: 'co2' },
						{ label: 'Temperature (°C)', value: 't' },
						{ label: 'Humidity (%RH)', value: 'h' },
					],
					description: 'ค่าที่ต้องการอ่านจาก SCD4x',
				},
			],
			toCode({ block, pad, safeId, params, registerPreprocessor, registerGlobal, registerFunction }) {
				scd4xRegister(registerPreprocessor, registerGlobal, registerFunction);

				const id = safeId(block.id);
				const vt = params.value_type ?? 'co2';
				const co2Arg = vt === 'co2' ? `&${id}` : 'NULL';
				const tArg   = vt === 't'   ? `&${id}` : 'NULL';
				const hArg   = vt === 'h'   ? `&${id}` : 'NULL';

				return {
					parts: [
						[`${pad}float ${id} = 0;`],
						[`${pad}if (scd4x_read(${co2Arg}, ${tArg}, ${hArg})) {`],
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

export default scd4xExtension;
