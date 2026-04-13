import type { BlockCategory, ParamVarname } from '../types.js';

const COLOR = '#a855f7'; // purple

// ─── Shared param definitions ─────────────────────────────────────────────────
const pointParam: ParamVarname = {
	id: 'point',
	label: 'Point',
	type: 'varname',
	category: 'influxdb_point',
	default: 'sensorPoint',
	description: 'ชื่อตัวแปร Point',
};

const influxdbExtension: BlockCategory = {
	id: 'influxdb',
	name: 'InfluxDB',
	blocks: [

		// ─── Begin ───────────────────────────────────────────────────────────
		{
			id: 'influxdb_begin',
			name: 'InfluxDB Begin',
			color: COLOR,
			icon: '🗄️',
			category: 'influxdb',
			description: 'กำหนดการเชื่อมต่อ InfluxDB v2 (setConnectionParams)\nต้องเรียกหลังเชื่อมต่อ WiFi แล้ว',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'url', type: 'text', label: 'Server URL', default: 'http://192.168.0.1:8086', description: 'URL ของ InfluxDB server เช่น https://cloud2.influxdata.com' },
				{ id: 'token', type: 'text', label: 'Auth Token', default: '', description: 'API Token จาก InfluxDB (ไม่เก็บไว้ใน code ที่ใช้งานจริง)' },
				{ id: 'org', type: 'text', label: 'Organisation', default: 'myOrg', description: 'Organisation name หรือ Org ID' },
				{ id: 'bucket', type: 'text', label: 'Bucket', default: 'myBucket', description: 'Bucket ที่ต้องการเขียนข้อมูล' },
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <InfluxDbClient.h>');
				const url = (params.url ?? '').replaceAll('"', '\\"');
				const token = (params.token ?? '').replaceAll('"', '\\"');
				const org = (params.org ?? '').replaceAll('"', '\\"');
				const bucket = (params.bucket ?? '').replaceAll('"', '\\"');
				registerGlobal(`InfluxDBClient influxClient("${url}", "${org}", "${bucket}", "${token}");`);
				const lines: string[] = [];
				if (url.startsWith('https://')) {
					lines.push(`${pad}influxClient.setInsecure();`);
				}
				return {
					parts: [
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Create Point ─────────────────────────────────────────────────────
		{
			id: 'influxdb_create_point',
			name: 'InfluxDB Create Point',
			color: COLOR,
			icon: '📍',
			category: 'influxdb',
			description: 'ประกาศตัวแปร Point และ clearFields เพื่อเตรียมเขียนข้อมูลใหม่\nเรียกก่อน Add Field ทุกครั้ง',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				pointParam,
				{ id: 'measurement', type: 'text', label: 'Measurement', default: 'sensor', description: 'ชื่อ measurement (กำหนดตอน declare ไม่สามารถเปลี่ยนได้ที่ runtime)' },
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <InfluxDbClient.h>');
				const point = params.point ?? 'sensorPoint';
				const measurement = (params.measurement ?? 'sensor').replaceAll('"', '\\"');
				registerGlobal(`Point ${point}("${measurement}");`);
				return {
					parts: [
						[`${pad}${point}.clearFields();`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Clear Fields ─────────────────────────────────────────────────────
		{
			id: 'influxdb_clear_fields',
			name: 'InfluxDB Clear Fields',
			color: COLOR,
			icon: '🗑️',
			category: 'influxdb',
			description: 'ล้าง fields ทั้งหมดออกจาก Point (point.clearFields)',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [pointParam],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <InfluxDbClient.h>');
				const point = params.point ?? 'sensorPoint';
				return {
					parts: [
						[`${pad}${point}.clearFields();`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
		// ─── Add Tag ────────────────────────────────────────────────────────
		{
			id: 'influxdb_add_tag',
			name: 'InfluxDB Add Tag',
			color: COLOR,
			icon: '➕',
			category: 'influxdb',
			description: 'เพิ่ม Tag เข้า Point (point.addField)',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'tag', type: 'input', label: 'Tag', dataType: 'any' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				pointParam,
				{ id: 'tag_name', type: 'text', label: 'Tag Name', default: 'device', description: 'ชื่อ field ใน InfluxDB' },
				{ id: 'tag', type: 'text', label: 'Tag', default: 'ESP32', description: 'ค่าที่ใช้เมื่อไม่มีสายต่อเข้า Value port' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor }) {
				registerPreprocessor('#include <InfluxDbClient.h>');
				const point = params.point ?? 'sensorPoint';
				const fieldName = (params.field_name ?? 'temperature').replaceAll('"', '\\"');
				const tag = resolveInput('tag') ?? params.tag ?? '0';

				return {
					parts: [
						[`${pad}${point}.addTag("${fieldName}", ${tag});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
		// ─── Add Field ────────────────────────────────────────────────────────
		{
			id: 'influxdb_add_field',
			name: 'InfluxDB Add Field',
			color: COLOR,
			icon: '➕',
			category: 'influxdb',
			description: 'เพิ่ม field เข้า Point (point.addField)\nเลือก Data Type ให้ตรงกับข้อมูลที่ต่อเข้ามา',
			inputs: [
				{ id: 'in', type: 'input', label: '➜', dataType: 'any' },
				{ id: 'value', type: 'input', label: 'Value', dataType: 'any' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				pointParam,
				{ id: 'field_name', type: 'text', label: 'Field Name', default: 'temperature', description: 'ชื่อ field ใน InfluxDB' },
				{ id: 'value', type: 'number', label: 'Value', default: '0', description: 'ค่าที่ใช้เมื่อไม่มีสายต่อเข้า Value port' },
			],
			toCode({ pad, params, resolveInput, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <InfluxDbClient.h>');
				const point = params.point ?? 'sensorPoint';
				const fieldName = (params.field_name ?? 'temperature').replaceAll('"', '\\"');
				const value = resolveInput('value') ?? params.value ?? '0';

				return {
					parts: [
						[`${pad}${point}.addField("${fieldName}", ${value});`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Write Point ──────────────────────────────────────────────────────
		{
			id: 'influxdb_write_point',
			name: 'InfluxDB Write Point',
			color: COLOR,
			icon: '📤',
			category: 'influxdb',
			description: 'เขียน Point ไปยัง InfluxDB (client.writePoint)\nแยก flow: OK = สำเร็จ, Error = ล้มเหลว',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'ok', type: 'output', label: 'OK', dataType: 'void', description: 'เขียนสำเร็จ' },
				{ id: 'error', type: 'output', label: 'Error', dataType: 'void', description: 'เขียนล้มเหลว' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'ต่อเสมอหลัง if/else' },
			],
			params: [
				pointParam,
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <InfluxDbClient.h>');
				const point = params.point ?? 'sensorPoint';
				return {
					parts: [
						[`${pad}if (influxClient.writePoint(${point})) {`],
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

export default influxdbExtension;