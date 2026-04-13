import type { BlockCategory } from '../types.js';

const COLOR = '#0ea5e9';

/** Global struct tm ที่ใช้ร่วมกันระหว่าง ntp_sync / ntp_get_time / ntp_unix_timestamp */
const NTP_GLOBAL_TM = 'struct tm _ntp_tm;';

const TIMEZONE_OPTIONS = [
	{ label: 'UTC+7 (Asia/Bangkok)', value: '25200' },
	{ label: 'UTC+0 (GMT)', value: '0' },
];

const ntpExtension: BlockCategory = {
	id: 'ntp',
	name: 'NTP',
	blocks: [
		// ─── Begin ────────────────────────────────────────────────────────────
		{
			id: 'ntp_begin',
			name: 'NTP Begin',
			color: COLOR,
			icon: '🕐',
			category: 'ntp',
			description: 'ตั้งค่า NTP server และ timezone แล้วเริ่มซิงก์เวลา (configTime)\nต้องเรียกหลังเชื่อมต่อ WiFi แล้ว',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'server1', type: 'text', label: 'NTP Server 1', default: 'pool.ntp.org', description: 'Primary NTP server' },
				{ id: 'server2', type: 'text', label: 'NTP Server 2', default: 'time.nist.gov', description: 'Secondary NTP server (optional)' },
				{ id: 'server3', type: 'text', label: 'NTP Server 3', default: 'time.google.com', description: 'Tertiary NTP server (optional)' },
				{ id: 'timezone', type: 'option', label: 'Timezone', options: TIMEZONE_OPTIONS, description: 'UTC offset' },
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <time.h>');
				registerGlobal(NTP_GLOBAL_TM);
				const s1 = (params.server1 ?? 'pool.ntp.org').replaceAll('"', '\\"');
				const s2 = (params.server2 ?? 'time.navy.mi.th').replaceAll('"', '\\"');
				const s3 = (params.server3 ?? 'time1.nimt.or.th').replaceAll('"', '\\"');
				const tz = params.timezone ?? '0';
				return {
					parts: [
						[`${pad}configTime(${tz}, 0, "${s1}", "${s2}", "${s3}");`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Sync ─────────────────────────────────────────────────────────────
		{
			id: 'ntp_sync',
			name: 'NTP Sync',
			color: COLOR,
			icon: '🔄',
			category: 'ntp',
			description: 'อ่านเวลาจาก NTP แล้วเก็บไว้ใน _ntp_tm (getLocalTime)\nแยก flow: Synced = ได้เวลาแล้ว, Not Synced = ยังไม่ได้',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [
				{ id: 'synced', type: 'output', label: 'Synced', dataType: 'void', description: 'ซิงก์สำเร็จ — _ntp_tm พร้อมใช้งาน' },
				{ id: 'not_synced', type: 'output', label: 'Not Synced', dataType: 'void', description: 'ยังไม่ซิงก์' },
				{ id: 'out', type: 'output', label: '➜', dataType: 'void', description: 'ต่อเสมอหลัง if/else' },
			],
			toCode({ pad, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <time.h>');
				registerGlobal(NTP_GLOBAL_TM);
				return {
					parts: [
						[`${pad}if (getLocalTime(&_ntp_tm)) {`],
						{ portId: 'synced', depthDelta: 1 },
						[`${pad}} else {`],
						{ portId: 'not_synced', depthDelta: 1 },
						[`${pad}}`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Get Unix Timestamp ───────────────────────────────────────────────
		{
			id: 'ntp_get_unix_timestamp',
			name: 'NTP Get Unix Timestamp',
			color: COLOR,
			icon: '🔢',
			category: 'ntp',
			description: 'คืนค่า Unix timestamp (วินาทีจาก 1970-01-01 00:00:00 UTC) — ต้องเรียก NTP Sync ก่อน',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'value', type: 'output', label: 'Epoch', dataType: 'long', description: 'Unix timestamp (วินาที)' }],
			toCode({ block, pad, safeId, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <time.h>');
				registerGlobal(NTP_GLOBAL_TM);
				const id = safeId(block.id);
				return {
					parts: [
						[`${pad}long ${id} = (long)mktime(&_ntp_tm);`],
						{ portId: 'value', depthDelta: 0 },
					]
				};
			}
		},

		// ─── Get Time (single field) ──────────────────────────────────────────
		{
			id: 'ntp_get_time',
			name: 'NTP Get Time',
			color: COLOR,
			icon: '📅',
			category: 'ntp',
			description: 'อ่านค่าเวลาจาก _ntp_tm — ต้องเรียก NTP Sync ก่อน\nHour 0–23, Minute 0–59, Second 0–59, Day 1–31, Month 1–12, Year ค.ศ.',
			inputs: [{ id: 'in', type: 'input', label: '➜', dataType: 'any' }],
			outputs: [{ id: 'value', type: 'output', label: 'Value', dataType: 'int', description: 'ค่าที่เลือกจาก _ntp_tm' }],
			params: [
				{
					id: 'field', type: 'option', label: 'Field',
					options: [
						{ label: 'Hour (0–23)', value: 'hour' },
						{ label: 'Minute (0–59)', value: 'minute' },
						{ label: 'Second (0–59)', value: 'second' },
						{ label: 'Day (1–31)', value: 'day' },
						{ label: 'Month (1–12)', value: 'month' },
						{ label: 'Year (A.D.)', value: 'year' },
					]
				}
			],
			toExpr(params) {
				const fieldMap: Record<string, string> = {
					hour: '_ntp_tm.tm_hour',
					minute: '_ntp_tm.tm_min',
					second: '_ntp_tm.tm_sec',
					day: '_ntp_tm.tm_mday',
					month: '_ntp_tm.tm_mon + 1',
					year: '_ntp_tm.tm_year + 1900',
				};
				return fieldMap[params.field ?? 'hour'] ?? '_ntp_tm.tm_hour';
			},
			toCode({ block, pad, safeId, params, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <time.h>');
				registerGlobal(NTP_GLOBAL_TM);
				
				return {
					parts: [
						{ portId: 'value', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default ntpExtension;
