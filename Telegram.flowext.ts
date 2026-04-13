import type { BlockCategory } from '../types.js';

const COLOR = '#2563eb'; // blue (Telegram brand)

const TG_BOT   = '_tg_bot';
const TG_SEC   = '_tg_secure';
const TG_DELAY = '_tg_delay';

const telegramExtension: BlockCategory = {
	id: 'telegram',
	name: 'Telegram Bot',
	blocks: [
		// ─── Begin ───────────────────────────────────────────────────────────
		{
			id: 'telegram_begin',
			name: 'Telegram Begin',
			color: COLOR,
			icon: '🤖',
			category: 'Telegram',
			description: 'เริ่มต้น Telegram Bot',
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'token', type: 'text', label: 'Bot Token', default: '-- Bot Token --', description: 'Token จาก @BotFather' },
				{
					id: 'poll_interval', type: 'number', label: 'Poll Interval (ms)', default: '1000',
					description: 'ความถี่ในการดึงข้อความใหม่ (ms)',
					validation: (n: number) => Math.max(200, Math.trunc(n)),
				},
			],
			toCode({ pad, params, registerPreprocessor, registerGlobal, registerPollingCode }) {
				registerPreprocessor('#include <WiFi.h>');
				registerPreprocessor('#include <WiFiClientSecure.h>');
				registerPreprocessor('#include <UniversalTelegramBot.h>');

				const token    = (params.token ?? '').replaceAll('"', '\\"');
				const interval = params.poll_interval ?? '1000';

				registerGlobal(`WiFiClientSecure ${TG_SEC};`);
				registerGlobal(`UniversalTelegramBot ${TG_BOT}("${token}", ${TG_SEC});`);
				registerGlobal(``);
				registerGlobal('String _tg_chat_id = "";');
				registerGlobal('String _tg_text = "";');

				registerPollingCode([
					`if (WiFi.connected()) { // Telegram Bot Polling`,
					`  static unsigned long _tg_last_time = 0;`,
					`  if (millis() - _tg_last_time > ${interval}) {`,
					`    int _tg_n = ${TG_BOT}.getUpdates(${TG_BOT}.last_message_received + 1);`,
					`    while (_tg_n) {`,
					`      for (int _tg_i = 0; _tg_i < _tg_n; _tg_i++) {`,
					`        _tg_chat_id = ${TG_BOT}.messages[_tg_i].chat_id;`,
					`        _tg_text    = ${TG_BOT}.messages[_tg_i].text;`,
					`#ifdef TG_ON_MESSAGE_CB`,
					`        TG_ON_MESSAGE_CB();`,
					`#endif`,
					`      }`,
					`      _tg_n = ${TG_BOT}.getUpdates(${TG_BOT}.last_message_received + 1);`,
					`    }`,
					`    _tg_last_time = millis();`,
					`  }`,
					`}`,
				].join('\n'));

				return {
					parts: [
						[`${pad}${TG_SEC}.setInsecure();`],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},

		// ─── On Message ──────────────────────────────────────────────────────
		{
			id: 'telegram_on_message',
			name: 'Telegram On Message',
			trigger: true,
			color: COLOR,
			icon: '📨',
			category: 'Telegram',
			description: 'เรียกเมื่อรับข้อความจาก Telegram ใช้ Telegram Chat ID และ Telegram Text เพื่ออ่านข้อมูลจากข้อความ',
			inputs:  [],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			toCode({ captureCode, registerPreprocessor, registerFunction }) {
				registerPreprocessor('#include <UniversalTelegramBot.h>');
				const body = captureCode('out', 1);
				registerFunction(
					'void _tg_on_message()',
					body,
					'void _tg_on_message() ;'
				);
				registerPreprocessor('#define TG_ON_MESSAGE_CB _tg_on_message');
				return { parts: [] };
			}
		},

		// ─── Chat ID ─────────────────────────────────────────────────────────
		{
			id: 'telegram_chat_id',
			name: 'Telegram Get Chat ID',
			color: COLOR,
			icon: '🆔',
			category: 'Telegram',
			description: 'อ่าน Chat ID ของผู้ส่งข้อความ',
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'value', type: 'output', label: 'Chat ID', dataType: 'String' }],
			toExpr: () => '_tg_chat_id',
			toCode() { 
				return { 
					parts: [
						{ portId: 'value', depthDelta: 0 },
					]
				}; 
			}
		},

		// ─── Text ────────────────────────────────────────────────────────────
		{
			id: 'telegram_text',
			name: 'Telegram Get Message',
			color: COLOR,
			icon: '💬',
			category: 'Telegram',
			description: 'อ่านข้อความที่ผู้ใช้ส่งมา (_tg_text) — ใช้ภายใน On Message เท่านั้น',
			inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
			outputs: [{ id: 'value', type: 'output', label: 'Text', dataType: 'String' }],
			toExpr: () => '_tg_text',
			toCode() { 
				return { 
					parts: [
						{ portId: 'value', depthDelta: 0 },
					]
				}; 
			}
		},

		// ─── Send Message ────────────────────────────────────────────────────
		{
			id: 'telegram_send',
			name: 'Telegram Send',
			color: COLOR,
			icon: '📤',
			category: 'Telegram',
			description: 'ส่งข้อความออก Telegram',
			inputs: [
				{ id: 'in',      type: 'input', label: '➜',       dataType: 'any',    },
				{ id: 'chat_id', type: 'input', label: 'Chat ID', dataType: 'String', description: 'Chat ID ผู้รับ' },
				{ id: 'message', type: 'input', label: 'Message', dataType: 'String', description: 'ข้อความที่ต้องการส่ง' },
			],
			outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
			params: [
				{ id: 'chat_id', type: 'text', label: 'Chat ID',  default: '',      description: 'Chat ID fallback' },
				{ id: 'message', type: 'text', label: 'Message',  default: 'Hello', description: 'ข้อความ fallback' },
			],
			toCode({ block, pad, safeId, params, resolveInput, registerPreprocessor, registerGlobal }) {
				registerPreprocessor('#include <UniversalTelegramBot.h>');
				registerGlobal(`WiFiClientSecure ${TG_SEC};`);
				registerGlobal(`UniversalTelegramBot ${TG_BOT}("", ${TG_SEC});`);
				const id      = safeId(block.id);
				const chatId  = resolveInput('chat_id') ?? `"${(params.chat_id ?? '').replaceAll('"', '\\"')}"`;
				const message = resolveInput('message') ?? `"${(params.message ?? 'Hello').replaceAll('"', '\\"')}"`;
				return {
					parts: [
						[
							`${pad}${TG_BOT}.sendMessage(${chatId}, ${message}, "");`,
						],
						{ portId: 'out', depthDelta: 0 },
					]
				};
			}
		},
	]
};

export default telegramExtension;
