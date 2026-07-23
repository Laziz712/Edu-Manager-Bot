# Edu Manager — Telegram Bot

O'quv markazlar va xususiy maktablar uchun Telegram bot.

## Imkoniyatlar

**Admin uchun** (`.env` dagi `ADMIN_IDS` ro'yxatida bo'lgan Telegram ID'lar):
- ➕ Kurs qo'shish (nomi, tavsifi, narxi, o'qituvchisi)
- ➕ O'qituvchi qo'shish (ismi, fani, telefoni)
- ➕ O'quvchi qo'shish (qo'lda, botdan foydalanmaydigan o'quvchilar uchun)
- 📢 Yangilik yuborish (barcha botdan foydalanuvchilarga avtomatik yetkaziladi)

**Oddiy foydalanuvchi uchun:**
- 📚 Kurslar — ro'yxatni ko'rish va "✅ Yozilish" tugmasi orqali yozilish
- 👨‍🏫 O'qituvchilar — o'qituvchilar va ularning fanlari/telefon raqamlari
- 📰 Yangiliklar — so'nggi yangiliklar
- 📖 Mening darslarim — foydalanuvchi yozilgan kurslar ro'yxati

## O'rnatish

1. Kerakli paketlarni o'rnating:
   ```bash
   npm install
   ```

2. `.env.example` faylidan nusxa oling:
   ```bash
   cp .env.example .env
   ```

3. `.env` faylini to'ldiring:
   - `BOT_TOKEN` — [@BotFather](https://t.me/BotFather) orqali olinadigan token
   - `ADMIN_IDS` — admin bo'ladigan foydalanuvchilarning Telegram ID raqamlari, vergul bilan ajratilgan
     (o'z Telegram ID'ingizni bilish uchun [@userinfobot](https://t.me/userinfobot) ga yozing)

4. Botni ishga tushiring:
   ```bash
   npm start
   ```

## Ma'lumotlar bazasi haqida

Hozircha ma'lumotlar loyihadagi `db.json` faylida (avtomatik yaratiladi) saqlanadi —
qo'shimcha bazasiz, tezda sinab ko'rish uchun qulay. Loyiha kattalashsa (masalan,
admin panelingiz — MongoDB yoki PostgreSQL bilan ishlasa), `db.js` faylidagi
`readDB`/`writeDB` funksiyalarini shu bazaga ulanadigan qilib almashtirsangiz bo'ldi —
qolgan kod (`index.js`, `scenes.js`) o'zgarishsiz ishlayveradi.

## Fayllar tuzilishi

```
edu-manager-bot/
├── index.js        # botning asosiy fayli (komandalar, menyular)
├── scenes.js        # admin uchun ko'p bosqichli formalar (wizard scene'lar)
├── db.js            # JSON fayl bilan ishlash (o'qish/yozish)
├── keyboards.js      # klaviaturalar va admin tekshiruvi
├── db.json          # ma'lumotlar (avtomatik yaratiladi)
├── package.json
└── .env             # BOT_TOKEN va ADMIN_IDS (o'zingiz yaratasiz)
```
