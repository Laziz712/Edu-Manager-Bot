const AI_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Claude orqali savolga javob oladi.
 * @param {Object} params
 * @param {string} params.message - foydalanuvchi savoli
 * @param {Array}  params.history - oldingi xabarlar [{role:'user'|'assistant', content:string}]
 * @param {Object} params.context - { userName, courseNames: string[] }
 * @returns {Promise<{reply?: string, error?: string}>}
 */
async function askAI({ message, history = [], context = {} }) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { error: 'Savol matni bo\'sh bo\'lmasligi kerak.' };
  }
  if (!AI_API_KEY) {
    return {
      error: "AI yordamchi hali sozlanmagan. .env fayliga ANTHROPIC_API_KEY qo'shing (https://console.anthropic.com dan olinadi).",
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

  const priorMessages = Array.isArray(history)
    ? history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content).slice(-10)
    : [];

  const messages = [...priorMessages, { role: 'user', content: message }];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Anthropic API xatolik:', data);
      return { error: "AI javob berishda xatolik yuz berdi. Keyinroq urinib ko'ring." };
    }
    const reply = (data.content || []).map((b) => b.text || '').join('\n').trim();
    return { reply: reply || 'Kechirasiz, javob ololmadim.' };
  } catch (e) {
    console.error('AI chat xatolik:', e.message);
    return { error: 'Server xatoligi yuz berdi.' };
  }
}

module.exports = { askAI };
