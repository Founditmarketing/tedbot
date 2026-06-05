import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { composeSystemInstruction, GREETING } from '../services/tedPersona';
import { getBrandIntelText } from '../services/brandIntel';

export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedReply {
  text: string;
  hasCalendarPicker: boolean;
  buttons?: { name: string }[];
}

/** Strip control tokens from the model's reply and turn them into structured actions. */
function parseControlTokens(raw: string): ParsedReply {
  let text = raw;
  let hasCalendarPicker = false;
  let buttons: { name: string }[] | undefined;

  const bookMatch = text.match(/<<<\s*BOOK\s*>>>/i);
  if (bookMatch) {
    hasCalendarPicker = true;
    text = text.replace(bookMatch[0], '');
  }

  const suggestMatch = text.match(/<<<\s*SUGGEST:\s*([\s\S]*?)>>>/i);
  if (suggestMatch) {
    const options = suggestMatch[1]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (options.length > 0) buttons = options.map((name) => ({ name }));
    text = text.replace(suggestMatch[0], '');
  }

  return { text: text.trim(), hasCalendarPicker, buttons };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], type = 'text' } = (request.body || {}) as {
    messages?: ChatMessage[];
    type?: string;
  };

  // Opening greeting — served without a model round-trip for speed.
  if (type === 'launch' || messages.length === 0) {
    return response.status(200).json({
      text: GREETING,
      hasCalendarPicker: false,
      buttons: [
        { name: 'A wedding' },
        { name: 'Business attire' },
        { name: 'Black tie event' },
        { name: 'Book a fitting' },
      ],
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is missing.');
    return response.status(500).json({
      text: "I'm afraid I've stepped away from the floor for a moment. Please try again shortly.",
      hasCalendarPicker: false,
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const systemInstruction = composeSystemInstruction(getBrandIntelText());

    const contents = messages
      .filter((m) => m.content && m.content.trim() !== '')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Gemini requires the conversation to begin with a user turn.
    while (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }

    if (contents.length === 0) {
      return response.status(200).json({ text: GREETING, hasCalendarPicker: false });
    }

    // Live web grounding lets Ted pull current brand info on demand. Some keys
    // (no billing) reject grounding, so we fall back to a plain call on failure.
    const searchEnabled = process.env.ENABLE_SEARCH !== 'false';

    const generate = async (withSearch: boolean) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        ...(withSearch ? { tools: [{ googleSearch: {} } as any] } : {}),
      });
      return model.generateContent({ contents });
    };

    let result;
    try {
      result = await generate(searchEnabled);
    } catch (groundingError: any) {
      if (searchEnabled) {
        console.warn('Grounded call failed, retrying without search:', groundingError?.message);
        result = await generate(false);
      } else {
        throw groundingError;
      }
    }

    const raw = result.response.text();
    const parsed = parseControlTokens(raw);

    if (!parsed.text && !parsed.hasCalendarPicker && !parsed.buttons) {
      parsed.text =
        "Forgive me — would you tell me a touch more about what you're looking for?";
    }

    return response.status(200).json(parsed);
  } catch (error: any) {
    console.error('Gemini API Error:', error?.message || error);
    return response.status(500).json({
      text: "My apologies — the tailoring room is unusually busy at the moment. Might you try that once more?",
      hasCalendarPicker: false,
    });
  }
}
