const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      users: [
        {
          id: 'user_1',
          email: 'jasur@edumanager.uz',
          password: '12345678',
          role: 'teacher',
          name: "Jasur O'qituvchi",
          phone: '+998901112233',
          telegramId: null,
          createdAt: new Date().toISOString()
        },
        {
          id: 'user_2',
          email: 'admin',
          password: 'admin123',
          role: 'admin',
          name: 'Admin',
          phone: '+998902223344',
          telegramId: null,
          createdAt: new Date().toISOString()
        }
      ],
      students: [],
      teachers: [
        {
          id: 'teacher_1',
          name: "Jasur O'qituvchi",
          subject: 'Matematika',
          phone: '+998901112233',
          email: 'jasur@edumanager.uz',
          userId: 'user_1',
          createdAt: new Date().toISOString()
        }
      ],
      courses: [
        {
          id: 'course_1',
          name: 'Matematika Intensiv',
          description: 'Matematika fanidan 3 oylik intensiv kurs. Algebra, geometriya va trigonometriya.',
          price: 450000,
          duration: '3 oy',
          teacherId: 'teacher_1',
          maxStudents: 20,
          createdAt: new Date().toISOString()
        },
        {
          id: 'course_2',
          name: 'IELTS Preparation',
          description: 'Ingliz tilidan IELTS imtihoniga tayyorgarlik. Reading, Writing, Listening, Speaking.',
          price: 650000,
          duration: '4 oy',
          teacherId: null,
          maxStudents: 15,
          createdAt: new Date().toISOString()
        },
        {
          id: 'course_3',
          name: 'Web Dasturlash',
          description: 'HTML, CSS, JavaScript va React.js bilan veb-saytlar yaratish.',
          price: 800000,
          duration: '5 oy',
          teacherId: null,
          maxStudents: 12,
          createdAt: new Date().toISOString()
        }
      ],
      news: [
        {
          id: 'news_1',
          title: "Yangi o'quv yili boshlandi!",
          text: "🎉 Yangi o'quv yili boshlandi! Barcha kurslarga 20% chegirmalar mavjud. Tez ro'yxatdan o'ting!",
          date: '2026-07-22T10:00:00.000Z',
          image: null
        },
        {
          id: 'news_2',
          title: 'Matematika kursiga qabul',
          text: '📢 Matematika intensiv kursiga qabul davom etmoqda. Joylar cheklangan!',
          date: '2026-07-23T08:00:00.000Z',
          image: null
        },
        {
          id: 'news_3',
          title: 'IELTS mock imtihon',
          text: "📝 1-avgust kuni bepul IELTS mock imtihon bo'lib o'tadi. Barcha xohlovchilar qatnashishi mumkin.",
          date: '2026-07-24T09:00:00.000Z',
          image: null
        }
      ],
      enrollments: [],
      grades: [],
      attendance: [],
      schedule: [
        {
          id: 'sched_1',
          courseId: 'course_1',
          day: 'Dushanba',
          time: '09:00 - 11:00',
          room: '101-xona'
        },
        {
          id: 'sched_2',
          courseId: 'course_1',
          day: 'Chorshanba',
          time: '09:00 - 11:00',
          room: '101-xona'
        },
        {
          id: 'sched_3',
          courseId: 'course_1',
          day: 'Juma',
          time: '09:00 - 11:00',
          room: '101-xona'
        },
        {
          id: 'sched_4',
          courseId: 'course_2',
          day: 'Seshanba',
          time: '14:00 - 16:00',
          room: '202-xona'
        },
        {
          id: 'sched_5',
          courseId: 'course_2',
          day: 'Payshanba',
          time: '14:00 - 16:00',
          room: '202-xona'
        }
      ],
      payments: [],
      sessions: {}
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };