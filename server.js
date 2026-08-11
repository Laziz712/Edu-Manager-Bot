require('dotenv').config();
const express = require('express');
const path = require('path');
const { registerSiteUser, readUsers } = require('./users');
const { askAI } = require('./ai');
const { bot } = require('./bot');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_KEY = process.env.ADMIN_KEY;

const app = express();
app.use(express.json());

app.use(express.static(__dirname));

async function sendTelegramMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID .env da sozlanmagan — xabar yuborilmadi.');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram xatolik:', data.description);
    return data.ok;
  } catch (e) {
    console.error('Telegram fetch xatolik:', e.message);
    return false;
  }
}

app.post('/api/register-user', async (req, res) => {
  const { name, email, phone, registeredVia } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: "Ism va email majburiy." });
  }

  const { isNew, totalUsers } = registerSiteUser({ name, email, phone, registeredVia });

  if (isNew) {
    console.log(`👤 Yangi sayt foydalanuvchisi: ${name} (${email}) | Jami: ${totalUsers}`);
    const text =
      `🆕 *Yangi foydalanuvchi ro'yxatdan o'tdi!*\n\n` +
      `👤 Ism: ${name}\n` +
      `📧 Email: ${email}\n` +
      (phone ? `📞 Telefon: ${phone}\n` : '') +
      `🔑 Usul: ${registeredVia === 'google' ? 'Google orqali' : 'Email/parol orqali'}\n` +
      `🕒 Vaqt: ${new Date().toLocaleString('uz-UZ')}\n` +
      `👥 Jami foydalanuvchilar: ${totalUsers}`;
    await sendTelegramMessage(text);
  }

  res.json({ isNew, totalUsers });
});

app.post('/api/notify', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text majburiy.' });
  const sent = await sendTelegramMessage(text);
  res.json({ sent });
});

app.post('/api/ai-chat', async (req, res) => {
  const { message, history, context } = req.body || {};
  const result = await askAI({ message, history, context });
  if (result.error) {
    const status = /sozlanmagan/.test(result.error) ? 503 : 502;
    return res.status(status).json({ error: result.error });
  }
  res.json({ reply: result.reply });
});

app.get('/api/users', (req, res) => {
  if (ADMIN_KEY && req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Ruxsat yo'q." });
  }
  res.json(readUsers());
});

app.post('/api/telegram-webhook', (req, res) => {
  if (bot) bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Edu Manager server ishga tushdi: http://localhost:${PORT}`);
});