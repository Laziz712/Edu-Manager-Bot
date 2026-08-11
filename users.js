const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, 'users.json');

function readUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    const initial = { users: [], totalUsers: 0 };
    fs.writeFileSync(USERS_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

function writeUsers(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2));
}

/**
 * Foydalanuvchini users.json ga qo'shadi (email bo'yicha, agar hali yo'q bo'lsa).
 * Qaytaradi: { isNew, user, totalUsers }
 */
function registerSiteUser({ name, email, phone, registeredVia }) {
  const data = readUsers();
  const existing = data.users.find((u) => u.email === email);

  if (existing) {
    return { isNew: false, user: existing, totalUsers: data.totalUsers };
  }

  const newUser = {
    id: 'site_' + Date.now(),
    name,
    email,
    phone: phone || null,
    source: 'website',
    registeredVia: registeredVia || 'email',
    joinedAt: new Date().toISOString(),
  };

  data.users.push(newUser);
  data.totalUsers = data.users.length;
  writeUsers(data);

  return { isNew: true, user: newUser, totalUsers: data.totalUsers };
}

/**
 * Telegram bot orqali ariza qoldirgan foydalanuvchini users.json ga qo'shadi
 * (chatId bo'yicha, agar hali yo'q bo'lsa — bo'lsa ma'lumotini yangilaydi).
 * Qaytaradi: { isNew, user, totalUsers }
 */
function registerTelegramUser({ chatId, name, phone, courseName }) {
  const data = readUsers();
  const existing = data.users.find((u) => u.telegramChatId === chatId);

  if (existing) {
    existing.name = name || existing.name;
    existing.phone = phone || existing.phone;
    existing.courseName = courseName || existing.courseName;
    writeUsers(data);
    return { isNew: false, user: existing, totalUsers: data.totalUsers };
  }

  const newUser = {
    id: 'tg_' + Date.now(),
    name,
    email: null,
    phone: phone || null,
    courseName: courseName || null,
    source: 'telegram',
    telegramChatId: chatId,
    registeredVia: 'telegram',
    joinedAt: new Date().toISOString(),
  };

  data.users.push(newUser);
  data.totalUsers = data.users.length;
  writeUsers(data);

  return { isNew: true, user: newUser, totalUsers: data.totalUsers };
}

module.exports = { readUsers, writeUsers, registerSiteUser, registerTelegramUser };
