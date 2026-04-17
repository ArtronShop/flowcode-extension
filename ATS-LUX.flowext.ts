import type { BlockCategory } from '../types.js';

const COLOR = '#f59e0b';

const atsluxExtension: BlockCategory = {
    id: 'ats-lux',
    name: 'ATS-LUX',
    blocks: [
        {
            id: 'ats-lux-read',
            name: 'ATS-LUX Read',
            color: COLOR,
            icon: '🌡️',
            category: 'ATS-LUX',
            description: 'อ่านค่าความเข้มแสงเซ็นเซอร์ ATS-LUX (หน่วย lux)',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกก่อนหน้า' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'float', description: 'ค่าที่ได้จากเซ็นเซอร์' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'บล็อกที่ต้องการให้ทำงานเมื่ออ่านค่าไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกถัดไป' }
            ],
            params: [
                { id: 'id', label: 'ID', description: 'หมายเลขอุปกรณ์', type: 'number', validation: n => Math.max(0, Math.min(n, 255)), default: '1' },
            ],
            toCode({ pad, block, registerFunction, safeId, params }) {
                const id = safeId(block.id);
                const device_id = params.id ?? '1';

                registerFunction(
                    `bool readATS_LUX_id${device_id}(float * value)`,
                    [
                        '  static unsigned long lightLUX = 0.0;',
                        '  static uint8_t result;',
                        '  ',
                        '  static uint32_t last_measure = 0;',
                        '  if ((last_measure == 0) || ((millis() - last_measure) >= (100)) || (millis() < last_measure)) {',
                        '    last_measure = millis();',
                        `    modbus.begin(${device_id}, *modbus_serial);`,
                        '    result = modbus.readInputRegisters(1, 2);',
                        '    if (result == modbus.ku8MBSuccess) {',
                        '      lightLUX = (uint32_t)((modbus.getResponseBuffer(1) << 16) | modbus.getResponseBuffer(0));',
                        '    }',
                        '  }',
                        '  if (result == modbus.ku8MBSuccess) {',
                        '    if (value) {',
                        '      *value = lightLUX;',
                        '    }',
                        '  }',
                        '  ',
                        '  return result == modbus.ku8MBSuccess;'
                    ].join('\n'),
                    `bool readATS_LUX_id${device_id}(float * value) ;`,
                )

                return {
                    parts: [
                        [`${pad}float ${id} = 0;`],
                        [`${pad}if (readATS_LUX_id${device_id}(&${id})) {`],
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

export default atsluxExtension;
