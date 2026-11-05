import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

// Vercel Serverless Function handler for /api/chat
export const config = {
  maxDuration: 60,
};

const SYSTEM_INSTRUCTION = `You are AI BuildCraft, an exceptionally capable, intelligent, and articulate AI app builder, engineer, and thinker.
Your official name and this application's name is AI BuildCraft. If the user asks for your name, who you are, or what application this is, always introduce yourself clearly and proudly as AI BuildCraft.
You have real-time reasoning, real-time coding, and real-time application-building powers.

When conversing:
- Be direct, insightful, technically rigorous, and conversational.
- When the user asks you to build, code, design, write, calculate, or search, complete the task fully with zero placeholders.
- When answering questions about current events, facts, libraries, or news, utilize your search grounding capabilities accurately.

Interactive Artifacts (Real-time Building & Coding):
When writing standalone interactive apps, tools, scripts, documents, or data tables, wrap them in an artifact block:

\`\`\`artifact
id: unique-id
type: html | code | document | sheet
title: Concise Title
language: html | python | typescript | javascript | csv | markdown | svg
[complete functional content]
\`\`\`

- 'html': Self-contained interactive single-file web applications or widgets (complete with Tailwind/CSS and vanilla JS).
- 'code': Standalone scripts or modules (Python, TypeScript, Node.js).
- 'document': Reports, architectural plans, strategies, or written guides.
- 'sheet': CSV tabular data models.
- If the user explicitly asks you to "create an image", "draw", or "generate a picture", create a beautiful, high-fidelity SVG graphic or HTML5 interactive Canvas art wrapped in an artifact block (type: html or code with language: svg/html).
- NEVER display or request the Gemini API key in the app frontend. The Gemini engine is securely hosted on the backend server.

Always write clean, modern, fully functional code without omitting parts.`;

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {}
    }

    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      if (typeof req.on === 'function') {
        const chunks: any[] = [];
        try {
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          if (chunks.length > 0) {
            body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
          }
        } catch {}
      }
    }
    body = body || {};

    const { messages, model = 'gemini-3.8-flash', enableThinking = false, systemInstruction, apiKey: bodyApiKey } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
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
      cleanKey(bodyApiKey) ||
      cleanKey(process.env.VITE_GEMINI_API_KEY) ||
      cleanKey(process.env.GEMINI_API_KEY) ||
      cleanKey(process.env.GOOGLE_API_KEY) ||
      cleanKey(process.env.GOOGLE_GENAI_API_KEY) ||
      cleanKey(process.env.GEMINI_KEY) ||
      cleanKey(process.env.VITE_GOOGLE_API_KEY) ||
      cleanKey(process.env.API_KEY) ||
      '';

    if (!apiKey) {
      res.status(400).json({
        error: 'Gemini API key is not configured in environment variables. Checked GEMINI_API_KEY and VITE_GEMINI_API_KEY.',
      });
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

    // Setup Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const contents: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === 'user' ? 'user' : 'model';
      const parts: any[] = [];

      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const file of msg.attachments) {
          if (file.mimeType?.startsWith('image/') && file.base64Data) {
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: file.base64Data,
              },
            });
          } else if (file.textData) {
            parts.push({
              text: `[Attached File: ${file.name}]\n\`\`\`\n${file.textData}\n\`\`\`\n`,
            });
          }
        }
      }

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    const lastUserText = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const wantsSearch =
      lastUserText.includes('search') ||
      lastUserText.includes('who is') ||
      lastUserText.includes('what is') ||
      lastUserText.includes('news') ||
      lastUserText.includes('latest') ||
      lastUserText.includes('today') ||
      lastUserText.includes('weather') ||
      lastUserText.includes('stock');

    const config: any = {
      systemInstruction: systemInstruction ? `${SYSTEM_INSTRUCTION}\n\nUser custom instruction: ${systemInstruction}` : SYSTEM_INSTRUCTION,
      temperature: 0.7,
    };

    if (wantsSearch || model.includes('3.8')) {
      config.tools = [{ googleSearch: {} }];
    }

    if (enableThinking && model.includes('3.8')) {
      config.thinkingConfig = {
        thinkingLevel: 'LOW',
      };
    }

    const candidateModels = [
      model,
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
      'gemini-2.5-flash-lite',
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let streamedAnyChunk = false;
    let lastError: any = null;

    for (const candModel of candidateModels) {
      if (streamedAnyChunk) break;
      try {
        const streamConfig = { ...config };
        const responseStream = await ai.models.generateContentStream({
          model: candModel,
          contents,
          config: streamConfig,
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            streamedAnyChunk = true;
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Vercel function model ${candModel} failed:`, err.message || err.status);

        if (!streamedAnyChunk && config.tools) {
          try {
            const fallbackConfig = {
              systemInstruction: config.systemInstruction,
              temperature: 0.7,
            };
            const responseStream = await ai.models.generateContentStream({
              model: candModel,
              contents,
              config: fallbackConfig,
            });
            for await (const chunk of responseStream) {
              if (chunk.text) {
                streamedAnyChunk = true;
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
              }
            }
          } catch (retryErr: any) {
            lastError = retryErr;
          }
        }
      }
    }

    if (!streamedAnyChunk && lastError) {
      throw lastError;
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    const errorMessage = error?.message || 'Chat generation error';
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
}
