require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const { mainMenu, adminMenu, isAdmin } = require('./keyboards');
const {
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
} = require('./scenes');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi! .env faylini tekshiring.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const stage = new Scenes.Stage([
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
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
      joinedAt: new Date().toISOString(),
    });
    writeDB(db);
  }

  await ctx.reply(
    `👋 Assalomu alaykum, ${ctx.from.first_name}!\n\n🎓 *Edu Manager* botiga xush kelibsiz!\n\nBu yerda siz:\n📚 Kurslarni ko'rishingiz\n👨‍🏫 O'qituvchilar haqida ma'lumot olishingiz\n📰 Yangiliklarni kuzatishingiz\n📖 Kurslarga yozilishingiz mumkin.\n\nKerakli bo'limni tanlang 👇`,
    { parse_mode: 'Markdown', ...mainMenu(isAdmin(ctx)) }
  );
});

// ========== Admin Panel ==========
bot.hears('⚙️ Admin panel', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  }
  await ctx.reply('🔧 *Admin Paneli*\n\nQuyidagi amallardan birini tanlang:', { parse_mode: 'Markdown', ...adminMenu });
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

// ========== 📚 Kurslar ==========
bot.hears('📚 Kurslar', async (ctx) => {
  const db = readDB();
  if (db.courses.length === 0) {
    return ctx.reply('📭 Hozircha kurslar mavjud emas.');
  }

  await ctx.reply(`📚 *Mavjud kurslar* (${db.courses.length} ta):`, { parse_mode: 'Markdown' });

  for (const c of db.courses) {
    const teacher = db.teachers.find((t) => String(t.id) === String(c.teacherId));
    await ctx.reply(
      `📖 *${c.name}*\n\n📝 ${c.description}\n💰 Narxi: *${c.price.toLocaleString()}* so'm\n👨‍🏫 O'qituvchi: ${teacher ? teacher.name : "Noma'lum"}\n📅 Sana: ${new Date(c.createdAt).toLocaleDateString('uz-UZ')}`,
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
  });
  writeDB(db);

  await ctx.answerCbQuery('✅ Muvaffaqiyatli yozildingiz!');
  await ctx.reply(
    `🎉 Tabriklaymiz!\n\nSiz *"${course.name}"* kursiga muvaffaqiyatli yozildingiz.\n\n💰 Narxi: ${course.price.toLocaleString()} so'm\n📅 Sana: ${new Date().toLocaleDateString('uz-UZ')}`,
    { parse_mode: 'Markdown' }
  );
});

// ========== 👨‍🏫 O'qituvchilar ==========
bot.hears("👨‍🏫 O'qituvchilar", async (ctx) => {
  const db = readDB();
  if (db.teachers.length === 0) {
    return ctx.reply("📭 Hozircha o'qituvchilar mavjud emas.");
  }

  let text = `👨‍🏫 *O'qituvchilar ro'yxati* (${db.teachers.length} ta):\n\n`;
  db.teachers.forEach((t, index) => {
    text += `${index + 1}. *${t.name}*\n   📚 Fan: ${t.subject}\n   📞 ${t.phone}\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 📰 Yangiliklar ==========
bot.hears('📰 Yangiliklar', async (ctx) => {
  const db = readDB();
  if (db.news.length === 0) {
    return ctx.reply('📭 Hozircha yangiliklar mavjud emas.');
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
      text += `${index + 1}. *${course.name}*\n   👨‍🏫 ${teacher ? teacher.name : "Noma'lum o'qituvchi"}\n   📅 ${new Date(e.date).toLocaleDateString('uz-UZ')}\n\n`;
    }
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== /help ==========
bot.command('help', async (ctx) => {
  const helpText = `📖 *Yordam*\n\n*Asosiy buyruqlar:*\n/start — Botni ishga tushirish\n/help — Yordam\n\n*Bo'limlar:*\n📚 Kurslar — Mavjud kurslarni ko'rish\n👨‍🏫 O'qituvchilar — O'qituvchilar ro'yxati\n📰 Yangiliklar — So'nggi yangiliklar\n📖 Mening darslarim — Yozilgan kurslar\n\n*Admin buyruqlari:*\n⚙️ Admin panel — Admin paneliga kirish`;
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// ========== /stats (admin only) ==========
bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const db = readDB();
  const stats = `📊 *Statistika*\n\n👥 Talabalar: ${db.students.length}\n👨‍🏫 O'qituvchilar: ${db.teachers.length}\n📚 Kurslar: ${db.courses.length}\n📝 Yozilmalar: ${db.enrollments.length}\n📰 Yangiliklar: ${db.news.length}`;
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

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));