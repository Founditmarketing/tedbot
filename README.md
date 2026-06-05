# Ask Ted

A standalone personal style concierge for **Weiss & Goldring** (Alexandria, LA).
Ted advises on fit, fabric, brands, and occasions, and can book a private fitting
right inside the chat.

This app is descended from the chatbot on the Weiss & Goldring site, but with one
big difference: **Ted's brain now lives in code.** Instead of Voiceflow, the
assistant is powered by Google Gemini, and his entire persona, store knowledge,
and behavior rules are defined in [`services/tedPersona.ts`](services/tedPersona.ts).
Edit that file to change how Ted thinks and talks.

## Architecture

```
ask-ted/
├─ api/
│  └─ chat.ts            # Vercel serverless function → Gemini. Parses control tokens.
├─ components/
│  └─ AskTed.tsx         # The luxury concierge UI (bell, dock/float, calendar picker).
├─ services/
│  └─ tedPersona.ts      # Ted's persona, store knowledge, and rules (the "brain").
├─ public/               # Bell icon, Ted avatar, chime, favicon, backdrop.
├─ App.tsx               # Standalone landing page that hosts the concierge.
└─ index.tsx / index.html / index.css
```

### How the brain works

1. The UI sends the full conversation to `POST /api/chat` as `{ messages, type }`.
2. `api/chat.ts` calls Gemini with the system instruction from `tedPersona.ts`.
3. Ted can append **control tokens** to a reply, which the server strips and turns
   into UI actions:
   - `<<<BOOK>>>` → shows the in-chat appointment picker (with business-hours validation).
   - `<<<SUGGEST: Option A | Option B>>>` → renders tappable quick replies.
4. The cleaned text + actions are returned to the UI.

To add new capabilities, define a new token in `tedPersona.ts`, parse it in
`api/chat.ts`, and render it in `AskTed.tsx`.

## Run locally

**Prerequisites:** Node.js, and a Google Gemini API key
(https://aistudio.google.com/apikey).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from the example and add your key:
   ```bash
   cp .env.example .env.local
   # then set GEMINI_API_KEY=...
   ```
3. The API route is a Vercel function. The simplest way to run the frontend and the
   `/api` function together locally is the Vercel CLI:
   ```bash
   npm i -g vercel
   vercel dev
   ```
   (`npm run dev` runs only the Vite frontend on port 3000 and proxies `/api` to
   port 3001, where `vercel dev` serves the function.)

## Deploy

Deploy to Vercel and set the `GEMINI_API_KEY` environment variable in the project
settings. `vercel.json` already wires up the API routes and SPA fallback.

## Ideas to build next

- Stream responses token-by-token for a live "typing" feel.
- Real calendar/CRM integration when an appointment is confirmed (email/SMS).
- Product lookbook carousels driven by a structured token.
- Image input: let clients upload a photo of an outfit for feedback.
- Per-visitor memory of sizes and preferences.
