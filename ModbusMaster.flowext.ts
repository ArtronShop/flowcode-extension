import type { BlockCategory, ParamVarname } from '../types.js';

const COLOR = '#f59e0b';

// ─── Serial config string ────────────────────────────────────────────────────
function serialConfig(dataBits: string, parity: string, stopBits: string): string {
    const p = parity === 'E' ? 'E' : parity === 'O' ? 'O' : 'N';
    return `SERIAL_${dataBits}${p}${stopBits}`;
}

// ─── Register common globals/functions per modbus instance ──────────────────
function registerModbusInstance(
    dePin: string,
    registerPreprocessor: (d: string) => void,
    registerGlobal: (d: string) => void,
    registerFunction: (h: string, b: string, decl?: string) => void,
) {
    registerPreprocessor('#include <ModbusMaster.h>');
    registerGlobal(`ModbusMaster modbus;`);
    registerGlobal(`HardwareSerial* modbus_serial = nullptr;`);
    registerGlobal(`int modbus_de_pin = -1;`);

    registerFunction(
        `void modbus_preTx()`,
        `  if (modbus_de_pin >= 0) digitalWrite(modbus_de_pin, HIGH);`,
        `void modbus_preTx();`
    );
    registerFunction(
        `void modbus_postTx()`,
        `  if (modbus_de_pin >= 0) digitalWrite(modbus_de_pin, LOW);`,
        `void modbus_postTx();`
    );
}

