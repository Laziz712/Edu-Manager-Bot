require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const { registerUser } = require('./users');
const { mainMenu, adminMenu, isAdmin, WEEKDAYS } = require('./keyboards');
const {
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
  addGradeScene,
  addAttendanceScene,
  addLessonScene,
  addEnrollmentScene,
} = require('./scenes');

const BOT_TOKEN = "8769055476:AAFwA_ESwYIxH3Y8_zpgjNhtZnjgoM5LPcc";
const ADMIN_IDs = "8584049635"

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
  addGradeScene,
  addAttendanceScene,
  addLessonScene,
  addEnrollmentScene,
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
      name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
      username: ctx.from.username || null,
      joinedAt: new Date().toISOString(),
    });
    writeDB(db);
  }

  // users.json ga yozish (VS Code'da ko'rish uchun): ism, username, vaqt, ID, jami son
  const { isNew, user, totalUsers } = registerUser(ctx.from);
  if (isNew) {
    console.log(
      `👤 Yangi foydalanuvchi: ${user.name}${user.username ? ' (@' + user.username + ')' : ''} | ID: ${user.id} | Vaqt: ${user.joinedAt} | Jami foydalanuvchilar: ${totalUsers}`
    );
  }

  await ctx.reply(
    `👋 Assalomu alaykum, ${ctx.from.first_name}!\n\n🎓 *Edu Manager* botiga xush kelibsiz!\n\nBu yerda siz:\n📚 Kurslarni ko'rishingiz\n👨‍🏫 O'qituvchilar haqida ma'lumot olishingiz\n📰 Yangiliklarni kuzatishingiz\n📖 Kurslarga yozilishingiz\n🎓 Baholaringizni ko'rishingiz\n📋 Davomatingizni kuzatishingiz mumkin.\n\nKerakli bo'limni tanlang 👇`,
    { parse_mode: 'Markdown', ...mainMenu(isAdmin(ctx)) }
  );
});

bot.hears('⚙️ Admin panel', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  }
  await ctx.reply('🔧 *Admin Paneli*\n\nQuyidagi amallardan birini tanlang:', { parse_mode: 'Markdown', ...adminMenu });
});

bot.hears('⬅️ Orqaga', async (ctx) => {
  await ctx.reply('🏠 *Asosiy menu*', { parse_mode: 'Markdown', ...mainMenu(isAdmin(ctx)) });
});

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

bot.hears("📊 Baho qo'yish", (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_GRADE');
});

bot.hears('✅ Davomat belgilash', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_ATTENDANCE');
});

bot.hears("🗓 Dars qo'shish", (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_LESSON');
});

bot.hears('📝 Kursga yozish', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  ctx.scene.enter('ADD_ENROLLMENT');
});

