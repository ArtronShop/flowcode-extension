import type { BlockCategory } from '../types.js';

const COLOR = '#f59e0b';

const atsco2Extension: BlockCategory = {
    id: 'ats-co2',
    name: 'ATS-CO2',
    blocks: [
        {
            id: 'ats-co2-read',
            name: 'ATS-CO2 Read',
            color: COLOR,
            icon: '🌡️',
            category: 'ATS-CO2',
            description: 'อ่านค่าอุณหภูมิและความชื้นจากเซ็นเซอร์ ATS-TH',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกก่อนหน้า' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'float', description: 'ค่าที่ได้จากเซ็นเซอร์' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'บล็อกที่ต้องการให้ทำงานเมื่ออ่านค่าไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกถัดไป' }
            ],
            params: [
                { id: 'id', label: 'ID', description: 'หมายเลขอุปกรณ์', type: 'number', validation: n => Math.max(0, Math.min(n, 255)), default: '1' },
                {
                    id: 'value_type', label: 'Value', description: 'ค่าที่ต้องการอ่าน (อุณหภูมิ / ความชื้น)', type: 'option', options: [
                        { label: 'CO2 (ppm)', value: 'co2' },
                        { label: 'Temperature (°C)', value: 't' },
                        { label: 'Humidity (%RH)', value: 'h' },
                    ]
                }
            ],
            toCode({ pad, block, registerFunction, safeId, params }) {
                const id = safeId(block.id);
                const device_id = params.id ?? '1';
                const value_type = params.value_type ?? 't';

                registerFunction(
                    `bool readATS_CO2_id${device_id}(float * t, float * h, float * c)`,
                    [
                        '  static float co2 = 0.0;',
                        '  static float temp = 0.0;',
                        '  static float humi = 0.0;',
                        '  static uint8_t result;',
                        '  ',
                        '  static uint32_t last_measure = 0;',
                        '  if ((last_measure == 0) || ((millis() - last_measure) >= (100)) || (millis() < last_measure)) {',
                        '    last_measure = millis();',
                        `    modbus.begin(${device_id}, *modbus_serial);`,
                        '    result = modbus.readInputRegisters(1, 3);',
                        '    if (result == modbus.ku8MBSuccess) {',
                        '      temp = modbus.getResponseBuffer(0) / 10.0f;',
                        '      humi = modbus.getResponseBuffer(1) / 10.0f;',
                        '      co2 = modbus.getResponseBuffer(2);',
                        '    }',
                        '  }',
                        '  if (result == modbus.ku8MBSuccess) {',
                        '    if (t) {',
                        '      *t = temp;',
                        '    }',
                        '    if (h) {',
                        '      *h = humi;',
                        '    }',
                        '    if (c) {',
                        '      *c = co2;',
                        '    }',
                        '  }',
                        '  ',
                        '  return result == modbus.ku8MBSuccess;'
                    ].join('\n'),
                    `bool readATS_CO2_id${device_id}(float * t, float * h, float * c) ;`,
                )

                return {
                    parts: [
                        [`${pad}float ${id} = 0;`],
                        [`${pad}if (readATS_CO2_id${device_id}(${value_type === 't' ? `&${id}, NULL, NULL` : value_type === 'h' ? `NULL, &${id}, NULL` : `NULL, NULL, &${id}`})) {`],
						{ portId: 'value', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'error', depthDelta: 1 },
						[`${pad}}`]
                    ]
                };
            }
        },
    ]
}

export default atsco2Extension;
