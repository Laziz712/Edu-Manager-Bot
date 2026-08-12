const { GoogleGenAI } = require('@google/genai');

const AI_API_KEY = process.env.GEMINI_API_KEY;
const ai = AI_API_KEY ? new GoogleGenAI({ apiKey: AI_API_KEY }) : null;

/**
 * AI yordamchi bilan suhbatlashish
 * @param {Object} params
 * @param {string} params.message - foydalanuvchi savoli
 * @param {Array}  params.history - oldingi xabarlar [{role:'user'|'assistant', content:string}]
 * @param {Object} params.context - { userName, courseNames: string[] }
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

  const courseNames =
    Array.isArray(context.courseNames) && context.courseNames.length
      ? context.courseNames.join(', ')
      : "ma'lumot berilmagan";

  const systemPrompt =
    `Sen "Edu Manager" ta'lim markazining AI o'qituvchi-yordamchisisan. ` +
    `Talabalarga ularning kurslari (${courseNames}) va umuman ta'lim bo'yicha savollariga ` +
    `tushunarli, qisqa va aniq tarzda javob berasan. ` +
    `Har doim o'zbek tilida, do'stona va sabr bilan javob ber. ` +
    `Agar savol murakkab bo'lsa, misollar bilan sodda qilib tushuntir. ` +
    (context.userName ? `Suhbatlashayotgan talaba: ${context.userName}. ` : '') +
    `Javoblaringni juda uzun qilma — 150-200 so'zdan oshirma.`;

  // Claude 'assistant' rolini Gemini 'model' roliga o'tkazamiz va strukturani to'g'rilaymiz
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
    model: 'gemini-3.6-flash',
    contents: [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] }
    ],
  });

    const reply = response.text ? response.text.trim() : '';
    return { reply: reply || 'Kechirasiz, javob ololmadim.' };
  } catch (e) {
    console.error('Gemini AI chat xatolik:', e?.message || e, e?.status ? `(status: ${e.status})` : '');
    return { error: 'Server xatoligi yuz berdi. (Batafsil: konsoldagi log-ni tekshiring)' };
  }
}

module.exports = { askAI };