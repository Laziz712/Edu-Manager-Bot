const { Markup } = require('telegraf');

function isAdmin(ctx) {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(String(ctx.from.id));
}

// ========== ASOSIY MENU ==========
function mainMenu(admin) {
  const buttons = [
    ['📚 Kurslar', "👨‍🏫 O'qituvchilar"],
    ['📰 Yangiliklar', '📖 Mening darslarim'],
    ['💳 To'lovlar', '📊 Baholarim'],
  ];
  if (admin) buttons.push(['⚙️ Admin panel']);
  buttons.push(['🌐 Web App', '❓ Yordam']);
  return Markup.keyboard(buttons).resize().oneTime(false);
}

// ========== ADMIN MENU ==========
const adminMenu = Markup.keyboard([
  ["➕ Kurs qo'shish", "➕ O'qituvchi qo'shish"],
  ["➕ O'quvchi qo'shish", '📢 Yangilik yuborish'],
  ['📊 Statistika', '✅ Davomat olish'],
  ['✏️ Baho qo'yish', '🗓 Dars jadvali'],
  ['💰 To'lovlar', '📋 Barcha o'quvchilar'],
  ['⬅️ Orqaga'],
]).resize().oneTime(false);

// ========== CANCEL KEYBOARD ==========
const cancelKeyboard = Markup.keyboard([['❌ Bekor qilish']]).resize().oneTime(false);

// ========== BACK KEYBOARD ==========
const backKeyboard = Markup.keyboard([['⬅️ Orqaga']]).resize().oneTime(false);

// ========== CONFIRM KEYBOARD ==========
const confirmKeyboard = Markup.keyboard([
  ['✅ Tasdiqlash'],
  ['❌ Bekor qilish']
]).resize().oneTime(false);

// ========== ATTENDANCE STATUS ==========
const attendanceKeyboard = Markup.keyboard([
  ['✅ Keldi', '❌ Kelmadi'],
  ['📝 Kechikdi', '🏥 Sog'liq sababli'],
  ['⬅️ Orqaga']
]).resize().oneTime(false);

// ========== GRADE KEYBOARD ==========
const gradeKeyboard = Markup.keyboard([
  ['5', '4', '3', '2'],
  ['⬅️ Orqaga']
]).resize().oneTime(false);

module.exports = {
  isAdmin,
  mainMenu,
  adminMenu,
  cancelKeyboard,
  backKeyboard,
  confirmKeyboard,
  attendanceKeyboard,
  gradeKeyboard,
};