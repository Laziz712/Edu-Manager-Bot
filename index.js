require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const { isAdmin, isLoggedIn, getUserRole, loginMenu, mainMenu, adminMenu, courseEnrollInline, backToMain } = require('./keyboards');
const {
  loginScene,
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
  addGradeScene,
  attendanceScene,
  addPaymentScene,
} = require('./scenes');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi! .env faylini tekshiring.');
  process.exit(1);
}

// ========== TELEGRAF BOT ==========
const bot = new Telegraf(BOT_TOKEN);

const stage = new Scenes.Stage([
  loginScene,
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
  addGradeScene,
  attendanceScene,
  addPaymentScene,
]);

bot.use(session());
bot.use(stage.middleware());

// ========== /start ==========
bot.start(async (ctx) => {
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];

  if (sessionData && sessionData.loggedIn) {
    await ctx.reply(
      `👋 *Qaytib keldingiz, ${sessionData.name}!*\n\n🎓 Edu Manager botiga xush kelibsiz!\n\nKerakli bo'limni tanlang 👇`,
      { parse_mode: 'Markdown', ...mainMenu(sessionData.role) }
    );
  } else {
    await ctx.reply(
      `👋 *Assalomu alaykum!*\n\n🎓 *Edu Manager* botiga xush kelibsiz!\n\nTizimga kirish uchun *Login* tugmasini bosing.\n\n📧 *Test login:*\n• jasur@edumanager.uz / 12345678\n• admin / admin123`,
      { parse_mode: 'Markdown', ...loginMenu }
    );
  }
});

// ========== 🔐 Login ==========
bot.hears('🔐 Login', async (ctx) => {
  ctx.scene.enter('LOGIN');
});

// ========== Logout ==========
bot.command('logout', async (ctx) => {
  const db = readDB();
  delete db.sessions[ctx.from.id];
  writeDB(db);
  await ctx.reply(
    '👋 *Tizimdan chiqdingiz.*\n\nQaytib kirish uchun /start bosing.',
    { parse_mode: 'Markdown', ...loginMenu }
  );
});

// ========== Check Auth Middleware ==========
function requireAuth(ctx) {
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  if (!sessionData || !sessionData.loggedIn) {
    ctx.reply(
      '🔐 *Avval tizimga kiring!*\n\n/login yoki /start buyrug\'ini bosing.',
      { parse_mode: 'Markdown', ...loginMenu }
    );
    return false;
  }
  return true;
}

function requireAdmin(ctx) {
  if (!requireAuth(ctx)) return false;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  if (sessionData.role !== 'admin') {
    ctx.reply('❌ *Bu bo\'lim faqat adminlar uchun!*', { parse_mode: 'Markdown' });
    return false;
  }
  return true;
}

// ========== ⚙️ Admin panel ==========
bot.hears('⚙️ Admin panel', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  await ctx.reply(
    '🔧 *Admin Paneli*\n\nQuyidagi amallardan birini tanlang:',
    { parse_mode: 'Markdown', ...adminMenu }
  );
});

// ========== ⬅️ Asosiy menu ==========
bot.hears('⬅️ Asosiy menu', async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  await ctx.reply('🏠 *Asosiy menu*', { parse_mode: 'Markdown', ...mainMenu(sessionData.role) });
});

// ========== Admin Scenes ==========
bot.hears("➕ Kurs qo'shish", (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.scene.enter('ADD_COURSE');
});

bot.hears("➕ O'qituvchi qo'shish", (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.scene.enter('ADD_TEACHER');
});

bot.hears("➕ O'quvchi qo'shish", (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.scene.enter('ADD_STUDENT');
});

bot.hears('📢 Yangilik yuborish', (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.scene.enter('SEND_NEWS');
});

bot.hears("✏️ Baho qo'yish", (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  if (sessionData.role !== 'admin' && sessionData.role !== 'teacher') {
    return ctx.reply('❌ *Bu bo\'lim faqat o\'qituvchilar va adminlar uchun!*', { parse_mode: 'Markdown' });
  }
  ctx.scene.enter('ADD_GRADE');
});

