/* =====================================================================
   ICE UPDATE — Website Assistant (polar bear)
   • Floating polar bear bottom-right (next to the social icon). Tap → chat.
   • Answers trading basics + "how do I use this site" instantly, offline.
   • Live prices / signals / news → points to the official WhatsApp & Telegram
     (links come from config.js → links, never typed here).
   • Any other question goes to the AI server IF config.js → assistant.endpoint
     is set (see worker/README.md). No key is ever stored in this file.
   • Chat is kept only for this browser tab session (sessionStorage).
   Modules: CONFIG · KNOWLEDGE · RENDER · API · UI (launcher, panel, log, input, prompts)
   ===================================================================== */
(function () {
  "use strict";
  if (window.__iuAssistant) return; window.__iuAssistant = true;

  /* ------------------------------------------------------------ CONFIG */
  var S = window.SITE || {};
  var A = S.assistant || {};
  if (A.enabled === false) return;
  var BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/assistant\.js.*$/, "") : "assistant/";
  var CFG = {
    title: A.title || "Website Assistant",
    endpoint: (A.endpoint || "").trim(),
    img: A.image || (BASE + "penguin-256.webp"),
    imgFallback: BASE + "penguin-256.png",
    invite: A.invite || "Hey! Need a hand?",
    welcome: A.welcome || "Hey there! I'm here to help you explore Ice Update, understand trading concepts, or answer general questions. What would you like to know?",
    prompts: A.quickPrompts || ["Explain pips", "What is leverage?", "How do I join the community?", "What is a stop-loss?", "Where are the PDFs?"],
    wa: (S.links && S.links.whatsapp) || "",
    tg: (S.links && S.links.telegram) || "",
    maxLen: 600,            // characters per message
    maxPerSession: 40,      // messages sent to the AI per tab session
    timeoutMs: 25000
  };
  var KEY_LOG = "iu_pa_log_v1", KEY_SEEN = "iu_pa_seen_v1", KEY_COUNT = "iu_pa_n_v1";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function safeUrl(u) { return /^https:\/\//i.test(u || "") ? u : ""; }
  CFG.wa = safeUrl(CFG.wa); CFG.tg = safeUrl(CFG.tg);

  /* --------------------------------------------------------- KNOWLEDGE
     Short, education-only answers. Each: keys (phrases), text (mini-markdown), acts (buttons). */
  var NO_ADVICE = "_Education only, not financial advice._";
  var KB = [
    { k: ["pip", "pips", "pipette"], t:
      "A **pip** is the standard small step a currency price moves.\n\n- On most pairs (like EUR/USD) 1 pip = **0.0001**. 1.1050 → 1.1051 is 1 pip.\n- On JPY pairs (like USD/JPY) 1 pip = **0.01**.\n- On gold (XAU/USD) most brokers count **0.10** as 1 pip, but check your broker's spec.\n\n**Example:** buy EUR/USD at 1.1000, close at 1.1030 → +30 pips. What that is worth in money depends on your lot size." },
    { k: ["lot", "lots", "lot size", "micro lot", "mini lot", "standard lot", "volume"], t:
      "A **lot** is your trade size.\n\n- **Standard lot** = 1.00 → about $10 per pip on EUR/USD\n- **Mini lot** = 0.10 → about $1 per pip\n- **Micro lot** = 0.01 → about $0.10 per pip\n\nBeginners usually start with micro lots so mistakes stay small." },
    { k: ["spread", "bid", "ask", "bid ask"], t:
      "The **spread** is the gap between the **bid** (sell) price and the **ask** (buy) price. It's a cost you pay on every trade.\n\n**Example:** EUR/USD bid 1.1000, ask 1.1002 → spread = 2 pips. Your trade starts 2 pips down. Spreads usually widen around big news and when the market is quiet." },
    { k: ["leverage", "1:100", "1:500", "1:1000", "high leverage"], t:
      "**Leverage** lets you control a bigger position with a small deposit.\n\n- With 1:100, $100 of margin controls a $10,000 position.\n- It makes **profits and losses bigger**. It doesn't make trades more likely to win.\n\nHigh leverage is the most common way beginners blow accounts. Keep your risk per trade small (many traders use 1-2%) whatever leverage your broker offers. " + NO_ADVICE },
    { k: ["margin", "margin call", "free margin", "stop out", "margin level"], t:
      "**Margin** is the part of your balance your broker locks while a trade is open.\n\n- **Free margin** = what's left to open more trades or absorb losses.\n- **Margin call** = your losses are eating your margin; the broker warns you.\n- **Stop out** = the broker closes trades automatically because there isn't enough margin left.\n\nSmall position sizes keep you far away from margin calls." },
    { k: ["swap", "overnight fee", "rollover", "swap free", "islamic account"], t:
      "A **swap** (rollover) is a small fee or credit for keeping a trade open overnight. It comes from the interest-rate difference between the two currencies. It can be positive or negative, and is often tripled on Wednesdays. Some brokers offer swap-free accounts; check your broker's conditions." },
    { k: ["forex", "what is forex", "currency pair", "pair", "base currency", "quote currency", "eurusd", "eur/usd"], t:
      "**Forex** is the global market for trading currencies. Prices come in **pairs**, like **EUR/USD = 1.1000**.\n\n- **EUR** is the **base** currency, **USD** is the **quote**.\n- 1.1000 means 1 euro costs 1.10 dollars.\n- **Buy** the pair if you think the base will strengthen, **sell** if you think it will weaken." },
    { k: ["candle", "candlestick", "candles", "ohlc", "open high low close", "wick", "body"], t:
      "Each **candle** shows 4 prices for its time period: **Open, High, Low, Close**.\n\n- **Body** = between open and close\n- **Wicks** = the high and the low\n- **Green** = closed higher than it opened (buyers won)\n- **Red** = closed lower (sellers won)\n\nTry the candle builder in **Learn & Play** to see it move.", acts: [["Open Learn & Play", "#learn-card"]] },
    { k: ["trend", "uptrend", "downtrend", "sideways", "higher highs", "range"], t:
      "A **trend** is price's overall direction.\n\n- **Uptrend**: higher highs and higher lows\n- **Downtrend**: lower highs and lower lows\n- **Sideways/range**: bouncing between two levels\n\nZoom out (4H or daily) to see the main trend before you look for entries." },
    { k: ["support", "resistance", "support and resistance", "s/r", "key level", "zone", "breakout", "retest"], t:
      "**Support** is a level where price keeps bouncing up (buyers step in). **Resistance** is where it keeps getting pushed down (sellers step in).\n\n1. Zoom out.\n2. Mark zones where price turned at least 2-3 times.\n3. Keep it to a few clean levels.\n\nWhen resistance breaks clearly, it often becomes new support (**break and retest**). It's never guaranteed.\n\nThere's a full free guide in the PDFs.", acts: [["Open PDF guides", "#pdf-card"]] },
    { k: ["order type", "order types", "market order", "limit order", "stop order", "buy limit", "sell limit", "buy stop", "sell stop", "pending order"], t:
      "**Order types:**\n\n- **Market order**: buy/sell right now at the current price.\n- **Buy limit**: buy *below* the current price (waiting for a dip).\n- **Sell limit**: sell *above* the current price.\n- **Buy stop**: buy *above* the current price (catching a breakout).\n- **Sell stop**: sell *below* the current price.\n\nYou can attach a stop-loss and take-profit to any of them." },
    { k: ["stop loss", "stop-loss", "stoploss", "sl"], t:
      "A **stop-loss** is the price where your trade closes automatically to limit your loss. It's your emergency exit.\n\n- Place it where your idea is clearly wrong (e.g. just beyond support/resistance), not at a random number.\n- Decide it **before** you enter.\n- Don't move it further away to \"give it room\".\n\nTrading without one is the fastest way to lose an account. " + NO_ADVICE },
    { k: ["take profit", "take-profit", "tp", "target"], t:
      "A **take-profit** closes your trade automatically when price reaches your target, so you lock in the gain without watching the screen. Many traders set it at **at least 2x** the distance of their stop-loss (a 1:2 risk/reward)." },
    { k: ["risk reward", "risk/reward", "risk to reward", "rr", "r:r", "1:2", "reward"], t:
      "**Risk/reward** compares what you could lose to what you aim to make.\n\n**Example:** risk 20 pips to make 40 → 1:2.\n\nWith 1:2 you only need to be right about **1 trade in 3** to roughly break even (before costs). That's why good traders care more about R:R and discipline than about winning every trade." },
    { k: ["position size", "position sizing", "how much to risk", "risk per trade", "1%", "2%", "risk management", "money management"], t:
      "**Position sizing** = choosing your lot size so a loss only costs a small, fixed % of your account.\n\n1. Pick your risk: e.g. **1%** of $1,000 = $10.\n2. Measure your stop: e.g. 20 pips.\n3. $10 ÷ 20 pips = $0.50 per pip → about **0.05 lots** on EUR/USD.\n\nThat way 5 losses in a row cost about 5%, not your whole account. " + NO_ADVICE },
    { k: ["drawdown", "losing streak", "losses", "lost money", "blew my account", "blown account"], t:
      "**Drawdown** is how far your account falls from its peak. Losses are a normal part of trading. Even good strategies have losing streaks.\n\n- Keep risk per trade small so streaks don't wipe you out.\n- Set a daily loss limit and stop when you hit it.\n- Review losses in a journal; don't revenge trade.\n\nA loss doesn't make you a failure. Quitting the learning does." },
    { k: ["fomo", "revenge trading", "emotion", "emotions", "fear", "greed", "discipline", "psychology", "mindset"], t:
      "The three big enemies: **fear** (closing winners too early), **greed** (moving targets, oversizing) and **FOMO** (chasing big candles). Then **revenge trading** after a loss.\n\n**What helps:**\n- A written plan: pair, time, setup, stop, target\n- A daily limit on trades and losses\n- A journal of every trade and how you felt\n- Walking away after 2 losses in a row\n\nThere's a lesson on this in the video section.", acts: [["Watch the lessons", "#gallery"]] },
    { k: ["pattern", "patterns", "chart pattern", "doji", "hammer", "engulfing", "pin bar", "head and shoulders", "double top", "double bottom", "flag", "triangle"], t:
      "Chart and candle patterns (hammer, engulfing, doji, double top...) show a **possible** shift between buyers and sellers. They're far more useful **at a key level** (support/resistance, with the trend) than in the middle of nowhere.\n\nNo pattern guarantees a result. Always use a stop-loss.\n\nSee the free **15 Candlestick Patterns** PDF.", acts: [["Open PDF guides", "#pdf-card"]] },
    { k: ["indicator", "indicators", "rsi", "macd", "moving average", "ema", "sma", "bollinger", "stochastic", "fibonacci", "fib"], t:
      "**Indicators** are calculations on price that help you read it:\n\n- **Moving averages (EMA/SMA)**: smooth price to show the trend\n- **RSI**: momentum, 0-100; above 70 is \"stretched\" up, below 30 down\n- **MACD**: trend + momentum crossovers\n- **Fibonacci**: common pullback levels (38.2%, 50%, 61.8%)\n\nThey lag price and give false signals too. Use one or two with support/resistance, not ten. No indicator guarantees a result." },
    { k: ["inflation", "cpi"], t:
      "**Inflation** is how fast prices rise. It's reported monthly as **CPI**. Higher-than-expected inflation can push a central bank toward higher interest rates, which often (not always) supports that currency. The market reacts most to the **surprise** versus expectations." },
    { k: ["interest rate", "interest rates", "central bank", "fed", "federal reserve", "ecb", "boe", "rate hike", "rate cut", "fomc"], t:
      "**Central banks** (the US Fed, ECB, Bank of England...) set **interest rates**.\n\n- Higher rates or hawkish talk: the currency often strengthens.\n- Cuts or dovish talk: it often weakens.\n- Gold often reacts to US rates and the dollar, since it pays no interest.\n\nThese are tendencies, not rules. Surprises and expectations matter most." },
    { k: ["nfp", "non farm", "nonfarm", "jobs report", "employment report", "unemployment"], t:
      "**NFP (Non-Farm Payrolls)** is the US jobs report, usually on the first Friday of the month. It shows how many jobs were added. Big surprises move the dollar and gold fast, spreads widen and slippage is common. Many traders avoid opening new trades right before it." },
    { k: ["geopolitical", "war", "election", "crisis", "safe haven"], t:
      "**Geopolitical risk** (conflicts, elections, sanctions) can make traders nervous. In uncertain times money often moves to **safe havens** like gold, the US dollar, the Japanese yen or the Swiss franc. Reactions vary, though, and can reverse quickly." },
    { k: ["what moves gold", "gold move", "xauusd", "xau", "gold"], t:
      "**What tends to move gold (XAU/USD):**\n\n- **US interest rates**: higher real rates usually pressure gold\n- **The US dollar**: a stronger dollar often weighs on gold\n- **Fear and uncertainty**: safe-haven buying\n- **Inflation data and Fed speeches**\n\nNone of these is certain. Gold can move fast, so size small and always use a stop-loss. There's a live gold chart higher up this page.", acts: [["See the gold chart", "#gold-chart"]] },
    { k: ["demo", "demo account", "practice account", "paper trading", "practise"], t:
      "A **demo account** lets you trade with virtual money on real prices. It's the best place to practise drawing levels, placing stops and following a plan, with zero risk. Most brokers and MetaTrader 5 offer one free. Stay on demo until you can follow your rules consistently." },
    { k: ["mt5", "metatrader", "mt4", "tradingview", "platform", "app to trade"], t:
      "**MetaTrader 5 (MT5)** is the most common platform for placing forex and gold trades through a broker. **TradingView** is popular for charting and analysis. Many traders analyse on TradingView and execute on MT5." },
    { k: ["scam", "scams", "fraud", "account manager", "double my money", "guaranteed", "recovery", "fake"], t:
      "**Red flags of a trading scam:**\n\n1. Guaranteed profit or fixed weekly returns\n2. Pressure to act fast\n3. Sending money to a personal account or an \"account manager\"\n4. Asking for your password or the code sent to your phone\n5. Withdrawal \"fees\" before you can get your money\n\nIce Update will never DM you asking for money. Only trust the official links on this website." },
    // ---- website guidance
    { k: ["join", "community", "whatsapp", "telegram", "channel", "group", "how do i join"], t:
      "Ice Update has two free community channels:\n\n- **WhatsApp channel**: updates and announcements\n- **Telegram**: class group and market updates\n\nTap a button below. It opens the official channel and you can join from there. Joining is optional.", acts: ["channels"] },
    { k: ["pdf", "pdfs", "guide", "guides", "download", "ebook", "book"], t: function () {
      var p = (S.pdfs || []).map(function (x) { return "- " + x.title; }).join("\n");
      return "The free **PDF guides** are in the PDF Guides card" + (p ? ":\n\n" + p : ".") + "\n\nTap one to open it right on the site."; }, acts: [["Open PDF guides", "#pdf-card"]] },
    { k: ["video", "videos", "lesson", "lessons", "tutorial", "tutorials", "class", "classes"], t: function () {
      var v = (S.lessonVideos || []).map(function (x) { return "- " + x.title; }).join("\n");
      return "Video lessons are in the **Watch the lesson** row (swipe for more)" + (v ? ":\n\n" + v : ".") + "\n\nLive classes are announced in the community channels."; }, acts: [["Go to the lessons", "#gallery"]] },
    { k: ["game", "games", "learn and play", "learn & play", "quiz", "play"], t:
      "**Learn & Play** has a candle game, a quiz, a candle builder and a 5-step \"Start here\" route. It's the most fun way to practise reading charts.", acts: [["Open Learn & Play", "#learn-card"]] },
    { k: ["broker", "brokers", "which broker", "best broker", "exness", "alchemy", "register", "open account"], t: function () {
      var b = (S.brokers || []).map(function (x) { return "- " + x.name; }).join("\n");
      return "The brokers Ice Update works with are listed in the **Brokers** section" + (b ? ":\n\n" + b : ".") + "\n\nThis isn't a personal recommendation. Before depositing, check each broker's regulation on the regulator's official website, read the fees and withdrawal terms, and start on a demo account."; }, acts: [["Go to Brokers", "#brokers"]] },
    { k: ["gallery", "pictures", "images", "chart examples"], t: "Chart examples and trade breakdowns are in the **Gallery** section.", acts: [["Go to Gallery", "#gallery"]] },
    { k: ["social", "tiktok", "instagram", "youtube", "facebook", "follow"], t: "All Ice Update social profiles are in the **Social** section at the bottom of the page, and the small round icon in the corner.", acts: [["Go to Social", "#social"]] },
    { k: ["start", "beginner", "new", "where do i start", "how to start", "start here", "learn trading"], t:
      "Welcome! A simple path:\n\n1. **Learn & Play** → follow the 5-step \"Start here\" route\n2. Read the **Candlestick** and **Support & Resistance** PDFs\n3. Watch the video lessons\n4. Practise on a **demo account**\n5. Join the community for live classes\n\nAsk me anything along the way.", acts: [["Start here", "#learn-card"], ["PDF guides", "#pdf-card"]] },
    { k: ["who are you", "what are you", "are you human", "are you a bot", "are you real"], t:
      "I'm the Ice Update website assistant, a computer program, not a person and not a financial adviser. I can explain trading concepts, help you find things on this site and answer general questions." },
    { k: ["hello", "hi", "hey", "good morning", "good evening", "wagwan", "yo"], t: "Hey! 👋 What can I help you with? Trading basics, finding something on the site, or something else?" },
    { k: ["thank", "thanks", "thank you", "cheers"], t: "You're welcome! Anything else?" }
  ];

  var LIVE = /\b(price|prices|signal|signals|news|today|tonight|right now|now|live|current|currently|latest|this week|tomorrow|update|updates|forecast|prediction|predict|will .* (go|rise|fall|drop|pump)|should i (buy|sell|enter)|buy or sell|entry)\b/i;
  var MKT = /\b(gold|xau|xauusd|eur|usd|gbp|jpy|btc|bitcoin|crypto|forex|fx|market|markets|nasdaq|us30|dow|oil|silver|pair|chart|trade|signals?)\b/i;

  function norm(s) { return " " + String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9/:%&.\- ]+/g, " ").replace(/\s+/g, " ").trim() + " "; }
  function match(q) {
    var n = norm(q), best = null, bs = 0;
    KB.forEach(function (e) {
      var s = 0;
      e.k.forEach(function (k) {
        var kk = norm(k);
        if (n.indexOf(kk) > -1) s += 1 + kk.length / 6;
      });
      if (s > bs) { bs = s; best = e; }
    });
    return bs >= 1.3 ? { e: best, score: bs } : null;
  }
  function isLive(q) { return LIVE.test(q) && MKT.test(q); }
  function liveReply() {
    return { t: "I can explain what moves the markets, but I don't provide live prices, breaking news or trade signals here. Ice Update shares live market updates on its **WhatsApp** and **Telegram** channels.\n\nWhatever you see there, always use your own stop-loss and risk only what you can afford to lose.", acts: ["channels"] };
  }

  /* ------------------------------------------------------------ RENDER
     Text is escaped first; only our own tiny markdown is turned into tags.
     Model output can never inject HTML or scripts. */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function inline(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[\s(])_([^_]+)_(?=[\s.,!?)]|$)/g, "$1<em>$2</em>")
            .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s.,!?)]|$)/g, "$1<em>$2</em>")
            .replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  function md(src) {
    var lines = esc(src).split(/\n/), html = "", list = null;
    function close() { if (list) { html += "</" + list + ">"; list = null; } }
    lines.forEach(function (ln) {
      var m;
      if (/^\s*$/.test(ln)) { close(); return; }
      if ((m = ln.match(/^\s*#{1,4}\s+(.*)$/))) { close(); html += "<h4>" + inline(m[1]) + "</h4>"; return; }
      if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += "<li>" + inline(m[1]) + "</li>"; return; }
      if ((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += "<li>" + inline(m[1]) + "</li>"; return; }
      close(); html += "<p>" + inline(ln) + "</p>";
    });
    close(); return html;
  }
  var ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>';
  var ICON_TG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.6 18.7 19.6c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L6.6 13.5 1.9 12c-1-.3-1-1 .2-1.5L20.5 3.4c.9-.3 1.6.2 1.4 1.2z"/></svg>';
  function actsHtml(acts) {
    if (!acts || !acts.length) return "";
    var h = "";
    acts.forEach(function (a) {
      if (a === "channels") {
        if (CFG.wa) h += '<a class="pa-act wa" href="' + esc(CFG.wa) + '" target="_blank" rel="noopener" data-track="assistant-join-whatsapp">' + ICON_WA + "WhatsApp channel</a>";
        if (CFG.tg) h += '<a class="pa-act tg" href="' + esc(CFG.tg) + '" target="_blank" rel="noopener" data-track="assistant-join-telegram">' + ICON_TG + "Telegram</a>";
      } else if (Array.isArray(a) && /^#[\w-]+$/.test(a[1]) && document.querySelector(a[1])) {
        h += '<button type="button" class="pa-act" data-go="' + esc(a[1]) + '">' + esc(a[0]) + " →</button>";
      }
    });
    return h ? '<div class="pa-acts">' + h + "</div>" : "";
  }

  /* --------------------------------------------------------------- API */
  function askAI(history) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, CFG.timeoutMs);
    var body = { messages: history.slice(-12).map(function (m) { return { role: m.r === "me" ? "user" : "assistant", content: String(m.t).slice(0, 1500) }; }) };
    return fetch(CFG.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || ("HTTP " + r.status)); e.status = r.status; throw e; }
          if (!j.reply) throw new Error("empty");
          return j.reply;
        });
      }, function (e) { clearTimeout(timer); throw e; });
  }

  /* ---------------------------------------------------------------- UI */
  // the polar bear: frame-by-frame sprites (assistant/bear-*.webp) + live body motion, with a little "brain"
  function pengHTML() { return '<span class="pa-mv"><canvas class="pa-bear" aria-hidden="true"></canvas></span>'; }
  function pengMini() { return '<canvas class="pa-bear pa-bear-mini" aria-hidden="true"></canvas>'; }
  var SH = { walk: { w: 130, h: 155, ax: 67, ay: 152, n: 8 }, push: { w: 186, h: 156, ax: 93, ay: 154, n: 12 },
    happy: { w: 120, h: 157, ax: 61, ay: 155, n: 8 }, hello: { w: 173, h: 161, ax: 91, ay: 159, n: 11 }, fall: { w: 128, h: 153, ax: 65, ay: 151, n: 12 }, rain: { w: 166, h: 216, ax: 83, ay: 214, n: 15 } };
  var STAND = 150;
  Object.keys(SH).forEach(function (k) { var im = new Image(); im.decoding = "async"; im.src = BASE + "bear-" + k + ".webp"; SH[k].img = im; });
  var PI = Math.PI, TAU = 2 * PI;
  function frames(list, fps) { return list.map(function (f) { return { f: f, d: 1 / fps }; }); }
  function at(steps, u) { var t = 0; for (var i = 0; i < steps.length; i++) { t += steps[i].d; if (u < t) return steps[i]; } return null; }
  function total(steps) { return steps.reduce(function (s, x) { return s + x.d; }, 0); }
  function sm(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var HOME_MIN = -130, HOME_MAX = 0;     // how far left of its corner the bear may wander (px)

  /* ---- actions: each returns a pose {sheet,f,dx,ty,flip,sx,sy,rot} for time u, or null when finished ---- */
  var WAVE = frames([0, 1, 2, 3, 4, 5, 6, 7, 0], 5), HELLO = frames([0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10], 6);
  var ACT = {
    wave: function (u, B) { var s = at(WAVE, u); return s && { sheet: "happy", f: s.f, rot: .03 * Math.sin(u * 5) }; },
    hello: function (u, B) { var s = at(HELLO, u); if (!s) return null; if (s.f === 7 && !B.landed) { B.landed = 1; B.wob = 1; } return { sheet: "hello", f: s.f }; },
    look: function (u, B) {   // glance the other way with a little hop
      if (u > .9) return null; if (u > .35 && !B.flipped) { B.flipped = 1; B.face *= -1; B.wob = .6; }
      return { sheet: "happy", f: 0, ty: -7 * Math.sin(Math.min(1, u / .7) * PI), sy: 1 - .06 * Math.max(0, Math.sin(u / .35 * PI)) }; },
    wander: function (u, B, A) {   // waddle to a new spot
      if (A.to === undefined) { A.from = B.x; var t; do { t = rnd(HOME_MIN, HOME_MAX); } while (Math.abs(t - B.x) < 35); A.to = t; A.dur = Math.abs(t - B.x) / 34; }
      var dir = A.to > A.from ? 1 : -1;
      if (u >= A.dur) { B.x = A.to; B.face = dir; B.wob = .4; return null; }
      B.x = A.from + (A.to - A.from) * (u / A.dur);
      return { sheet: "walk", f: Math.floor(u * 8) % 8, flip: dir < 0, rot: .03 * Math.sin(u * 8 * PI / 2) }; },
    dance: function (u, B) {   // bouncy little dance, arms up, swaying to a beat
      if (u > 3.2) { B.wob = 1; return null; }
      var beat = u * 2.6 * TAU, b = (1 - Math.cos(beat)) / 2;
      if (Math.floor(u * 1.3) !== B.lastFlip) { B.lastFlip = Math.floor(u * 1.3); B.face *= -1; }
      return { sheet: "happy", f: [2, 3, 4, 5, 4, 3][Math.floor(u * 6) % 6], ty: -9 * b, sy: 1 - .07 * (1 - b) * (1 - b) + .03 * b, sx: 1 + .05 * (1 - b) * (1 - b), rot: .12 * Math.sin(beat / 2) }; },
    stretch: function (u, B) {   // big stretch up, then a happy shake
      if (u > 2.6) return null;
      var k = sm(u / .7) * (1 - sm((u - 1.8) / .4));
      if (u > 1.8 && !B.landed) { B.landed = 1; B.wob = 1; }
      return { sheet: "happy", f: u < .25 ? 2 : u < 1.9 ? 4 : u < 2.2 ? 3 : 0, sy: 1 + .09 * k, sx: 1 - .04 * k, rot: .04 * k * Math.sin(u * 3) }; },
    spin: function (u, B) {   // crouch, leap, turn around in the air, land
      var s = at(frames([3, 4, 5, 6, 7, 8, 9], 7), u); if (!s) return null;
      if (s.f >= 6 && !B.flipped) { B.flipped = 1; B.face *= -1; }
      if (s.f === 7 && !B.landed) { B.landed = 1; B.wob = 1; }
      return { sheet: "hello", f: s.f }; },
    nap: function (u, B) {   // lies down for a little rest, breathing, then gets back up
      var down = frames([11, 10, 9, 8, 7], 5), up = frames([8, 9, 10, 11], 4.5), D = total(down), L = 4.2, U = total(up);
      if (u < D) return { sheet: "fall", f: at(down, u).f };
      if (u < D + L) { var v = u - D; return { sheet: "fall", f: 7, sy: 1 + .035 * Math.sin(v * TAU / 1.8), sx: 1 - .015 * Math.sin(v * TAU / 1.8) }; }
      var s = at(up, u - D - L); if (!s) { B.wob = 1; return null; } return { sheet: "fall", f: s.f }; },
    push: function (u, B, A) {   // walks to the Facebook button and pushes with all its might
      if (A.to === undefined) { A.from = B.x; A.to = A.pushX; A.walk = Math.abs(A.to - A.from) / 40; }
      if (u < A.walk) { B.x = A.from + (A.to - A.from) * (u / A.walk); return { sheet: "walk", f: Math.floor(u * 8) % 8, flip: A.to < A.from }; }
      B.x = A.to; B.face = 1;
      var steps = frames([1, 2, 3], 5).concat(frames([4, 5, 6, 7, 8, 4, 5, 6, 7, 8, 4, 5, 6, 7, 8], 6)).concat(frames([9, 10], 4)).concat([{ f: 11, d: .9 }]);
      var s = at(steps, u - A.walk); if (!s) { B.wob = .8; return null; }
      var pushing = s.f >= 3 && s.f <= 8;
      return { sheet: "push", f: s.f, push: pushing, shove: pushing && s.f >= 4, sx: pushing ? 1 + .02 * Math.sin(u * 30) : 1 }; },
    spew: function (u, B, A) {   // gags, then throws up "ICE UPDATE" (letters + ice cubes), wipes its mouth, happy
      if (!A.init) { A.init = 1; B.face = -1; A.next = 0; }
      if (u > 5.4) { B.wob = .6; return null; }
      if (u < .9) {   // gag: tummy heaves
        var g = Math.sin(u / .9 * PI * 3); return { sheet: "happy", f: 0, sy: 1 - .06 * Math.max(0, g), sx: 1 + .04 * Math.max(0, g), rot: -.08 * Math.max(0, g) };
      }
      if (u < 2.9) {  // spew
        var v = u - .9;
        while (A.next < 10 && v > A.next * .17) { fxSpew(B, A.next); A.next++; }
        if (Math.random() < .5) fxIce(B);
        return { sheet: "happy", f: 5, rot: .28 + .03 * Math.sin(u * 40), sx: 1 + .02 * Math.sin(u * 37), sy: 1 + .03 * Math.sin(u * 31) };
      }
      if (u < 3.6) return { sheet: "happy", f: 1, rot: .05 * Math.sin(u * 6) };   // wipes mouth
      var w = at(WAVE, u - 3.6); return w ? { sheet: "happy", f: w.f } : { sheet: "happy", f: 0 };
    },
    rain: function (u, B, A) {   // sunglasses drop on, grabs cash and makes it rain (3 throws), glasses pop off again
      if (!A.steps) {
        var st = [[0, .1], [1, .1], [2, .1], [3, .1], [4, .18], [5, .3], [6, .45]];
        for (var n = 0; n < 3; n++) st = st.concat([[7, .12], [8, .1], [9, .1], [10, .1, 1], [11, .12], [12, .12], [11, .12], [12, .12], [13, .16], [14, .28]]);
        st = st.concat([[5, .35], [2, .08], [1, .08], [0, .12]]);
        A.steps = st.map(function (x) { return { f: x[0], d: x[1], throwIt: x[2] }; }); A.done = -1;
      }
      var t = 0, i = 0; for (; i < A.steps.length; i++) { t += A.steps[i].d; if (u < t) break; }
      if (i >= A.steps.length) { B.wob = .5; return null; }
      var s = A.steps[i];
      if (s.throwIt && A.done < i) { A.done = i; fxBills(B); B.wob = .5; }
      return { sheet: "rain", f: s.f, flip: false };
    },
    crash: function (u, B) {   // hits the ground after a big fall: belly flop, lies there, gets up
      var s = at(frames([5, 6, 7], 7).concat(frames([8, 9, 10, 11], 4.5)), u); return s && { sheet: "fall", f: s.f }; },
    bump: function (u, B) {    // small drop: knees bend on landing
      if (u > .45) return null; return { sheet: "hello", f: u < .2 ? 3 : 2, sy: 1 - .08 * Math.sin(Math.min(1, u / .45) * Math.PI) };
    }
  };
  /* ---- effects overlay: the letters and ice cubes the bear throws up ---- */
  var FX = [], fxCv = null, WORD = "ICE UPDATE";
  function fxCanvas() {
    if (fxCv) return fxCv;
    fxCv = document.createElement("canvas"); fxCv.setAttribute("aria-hidden", "true");
    fxCv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9990";
    document.body.appendChild(fxCv); return fxCv;
  }
  function mouth(B) {   // where the bear's mouth is on screen right now
    var r = B.cv.getBoundingClientRect(), s = B.cv.__scale || .43;
    return { x: r.left + r.width / 2 + B.face * 16 * s * 2.2, y: r.bottom - 2 - 118 * s };
  }
  function fxSpew(B, i) {
    var ch = WORD[i]; if (ch === " ") return;
    var m = mouth(B), n = WORD.length, gap = 25, sx = m.x - 150 - (n - 1) * gap;   // word lands to the bear's left
    FX.push({ k: "L", ch: ch, x0: m.x, y0: m.y, x1: Math.max(14, sx) + i * gap, y1: m.y - 70 - 8 * Math.sin(i / (n - 1) * PI), t0: performance.now() / 1000, d: .55, rot: (Math.random() - .5) * 2 });
    for (var j = 0; j < 3; j++) fxIce(B);
  }
  function fxIce(B) {
    var m = mouth(B), sp = rnd(140, 320);
    FX.push({ k: "I", x: m.x, y: m.y, vx: B.face * Math.cos((Math.random() - .5) * .9) * sp, vy: -rnd(40, 200), t0: performance.now() / 1000, sz: rnd(4, 9), rot: Math.random() * 6, vr: rnd(-6, 6), ground: B.cv.getBoundingClientRect().bottom - 2 });
  }
  function fxBills(B) {   // a burst of banknotes from both raised paws
    var r = B.cv.getBoundingClientRect(), sc = B.cv.__scale || .43, cx = r.left + r.width / 2, top = r.bottom - 2 - 150 * sc, now = performance.now() / 1000;
    for (var h = -1; h <= 1; h += 2) for (var j = 0; j < 13; j++) {
      FX.push({ k: "B", x: cx + h * 40 * sc + rnd(-6, 6), y: top + rnd(-6, 6), vx: h * rnd(20, 190) + rnd(-60, 60), vy: -rnd(240, 560), t0: now, life: rnd(2.6, 3.8),
        rot: Math.random() * 6, vr: rnd(-7, 7), ph: Math.random() * 6, sz: rnd(.8, 1.15), ground: r.bottom - 3 - Math.random() * 4 });
    }
  }
  function fxDraw(now, dt) {
    if (!FX.length) { if (fxCv && fxCv.__on) { fxCv.getContext("2d").clearRect(0, 0, fxCv.width, fxCv.height); fxCv.__on = 0; } return; }
    var cv = fxCanvas(), dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var c = cv.getContext("2d"); cv.__on = 1;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    FX = FX.filter(function (p) {
      var age = now - p.t0;
      if (p.k === "B") {   // banknote: shoots up, then flutters down and settles
        if (age > p.life) return false;
        if (p.y < p.ground || p.vy < 0) {
          p.vy += 520 * dt; if (p.vy > 95) p.vy = 95;                       // air drag: slow fluttery fall
          p.vx *= Math.exp(-dt * 1.6); p.x += (p.vx + 38 * Math.sin(age * 5 + p.ph)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.y >= p.ground && p.vy > 0) { p.y = p.ground; p.vr = 0; p.rot = Math.round(p.rot / PI) * PI + rnd(-.25, .25); }
        }
        var flip = p.y < p.ground ? Math.cos(age * 7 + p.ph) : 1, w = 15 * p.sz, hh = 8.5 * p.sz;
        c.save(); c.globalAlpha = Math.min(1, (p.life - age) / .5); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, .35 + .65 * Math.abs(flip));
        c.fillStyle = "#57b96a"; c.strokeStyle = "#1f5a2e"; c.lineWidth = 1.4;
        c.beginPath(); c.roundRect ? c.roundRect(-w / 2, -hh / 2, w, hh, 1.5) : c.rect(-w / 2, -hh / 2, w, hh); c.fill(); c.stroke();
        c.fillStyle = "#c9f2cf"; c.beginPath(); c.arc(0, 0, hh * .3, 0, 7); c.fill();
        c.restore(); return true;
      }
      if (p.k === "I") {   // ice cube: flies, falls, bounces, melts away
        if (age > 2.2) return false;
        p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > p.ground) { p.y = p.ground; p.vy *= -.35; p.vx *= .6; p.vr *= .5; }
        c.save(); c.globalAlpha = Math.min(1, (2.2 - age) / .6); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = "rgba(205,240,255,.95)"; c.strokeStyle = "rgba(77,180,230,.9)"; c.lineWidth = 1.5;
        c.beginPath(); c.roundRect ? c.roundRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz, 2) : c.rect(-p.sz / 2, -p.sz / 2, p.sz, p.sz); c.fill(); c.stroke();
        c.fillStyle = "rgba(255,255,255,.9)"; c.fillRect(-p.sz / 2 + 1.5, -p.sz / 2 + 1.5, p.sz / 3, p.sz / 3); c.restore();
        return true;
      }
      // letter: arcs out of the mouth, lands in its place in the word, wobbles, then shatters into ice
      var LIFE = 4.6; if (age > LIFE) return false;
      var u = Math.min(1, age / p.d), e = 1 - Math.pow(1 - u, 3);
      var x = p.x0 + (p.x1 - p.x0) * e, y = p.y0 + (p.y1 - p.y0) * e - 90 * Math.sin(u * PI) * (1 - u * .3);
      var settle = age > p.d ? Math.exp(-(age - p.d) * 5) * Math.sin((age - p.d) * 22) : 0;
      var sc = (.4 + .6 * e) * (1 + .18 * settle), rot = p.rot * (1 - e) + .06 * settle;
      var fade = age > LIFE - .45 ? (LIFE - age) / .45 : 1;
      if (age > LIFE - .45 && !p.shat) { p.shat = 1; for (var q = 0; q < 3; q++) FX.push({ k: "I", x: x, y: y, vx: rnd(-90, 90), vy: rnd(-160, -40), t0: now, sz: rnd(3, 6), rot: 0, vr: rnd(-8, 8), ground: innerHeight - 8 }); }
      c.save(); c.globalAlpha = fade; c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
      c.font = "900 30px Poppins, Inter, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineJoin = "round"; c.lineWidth = 7; c.strokeStyle = "#0b2a55"; c.strokeText(p.ch, 0, 0);
      var g = c.createLinearGradient(0, -15, 0, 15); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#8fe3ff");
      c.fillStyle = g; c.fillText(p.ch, 0, 0);
      c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(-6, -8, 2.2, 0, 7); c.fill();
      c.restore();
      return true;
    });
  }
  function bstate(cv) { return cv.__b || (cv.__b = { x: 0, face: 1, act: null, wob: 0, next: performance.now() / 1000 + rnd(2, 4), last: "", seen: performance.now() / 1000 }); }
  function play(el, name) {
    if (reduce || !el || !ACT[name]) return false;
    var cv = el.querySelector ? el.querySelector(".pa-bear") : null; if (!cv) return false;
    var B = bstate(cv);
    if (B.act && B.act.name === "fall") return false;
    if (B.act && name !== "fall" && B.act.name !== "wander" && B.act.name !== "look") return false;
    B.act = { name: name, t0: performance.now() / 1000 }; B.flipped = 0; B.landed = 0; B.lastFlip = -1; B.last = name;
    if (name === "push") B.act.pushX = pushTarget(cv);
    return true;
  }
  function pushTarget(cv) {   // where the bear must stand so its paws touch the social button
    var btn = document.querySelector("#iu-social .sd-btn"), mv = cv.parentNode;
    if (!btn) return 0;
    var r = btn.getBoundingClientRect(), m = mv.getBoundingClientRect(), mx = m.left + m.width / 2 - (mv.__tx || 0);
    return Math.max(-20, Math.min(60, r.left + 6 - (mx + 80 * (cv.__scale || .43))));
  }
  /* the "brain": picks what to do next on its own, never repeats the same thing twice in a row */
  var CHOICES = [["wander", 3], ["look", 2.2], ["dance", 1.6], ["stretch", 1.4], ["wave", 1.4], ["hello", 1.2], ["push", 1.5], ["spin", 1], ["nap", .6], ["spew", 1.3], ["rain", 1.4]];
  function think(cv, B, now) {
    if (document.documentElement.getAttribute("data-bear-idle") === "off") return;
    var bored = now - B.seen > 40, list = CHOICES.filter(function (c) { return c[0] !== B.last; }).map(function (c) {
      var w = c[1]; if (c[0] === "nap") w *= bored ? 5 : 1; if (c[0] === "push" && B.x < -60) w *= .5; return [c[0], w]; });
    var sum = list.reduce(function (s, c) { return s + c[1]; }, 0), r = Math.random() * sum;
    for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) { play(cv.closest(".pa-launch"), list[i][0]); break; } }
  }
  function drawBearCanvas(cv, now, opts) {
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var isLaunch = !!cv.closest(".pa-launch"), standPx = isLaunch ? 64 : h * .86;
    cv.__scale = standPx / STAND;
    var B = bstate(cv), dt = Math.min(.1, now - (B.tPrev || now)); B.tPrev = now; B.cv = cv;
    // ---- base "alive" motion: breathing, swaying, weight shifts, fidgets (never stands still)
    var br = Math.sin(now * TAU / 2.4), sway = Math.sin(now * TAU / 4.1), shift = Math.sin(now * TAU / 6.3 + 1);
    var P = { sheet: "happy", f: 0, sx: 1 - .012 * br, sy: 1 + .022 * br, rot: .035 * sway, dx: 2.5 * shift, ty: -1.2 * Math.max(0, br) };
    var fid = (now % 7.3) / 7.3; if (fid > .82 && fid < .9) P.f = 1;          // little arm fidget
    if (opts && opts.happy) { P.f = [0, 3, 4, 5, 4, 3][Math.floor(now * 6) % 6]; P.ty = -5 * Math.abs(Math.sin(now * 5)); }
    // ---- scroll physics: scrolling speed lifts the bear off the ground; when scrolling stops it falls back down
    var air = 0;
    if (isLaunch && !reduce) {
      var sinceScroll = now - (B.lastScroll || 0);
      var want = sinceScroll < .12 ? (B.svRaw || 0) : 0;            // scroll speed, smoothed so the rise is never jerky
      B.sv = (B.sv || 0) + (want - (B.sv || 0)) * Math.min(1, dt * (want > (B.sv || 0) ? 5 : 3));
      var sky = window.innerHeight + 160, target = Math.min(sky, Math.max(0, (B.sv || 0) - 120) * .5);
      B.h = B.h || 0; B.vh = B.vh || 0;
      if (target > B.h + 1 || (B.vh > 0 && B.h < target + 40)) {     // rising: soft spring toward the target height
        B.vh += (34 * (target - B.h) - 11.6 * B.vh) * dt; B.h = Math.max(0, B.h + B.vh * dt);
        if (B.h > window.innerHeight + 40) B.gone = 1; }
      else if (B.h > 0) {
        if (B.gone) { B.gone = 0; B.h = sky; }
        B.vh -= 2400 * dt; B.h += B.vh * dt;
        if (B.h <= 0) { var hit = -B.vh; B.h = 0; B.vh = 0; B.act = null;
          if (hit > 1100) { B.act = { name: "crash", t0: now }; B.wob = 1.4; } else if (hit > 250) { B.act = { name: "bump", t0: now }; B.wob = .9; } else B.wob = .4; }
      }
      if (B.gone) B.h = Math.max(B.h, sky);
      if (B.h > 1) { air = B.h; if (B.act) B.act = null; }
    }
    if (B.act) {
      var r = ACT[B.act.name](now - B.act.t0, B, B.act);
      if (!r) { B.act = null; B.next = now + rnd(1.2, 3.6); }
      else { P.sheet = r.sheet; P.f = r.f; P.flip = r.flip; P.push = r.push; P.shove = r.shove; P.noShadow = r.noShadow;
        P.sx *= (r.sx || 1); P.sy *= (r.sy || 1); P.rot = (r.rot || 0) + P.rot * .4; P.ty = (r.ty || 0) + P.ty * .5; P.dx *= .3; }
    } else if (isLaunch && !reduce && now > B.next && !root.classList.contains("open")) think(cv, B, now);
    if (air) {
      var seq = [0, 1, 2, 3, 4, 3, 2, 1], ph = now * 4.5, i0 = Math.floor(ph), fr = ph - i0, lift = Math.min(1, air / 34);
      if (lift < 1) { P.blend = { sheet: P.sheet, f: P.f, a: 1 - lift }; }      // feet leave the ground gradually
      P.sheet = "fall"; P.f = seq[i0 % 8]; P.f2 = seq[(i0 + 1) % 8]; P.mix = fr * fr * (3 - 2 * fr);
      P.ty = -air; P.noShadow = air > 60; P.rot = .08 * Math.sin(now * 2.6) * lift; P.sx = P.sy = 1; P.dx *= (1 - lift);
    }
    if (P.flip === undefined) P.flip = B.face < 0;
    // ---- skin/fur jiggle after landings and big moves (decays)
    B.wob = Math.max(0, (B.wob || 0) - dt * 1.6);
    var jig = B.wob * Math.sin(now * 26); P.sx *= 1 + .06 * jig; P.sy *= 1 - .06 * jig;
    if (isLaunch) {
      document.documentElement.classList.toggle("iu-bear-push", !!P.push);
      document.documentElement.classList.toggle("iu-bear-shove", !!P.shove);
      var mv = cv.parentNode, tx = B.x + (P.dx || 0);
      mv.__tx = tx;
      mv.style.transform = "translate(" + tx.toFixed(1) + "px," + (P.ty || 0).toFixed(1) + "px)";
    }
    var S = SH[P.sheet]; if (!S || !S.img.complete || !S.img.naturalWidth) return;
    var c = cv.getContext("2d"), k = cv.__scale * dpr;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    if (!P.noShadow) { var lift = Math.min(1, Math.max(0, -(P.ty || 0)) / 30); c.fillStyle = "rgba(0,0,0," + (.22 * (1 - lift)) + ")"; c.beginPath(); c.ellipse(W / 2 - (isLaunch ? 0 : 0), H - 3 * dpr - (P.ty || 0) * dpr * (isLaunch ? -1 : 0), 42 * k * (1 - .4 * lift), 6 * k, 0, 0, 7); c.fill(); }
    c.translate(W / 2, H - 2 * dpr);
    c.rotate(P.rot || 0); c.scale((P.flip ? -1 : 1) * (P.sx || 1), P.sy || 1);
    var draw1 = function (Sx, f, a) { if (a <= .01 || !Sx || !Sx.img.complete) return; c.globalAlpha = a; c.drawImage(Sx.img, f * Sx.w, 0, Sx.w, Sx.h, -Sx.ax * k, -Sx.ay * k, Sx.w * k, Sx.h * k); };
    var main = P.blend ? 1 - P.blend.a : 1;
    if (P.blend) draw1(SH[P.blend.sheet], P.blend.f, P.blend.a);
    if (P.f2 !== undefined && P.f2 !== P.f) { draw1(S, P.f, main * (1 - P.mix)); draw1(S, P.f2, main * P.mix); }
    else draw1(S, P.f, main);
    c.globalAlpha = 1;
  }
  var fxPrev = 0;
  function bearLoop() {
    var now = performance.now() / 1000;
    fxDraw(now, Math.min(.05, now - (fxPrev || now))); fxPrev = now;
    if (!document.hidden) {
      var list = root.querySelectorAll(".pa-bear:not(.pa-bear-mini)");
      for (var i = 0; i < list.length; i++) {
        var inHead = list[i].closest(".pa-head");
        if (inHead && !root.classList.contains("open")) continue;
        if (!inHead && root.classList.contains("open")) continue;
        drawBearCanvas(list[i], now, { happy: inHead && root.classList.contains("thinking") });
      }
      var minis = root.querySelectorAll(".pa-bear-mini:not([data-done])");
      for (var j = 0; j < minis.length; j++) { var ok = SH.happy.img.complete; drawBearCanvas(minis[j], 0, null); if (ok && minis[j].clientWidth) minis[j].setAttribute("data-done", "1"); }
    }
    if (!reduce) requestAnimationFrame(bearLoop); else setTimeout(bearLoop, 500);
  }
  /* scrolling down lifts the bear off the ground — the faster you scroll, the higher it goes; scroll fast enough and it
     disappears off the top, then falls from the sky when you stop */
  (function () {
    if (reduce) return;
    var lastY = window.scrollY, lastT = performance.now() / 1000;
    window.addEventListener("scroll", function () {
      var y = window.scrollY, now = performance.now() / 1000, dy = y - lastY, dt = Math.max(.008, now - lastT);
      lastY = y; lastT = now;
      var cv = document.querySelector("#iu-assistant .pa-launch .pa-bear"); if (!cv || root.classList.contains("open")) return;
      var B = bstate(cv);
      if (dy <= 0) return;
      var v = Math.min(9000, dy / dt);
      B.svRaw = (B.svRaw && now - (B.lastScroll || 0) < .15) ? B.svRaw * .7 + v * .3 : v;
      B.lastScroll = now;
    }, { passive: true });
    // it notices you: wave when the mouse comes close
    var lastSeen = 0;
    document.addEventListener("pointermove", function (e) {
      var cv = document.querySelector("#iu-assistant .pa-launch .pa-bear"); if (!cv) return;
      var B = bstate(cv), now = performance.now() / 1000; B.seen = now;
      var r = cv.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d < 170 && now - lastSeen > 9 && (!B.act || B.act.name === "wander" || B.act.name === "look")) {
        lastSeen = now; B.face = e.clientX < r.left + r.width / 2 ? -1 : 1; B.act = null;
        play(cv.closest(".pa-launch"), Math.random() < .6 ? "wave" : "hello");
      }
    }, { passive: true });
  })();
  var root = document.createElement("div");
  root.className = "pa"; root.id = "iu-assistant";
  root.innerHTML =
    '<button type="button" class="pa-launch" aria-label="Open website assistant" aria-expanded="false" aria-controls="paPanel">' + pengHTML() + "</button>" +
    '<div class="pa-tip" role="status"><span>' + esc(CFG.invite) + '</span><button type="button" aria-label="Dismiss">✕</button></div>' +
    '<section class="pa-panel" id="paPanel" role="dialog" aria-modal="false" aria-labelledby="paTitle">' +
      '<header class="pa-head"><span class="pa-av">' + pengHTML() + '</span><div class="pa-t"><b id="paTitle">' + esc(CFG.title) + "</b><small><i></i>Trading basics · site help · questions</small></div>" +
        '<button type="button" class="pa-clear" aria-label="Start a new chat" title="New chat">↺</button>' +
        '<button type="button" class="pa-x" aria-label="Minimise assistant">✕</button></header>' +
      '<div class="pa-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="pa-quick" aria-label="Suggested questions"></div>' +
      '<form class="pa-form" autocomplete="off"><label class="pa-sr" for="paIn">Type your question</label>' +
        '<textarea id="paIn" rows="1" maxlength="' + CFG.maxLen + '" placeholder="Ask me anything…"></textarea>' +
        '<button type="submit" class="pa-send" aria-label="Send" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg></button></form>' +
      '<div class="pa-foot">Education only, not financial advice. No live prices here.</div>' +
    "</section>";

  var $ = function (s) { return root.querySelector(s); };
  var launch = $(".pa-launch"), tip = $(".pa-tip"), panel = $(".pa-panel"), log = $(".pa-log"), quick = $(".pa-quick"),
      form = $(".pa-form"), input = $("#paIn"), send = $(".pa-send");
  var headAv = $(".pa-av");
  var history = [];
  try { history = JSON.parse(ss(KEY_LOG) || "[]") || []; } catch (e) { history = []; }
  var busy = false;

  function save() { ss(KEY_LOG, JSON.stringify(history.slice(-30))); }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function bubble(m, opts) {
    opts = opts || {};
    var row = document.createElement("div");
    row.className = "pa-msg" + (m.r === "me" ? " me" : "");
    var inner = m.r === "me" ? "<p>" + esc(m.t) + "</p>" : md(m.t) + actsHtml(m.a);
    if (m.err) inner += '<button type="button" class="pa-retry">Try again</button>';
    row.innerHTML = (m.r === "me" ? "" : '<span class="pa-mini">' + pengMini() + "</span>") + '<div class="pa-b">' + inner + "</div>";
    log.appendChild(row);
    if (!opts.noScroll) scroll();
    return row;
  }
  function renderAll() {
    log.innerHTML = "";
    bubble({ r: "bot", t: CFG.welcome }, { noScroll: true });
    history.forEach(function (m) { bubble(m, { noScroll: true }); });
    quick.hidden = history.length > 0;
    scroll();
  }
  function renderQuick() {
    quick.innerHTML = CFG.prompts.map(function (p) { return '<button type="button">' + esc(p) + "</button>"; }).join("");
  }
  function thinking(on) {
    root.classList.toggle("thinking", on);
    var t = log.querySelector(".pa-think");
    if (on && !t) {
      t = document.createElement("div"); t.className = "pa-msg pa-think";
      t.innerHTML = '<span class="pa-mini">' + pengMini() + '</span><div class="pa-b" aria-label="Thinking"><i></i><i></i><i></i></div>';
      log.appendChild(t); scroll();
    } else if (!on && t) t.remove();
  }
  function push(m) { history.push(m); save(); bubble(m); }

  function reply(q) {
    // 1) live data / signals → channels (always local, instant)
    if (isLive(q)) { var lr = liveReply(); return Promise.resolve({ t: lr.t, a: lr.acts }); }
    // 2) known topic → instant local answer
    var hit = match(q);
    if (hit && (hit.score >= 2 || !CFG.endpoint)) {
      var e = hit.e; return Promise.resolve({ t: typeof e.t === "function" ? e.t() : e.t, a: e.acts });
    }
    // 3) anything else → AI server, if configured
    if (!CFG.endpoint) {
      return Promise.resolve({ t: "I can't answer general questions just yet. My full answers are still being set up.\n\nRight now I can help with **trading basics** (pips, leverage, stop-loss, support & resistance…), **finding things on this site**, and **how to join the community**. Try one of those!" });
    }
    var n = +(ss(KEY_COUNT) || 0);
    if (n >= CFG.maxPerSession) return Promise.resolve({ t: "You've reached the question limit for this session. Please come back a bit later, or ask in the community channels.", a: ["channels"] });
    ss(KEY_COUNT, String(n + 1));
    return askAI(history).then(function (txt) {
      var acts = [];
      if (/\[\[CHANNELS\]\]/.test(txt)) { txt = txt.replace(/\s*\[\[CHANNELS\]\]\s*/g, "\n"); acts.push("channels"); }
      return { t: txt.trim(), a: acts };
    });
  }

  function ask(q, isRetry) {
    q = String(q || "").trim().slice(0, CFG.maxLen);
    if (!q || busy) return;
    quick.hidden = true;
    if (!isRetry) push({ r: "me", t: q });
    busy = true; send.disabled = true; thinking(true);
    var started = Date.now();
    reply(q).then(function (res) {
      var wait = Math.max(0, (reduce ? 0 : 450) - (Date.now() - started));
      setTimeout(function () { thinking(false); push({ r: "bot", t: res.t, a: res.a }); play(headAv, "wave"); done(); }, wait);
    }, function (err) {
      thinking(false);
      var offline = !navigator.onLine, msg;
      if (offline) msg = "You seem to be offline. Check your connection and try again.";
      else if (err && err.status === 429) msg = "Lots of questions right now. Please wait a minute and try again.";
      else if (err && err.status === 503) msg = "My full answers aren't switched on yet. Ask me about trading basics or the site in the meantime.";
      else msg = "Sorry, I couldn't get an answer just now. Please try again.";
      var row = bubble({ r: "bot", t: msg, err: true });
      var b = row.querySelector(".pa-retry");
      if (b) b.addEventListener("click", function () { row.remove(); ask(q, true); });
      done();
    });
    function done() { busy = false; send.disabled = !input.value.trim(); }
  }

  /* open / close */
  var lastFocus = null;
  function isMobile() { return matchMedia("(max-width:560px)").matches; }
  function open() {
    if (root.classList.contains("open")) return;
    lastFocus = document.activeElement;
    hideTip(true);
    root.classList.add("open"); launch.setAttribute("aria-expanded", "true"); document.documentElement.classList.add("pa-open");
    if (isMobile()) document.documentElement.classList.add("pa-lock");
    if (!log.childElementCount) { renderQuick(); renderAll(); }
    setTimeout(function () { play(headAv, "wave"); }, 200);
    setTimeout(function () { if (!isMobile()) input.focus(); else panel.focus && panel.setAttribute("tabindex", "-1"); }, 60);
    track("assistant-open");
  }
  function close() {
    root.classList.remove("open"); launch.setAttribute("aria-expanded", "false"); document.documentElement.classList.remove("pa-open");
    document.documentElement.classList.remove("pa-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus(); else launch.focus();
  }
  function track(name) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "click-" + name, title: name, event: true }); if (window.gtag) window.gtag("event", "click", { button: name }); } catch (e) {} }

  /* one-time invitation */
  var tipTimer;
  function hideTip(forever) { tip.classList.remove("show"); clearTimeout(tipTimer); if (forever) ls(KEY_SEEN, "1"); }
  function maybeTip() {
    if (ls(KEY_SEEN)) return;
    tipTimer = setTimeout(function () {
      if (root.classList.contains("open")) return;
      tip.classList.add("show"); ls(KEY_SEEN, "1");
      tipTimer = setTimeout(function () { tip.classList.remove("show"); }, 7000);
    }, 6000);
  }

  /* events */
  launch.addEventListener("click", open);
  tip.addEventListener("click", function (e) { if (e.target.closest("button")) { hideTip(true); return; } open(); });
  $(".pa-x").addEventListener("click", close);
  $(".pa-clear").addEventListener("click", function () { history = []; save(); ss(KEY_COUNT, ss(KEY_COUNT) || "0"); renderAll(); input.focus(); });
  root.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("open")) { e.stopPropagation(); close(); } });
  quick.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) ask(b.textContent); });
  log.addEventListener("click", function (e) {
    var g = e.target.closest("[data-go]"); if (!g) return;
    var el = document.querySelector(g.getAttribute("data-go")); if (!el) return;
    if (isMobile()) close();
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });
  input.addEventListener("input", function () {
    send.disabled = busy || !input.value.trim();
    input.style.height = "auto"; input.style.height = Math.min(110, input.scrollHeight) + "px";
  });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });
  form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value; if (!q.trim() || busy) return; /* text stays in the box while busy */ input.value = ""; input.style.height = ""; send.disabled = true; ask(q); });

  /* mount after the intro animation, so it never sits on top of it */
  function mount() {
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add("ready"); });
    maybeTip();
    bearLoop();
    setTimeout(function () { play(launch, "wave"); }, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  // tiny public API: window.IceAssistant.open() / .ask("text")
  window.IceAssistant = { open: open, close: close, ask: function (q) { open(); ask(q); }, move: function (m) { var c = launch.querySelector(".pa-bear"); if (c) bstate(c).act = null; return play(launch, m); } };
})();
