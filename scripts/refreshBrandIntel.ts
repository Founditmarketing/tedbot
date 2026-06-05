/**
 * Brand intelligence refresh.
 *
 * Researches each brand Weiss & Goldring carries using Gemini with Google Search
 * grounding, and writes a concise, recommendation-ready summary to
 * data/brandIntel.json. Ted reads that file on every chat.
 *
 * Run it periodically (e.g. weekly):
 *   npm run refresh:brands
 *
 * This is the legitimate alternative to scraping social platforms: it pulls
 * what's publicly indexed on the web (brand sites, press, social coverage).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BRANDS } from '../services/tedPersona';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Minimal .env.local loader (no extra dependency). */
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY. Add it to .env.local first.');
    process.exit(1);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);

  const buildModel = (withSearch: boolean) =>
    genAI.getGenerativeModel({
      model: modelName,
      ...(withSearch ? { tools: [{ googleSearch: {} } as any] } : {}),
    });

  let useSearch = true;
  const results: { name: string; notes: string }[] = [];

  console.log(`Researching ${BRANDS.length} brands with ${modelName}${useSearch ? ' + Google Search' : ''}...\n`);

  for (const brand of BRANDS) {
    const sources = [brand.site && `their site (${brand.site})`, brand.social && `their social (${brand.social})`]
      .filter(Boolean)
      .join(' and ');

    const prompt = `Research the menswear/luxury brand "${brand.name}"${sources ? `, including ${sources}` : ''}.
In 2–3 sentences, summarize for a high-end clothier's assistant:
- the brand's signature aesthetic and what it's best known for,
- the kinds of pieces or current/recent collection themes a customer might want,
- which occasions or customer it suits (e.g. black tie, business, leisure).
Be specific and factual. No marketing fluff, no preamble, just the summary.`;

    let notes = '';
    try {
      const result = await buildModel(useSearch).generateContent(prompt);
      notes = result.response.text().trim();
    } catch (err: any) {
      if (useSearch) {
        console.warn(`  (grounding unavailable — continuing without web search)`);
        useSearch = false;
        try {
          const result = await buildModel(false).generateContent(prompt);
          notes = result.response.text().trim();
        } catch (err2: any) {
          console.error(`  Failed: ${brand.name} — ${err2?.message}`);
        }
      } else {
        console.error(`  Failed: ${brand.name} — ${err?.message}`);
      }
    }

    if (notes) {
      results.push({ name: brand.name, notes });
      console.log(`  ✓ ${brand.name}`);
    }
    await sleep(1200); // be gentle with rate limits
  }

  const out = {
    generatedAt: new Date().toISOString(),
    model: modelName,
    grounded: useSearch,
    brands: results,
  };

  const outPath = resolve(ROOT, 'data', 'brandIntel.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${results.length} brand summaries to data/brandIntel.json`);
  if (!useSearch) {
    console.log('Note: web grounding was unavailable (key may need billing enabled),');
    console.log('so summaries came from the model\'s own knowledge.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