bot.hears('✅ Davomat olish', (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.scene.enter('ATTENDANCE');
});

bot.hears("💰 To'lovlar", (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.scene.enter('ADD_PAYMENT');
});

// ========== 📊 Statistika ==========
bot.hears('📊 Statistika', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  const db = readDB();
  const stats = `📊 *Umumiy statistika*

👥 Foydalanuvchilar: *${db.users.length}*
👨‍🏫 O'qituvchilar: *${db.teachers.length}*
👤 O'quvchilar: *${db.students.length}*
📚 Kurslar: *${db.courses.length}*
📝 Yozilmalar: *${db.enrollments.length}*
⭐ Baholar: *${db.grades.length}*
📅 Davomat: *${db.attendance.length}*
💰 To'lovlar: *${db.payments.length}*
📰 Yangiliklar: *${db.news.length}*`;
  await ctx.reply(stats, { parse_mode: 'Markdown' });
});

// ========== 📋 Barcha o'quvchilar ==========
bot.hears("📋 Barcha o'quvchilar", async (ctx) => {
  if (!requireAdmin(ctx)) return;
  const db = readDB();
  if (db.students.length === 0) {
    return ctx.reply("📭 Hozircha o'quvchilar mavjud emas.");
  }
  let text = `📋 *Barcha o'quvchilar* (${db.students.length} ta):\n\n`;
  db.students.forEach((s, i) => {
    const enrollments = db.enrollments.filter(e => e.studentId === s.id).length;
    text += `${i + 1}. *${s.name}*\n   📞 ${s.phone || "Noma'lum"}\n   📧 ${s.email || "Noma'lum"}\n   📚 Kurslar: ${enrollments} ta\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 🗓 Dars jadvali ==========
bot.hears('🗓 Dars jadvali', async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];

  if (sessionData.role === 'admin') {
    if (db.schedule.length === 0) {
      return ctx.reply('📭 Hozircha dars jadvali mavjud emas.');
    }
    let text = `🗓 *Dars jadvali*:\n\n`;
    db.schedule.forEach((s) => {
      const course = db.courses.find(c => c.id === s.courseId);
      text += `📖 *${course?.name || "Noma'lum"}*\n📅 ${s.day}\n🕐 ${s.time}\n🏫 ${s.room}\n\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  } else {
    const user = db.users.find(u => u.id === sessionData.userId);
    const student = db.students.find(s => s.userId === user.id);
    if (!student) {
      return ctx.reply('📭 Sizda hali dars jadvali mavjud emas.');
    }
    const myCourses = db.enrollments.filter(e => e.studentId === student.id).map(e => e.courseId);
    const mySchedule = db.schedule.filter(s => myCourses.includes(s.courseId));
    if (mySchedule.length === 0) {
      return ctx.reply('📭 Sizda hali dars jadvali mavjud emas.');
    }
    let text = `🗓 *Mening dars jadvalim*:\n\n`;
    mySchedule.forEach((s) => {
      const course = db.courses.find(c => c.id === s.courseId);
      text += `📖 *${course?.name || "Noma'lum"}*\n📅 ${s.day}\n🕐 ${s.time}\n🏫 ${s.room}\n\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  }
});

// ========== 📚 Kurslar ==========
bot.hears('📚 Kurslar', async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];

  if (db.courses.length === 0) {
    return ctx.reply('📭 Hozircha kurslar mavjud emas.');
  }

  await ctx.reply(`📚 *Mavjud kurslar* (${db.courses.length} ta):`, { parse_mode: 'Markdown' });

  for (const c of db.courses) {
    const teacher = db.teachers.find((t) => t.id === c.teacherId);
    const enrolledCount = db.enrollments.filter(e => e.courseId === c.id).length;
    const isFull = enrolledCount >= c.maxStudents;

    let text = `📖 *${c.name}*\n\n📝 ${c.description}\n💰 Narxi: *${c.price.toLocaleString()}* so'm\n📅 Davomiyligi: ${c.duration}\n👨‍🏫 O'qituvchi: ${teacher ? teacher.name : "Noma'lum"}\n👥 Yozilgan: ${enrolledCount} / ${c.maxStudents}\n`;
    if (isFull) text += `⚠️ *Joylar tugagan!*`;

    await ctx.reply(
      text,
      {
        parse_mode: 'Markdown',
        ...courseEnrollInline(c.id),
      }
    );
  }
});

// ========== Kursga Yozilish ==========
bot.action(/enroll_(.+)/, async (ctx) => {
  try {
    const courseId = ctx.match[1];
    const db = readDB();
    const sessionData = db.sessions[ctx.from.id];

    if (!sessionData || !sessionData.loggedIn) {
      return ctx.answerCbQuery('🔐 Avval tizimga kiring!');
    }

    const user = db.users.find(u => u.id === sessionData.userId);
    const course = db.courses.find((c) => c.id === courseId);

    if (!user || !course) {
      return ctx.answerCbQuery('❌ Xatolik yuz berdi.');
    }

    let student = db.students.find(s => s.userId === user.id);
    if (!student) {
      student = {
        id: 'student_' + Date.now(),
        userId: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        telegramId: ctx.from.id,
        joinedAt: new Date().toISOString(),
      };
      db.students.push(student);
    }

    const already = db.enrollments.find(
      (e) => e.studentId === student.id && e.courseId === course.id
    );
    if (already) {
      return ctx.answerCbQuery('⚠️ Siz allaqachon bu kursga yozilgansiz.');
    }

    const enrolledCount = db.enrollments.filter(e => e.courseId === course.id).length;
    if (enrolledCount >= course.maxStudents) {
      return ctx.answerCbQuery('❌ Joylar tugagan!');
    }

    db.enrollments.push({
      id: 'enroll_' + Date.now(),
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
          `📢 *Yangi yozilish!*\n\n👤 ${user.name}\n📖 ${course.name}\n📞 ${user.phone || 'Telefon kiritilmagan'}`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    }
  } catch (e) {
    console.error('Enroll error:', e);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi.');
  }
});

// ========== Kurs Batafsil ==========
bot.action(/detail_(.+)/, async (ctx) => {
  try {
    const courseId = ctx.match[1];
    const db = readDB();
    const course = db.courses.find((c) => c.id === courseId);
    if (!course) return ctx.answerCbQuery('❌ Kurs topilmadi.');

    const teacher = db.teachers.find((t) => t.id === course.teacherId);
    const enrolledCount = db.enrollments.filter(e => e.courseId === course.id).length;
    const schedule = db.schedule.filter(s => s.courseId === course.id);

    let text = `📋 *${course.name}* — Batafsil\n\n📝 ${course.description}\n\n💰 *Narxi:* ${course.price.toLocaleString()} so'm\n📅 *Davomiyligi:* ${course.duration}\n👨‍🏫 *O'qituvchi:* ${teacher ? teacher.name : "Noma'lum"}\n👥 *Joylar:* ${enrolledCount} / ${course.maxStudents}\n\n`;

    if (schedule.length > 0) {
      text += `🗓 *Dars jadvali:*\n`;
      schedule.forEach(s => {
        text += `• ${s.day} — ${s.time} (${s.room})\n`;
      });
    }

    await ctx.answerCbQuery('✅');
    await ctx.reply(text, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Detail error:', e);
    await ctx.answerCbQuery('❌ Xatolik.');
  }
});

// ========== 👨‍🏫 O'qituvchilar ==========
bot.hears("👨‍🏫 O'qituvchilar", async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  if (db.teachers.length === 0) {
    return ctx.reply("📭 Hozircha o'qituvchilar mavjud emas.");
  }

  let text = `👨‍🏫 *O'qituvchilar ro'yxati* (${db.teachers.length} ta):\n\n`;
  db.teachers.forEach((t, index) => {
    const coursesCount = db.courses.filter(c => c.teacherId === t.id).length;
    text += `${index + 1}. *${t.name}*\n   📚 Fan: ${t.subject}\n   📞 ${t.phone}\n   📖 Kurslar: ${coursesCount} ta\n\n`;
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 📰 Yangiliklar ==========
bot.hears('📰 Yangiliklar', async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  if (db.news.length === 0) {
    return ctx.reply('📭 Hozircha yangiliklar mavjud emas.');
  }

  const last = db.news.slice(-5).reverse();
  await ctx.reply(`📰 *So'nggi yangiliklar* (${last.length} ta):`, { parse_mode: 'Markdown' });

  for (const n of last) {
    await ctx.reply(
      `📰 *${n.title}*\n\n${n.text}\n\n📅 ${new Date(n.date).toLocaleDateString('uz-UZ')}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ========== 📖 Mening darslarim ==========
bot.hears('📖 Mening darslarim', async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  const user = db.users.find(u => u.id === sessionData.userId);

  let student = db.students.find(s => s.userId === user.id);
  if (!student) {
    student = {
      id: 'student_' + Date.now(),
      userId: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      telegramId: ctx.from.id,
      joinedAt: new Date().toISOString(),
    };
    db.students.push(student);
    writeDB(db);
  }

  const myEnrollments = db.enrollments.filter((e) => e.studentId === student.id);
  if (myEnrollments.length === 0) {
    return ctx.reply(
      '📭 Siz hali hech qanday kursga yozilmagansiz.\n\n📚 "Kurslar" bo\'limiga o\'ting.',
      mainMenu(sessionData.role)
    );
  }

  let text = '📖 *Mening darslarim*:\n\n';
  myEnrollments.forEach((e, index) => {
    const course = db.courses.find((c) => c.id === e.courseId);
    if (course) {
      const teacher = db.teachers.find((t) => t.id === course.teacherId);
      const grades = db.grades.filter(g => g.studentId === student.id && g.courseId === course.id);
      const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b.grade, 0) / grades.length).toFixed(1) : "Baholar yo'q";
      text += `${index + 1}. *${course.name}*\n   👨‍🏫 ${teacher ? teacher.name : "Noma'lum o'qituvchi"}\n   📅 ${new Date(e.date).toLocaleDateString('uz-UZ')}\n   ⭐ O'rtacha baho: ${avgGrade}\n\n`;
    }
  });
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 📊 Baholarim ==========
bot.hears('📊 Baholarim', async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  const user = db.users.find(u => u.id === sessionData.userId);
  const student = db.students.find(s => s.userId === user.id);

  if (!student) {
    return ctx.reply("📭 Sizga hali baho qo'yilmagan.");
  }

  const myGrades = db.grades.filter((g) => g.studentId === student.id);
  if (myGrades.length === 0) {
    return ctx.reply("📭 Sizga hali baho qo'yilmagan.");
  }

  let text = '📊 *Mening baholarim*:\n\n';
  myGrades.forEach((g) => {
    const course = db.courses.find((c) => c.id === g.courseId);
    text += `📖 *${course?.name || "Noma'lum"}*\n   ⭐ Baho: *${g.grade}*\n   📅 ${new Date(g.date).toLocaleDateString('uz-UZ')}\n\n`;
  });

  const avg = (myGrades.reduce((a, b) => a + b.grade, 0) / myGrades.length).toFixed(1);
  text += `📈 *O'rtacha baho: ${avg}*`;
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 💳 To'lovlarim ==========
bot.hears("💳 To'lovlarim", async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  const user = db.users.find(u => u.id === sessionData.userId);
  const student = db.students.find(s => s.userId === user.id);

  if (!student) {
    return ctx.reply("📭 Sizda hali to'lovlar mavjud emas.");
  }

  const myPayments = db.payments.filter((p) => p.studentId === student.id);
  if (myPayments.length === 0) {
    return ctx.reply("📭 Sizda hali to'lovlar mavjud emas.\n\nTo'lov qilish uchun admin bilan bog'laning.");
  }

  let text = "💳 *Mening to'lovlarim*:\n\n";
  let total = 0;
  myPayments.forEach((p) => {
    total += p.amount;
    text += `💵 *${p.amount.toLocaleString()}* so'm\n📅 ${new Date(p.date).toLocaleDateString('uz-UZ')}\n📝 ${p.note || ''}\n\n`;
  });
  text += `💰 *Jami: ${total.toLocaleString()} so'm*`;
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== 👤 Profil ==========
bot.hears('👤 Profil', async (ctx) => {
  if (!requireAuth(ctx)) return;
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  const user = db.users.find(u => u.id === sessionData.userId);

  const roleText = {
    admin: '👑 Admin',
    teacher: '👨‍🏫 O\'qituvchi',
    student: '👤 O\'quvchi'
  };

  let text = `👤 *Mening profilim*\n\n`;
  text += `📝 *Ism:* ${user.name}\n`;
  text += `📧 *Email:* ${user.email}\n`;
  text += `📞 *Telefon:* ${user.phone || "Noma'lum"}\n`;
  text += `🎭 *Rol:* ${roleText[user.role] || user.role}\n`;
  text += `📅 *Ro'yxatdan o'tgan:* ${new Date(user.createdAt).toLocaleDateString('uz-UZ')}\n\n`;
  text += `🔓 Chiqish uchun: /logout`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ========== ❓ Yordam ==========
bot.hears('❓ Yordam', async (ctx) => {
  const helpText = `📖 *Yordam*

*Asosiy buyruqlar:*
/start — Bosh sahifa
/logout — Tizimdan chiqish

*Bo'limlar:*
📚 Kurslar — Mavjud kurslarni ko'rish va yozilish
👨‍🏫 O'qituvchilar — O'qituvchilar ro'yxati
📰 Yangiliklar — So'nggi yangiliklar
📖 Mening darslarim — Yozilgan kurslar
📊 Baholarim — O'z baholaringiz
💳 To'lovlarim — To'lovlar tarixi
🗓 Dars jadvali — Darslar jadvali
👤 Profil — Shaxsiy ma'lumotlar

*Test loginlar:*
📧 jasur@edumanager.uz / 12345678
👤 admin / admin123`;
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// ========== /help ==========
bot.command('help', async (ctx) => {
  const helpText = `📖 *Yordam*

*Asosiy buyruqlar:*
/start — Bosh sahifa
/logout — Tizimdan chiqish

*Bo'limlar:*
📚 Kurslar — Mavjud kurslarni ko'rish
👨‍🏫 O'qituvchilar — O'qituvchilar ro'yxati
📰 Yangiliklar — So'nggi yangiliklar
📖 Mening darslarim — Yozilgan kurslar
📊 Baholarim — O'z baholaringiz
💳 To'lovlarim — To'lovlar tarixi
🗓 Dars jadvali — Darslar jadvali
👤 Profil — Shaxsiy ma'lumotlar`;
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// ========== Unknown messages ==========
bot.on('text', async (ctx) => {
  const db = readDB();
  const sessionData = db.sessions[ctx.from.id];
  if (sessionData && sessionData.loggedIn) {
    await ctx.reply(
      '❓ Tushunarsiz buyruq. Iltimos, menyudan tanlang.',
      mainMenu(sessionData.role)
    );
  } else {
    await ctx.reply(
      '🔐 *Avval tizimga kiring!*\n\n/login yoki /start buyrug\'ini bosing.',
      { parse_mode: 'Markdown', ...loginMenu }
    );
  }
});

// ========== Launch ==========
bot.launch();
console.log('✅ Edu Manager bot ishga tushdi...');
console.log(`🤖 Bot token: ${BOT_TOKEN.slice(0, 10)}...`);
console.log(`👑 Admin ID: ${process.env.ADMIN_IDS || 'sozlanmagan'}`);
console.log('');
console.log('📧 Test login: jasur@edumanager.uz / 12345678');
console.log('👤 Test login: admin / admin123');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));