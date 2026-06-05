import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateTedReply, type ChatMessage } from '../services/tedChat.js';

export const maxDuration = 30;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], type = 'text' } = (request.body || {}) as {
    messages?: ChatMessage[];
    type?: string;
  };

  try {
    const reply = await generateTedReply(messages, type);
    return response.status(200).json(reply);
  } catch (error: any) {
    console.error('Gemini API Error:', error?.message || error);
    return response.status(500).json({
      text: "My apologies — the tailoring room is unusually busy at the moment. Might you try that once more?",
      hasCalendarPicker: false,
    });
  }
}
