import type { BlockCategory } from '../types.js';

const COLOR = '#84cc16'; // lime

// Number of registers to read per model
const MODEL_REG_COUNT: Record<string, number> = {
    'TH': 2,
    'TH-EC': 3,
    'TH-EC-NPK': 7,
    'TH-EC-PH-NPK': 7,
};

// Safe C function name suffix per model
const MODEL_SUFFIX: Record<string, string> = {
    'TH': 'TH',
    'TH-EC': 'TH_EC',
    'TH-EC-NPK': 'TH_EC_NPK',
    'TH-EC-PH-NPK': 'TH_EC_PH_NPK',
};

// Argument position in function call (soil, temp, ec, ph, n, p, k)
const VALUE_ARG_INDEX: Record<string, number> = {
    soil: 0,
    temp: 1,
    ec: 2,
    ph: 3,
    n: 4,
    p: 5,
    k: 6,
};

const soilRS485Extension: BlockCategory = {
    id: 'soil-rs485',
    name: 'Soil RS485',
    blocks: [
        {
            id: 'soil-rs485-read',
            name: 'Soil Sensor RS485 Read',
            color: COLOR,
            icon: '🌱',
            category: 'Soil RS485',
            description: 'อ่านค่าจากเซ็นเซอร์ดิน RS485 (TH-EC-PH-NPK) ผ่าน Modbus RTU\nต้องใช้ร่วมกับ ModbusMaster Extension',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกก่อนหน้า' }],
            outputs: [
                { id: 'value', type: 'output', label: 'Value', dataType: 'float', description: 'ค่าที่อ่านได้จากเซ็นเซอร์' },
                { id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'รันเมื่ออ่านค่าไม่ได้' },
                { id: 'out', type: 'output', label: '➜', dataType: 'any', description: 'จุดต่อสายบล็อกถัดไป' },
            ],
            params: [
                {
                    id: 'id', label: 'ID', description: 'Modbus Device ID ของเซ็นเซอร์',
                    type: 'number', validation: n => Math.max(1, Math.min(n, 247)), default: '1',
                },
                {
                    id: 'model', label: 'Model', description: 'รุ่นของเซ็นเซอร์ดิน',
                    type: 'option', options: [
                        { label: 'TH (Soil + Temp)', value: 'TH' },
                        { label: 'TH-EC (Soil + Temp + EC)', value: 'TH-EC' },
                        { label: 'TH-EC-NPK (Soil + Temp + EC + N/P/K)', value: 'TH-EC-NPK' },
                        { label: 'TH-EC-PH-NPK (Soil + Temp + EC + PH + N/P/K)', value: 'TH-EC-PH-NPK' },
                    ],
                },
                {
                    id: 'value_type', label: 'Value', description: 'ค่าที่ต้องการนำไปใช้ (ขึ้นอยู่กับรุ่นที่เลือก)',
                    type: 'option',
                    options(params) {
                        const model = params.model ?? 'TH-EC-PH-NPK';
                        const all = [
                            { label: 'Soil Moisture (%)',      value: 'soil' },
                            { label: 'Temperature (°C)',       value: 'temp' },
                            { label: 'EC (µS/cm)',             value: 'ec' },
                            { label: 'PH',                     value: 'ph' },
                            { label: 'Nitrogen - N (mg/kg)',   value: 'n' },
                            { label: 'Phosphorus - P (mg/kg)', value: 'p' },
                            { label: 'Potassium - K (mg/kg)',  value: 'k' },
                        ];
                        const MODEL_VALUES: Record<string, string[]> = {
                            'TH':           ['soil', 'temp'],
                            'TH-EC':        ['soil', 'temp', 'ec'],
                            'TH-EC-NPK':    ['soil', 'temp', 'ec', 'n', 'p', 'k'],
                            'TH-EC-PH-NPK': ['soil', 'temp', 'ec', 'ph', 'n', 'p', 'k'],
                        };
                        const allowed = MODEL_VALUES[model] ?? MODEL_VALUES['TH-EC-PH-NPK'];
                        return all.filter(o => allowed.includes(o.value));
                    },
                },
            ],
            toCode({ pad, block, registerFunction, safeId, params }) {
                const id = safeId(block.id);
                const device_id = params.id ?? '1';
                const model = (params.model ?? 'TH-EC-PH-NPK') as string;
                const value_type = (params.value_type ?? 'soil') as string;

                const regCount = MODEL_REG_COUNT[model] ?? 7;
                const suffix = MODEL_SUFFIX[model] ?? 'TH_EC_PH_NPK';
                const argIdx = VALUE_ARG_INDEX[value_type] ?? 0;

                // Build function body lines based on model
                const bodyLines: string[] = [
                    '  static float _soil = 0, _temp = 0, _ec = 0, _ph = 0, _n = 0, _p = 0, _k = 0;',
                    '  static uint8_t result = 0xFF;',
                    '  ',
                    '  static uint32_t last_measure = 0;',
                    '  if ((last_measure == 0) || ((millis() - last_measure) >= 100) || (millis() < last_measure)) {',
                    '    last_measure = millis();',
                    `    modbus.begin(${device_id}, *modbus_serial);`,
                    `    result = modbus.readInputRegisters(0, ${regCount});`,
                    '    if (result == modbus.ku8MBSuccess) {',
                    '      _soil = modbus.getResponseBuffer(0) / 10.0f;',
                    '      _temp = modbus.getResponseBuffer(1) / 10.0f;',
                ];

                if (regCount >= 3) bodyLines.push('      _ec = (float)modbus.getResponseBuffer(2);');
                if (regCount >= 7) {
                    if (model === 'TH-EC-PH-NPK') {
                        bodyLines.push('      _ph = modbus.getResponseBuffer(3) / 10.0f;');
                    }
                    bodyLines.push('      _n = (float)modbus.getResponseBuffer(4);');
                    bodyLines.push('      _p = (float)modbus.getResponseBuffer(5);');
                    bodyLines.push('      _k = (float)modbus.getResponseBuffer(6);');
                }

                bodyLines.push(
                    '    }',
                    '  }',
                    '  ',
                    '  if (result == modbus.ku8MBSuccess) {',
                    '    if (soil) *soil = _soil;',
                    '    if (temp) *temp = _temp;',
                    '    if (ec)   *ec   = _ec;',
                    '    if (ph)   *ph   = _ph;',
                    '    if (n)    *n    = _n;',
                    '    if (p)    *p    = _p;',
                    '    if (k)    *k    = _k;',
                    '  }',
                    '  ',
                    '  return result == modbus.ku8MBSuccess;',
                );

                const fnName = `readSoilRS485_${suffix}_id${device_id}`;
                const fnSig = `bool ${fnName}(float *soil, float *temp, float *ec, float *ph, float *n, float *p, float *k)`;

                registerFunction(fnSig, bodyLines.join('\n'), `${fnSig};`);

                // Build argument list: &id at correct position, NULL elsewhere
                const args = ['soil', 'temp', 'ec', 'ph', 'n', 'p', 'k'].map((_, i) =>
                    i === argIdx ? `&${id}` : 'NULL'
                );

                return {
                    parts: [
                        [`${pad}float ${id} = 0;`],
                        [`${pad}if (${fnName}(${args.join(', ')})) {`],
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

export default soilRS485Extension;
