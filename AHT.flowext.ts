import type { BlockCategory, CodeGenContext } from '../types.js';

const COLOR = '#06b6d4'; // cyan

function ahtRegister(
	registerPreprocessor: CodeGenContext['registerPreprocessor'],
	registerGlobal: CodeGenContext['registerGlobal'],
	registerFunction: CodeGenContext['registerFunction'],
) {
	registerPreprocessor('#include <Wire.h>');
	registerPreprocessor('#include <Adafruit_AHTX0.h>');

	registerGlobal('Adafruit_AHTX0 _aht;');

	registerFunction(
		'bool aht_read(float *t, float *h)',
		[
			'  static bool init = false;',
			'  if (!init) {',
			'    if (!_aht.begin()) return false;',
			'    init = true;',
			'  }',
			'  sensors_event_t _aht_h, _aht_t;',
			'  _aht.getEvent(&_aht_h, &_aht_t);',
			'  if (t) *t = _aht_t.temperature;',
			'  if (h) *h = _aht_h.relative_humidity;',
			'  return true;',
		].join('\n'),
		'bool aht_read(float *t, float *h);'
	);
}

const ahtExtension: BlockCategory = {
	id: 'aht',
	name: 'AHT',
	blocks: [
		{
			id: 'aht_read',
			name: 'AHT Read',
			color: COLOR,
			icon: '💧',
			category: 'AHT',
			description: 'อ่านค่าอุณหภูมิหรือความชื้นจากเซ็นเซอร์ AHT10 / AHT20 / AHT30 ผ่าน I2C\nต้องเรียก Wire.begin() ก่อนหรือตั้ง I2C ให้เรียบร้อยก่อน',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'value', type: 'output', label: 'Value', dataType: 'float', description: 'ค่าที่อ่านได้' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่อ sensor ไม่พบหรืออ่านไม่ได้' },
			],
			params: [
				{
					id: 'sensor_type', type: 'option', label: 'Sensor',
					options: [
						{ label: 'AHT10', value: 'AHT10' },
						{ label: 'AHT20', value: 'AHT20' },
						{ label: 'AHT30', value: 'AHT30' },
					],
					description: 'รุ่น sensor (ใช้ driver เดียวกัน Adafruit_AHTX0)',
				},
				{
					id: 'value_type', type: 'option', label: 'Value',
					options: [
						{ label: 'Temperature (°C)', value: 't' },
						{ label: 'Humidity (%RH)', value: 'h' },
					],
				},
			],
			toCode({ block, pad, safeId, params, registerPreprocessor, registerGlobal, registerFunction }) {
				ahtRegister(registerPreprocessor, registerGlobal, registerFunction);

				const id = safeId(block.id);
				const vt = params.value_type ?? 't';
				const tArg = vt === 't' ? `&${id}, NULL` : `NULL, &${id}`;

				return {
					parts: [
						[`${pad}float ${id} = 0;`],
						[`${pad}if (aht_read(${tArg})) {`],
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

export default ahtExtension;
