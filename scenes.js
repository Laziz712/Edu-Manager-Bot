const { Scenes, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const { mainMenu, adminMenu, cancelKeyboard } = require('./keyboards');

async function cancelScene(ctx) {
  const db = readDB();
  const session = db.sessions[ctx.from.id];
  const role = session ? session.role : null;
  await ctx.reply('❌ Bekor qilindi.', mainMenu(role));
  return ctx.scene.leave();
}

function isCancel(ctx) {
  return ctx.message && ctx.message.text === '❌ Bekor qilish';
}

// ========== LOGIN SCENE ==========
const loginScene = new Scenes.WizardScene(
  'LOGIN',
  async (ctx) => {
    await ctx.reply(
      '🔐 *Tizimga kirish*\n\nEmail yoki login kiriting:\n\n📧 jasur@edumanager.uz\n👤 admin',
      { parse_mode: 'Markdown', ...cancelKeyboard }
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.login = { email: ctx.message.text.trim().toLowerCase() };
    await ctx.reply('🔑 Parol kiriting:', cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const password = ctx.message.text;
    const email = ctx.wizard.state.login.email;

    const db = readDB();
    const user = db.users.find(u => 
      u.email.toLowerCase() === email && u.password === password
    );

    if (!user) {
      await ctx.reply('❌ *Login yoki parol noto\'g\'ri!*\n\nQayta urinib ko\'ring.', { parse_mode: 'Markdown' });
      return ctx.scene.leave();
    }

    db.sessions[ctx.from.id] = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      loggedIn: true,
      loginAt: new Date().toISOString()
    };

    if (!user.telegramId) {
      user.telegramId = ctx.from.id;
      const userIndex = db.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) db.users[userIndex] = user;
    }

    writeDB(db);

    const roleText = {
      admin: '👑 Admin',
      teacher: '👨‍🏫 O\'qituvchi',
      student: '👤 O\'quvchi'
    };

    await ctx.reply(
      `✅ *Tizimga muvaffaqiyatli kirdingiz!*\n\n👤 *${user.name}*\n🎭 *${roleText[user.role] || user.role}*\n📧 ${user.email}\n\nKerakli bo'limni tanlang 👇`,
      { parse_mode: 'Markdown', ...mainMenu(user.role) }
    );
    return ctx.scene.leave();
  }
);

// ========== ADD COURSE SCENE ==========
const addCourseScene = new Scenes.WizardScene(
  'ADD_COURSE',
  async (ctx) => {
    await ctx.reply("📖 *Kurs qo'shish*\n\nKurs nomini kiriting:", { parse_mode: 'Markdown', ...cancelKeyboard });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.course = { name: ctx.message.text };
    await ctx.reply('📝 Kurs tavsifini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.course.description = ctx.message.text;
    await ctx.reply("💰 Kurs narxini kiriting (faqat raqam, so'mda):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const price = Number(ctx.message.text);
    if (isNaN(price) || price <= 0) {
      await ctx.reply('❌ Iltimos faqat musbat raqam kiriting. Masalan: 350000');
      return;
    }
    ctx.wizard.state.course.price = price;
    await ctx.reply("📅 Kurs davomiyligini kiriting (masalan: 3 oy):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.course.duration = ctx.message.text;
    await ctx.reply("👥 Maksimal o'quvchi sonini kiriting:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const maxStudents = Number(ctx.message.text);
    if (isNaN(maxStudents) || maxStudents <= 0) {
      await ctx.reply('❌ Iltimos faqat musbat raqam kiriting.');
      return;
    }
    ctx.wizard.state.course.maxStudents = maxStudents;

    const db = readDB();
    if (db.teachers.length === 0) {
      await ctx.reply("⚠️ Avval o'qituvchi qo'shing.", adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.teachers.map((t) => [
      Markup.button.callback(`${t.name} (${t.subject})`, `pick_teacher_${t.id}`),
    ]);
    await ctx.reply("👨‍🏫 O'qituvchini tanlang:", Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  }
);

addCourseScene.action(/pick_teacher_(.+)/, async (ctx) => {
  const teacherId = ctx.match[1];
  const db = readDB();
  const course = ctx.wizard.state.course;
  const newCourse = {
    id: 'course_' + Date.now(),
    ...course,
    teacherId,
    createdAt: new Date().toISOString(),
  };
  db.courses.push(newCourse);
  writeDB(db);
  await ctx.answerCbQuery('✅ Saqlandi');
  const teacher = db.teachers.find(t => t.id === teacherId);
  await ctx.reply(
    `✅ *"${newCourse.name}"* kursi qo'shildi!\n\n📝 ${newCourse.description}\n💰 ${newCourse.price.toLocaleString()} so'm\n📅 ${newCourse.duration}\n👨‍🏫 ${teacher?.name || "Noma'lum"}\n👥 Maksimal: ${newCourse.maxStudents} ta`,
    { parse_mode: 'Markdown', ...adminMenu }
  );
  return ctx.scene.leave();
});

// ========== ADD TEACHER SCENE ==========
const addTeacherScene = new Scenes.WizardScene(
  'ADD_TEACHER',
  async (ctx) => {
    await ctx.reply("👨‍🏫 *O'qituvchi qo'shish*\n\nF.I.Sh kiriting:", { parse_mode: 'Markdown', ...cancelKeyboard });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher = { name: ctx.message.text };
    await ctx.reply('📚 Fanini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.subject = ctx.message.text;
    await ctx.reply('📞 Telefon raqamini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.phone = ctx.message.text;
    await ctx.reply('📧 Email kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.email = ctx.message.text;
    await ctx.reply('🔑 Parol kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const password = ctx.message.text;
    const db = readDB();
    const teacherId = 'teacher_' + Date.now();
    const userId = 'user_' + Date.now();

    const newTeacher = {
      id: teacherId,
      ...ctx.wizard.state.teacher,
      userId,
      createdAt: new Date().toISOString(),
    };

    const newUser = {
      id: userId,
      email: ctx.wizard.state.teacher.email,
      password,
      role: 'teacher',
      name: ctx.wizard.state.teacher.name,
      phone: ctx.wizard.state.teacher.phone,
      telegramId: null,
      createdAt: new Date().toISOString()
    };

    db.teachers.push(newTeacher);
    db.users.push(newUser);
    writeDB(db);

    await ctx.reply(
      `✅ *O'qituvchi qo'shildi!*\n\n👤 ${newTeacher.name}\n📚 ${newTeacher.subject}\n📞 ${newTeacher.phone}\n📧 ${newTeacher.email}`,
      { parse_mode: 'Markdown', ...adminMenu }
    );
    return ctx.scene.leave();
  }
);

// ========== ADD STUDENT SCENE ==========
const addStudentScene = new Scenes.WizardScene(
  'ADD_STUDENT',
  async (ctx) => {
    await ctx.reply("👤 *O'quvchi qo'shish*\n\nF.I.Sh kiriting:", { parse_mode: 'Markdown', ...cancelKeyboard });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student = { name: ctx.message.text };
    await ctx.reply('📞 Telefon raqamini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student.phone = ctx.message.text;
    await ctx.reply('📧 Email kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student.email = ctx.message.text;
    await ctx.reply('🔑 Parol kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const password = ctx.message.text;
    const db = readDB();
    const studentId = 'student_' + Date.now();
    const userId = 'user_' + Date.now();

    const newStudent = {
      id: studentId,
      ...ctx.wizard.state.student,
      userId,
      telegramId: null,
      joinedAt: new Date().toISOString(),
    };

    const newUser = {
      id: userId,
      email: ctx.wizard.state.student.email,
      password,
      role: 'student',
      name: ctx.wizard.state.student.name,
      phone: ctx.wizard.state.student.phone,
      telegramId: null,
      createdAt: new Date().toISOString()
    };

    db.students.push(newStudent);
    db.users.push(newUser);
    writeDB(db);

    await ctx.reply(
      `✅ *O'quvchi qo'shildi!*\n\n👤 ${newStudent.name}\n📞 ${newStudent.phone}\n📧 ${newStudent.email}`,
      { parse_mode: 'Markdown', ...adminMenu }
    );
    return ctx.scene.leave();
  }
);

// ========== SEND NEWS SCENE ==========
const sendNewsScene = new Scenes.WizardScene(
  'SEND_NEWS',
  async (ctx) => {
    await ctx.reply('📢 *Yangilik sarlavhasi*\n\nSarlavha kiriting:', { parse_mode: 'Markdown', ...cancelKeyboard });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.news = { title: ctx.message.text };
    await ctx.reply('📝 Yangilik matnini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const text = ctx.message.text;
    const db = readDB();
    db.news.push({
      id: 'news_' + Date.now(),
      title: ctx.wizard.state.news.title,
      text,
      date: new Date().toISOString(),
      image: null
    });
    writeDB(db);

    let sent = 0;
    for (const s of db.students) {
      if (s.telegramId) {
        try {
          await ctx.telegram.sendMessage(
            s.telegramId,
            `📰 *${ctx.wizard.state.news.title}*\n\n${text}\n\n📅 ${new Date().toLocaleDateString('uz-UZ')}`,
            { parse_mode: 'Markdown' }
          );
          sent++;
        } catch (e) {}
      }
    }
    await ctx.reply(
      `✅ *Yangilik yuborildi!*\n\n📤 ${sent} ta foydalanuvchiga yuborildi.`,
      { parse_mode: 'Markdown', ...adminMenu }
    );
    return ctx.scene.leave();
  }
);

// ========== ADD GRADE SCENE ==========
const addGradeScene = new Scenes.WizardScene(
  'ADD_GRADE',
  async (ctx) => {
    const db = readDB();
    const students = db.students;
    if (students.length === 0) {
      await ctx.reply('📭 Avval o\'quvchi qo\'shing.', adminMenu);
      return ctx.scene.leave();
    }
    const buttons = students.map((s) => [
      Markup.button.callback(s.name, `grade_student_${s.id}`),
    ]);
    await ctx.reply("👤 *Baho qo'yish*\n\nO'quvchini tanlang:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  }
);

addGradeScene.action(/grade_student_(.+)/, async (ctx) => {
  const studentId = ctx.match[1];
  ctx.wizard.state.grade = { studentId };
  const db = readDB();
  const buttons = db.courses.map((c) => [
    Markup.button.callback(c.name, `grade_course_${c.id}`),
  ]);
  await ctx.editMessageText("📖 Kursni tanlang:", Markup.inlineKeyboard(buttons));
  return ctx.wizard.next();
});

addGradeScene.action(/grade_course_(.+)/, async (ctx) => {
  const courseId = ctx.match[1];
  ctx.wizard.state.grade.courseId = courseId;
  await ctx.editMessageText("⭐ Baho kiriting (2-5):");
  return ctx.wizard.next();
});

addGradeScene.on('text', async (ctx) => {
  if (isCancel(ctx)) return cancelScene(ctx);
  const grade = Number(ctx.message.text);
  if (isNaN(grade) || grade < 2 || grade > 5) {
    await ctx.reply('❌ Baho 2 dan 5 gacha bo\'lishi kerak!');
    return;
  }
  const db = readDB();
  const { studentId, courseId } = ctx.wizard.state.grade;
  db.grades.push({
    id: 'grade_' + Date.now(),
    studentId,
    courseId,
    grade,
    date: new Date().toISOString(),
  });
  writeDB(db);

  const student = db.students.find(s => s.id === studentId);
  const course = db.courses.find(c => c.id === courseId);
  await ctx.reply(
    `✅ *Baho qo'yildi!*\n\n👤 ${student?.name || 'Noma\'lum'}\n📖 ${course?.name || 'Noma\'lum'}\n⭐ ${grade}`,
    { parse_mode: 'Markdown', ...adminMenu }
  );
  return ctx.scene.leave();
});

// ========== ATTENDANCE SCENE ==========
const attendanceScene = new Scenes.WizardScene(
  'ATTENDANCE',
  async (ctx) => {
    const db = readDB();
    if (db.students.length === 0) {
      await ctx.reply('📭 Avval o\'quvchi qo\'shing.', adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.students.map((s) => [
      Markup.button.callback(s.name, `att_student_${s.id}`),
    ]);
    await ctx.reply("✅ *Davomat*\n\nO'quvchini tanlang:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  }
);

attendanceScene.action(/att_student_(.+)/, async (ctx) => {
  const studentId = ctx.match[1];
  ctx.wizard.state.attendance = { studentId };
  await ctx.editMessageText("📅 Holatni tanlang:", Markup.inlineKeyboard([
    [Markup.button.callback('✅ Keldi', 'att_status_present')],
    [Markup.button.callback('❌ Kelmadi', 'att_status_absent')],
    [Markup.button.callback('📝 Kechikdi', 'att_status_late')],
    [Markup.button.callback("🏥 Sog'liq", 'att_status_sick')],
  ]));
  return ctx.wizard.next();
});

attendanceScene.action(/att_status_(.+)/, async (ctx) => {
  const status = ctx.match[1];
  ctx.wizard.state.attendance.status = status;
  await ctx.editMessageText("💬 Izoh kiriting (yo'q bo'lsa 'yo'q' deb yozing):");
  return ctx.wizard.next();
});

attendanceScene.on('text', async (ctx) => {
  if (isCancel(ctx)) return cancelScene(ctx);
  const note = ctx.message.text === "yo'q" ? null : ctx.message.text;
  const db = readDB();
  const { studentId, status } = ctx.wizard.state.attendance;

  const statusEmojis = { present: '✅', absent: '❌', late: '📝', sick: '🏥' };
  const statusTexts = { present: 'Keldi', absent: 'Kelmadi', late: 'Kechikdi', sick: "Sog'liq sababli" };

  db.attendance.push({
    id: 'att_' + Date.now(),
    studentId,
    status,
    note,
    date: new Date().toISOString(),
  });
  writeDB(db);

  const student = db.students.find(s => s.id === studentId);
  await ctx.reply(
    `✅ *Davomat saqlandi!*\n\n👤 ${student?.name || 'Noma\'lum'}\n${statusEmojis[status]} ${statusTexts[status]}\n📅 ${new Date().toLocaleDateString('uz-UZ')}${note ? '\n💬 ' + note : ''}`,
    { parse_mode: 'Markdown', ...adminMenu }
  );
  return ctx.scene.leave();
});

// ========== PAYMENT SCENE ==========
const addPaymentScene = new Scenes.WizardScene(
  'ADD_PAYMENT',
  async (ctx) => {
    const db = readDB();
    if (db.students.length === 0) {
      await ctx.reply('📭 Avval o\'quvchi qo\'shing.', adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.students.map((s) => [
      Markup.button.callback(s.name, `pay_student_${s.id}`),
    ]);
    await ctx.reply("💰 *To'lov qo'shish*\n\nO'quvchini tanlang:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  }
);

addPaymentScene.action(/pay_student_(.+)/, async (ctx) => {
  const studentId = ctx.match[1];
  ctx.wizard.state.payment = { studentId };
  await ctx.editMessageText("💵 Summani kiriting (so'm):");
  return ctx.wizard.next();
});

addPaymentScene.on('text', async (ctx) => {
  if (isCancel(ctx)) return cancelScene(ctx);
  const amount = Number(ctx.message.text);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Iltimos to\'g\'ri summa kiriting.');
    return;
  }
  const db = readDB();
  const { studentId } = ctx.wizard.state.payment;
  db.payments.push({
    id: 'pay_' + Date.now(),
    studentId,
    amount,
    date: new Date().toISOString(),
    note: 'Admin tomonidan qo\'shildi'
  });
  writeDB(db);

  const student = db.students.find(s => s.id === studentId);
  await ctx.reply(
    `✅ *To'lov qo'shildi!*\n\n👤 ${student?.name || 'Noma\'lum'}\n💵 ${amount.toLocaleString()} so'm`,
    { parse_mode: 'Markdown', ...adminMenu }
  );
  return ctx.scene.leave();
});

module.exports = { 
  loginScene,
  addCourseScene, 
  addTeacherScene, 
  addStudentScene, 
  sendNewsScene,
  addGradeScene,
  attendanceScene,
  addPaymentScene,
};