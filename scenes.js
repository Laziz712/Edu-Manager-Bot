const { Scenes, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const { adminMenu, cancelKeyboard } = require('./keyboards');

async function cancelScene(ctx) {
  await ctx.reply('Bekor qilindi.', adminMenu);
  return ctx.scene.leave();
}

function isCancel(ctx) {
  return ctx.message && ctx.message.text === '❌ Bekor qilish';
}

// ========== ADD COURSE SCENE ==========
const addCourseScene = new Scenes.WizardScene(
  'ADD_COURSE',
  async (ctx) => {
    await ctx.reply("Kurs nomini kiriting:", cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.course = { name: ctx.message.text };
    await ctx.reply('Kurs tavsifini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.course.description = ctx.message.text;
    await ctx.reply("Kurs narxini kiriting (faqat raqam, so'mda):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const price = Number(ctx.message.text);
    if (isNaN(price) || price <= 0) {
      await ctx.reply('❌ Iltimos faqat musbat raqam kiriting. Masalan: 350000');
      return; // shu qadamda qoladi
    }
    ctx.wizard.state.course.price = price;

    const db = readDB();
    if (db.teachers.length === 0) {
      await ctx.reply(
        "⚠️ Avval kamida bitta o'qituvchi qo'shing, keyin kurs qo'shishingiz mumkin.",
        adminMenu
      );
      return ctx.scene.leave();
    }
    const buttons = db.teachers.map((t) => [
      Markup.button.callback(t.name, `pick_teacher_${t.id}`),
    ]);
    await ctx.reply(
      "Kurs uchun o'qituvchini tanlang:",
      Markup.inlineKeyboard(buttons)
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Bu qadam inline keyboard orqali tugallanadi
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
    teacherId,
    createdAt: new Date().toISOString(),
  };
  db.courses.push(newCourse);
  writeDB(db);
  await ctx.answerCbQuery('Saqlandi ✅');
  await ctx.reply(
    `✅ "${newCourse.name}" kursi muvaffaqiyatli qo'shildi.\n\n📋 Tavsif: ${newCourse.description}\n💰 Narx: ${newCourse.price.toLocaleString()} so'm`,
    adminMenu
  );
  return ctx.scene.leave();
});

// ========== ADD TEACHER SCENE ==========
const addTeacherScene = new Scenes.WizardScene(
  'ADD_TEACHER',
  async (ctx) => {
    await ctx.reply("O'qituvchi F.I.Sh kiriting:", cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher = { name: ctx.message.text };
    await ctx.reply('Fanini kiriting (masalan: Matematika):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.subject = ctx.message.text;
    await ctx.reply('Telefon raqamini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.phone = ctx.message.text;
    const db = readDB();
    const newTeacher = { 
      id: Date.now(), 
      ...ctx.wizard.state.teacher,
      createdAt: new Date().toISOString(),
    };
    db.teachers.push(newTeacher);
    writeDB(db);
    await ctx.reply(
      `✅ O'qituvchi "${newTeacher.name}" qo'shildi.\n\n📚 Fan: ${newTeacher.subject}\n📞 Telefon: ${newTeacher.phone}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

// ========== ADD STUDENT SCENE ==========
const addStudentScene = new Scenes.WizardScene(
  'ADD_STUDENT',
  async (ctx) => {
    await ctx.reply("O'quvchi F.I.Sh kiriting:", cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student = { name: ctx.message.text };
    await ctx.reply('Telefon raqamini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student.phone = ctx.message.text;
    const db = readDB();
    const newStudent = {
      id: 'manual_' + Date.now(),
      telegramId: null,
      ...ctx.wizard.state.student,
      joinedAt: new Date().toISOString(),
    };
    db.students.push(newStudent);
    writeDB(db);
    await ctx.reply(
      `✅ O'quvchi "${newStudent.name}" qo'shildi.\n📞 Telefon: ${newStudent.phone}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

// ========== SEND NEWS SCENE ==========
const sendNewsScene = new Scenes.WizardScene(
  'SEND_NEWS',
  async (ctx) => {
    await ctx.reply('Yangilik matnini kiriting:', cancelKeyboard);
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
            `📰 *YANGILIK*\n\n${text}`,
            { parse_mode: 'Markdown' }
          );
          sent++;
        } catch (e) {
          failed++;
        }
      }
    }
    await ctx.reply(
      `✅ Yangilik saqlandi va yuborildi!\n\n📤 Yuborildi: ${sent} ta\n❌ Yuborilmadi: ${failed} ta`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

module.exports = { addCourseScene, addTeacherScene, addStudentScene, sendNewsScene };