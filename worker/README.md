# Website Assistant: switch on full AI answers (optional, about 10 minutes)

The penguin assistant already works without this. It answers trading basics and site questions on its own, and it sends anyone asking for live prices or signals to your WhatsApp and Telegram.

Follow these steps only if you also want it to answer **any** question with AI.

Your website is on GitHub Pages, and GitHub Pages can't keep a password secret. So the AI key lives on a tiny free **Cloudflare Worker** instead, never in the website files.

1. Get an API key at **console.anthropic.com** → API Keys. Add a small amount of credit and set a monthly spend limit.
2. Go to **dash.cloudflare.com** → Workers & Pages → **Create** → Create Worker. Name it `ice-assistant` → Deploy.
3. Click **Edit code**, delete everything, paste in all of `assistant-worker.js` from this folder → **Deploy**.
4. Go to the Worker's **Settings → Variables and Secrets** and add:
   - `ANTHROPIC_API_KEY`: type **Secret**, your key
   - `ALLOWED_ORIGINS`: your site address(es), comma-separated, e.g. `https://yawicon122.github.io`. Add your own domain too if you have one.
5. Copy the Worker address, e.g. `https://ice-assistant.yourname.workers.dev`.
6. In `config.js` → `assistant` → paste it into `endpoint: ""` → commit.

To turn full AI answers off again, set `endpoint: ""`. To hide the penguin completely, set `enabled: false`.

**Built-in protection:**
- Only your site can call the Worker.
- Each visitor gets about 25 questions per 10 minutes, and the website itself allows 40 per session.
- Messages are cut to a safe length.
- Chats are not stored anywhere. They stay only in the visitor's open browser tab.
