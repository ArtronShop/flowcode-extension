import type { BlockCategory, CodeGenContext } from '../types.js';

function ModbusMasterRegistor(
    registerPreprocessor: CodeGenContext['registerPreprocessor'], 
    registerGlobal: CodeGenContext['registerGlobal'], 
    registerFunction: CodeGenContext['registerFunction']
) {
    registerPreprocessor('#include <ModbusMaster.h>');
    
    registerGlobal('ModbusMaster node;');

    registerGlobal('int RS485_TX_PIN = -1;');
    registerGlobal('int RS485_RX_PIN = -1;');
    registerGlobal('int RS485_DIR_PIN = -1;');

    registerFunction(
        'void preTransmission()',
        '  digitalWrite(RS485_DIR_PIN, HIGH);',
        'void preTransmission() ;'
    );

    registerFunction(
        'void postTransmission()',
        '  digitalWrite(RS485_DIR_PIN, LOW);',
        'void postTransmission() ;'
    );

    registerFunction(
        'void modbus_master_init(int id)',
`  pinMode(RS485_DIR_PIN, OUTPUT);
  digitalWrite(RS485_DIR_PIN, LOW);

  // Modbus communication runs at 9600 baud
  Serial2.begin(9600, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN); // Rx, Tx

  // Modbus slave ID
  node.begin(id, Serial2);
  
  // Callbacks allow us to configure the RS485 transceiver correctly
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);`,
        'void modbus_master_init() ;'
    );
}

const xymd02Extension: BlockCategory = {
    id: 'xy-md02',
    name: 'XY-MD02',
    blocks: [
        {
            id: 'xy-md02-read',
            name: 'XY-MD02 Read',
            color: '#3b82f6',
            icon: '🌡️',
            category: 'XY-MD02',
            description: 'อ่านค่าอุณหภูมิและความชื้นจากเซ็นเซอร์ XY-MD02',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกก่อนหน้า' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'float', description: 'ค่าที่ได้จากเซ็นเซอร์' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'บล็อกที่ต้องการให้ทำงานเมื่ออ่านค่าไม่ได้' }
            ],
            params: [
                { id: 'id', label: 'ID', description: 'หมายเลขอุปกรณ์', type: 'number', validation: n => Math.max(0, Math.min(n, 255)), default: '1' },
                { id: 'value_type', label: 'Value', description: 'ค่าที่ต้องการอ่าน (อุณหภูมิ / ความชื้น)', type: 'option', options: [
                    { label: 'Temperature (°C)', value: 't' },
                    { label: 'Humidity (%RH)', value: 'h' },
                ]}
            ],
            toCode({ pad, block, registerPreprocessor, registerGlobal, registerFunction, safeId, params }) {
                ModbusMasterRegistor(registerPreprocessor, registerGlobal, registerFunction);

                const device_id = params.id ?? '1';
                const value_type = params.value_type ?? 't';
                const id = safeId(block.id);
                return { 
                    parts: [
                        [`${pad}modbus_master_init(${device_id});`],
                        [`${pad}uint8_t ${id}_result = node.readInputRegisters(1, 2); // Read 2 registers starting at address 1`],
                        [`${pad}if (${id}_result == node.ku8MBSuccess) {`],
                        [`${pad}  float temp = node.getResponseBuffer(0) / 10.0f;`],
                        [`${pad}  float humi = node.getResponseBuffer(1) / 10.0f;`],
                        [`${pad}  float ${id} = ${value_type === 't' ? 'temp' : 'humi'};`],
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

export default xymd02Extension;
