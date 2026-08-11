const TelegramBot = require('node-telegram-bot-api');
const { askAI } = require('./ai');
const { registerTelegramUser } = require('./users');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SITE_URL = process.env.SITE_URL || 'https://edu-manager-nine-theta.vercel.app';

const COURSES = [
  { name: 'Frontend Dasturlash', price: '900 000', teacher: 'Botir Rustamov' },
  { name: 'Grafik Dizayn', price: '700 000', teacher: 'Malika Yusupova' },
  { name: 'SMM va Marketing', price: '650 000', teacher: 'Diyor Ergashev' },
  { name: 'Videografiya va Mobilografiya', price: '750 000', teacher: 'Sardor Nazarov' },
  { name: 'Buxgalteriya (1C)', price: '600 000', teacher: 'Gulnora Xolova' },
  { name: "Kids: Robototexnika", price: '450 000', teacher: 'Aziz Karimov' },
];

const ABOUT_TEXT =
  "🎓 *Edu Manager* — Xorazm viloyatidagi IT va zamonaviy kasblar o'quv markazi.\n\n" +
  "2016-yildan buyon amaliyotga yo'naltirilgan ta'lim beramiz: dasturlash, dizayn, " +
  "marketing va boshqa zamonaviy kasblarni kichik guruhlarda, tajribali ustozlar bilan o'rgatamiz.";

const CONTACT_TEXT =
  "📍 Manzil: Urganch sh., Al-Xorazmiy ko'chasi, 12-uy\n" +
  "📞 Telefon: +998 90 123 45 67\n" +
  "🕒 Ish vaqti: Har kuni 09:00 – 20:00\n" +
  `🌐 Sayt: ${SITE_URL}`;

if (!BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN topilmadi — bot ishga tushmaydi. .env faylini tekshiring.');
}

const bot = BOT_TOKEN ? new TelegramBot(BOT_TOKEN) : null;

const sessions = new Map();
function getSession(chatId) {
  if (!sessions.has(chatId)) sessions.set(chatId, { mode: 'idle' });
  return sessions.get(chatId);
}
function resetSession(chatId) {
  sessions.set(chatId, { mode: 'idle' });
}

function safeSend(chatId, text, opts) {
  return bot.sendMessage(chatId, text, opts).catch((err) => {
    console.error('Bot sendMessage xatolik:', err.message);
  });
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📚 Kurslar', callback_data: 'menu_courses' }],
      [{ text: '🤖 AI Yordamchi', callback_data: 'menu_ai' }],
      [{ text: "📝 Ro'yxatdan o'tish", callback_data: 'menu_register' }],
      [{ text: 'ℹ️ Biz haqimizda', callback_data: 'menu_about' }, { text: '📞 Aloqa', callback_data: 'menu_contact' }],
    ],
  };
}
function backToMenuKeyboard() {
  return { inline_keyboard: [[{ text: '🔙 Bosh menyu', callback_data: 'menu_main' }]] };
}
function coursesKeyboard() {
  return {
    inline_keyboard: COURSES.map((c, i) => [{ text: `📝 ${c.name}ga yozilish`, callback_data: `apply_${i}` }]).concat([
      [{ text: '🔙 Bosh menyu', callback_data: 'menu_main' }],
    ]),
  };
}

async function sendMainMenu(chatId, greeting) {
  resetSession(chatId);
  const text =
    (greeting || "Assalomu alaykum! 👋 *Edu Manager* botiga xush kelibsiz.") +
    "\n\nQuyidagilardan birini tanlang:";
  await safeSend(chatId, text, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() });
}

function coursesListText() {
  return (
    "📚 *Bizning kurslarimiz:*\n\n" +
    COURSES.map(
      (c, i) => `${i + 1}. *${c.name}*\n   💵 ${c.price} so'm/oy · 👨‍🏫 ${c.teacher}`
    ).join('\n\n')
  );
}

async function startRegister(chatId) {
  sessions.set(chatId, { mode: 'register', step: 'name', data: {} });
  await safeSend(chatId, "Ismingizni kiriting:", {
    reply_markup: { inline_keyboard: [[{ text: '✖️ Bekor qilish', callback_data: 'menu_main' }]] },
  });
}

async function handleRegisterStep(chatId, text) {
  const session = getSession(chatId);
  const { step, data } = session;

  if (step === 'name') {
    data.name = text.trim();
    session.step = 'phone';
    await safeSend(chatId, "Telefon raqamingizni kiriting (masalan: +998 90 123 45 67):");
    return;
  }

  if (step === 'phone') {
    data.phone = text.trim();
    if (data.preselectedCourse !== undefined) {
      return finishRegister(chatId, data.preselectedCourse);
    }
    session.step = 'course';
    await safeSend(chatId, "Qaysi kursga yozilmoqchisiz?", {
      reply_markup: {
        inline_keyboard: COURSES.map((c, i) => [{ text: c.name, callback_data: `regcourse_${i}` }]),
      },
    });
    return;
  }
}