bot.hears("👥 Talabalar ro'yxati", async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("❌ Sizda admin huquqlari yo'q!");
  const db = readDB();
  if (db.students.length === 0) {
    return ctx.reply('📭 Hozircha talabalar mavjud emas.');
  }

  let text = `👥 *Talabalar ro'yxati* (${db.students.length} ta):\n\n`;
  db.students.forEach((s, index) => {
    const myCourses = db.enrollments
      .filter((e) => String(e.studentId) === String(s.id))
      .map((e) => db.courses.find((c) => String(c.id) === String(e.courseId)))
      .filter(Boolean)
      .map((c) => c.name);
    text += `${index + 1}. *${s.name}*\n`;
    if (s.email) text += `   📧 ${s.email}\n`;
    if (s.phone) text += `   📞 ${s.phone}\n`;
    text += `   📚 Kurslar: ${myCourses.length ? myCourses.join(', ') : '—'}\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

function formatSchedule(db, courseId) {
  const lessons = db.lessons.filter((l) => String(l.courseId) === String(courseId));
  if (lessons.length === 0) return "Jadval belgilanmagan";
  return lessons
    .map((l) => `${l.weekday} ${l.time}${l.room ? ' (' + l.room + ' xona)' : ''}`)
    .join(', ');
}

bot.hears('📚 Kurslar', async (ctx) => {
  const db = readDB();
  if (db.courses.length === 0) {
    return ctx.reply('📭 Hozircha kurslar mavjud emas.');
  }

  // Raqamlangan umumiy ro'yxat — foydalanuvchi shunchaki raqam yuborib yozilishi mumkin
  ctx.session = ctx.session || {};
  ctx.session.courseListIds = db.courses.map((c) => c.id);

  let listText = `📚 *Mavjud kurslar* (${db.courses.length} ta):\n\n`;
  db.courses.forEach((c, i) => {
    listText += `*${i + 1}.* ${c.name} — ${c.price.toLocaleString()} so'm\n`;
  });
  listText += `\nYozilish uchun kurs raqamini yuboring (masalan: *1*) yoki pastdagi tugmalardan foydalaning.`;
  await ctx.reply(listText, { parse_mode: 'Markdown' });

  for (const c of db.courses) {
    const teacher = db.teachers.find((t) => String(t.id) === String(c.teacherId));
    const teacherInfo = teacher
      ? `${teacher.name} — ${teacher.direction || ''}${teacher.experience ? ` (tajriba: ${teacher.experience})` : ''}`
      : "Noma'lum";
    await ctx.reply(
      `📖 *${c.name}*\n\n📝 ${c.description}\n💰 Narxi: *${c.price.toLocaleString()}* so'm\n👨‍🏫 O'qituvchi: ${teacherInfo}\n🗓 Jadval: ${formatSchedule(db, c.id)}\n📅 Qo'shilgan: ${new Date(c.createdAt).toLocaleDateString('uz-UZ')}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Yozilish', `enroll_${c.id}`)],
        ]),
      }
    );
  }
});

async function enrollStudentInCourse(ctx, course) {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);

  if (!student || !course) {
    return { ok: false, message: "❌ Xatolik yuz berdi, /start bosib qayta urinib ko'ring." };
  }

  const already = db.enrollments.find(
    (e) => e.studentId === student.id && String(e.courseId) === String(course.id)
  );
  if (already) {
    return { ok: false, message: '⚠️ Siz allaqachon bu kursga yozilgansiz.' };
  }

  db.enrollments.push({
    studentId: student.id,
    courseId: course.id,
    startDate: new Date().toISOString().slice(0, 10),
    paymentType: 'Belgilanmagan',
    comment: '',
    date: new Date().toISOString(),
  });
  writeDB(db);
  return { ok: true };
}

bot.action(/enroll_(.+)/, async (ctx) => {
  const courseId = ctx.match[1];
  const db = readDB();
  const course = db.courses.find((c) => String(c.id) === String(courseId));
  const result = await enrollStudentInCourse(ctx, course);

  if (!result.ok) {
    return ctx.answerCbQuery(result.message);
  }

  await ctx.answerCbQuery('✅ Muvaffaqiyatli yozildingiz!');
  await ctx.reply(
    `🎉 Tabriklaymiz!\n\nSiz *"${course.name}"* kursiga muvaffaqiyatli yozildingiz.\n\n💰 Narxi: ${course.price.toLocaleString()} so'm\n📅 Sana: ${new Date().toLocaleDateString('uz-UZ')}`,
    { parse_mode: 'Markdown' }
  );
});

