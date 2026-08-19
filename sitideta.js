const COURSES = [
  { name: 'Frontend Dasturlash', price: '900 000', teacher: 'Botir Rustamov' },
  { name: 'Grafik Dizayn', price: '700 000', teacher: 'Malika Yusupova' },
  { name: 'SMM va Marketing', price: '650 000', teacher: 'Diyor Ergashev' },
  { name: 'Videografiya va Mobilografiya', price: '750 000', teacher: 'Sardor Nazarov' },
  { name: 'Buxgalteriya (1C)', price: '600 000', teacher: 'Gulnora Xolova' },
  { name: 'Kids: Robototexnika', price: '450 000', teacher: 'Aziz Karimov' },
];

const ABOUT_TEXT =
  "🎓 *Edu Manager* — Xorazm viloyatidagi IT va zamonaviy kasblar o'quv markazi.\n\n" +
  "2026-yildan buyon amaliyotga yo'naltirilgan ta'lim beramiz: dasturlash, dizayn, " +
  "marketing va boshqa zamonaviy kasblarni kichik guruhlarda, tajribali ustozlar bilan o'rgatamiz.";

function buildContactText(siteUrl) {
  return (
    "📍 Manzil: Xiva Shahar, Al-Xorazmiy ko'chasi, 12-uy\n" +
    "📞 Telefon: +998 88 260 71 51\n" +
    "🕒 Ish vaqti: Har kuni 09:00 – 18:00\n" +
    `🌐 Sayt: ${siteUrl}`
  );
}

module.exports = { COURSES, ABOUT_TEXT, buildContactText };