async function finishRegister(chatId, courseIndex) {
  const session = getSession(chatId);
  const { data } = session;
  const course = COURSES[courseIndex];
  data.courseName = course ? course.name : "belgilanmagan";

  const { isNew, totalUsers } = registerTelegramUser({
    chatId,
    name: data.name,
    phone: data.phone,
    courseName: data.courseName,
  });

  await safeSend(
    chatId,
    `✅ Rahmat, *${data.name}*! Arizangiz qabul qilindi.\n\n` +
      `📚 Kurs: ${data.courseName}\n` +
      `📞 Telefon: ${data.phone}\n\n` +
      `Tez orada operatorlarimiz siz bilan bog'lanadi.`,
    { parse_mode: 'Markdown', reply_markup: backToMenuKeyboard() }
  );

  if (isNew && ADMIN_CHAT_ID) {
    await safeSend(
      ADMIN_CHAT_ID,
      `🆕 *Telegram orqali yangi ariza!*\n\n` +
        `👤 Ism: ${data.name}\n` +
        `📞 Telefon: ${data.phone}\n` +
        `📚 Kurs: ${data.courseName}\n` +
        `👥 Jami foydalanuvchilar: ${totalUsers}`,
      { parse_mode: 'Markdown' }
    );
  }

  resetSession(chatId);
}

async function startAiMode(chatId) {
  sessions.set(chatId, { mode: 'ai', history: [] });
  await safeSend(
    chatId,
    "🤖 AI Yordamchi rejimidasiz. Kurslar yoki ta'lim bo'yicha istalgan savolingizni yozing.",
    { reply_markup: backToMenuKeyboard() }
  );
}

async function handleAiMessage(chatId, text) {
  const session = getSession(chatId);
  await bot.sendChatAction(chatId, 'typing').catch(() => {});

  const result = await askAI({
    message: text,
    history: session.history || [],
    context: { courseNames: COURSES.map((c) => c.name) },
  });

  if (result.error) {
    await safeSend(chatId, `⚠️ ${result.error}`, { reply_markup: backToMenuKeyboard() });
    return;
  }

  session.history = session.history || [];
  session.history.push({ role: 'user', content: text });
  session.history.push({ role: 'assistant', content: result.reply });

  await safeSend(chatId, result.reply, { reply_markup: backToMenuKeyboard() });
}

function registerHandlers() {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text) return;

    if (text === '/start') {
      await sendMainMenu(chatId);
      return;
    }

    const session = getSession(chatId);
    if (session.mode === 'register') {
      await handleRegisterStep(chatId, text);
      return;
    }
    if (session.mode === 'ai') {
      await handleAiMessage(chatId, text);
      return;
    }

    await safeSend(chatId, "Boshlash uchun /start buyrug'ini yuboring.");
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    await bot.answerCallbackQuery(query.id).catch(() => {});

    if (data === 'menu_main') return sendMainMenu(chatId);
    if (data === 'menu_courses')
      return safeSend(chatId, coursesListText(), { parse_mode: 'Markdown', reply_markup: coursesKeyboard() });
    if (data === 'menu_ai') return startAiMode(chatId);
    if (data === 'menu_register') return startRegister(chatId);
    if (data === 'menu_about')
      return safeSend(chatId, ABOUT_TEXT, { parse_mode: 'Markdown', reply_markup: backToMenuKeyboard() });
    if (data === 'menu_contact')
      return safeSend(chatId, CONTACT_TEXT, { reply_markup: backToMenuKeyboard() });

    if (data.startsWith('apply_')) {
      const idx = parseInt(data.split('_')[1], 10);
      sessions.set(chatId, { mode: 'register', step: 'name', data: { preselectedCourse: idx } });
      return safeSend(chatId, `"${COURSES[idx].name}" kursiga ariza. Ismingizni kiriting:`);
    }
    if (data.startsWith('regcourse_')) {
      const idx = parseInt(data.split('_')[1], 10);
      return finishRegister(chatId, idx);
    }
  });

  bot.on('polling_error', (err) => console.error('Bot polling xatolik:', err.message));
  bot.on('webhook_error', (err) => console.error('Bot webhook xatolik:', err.message));
}

if (bot) registerHandlers();

module.exports = { bot };