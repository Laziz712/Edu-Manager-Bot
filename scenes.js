const { Scenes, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const { adminMenu, cancelKeyboard } = require('./keyboards');

async function cancelScene(ctx) {
  await ctx.replyWithMarkdown('❌ Bekor qilindi.', adminMenu);
  return ctx.scene.leave();
}

function isCancel(ctx) {
  return ctx.message && ctx.message.text === '❌ Bekor qilish';
}

// ========== ADD COURSE SCENE ==========
const addCourseScene = new Scenes.WizardScene(
  'ADD_COURSE',
  async (ctx) => {
    await ctx.replyWithMarkdown("📖 *Kurs qo'shish*\n\nKurs nomini kiriting:", cancelKeyboard);
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

    const db = readDB();
    if (db.teachers.length === 0) {
      await ctx.replyWithMarkdown("⚠️ Avval kamida bitta o'qituvchi qo'shing.", adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.teachers.map((t) => [
      Markup.button.callback(t.name, `pick_teacher_${t.id}`),
    ]);
    await ctx.replyWithMarkdown(
      "👨‍🏫 Kurs uchun o'qituvchini tanlang:",
      Markup.inlineKeyboard(buttons)
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Inline keyboard orqali tugallanadi
    return;
  }
);

addCourseScene.action(/pick_teacher_(.+)/, async (ctx) => {
  const teacherId = ctx.match[1];
  const db = readDB();
  const course = ctx.wizard.state.course;
  const newCourse = {
    id: Date.now(),
    name: course.name,
    description: course.description,
    price: course.price,
    duration: course.duration,
    teacherId,
    createdAt: new Date().toISOString(),
    studentsCount: 0,
  };
  db.courses.push(newCourse);
  writeDB(db);
  await ctx.answerCbQuery('✅ Saqlandi');
  await ctx.replyWithMarkdown(
    `✅ *"${newCourse.name}"* kursi muvaffaqiyatli qo'shildi!\n\n📝 ${newCourse.description}\n💰 Narxi: ${newCourse.price.toLocaleString()} so'm\n📅 Davomiyligi: ${newCourse.duration}\n👨‍🏫 O'qituvchi: ${db.teachers.find(t => String(t.id) === String(teacherId))?.name || "Noma'lum"}`,
    adminMenu
  );
  return ctx.scene.leave();
});

// ========== ADD TEACHER SCENE ==========
const addTeacherScene = new Scenes.WizardScene(
  'ADD_TEACHER',
  async (ctx) => {
    await ctx.replyWithMarkdown("👨‍🏫 *O'qituvchi qo'shish*\n\nF.I.Sh kiriting:", cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher = { name: ctx.message.text };
    await ctx.reply('📚 Fanini kiriting (masalan: Matematika):');
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
    await ctx.reply('📧 Email manzilini kiriting (yo\'q bo\'lsa "yo\'q" deb yozing):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const email = ctx.message.text === "yo'q" ? null : ctx.message.text;
    ctx.wizard.state.teacher.email = email;

    const db = readDB();
    const newTeacher = { 
      id: Date.now(), 
      ...ctx.wizard.state.teacher,
      createdAt: new Date().toISOString(),
    };
    db.teachers.push(newTeacher);
    writeDB(db);
    await ctx.replyWithMarkdown(
      `✅ *O'qituvchi qo'shildi!*\n\n👤 ${newTeacher.name}\n📚 ${newTeacher.subject}\n📞 ${newTeacher.phone}${newTeacher.email ? '\n📧 ' + newTeacher.email : ''}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

// ========== ADD STUDENT SCENE ==========
const addStudentScene = new Scenes.WizardScene(
  'ADD_STUDENT',
  async (ctx) => {
    await ctx.replyWithMarkdown("👤 *O'quvchi qo'shish*\n\nF.I.Sh kiriting:", cancelKeyboard);
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
    await ctx.reply('📧 Email manzilini kiriting (yo\'q bo\'lsa "yo\'q" deb yozing):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const email = ctx.message.text === "yo'q" ? null : ctx.message.text;
    ctx.wizard.state.student.email = email;

    const db = readDB();
    const newStudent = {
      id: 'manual_' + Date.now(),
      telegramId: null,
      ...ctx.wizard.state.student,
      email,
      joinedAt: new Date().toISOString(),
    };
    db.students.push(newStudent);
    writeDB(db);
    await ctx.replyWithMarkdown(
      `✅ *O'quvchi qo'shildi!*\n\n👤 ${newStudent.name}\n📞 ${newStudent.phone}${newStudent.email ? '\n📧 ' + newStudent.email : ''}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

// ========== SEND NEWS SCENE ==========
const sendNewsScene = new Scenes.WizardScene(
  'SEND_NEWS',
  async (ctx) => {
    await ctx.replyWithMarkdown('📢 *Yangilik yuborish*\n\nYangilik matnini kiriting:', cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const text = ctx.message.text;
    const db = readDB();
    db.news.push({ id: Date.now(), text, date: new Date().toISOString() });
    writeDB(db);

    let sent = 0;
    let failed = 0;
    for (const s of db.students) {
      if (s.telegramId) {
        try {
          await ctx.telegram.sendMessage(
            s.telegramId, 
            `📰 *YANGILIK*\n\n${text}\n\n📅 ${new Date().toLocaleDateString('uz-UZ')}`,
            { parse_mode: 'Markdown' }
          );
          sent++;
        } catch (e) {
          failed++;
        }
      }
    }
    await ctx.replyWithMarkdown(
      `✅ *Yangilik yuborildi!*\n\n📤 Yuborildi: ${sent} ta\n❌ Yuborilmadi: ${failed} ta`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

// ========== ADD GRADE SCENE ==========
const addGradeScene = new Scenes.WizardScene(
  'ADD_GRADE',
  async (ctx) => {
    const db = readDB();
    if (db.students.length === 0) {
      await ctx.replyWithMarkdown('📭 Avval o\'quvchi qo\'shing.', adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.students.map((s) => [
      Markup.button.callback(s.name, `grade_student_${s.id}`),
    ]);
    await ctx.replyWithMarkdown(
      "👤 *Baho qo'yish*\n\nO'quvchini tanlang:",
      Markup.inlineKeyboard(buttons)
    );
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
  const newGrade = {
    id: Date.now(),
    studentId,
    courseId,
    grade,
    date: new Date().toISOString(),
  };
  db.grades.push(newGrade);
  writeDB(db);

  const student = db.students.find(s => s.id === studentId);
  const course = db.courses.find(c => String(c.id) === String(courseId));
  await ctx.replyWithMarkdown(
    `✅ *Baho qo'yildi!*\n\n👤 ${student?.name || 'Noma\'lum'}\n📖 ${course?.name || 'Noma\'lum'}\n⭐ Baho: ${grade}`,
    adminMenu
  );
  return ctx.scene.leave();
});

// ========== ATTENDANCE SCENE ==========
const attendanceScene = new Scenes.WizardScene(
  'ATTENDANCE',
  async (ctx) => {
    const db = readDB();
    if (db.students.length === 0) {
      await ctx.replyWithMarkdown('📭 Avval o\'quvchi qo\'shing.', adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.students.map((s) => [
      Markup.button.callback(s.name, `att_student_${s.id}`),
    ]);
    await ctx.replyWithMarkdown(
      "✅ *Davomat olish*\n\nO'quvchini tanlang:",
      Markup.inlineKeyboard(buttons)
    );
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

  const newAttendance = {
    id: Date.now(),
    studentId,
    status,
    note,
    date: new Date().toISOString(),
  };
  db.attendance.push(newAttendance);
  writeDB(db);

  const student = db.students.find(s => s.id === studentId);
  await ctx.replyWithMarkdown(
    `✅ *Davomat saqlandi!*\n\n👤 ${student?.name || 'Noma\'lum'}\n${statusEmojis[status]} ${statusTexts[status]}\n📅 ${new Date().toLocaleDateString('uz-UZ')}${note ? '\n💬 ' + note : ''}`,
    adminMenu
  );
  return ctx.scene.leave();
});

module.exports = { 
  addCourseScene, 
  addTeacherScene, 
  addStudentScene, 
  sendNewsScene,
  addGradeScene,
  attendanceScene,
};