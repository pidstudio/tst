import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || '';

let bot = null;

export function startBot() {
  if (!BOT_TOKEN) {
    console.warn('⚠️  BOT_TOKEN not set — Telegram bot disabled (web still runs)');
    return null;
  }
  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  const openKeyboard = WEBAPP_URL
    ? { reply_markup: { inline_keyboard: [[{ text: '🃏 เปิดร้านประมูล', web_app: { url: WEBAPP_URL } }]] } }
    : {};

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      '🏴‍☠️ ยินดีต้อนรับสู่ *ห้องประมูลการ์ดวันพีช*!\n\nกดปุ่มด้านล่างเพื่อเข้าร่วมประมูลแบบเรียลไทม์ 👇',
      { parse_mode: 'Markdown', ...openKeyboard }
    );
  });

  // set persistent menu button to launch the mini app
  if (WEBAPP_URL) {
    bot
      .setChatMenuButton({
        menu_button: { type: 'web_app', text: 'ประมูล', web_app: { url: WEBAPP_URL } },
      })
      .catch((e) => console.warn('setChatMenuButton:', e.message));
  }

  console.log('🤖 Telegram bot started (polling)');
  return bot;
}

/** Notify the winner / outbid users. Safe no-op if bot disabled. */
export function notify(userId, text) {
  if (!bot || !userId) return;
  bot
    .sendMessage(userId, text, { parse_mode: 'Markdown' })
    .catch((e) => console.warn(`notify ${userId}:`, e.message));
}
