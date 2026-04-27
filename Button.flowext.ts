import type { BlockCategory } from '../types.js';

const COLOR = '#16a34a'; // green-600

// Registers per-pin state struct, update function (debounce + edge detect + long press),
// and polling call. All strings are deterministic by (pin, activeHigh) so registerGlobal /
// registerFunction / registerPollingCode deduplication makes it safe to call from multiple
// trigger blocks on the same pin.
function registerBtnHelper(
    pin: string,
    activeHigh: boolean,
    registerGlobal: (d: string) => void,
    registerFunction: (sig: string, body: string, fwd: string) => void,
    registerPollingCode: (code: string) => void,
) {
    const act = activeHigh ? 'HIGH' : 'LOW';
    const initR = activeHigh ? 'LOW' : 'HIGH'; // initial "not pressed" raw state
    const pull = activeHigh ? 'INPUT_PULLDOWN' : 'INPUT_PULLUP';

    registerGlobal([
        `typedef struct {`,
        `  uint8_t active;`,
        `  bool last_raw;`,
        `  uint32_t debounce_t;`,
        `  uint32_t press_t;`,
        `  bool pressed;`,
        `  bool fired_long;`,
        `} Botton_t;`,
    ].join('\n'));

    registerGlobal(`_btn_${pin} = { ${act}, ${initR}, 0, 0, false, false };`);

    registerFunction(
        `void _btn_${pin}_update()`,
        [
            `  static bool _init = false;`,
            `  if (!_init) {`,
            `     _init = true;`,
            `     pinMode(${pin}, ${pull});`,
            `  }`,
            `  bool _r = digitalRead(${pin}) == _btn_${pin}.active;`,
            `  if (_r != _btn_${pin}.last_raw) {`,
            `    _btn_${pin}.last_raw = _r;`,
            `    _btn_${pin}.debounce_t = millis();`,
            `  }`,
            `  if (millis() - _btn_${pin}.debounce_t < 50) {`,
            `    return;`,
            `  }`,
            `  if (_r && !_btn_${pin}.pressed) {`,
            `    _btn_${pin}.pressed = true;`,
            `    _btn_${pin}.fired_long = false;`,
            `    _btn_${pin}.press_t = millis();`,
            `#ifdef BTN_${pin}_PRESS_CB`,
            `    BTN_${pin}_PRESS_CB();`,
            `#endif`,
            `  } else if (!_r && _btn_${pin}.pressed) {`,
            `    _btn_${pin}.pressed = false;`,
            `    if (!_btn_${pin}.fired_long) {`,
            `#ifdef BTN_${pin}_CLICK_CB`,
            `      BTN_${pin}_CLICK_CB();`,
            `#endif`,
            `    }`,
            `  }`,
            `  if (_btn_${pin}.pressed) {`,
            `#ifdef BTN_${pin}_PRESSED_CB`,
            `    BTN_${pin}_PRESSED_CB();`,
            `#endif`,
            `  }`,
            `  if (_btn_${pin}.pressed && !_btn_${pin}.fired_long && millis() - _btn_${pin}.press_t > 2000) {`,
            `    _btn_${pin}.fired_long = true;`,
            `#ifdef BTN_${pin}_LONG_CB`,
            `    BTN_${pin}_LONG_CB();`,
            `#endif`,
            `  }`,
        ].join('\n'),
        `void _btn_${pin}_update();`
    );

    registerPollingCode(`_btn_${pin}_update();`);
}

const COMMON_PARAMS = [
    {
        id: 'pin', type: 'number' as const, label: 'Pin', default: '0',
        description: 'GPIO ที่ต่อกับปุ่มกด',
        validation: (n: number) => Math.trunc(n),
    },
    {
        id: 'active', type: 'option' as const, label: 'Active', default: 'low',
        description: 'Active LOW: ปุ่มต่อ GND (ใช้ PULLUP อัตโนมัติ)\nActive HIGH: ปุ่มต่อ VCC (ใช้ PULLDOWN อัตโนมัติ)',
        options: [
            { label: 'LOW (Pull-Up)', value: 'low' },
            { label: 'HIGH (Pull-down)', value: 'high' },
        ],
    },
];