const modbusMasterExtension: BlockCategory = {
    id: 'modbus-master',
    name: 'Modbus Master',
    blocks: [

        // ─── Modbus Config ───────────────────────────────────────────────
        {
            id: 'modbus_config',
            name: 'Modbus Config',
            color: COLOR,
            icon: '🔌',
            category: 'Modbus Master',
            description: 'กำหนดค่า Modbus RTU Master: Serial Port, Pin RX/TX/DE, Baud Rate, Frame Format\nใช้ไลบรารี่ ModbusMaster',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'serial_port', label: 'Serial Port', type: 'option',
                    options: [
                        { label: 'Serial1', value: 'Serial1' },
                        { label: 'Serial2', value: 'Serial2' },
                        { label: 'Serial3', value: 'Serial3' },
                    ],
                    default: 'Serial2',
                    description: 'HardwareSerial ที่ใช้ต่อ RS-485',
                },
                {
                    id: 'rx_pin', label: 'RX Pin', type: 'number',
                    default: '16', description: 'GPIO ขา RX',
                    validation: (n: number) => Math.round(n),
                },
                {
                    id: 'tx_pin', label: 'TX Pin', type: 'number',
                    default: '17', description: 'GPIO ขา TX',
                    validation: (n: number) => Math.round(n),
                },
                {
                    id: 'de_pin', label: 'DE/RE Pin', type: 'number',
                    default: '4', description: 'GPIO ขา DE/RE สำหรับควบคุมทิศทาง RS-485 (-1 = ไม่ใช้)',
                    validation: (n: number) => Math.round(n),
                },
                {
                    id: 'baud', label: 'Baud Rate', type: 'option',
                    options: [
                        { label: '1200', value: '1200' },
                        { label: '2400', value: '2400' },
                        { label: '4800', value: '4800' },
                        { label: '9600', value: '9600' },
                        { label: '19200', value: '19200' },
                        { label: '38400', value: '38400' },
                        { label: '57600', value: '57600' },
                        { label: '115200', value: '115200' },
                    ],
                    default: '9600',
                    description: 'ความเร็ว Baud Rate',
                },
                {
                    id: 'data_bits', label: 'Data Bits', type: 'option',
                    options: [
                        { label: '8', value: '8' },
                        { label: '7', value: '7' },
                    ],
                    default: '8',
                },
                {
                    id: 'parity', label: 'Parity', type: 'option',
                    options: [
                        { label: 'None', value: 'N' },
                        { label: 'Even', value: 'E' },
                        { label: 'Odd', value: 'O' },
                    ],
                    default: 'N',
                },
                {
                    id: 'stop_bits', label: 'Stop Bits', type: 'option',
                    options: [
                        { label: '1', value: '1' },
                        { label: '2', value: '2' },
                    ],
                    default: '1',
                },
            ],
            toCode({ pad, block, safeId, params, registerPreprocessor, registerGlobal, registerFunction }) {
                const serialPt = params.serial_port ?? 'Serial2';
                const rxPin = params.rx_pin ?? '16';
                const txPin = params.tx_pin ?? '17';
                const dePin = params.de_pin ?? '-1';
                const baud = params.baud ?? '9600';
                const cfg = serialConfig(params.data_bits ?? '8', params.parity ?? 'N', params.stop_bits ?? '1');

                registerModbusInstance(dePin, registerPreprocessor, registerGlobal, registerFunction);

                return {
                    parts: [
                        [`${pad}modbus_serial = &${serialPt};`],
                        [`${pad}modbus_de_pin = ${dePin};`],
                        [`${pad}if (modbus_de_pin >= 0) { pinMode(modbus_de_pin, OUTPUT); digitalWrite(modbus_de_pin, LOW); }`],
                        [`${pad}modbus_serial->begin(${baud}, ${cfg}, ${rxPin}, ${txPin});`],
                        [`${pad}modbus.preTransmission(modbus_preTx);`],
                        [`${pad}modbus.postTransmission(modbus_postTx);`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Modbus Read ─────────────────────────────────────────────────
        {
            id: 'modbus_read',
            name: 'Modbus Read',
            color: COLOR,
            icon: '📖',
            category: 'Modbus Master',
            description: 'อ่านค่าจาก Modbus Slave\nรองรับ Coils, Discrete Inputs, Input Registers, Holding Registers',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [],
            params: [
                {
                    id: 'slave_id', label: 'Slave ID', type: 'number',
                    default: '1', description: 'หมายเลข Modbus Slave (1-247)',
                    validation: (n: number) => Math.max(1, Math.min(247, Math.round(n))),
                },
                {
                    id: 'register_type', label: 'Register Type', type: 'option',
                    options: [
                        { label: 'Coil', value: 'coil', description: '01 (0x01) Read Coils' },
                        { label: 'Discrete Input', value: 'discrete', description: '02 (0x02) Read Discrete Inputs' },
                        { label: 'Holding Register', value: 'holding', description: '03 (0x03) Read Holding Registers' },
                        { label: 'Input Register', value: 'input', description: '04 (0x03) Read Input Registers' },
                    ],
                    default: 'holding',
                },
                {
                    id: 'address', label: 'Address', type: 'number',
                    default: '0', description: 'ที่อยู่ register (0-indexed)',
                    validation: (n: number) => Math.max(0, Math.round(n)),
                },
                {
                    id: 'data_type', label: 'Data Type', type: 'option',
                    options: [
                        { label: 'Signed', value: 'int16' },
                        { label: 'Unsigned', value: 'uint16' },
                        { label: '32 Bit Signed', value: 'int32' },
                        { label: '32 Bit Unsigned', value: 'uint32' },
                        /*{ label: '64 Bit Signed', value: 'int64' },
                        { label: '64 Bit Unsigned', value: 'uint64' },*/
                        { label: '32 Bit Float', value: 'float' },
                        { label: '64 Bit Double', value: 'double' },
                        { label: 'Binary', value: 'bool' },
                    ],
                    default: 'int16',
                    hidden: ({ params }) => params.register_type === 'coil' || params.register_type === 'discrete',
                },
                {
					id: 'endian', type: 'option', label: 'Endian',
					options: [
						{ label: 'Big-endian', value: 'BE' },
                        { label: 'Big-endian byte swap', value: 'BE-SWAP' },
						{ label: 'Little-endian', value: 'LE' },
                        { label: 'Little-endian byte swap', value: 'LE-SWAP' },
					],
					description: 'ลำดับไบต์ Big-endian / Little-endian / Swap',
                    hidden: ({ params }) => params.register_type === 'coil' || params.register_type === 'discrete' || ['int32', 'uint32', 'float', 'double'].indexOf(params.data_type) < 0
				},
            ],
            dynamicPorts(params) {
                const dataType = ({
                    'int16': 'int',
                    'uint16': 'int',
                    'int32': 'long',
                    'uint32': 'long',
                    'int64': 'int',
                    'uint64': 'int',
                    'float': 'float',
                    'double': 'double',
                    'bool': 'bool',
                })[params.data_type] ?? 'int';
                return {
                    outputs: [
                        { id: 'value', type: 'output', label: 'Value', dataType, description: 'ค่าที่อ่านได้' },
                        { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่ออ่านไม่สำเร็จ' },
                        { id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'ต่อเสมอหลัง if/else' },
                    ]
                }
            },
            toCode({ pad, block, safeId, params, registerPreprocessor, registerGlobal, registerFunction }) {
                const slaveId = params.slave_id ?? '1';
                const regType = params.register_type ?? 'holding';
                const address = params.address ?? '0';
                const rawType = (regType === 'coil' || regType === 'discrete') ? 'bool' : (params.data_type ?? 'int16');
                const id = safeId(block.id);

                // Register shared globals/functions (idempotent via registerGlobal dedup)
                registerModbusInstance('-1', registerPreprocessor, registerGlobal, registerFunction);

                // Number of registers to read
                const isFloat32 = rawType === 'float32';
                const isInt32 = rawType === 'int32';
                const isBool = rawType === 'bool';
                const qty = (isFloat32 || isInt32) ? 2 : 1;

                // Read function call
                let readCall: string;
                if (regType === 'holding') readCall = `modbus.readHoldingRegisters(${address}, ${qty})`;
                else if (regType === 'input') readCall = `modbus.readInputRegisters(${address}, ${qty})`;
                else if (regType === 'coil') readCall = `modbus.readCoils(${address}, 1)`;
                else readCall = `modbus.readDiscreteInputs(${address}, 1)`;

                // Value extraction
                let valueExpr: string;
                if (isFloat32) {
                    valueExpr = [
                        `union { float f; uint16_t u[2]; } ${id}_conv;`,
                        `${id}_conv.u[0] = modbus.getResponseBuffer(0);`,
                        `${id}_conv.u[1] = modbus.getResponseBuffer(1);`,
                        `float ${id} = ${id}_conv.f;`,
                    ].map(l => `${pad}  ${l}`).join('\n');
                } else if (isInt32) {
                    valueExpr = [
                        `int32_t ${id} = (int32_t)((uint32_t)modbus.getResponseBuffer(1) << 16 | modbus.getResponseBuffer(0));`,
                    ].map(l => `${pad}  ${l}`).join('\n');
                } else if (isBool) {
                    valueExpr = `${pad}  bool ${id} = (modbus.getResponseBuffer(0) & 0x01) != 0;`;
                } else if (rawType === 'int16') {
                    valueExpr = `${pad}  int16_t ${id} = (int16_t)modbus.getResponseBuffer(0);`;
                } else {
                    valueExpr = `${pad}  uint16_t ${id} = modbus.getResponseBuffer(0);`;
                }

                return {
                    parts: [
                        [`${pad}modbus.begin(${slaveId}, *modbus_serial);`],
                        [`${pad}uint8_t ${id}_result = ${readCall};`],
                        [`${pad}if (${id}_result == ModbusMaster::ku8MBSuccess) {`],
                        [valueExpr],
                        { portId: 'value', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'error', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Modbus Write ────────────────────────────────────────────────
        {
            id: 'modbus_write',
            name: 'Modbus Write',
            color: COLOR,
            icon: '✏️',
            category: 'Modbus Master',
            description: 'เขียนค่าไปยัง Modbus Slave\nรองรับ Single Coil, Single/Multiple Holding Registers',
            inputs: [
                { id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกก่อนหน้า' },
                { id: 'value', type: 'input', label: 'Value', dataType: 'any', description: 'ค่าที่ต้องการเขียน (ถ้าไม่ต่อสาย ใช้ค่าจาก param)' },
            ],
            outputs: [
                { id: 'success', type: 'output', label: 'Success', dataType: 'void', description: 'รันเมื่อเขียนสำเร็จ' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่อเขียนไม่สำเร็จ' },
                { id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'ต่อเสมอหลัง if/else' },
            ],
            params: [
                {
                    id: 'slave_id', label: 'Slave ID', type: 'number',
                    default: '1', description: 'หมายเลข Modbus Slave (1-247)',
                    validation: (n: number) => Math.max(1, Math.min(247, Math.round(n))),
                },
                {
                    id: 'write_type', label: 'Write Type', type: 'option',
                    options: [
                        { label: 'Single Coil', value: 'single_coil', description: 'writeSingleCoil (FC 05)' },
                        { label: 'Single Register', value: 'single_register', description: 'writeSingleRegister (FC 06)' },
                        { label: 'Multiple Coils', value: 'multi_coils', description: 'writeMultipleCoils (FC 15)' },
                        { label: 'Multiple Registers', value: 'multi_registers', description: 'writeMultipleRegisters (FC 16)' },
                    ],
                    default: 'single_register',
                },
                {
                    id: 'address', label: 'Address', type: 'number',
                    default: '0', description: 'ที่อยู่ register (0-indexed)',
                    validation: (n: number) => Math.max(0, Math.round(n)),
                },
                {
                    id: 'data_type', label: 'Data Type', type: 'option',
                    options: [
                        { label: 'int16  (signed 16-bit)', value: 'int16' },
                        { label: 'uint16 (word)', value: 'uint16' },
                        { label: 'int32  (signed 32-bit)', value: 'int32' },
                        { label: 'float32', value: 'float32' },
                    ],
                    default: 'int16',
                    hidden: ({ params }) => params.write_type === 'single_coil' || params.write_type === 'multi_coils',
                },
                {
                    id: 'coil_count', label: 'Coil Count', type: 'number',
                    default: '8', description: 'จำนวน Coil ที่ต้องการเขียน (ใช้กับ Multiple Coils)',
                    validation: (n: number) => Math.max(1, Math.round(n)),
                    hidden: ({ params }) => params.write_type !== 'multi_coils',
                },
                {
                    id: 'value', label: 'Value', type: 'text',
                    default: '0', description: 'ค่าที่เขียน (ใช้เมื่อไม่มีสายต่อเข้า Value port)',
                },
            ],
            toCode({ pad, block, safeId, params, resolveInput, registerPreprocessor, registerGlobal, registerFunction }) {
                const slaveId = params.slave_id ?? '1';
                const writeType = params.write_type ?? 'single_register';
                const address = params.address ?? '0';
                const dataType = params.data_type ?? 'int16';
                const coilCount = params.coil_count ?? '8';
                const fallback = params.value ?? '0';
                const id = safeId(block.id);

                const valueExpr = resolveInput('value') ?? fallback;

                registerModbusInstance('-1', registerPreprocessor, registerGlobal, registerFunction);

                let writeLines: string[];
                if (writeType === 'single_coil') {
                    writeLines = [
                        `${pad}uint16_t ${id}_coil_val = (${valueExpr}) ? 0xFF00 : 0x0000;`,
                        `${pad}uint8_t ${id}_result = modbus.writeSingleCoil(${address}, ${id}_coil_val);`,
                    ];
                } else if (writeType === 'multi_coils') {
                    writeLines = [
                        `${pad}modbus.setTransmitBuffer(0, (uint16_t)(${valueExpr}));`,
                        `${pad}uint8_t ${id}_result = modbus.writeMultipleCoils(${address}, ${coilCount});`,
                    ];
                } else if (writeType === 'single_register') {
                    if (dataType === 'float32') {
                        // float → 2 registers via writeMultipleRegisters
                        writeLines = [
                            `${pad}union { float f; uint16_t u[2]; } ${id}_conv; ${id}_conv.f = (float)(${valueExpr});`,
                            `${pad}modbus.setTransmitBuffer(0, ${id}_conv.u[0]);`,
                            `${pad}modbus.setTransmitBuffer(1, ${id}_conv.u[1]);`,
                            `${pad}uint8_t ${id}_result = modbus.writeMultipleRegisters(${address}, 2);`,
                        ];
                    } else if (dataType === 'int32') {
                        writeLines = [
                            `${pad}uint32_t ${id}_i32 = (uint32_t)(int32_t)(${valueExpr});`,
                            `${pad}modbus.setTransmitBuffer(0, (uint16_t)(${id}_i32 & 0xFFFF));`,
                            `${pad}modbus.setTransmitBuffer(1, (uint16_t)(${id}_i32 >> 16));`,
                            `${pad}uint8_t ${id}_result = modbus.writeMultipleRegisters(${address}, 2);`,
                        ];
                    } else {
                        writeLines = [
                            `${pad}uint8_t ${id}_result = modbus.writeSingleRegister(${address}, (uint16_t)(${valueExpr}));`,
                        ];
                    }
                } else {
                    // multi_registers
                    if (dataType === 'float32') {
                        writeLines = [
                            `${pad}union { float f; uint16_t u[2]; } ${id}_conv; ${id}_conv.f = (float)(${valueExpr});`,
                            `${pad}modbus.setTransmitBuffer(0, ${id}_conv.u[0]);`,
                            `${pad}modbus.setTransmitBuffer(1, ${id}_conv.u[1]);`,
                            `${pad}uint8_t ${id}_result = modbus.writeMultipleRegisters(${address}, 2);`,
                        ];
                    } else if (dataType === 'int32') {
                        writeLines = [
                            `${pad}uint32_t ${id}_i32 = (uint32_t)(int32_t)(${valueExpr});`,
                            `${pad}modbus.setTransmitBuffer(0, (uint16_t)(${id}_i32 & 0xFFFF));`,
                            `${pad}modbus.setTransmitBuffer(1, (uint16_t)(${id}_i32 >> 16));`,
                            `${pad}uint8_t ${id}_result = modbus.writeMultipleRegisters(${address}, 2);`,
                        ];
                    } else {
                        writeLines = [
                            `${pad}modbus.setTransmitBuffer(0, (uint16_t)(${valueExpr}));`,
                            `${pad}uint8_t ${id}_result = modbus.writeMultipleRegisters(${address}, 1);`,
                        ];
                    }
                }

                return {
                    parts: [
                        [`${pad}modbus.begin(${slaveId}, *modbus_serial);`],
                        writeLines,
                        [`${pad}if (${id}_result == ModbusMaster::ku8MBSuccess) {`],
                        { portId: 'success', depthDelta: 1 },
                        [`${pad}} else {`],
                        { portId: 'error', depthDelta: 1 },
                        [`${pad}}`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default modbusMasterExtension;
