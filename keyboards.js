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
  ];
  if (admin) buttons.push(['⚙️ Admin panel']);
  return Markup.keyboard(buttons).resize();
}

const adminMenu = Markup.keyboard([
  ["➕ Kurs qo'shish", "➕ O'qituvchi qo'shish"],
  ["➕ O'quvchi qo'shish", '📢 Yangilik yuborish'],
  ['⬅️ Orqaga'],
]).resize();

const cancelKeyboard = Markup.keyboard([['❌ Bekor qilish']]).resize();

module.exports = { isAdmin, mainMenu, adminMenu, cancelKeyboard };