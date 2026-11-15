# Website Assistant: full AI, live markets, calculators and memory (optional, about 15 minutes)

The bear assistant already works without this: trading basics and site help, and it points live-price questions to your WhatsApp and Telegram.

Follow these steps to switch on the **full AI**. It then:

- answers any question, and can search the web (optional);
- fetches **live prices**: forex, gold/silver, crypto, indices (via ETFs), stocks, with price, change, high/low, provider, time and a real-time / delayed / market-closed label;
- does an **educational chart read** (trend, RSI, MACD, moving averages, ATR, support/resistance, candle patterns) on several timeframes;
- does exact **calculations** (position size, pip value, risk/reward, profit/loss, compound growth);
- shows recent market headlines;
- remembers notes **only** when the visitor types `/remember`.

Your site is on GitHub Pages, which can't keep a secret, so the keys live in a free **Cloudflare Worker**. They are never in the website files.

## Setup

1. **AI key** (pick one): Claude at console.anthropic.com, OpenAI at platform.openai.com, or Gemini at aistudio.google.com. Add a small credit and set a monthly spend limit.
2. **Market data keys** (both free): `twelvedata.com` (forex, gold, stocks, candles; free plan about 8 requests per minute and 800 per day) and `finnhub.io` (stock fallback and news). Crypto prices use CoinGecko and need no key.
3. **Cloudflare**: dash.cloudflare.com → Workers & Pages → Create → Create Worker, name it `ice-assistant` → Deploy → **Edit code** → delete everything → paste all of `assistant-worker.js` from this folder → **Deploy**.
4. Worker → **Settings → Variables and Secrets**, add:

| Name | Type | Value |
|---|---|---|
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GEMINI_API_KEY` | Secret | your AI key (Claude, OpenAI or Google Gemini). If more than one is set, add `AI_PROVIDER` = `anthropic`, `openai` or `gemini` to choose |
| `TWELVE_DATA_API_KEY` | Secret | your Twelve Data key |
| `FINNHUB_API_KEY` | Secret | your Finnhub key |
| `ALLOWED_ORIGINS` | Text | `https://iceupdate.com,https://yawicon122.github.io` |
| `MODEL` | Text, optional | e.g. `claude-haiku-5-5` (Claude), `gpt-4.1` (OpenAI) or a Gemini model name (default `gemini-flash-latest`) |
| `DAILY_LIMIT` | Text, optional | most AI answers per day for the whole site (default `800`; `0` = no cap). After that the bear points people to your channels. Exact with KV memory on; approximate without it |
| `WEB_SEARCH` | Text, optional | `on` to let the AI search the web (Claude and OpenAI only; not available with Gemini here) |

5. **Memory (optional)**: Storage & databases → KV → Create namespace `ice-memory`. Worker → Settings → Bindings → Add → KV namespace → variable name `MEMORY` → pick `ice-memory`.
6. Open the Worker address in your browser. You should see a short status line, for example `"ai":"anthropic"`, `"marketData":{...}`. It never shows a key.
7. In `config.js` → `assistant` → paste the Worker address into `endpoint: ""` → commit. Done.

Turn it off again with `endpoint: ""`. Keep the AI but send live-price questions to your channels with `liveData: false`.

## What visitors can type

| Command | What it does |
|---|---|
| `/remember I risk 1% per trade` | saves a note (never passwords, keys or card numbers) |
| `/memories` | lists saved notes |
| `/forget 2` or `/forget word` | asks first, then `/forget yes` deletes |
| `/clear` | asks first, then `/clear yes` deletes everything |
| `/calculate (1500*1.05^3)` | instant exact answer, no AI call |
| `/search topic` | web search (needs `WEB_SEARCH=on`) |

**Chat history** stays in the visitor's own browser. **Long-term memory** is separate: it holds only what they ask to save, under a private random id kept in their browser, so one visitor can never see another's notes. Clearing browser data loses access to those notes.

## Safety built in

- Only your site's addresses can use the Worker. About 25 questions per visitor per 10 minutes, and 40 per session in the website.
- Messages from the browser can only be "user" or "assistant", so nobody can inject a "system" message.
- Web, news and price data is passed to the AI wrapped as data only, never as instructions.
- Prices come only from the data tools. The line "Market data: ... provider · time · status" is added by the Worker from what was really fetched, not written by the AI.
- If a data provider fails, the answer says live data is unavailable. It never invents a price.
- The AI has no tools that send, buy, sell, book, delete or publish, and is told never to claim it did.
- Keys are never returned to the browser, and are stripped from error messages.
- The calculator is a hand-written parser. It never uses `eval` or `Function`.
- Price quotes are cached for 20 seconds, so a busy page can't use up your free data limit.

## Keeping the keys safe

Only paste keys into Cloudflare **Secrets**. Never into `config.js`, `index.html` or any file in the repo. If a key is ever shown in public, delete it in the provider's dashboard and make a new one.

## Deleting data

The Worker stores nothing except `/remember` notes in your KV namespace. A visitor can delete theirs with `/clear`. You can delete everything from Cloudflare → KV → `ice-memory`.

## Changing or testing the code

Edit `src/*.js`, then run `node build.mjs` to rebuild `assistant-worker.js`. Run `node --test test/core.test.mjs test/service.test.mjs test/bundle.test.mjs` for the 22 automatic checks (needs Node 20 or newer). They cover maths, trading calculators, indicators, symbols, provider failures, memory and deletion, security, rate limits and the full AI flow with fake AI and data servers.

## Troubleshooting

| Problem | Fix |
|---|---|
| Bear says it can't answer general questions | `endpoint` in `config.js` is empty |
| "Origin not allowed" | add your exact site address to `ALLOWED_ORIGINS` (with `https://`, no slash at the end) |
| "Assistant not configured" | the AI key secret is missing or has a different name |
| "Too many requests" | wait a few minutes; the limit protects your credit |
| "Live data isn't switched on" | add `TWELVE_DATA_API_KEY` (forex, gold, stocks) |
| "Market-data request limit reached" | Twelve Data's free plan allows about 8 per minute; wait a minute |
| Index shows an ETF name | NASDAQ, S&P 500 and Dow use QQQ, SPY and DIA as a close stand-in; that is stated in the answer |
| Memory commands say "isn't switched on" | do step 5 (KV binding named `MEMORY`) |
| Web search does nothing | set `WEB_SEARCH` to `on` and allow web search on your AI account |

## Not included, on purpose

Accounts and logins, a conversation database, file upload with vector search, and the economic calendar. Each needs a paid service, a real login system, or a separate server, and none is needed to run a free education site safely. Ask if you want any of them added.

## Option: run it on Cloudflare Pages instead of a Worker

The repo also has `functions/api/chat.js`. If your Cloudflare **Pages** project is connected to this GitHub repo (build command empty, output directory `/`), Pages deploys the website and the AI together, and the AI answers at `https://YOUR-PROJECT.pages.dev/api/chat`. Put that full address in `config.js` → `endpoint`. Add the keys in the Pages project → Settings → Variables and Secrets (Production), then redeploy.
