/**
 * Ted's chat engine — the shared brain.
 *
 * Used by both the Vercel serverless function (api/chat.ts) and the local dev
 * API server (scripts/devApi.ts), so behavior is identical in both places.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { composeSystemInstruction, GREETING } from './tedPersona';
import { getBrandIntelText } from './brandIntel';
import { TED_KNOWLEDGE } from './tedKnowledge';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TedReply {
  text: string;
  hasCalendarPicker: boolean;
  buttons?: { name: string }[];
}

/** Strip control tokens from the model's reply and turn them into structured actions. */
export function parseControlTokens(raw: string): TedReply {
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

const LAUNCH_REPLY: TedReply = {
  text: GREETING,
  hasCalendarPicker: false,
  buttons: [
    { name: 'A wedding' },
    { name: 'Business attire' },
    { name: 'Black tie event' },
    { name: 'Book a fitting' },
  ],
};

/**
 * Generate Ted's reply for a conversation. Pure logic — no HTTP framework, so it
 * runs anywhere. Throws only on unexpected errors; known failure modes return a
 * graceful in-character message.
 */
export async function generateTedReply(messages: ChatMessage[], type: string = 'text'): Promise<TedReply> {
  // Opening greeting — served without a model round-trip for speed.
  if (type === 'launch' || messages.length === 0) {
    return { ...LAUNCH_REPLY, buttons: [...LAUNCH_REPLY.buttons!] };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is missing.');
    return {
      text: "I'm afraid I've stepped away from the floor for a moment. Please try again shortly.",
      hasCalendarPicker: false,
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const systemInstruction = composeSystemInstruction(getBrandIntelText(), TED_KNOWLEDGE);

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
    return { text: GREETING, hasCalendarPicker: false };
  }

  // Live web grounding lets Ted pull current brand info on demand. Some keys
  // (no billing) reject grounding, so we fall back to a plain call on failure.
  const searchEnabled = process.env.ENABLE_SEARCH !== 'false';

  const generate = (withSearch: boolean) => {
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

  const parsed = parseControlTokens(result.response.text());
  if (!parsed.text && !parsed.hasCalendarPicker && !parsed.buttons) {
    parsed.text = "Forgive me — would you tell me a touch more about what you're looking for?";
  }
  return parsed;
}
