# 🎓 Edu Manager Bot

Ta'lim markazlari uchun Telegram boti. Kurslar, o'qituvchilar, o'quvchilar, yangiliklar,
baholar, davomat va dars jadvalini boshqarish imkonini beradi.

## 📦 O'rnatish

```bash
npm install
```

`.env.example` faylidan nusxa olib `.env` yarating va to'ldiring:

```bash
cp .env.example .env
```

```
BOT_TOKEN=BotFather'dan olingan token
ADMIN_IDS=admin telegram ID lari, vergul bilan ajratilgan (masalan: 123456789,987654321)
```

Telegram ID'ingizni bilish uchun [@userinfobot](https://t.me/userinfobot) ga yozing.

## ▶️ Ishga tushirish

```bash
npm start
```

Rivojlantirish rejimida (avtomatik qayta yuklash):

```bash
npm run dev
```

## 📁 Fayllar tuzilishi

| Fayl | Vazifasi |
|---|---|
| `index.js` | Bot buyruqlari va menyu handlerlari |
| `keyboards.js` | Klaviatura tugmalari (asosiy va admin menyu) |
| `scenes.js` | Ko'p bosqichli formalar (kurs/o'qituvchi/o'quvchi qo'shish, baho, davomat, dars jadvali) |
| `db.js` | `db.json` fayl bilan ishlash (o'qish/yozish) |
| `db.json` | Ma'lumotlar bazasi (avtomatik yaratiladi, gitga qo'shilmaydi) |

## 👤 Foydalanuvchi bo'limlari

- 📚 Kurslar — mavjud kurslar va ularga yozilish
- 👨‍🏫 O'qituvchilar — o'qituvchilar ro'yxati
- 📰 Yangiliklar — so'nggi yangiliklar
- 📖 Mening darslarim — yozilgan kurslar
- 🎓 Baholarim — baholar va o'rtacha ko'rsatkich
- 📋 Davomatim — davomat tarixi va foizi
- 📅 Dars jadvali — haftalik dars jadvali

## 🔧 Admin bo'limlari

- ➕ Kurs qo'shish (nomi, tavsifi, narxi, o'qituvchisi)
- ➕ O'qituvchi qo'shish (ismi, yo'nalishi, tajribasi, bio)
- ➕ O'quvchi qo'shish (ismi, email, telefon, parol, kurslar — bir nechtasini tanlash mumkin)
- 📝 Kursga yozish (mavjud talabani mavjud kursga: boshlanish sanasi, to'lov turi, izoh bilan)
- 👥 Talabalar ro'yxati (ism, email, telefon, yozilgan kurslari)
- 📢 Yangilik yuborish (sarlavha, kategoriya, matn — barcha talabalarga yuboriladi)
- 📊 Baho qo'yish
- ✅ Davomat belgilash
- 🗓 Dars qo'shish (jadval)
- `/stats` — umumiy statistika

## 🔁 Saytdagi (edu-manager-nine-theta.vercel.app) maydonlarga moslik

| Bo'lim | Sayt maydonlari | Botda |
|---|---|---|
| O'qituvchi | Ism, Yo'nalish, Tajriba, Bio | ✅ bir xil |
| Talaba | Ism, Email, Telefon, Parol, Kurslar | ✅ bir xil |
| Kursga yozilish | Kurs, Talaba, Boshlanish sanasi, To'lov turi, Izoh | ✅ bir xil |
| Yangilik | Sarlavha, Kategoriya, Sana, Matn | ✅ bir xil |
| Baho | Talaba, Kurs, Baho (0-100) | ✅ bir xil |
| Davomat | Talaba, Sana, Holati, Izoh | ✅ bir xil |
| Dars jadvali | Kurs, Hafta kuni, Vaqt, Xona | ✅ bir xil |

## ⚠️ Eslatma

Ma'lumotlar `db.json` faylida saqlanadi (mahalliy JSON baza). Bu bot
[edu-manager-nine-theta.vercel.app](https://edu-manager-nine-theta.vercel.app/) sayti bilan
**avtomatik sinxronlanmaydi** — sayt brauzer xotirasida (localStorage) ishlaydi va umumiy
backend/API'ga ega emas. Agar kelajakda ikkalasini bitta umumiy bazaga (masalan, Postgres yoki
Supabase) ulash kerak bo'lsa, sayt tomonida ham backend API qo'shish talab qilinadi.
