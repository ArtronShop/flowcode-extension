import type { BlockCategory } from '../types.js';

const COLOR = '#c026d3';

// ─── Helper: แปลง MAC-style string → C byte array literal ────────────────────
function parseMacBytes(mac: string): string {
	const b = mac.split(':').map((x) => `0x${x.toUpperCase().padStart(2, '0')}`);
	return b.length === 6 ? b.join(', ') : '0x00,0x00,0x00,0x00,0x00,0x00';
}

const mqttExtension: BlockCategory = {
	id: 'mqtt',
	name: 'MQTT',
	blocks: [
		// ─── Setup ────────────────────────────────────────────────────────
		{
			id: 'mqtt_begin',
			name: 'MQTT Begin',
			color: COLOR,
			icon: '📡',
			category: 'mqtt',
			description: 'กำหนด MQTT broker และสร้าง PubSubClient — เรียกใน setup() ก่อนบล็อกอื่น\nต้องมี WiFiClient global อยู่ก่อน (เช่น ต่อหลัง WiFi Begin)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'client_id', type: 'input', label: 'Client ID', dataType: 'String' },
				{ id: 'username', type: 'input', label: 'Username', dataType: 'String', description: 'ว่าง = ไม่ใช้' },
				{ id: 'password', type: 'input', label: 'Password', dataType: 'String', description: 'ว่าง = ไม่ใช้' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'broker', type: 'text', label: 'Broker', default: 'broker.emqx.io', description: 'IP หรือ hostname ของ MQTT broker' },
				{ id: 'port', type: 'number', label: 'Port', default: '1883', description: 'port ของ broker (1883 = ไม่เข้ารหัส)' },
				{ id: 'client_id', type: 'text', label: 'Client ID', default: 'esp32_client' },
				{ id: 'username', type: 'text', label: 'Username', default: '', description: 'ว่าง = ไม่ใช้' },
				{ id: 'password', type: 'text', label: 'Password', default: '', description: 'ว่าง = ไม่ใช้' },
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode, resolveInput }) {
				const wificlient = params.wificlient ?? 'tcpClient';
				const broker = (params.broker ?? '192.168.1.1').replaceAll('"', '\\"');
				const port = params.port ?? '1883';
				const clientId = resolveInput('client_id') ?? `"${(params.client_id ?? 'esp32_client').replaceAll('"', '\\"')}"`;
				const username = resolveInput('username') ?? `"${(params.username ?? '').replaceAll('"', '\\"')}"`;
				const password = resolveInput('password') ?? `"${(params.password ?? '').replaceAll('"', '\\"')}"`;
				
				registerPreprocessor('#include <WiFi.h>');
				registerPreprocessor('#include <PubSubClient.h>');

				registerGlobal(`WiFiClient ${wificlient};`);
				registerGlobal(`PubSubClient mqtt(${wificlient});`);

				registerGlobal(`String mqtt_client = "esp32_client";`);
				registerGlobal(`String mqtt_username = "";`);
				registerGlobal(`String mqtt_password = "";`);

				registerPollingCode([
					'if (mqtt.connected()) {',
					'  mqtt.loop();',
					'} else {',
					'#ifdef MQTT_ON_DISCONNECT_CB',
					'  MQTT_ON_DISCONNECT_CB();',
					'#endif',
					'  bool connected = mqtt.connect(mqtt_client.c_str(), mqtt_username.length() > 0 ? mqtt_username.c_str() : NULL, mqtt_password.length() > 0 ? mqtt_password.c_str() : NULL);',
					'  if (connected) {',
					'#ifdef MQTT_ON_CONNECTED_CB',
					'    MQTT_ON_CONNECTED_CB();',
					'#endif',
					'  }',
					'}'
				].join('\n'));

				return {
					parts: [
						[
							`${pad}mqtt.setServer("${broker}", ${port});`,
							`${pad}mqtt_client = ${clientId};`,
							`${pad}mqtt_username = ${username};`,
							`${pad}mqtt_password = ${password};`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
		{
			id: 'mqtt_on_connected',
			name: 'MQTT On Connected',
			trigger: true,
			color: COLOR,
			icon: '🔗',
			category: 'mqtt',
			description: 'เมื่อเชื่อมต่อ MQTT broker สำเร็จ',
			inputs: [],
			outputs: [
				{ id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'บล็อกที่ต้องการให้ทำงานเมื่อเชื่อมต่อ MQTT สำเร็จ' },
			],
			toCode({ captureCode, registerFunction, registerPreprocessor }) {
				const body = captureCode('out', 1) ?? '';

				registerFunction(
					'void on_mqtt_connected()',
					body,
					'void on_mqtt_connected() ;'
				);
				
				registerPreprocessor("#define MQTT_ON_CONNECTED_CB on_mqtt_connected")

				return {
					parts: [

					]
				};
			}
		},
		{
			id: 'mqtt_on_disconnect',
			name: 'MQTT On Disconnect',
			trigger: true,
			color: COLOR,
			icon: '🔗',
			category: 'mqtt',
			description: 'เมื่อหลุดการเชื่อมต่อ MQTT broker',
			inputs: [],
			outputs: [
				{ id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'บล็อกที่ต้องการให้ทำงานเมื่อหลุดการเชื่อมต่อ MQTT' },
			],
			toCode({ captureCode, registerFunction, registerPreprocessor }) {
				const body = captureCode('out', 1) ?? '';

				registerFunction(
					'void on_mqtt_disconnect()',
					body,
					'void on_mqtt_disconnect() ;'
				);

				registerPreprocessor("#define MQTT_ON_DISCONNECT_CB on_mqtt_disconnect")

				return {
					parts: [

					]
				};
			}
		},
		{
			id: 'mqtt_is_connected',
			name: 'MQTT Is Connected',
			color: COLOR,
			icon: '✅',
			category: 'mqtt',
			description: 'ตรวจสอบว่าเชื่อมต่อ broker อยู่หรือไม่ (mqttClient.connected)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'connected', type: 'output', label: 'Connected', dataType: 'void' },
				{ id: 'disconnected', type: 'output', label: 'Disconnected', dataType: 'void' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void' },
			],
			toCode({ pad }) {
				return {
					parts: [
						[`${pad}if (mqtt.connected()) {`],
						{ portId: 'connected', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'disconnected', depthDelta: 1 },
						[`${pad}}`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Publish ──────────────────────────────────────────────────────
		{
			id: 'mqtt_publish',
			name: 'MQTT Publish',
			color: COLOR,
			icon: '📤',
			category: 'mqtt',
			description: 'ส่ง message ไปยัง topic (mqttClient.publish)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any', description: 'รับสายลำดับการทำงานจากบล็อกก่อนหน้า' },
				{ id: 'payload', type: 'input', label: 'Payload', dataType: 'any', description: 'ข้อมูลที่จะส่ง' },
			],
			outputs: [
				{ id: 'ok', type: 'output', label: 'OK', dataType: 'void', description: 'ส่งสำเร็จ' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'ส่งไม่สำเร็จ' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'ส่งต่อเสมอหลัง if/else' },
			],
			params: [
				{ id: 'topic', type: 'text', label: 'Topic', default: 'sensors/temp' },
				{ id: 'payload', type: 'text', label: 'Payload', default: '', description: 'ใช้เมื่อไม่มีบล็อกต่อเข้ามา' },
				{
					id: 'retained', type: 'option', label: 'Retain',
					options: [{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }],
					description: 'ให้ broker เก็บ message ล่าสุดไว้หรือไม่'
				},
			],
			toCode({ block, safeId, pad, params, resolveInput }) {
				const id = safeId(block.id);
				const topic = (params.topic ?? 'sensors/temp').replaceAll('"', '\\"');
				const retained = params.retained ?? 'false';
				const payload = resolveInput('payload') ?? `"${(params.payload ?? '').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[`${pad}String ${id}_payload = String(${payload});`],
						[`${pad}if (mqtt.publish("${topic}", ${id}_payload.c_str(), ${retained})) {`],
						{ portId: 'ok', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'error', depthDelta: 1 },
						[`${pad}}`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Subscribe ────────────────────────────────────────────────────
		{
			id: 'mqtt_subscribe',
			name: 'MQTT Subscribe',
			color: COLOR,
			icon: '📥',
			category: 'mqtt',
			description: 'Subscribe topic เพื่อรับ message (mqttClient.subscribe) — ควรเรียกหลัง connect',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'topic', type: 'text', label: 'Topic', default: 'commands/#', description: 'topic ที่ต้องการ subscribe (รองรับ wildcard + และ #)' },
				{
					id: 'qos', type: 'option', label: 'QoS',
					options: [{ label: 'QoS 0', value: '0' }, { label: 'QoS 1', value: '1' }],
					description: 'Quality of Service'
				},
			],
			toCode({ pad, params }) {
				const topic = (params.topic ?? 'commands/#').replaceAll('"', '\\"');
				const qos = params.qos ?? '0';
				return {
					parts: [
						[`${pad}mqtt.subscribe("${topic}", ${qos});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
		{
			id: 'mqtt_unsubscribe',
			name: 'MQTT Unsubscribe',
			color: COLOR,
			icon: '🔕',
			category: 'mqtt',
			description: 'ยกเลิกการ subscribe topic (mqttClient.unsubscribe)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'topic', type: 'text', label: 'Topic', default: 'commands/#' },
			],
			toCode({ pad, params }) {
				const topic = (params.topic ?? 'commands/#').replaceAll('"', '\\"');
				return {
					parts: [
						[`${pad}mqtt.unsubscribe("${topic}");`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Received message helpers ─────────────────────────────────────
		{
			id: 'mqtt_on_received',
			name: 'MQTT On Received',
			color: COLOR,
			icon: '🔔',
			category: 'mqtt',
			trigger: true,
			description: 'ลงทะเบียน callback ที่เรียกเมื่อรับ message จาก broker\nภายใน handler: _mqtt_topic (String), _mqtt_payload (String)',
			inputs: [],
			outputs: [
				{ id: 'handler', type: 'output', label: '➜', dataType: 'any', description: 'โค้ดที่รันเมื่อรับ message' },
			],
			toCode({ pad, block, safeId, params, captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <PubSubClient.h>');
				const id = safeId(block.id);
				const fnName = `_mqtt_cb_${id}`;
				const body = captureCode('handler', 1);
				registerFunction(
					`void ${fnName}(char* _raw_topic, byte* _raw_payload, unsigned int _raw_len)`,
					[
						`  String _mqtt_topic = String(_raw_topic);`,
						`  String _mqtt_payload = "";`,
						`  for (unsigned int i = 0; i < _raw_len; i++) _mqtt_payload += (char)_raw_payload[i];`,
						body,
					].filter(Boolean).join('\n'),
					`void ${fnName}(char*, byte*, unsigned int);`
				);
				return {
					parts: [
						[`${pad}mqtt.setCallback(${fnName});`],
					]
				};
			}
		},
		{
			id: 'mqtt_recv_topic',
			name: 'MQTT Received Topic',
			color: COLOR,
			icon: '🏷️',
			category: 'mqtt',
			description: 'รับ topic ของ message ที่เข้ามา (_mqtt_topic) — ใช้ภายใน Set Callback handler เท่านั้น',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'topic', type: 'output', label: 'Topic', dataType: 'String' }],
			toExpr: () => '_mqtt_topic',
			toCode({ pad, block, safeId }) {
				const id = safeId(block.id);
				return {
					parts: [
						// [`${pad}String ${id} = _mqtt_topic;`],
						{ portId: 'topic', depthDelta: 0 },
					]
				};
			}
		},
		{
			id: 'mqtt_recv_payload',
			name: 'MQTT Received Payload',
			color: COLOR,
			icon: '📨',
			category: 'mqtt',
			description: 'รับ payload ของ message ที่เข้ามา (_mqtt_payload) — ใช้ภายใน Set Callback handler เท่านั้น',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'payload', type: 'output', label: 'Payload', dataType: 'String' }],
			toExpr: () => '_mqtt_payload',
			toCode({ pad, block, safeId }) {
				const id = safeId(block.id);
				return {
					parts: [
						// [`${pad}String ${id} = _mqtt_payload;`],
						{ portId: 'payload', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Disconnect ───────────────────────────────────────────────────
		{
			id: 'mqtt_disconnect',
			name: 'MQTT Disconnect',
			color: COLOR,
			icon: '🔌',
			category: 'mqtt',
			description: 'ตัดการเชื่อมต่อ MQTT broker (mqttClient.disconnect)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ pad, params }) {
				return {
					parts: [
						[`${pad}mqtt.disconnect();`],
						['#ifdef MQTT_ON_DISCONNECT_CB'],
						[`${pad}MQTT_ON_DISCONNECT_CB();`],
						['#endif'],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default mqttExtension;
