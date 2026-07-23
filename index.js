require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const { readDB, writeDB } = require('./db');
const { mainMenu, adminMenu, isAdmin } = require('./keyboards');
const {
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
  addGradeScene,
  attendanceScene,
} = require('./scenes');

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://edu-manager-nine-theta.vercel.app';
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi! .env faylini tekshiring.');
  process.exit(1);
}

// ========== EXPRESS SERVER (Mini App API) ==========
const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/courses', (req, res) => {
  const db = readDB();
  const courses = db.courses.map(c => {
    const teacher = db.teachers.find(t => String(t.id) === String(c.teacherId));
    return { ...c, teacherName: teacher ? teacher.name : "Noma'lum" };
  });
  res.json(courses);
});

app.get('/api/teachers', (req, res) => {
  const db = readDB();
  res.json(db.teachers);
});

app.get('/api/students', (req, res) => {
  const db = readDB();
  res.json(db.students);
});

app.get('/api/news', (req, res) => {
  const db = readDB();
  res.json(db.news.slice(-10).reverse());
});

app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({
    students: db.students.length,
    teachers: db.teachers.length,
    courses: db.courses.length,
    enrollments: db.enrollments.length,
    news: db.news.length,
  });
});

app.listen(PORT, () => {
  console.log(`🌐 API server ishga tushdi: http://localhost:${PORT}`);
});

// ========== TELEGRAF BOT ==========
const bot = new Telegraf(BOT_TOKEN);

const stage = new Scenes.Stage([
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
  addGradeScene,
  attendanceScene,
]);

bot.use(session());
bot.use(stage.middleware());

// ========== /start ==========
bot.start(async (ctx) => {
  const db = readDB();
  const exists = db.students.find((s) => s.telegramId === ctx.from.id);

  if (!exists) {
    db.students.push({
      id: 'tg_' + ctx.from.id,
      telegramId: ctx.from.id,
      name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
      username: ctx.from.username || null,
      phone: null,
      email: null,
      joinedAt: new Date().toISOString(),
    });
    writeDB(db);
  }

  await ctx.reply(
    `👋 *Assalomu alaykum, ${ctx.from.first_name}!*\n\n🎓 *Edu Manager* botiga xush kelibsiz!\n\nBu yerda siz:\n📚 Kurslarni ko'rishingiz\n👨‍🏫 O'qituvchilar haqida ma'lumot olishingiz\n📰 Yangiliklarni kuzatishingiz\n📖 Kurslarga yozilishingiz\n💳 To'lovlaringizni ko'rishingiz mumkin.\n\nKerakli bo'limni tanlang 👇`,
    { parse_mode: 'Markdown', ...mainMenu(isAdmin(ctx)) }
  );
});

// ========== Admin Panel ==========
bot.hears('⚙️ Admin panel', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  }
  await ctx.reply(
    '🔧 *Admin Paneli*\n\nQuyidagi amallardan birini tanlang:',
    { parse_mode: 'Markdown', ...adminMenu }
  );
});

// ========== Orqaga ==========
bot.hears('⬅️ Orqaga', async (ctx) => {
  await ctx.reply('🏠 *Asosiy menu*', { parse_mode: 'Markdown', ...mainMenu(isAdmin(ctx)) });
});

// ========== Admin Scenes ==========
bot.hears("➕ Kurs qo'shish", (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_COURSE');
});

bot.hears("➕ O'qituvchi qo'shish", (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_TEACHER');
});

bot.hears("➕ O'quvchi qo'shish", (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_STUDENT');
});

bot.hears('📢 Yangilik yuborish', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('SEND_NEWS');
});

bot.hears("✏️ Baho qo'yish", (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_GRADE');
});

bot.hears('✅ Davomat olish', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ATTENDANCE');
});

// ========== 📊 Statistika ==========
bot.hears('📊 Statistika', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  const db = readDB();
  const stats = `📊 *Umumiy statistika*\n\n👥 Talabalar: *${db.students.length}*\n👨‍🏫 O'qituvchilar: *${db.teachers.length}*\n📚 Kurslar: *${db.courses.length}*\n📝 Yozilmalar: *${db.enrollments.length}*\n⭐ Baholar: *${db.grades.length}*\n📅 Davomat: *${db.attendance.length}*\n📰 Yangiliklar: *${db.news.length}*`;
  await ctx.reply(stats, { parse_mode: 'Markdown' });
});

