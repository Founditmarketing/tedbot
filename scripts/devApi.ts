/**
 * Local dev API server for /api/chat.
 *
 * Vite (port 3000) proxies /api to this server (port 3001), so local dev behaves
 * just like production without needing the Vercel CLI. Run with: npm run dev:api
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateTedReply, type ChatMessage } from '../services/tedChat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim();
  }
}

loadEnv();

const PORT = 3001;

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { messages = [], type = 'text' } = JSON.parse(body || '{}') as {
          messages?: ChatMessage[];
          type?: string;
        };
        const reply = await generateTedReply(messages, type);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reply));
      } catch (error: any) {
        console.error('devApi error:', error?.message || error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            text: "My apologies — the tailoring room is unusually busy at the moment. Might you try that once more?",
            hasCalendarPicker: false,
          })
        );
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Ted dev API listening on http://localhost:${PORT}/api/chat`);
});
