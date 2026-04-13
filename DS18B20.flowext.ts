import type { BlockCategory } from '../types.js';

const COLOR = '#f97316'; // orange

const ds18b20Extension: BlockCategory = {
	id: 'ds18b20',
	name: 'DS18B20',
	blocks: [
		{
			id: 'ds18b20_read',
			name: 'DS18B20 Read',
			color: COLOR,
			icon: '🌡️',
			category: 'DS18B20',
			description: 'อ่านค่าอุณหภูมิจากเซ็นเซอร์ DS18B20 ผ่าน OneWire\nรองรับหลายตัวบน bus เดียวกันโดยเลือก Sensor Index',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'value', type: 'output', label: 'Temp (°C)', dataType: 'float', description: 'อุณหภูมิเป็นองศาเซลเซียส' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่อ sensor หลุดหรืออ่านไม่ได้' },
			],
			params: [
				{
					id: 'pin', type: 'number', label: 'Data Pin', default: '4',
					description: 'GPIO pin ที่ต่อสาย DATA ของ DS18B20',
					validation: (n: number) => Math.trunc(n),
				},
				{
					id: 'index', type: 'number', label: 'Sensor Index', default: '0',
					description: 'ลำดับ sensor บน bus (0 = ตัวแรก)',
					validation: (n: number) => Math.max(0, Math.trunc(n)),
				},
			],
			toCode({ block, pad, safeId, params, registerPreprocessor, registerGlobal, registerFunction }) {
				registerPreprocessor('#include <OneWire.h>');
				registerPreprocessor('#include <DallasTemperature.h>');

				const id = safeId(block.id);
				const pin = params.pin ?? '4';
				const idx = params.index ?? '0';

				registerGlobal(`OneWire _ow_p${pin}(${pin});`);
				registerGlobal(`DallasTemperature _ds18b20_p${pin}(&_ow_p${pin});`);

				registerFunction(
					`float ds18b20_read_p${pin}(int index)`,
					[
						`  static bool init = false;`,
						`  if (!init) {`,
						`    _ds18b20_p${pin}.begin();`,
						`    init = true;`,
						`  }`,
						`  _ds18b20_p${pin}.requestTemperatures();`,
						`  return _ds18b20_p${pin}.getTempCByIndex(index);`,
					].join('\n'),
					`float ds18b20_read_p${pin}(int index) ;`
				);

				return {
					parts: [
						[`${pad}float ${id} = ds18b20_read_p${pin}(${idx});`],
						[`${pad}if (${id} != DEVICE_DISCONNECTED_C) {`],
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

export default ds18b20Extension;
