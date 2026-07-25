const { Scenes, Markup } = require('telegraf');
const { readDB, writeDB } = require('./db');
const {
  adminMenu,
  cancelKeyboard,
  WEEKDAYS,
  PAYMENT_TYPES,
  NEWS_CATEGORIES,
} = require('./keyboards');

async function cancelScene(ctx) {
  await ctx.reply('Bekor qilindi.', adminMenu);
  return ctx.scene.leave();
}

function isCancel(ctx) {
  return ctx.message && ctx.message.text === '❌ Bekor qilish';
}

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

const addTeacherScene = new Scenes.WizardScene(
  'ADD_TEACHER',
  async (ctx) => {
    await ctx.reply("O'qituvchi ismini kiriting:", cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher = { name: ctx.message.text };
    await ctx.reply("Yo'nalishini kiriting (masalan: Matematika):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.direction = ctx.message.text;
    await ctx.reply('Tajribasini kiriting (masalan: 5 yil):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.experience = ctx.message.text;
    await ctx.reply("Bio (qisqa ma'lumot) kiriting:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.teacher.bio = ctx.message.text;
    const db = readDB();
    const newTeacher = {
      id: Date.now(),
      ...ctx.wizard.state.teacher,
      createdAt: new Date().toISOString(),
    };
    db.teachers.push(newTeacher);
    writeDB(db);
    await ctx.reply(
      `✅ O'qituvchi "${newTeacher.name}" qo'shildi.\n\n🧭 Yo'nalish: ${newTeacher.direction}\n📈 Tajriba: ${newTeacher.experience}\n📝 Bio: ${newTeacher.bio}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

function buildCourseMultiSelectKeyboard(db, selectedIds) {
  const buttons = db.courses.map((c) => {
    const picked = selectedIds.includes(String(c.id));
    return [
      Markup.button.callback(
        `${picked ? '✅' : '⬜️'} ${c.name}`,
        `stud_course_toggle_${c.id}`
      ),
    ];
  });
  buttons.push([Markup.button.callback('➡️ Tugatish', 'stud_course_finish')]);
  return Markup.inlineKeyboard(buttons);
}

const addStudentScene = new Scenes.WizardScene(
  'ADD_STUDENT',
  async (ctx) => {
    await ctx.reply("O'quvchi to'liq ismini kiriting:", cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student = { name: ctx.message.text };
    await ctx.reply('Email manzilini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student.email = ctx.message.text;
    await ctx.reply('Telefon raqamini kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student.phone = ctx.message.text;
    await ctx.reply('Parolni kiriting:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.student.password = ctx.message.text;
    ctx.wizard.state.selectedCourseIds = [];

    const db = readDB();
    if (db.courses.length === 0) {
      await ctx.reply(
        "Hozircha kurslar mavjud emas, o'quvchi kurssiz saqlanadi.",
      );
      return finishAddStudent(ctx);
    }
    await ctx.reply(
      "Kurslarni tanlang (bir nechtasini belgilashingiz mumkin), so'ng \"Tugatish\"ni bosing:",
      buildCourseMultiSelectKeyboard(db, ctx.wizard.state.selectedCourseIds)
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    return; // kurslar tanlovi va tugatish action orqali boshqariladi
  }
);

async function finishAddStudent(ctx) {
  const db = readDB();
  const selectedCourseIds = ctx.wizard.state.selectedCourseIds || [];

  const newStudent = {
    id: 'manual_' + Date.now(),
    telegramId: null,
    ...ctx.wizard.state.student,
    joinedAt: new Date().toISOString(),
  };
  db.students.push(newStudent);

  selectedCourseIds.forEach((courseId) => {
    db.enrollments.push({
      studentId: newStudent.id,
      courseId,
      startDate: new Date().toISOString().slice(0, 10),
      paymentType: "Belgilanmagan",
      comment: '',
      date: new Date().toISOString(),
    });
  });
  writeDB(db);

  const courseNames = selectedCourseIds
    .map((id) => db.courses.find((c) => String(c.id) === String(id)))
    .filter(Boolean)
    .map((c) => c.name);

  await ctx.reply(
    `✅ O'quvchi "${newStudent.name}" qo'shildi.\n📧 Email: ${newStudent.email}\n📞 Telefon: ${newStudent.phone}` +
      (courseNames.length ? `\n📚 Kurslar: ${courseNames.join(', ')}` : ''),
    adminMenu
  );
  return ctx.scene.leave();
}

addStudentScene.action(/stud_course_toggle_(.+)/, async (ctx) => {
  const courseId = ctx.match[1];
  const db = readDB();
  const selected = ctx.wizard.state.selectedCourseIds;
  const idx = selected.indexOf(courseId);
  if (idx === -1) selected.push(courseId);
  else selected.splice(idx, 1);

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(
    buildCourseMultiSelectKeyboard(db, selected).reply_markup
  );
});

addStudentScene.action('stud_course_finish', async (ctx) => {
  await ctx.answerCbQuery();
  return finishAddStudent(ctx);
});

const sendNewsScene = new Scenes.WizardScene(
  'SEND_NEWS',
  async (ctx) => {
    await ctx.reply('Yangilik sarlavhasini kiriting:', cancelKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.news = { title: ctx.message.text };
    const buttons = NEWS_CATEGORIES.map((c) => [
      Markup.button.callback(c, `news_cat_${c}`),
    ]);
    await ctx.reply('Kategoriyani tanlang:', Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    return; // kategoriya tanlash action orqali
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const text = ctx.message.text;
    const { title, category } = ctx.wizard.state.news;
    const db = readDB();
    db.news.push({
      id: Date.now(),
      title,
      category,
      text,
      date: new Date().toISOString(),
    });
    writeDB(db);

    let sent = 0;
    let failed = 0;
    for (const s of db.students) {
      if (s.telegramId) {
        try {
          await ctx.telegram.sendMessage(
            s.telegramId,
            `📰 *${title}*\n_${category}_\n\n${text}`,
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

sendNewsScene.action(/news_cat_(.+)/, async (ctx) => {
  ctx.wizard.state.news.category = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply('Yangilik matnini kiriting:', cancelKeyboard);
  return ctx.wizard.next();
});

const addGradeScene = new Scenes.WizardScene(
  'ADD_GRADE',
  async (ctx) => {
    const db = readDB();
    if (db.students.length === 0) {
      await ctx.reply("⚠️ Hozircha o'quvchilar mavjud emas.", adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.students.map((s) => [
      Markup.button.callback(s.name, `grade_pick_student_${s.id}`),
    ]);
    await ctx.reply("Talabani tanlang:", Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  },
  async (ctx) => {
    return;
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const score = Number(ctx.message.text);
    if (isNaN(score) || score < 0 || score > 100) {
      await ctx.reply('❌ Iltimos 0 dan 100 gacha raqam kiriting.');
      return;
    }
    const db = readDB();
    const { studentId, courseId } = ctx.wizard.state.grade;
    db.grades.push({
      id: Date.now(),
      studentId,
      courseId,
      score,
      date: new Date().toISOString(),
    });
    writeDB(db);
    const student = db.students.find((s) => String(s.id) === String(studentId));
    const course = db.courses.find((c) => String(c.id) === String(courseId));
    await ctx.reply(
      `✅ Baho saqlandi!\n\n👤 ${student ? student.name : "Noma'lum"}\n📚 ${course ? course.name : "Noma'lum"}\n📊 Baho: ${score}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

addGradeScene.action(/grade_pick_student_(.+)/, async (ctx) => {
  const studentId = ctx.match[1];
  const db = readDB();
  const myEnrollments = db.enrollments.filter((e) => String(e.studentId) === String(studentId));
  if (myEnrollments.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply("⚠️ Bu talaba hech qanday kursga yozilmagan.", adminMenu);
    return ctx.scene.leave();
  }
  ctx.wizard.state.grade = { studentId };
  const buttons = myEnrollments.map((e) => {
    const course = db.courses.find((c) => String(c.id) === String(e.courseId));
    return [Markup.button.callback(course ? course.name : e.courseId, `grade_pick_course_${e.courseId}`)];
  });
  await ctx.answerCbQuery();
  await ctx.reply("Kursni tanlang:", Markup.inlineKeyboard(buttons));
  return ctx.wizard.next();
});

addGradeScene.action(/grade_pick_course_(.+)/, async (ctx) => {
  ctx.wizard.state.grade.courseId = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply("Bahoni kiriting (0-100):");
  return ctx.wizard.next();
});

const addAttendanceScene = new Scenes.WizardScene(
  'ADD_ATTENDANCE',
  async (ctx) => {
    const db = readDB();
    if (db.students.length === 0) {
      await ctx.reply("⚠️ Hozircha o'quvchilar mavjud emas.", adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.students.map((s) => [
      Markup.button.callback(s.name, `att_pick_student_${s.id}`),
    ]);
    await ctx.reply("Talabani tanlang:", Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.attendance.date = ctx.message.text;
    await ctx.reply(
      "Holatini tanlang:",
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Keldi', 'att_status_Keldi')],
        [Markup.button.callback('❌ Kelmadi', 'att_status_Kelmadi')],
        [Markup.button.callback('⏰ Kechikdi', 'att_status_Kechikdi')],
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const comment = ctx.message.text === '-' ? '' : ctx.message.text;
    const db = readDB();
    const { studentId, date, status } = ctx.wizard.state.attendance;
    db.attendance.push({
      id: Date.now(),
      studentId,
      date,
      status,
      comment,
    });
    writeDB(db);
    const student = db.students.find((s) => String(s.id) === String(studentId));
    await ctx.reply(
      `✅ Davomat belgilandi!\n\n👤 ${student ? student.name : "Noma'lum"}\n📅 ${date}\n📌 Holat: ${status}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

addAttendanceScene.action(/att_pick_student_(.+)/, async (ctx) => {
  const studentId = ctx.match[1];
  ctx.wizard.state.attendance = { studentId };
  await ctx.answerCbQuery();
  await ctx.reply("Sanani kiriting (masalan: 2026-07-24):", cancelKeyboard);
  return ctx.wizard.next();
});

addAttendanceScene.action(/att_status_(.+)/, async (ctx) => {
  ctx.wizard.state.attendance.status = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply("Izoh kiriting (bo'lmasa \"-\" yozing):");
  return ctx.wizard.next();
});

const addLessonScene = new Scenes.WizardScene(
  'ADD_LESSON',
  async (ctx) => {
    const db = readDB();
    if (db.courses.length === 0) {
      await ctx.reply("⚠️ Hozircha kurslar mavjud emas.", adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.courses.map((c) => [
      Markup.button.callback(c.name, `lesson_pick_course_${c.id}`),
    ]);
    await ctx.reply("Kursni tanlang:", Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    return;
  },
  async (ctx) => {
    return;
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.lesson.time = ctx.message.text;
    await ctx.reply("Xonani kiriting (bo'lmasa \"-\" yozing):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const room = ctx.message.text === '-' ? '' : ctx.message.text;
    const db = readDB();
    const { courseId, weekday, time } = ctx.wizard.state.lesson;
    db.lessons.push({
      id: Date.now(),
      courseId,
      weekday,
      time,
      room,
    });
    writeDB(db);
    const course = db.courses.find((c) => String(c.id) === String(courseId));
    await ctx.reply(
      `✅ Dars jadvalga qo'shildi!\n\n📚 ${course ? course.name : "Noma'lum"}\n📅 ${weekday}\n🕒 ${time}${room ? `\n🚪 Xona: ${room}` : ''}`,
      adminMenu
    );
    return ctx.scene.leave();
  }
);

addLessonScene.action(/lesson_pick_course_(.+)/, async (ctx) => {
  const courseId = ctx.match[1];
  ctx.wizard.state.lesson = { courseId };
  const buttons = WEEKDAYS.map((d) => [Markup.button.callback(d, `lesson_pick_day_${d}`)]);
  await ctx.answerCbQuery();
  await ctx.reply("Hafta kunini tanlang:", Markup.inlineKeyboard(buttons));
  return ctx.wizard.next();
});

addLessonScene.action(/lesson_pick_day_(.+)/, async (ctx) => {
  ctx.wizard.state.lesson.weekday = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply("Vaqtini kiriting (masalan: 14:00):");
  return ctx.wizard.next();
});

const addEnrollmentScene = new Scenes.WizardScene(
  'ADD_ENROLLMENT',
  async (ctx) => {
    const db = readDB();
    if (db.courses.length === 0) {
      await ctx.reply("⚠️ Hozircha kurslar mavjud emas.", adminMenu);
      return ctx.scene.leave();
    }
    const buttons = db.courses.map((c) => [
      Markup.button.callback(c.name, `enr_pick_course_${c.id}`),
    ]);
    await ctx.reply('Kursni tanlang:', Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    return; // kurs tanlash action orqali
  },
  async (ctx) => {
    return; // talaba tanlash action orqali
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    ctx.wizard.state.enrollment.startDate = ctx.message.text;
    const buttons = PAYMENT_TYPES.map((p) => [
      Markup.button.callback(p, `enr_pay_${p}`),
    ]);
    await ctx.reply("To'lov turini tanlang:", Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },
  async (ctx) => {
    return; // to'lov turi tanlash action orqali
  },
  async (ctx) => {
    if (isCancel(ctx)) return cancelScene(ctx);
    const comment = ctx.message.text === '-' ? '' : ctx.message.text;
    const db = readDB();
    const { studentId, courseId, startDate, paymentType } = ctx.wizard.state.enrollment;

    const already = db.enrollments.find(
      (e) => String(e.studentId) === String(studentId) && String(e.courseId) === String(courseId)
    );
    if (already) {
      await ctx.reply('⚠️ Bu talaba bu kursga allaqachon yozilgan.', adminMenu);
      return ctx.scene.leave();
    }

    db.enrollments.push({
      studentId,
      courseId,
      startDate,
      paymentType,
      comment,
      date: new Date().toISOString(),
    });
    writeDB(db);

    const student = db.students.find((s) => String(s.id) === String(studentId));
    const course = db.courses.find((c) => String(c.id) === String(courseId));
    await ctx.reply(
      `✅ Yozildi!\n\n👤 ${student ? student.name : "Noma'lum"}\n📚 ${course ? course.name : "Noma'lum"}\n📅 Boshlanish: ${startDate}\n💳 To'lov: ${paymentType}`,
      adminMenu
    );

    if (student && student.telegramId) {
      try {
        await ctx.telegram.sendMessage(
          student.telegramId,
          `🎉 Siz "${course ? course.name : ''}" kursiga yozildingiz!\n📅 Boshlanish: ${startDate}`
        );
      } catch (e) {
        // foydalanuvchi botni bloklagan bo'lishi mumkin
      }
    }
    return ctx.scene.leave();
  }
);

addEnrollmentScene.action(/enr_pick_course_(.+)/, async (ctx) => {
  const courseId = ctx.match[1];
  const db = readDB();
  if (db.students.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply("⚠️ Hozircha o'quvchilar mavjud emas.", adminMenu);
    return ctx.scene.leave();
  }
  ctx.wizard.state.enrollment = { courseId };
  const buttons = db.students.map((s) => [
    Markup.button.callback(s.name, `enr_pick_student_${s.id}`),
  ]);
  await ctx.answerCbQuery();
  await ctx.reply("Talabani tanlang:", Markup.inlineKeyboard(buttons));
  return ctx.wizard.next();
});

addEnrollmentScene.action(/enr_pick_student_(.+)/, async (ctx) => {
  ctx.wizard.state.enrollment.studentId = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply('Boshlanish sanasini kiriting (masalan: 2026-07-24):', cancelKeyboard);
  return ctx.wizard.next();
});

addEnrollmentScene.action(/enr_pay_(.+)/, async (ctx) => {
  ctx.wizard.state.enrollment.paymentType = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply("Izoh kiriting (bo'lmasa \"-\" yozing):", cancelKeyboard);
  return ctx.wizard.next();
});

module.exports = {
  addCourseScene,
  addTeacherScene,
  addStudentScene,
  sendNewsScene,
  addGradeScene,
  addAttendanceScene,
  addLessonScene,
  addEnrollmentScene,
};