// Raqam yuborib kursga yozilish (masalan foydalanuvchi "1" deb yozsa)
bot.hears(/^\d+$/, async (ctx) => {
  const listIds = ctx.session && ctx.session.courseListIds;
  if (!listIds || listIds.length === 0) {
    return; // umumiy "tushunarsiz buyruq" handleriga o'tadi
  }
  const index = Number(ctx.message.text) - 1;
  const courseId = listIds[index];
  if (courseId === undefined) {
    return ctx.reply(`❌ Noto'g'ri raqam. 1 dan ${listIds.length} gacha son yuboring.`);
  }
  const db = readDB();
  const course = db.courses.find((c) => String(c.id) === String(courseId));
  const result = await enrollStudentInCourse(ctx, course);

  if (!result.ok) {
    return ctx.reply(result.message);
  }
  await ctx.reply(
    `🎉 Tabriklaymiz!\n\nSiz *"${course.name}"* kursiga muvaffaqiyatli yozildingiz.\n\n💰 Narxi: ${course.price.toLocaleString()} so'm`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears("👨‍🏫 O'qituvchilar", async (ctx) => {
  const db = readDB();
  if (db.teachers.length === 0) {
    return ctx.reply("📭 Hozircha o'qituvchilar mavjud emas.");
  }

  let text = `👨‍🏫 *O'qituvchilar ro'yxati* (${db.teachers.length} ta):\n\n`;
  db.teachers.forEach((t, index) => {
    text += `${index + 1}. *${t.name}*\n   🧭 Yo'nalish: ${t.direction}\n   📈 Tajriba: ${t.experience}\n   📝 ${t.bio}\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.hears('📰 Yangiliklar', async (ctx) => {
  const db = readDB();
  if (db.news.length === 0) {
    return ctx.reply('📭 Hozircha yangiliklar mavjud emas.');
  }

  const last = db.news.slice(-5).reverse();
  await ctx.reply(`📰 *So'nggi yangiliklar* (${last.length} ta):`, { parse_mode: 'Markdown' });

  for (const n of last) {
    await ctx.reply(
      `📰 *${n.title || 'Yangilik'}*\n_${n.category || 'Umumiy'}_\n📅 ${new Date(n.date).toLocaleDateString('uz-UZ')}\n\n${n.text}`,
      { parse_mode: 'Markdown' }
    );
  }
});

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

bot.hears('🎓 Baholarim', async (ctx) => {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply("⚠️ Avval /start buyrug'ini bosing.");
  }

  const myGrades = db.grades.filter((g) => String(g.studentId) === String(student.id));
  if (myGrades.length === 0) {
    return ctx.reply('📭 Sizga hali baho qo\'yilmagan.');
  }

  let text = '🎓 *Baholaringiz*:\n\n';
  let sum = 0;
  myGrades
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((g, index) => {
      const course = db.courses.find((c) => String(c.id) === String(g.courseId));
      text += `${index + 1}. *${course ? course.name : "Noma'lum kurs"}*\n   📊 Baho: ${g.score}\n   📅 ${new Date(g.date).toLocaleDateString('uz-UZ')}\n\n`;
      sum += g.score;
    });
  const avg = (sum / myGrades.length).toFixed(1);
  text += `📈 O'rtacha baho: *${avg}*`;
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.hears('📋 Davomatim', async (ctx) => {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply("⚠️ Avval /start buyrug'ini bosing.");
  }

  const myAttendance = db.attendance.filter((a) => String(a.studentId) === String(student.id));
  if (myAttendance.length === 0) {
    return ctx.reply('📭 Sizga hali davomat belgilanmagan.');
  }

  const icons = { Keldi: '✅', Kelmadi: '❌', Kechikdi: '⏰' };
  let text = '📋 *Davomat tarixingiz*:\n\n';
  myAttendance
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15)
    .forEach((a) => {
      text += `${icons[a.status] || '•'} *${a.date}* — ${a.status}${a.comment ? `\n   💬 ${a.comment}` : ''}\n\n`;
    });

  const keldi = myAttendance.filter((a) => a.status === 'Keldi').length;
  const percent = ((keldi / myAttendance.length) * 100).toFixed(0);
  text += `📊 Davomat foizi: *${percent}%* (${keldi}/${myAttendance.length})`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.hears('📅 Darslar jadvali', async (ctx) => {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply("⚠️ Avval /start buyrug'ini bosing.");
  }

  const myEnrollments = db.enrollments.filter((e) => e.studentId === student.id);
  if (myEnrollments.length === 0) {
    return ctx.reply('📭 Siz hali hech qanday kursga yozilmagansiz.');
  }

  const myCourseIds = myEnrollments.map((e) => String(e.courseId));
  const myLessons = db.lessons.filter((l) => myCourseIds.includes(String(l.courseId)));

  if (myLessons.length === 0) {
    return ctx.reply('📭 Kurslaringiz uchun hali dars jadvali belgilanmagan.');
  }

  let text = '📅 *Darslar jadvalingiz*:\n\n';
  WEEKDAYS.forEach((day) => {
    const dayLessons = myLessons.filter((l) => l.weekday === day);
    if (dayLessons.length === 0) return;
    text += `*${day}*\n`;
    dayLessons.forEach((l) => {
      const course = db.courses.find((c) => String(c.id) === String(l.courseId));
      text += `   🕒 ${l.time} — ${course ? course.name : "Noma'lum kurs"}${l.room ? ` (🚪 ${l.room})` : ''}\n`;
    });
    text += '\n';
  });

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.hears('🏆 Yutuqlarim', async (ctx) => {
  const db = readDB();
  const student = db.students.find((s) => s.telegramId === ctx.from.id);
  if (!student) {
    return ctx.reply("⚠️ Avval /start buyrug'ini bosing.");
  }

  const myEnrollments = db.enrollments.filter((e) => String(e.studentId) === String(student.id));
  const myGrades = db.grades.filter((g) => String(g.studentId) === String(student.id));
  const myAttendance = db.attendance.filter((a) => String(a.studentId) === String(student.id));

  const achievements = [];

  if (myEnrollments.length >= 1) {
    achievements.push('🎯 Birinchi qadam — kursga yozildingiz');
  }
  if (myEnrollments.length >= 3) {
    achievements.push('📚 Bilim ishqibozi — 3+ kursga yozildingiz');
  }
  if (myGrades.length > 0) {
    const avg = myGrades.reduce((s, g) => s + g.score, 0) / myGrades.length;
    if (avg >= 90) achievements.push("🌟 A'lochi — o'rtacha baho 90+");
    else if (avg >= 70) achievements.push("👍 Yaxshi natija — o'rtacha baho 70+");
  }
  if (myAttendance.length >= 5) {
    const keldi = myAttendance.filter((a) => a.status === 'Keldi').length;
    const percent = (keldi / myAttendance.length) * 100;
    if (percent >= 90) achievements.push('🔥 Intizomli — davomat 90%+');
  }

  if (achievements.length === 0) {
    return ctx.reply(
      '📭 Hozircha yutuqlaringiz yo\'q. Kurslarga yoziling, darslarni faol o\'qing — yutuqlar shu yerda paydo bo\'ladi!'
    );
  }

  let text = '🏆 *Yutuqlaringiz*:\n\n';
  achievements.forEach((a) => (text += `${a}\n`));
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.command('help', async (ctx) => {
  const helpText = `📖 *Yordam*\n\n*Asosiy buyruqlar:*\n/start — Botni ishga tushirish\n/help — Yordam\n\n*Bo'limlar:*\n📚 Kurslar — Mavjud kurslarni ko'rish (raqam yuborib ham yozilishingiz mumkin)\n👨‍🏫 O'qituvchilar — O'qituvchilar ro'yxati\n📰 Yangiliklar — So'nggi yangiliklar\n📖 Mening darslarim — Yozilgan kurslar\n🎓 Baholarim — Baholaringiz\n📋 Davomatim — Davomat tarixi\n📅 Darslar jadvali — Haftalik jadval\n🏆 Yutuqlarim — Erishgan yutuqlaringiz\n\n*Admin buyruqlari:*\n⚙️ Admin panel — Admin paneliga kirish\n➕ Kurs/O'qituvchi/O'quvchi qo'shish\n📝 Kursga yozish — mavjud talabani kursga yozish\n👥 Talabalar ro'yxati\n📢 Yangilik yuborish\n📊 Baho qo'yish / ✅ Davomat belgilash\n🗓 Dars qo'shish\n/stats — umumiy statistika\n/users — jami foydalanuvchilar soni`;
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

bot.command('users', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const { readUsers } = require('./users');
  const data = readUsers();
  const last10 = data.users.slice(-10).reverse();

  let text = `👥 *Jami foydalanuvchilar: ${data.totalUsers}*\n\n*Oxirgi 10 tasi:*\n\n`;
  last10.forEach((u, i) => {
    text += `${i + 1}. ${u.name}${u.username ? ' (@' + u.username + ')' : ''}\n   🆔 ${u.id}\n   🕒 ${new Date(u.joinedAt).toLocaleString('uz-UZ')}\n\n`;
  });
  await ctx.reply(text || 'Hozircha foydalanuvchilar yoq.', { parse_mode: 'Markdown' });
});

bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const db = readDB();
  const stats = `📊 *Statistika*\n\n👥 Talabalar: ${db.students.length}\n👨‍🏫 O'qituvchilar: ${db.teachers.length}\n📚 Kurslar: ${db.courses.length}\n📝 Yozilmalar: ${db.enrollments.length}\n📰 Yangiliklar: ${db.news.length}\n🎓 Baholar: ${db.grades.length}\n📋 Davomat yozuvlari: ${db.attendance.length}\n📅 Darslar: ${db.lessons.length}`;
  await ctx.reply(stats, { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  await ctx.reply(
    "❓ Tushunarsiz buyruq. Iltimos, menyudan tanlang yoki /help buyrug'ini bosing.",
    mainMenu(isAdmin(ctx))
  );
});

bot.launch();
console.log('✅ Edu Manager bot ishga tushdi...');
console.log(`🤖 Bot token: ${BOT_TOKEN.slice(0, 10)}...`);
console.log(`👑 Admin ID: ${process.env.ADMIN_IDS || 'sozlanmagan'}`);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));