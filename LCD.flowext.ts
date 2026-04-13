import type { BlockCategory } from '../types.js';

const COLOR = '#16a34a'; // green
const LCD_VAR = '_lcd';  // fixed global variable name

// ─── printf helpers (copy จาก data.ts เพื่อไม่ต้อง import) ──────────────────
function getPrintfSpecifiers(format: string): string[] {
	const matches = format.match(/%%|%[-+0 #]*(?:\*|\d+)?(?:\.(?:\*|\d+))?(?:hh?|ll?|[ljztL])?[diouxXeEfgGaAcspn]/g) ?? [];
	return matches.filter(m => m !== '%%').map(m => m[m.length - 1]);
}

function specifierToDataType(spec: string): string {
	if ('diouxX'.includes(spec)) return 'int';
	if ('eEfgGaA'.includes(spec)) return 'float';
	if (spec === 's') return 'String';
	if (spec === 'c') return 'char';
	return 'any';
}

function wrapPrintfArgs(args: string[], specs: string[]): string[] {
	return args.map((a, i) => specs[i] === 's' ? `String(${a}).c_str()` : a);
}

// ─── shared register helper ───────────────────────────────────────────────────
function lcdRegister(
	registerPreprocessor: (d: string) => void,
	registerGlobal:       (d: string) => void,
	addr: string, cols: string, rows: string
) {
	registerPreprocessor('#include <Wire.h>');
	registerPreprocessor('#include <LiquidCrystal_I2C.h>');
	registerGlobal(`LiquidCrystal_I2C ${LCD_VAR}(${addr}, ${cols}, ${rows});`);
}

const lcdExtension: BlockCategory = {
	id: 'lcd',
	name: 'LCD I2C',
	blocks: [

		// ─── Begin ───────────────────────────────────────────────────────────
		{
			id: 'lcd_begin',
			name: 'LCD Begin',
			color: COLOR,
			icon: '🖥️',
			category: 'LCD',
			description: `เริ่มต้น LCD I2C (LiquidCrystal_I2C)\nตัวแปรชื่อ ${LCD_VAR} — ใช้ร่วมกับทุกบล็อก LCD`,
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'address', type: 'option', label: 'I2C Address',
					options: [
						{ label: '0x27 (most common)', value: '0x27' },
						{ label: '0x3F',               value: '0x3F' },
					],
					description: 'ตรวจสอบด้วย I2C Scanner หากหน้าจอไม่แสดงผล',
				},
				{
					id: 'cols', type: 'number', label: 'Columns', default: '16',
					description: 'จำนวนคอลัมน์ เช่น 16 หรือ 20',
					validation: (n: number) => Math.max(1, Math.trunc(n)),
				},
				{
					id: 'rows', type: 'number', label: 'Rows', default: '2',
					description: 'จำนวนแถว เช่น 2 หรือ 4',
					validation: (n: number) => Math.max(1, Math.trunc(n)),
				},
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				const addr = params.address ?? '0x27';
				const cols = params.cols    ?? '16';
				const rows = params.rows    ?? '2';
				lcdRegister(registerPreprocessor, registerGlobal, addr, cols, rows);
				return {
					parts: [
						[
							`${pad}${LCD_VAR}.init();`,
							`${pad}${LCD_VAR}.backlight();`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Clear ───────────────────────────────────────────────────────────
		{
			id: 'lcd_clear',
			name: 'LCD Clear',
			color: COLOR,
			icon: '🗑️',
			category: 'LCD',
			description: 'ล้างหน้าจอ LCD ทั้งหมด (lcd.clear)',
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [],
			toCode({ pad, registerPreprocessor, registerGlobal }) {
				lcdRegister(registerPreprocessor, registerGlobal, '0x27', '16', '2');
				return {
					parts: [
						[`${pad}${LCD_VAR}.clear();`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Print ────────────────────────────────────────────────────────────
		{
			id: 'lcd_print',
			name: 'LCD Print',
			color: COLOR,
			icon: '📝',
			category: 'LCD',
			description: 'ตั้ง cursor แล้วพิมพ์ข้อความ/ตัวเลขออกหน้าจอ LCD\nCol 0 = ซ้ายสุด, Row 0 = บรรทัดแรก',
			inputs: [
				{ id: 'in',    type: 'input', label: '➜',    dataType: 'any' },
				{ id: 'col',   type: 'input', label: 'Col',   dataType: 'int', description: 'คอลัมน์ (0-based) ถ้าไม่ต่อสายใช้ param' },
				{ id: 'row',   type: 'input', label: 'Row',   dataType: 'int', description: 'แถว (0-based) ถ้าไม่ต่อสายใช้ param' },
				{ id: 'value', type: 'input', label: 'Value', dataType: 'any', description: 'ค่าที่ต้องการแสดง ถ้าไม่ต่อสายใช้ Text param' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'col',  type: 'number', label: 'Col',  default: '0', validation: (n: number) => Math.max(0, Math.trunc(n)) },
				{ id: 'row',  type: 'number', label: 'Row',  default: '0', validation: (n: number) => Math.max(0, Math.trunc(n)) },
				{ id: 'text', type: 'text',   label: 'Text', default: 'Hello!', description: 'ข้อความ fallback เมื่อไม่มีสายต่อเข้า Value' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor, registerGlobal }) {
				lcdRegister(registerPreprocessor, registerGlobal, '0x27', '16', '2');
				const col = resolveInput('col')   ?? params.col  ?? '0';
				const row = resolveInput('row')   ?? params.row  ?? '0';
				const val = resolveInput('value') ?? `"${(params.text ?? 'Hello!').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[
							`${pad}${LCD_VAR}.setCursor(${col}, ${row});`,
							`${pad}${LCD_VAR}.print(${val});`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Print Format ─────────────────────────────────────────────────────
		{
			id: 'lcd_printf',
			name: 'LCD Print Format',
			color: COLOR,
			icon: '📋',
			category: 'LCD',
			description: 'ตั้ง cursor แล้วพิมพ์ข้อความแบบ printf format ลง LCD\nรองรับ %d %f %s %c ฯลฯ — %s จะแปลง Arduino String → c_str() อัตโนมัติ',
			inputs: [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'col',    type: 'number', label: 'Col',    default: '0', validation: (n: number) => Math.max(0, Math.trunc(n)) },
				{ id: 'row',    type: 'number', label: 'Row',    default: '0', validation: (n: number) => Math.max(0, Math.trunc(n)) },
				{
					id: 'format', type: 'text', label: 'Format', default: '%d',
					description: 'รูปแบบ printf เช่น "Temp: %.1f C" หรือ "Val: %d" (จำนวน Arg จะปรับตาม specifier อัตโนมัติ)',
				},
			],
			dynamicPorts(params) {
				const specs = getPrintfSpecifiers(params.format ?? '%d');
				return {
					inputs: [
						{ id: 'in', type: 'input' as const, label: '➜', dataType: 'any' as const },
						...specs.map((spec, i) => ({
							id: `arg${i + 1}`, type: 'input' as const,
							label: `Arg ${i + 1}`,
							dataType: specifierToDataType(spec) as import('../types.js').DataType,
						})),
					],
				};
			},
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor, registerGlobal }) {
				lcdRegister(registerPreprocessor, registerGlobal, '0x27', '16', '2');
				const id   = safeId(block.id);
				const col  = params.col    ?? '0';
				const row  = params.row    ?? '0';
				const fmt  = (params.format ?? '%d').replaceAll('"', '\\"');
				const specs = getPrintfSpecifiers(fmt);
				const args  = specs.map((_, i) => resolveInput(`arg${i + 1}`) ?? '0');
				const wrappedArgs = wrapPrintfArgs(args, specs);
				const argsPart = wrappedArgs.length > 0 ? `, ${wrappedArgs.join(', ')}` : '';
				return {
					parts: [
						[
							`${pad}char ${id}_buf[64];`,
							`${pad}snprintf(${id}_buf, sizeof(${id}_buf), "${fmt}"${argsPart});`,
							`${pad}${LCD_VAR}.setCursor(${col}, ${row});`,
							`${pad}${LCD_VAR}.print(${id}_buf);`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Backlight ────────────────────────────────────────────────────────
		{
			id: 'lcd_backlight',
			name: 'LCD Backlight',
			color: COLOR,
			icon: '💡',
			category: 'LCD',
			description: 'เปิด/ปิดไฟพื้นหลัง LCD (lcd.backlight / lcd.noBacklight)',
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'state', type: 'option', label: 'State',
					options: [
						{ label: 'On',  value: 'on'  },
						{ label: 'Off', value: 'off' },
					],
					default: 'on',
				},
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				lcdRegister(registerPreprocessor, registerGlobal, '0x27', '16', '2');
				const state = params.state ?? 'on';
				return {
					parts: [
						[`${pad}${LCD_VAR}.${state === 'on' ? 'backlight' : 'noBacklight'}();`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default lcdExtension;
