require('dotenv').config();
const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, 'users.json');

const EMPTY_DB = {
  users: [],
  totalUsers: 0
};

function normalizeData(data) {
  if (!data || typeof data !== 'object') {
    return {
      users: [],
      totalUsers: 0
    };
  }

  if (!Array.isArray(data.users)) {
    data.users = [];
  }

  data.totalUsers = data.users.length;

  return data;
}

function readUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) {
      const initial = {
        users: [],
        totalUsers: 0
      };

      writeUsers(initial);
      return initial;
    }

    const raw = fs.readFileSync(USERS_PATH, 'utf8');

    if (!raw.trim()) {
      return {
        users: [],
        totalUsers: 0
      };
    }

    const data = JSON.parse(raw);

    return normalizeData(data);
  } catch (error) {
    console.error(
      "❌ users.json o'qishda xatolik:",
      error.message
    );

    return {
      users: [],
      totalUsers: 0
    };
  }
}

function writeUsers(data) {
  const normalized = normalizeData(data);

  try {
    fs.writeFileSync(
      USERS_PATH,
      JSON.stringify(normalized, null, 2),
      'utf8'
    );

    return normalized;
  } catch (error) {
    console.error(
      "❌ users.json yozishda xatolik:",
      error.message
    );

    throw error;
  }
}

function clean(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

/* =========================
   SAYT FOYDALANUVCHISI
========================= */

function registerSiteUser({
  name,
  email,
  phone,
  registeredVia
} = {}) {
  const data = readUsers();

  const cleanName = clean(name);
  const cleanEmail = clean(email)?.toLowerCase();
  const cleanPhone = clean(phone);

  if (!cleanName || !cleanEmail) {
    throw new Error(
      "Ism va email majburiy."
    );
  }

  const existing = data.users.find(
    (user) =>
      user.source === 'website' &&
      typeof user.email === 'string' &&
      user.email.toLowerCase() === cleanEmail
  );

  if (existing) {
    existing.name = cleanName;

    if (cleanPhone) {
      existing.phone = cleanPhone;
    }

    if (registeredVia) {
      existing.registeredVia = registeredVia;
    }

    writeUsers(data);

    return {
      isNew: false,
      user: existing,
      totalUsers: data.users.length
    };
  }

  const newUser = {
    id:
      'site_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(2, 8),

    name: cleanName,

    email: cleanEmail,

    phone: cleanPhone || null,

    source: 'website',

    registeredVia:
      registeredVia || 'email',

    joinedAt:
      new Date().toISOString()
  };

  data.users.push(newUser);

  writeUsers(data);

  return {
    isNew: true,
    user: newUser,
    totalUsers: data.users.length
  };
}

/* =========================
   TELEGRAM FOYDALANUVCHISI
========================= */

function registerTelegramUser({
  chatId,
  name,
  phone,
  courseName,
  username,
  firstName
} = {}) {
  const data = readUsers();

  if (
    chatId === undefined ||
    chatId === null ||
    String(chatId).trim() === ''
  ) {
    throw new Error(
      "Telegram chatId majburiy."
    );
  }

  const normalizedChatId =
    String(chatId);

  const cleanName =
    clean(name);

  const cleanPhone =
    clean(phone);

  const cleanCourse =
    clean(courseName);

  const cleanUsername =
    clean(username)?.replace(/^@/, '');

  const cleanFirstName =
    clean(firstName);

  /* Mavjud Telegram userni topish */

  const existing = data.users.find(
    (user) =>
      user.source === 'telegram' &&
      String(user.telegramChatId) ===
        normalizedChatId
  );

  /* Agar user oldin mavjud bo'lsa */

  if (existing) {
    existing.name =
      cleanName ||
      existing.name ||
      cleanFirstName ||
      'Foydalanuvchi';

    if (cleanPhone) {
      existing.phone = cleanPhone;
    }

    if (cleanCourse) {
      existing.courseName =
        cleanCourse;
    }

    if (cleanUsername) {
      existing.username =
        cleanUsername;
    }

    writeUsers(data);

    return {
      isNew: false,
      user: existing,
      totalUsers: data.users.length
    };
  }

  /* Yangi Telegram user */

  const newUser = {
    id:
      'tg_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(2, 8),

    name:
      cleanName ||
      cleanFirstName ||
      'Foydalanuvchi',

    email: null,

    phone:
      cleanPhone || null,

    courseName:
      cleanCourse || null,

    source: 'telegram',

    telegramChatId:
      normalizedChatId,

    username:
      cleanUsername || null,

    registeredVia:
      'telegram',

    joinedAt:
      new Date().toISOString()
  };

  data.users.push(newUser);

  writeUsers(data);

  return {
    isNew: true,
    user: newUser,
    totalUsers: data.users.length
  };
}

module.exports = {
  readUsers,
  writeUsers,
  registerSiteUser,
  registerTelegramUser
};