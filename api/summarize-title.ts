import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { prompt } = body;
    if (!prompt) {
      res.json({ title: 'New Chat' });
      return;
    }

    function cleanKey(val: any): string {
      if (!val || typeof val !== 'string') return '';
      const cleaned = val.trim().replace(/^["']|["']$/g, '');
      if (!cleaned || cleaned === 'MY_GEMINI_API_KEY' || cleaned === 'undefined' || cleaned === 'null') {
        return '';
      }
      return cleaned;
    }

    const authHeader = req.headers['authorization'];
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';

    const apiKey =
      cleanKey(req.headers['x-gemini-key']) ||
      cleanKey(req.headers['x-api-key']) ||
      cleanKey(bearerToken) ||
      cleanKey(body.apiKey) ||
      cleanKey(process.env.VITE_GEMINI_API_KEY) ||
      cleanKey(process.env.GEMINI_API_KEY) ||
      cleanKey(process.env.GOOGLE_API_KEY) ||
      cleanKey(process.env.GOOGLE_GENAI_API_KEY) ||
      cleanKey(process.env.GEMINI_KEY) ||
      cleanKey(process.env.VITE_GOOGLE_API_KEY) ||
      cleanKey(process.env.API_KEY);
    if (!apiKey) {
      res.json({ title: 'New Chat' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Summarize the following prompt into a clean 3-4 word conversation title (no quotes, no punctuation):\n"${prompt}"`,
    });

    const title = response.text?.trim().replace(/^["']|["']$/g, '') || 'New Chat';
    res.json({ title });
  } catch {
    res.json({ title: 'New Chat' });
  }
}
