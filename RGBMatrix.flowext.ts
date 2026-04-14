import type { BlockCategory } from '../types.js';

const COLOR_UI = '#dc2626'; // red
const MATRIX_VAR = '_matrix';

const rgbMatrixExtension: BlockCategory = {
	id: 'rgb_matrix',
	name: 'RGB LED Matrix',
	blocks: [
		// ─── Begin ───────────────────────────────────────────────────────────
		{
			id: 'matrix_begin',
			name: 'Matrix Begin',
			color: COLOR_UI,
			icon: '🔴',
			category: 'RGBMatrix',
			description: 'เริ่มต้น RGB LED Matrix (HUB75) ต้องวางก่อนบล็อก Matrix อื่น ๆ ทั้งหมด',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'display', type: 'option', label: 'Display Model', options: [
						{ label: 'P4/P5 (64x32)', value: 'P4' },
						{ label: 'P10 (32x16)', value: 'P10' },
						{ label: 'Custom', value: 'CUSTOM' }
					]
				},
				{ id: 'width', type: 'number', label: 'Panel Width', default: '64', validation: (n: number) => Math.max(8, Math.trunc(n)), hidden: ({ params }) => params.display !== 'CUSTOM' },
				{ id: 'height', type: 'number', label: 'Panel Height', default: '32', validation: (n: number) => Math.max(8, Math.trunc(n)), hidden: ({ params }) => params.display !== 'CUSTOM' },
				{ id: 'bitdepth', type: 'number', label: 'Bit Depth (1–6)', default: '4', validation: (n: number) => Math.max(1, Math.min(6, Math.trunc(n))) },
				{
					id: 'board', type: 'option', label: 'Board Model', options: [
						{ label: 'ESP-HUB75', value: 'ESP-HUB75' },
						{ label: 'Custom', value: 'CUSTOM' }
					]
				},
				// ─── RGB pins ───────────────────────────────────────────────
				{ id: 'r1', type: 'number', label: 'R1 Pin', default: '42', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'g1', type: 'number', label: 'G1 Pin', default: '41', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'b1', type: 'number', label: 'B1 Pin', default: '40', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'r2', type: 'number', label: 'R2 Pin', default: '39', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'g2', type: 'number', label: 'G2 Pin', default: '38', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'b2', type: 'number', label: 'B2 Pin', default: '37', hidden: ({ params }) => params.board !== 'CUSTOM' },
				// ─── Address pins ────────────────────────────────────────────
				{ id: 'addr_a', type: 'number', label: 'A Pin', default: '48', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'addr_b', type: 'number', label: 'B Pin', default: '36', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'addr_c', type: 'number', label: 'C Pin', default: '45', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'addr_d', type: 'number', label: 'D Pin', default: '35', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'addr_e', type: 'number', label: 'E Pin', default: '-1', hidden: ({ params }) => params.board !== 'CUSTOM' },
				// ─── Control pins ────────────────────────────────────────────
				{ id: 'clk', type: 'number', label: 'CLK Pin', default: '2', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'lat', type: 'number', label: 'LAT Pin', default: '47', hidden: ({ params }) => params.board !== 'CUSTOM' },
				{ id: 'oe', type: 'number', label: 'OE Pin', default: '14', hidden: ({ params }) => params.board !== 'CUSTOM' },
				// ─── Options ─────────────────────────────────────────────────
				{
					id: 'doublebuffer', type: 'option', label: 'Double Buffer',
					options: [
						{ label: 'Yes (smoother animation)', value: '1' },
						{ label: 'No', value: '0' },
					],
					default: '1',
				},
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');

				type BoardPinsDefineType = {
					r1: number; g1: number; b1: number;
					r2: number; g2: number; b2: number;
					a: number; b: number; c: number; d: number; e?: number;
					clk: number;
					lat: number;
					oe: number;
				}

				const BOARD_PIN_DEFINE: Record<string, BoardPinsDefineType> = {
					'ESP-HUB75': {
						r1: 42, g1: 41, b1: 40,
						r2: 39, g2: 38, b2: 37,
						a: 48, b: 36, c: 45, d: 35,
						clk: 2,
						lat: 47,
						oe: 14
					}
				};

				const width = params.width ?? '64';
				const height = params.height ?? '32';
				const bitdepth = params.bitdepth ?? '4';
				const board = params.board ?? 'ESP-HUB75';

				const r1 = BOARD_PIN_DEFINE[board]?.r1 ?? params.r1 ?? '-1';
				const g1 = BOARD_PIN_DEFINE[board]?.g1 ?? params.g1 ?? '-1';
				const b1 = BOARD_PIN_DEFINE[board]?.b1 ?? params.b1 ?? '-1';
				const r2 = BOARD_PIN_DEFINE[board]?.r2 ?? params.r2 ?? '-1';
				const g2 = BOARD_PIN_DEFINE[board]?.g2 ?? params.g2 ?? '-1';
				const b2 = BOARD_PIN_DEFINE[board]?.b2 ?? params.b2 ?? '-1';

				const a = BOARD_PIN_DEFINE[board]?.a ?? params.addr_a ?? '-1';
				const b_ = BOARD_PIN_DEFINE[board]?.b ?? params.addr_b ?? '-1';
				const c = BOARD_PIN_DEFINE[board]?.c ?? params.addr_c ?? '-1';
				const d = BOARD_PIN_DEFINE[board]?.d ?? params.addr_d ?? '-1';
				const e = BOARD_PIN_DEFINE[board]?.e ?? params.addr_e ?? '-1';

				const clk = BOARD_PIN_DEFINE[board]?.clk ?? params.clk ?? '-1';
				const lat = BOARD_PIN_DEFINE[board]?.lat ?? params.lat ?? '-1';
				const oe = BOARD_PIN_DEFINE[board]?.oe ?? params.oe ?? '-1';
				const dbl = params.doublebuffer === '0' ? 'false' : 'true';

				// addr pin count depends on panel height
				const h = parseInt(height);
				const addrCount = h <= 8 ? 2 : h <= 16 ? 3 : h <= 32 ? 4 : 5;
				const addrPins = [a, b_, c, d, e].slice(0, addrCount);

				registerGlobal(`uint8_t _matrix_rgb[]  = { ${r1}, ${g1}, ${b1}, ${r2}, ${g2}, ${b2} };`);
				registerGlobal(`uint8_t _matrix_addr[] = { ${addrPins.join(', ')} };`);
				registerGlobal(`Adafruit_Protomatter ${MATRIX_VAR}(${width}, ${bitdepth}, 1, _matrix_rgb, ${addrCount}, _matrix_addr, ${clk}, ${lat}, ${oe}, ${dbl});`);

				return {
					parts: [
						[`${pad}${MATRIX_VAR}.begin();`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Show ─────────────────────────────────────────────────────────────
		{
			id: 'matrix_show',
			name: 'Matrix Show',
			color: COLOR_UI,
			icon: '📺',
			category: 'RGBMatrix',
			description: 'ส่ง frame buffer ออก RGB Matrix (ต้องเรียกหลังวาดเสร็จทุกครั้ง)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ pad, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.show();`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Clear ────────────────────────────────────────────────────────────
		{
			id: 'matrix_clear',
			name: 'Matrix Clear',
			color: COLOR_UI,
			icon: '⬛',
			category: 'RGBMatrix',
			description: 'ล้างหน้าจอทั้งหมดเป็นสีดำ (fillScreen(0))\nต้องเรียก Matrix Show หลังจากนี้เพื่ออัปเดต',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ pad, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.fillScreen(0);`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Fill Screen ──────────────────────────────────────────────────────
		{
			id: 'matrix_fill_screen',
			name: 'Matrix Fill Screen',
			color: COLOR_UI,
			icon: '🟥',
			category: 'RGBMatrix',
			description: 'เติมหน้าจอทั้งหมดด้วยสีที่กำหนด\nใช้ Matrix Color RGB เพื่อสร้างค่าสี 16-bit',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'color', type: 'input', label: 'Color', dataType: 'int' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'color', type: 'color', format: 'rgb565', label: 'Color (16-bit)', default: '0xFFFF' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const color = resolveInput('color') ?? params.color ?? '0';
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.fillScreen(${color});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Brightness ───────────────────────────────────────────────────────
		{
			id: 'matrix_brightness',
			name: 'Matrix Brightness',
			color: COLOR_UI,
			icon: '🔆',
			category: 'RGBMatrix',
			description: 'ปรับความสว่าง RGB Matrix (setDuty)\n0 = มืดสุด, 255 = สว่างสุด',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'value', type: 'input', label: 'Brightness', dataType: 'int' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'value', type: 'number', label: 'Brightness (0–255)', default: '128',
					validation: (n: number) => Math.max(0, Math.min(255, Math.trunc(n)))
				},
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const val = resolveInput('value') ?? params.value ?? '128';
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.setDuty(${val});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Draw Pixel ───────────────────────────────────────────────────────
		{
			id: 'matrix_draw_pixel',
			name: 'Matrix Draw Pixel',
			color: COLOR_UI,
			icon: '🔴',
			category: 'RGBMatrix',
			description: 'วาด pixel เดี่ยวที่ตำแหน่ง (x, y)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'x', type: 'input', label: 'X', dataType: 'int' },
				{ id: 'y', type: 'input', label: 'Y', dataType: 'int' },
				{ id: 'color', type: 'input', label: 'Color', dataType: 'int' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'x', type: 'number', label: 'X', default: '0' },
				{ id: 'y', type: 'number', label: 'Y', default: '0' },
				{ id: 'color', type: 'color', format: 'rgb565', label: 'Color', default: '0xFFFF' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const x = resolveInput('x') ?? params.x ?? '0';
				const y = resolveInput('y') ?? params.y ?? '0';
				const color = resolveInput('color') ?? params.color ?? '0xFFFF';
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.drawPixel(${x}, ${y}, ${color});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Draw Line ────────────────────────────────────────────────────────
		{
			id: 'matrix_draw_line',
			name: 'Matrix Draw Line',
			color: COLOR_UI,
			icon: '📏',
			category: 'RGBMatrix',
			description: 'วาดเส้นตรงจากจุด (x0, y0) ถึง (x1, y1)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'x0', type: 'input', label: 'X0', dataType: 'int' },
				{ id: 'y0', type: 'input', label: 'Y0', dataType: 'int' },
				{ id: 'x1', type: 'input', label: 'X1', dataType: 'int' },
				{ id: 'y1', type: 'input', label: 'Y1', dataType: 'int' },
				{ id: 'color', type: 'input', label: 'Color', dataType: 'int' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'x0', type: 'number', label: 'X0', default: '0' },
				{ id: 'y0', type: 'number', label: 'Y0', default: '0' },
				{ id: 'x1', type: 'number', label: 'X1', default: '10' },
				{ id: 'y1', type: 'number', label: 'Y1', default: '10' },
				{ id: 'color', type: 'color', format: 'rgb565', label: 'Color', default: '0xFFFF' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const x0 = resolveInput('x0') ?? params.x0 ?? '0';
				const y0 = resolveInput('y0') ?? params.y0 ?? '0';
				const x1 = resolveInput('x1') ?? params.x1 ?? '10';
				const y1 = resolveInput('y1') ?? params.y1 ?? '10';
				const color = resolveInput('color') ?? params.color ?? '0xFFFF';
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.drawLine(${x0}, ${y0}, ${x1}, ${y1}, ${color});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Draw Rect ────────────────────────────────────────────────────────
		{
			id: 'matrix_draw_rect',
			name: 'Matrix Draw Rect',
			color: COLOR_UI,
			icon: '⬜',
			category: 'RGBMatrix',
			description: 'วาดสี่เหลี่ยมเส้นขอบ (ไม่เติมสี) ที่ (x, y) ขนาด w×h',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'x', type: 'input', label: 'X', dataType: 'int' },
				{ id: 'y', type: 'input', label: 'Y', dataType: 'int' },
				{ id: 'w', type: 'input', label: 'Width', dataType: 'int' },
				{ id: 'h', type: 'input', label: 'Height', dataType: 'int' },
				{ id: 'color', type: 'input', label: 'Color', dataType: 'int' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'x', type: 'number', label: 'X', default: '0' },
				{ id: 'y', type: 'number', label: 'Y', default: '0' },
				{ id: 'w', type: 'number', label: 'Width', default: '10' },
				{ id: 'h', type: 'number', label: 'Height', default: '10' },
				{ id: 'color', type: 'color', format: 'rgb565', label: 'Color', default: '0xFFFF' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const x = resolveInput('x') ?? params.x ?? '0';
				const y = resolveInput('y') ?? params.y ?? '0';
				const w = resolveInput('w') ?? params.w ?? '10';
				const h = resolveInput('h') ?? params.h ?? '10';
				const color = resolveInput('color') ?? params.color ?? '0xFFFF';
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.drawRect(${x}, ${y}, ${w}, ${h}, ${color});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Fill Rect ────────────────────────────────────────────────────────
		{
			id: 'matrix_fill_rect',
			name: 'Matrix Fill Rect',
			color: COLOR_UI,
			icon: '🟥',
			category: 'RGBMatrix',
			description: 'วาดสี่เหลี่ยมทึบที่ (x, y) ขนาด w×h',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'x', type: 'input', label: 'X', dataType: 'int' },
				{ id: 'y', type: 'input', label: 'Y', dataType: 'int' },
				{ id: 'w', type: 'input', label: 'Width', dataType: 'int' },
				{ id: 'h', type: 'input', label: 'Height', dataType: 'int' },
				{ id: 'color', type: 'input', label: 'Color', dataType: 'int' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'x', type: 'number', label: 'X', default: '0' },
				{ id: 'y', type: 'number', label: 'Y', default: '0' },
				{ id: 'w', type: 'number', label: 'Width', default: '10' },
				{ id: 'h', type: 'number', label: 'Height', default: '10' },
				{ id: 'color', type: 'color', format: 'rgb565', label: 'Color', default: '0xFFFF' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const x = resolveInput('x') ?? params.x ?? '0';
				const y = resolveInput('y') ?? params.y ?? '0';
				const w = resolveInput('w') ?? params.w ?? '10';
				const h = resolveInput('h') ?? params.h ?? '10';
				const color = resolveInput('color') ?? params.color ?? '0xFFFF';
				return {
					parts: [
						[`${pad}${MATRIX_VAR}.fillRect(${x}, ${y}, ${w}, ${h}, ${color});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Print Text ───────────────────────────────────────────────────────
		{
			id: 'matrix_print',
			name: 'Matrix Print',
			color: COLOR_UI,
			icon: '✏️',
			category: 'RGBMatrix',
			description: 'พิมพ์ข้อความที่ตำแหน่ง (x, y) พร้อมกำหนดสีและขนาด font',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'x', type: 'input', label: 'X', dataType: 'int' },
				{ id: 'y', type: 'input', label: 'Y', dataType: 'int' },
				{ id: 'text', type: 'input', label: 'Text', dataType: 'String' },
				{ id: 'color', type: 'input', label: 'Color', dataType: 'int' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'x', type: 'number', label: 'X', default: '0' },
				{ id: 'y', type: 'number', label: 'Y', default: '0' },
				{ id: 'text', type: 'text', label: 'Text', default: 'Hello' },
				{ id: 'color', type: 'color', format: 'rgb565', label: 'Color', default: '0xFFFF' },
				{
					id: 'size', type: 'number', label: 'Text Size', default: '1',
					validation: (n: number) => Math.max(1, Math.trunc(n))
				},
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const x = resolveInput('x') ?? params.x ?? '0';
				const y = resolveInput('y') ?? params.y ?? '0';
				const text = resolveInput('text') ?? `"${(params.text ?? 'Hello').replaceAll('"', '\\"')}"`;
				const color = resolveInput('color') ?? params.color ?? '0xFFFF';
				const size = params.size ?? '1';
				return {
					parts: [
						[
							`${pad}${MATRIX_VAR}.setCursor(${x}, ${y});`,
							`${pad}${MATRIX_VAR}.setTextColor(${color});`,
							`${pad}${MATRIX_VAR}.setTextSize(${size});`,
							`${pad}${MATRIX_VAR}.setTextWrap(false);`,
							`${pad}${MATRIX_VAR}.print(${text});`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Color RGB ────────────────────────────────────────────────────────
		{
			id: 'matrix_color_rgb',
			name: 'Matrix Color RGB',
			color: COLOR_UI,
			icon: '🎨',
			category: 'RGBMatrix',
			description: 'แปลงสี RGB (0–255 ต่อช่อง) เป็นค่าสี 16-bit สำหรับ RGB Matrix (color565)',
			inputs: [
				{ id: 'r', type: 'input', label: 'R', dataType: 'int' },
				{ id: 'g', type: 'input', label: 'G', dataType: 'int' },
				{ id: 'b', type: 'input', label: 'B', dataType: 'int' },
			],
			outputs: [{ id: 'value', type: 'output', label: 'Color', dataType: 'int' }],
			params: [
				{ id: 'r', type: 'number', label: 'R (0–255)', default: '255', validation: (n: number) => Math.max(0, Math.min(255, Math.trunc(n))) },
				{ id: 'g', type: 'number', label: 'G (0–255)', default: '0', validation: (n: number) => Math.max(0, Math.min(255, Math.trunc(n))) },
				{ id: 'b', type: 'number', label: 'B (0–255)', default: '0', validation: (n: number) => Math.max(0, Math.min(255, Math.trunc(n))) },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const id = safeId(block.id);
				const r = resolveInput('r') ?? params.r ?? '255';
				const g = resolveInput('g') ?? params.g ?? '0';
				const b = resolveInput('b') ?? params.b ?? '0';
				return {
					parts: [
						[`${pad}uint16_t ${id} = ${MATRIX_VAR}.color565(${r}, ${g}, ${b});`],
					]
				};
			}
		},

		// ─── Color HSV ────────────────────────────────────────────────────────
		{
			id: 'matrix_color_hsv',
			name: 'Matrix Color HSV',
			color: COLOR_UI,
			icon: '🌈',
			category: 'RGBMatrix',
			description: 'แปลงสี HSV เป็นค่าสี 16-bit สำหรับ RGB Matrix (colorHSV)\nHue 0–65535, Saturation 0–255, Value 0–255',
			inputs: [
				{ id: 'hue', type: 'input', label: 'Hue', dataType: 'int' },
				{ id: 'sat', type: 'input', label: 'Saturation', dataType: 'int' },
				{ id: 'val', type: 'input', label: 'Value', dataType: 'int' },
			],
			outputs: [{ id: 'value', type: 'output', label: 'Color', dataType: 'int' }],
			params: [
				{ id: 'hue', type: 'number', label: 'Hue (0–65535)', default: '0', validation: (n: number) => Math.max(0, Math.min(65535, Math.trunc(n))) },
				{ id: 'sat', type: 'number', label: 'Saturation (0–255)', default: '255', validation: (n: number) => Math.max(0, Math.min(255, Math.trunc(n))) },
				{ id: 'val', type: 'number', label: 'Value (0–255)', default: '255', validation: (n: number) => Math.max(0, Math.min(255, Math.trunc(n))) },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <Adafruit_Protomatter.h>');
				const id = safeId(block.id);
				const hue = resolveInput('hue') ?? params.hue ?? '0';
				const sat = resolveInput('sat') ?? params.sat ?? '255';
				const val = resolveInput('val') ?? params.val ?? '255';
				return {
					parts: [
						[`${pad}uint16_t ${id} = ${MATRIX_VAR}.colorHSV(${hue}, ${sat}, ${val});`],
					]
				};
			}
		},

		// ─── Width / Height ───────────────────────────────────────────────────
		{
			id: 'matrix_width',
			name: 'Matrix Width',
			color: COLOR_UI,
			icon: '↔️',
			category: 'RGBMatrix',
			description: 'ความกว้างของ RGB Matrix (pixel)',
			inputs: [],
			outputs: [{ id: 'value', type: 'output', label: 'Width', dataType: 'int' }],
			toExpr: () => `${MATRIX_VAR}.width()`,
			toCode() { return { parts: [] }; }
		},
		{
			id: 'matrix_height',
			name: 'Matrix Height',
			color: COLOR_UI,
			icon: '↕️',
			category: 'RGBMatrix',
			description: 'ความสูงของ RGB Matrix (pixel)',
			inputs: [],
			outputs: [{ id: 'value', type: 'output', label: 'Height', dataType: 'int' }],
			toExpr: () => `${MATRIX_VAR}.height()`,
			toCode() { return { parts: [] }; }
		},
	]
};

export default rgbMatrixExtension;
