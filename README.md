# 🎓 Edu Manager — Telegram Bot

Ta'lim markazlari uchun Telegram bot — kurslarni boshqarish, o'qituvchilar, talabalar va yangiliklar.

## 📁 Loyiha tuzilishi

```
edu-manager-bot/
├── .env              # Muhit o'zgaruvchilari
├── .gitignore        # Git ignore
├── package.json      # NPM paketlari
├── db.js             # JSON ma'lumotlar bazasi
├── keyboards.js      # Klaviaturalar
├── scenes.js         # Scene'lar (formalar)
└── index.js          # Asosiy fayl
```

## 🚀 O'rnatish

```bash
# 1. Loyihani klonlash
npm install

# 2. .env faylini sozlash
# BOT_TOKEN=your_bot_token
# ADMIN_IDS=your_telegram_id

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
| ➕ Kurs qo'shish | ❌ | ✅ |
| ➕ O'qituvchi qo'shish | ❌ | ✅ |
| ➕ O'quvchi qo'shish | ❌ | ✅ |
| 📢 Yangilik yuborish | ❌ | ✅ |

## 📝 Eslatmalar

- Ma'lumotlar `db.json` faylida saqlanadi
- Har bir foydalanuvchi `/start` bosganda avtomatik ro'yxatdan o'tadi
- Yangiliklar barcha telegram foydalanuvchilarga yuboriladi
