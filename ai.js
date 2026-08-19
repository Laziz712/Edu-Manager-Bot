require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const AI_API_KEY = process.env.GEMINI_API_KEY;
const ai = AI_API_KEY ? new GoogleGenAI({ apiKey: AI_API_KEY }) : null;

/**
 * Markaz haqidagi kontekstdan tizim promptini yasaydi.
 * context: { userName, courses: [{name,price,teacher}], courseNames, aboutText, contactText }
 */
function buildSystemPrompt(context = {}) {
  let coursesText = "ma'lumot berilmagan";

  if (Array.isArray(context.courses) && context.courses.length) {
    coursesText = context.courses
      .map((c) => `- ${c.name} (narxi: ${c.price} so'm/oy, ustoz: ${c.teacher})`)
      .join('\n');
  } else if (Array.isArray(context.courseNames) && context.courseNames.length) {
    coursesText = context.courseNames.join(', ');
  }

  return (
    `Sen "Edu Manager" ta'lim markazining rasmiy AI o'qituvchi-yordamchisisan. ` +
    `Sen ushbu markaz haqida to'liq ma'lumotga egasan va talabalarga faqat shu ma'lumotlar asosida javob berasan.\n\n` +
    (context.aboutText ? `MARKAZ HAQIDA:\n${context.aboutText}\n\n` : '') +
    `MAVJUD KURSLAR:\n${coursesText}\n\n` +
    (context.contactText ? `ALOQA MA'LUMOTLARI:\n${context.contactText}\n\n` : '') +
    `Qoidalar:\n` +
    `- Har doim o'zbek tilida, do'stona va sabr bilan javob ber.\n` +
    `- Kurslar, narxlar yoki ustozlar haqida so'ralsa, faqat yuqoridagi ro'yxatga tayan — o'zingdan kurs yoki narx o'ylab topma.\n` +
    `- Ro'yxatdan o'tish/yozilish haqida so'rashsa, botdagi "📝 Ro'yxatdan o'tish" tugmasidan foydalanishni tavsiya qil.\n` +
    `- Agar savol murakkab bo'lsa, misollar bilan sodda qilib tushuntir.\n` +
    `- Javoblaringni juda uzun qilma — 150-200 so'zdan oshirma.\n` +
    (context.userName ? `- Suhbatlashayotgan talaba ismi: ${context.userName}.\n` : '')
  );
}

/**
 * AI yordamchi bilan suhbatlashish
 * @param {Object} params
 * @param {string} params.message - foydalanuvchi savoli
 * @param {Array}  params.history - oldingi xabarlar [{role:'user'|'assistant', content:string}]
 * @param {Object} params.context - { userName, courses, courseNames, aboutText, contactText }
 * @returns {Promise<{reply?: string, error?: string}>}
 */
async function askAI({ message, history = [], context = {} }) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { error: "Savol matni bo'sh bo'lmasligi kerak." };
  }

  if (!ai) {
    return {
      error: "AI yordamchi hali sozlanmagan. .env fayliga GEMINI_API_KEY qo'shing (https://aistudio.google.com dan olinadi).",
    };
  }

  const systemPrompt = buildSystemPrompt(context);

  // History strukturasini to'g'rilash
  const formattedHistory = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'model') && m.content)
        .slice(-10)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.content }],
        }))
    : [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemPrompt
      }
    });

    const reply = response.text ? response.text.trim() : '';
    return { reply: reply || 'Kechirasiz, javob ololmadim.' };
  } catch (e) {
    console.error('Gemini AI chat xatolik:', e?.message || e, e?.status ? `(status: ${e.status})` : '');
    return { error: 'Server xatoligi yuz berdi. (Batafsil: konsoldagi log-ni tekshiring)' };
  }
}

module.exports = { askAI };