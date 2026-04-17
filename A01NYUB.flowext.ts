import type { BlockCategory } from '../types.js';

const COLOR = '#06b6d4'; // cyan

const a01nyubExtension: BlockCategory = {
    id: 'a01nyub',
    name: 'A01NYUB',
    blocks: [
        {
            id: 'a01nyub-read',
            name: 'A01NYUB Read',
            color: COLOR,
            icon: '📡',
            category: 'A01NYUB',
            description: 'อ่านค่าระยะทาง (mm) จากเซ็นเซอร์อัลตราโซนิกกันน้ำ A01NYUB ผ่าน Modbus RTU\nต้องใช้ร่วมกับ ModbusMaster Extension',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกก่อนหน้า' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Distance (mm)', dataType: 'int', description: 'ระยะทางที่วัดได้ หน่วย mm' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่ออ่านค่าไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกถัดไป' },
            ],
            params: [
                { id: 'id', label: 'ID', description: 'Modbus Device ID ของเซ็นเซอร์', type: 'number', validation: n => Math.max(1, Math.min(n, 247)), default: '1' },
            ],
            toCode({ pad, block, registerFunction, safeId, params }) {
                const id = safeId(block.id);
                const device_id = params.id ?? '1';

                registerFunction(
                    `bool readA01NYUB_id${device_id}(int *dist)`,
                    [
                        '  static int _dist = 0;',
                        '  static uint8_t result = 0xFF;',
                        '  ',
                        '  static uint32_t last_measure = 0;',
                        '  if ((last_measure == 0) || ((millis() - last_measure) >= 100) || (millis() < last_measure)) {',
                        '    last_measure = millis();',
                        `    modbus.begin(${device_id}, *modbus_serial);`,
                        '    result = modbus.readHoldingRegisters(0x0100, 1);',
                        '    if (result == modbus.ku8MBSuccess) {',
                        '      _dist = (int)modbus.getResponseBuffer(0);',
                        '    }',
                        '  }',
                        '  if (result == modbus.ku8MBSuccess) {',
                        '    if (dist) *dist = _dist;',
                        '  }',
                        '  ',
                        '  return result == modbus.ku8MBSuccess;',
                    ].join('\n'),
                    `bool readA01NYUB_id${device_id}(int *dist);`,
                );

                return {
                    parts: [
                        [`${pad}int ${id} = 0;`],
                        [`${pad}if (readA01NYUB_id${device_id}(&${id})) {`],
                        { portId: 'value', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'error', depthDelta: 1 },
                        [`${pad}}`],
                    ],
                };
            },
        },
    ],
};

export default a01nyubExtension;