// ========== 📋 Barcha o'quvchilar ==========
bot.hears("📋 Barcha o'quvchilar", async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  const db = readDB();
  if (db.students.length === 0) {
    return ctx.reply("📭 Hozircha o'quvchilar mavjud emas.");
  }
  let text = `📋 *Barcha o'quvchilar* (${db.students.length} ta):\n\n`;
  db.students.forEach((s, i) => {
    const type = s.telegramId ? '🤖 Bot' : "👤 Qo'lda";
    text += `${i + 1}. *${s.name}*\n   ${type} | 📞 ${s.phone || "Noma'lum"}\n   📅 ${new Date(s.joinedAt).toLocaleDateString('uz-UZ')}\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 💰 To'lovlar (admin) ==========
bot.hears("💰 To'lovlar", async (ctx) => {
  if (!isAdmin(ctx)) {
    // Foydalanuvchi uchun o'z to'lovlari
    return ctx.reply("📭 To'lovlar bo'limi tez orada ishga tushadi.");
  }
  const db = readDB();
  if (db.payments.length === 0) {
    return ctx.reply("📭 Hozircha to'lovlar mavjud emas.");
  }
  let text = `💰 *To'lovlar* (${db.payments.length} ta):\n\n`;
  db.payments.forEach((p, i) => {
    const student = db.students.find(s => s.id === p.studentId);
    text += `${i + 1}. *${student?.name || "Noma'lum"}*\n   💵 ${p.amount.toLocaleString()} so'm\n   📅 ${new Date(p.date).toLocaleDateString('uz-UZ')}\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 🗓 Dars jadvali ==========
bot.hears('🗓 Dars jadvali', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  const db = readDB();
  if (db.schedule.length === 0) {
    return ctx.reply("📭 Hozircha dars jadvali mavjud emas.");
  }
  let text = `🗓 *Dars jadvali*:\n\n`;
  db.schedule.forEach((s) => {
    const course = db.courses.find(c => String(c.id) === String(s.courseId));
    text += `📖 *${course?.name || "Noma'lum"}*\n🕐 ${s.time}\n📅 ${s.days}\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 📚 Kurslar ==========
bot.hears('📚 Kurslar', async (ctx) => {
  const db = readDB();
  if (db.courses.length === 0) {
    return ctx.reply("📭 Hozircha kurslar mavjud emas.");
  }

  await ctx.reply(`📚 *Mavjud kurslar* (${db.courses.length} ta):`, { parse_mode: 'Markdown' });

  for (const c of db.courses) {
    const teacher = db.teachers.find((t) => String(t.id) === String(c.teacherId));
    const enrolledCount = db.enrollments.filter(e => String(e.courseId) === String(c.id)).length;
    await ctx.reply(
      `📖 *${c.name}*\n\n📝 ${c.description}\n💰 Narxi: *${c.price.toLocaleString()}* so'm\n📅 Davomiyligi: ${c.duration || "Noma'lum"}\n👨‍🏫 O'qituvchi: ${teacher ? teacher.name : "Noma'lum"}\n👥 Yozilgan: ${enrolledCount} ta\n📅 Sana: ${new Date(c.createdAt).toLocaleDateString('uz-UZ')}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Yozilish', `enroll_${c.id}`)],
        ]),
      }
    );
  }
});

// ========== Yozilish ==========
bot.action(/enroll_(.+)/, async (ctx) => {
  const courseId = ctx.match[1];
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  const course = db.courses.find((c) => String(c.id) === String(courseId));

  if (!student || !course) {
    return ctx.answerCbQuery("❌ Xatolik yuz berdi, /start bosib qayta urinib ko'ring.");
  }

  const already = db.enrollments.find(
    (e) => e.studentId === student.id && String(e.courseId) === String(course.id)
  );
  if (already) {
    return ctx.answerCbQuery('⚠️ Siz allaqachon bu kursga yozilgansiz.');
  }

  db.enrollments.push({
    studentId: student.id,
    courseId: course.id,
    date: new Date().toISOString(),
    status: 'active',
  });
  writeDB(db);

  await ctx.answerCbQuery('✅ Muvaffaqiyatli yozildingiz!');
  await ctx.reply(
    `🎉 *Tabriklaymiz!*\n\nSiz *"${course.name}"* kursiga muvaffaqiyatli yozildingiz.\n\n💰 Narxi: ${course.price.toLocaleString()} so'm\n📅 Sana: ${new Date().toLocaleDateString('uz-UZ')}\n\nTez orada o'qituvchi siz bilan bog'lanadi.`,
    { parse_mode: 'Markdown' }
  );

  // Admin ga xabar
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  for (const adminId of adminIds) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `📢 *Yangi yozilish!*\n\n👤 ${student.name}\n📖 ${course.name}\n📞 ${student.phone || 'Telefon kiritilmagan'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }
});

// ========== 👨‍🏫 O'qituvchilar ==========
bot.hears("👨‍🏫 O'qituvchilar", async (ctx) => {
  const db = readDB();
  if (db.teachers.length === 0) {
    return ctx.reply("📭 Hozircha o'qituvchilar mavjud emas.");
  }

  let text = `👨‍🏫 *O'qituvchilar ro'yxati* (${db.teachers.length} ta):\n\n`;
  db.teachers.forEach((t, index) => {
    const coursesCount = db.courses.filter(c => String(c.teacherId) === String(t.id)).length;
    text += `${index + 1}. *${t.name}*\n   📚 Fan: ${t.subject}\n   📞 ${t.phone}\n   📖 Kurslar: ${coursesCount} ta\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 📰 Yangiliklar ==========
bot.hears('📰 Yangiliklar', async (ctx) => {
  const db = readDB();
  if (db.news.length === 0) {
    return ctx.reply("📭 Hozircha yangiliklar mavjud emas.");
  }

  const last = db.news.slice(-5).reverse();
  await ctx.reply(`📰 *So'nggi yangiliklar* (${last.length} ta):`, { parse_mode: 'Markdown' });

  for (const n of last) {
    await ctx.reply(
      `📅 *${new Date(n.date).toLocaleDateString('uz-UZ')}*\n\n${n.text}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ========== 📖 Mening darslarim ==========
bot.hears('📖 Mening darslarim', async (ctx) => {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply("⚠️ Avval /start buyrug'ini bosing.");
  }

  const myEnrollments = db.enrollments.filter((e) => e.studentId === student.id);
  if (myEnrollments.length === 0) {
    return ctx.reply(
      '📭 Siz hali hech qanday kursga yozilmagansiz.\n\n📚 "Kurslar" bo\'limiga o\'ting.',
      mainMenu(isAdmin(ctx))
    );
  }

  let text = '📖 *Mening darslarim*:\n\n';
  myEnrollments.forEach((e, index) => {
    const course = db.courses.find((c) => String(c.id) === String(e.courseId));
    if (course) {
      const teacher = db.teachers.find((t) => String(t.id) === String(course.teacherId));
      const grades = db.grades.filter(g => g.studentId === student.id && String(g.courseId) === String(course.id));
      const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b.grade, 0) / grades.length).toFixed(1) : "Baholar yo'q";
      text += `${index + 1}. *${course.name}*\n   👨‍🏫 ${teacher ? teacher.name : "Noma'lum o'qituvchi"}\n   📅 ${new Date(e.date).toLocaleDateString('uz-UZ')}\n   ⭐ O'rtacha baho: ${avgGrade}\n\n`;
    }
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 📊 Baholarim ==========
bot.hears('📊 Baholarim', async (ctx) => {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply("⚠️ Avval /start buyrug'ini bosing.");
  }

  const myGrades = db.grades.filter((g) => g.studentId === student.id);
  if (myGrades.length === 0) {
    return ctx.reply("📭 Sizga hali baho qo'yilmagan.");
  }

  let text = '📊 *Mening baholarim*:\n\n';
  myGrades.forEach((g) => {
    const course = db.courses.find((c) => String(c.id) === String(g.courseId));
    text += `📖 *${course?.name || "Noma'lum"}*\n   ⭐ Baho: *${g.grade}*\n   📅 ${new Date(g.date).toLocaleDateString('uz-UZ')}\n\n`;
  });

  const avg = (myGrades.reduce((a, b) => a + b.grade, 0) / myGrades.length).toFixed(1);
  text += `📈 *O'rtacha baho: ${avg}*`;
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 💳 To'lovlar (user) ==========
bot.hears("💳 To'lovlar", async (ctx) => {
  if (isAdmin(ctx)) return; // Admin uchun yuqorida ishlaydi
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply("⚠️ Avval /start buyrug'ini bosing.");
  }

  const myPayments = db.payments.filter((p) => p.studentId === student.id);
  if (myPayments.length === 0) {
    return ctx.reply("📭 Sizda hali to'lovlar mavjud emas.\n\nTo'lov qilish uchun admin bilan bog'laning.");
  }

  let text = "💳 *Mening to'lovlarim*:\n\n";
  myPayments.forEach((p) => {
    text += `💵 *${p.amount.toLocaleString()}* so'm\n📅 ${new Date(p.date).toLocaleDateString('uz-UZ')}\n📝 ${p.note || ''}\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 🌐 Web App (Mini App) ==========
bot.hears('🌐 Web App', async (ctx) => {
  await ctx.reply(
    "🌐 *Edu Manager Web App*\n\nTo'liq funksionallikka ega web ilovamizni oching:",
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Web Appni ochish', { url: MINI_APP_URL })],
      ]),
    }
  );
});

// ========== ❓ Yordam ==========
bot.hears('❓ Yordam', async (ctx) => {
  const helpText = `📖 *Yordam*\n\n*Asosiy buyruqlar:*\n/start — Botni ishga tushirish\n/help — Yordam\n\n*Bo'limlar:*\n📚 Kurslar — Mavjud kurslarni ko'rish va yozilish\n👨‍🏫 O'qituvchilar — O'qituvchilar ro'yxati\n📰 Yangiliklar — So'nggi yangiliklar\n📖 Mening darslarim — Yozilgan kurslar\n📊 Baholarim — O'z baholaringiz\n💳 To'lovlar — To'lovlar tarixi\n🌐 Web App — Web ilovani ochish\n\n*Admin buyruqlari:*\n⚙️ Admin panel — Boshqaruv paneli`;
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// ========== /help ==========
bot.command('help', async (ctx) => {
  const helpText = `📖 *Yordam*\n\n*Asosiy buyruqlar:*\n/start — Botni ishga tushirish\n/help — Yordam\n/stats — Statistika (faqat admin)\n\n*Bo'limlar:*\n📚 Kurslar — Mavjud kurslarni ko'rish\n👨‍🏫 O'qituvchilar — O'qituvchilar ro'yxati\n📰 Yangiliklar — So'nggi yangiliklar\n📖 Mening darslarim — Yozilgan kurslar\n📊 Baholarim — O'z baholaringiz\n💳 To'lovlar — To'lovlar tarixi\n🌐 Web App — Web ilovani ochish`;
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// ========== /stats (admin only) ==========
bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const db = readDB();
  const stats = `📊 *Statistika*\n\n👥 Talabalar: *${db.students.length}*\n👨‍🏫 O'qituvchilar: *${db.teachers.length}*\n📚 Kurslar: *${db.courses.length}*\n📝 Yozilmalar: *${db.enrollments.length}*\n⭐ Baholar: *${db.grades.length}*\n📅 Davomat: *${db.attendance.length}*\n💰 To'lovlar: *${db.payments.length}*\n📰 Yangiliklar: *${db.news.length}*`;
  await ctx.reply(stats, { parse_mode: 'Markdown' });
});

// ========== Unknown messages ==========
bot.on('text', async (ctx) => {
  await ctx.reply(
    "❓ Tushunarsiz buyruq. Iltimos, menyudan tanlang yoki /help buyrug'ini bosing.",
    mainMenu(isAdmin(ctx))
  );
});

// ========== Launch ==========
bot.launch();
console.log('✅ Edu Manager bot ishga tushdi...');
console.log(`🤖 Bot token: ${BOT_TOKEN.slice(0, 10)}...`);
console.log(`👑 Admin ID: ${process.env.ADMIN_IDS || 'sozlanmagan'}`);
console.log(`🌐 Mini App URL: ${MINI_APP_URL}`);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));