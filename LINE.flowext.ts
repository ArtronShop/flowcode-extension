import type { BlockCategory } from '../types.js';

const COLOR = '#16a34a'; // LINE green
const LINE_INST = 'LINE'; // global instance provided by ArtronShop_LineMessaging

const lineExtension: BlockCategory = {
	id: 'line',
	name: 'LINE Message',
	blocks: [
		// ─── Begin ───────────────────────────────────────────────────────────
		{
			id: 'line_begin',
			name: 'LINE Begin',
			color: COLOR,
			icon: '🟢',
			category: 'LINE',
			description: 'เริ่มต้น LINE Messaging API\nระบุ Channel Access Token และเชื่อมต่อ WiFi ก่อนเรียกบล็อกนี้',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'token', type: 'text', label: 'Channel Access Token', default: '', description: 'Token จาก LINE Developers Console' },
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <ArtronShop_LineMessaging.h>');
				const token = (params.token ?? '').replaceAll('"', '\\"');
				return {
					parts: [
						[`${pad}${LINE_INST}.begin("${token}");`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Send ─────────────────────────────────────────────────────────────
		{
			id: 'line_send',
			name: 'LINE Send',
			color: COLOR,
			icon: '💬',
			category: 'LINE',
			description: 'ส่งข้อความไปยังผู้ใช้หรือกลุ่มผ่าน LINE Messaging API (LINE.send)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'to', type: 'input', label: 'To', dataType: 'String', description: 'User ID หรือ Group ID' },
				{ id: 'message', type: 'input', label: 'Message', dataType: 'String', description: 'ข้อความที่จะส่ง' },
			],
			outputs: [
				{ id: 'ok', type: 'output', label: 'OK', dataType: 'void', description: 'ส่งสำเร็จ' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'ส่งไม่สำเร็จ' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void' },
			],
			params: [
				{ id: 'to', type: 'text', label: 'To', default: '', description: 'User ID หรือ Group ID fallback' },
				{ id: 'message', type: 'text', label: 'Message', default: 'Hello from ESP32!', description: 'ข้อความ fallback' },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <ArtronShop_LineMessaging.h>');
				const id = safeId(block.id);
				const to = resolveInput('to') ?? `"${(params.to ?? '').replaceAll('"', '\\"')}"`;
				const message = resolveInput('message') ?? `"${(params.message ?? 'Hello from ESP32!').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[`${pad}if (${LINE_INST}.send(${to}, ${message})) {`],
						{ portId: 'ok', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'error', depthDelta: 1 },
						[`${pad}}`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Send + Image URL ────────────────────────────────────────────────
		{
			id: 'line_send_image',
			name: 'LINE Send Image',
			color: COLOR,
			icon: '🖼️',
			category: 'LINE',
			description: 'ส่งข้อความพร้อมรูปภาพ (URL) ผ่าน LINE Messaging API',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'to', type: 'input', label: 'To', dataType: 'String', description: 'User ID หรือ Group ID' },
				{ id: 'message', type: 'input', label: 'Message', dataType: 'String' },
				{ id: 'image_url', type: 'input', label: 'Image', dataType: 'String', description: 'URL รูปภาพ (https)' },
			],
			outputs: [
				{ id: 'ok', type: 'output', label: 'OK', dataType: 'void' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void' },
			],
			params: [
				{ id: 'to', type: 'text', label: 'To', default: '' },
				{ id: 'message', type: 'text', label: 'Message', default: 'Image from ESP32' },
				{ id: 'image_url', type: 'text', label: 'Image URL', default: 'https://example.com/image.jpg' },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <ArtronShop_LineMessaging.h>');
				const id = safeId(block.id);
				const to = resolveInput('to') ?? `"${(params.to ?? '').replaceAll('"', '\\"')}"`;
				const message = resolveInput('message') ?? `"${(params.message ?? '').replaceAll('"', '\\"')}"`;
				const imageUrl = resolveInput('image_url') ?? `"${(params.image_url ?? '').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[`${pad}LINE_Messaging_Massage_Option_t ${id}_opt;`],
						[`${pad}${id}_opt.image.URL = ${imageUrl};`],
						[`${pad}if (${LINE_INST}.send(${to}, ${message}, &${id}_opt)) {`],
						{ portId: 'ok', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'error', depthDelta: 1 },
						[`${pad}}`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Send + Map ────────────────────────────────────────────────
		{
			id: 'line_send_map',
			name: 'LINE Send Map',
			color: COLOR,
			icon: '📍',
			category: 'LINE',
			description: 'ส่งข้อความพร้อมแผนที่ผ่าน LINE Messaging API',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'to', type: 'input', label: 'To', dataType: 'String', description: 'User ID หรือ Group ID' },
				{ id: 'message', type: 'input', label: 'Message', dataType: 'String' },
				{ id: 'lat', type: 'input', label: 'Latitude', dataType: 'float', description: 'Latitude' },
				{ id: 'lng', type: 'input', label: 'Longitude', dataType: 'float', description: 'Longitude' },
			],
			outputs: [
				{ id: 'ok', type: 'output', label: 'OK', dataType: 'void' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void' },
			],
			params: [
				{ id: 'to', type: 'text', label: 'To', default: '' },
				{ id: 'message', type: 'text', label: 'Message', default: 'Image from ESP32' },
				{ id: 'service', type: 'option', label: 'Map Service', options: [
					{ label: 'Longdo Map', value: 'LONGDO_MAP' },
					{ label: 'Google Map', value: 'GOOGLE_MAP' },
				]},
				{ id: 'apikey', type: 'text', label: 'API Key', default: '--API Key--', hidden: ({ params }) => params.service !== 'GOOGLE_MAP' },
				{ id: 'lat', type: 'number', label: 'Latitude', default: '13.910216086303118' },
				{ id: 'lng', type: 'number', label: 'Longitude', default: '100.51109150490085' },
				{ id: 'zoom', type: 'number', label: 'Zoom (1-20)', default: '20', validation: n => Math.max(1, Math.min(n, 20)) },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <ArtronShop_LineMessaging.h>');
				const id = safeId(block.id);
				const to = resolveInput('to') ?? `"${(params.to ?? '').replaceAll('"', '\\"')}"`;
				const message = resolveInput('message') ?? `"${(params.message ?? '').replaceAll('"', '\\"')}"`;
				const service = params.service ?? 'LONGDO_MAP';
				const lat = resolveInput('lat') ?? params.lat ?? '0';
				const lng = resolveInput('lng') ?? params.lng ?? '0';
				const zoom = params.zoom ?? '20';
				const apikey = `"${(params.apikey ?? '').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[`${pad}LINE_Messaging_Massage_Option_t ${id}_opt;`],
						[`${pad}${id}_opt.map.service = ${service};`],
						[`${pad}${id}_opt.map.lat = ${lat};`],
						[`${pad}${id}_opt.map.lng = ${lng};`],
						[`${pad}${id}_opt.map.zoom = ${zoom};`],
						[service === 'GOOGLE_MAP' ? `${pad}${id}_optn.map.api_key = ${apikey};` : ''].filter(a => a.length > 0),
						[`${pad}if (${LINE_INST}.send(${to}, ${message}, &${id}_opt)) {`],
						{ portId: 'ok', depthDelta: 1 },
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

export default lineExtension;