const buttonExtension: BlockCategory = {
    id: 'button',
    name: 'Button',
    blocks: [

        // ─── On Button Press ─────────────────────────────────────────────
        {
            id: 'btn_on_press',
            name: 'On Button Press',
            trigger: true,
            color: COLOR,
            icon: '▼',
            category: 'Button',
            description: 'เรียกครั้งเดียวตอนกดปุ่มครั้งแรก (rising edge หลัง debounce)\nต่างจาก On Button Pressed ที่เรียกทุก loop ขณะค้างอยู่',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: COMMON_PARAMS,
            toCode({ captureCode, params, registerGlobal, registerFunction, registerPollingCode, registerPreprocessor }) {
                const pin = params.pin ?? '0';
                const actHi = params.active === 'high';
                registerBtnHelper(pin, actHi, registerGlobal, registerFunction, registerPollingCode);

                const body = captureCode('out', 1) ?? '';
                registerFunction(`void _btn_${pin}_on_press()`, body, `void _btn_${pin}_on_press();`);
                registerPreprocessor(`#define BTN_${pin}_PRESS_CB _btn_${pin}_on_press`);
                return { parts: [] };
            }
        },

        // ─── On Button Pressed ───────────────────────────────────────────
        {
            id: 'btn_on_pressed',
            name: 'On Button Pressed',
            trigger: true,
            color: COLOR,
            icon: '🔽',
            category: 'Button',
            description: 'เรียกทุก loop ขณะกดปุ่มค้างอยู่\nใช้สำหรับ action ต่อเนื่อง เช่น หมุน motor ตลอดที่กด',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: COMMON_PARAMS,
            toCode({ captureCode, params, registerGlobal, registerFunction, registerPollingCode, registerPreprocessor }) {
                const pin = params.pin ?? '0';
                const actHi = params.active === 'high';
                registerBtnHelper(pin, actHi, registerGlobal, registerFunction, registerPollingCode);

                const body = captureCode('out', 1) ?? '';
                registerFunction(`void _btn_${pin}_on_pressed()`, body, `void _btn_${pin}_on_pressed();`);
                registerPreprocessor(`#define BTN_${pin}_PRESSED_CB _btn_${pin}_on_pressed`);
                return { parts: [] };
            }
        },

        // ─── On Button Click ─────────────────────────────────────────────
        {
            id: 'btn_on_click',
            name: 'On Button Click',
            trigger: true,
            color: COLOR,
            icon: '👆',
            category: 'Button',
            description: 'เรียกเมื่อกดปุ่มแล้วปล่อยภายใน 800ms (click)\nใช้สำหรับ action ครั้งเดียว',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: COMMON_PARAMS,
            toCode({ captureCode, params, registerGlobal, registerFunction, registerPollingCode, registerPreprocessor }) {
                const pin = params.pin ?? '0';
                const actHi = params.active === 'high';
                registerBtnHelper(pin, actHi, registerGlobal, registerFunction, registerPollingCode);

                const body = captureCode('out', 1) ?? '';
                registerFunction(`void _btn_${pin}_on_click()`, body, `void _btn_${pin}_on_click();`);
                registerPreprocessor(`#define BTN_${pin}_CLICK_CB _btn_${pin}_on_click`);
                return { parts: [] };
            }
        },

        // ─── On Button Long Click ────────────────────────────────────────
        {
            id: 'btn_on_long',
            name: 'On Button Long Click',
            trigger: true,
            color: COLOR,
            icon: '👇',
            category: 'Button',
            description: 'เรียกครั้งเดียวเมื่อกดค้างนานเกิน 800ms\nใช้สำหรับ action พิเศษ เช่น reset, เปลี่ยน mode',
            inputs: [],
            outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
            params: COMMON_PARAMS,
            toCode({ captureCode, params, registerGlobal, registerFunction, registerPollingCode, registerPreprocessor }) {
                const pin = params.pin ?? '0';
                const actHi = params.active === 'high';
                registerBtnHelper(pin, actHi, registerGlobal, registerFunction, registerPollingCode);

                const body = captureCode('out', 1) ?? '';
                registerFunction(`void _btn_${pin}_on_long()`, body, `void _btn_${pin}_on_long();`);
                registerPreprocessor(`#define BTN_${pin}_LONG_CB _btn_${pin}_on_long`);
                return { parts: [] };
            }
        },
    ]
};

export default buttonExtension;
