require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const { isAdmin, mainMenu, adminMenu } = require('./keyboards');
const {
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
} = require('./scenes');

if (!process.env.BOT_TOKENS) {
  console.error("❌ .env faylida BOT_TOKENS ko'rsatilmagan!");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKENS);

const stage = new Scenes.Stage([
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
]);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  const db = readDB();
  const exists = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!exists) {
    db.students.push({
      id: 'tg_' + ctx.from.id,
      telegramId: ctx.from.id,
      name:
        ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
      username: ctx.from.username || null,
      joinedAt: new Date().toISOString(),
    });
    writeDB(db);
  }
  await ctx.reply(
    `Assalomu alaykum, ${ctx.from.first_name}! 👋\n\nEdu Manager botiga xush kelibsiz.\nKerakli bo'limni tanlang 👇`,
    mainMenu(isAdmin(ctx))
  );
});

bot.hears('⚙️ Admin panel', async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply('Admin panel:', adminMenu);
});

bot.hears('⬅️ Orqaga', async (ctx) => {
  await ctx.reply('Asosiy menu:', mainMenu(isAdmin(ctx)));
});

bot.hears("➕ Kurs qo'shish", (ctx) => {
  if (isAdmin(ctx)) ctx.scene.enter('ADD_COURSE');
});

bot.hears("➕ O'qituvchi qo'shish", (ctx) => {
  if (isAdmin(ctx)) ctx.scene.enter('ADD_TEACHER');
});

bot.hears("➕ O'quvchi qo'shish", (ctx) => {
  if (isAdmin(ctx)) ctx.scene.enter('ADD_STUDENT');
});

bot.hears('📢 Yangilik yuborish', (ctx) => {
  if (isAdmin(ctx)) ctx.scene.enter('SEND_NEWS');
});

bot.hears('📚 Kurslar', async (ctx) => {
  const db = readDB();
  if (db.courses.length === 0) {
    return ctx.reply('Hozircha kurslar mavjud emas.');
  }
  for (const c of db.courses) {
    const teacher = db.teachers.find((t) => String(t.id) === String(c.teacherId));
    await ctx.reply(
      `📚 ${c.name}\n${c.description}\n💰 Narxi: ${c.price.toLocaleString()} so'm\n👨‍🏫 O'qituvchi: ${
        teacher ? teacher.name : "Noma'lum"
      }`,
      Markup.inlineKeyboard([
        Markup.button.callback('✅ Yozilish', `enroll_${c.id}`),
      ])
    );
  }
});

bot.action(/enroll_(.+)/, async (ctx) => {
  const courseId = ctx.match[1];
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  const course = db.courses.find((c) => String(c.id) === String(courseId));

  if (!student || !course) {
    return ctx.answerCbQuery('Xatolik yuz berdi, /start bosib qayta urinib ko\'ring.');
  }

  const already = db.enrollments.find(
    (e) => e.studentId === student.id && String(e.courseId) === String(course.id)
  );
  if (already) {
    return ctx.answerCbQuery('Siz allaqachon bu kursga yozilgansiz.');
  }

  db.enrollments.push({
    studentId: student.id,
    courseId: course.id,
    date: new Date().toISOString(),
  });
  writeDB(db);

  await ctx.answerCbQuery('✅ Muvaffaqiyatli yozildingiz!');
  await ctx.reply(`✅ Siz "${course.name}" kursiga yozildingiz.`);
});

bot.hears("👨‍🏫 O'qituvchilar", async (ctx) => {
  const db = readDB();
  if (db.teachers.length === 0) {
    return ctx.reply("Hozircha o'qituvchilar mavjud emas.");
  }
  let text = "👨‍🏫 O'qituvchilar ro'yxati:\n\n";
  db.teachers.forEach((t) => {
    text += `• ${t.name} — ${t.subject}\n  📞 ${t.phone}\n\n`;
  });
  await ctx.reply(text);
});

bot.hears('📰 Yangiliklar', async (ctx) => {
  const db = readDB();
  if (db.news.length === 0) {
    return ctx.reply('Hozircha yangiliklar mavjud emas.');
  }
  const last = db.news.slice(-5).reverse();
  for (const n of last) {
    await ctx.reply(`📰 ${new Date(n.date).toLocaleDateString('uz-UZ')}\n\n${n.text}`);
  }
});

bot.hears('📖 Mening darslarim', async (ctx) => {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply('Avval /start buyrug\'ini bosing.');
  }
  const myEnrollments = db.enrollments.filter((e) => e.studentId === student.id);
  if (myEnrollments.length === 0) {
    return ctx.reply('Siz hali hech qanday kursga yozilmagansiz. "📚 Kurslar" bo\'limiga o\'ting.');
  }
  let text = '📖 Mening darslarim:\n\n';
  myEnrollments.forEach((e) => {
    const course = db.courses.find((c) => String(c.id) === String(e.courseId));
    if (course) {
      const teacher = db.teachers.find((t) => String(t.id) === String(course.teacherId));
      text += `• ${course.name} (${teacher ? teacher.name : "Noma'lum o'qituvchi"})\n`;
    }
  });
  await ctx.reply(text);
});

bot.launch();
console.log('✅ Edu Manager bot ishga tushdi...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));