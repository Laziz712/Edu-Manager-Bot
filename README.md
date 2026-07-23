# 🎓 Edu Manager — Telegram Bot + Mini App

Ta'lim markazlari uchun to'liq funksionallikka ega Telegram bot va Mini App.

## 📁 Loyiha tuzilishi

```
edu-manager-bot/
├── .env              # Muhit o'zgaruvchilari
├── .gitignore        # Git ignore
├── package.json      # NPM paketlari
├── db.js             # JSON ma'lumotlar bazasi
├── keyboards.js      # Klaviaturalar
├── scenes.js         # Scene'lar (formalar)
└── index.js          # Asosiy fayl (bot + API server)
```

## 🚀 O'rnatish

```bash
# 1. Paketlarni o'rnatish
npm install

# 2. .env faylini sozlash
# BOT_TOKEN=your_bot_token
# ADMIN_IDS=your_telegram_id
# MINI_APP_URL=https://your-mini-app.vercel.app

# 3. Ishga tushirish
npm start

# Yoki development rejimida
npm run dev
```

## 👤 Foydalanuvchi huquqlari

| Bo'lim | O'quvchi | Admin |
|--------|----------|-------|
| 📚 Kurslar ko'rish | ✅ | ✅ |
| 👨‍🏫 O'qituvchilar | ✅ | ✅ |
| 📰 Yangiliklar | ✅ | ✅ |
| 📖 Kursga yozilish | ✅ | ✅ |
| 📊 Baholarim | ✅ | ✅ |
| 💳 To'lovlar | ✅ | ✅ |
| 🌐 Web App | ✅ | ✅ |
| ➕ Kurs qo'shish | ❌ | ✅ |
| ➕ O'qituvchi qo'shish | ❌ | ✅ |
| ➕ O'quvchi qo'shish | ❌ | ✅ |
| 📢 Yangilik yuborish | ❌ | ✅ |
| ✏️ Baho qo'yish | ❌ | ✅ |
| ✅ Davomat olish | ❌ | ✅ |
| 📊 Statistika | ❌ | ✅ |
| 🗓 Dars jadvali | ❌ | ✅ |
| 💰 Barcha to'lovlar | ❌ | ✅ |

## 🌐 API Endpoints

| Endpoint | Tavsif |
|----------|--------|
| GET /api/courses | Kurslar ro'yxati |
| GET /api/teachers | O'qituvchilar ro'yxati |
| GET /api/students | Talabalar ro'yxati |
| GET /api/news | Yangiliklar |
| GET /api/stats | Umumiy statistika |

## 📝 Eslatmalar

- Ma'lumotlar `db.json` faylida saqlanadi
- Har bir foydalanuvchi `/start` bosganda avtomatik ro'yxatdan o'tadi
- Yangiliklar barcha telegram foydalanuvchilarga yuboriladi
- Web App orqali to'liq boshqaruv paneli ochiladi
