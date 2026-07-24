const { Markup } = require('telegraf');

function isAdmin(ctx) {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(String(ctx.from.id));
}

function isLoggedIn(ctx) {
  const db = require('./db').readDB();
  const session = db.sessions[ctx.from.id];
  return session && session.loggedIn;
}

function getUserRole(ctx) {
  const db = require('./db').readDB();
  const session = db.sessions[ctx.from.id];
  return session ? session.role : null;
}

// ========== LOGIN MENU ==========
const loginMenu = Markup.keyboard([
  ['🔐 Login'],
]).resize();

// ========== ASOSIY MENU ==========
function mainMenu(role) {
  if (role === 'admin') {
    return Markup.keyboard([
      ['📚 Kurslar', "👨‍🏫 O'qituvchilar"],
      ['📰 Yangiliklar', '📖 Mening darslarim'],
      ['📊 Baholarim', "💳 To'lovlarim"],
      ['🗓 Dars jadvali', '⚙️ Admin panel'],
      ['👤 Profil', '❓ Yordam'],
    ]).resize();
  }
  if (role === 'teacher') {
    return Markup.keyboard([
      ['📚 Kurslar', "👨‍🏫 O'qituvchilar"],
      ['📰 Yangiliklar', '📖 Mening darslarim'],
      ['📊 Baholarim', "💳 To'lovlarim"],
      ['🗓 Dars jadvali', "✏️ Baho qo'yish"],
      ['👤 Profil', '❓ Yordam'],
    ]).resize();
  }
  // Student
  return Markup.keyboard([
    ['📚 Kurslar', "👨‍🏫 O'qituvchilar"],
    ['📰 Yangiliklar', '📖 Mening darslarim'],
    ['📊 Baholarim', "💳 To'lovlarim"],
    ['🗓 Dars jadvali', '👤 Profil'],
    ['❓ Yordam'],
  ]).resize();
}

// ========== ADMIN MENU ==========
const adminMenu = Markup.keyboard([
  ["➕ Kurs qo'shish", "➕ O'qituvchi qo'shish"],
  ["➕ O'quvchi qo'shish", '📢 Yangilik yuborish'],
  ['📊 Statistika', '✅ Davomat olish'],
  ["✏️ Baho qo'yish", '🗓 Dars jadvali'],
  ["💰 To'lovlar", "📋 Barcha o'quvchilar"],
  ['⬅️ Asosiy menu'],
]).resize();

// ========== CANCEL KEYBOARD ==========
const cancelKeyboard = Markup.keyboard([['❌ Bekor qilish']]).resize();

// ========== COURSE ENROLL INLINE ==========
function courseEnrollInline(courseId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Kursga yozilish', `enroll_${courseId}`)],
    [Markup.button.callback('📋 Batafsil', `detail_${courseId}`)],
  ]);
}

module.exports = {
  isAdmin,
  isLoggedIn,
  getUserRole,
  loginMenu,
  mainMenu,
  adminMenu,
  cancelKeyboard,
  courseEnrollInline,
};