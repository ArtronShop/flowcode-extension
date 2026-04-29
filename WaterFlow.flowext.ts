import type { BlockCategory } from '../types.js';

const COLOR = '#0369a1'; // sky-700

function registerWFHelper(
    registerPreprocessor: (d: string) => void,
    registerGlobal: (d: string) => void,
    registerFunction: (sig: string, body: string, fwd: string) => void,
) {
    registerPreprocessor('#include <driver/pcnt.h>');
    registerPreprocessor('#include <freertos/timers.h>');

    registerGlobal('float _wf_flow_rate    = 0.0;');
    registerGlobal('float _wf_total_volume = 0.0;');
    registerGlobal('float _wf_k_factor     = 7.5;');
    registerGlobal('uint32_t _wf_interval_ms  = 1000;');
    registerGlobal('pcnt_unit_t _wf_pcnt_unit = PCNT_UNIT_0;');
    registerGlobal('TimerHandle_t _wf_timer = NULL;');

    // FreeRTOS software timer — runs in timer daemon task, no hardware timer resource used.
    // Safe to use alongside PWM (ledc), analogWrite, etc.
    registerFunction(
        'void _wf_timer_cb(TimerHandle_t xTimer)',
        [
            '  int16_t _count = 0;',
            '  pcnt_get_counter_value(_wf_pcnt_unit, &_count);',
            '  pcnt_counter_clear(_wf_pcnt_unit);',
            '  if (_count < 0) _count = 0;',
            '  _wf_flow_rate = (float)_count * 1000.0f / (float)_wf_interval_ms / _wf_k_factor;',
            '  _wf_total_volume += _wf_flow_rate * ((float)_wf_interval_ms / 60000.0f);',
        ].join('\n'),
        'void _wf_timer_cb(TimerHandle_t);'
    );
}

const waterFlowExtension: BlockCategory = {
    id: 'water-flow',
    name: 'Water Flow (Pulse)',
    blocks: [

        // ─── Begin ───────────────────────────────────────────────────────
        {
            id: 'wf_begin',
            name: 'Water Flow Begin',
            color: COLOR,
            icon: '💧',
            category: 'Water Flow',
            description: 'เริ่มต้น Water Flow sensor แบบ Pulse\nใช้ ESP32 PCNT นับ pulse + esp_timer คำนวณอัตราการไหลตรงเวลา\nไม่หยุดเมื่อ loop ค้างจาก MQTT/HTTP\nไม่ต้องติดตั้ง library เพิ่ม',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: [
                {
                    id: 'pin', type: 'number', label: 'Signal Pin', default: '4',
                    description: 'GPIO ที่ต่อกับ signal output ของ sensor',
                    validation: (n: number) => Math.trunc(n),
                },
                {
                    id: 'k_factor', type: 'number', label: 'K-Factor (Hz per L/min)', default: '5',
                    description: 'จำนวน pulse/วินาที ต่อ 1 L/min\nYF-S201C = 5 | YF-S201 = 7.5 | YF-B10 = 4.8 | ดูจาก datasheet',
                },
            ],
            toCode({ pad, params, registerPreprocessor, registerGlobal, registerFunction }) {
                registerWFHelper(registerPreprocessor, registerGlobal, registerFunction);

                const pin = params.pin ?? '4';
                const unit = `PCNT_UNIT_0`;
                const kFactor = params.k_factor ?? '7.5';
                const interval = '1000';

                return {
                    parts: [
                        [
                            `${pad}_wf_pcnt_unit = ${unit};`,
                            `${pad}_wf_k_factor = ${kFactor};`,
                            `${pad}_wf_interval_ms = ${interval};`,
                            `${pad}{ // Configure ESP32 PCNT hardware counter`,
                            `${pad}  pcnt_config_t _pcfg = {};`,
                            `${pad}  _pcfg.pulse_gpio_num = ${pin};`,
                            `${pad}  _pcfg.ctrl_gpio_num  = PCNT_PIN_NOT_USED;`,
                            `${pad}  _pcfg.channel = PCNT_CHANNEL_0;`,
                            `${pad}  _pcfg.unit = ${unit};`,
                            `${pad}  _pcfg.pos_mode = PCNT_COUNT_INC;`,
                            `${pad}  _pcfg.neg_mode = PCNT_COUNT_DIS;`,
                            `${pad}  _pcfg.lctrl_mode = PCNT_MODE_KEEP;`,
                            `${pad}  _pcfg.hctrl_mode = PCNT_MODE_KEEP;`,
                            `${pad}  _pcfg.counter_h_lim = 32767;`,
                            `${pad}  _pcfg.counter_l_lim = 0;`,
                            `${pad}  pcnt_unit_config(&_pcfg);`,
                            `${pad}  pcnt_counter_pause(${unit});`,
                            `${pad}  pcnt_counter_clear(${unit});`,
                            `${pad}  pcnt_counter_resume(${unit});`,
                            `${pad}}`,
                            `${pad}{ // FreeRTOS software timer — no hardware timer resource, safe with PWM`,
                            `${pad}  if (_wf_timer != NULL) {`,
                            `${pad}    xTimerStop(_wf_timer, portMAX_DELAY);`,
                            `${pad}    xTimerDelete(_wf_timer, portMAX_DELAY);`,
                            `${pad}    _wf_timer = NULL;`,
                            `${pad}  }`,
                            `${pad}  _wf_timer = xTimerCreate("wf_timer", pdMS_TO_TICKS(_wf_interval_ms), pdTRUE, NULL, _wf_timer_cb);`,
                            `${pad}  xTimerStart(_wf_timer, 0);`,
                            `${pad}}`,
                        ],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Read ────────────────────────────────────────────────────────
        {
            id: 'wf_read',
            name: 'Water Flow Read',
            color: COLOR,
            icon: '📊',
            category: 'Water Flow',
            requires: ['wf_begin'],
            description: 'อ่านค่าจาก Water Flow sensor\nค่าถูกอัปเดตโดย esp_timer ตรงเวลาทุก interval',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'value', type: 'output', label: 'Value', dataType: 'float' }],
            params: [
                {
                    id: 'value_type', type: 'option', label: 'Value', default: 'flow_rate',
                    options: [
                        { label: 'Flow Rate (L/min)', value: 'flow_rate' },
                        { label: 'Total Volume (L)', value: 'total_volume' },
                    ],
                },
            ],
            toExpr: params => params.value_type === 'total_volume' ? '_wf_total_volume' : '_wf_flow_rate',
            toCode({ registerPreprocessor, registerGlobal, registerFunction }) {
                registerWFHelper(registerPreprocessor, registerGlobal, registerFunction);

                return {
                    parts: [
                        { portId: 'value', depthDelta: 0 },
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },

        // ─── Reset ───────────────────────────────────────────────────────
        {
            id: 'wf_reset',
            name: 'Water Flow Reset',
            color: COLOR,
            icon: '🔄',
            category: 'Water Flow',
            requires: ['wf_begin'],
            description: 'รีเซ็ตค่า Total Volume สะสมกลับเป็น 0',
            inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            toCode({ pad, registerPreprocessor, registerGlobal, registerFunction }) {
                registerWFHelper(registerPreprocessor, registerGlobal, registerFunction);
                return {
                    parts: [
                        [`${pad}_wf_total_volume = 0.0;`],
                        { portId: 'out', depthDelta: 0 },
                    ]
                };
            }
        },
    ]
};

export default waterFlowExtension;
