import type { BlockCategory } from '../types.js';

const COLOR = '#7c3aed'; // violet

const WS_VAR = '_ws';
const WS_PAYLOAD = '_ws_payload';
const WS_CLIENT = '_ws_client_id';

const websocketExtension: BlockCategory = {
	id: 'websocket',
	name: 'WebSocket',
	blocks: [
		// ─── Server Begin ─────────────────────────────────────────────────────
		{
			id: 'ws_begin',
			name: 'WS Server Begin',
			color: COLOR,
			icon: '🔌',
			category: 'WebSocket',
			description: 'เริ่มต้น WebSocket Server\nClientเชื่อมได้ที่ ws://<ip>:<port>',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'port', type: 'number', label: 'Port', default: '81',
					description: 'Port ของ WebSocket Server (ต้องต่างจาก HTTP port)',
					validation: (n: number) => Math.trunc(n),
				},
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal, registerFunction, registerPollingCode }) {
				registerPreprocessor('#include <WebSocketsServer.h>');

				const port = params.port ?? '81';

				registerGlobal(`WebSocketsServer ${WS_VAR}(${port});`);
				registerGlobal(`String ${WS_PAYLOAD} = "";`);
				registerGlobal(`uint8_t ${WS_CLIENT} = 0;`);

				registerFunction(
					`void _ws_event(uint8_t num, WStype_t type, uint8_t* payload, size_t length)`,
					[
						`  ${WS_CLIENT} = num;`,
						`  if (type == WStype_CONNECTED) {`,
						`#ifdef WS_ON_CONNECTED_CB`,
						`    WS_ON_CONNECTED_CB();`,
						`#endif`,
						`  } else if (type == WStype_DISCONNECTED) {`,
						`#ifdef WS_ON_DISCONNECTED_CB`,
						`    WS_ON_DISCONNECTED_CB();`,
						`#endif`,
						`  } else if (type == WStype_TEXT) {`,
						`    ${WS_PAYLOAD} = String((char*)payload);`,
						`#ifdef WS_ON_MESSAGE_CB`,
						`    WS_ON_MESSAGE_CB();`,
						`#endif`,
						`  }`,
					].join('\n'),
					`void _ws_event(uint8_t, WStype_t, uint8_t*, size_t);`
				);

				registerPollingCode(`${WS_VAR}.loop();`);

				return {
					parts: [
						[
							`${pad}${WS_VAR}.begin();`,
							`${pad}${WS_VAR}.onEvent(_ws_event);`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── On Connected ────────────────────────────────────────────────────
		{
			id: 'ws_on_connected',
			name: 'WS On Connected',
			trigger: true,
			color: COLOR,
			icon: '🟢',
			category: 'WebSocket',
			description: 'เรียกเมื่อ WebSocket client เชื่อมต่อเข้ามา\nใช้ WS Client ID เพื่ออ่านหมายเลข client',
			inputs:  [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <WebSocketsServer.h>');
				const body = captureCode('out', 1);
				registerFunction(
					'void _ws_on_connected()',
					body,
					'void _ws_on_connected();'
				);
				registerPreprocessor('#define WS_ON_CONNECTED_CB _ws_on_connected');
				return { parts: [] };
			}
		},

		// ─── On Disconnected ─────────────────────────────────────────────────
		{
			id: 'ws_on_disconnected',
			name: 'WS On Disconnected',
			trigger: true,
			color: COLOR,
			icon: '🔴',
			category: 'WebSocket',
			description: 'เรียกเมื่อ WebSocket client ตัดการเชื่อมต่อ\nใช้ WS Client ID เพื่ออ่านหมายเลข client',
			inputs:  [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <WebSocketsServer.h>');
				const body = captureCode('out', 1);
				registerFunction(
					'void _ws_on_disconnected()',
					body,
					'void _ws_on_disconnected();'
				);
				registerPreprocessor('#define WS_ON_DISCONNECTED_CB _ws_on_disconnected');
				return { parts: [] };
			}
		},

		// ─── On Message ──────────────────────────────────────────────────────
		{
			id: 'ws_on_message',
			name: 'WS On Message',
			trigger: true,
			color: COLOR,
			icon: '📨',
			category: 'WebSocket',
			description: 'เรียกเมื่อรับข้อความจาก WebSocket client\nใช้ WS Payload และ WS Client ID เพื่ออ่านข้อมูล',
			inputs: [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <WebSocketsServer.h>');
				const body = captureCode('out', 1);
				registerFunction(
					'void _ws_on_message()',
					body,
					'void _ws_on_message();'
				);
				registerPreprocessor('#define WS_ON_MESSAGE_CB _ws_on_message');
				return { parts: [] };
			}
		},

		// ─── Payload ─────────────────────────────────────────────────────────
		{
			id: 'ws_payload',
			name: 'WS Payload',
			color: COLOR,
			icon: '📦',
			category: 'WebSocket',
			description: 'ข้อความที่ได้รับจาก WebSocket client (_ws_payload)\nใช้ภายใน WS On Message เท่านั้น',
			inputs: [],
			outputs: [{ id: 'value', type: 'output', label: 'Payload', dataType: 'String' }],
			toExpr: () => WS_PAYLOAD,
			toCode() { return { parts: [] }; }
		},

		// ─── Client ID ───────────────────────────────────────────────────────
		{
			id: 'ws_client_id',
			name: 'WS Client ID',
			color: COLOR,
			icon: '🆔',
			category: 'WebSocket',
			description: 'หมายเลข client ที่ส่งข้อความมา (_ws_client_id)\nใช้ส่งกลับหา client เดิมด้วย WS Send',
			inputs: [],
			outputs: [{ id: 'value', type: 'output', label: 'Client ID', dataType: 'int' }],
			toExpr: () => WS_CLIENT,
			toCode() { return { parts: [] }; }
		},

		// ─── Send to Client ───────────────────────────────────────────────────
		{
			id: 'ws_send',
			name: 'WS Send',
			color: COLOR,
			icon: '📤',
			category: 'WebSocket',
			description: 'ส่งข้อความไปยัง WebSocket client ที่ระบุ (ws.sendTXT)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'client_id', type: 'input', label: 'Client ID', dataType: 'int', description: 'หมายเลข client ที่ต้องการส่ง' },
				{ id: 'message', type: 'input', label: 'Message', dataType: 'any', description: 'ข้อความที่จะส่ง' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{
					id: 'client_id', type: 'number', label: 'Client ID', default: '0',
					validation: (n: number) => Math.max(0, Math.trunc(n)),
				},
				{ id: 'message', type: 'text', label: 'Message', default: 'Hello' },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <WebSocketsServer.h>');
				registerGlobal(`WebSocketsServer ${WS_VAR}(81);`);
				const id = safeId(block.id);
				const cid = resolveInput('client_id') ?? params.client_id ?? '0';
				const message = resolveInput('message') ?? `"${(params.message ?? 'Hello').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[
							`${pad}String ${id}_msg = String(${message});`,
							`${pad}${WS_VAR}.sendTXT(${cid}, ${id}_msg);`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Broadcast ───────────────────────────────────────────────────────
		{
			id: 'ws_broadcast',
			name: 'WS Broadcast',
			color: COLOR,
			icon: '📡',
			category: 'WebSocket',
			description: 'ส่งข้อความไปยัง WebSocket client ทุกตัวที่เชื่อมต่ออยู่ (ws.broadcastTXT)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'message', type: 'input', label: 'Message', dataType: 'any' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'message', type: 'text', label: 'Message', default: 'Hello' },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <WebSocketsServer.h>');
				registerGlobal(`WebSocketsServer ${WS_VAR}(81);`);
				const id = safeId(block.id);
				const message = resolveInput('message') ?? `"${(params.message ?? 'Hello').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[
							`${pad}String ${id}_msg = String(${message});`,
							`${pad}${WS_VAR}.broadcastTXT(${id}_msg);`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default websocketExtension;
