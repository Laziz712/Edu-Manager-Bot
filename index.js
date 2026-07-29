require('dotenv').config();
const express = require('express'); // 1. Express chaqirildi
const { Telegraf, Markup } = require('telegraf');
const { registerUser, readUsers } = require('./users');

const app = express(); // 2. App yaratildi

const BOT_TOKEN = "8769055476:AAFwA_ESwYIxH3Y8_zpgjNhtZnjgoM5LPcc"
const ADMIN_ID = 8584049635;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi! .env faylini tekshiring.');
  process.exit(1);
}

const PHONE_NUMBER = '+998 88 260 71 51';
const WEBSITE_URL = 'https://edu-manager-nine-theta.vercel.app/';
const ABOUT_TEXT =
  "🎓 *Edu Manager* — zamonaviy ta'lim markazi.\n\n" +
  "Biz sifatli ta'lim va qulay o'quv jarayonini taqdim etamiz. " +
  "Kurslarimiz, o'qituvchilarimiz va yangiliklarimiz haqida to'liq ma'lumotni veb-saytimizdan olishingiz mumkin.";

const bot = new Telegraf(BOT_TOKEN);

const mainMenu = Markup.keyboard([
  ['📞 Bog\'lanish', '🌐 Veb-sayt'],
  ['ℹ️ Biz haqimizda'],
]).resize();

bot.start(async (ctx) => {
  const { isNew, user, totalUsers } = registerUser(ctx.from);
  if (isNew) {
    console.log(
      `👤 Yangi foydalanuvchi: ${user.name}${user.username ? ' (@' + user.username + ')' : ''} | ID: ${user.id} | Vaqt: ${user.joinedAt} | Jami: ${totalUsers}`
    );
  }

  await ctx.reply(
    `👋 Assalomu alaykum, ${ctx.from.first_name}!\n\n🎓 Edu Manager botiga xush kelibsiz.\nKerakli bo'limni tanlang 👇`,
    mainMenu
  );
});

bot.hears('📞 Bog\'lanish', async (ctx) => {
  await ctx.reply(
    `📞 *Biz bilan bog'lanish*\n\nTelefon: ${PHONE_NUMBER}\n\nQo'ng'iroq qiling yoki shu raqamga Telegram orqali yozing.`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears('🌐 Veb-sayt', async (ctx) => {
  await ctx.reply(
    `🌐 *Bizning veb-saytimiz*\n\n${WEBSITE_URL}\n\nBarcha kurslar, o'qituvchilar va yangiliklar shu yerda.`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears('ℹ️ Biz haqimizda', async (ctx) => {
  await ctx.reply(ABOUT_TEXT, { parse_mode: 'Markdown' });
});

bot.command('myid', async (ctx) => {
  await ctx.reply(`🆔 Sizning Telegram ID'ingiz: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.command('users', async (ctx) => {
  if (ADMIN_ID && String(ctx.from.id) !== String(ADMIN_ID)) {
    return ctx.reply(
      `❌ Sizda ruxsat yo'q.\n🆔 ID'ingiz: \`${ctx.from.id}\``,
      { parse_mode: 'Markdown' }
    );
  }
  const data = readUsers();
  const last10 = data.users.slice(-10).reverse();

  let text = `👥 *Jami foydalanuvchilar: ${data.totalUsers}*\n\n*Oxirgi 10 tasi:*\n\n`;
  last10.forEach((u, i) => {
    text += `${i + 1}. ${u.name}${u.username ? ' (@' + u.username + ')' : ''}\n   🆔 ${u.id}\n   🕒 ${new Date(u.joinedAt).toLocaleString('uz-UZ')}\n\n`;
  });
  await ctx.reply(data.totalUsers === 0 ? "📭 Hozircha foydalanuvchilar yo'q." : text, {
    parse_mode: 'Markdown',
  });
});

bot.on('text', async (ctx) => {
  await ctx.reply("Iltimos, pastdagi menyudan birini tanlang 👇", mainMenu);
});

bot.launch();

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Edu Manager server ishga tushdi: http://localhost:${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));