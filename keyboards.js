const { Markup } = require('telegraf');

function isAdmin(ctx) {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(String(ctx.from.id));
}

function mainMenu(admin) {
  const buttons = [
    ['📚 Kurslar', "👨‍🏫 O'qituvchilar"],
    ['📰 Yangiliklar', '📖 Mening darslarim'],
    ['🎓 Baholarim', '📋 Davomatim'],
    ['📅 Darslar jadvali', '🏆 Yutuqlarim'],
  ];
  if (admin) buttons.push(['⚙️ Admin panel']);
  return Markup.keyboard(buttons).resize();
}

const adminMenu = Markup.keyboard([
  ["➕ Kurs qo'shish", "➕ O'qituvchi qo'shish"],
  ["➕ O'quvchi qo'shish", "📝 Kursga yozish"],
  ["👥 Talabalar ro'yxati", '📢 Yangilik yuborish'],
  ["📊 Baho qo'yish", '✅ Davomat belgilash'],
  ["🗓 Dars qo'shish"],
  ['⬅️ Orqaga'],
]).resize();

const PAYMENT_TYPES = ['Naqd pul', 'Bank kartasi', 'Click', 'Payme'];
const NEWS_CATEGORIES = ['Umumiy', 'Kurs yangiliklari', 'Tadbirlar', "E'lonlar"];

const cancelKeyboard = Markup.keyboard([['❌ Bekor qilish']]).resize();

const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

module.exports = {
  isAdmin,
  mainMenu,
  adminMenu,
  cancelKeyboard,
  WEEKDAYS,
  PAYMENT_TYPES,
  NEWS_CATEGORIES,
};