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

// Telegram botga bildirishnoma yuborish uchun yordamchi funksiya
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

// 1. Saytdan foydalanuvchini ro'yxatga olish API
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

// 2. Telegramga xabar yuborish API
app.post('/api/notify', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text majburiy.' });
  const sent = await sendTelegramMessage(text);
  res.json({ sent });
});

// 3. AI Chat API (Gemini orqali)
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, history, context } = req.body || {};
    const result = await askAI({ message, history, context });

    if (result.error) {
      const status = /sozlanmagan/.test(result.error) ? 503 : 502;
      return res.status(status).json({ error: result.error });
    }

    res.json({ reply: result.reply });
  } catch (error) {
    console.error('AI API Route Error:', error);
    res.status(500).json({ error: 'Serverda kutilmagan xatolik yuz berdi.' });
  }
});

// 4. Foydalanuvchilar ro'yxatini olish (Admin uchun)
app.get('/api/users', (req, res) => {
  if (ADMIN_KEY && req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Ruxsat yo'q." });
  }
  res.json(readUsers());
});

// 5. Webhook'ni qo'lda qayta o'rnatish (local'da USE_POLLING bilan test qilgandan
// keyin Render'ni qayta deploy qilmasdan tez tuzatish uchun)
app.post('/api/reset-webhook', async (req, res) => {
  if (ADMIN_KEY && req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Ruxsat yo'q." });
  }
  if (!bot) return res.status(503).json({ error: 'Bot sozlanmagan.' });
  const webhookUrl = `${process.env.SITE_URL || 'https://edu-manager-nine-theta.vercel.app'}/api/telegram-webhook`;
  try {
    await bot.setWebHook(webhookUrl);
    res.json({ ok: true, webhookUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// 6. Telegram Webhook tugun-nuqtasi (Vercel / Production uchun)
app.post('/api/telegram-webhook', (req, res) => {
  try {
    if (bot) {
      bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, async () => {
  console.log(`✅ Edu Manager server ishga tushdi: http://localhost:${PORT}`);

  // MUHIM: node-telegram-bot-api'da polling rejimi (USE_POLLING=true, odatda
  // local kompyuterda cmd/terminal orqali test qilish uchun) ishga tushganda,
  // kutubxona Telegram'dagi webhook'ni AVTOMATIK O'CHIRIB TASHLAYDI. Shuning
  // uchun avval local'da polling bilan test qilib, keyin cmd'ni yopganingizda —
  // Render'dagi webhook ham o'chib qolgani uchun bot butunlay ishlamay qoladi.
  // Buning oldini olish uchun: agar hozir polling rejimida ishlamayotgan bo'lsak
  // (ya'ni bu — production/Render holati), server ishga tushganda webhook'ni
  // qayta o'rnatib qo'yamiz.
  if (bot && process.env.USE_POLLING !== 'true' && BOT_TOKEN) {
    const webhookUrl = `${process.env.SITE_URL || 'https://edu-manager-nine-theta.vercel.app'}/api/telegram-webhook`;
    try {
      await bot.setWebHook(webhookUrl);
      console.log(`🔗 Telegram webhook o'rnatildi: ${webhookUrl}`);
    } catch (err) {
      console.error('⚠️ Telegram webhook o‘rnatishda xatolik:', err.message);
    }
  }
});