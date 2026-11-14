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
  // the polar bear: the hand-drawn frames + computed in-between frames, a rigged walk cycle and a breathing idle loop
  // (assistant/bear-*.webp), a live gold chain with physics, and a little "brain" that picks what to do next
  function pengHTML() { return '<span class="pa-mv"><canvas class="pa-bear" aria-hidden="true"></canvas></span>'; }
  function pengMini() { return '<canvas class="pa-bear pa-bear-mini" aria-hidden="true"></canvas>'; }
  /*BEAR-DATA*/var BD = {"atlas":["bear-core.webp","bear-hello.webp","bear-push.webp","bear-fall.webp","bear-rain.webp"],"f":{"idle0":[0,1947,0,91,154,44,152,-17.6,-111.4,18.4,-110.8,1.1,-94.0],"idle1":[0,0,157,92,154,45,152,-17.4,-111.6,18.6,-111.0,1.3,-94.2],"idle2":[0,93,157,91,154,45,152,-17.2,-111.8,18.8,-111.1,1.5,-94.4],"idle3":[0,185,157,91,154,45,152,-17.0,-111.9,19.0,-111.1,1.7,-94.5],"idle4":[0,277,157,91,154,45,152,-16.9,-111.9,19.1,-111.1,1.9,-94.5],"idle5":[0,369,157,91,154,45,152,-16.8,-111.8,19.2,-111.1,2.0,-94.4],"idle6":[0,461,157,90,154,45,152,-16.8,-111.6,19.2,-111.0,2.1,-94.3],"idle7":[0,552,157,91,154,46,152,-16.8,-111.4,19.2,-110.8,2.1,-94.2],"idle8":[0,644,157,91,154,46,152,-16.8,-111.1,19.2,-110.6,2.1,-94.0],"idle9":[0,984,312,91,153,46,151,-16.9,-110.8,19.1,-110.5,2.1,-93.8],"idle10":[0,1076,312,91,153,46,151,-17.0,-110.6,19.0,-110.4,2.0,-93.6],"idle11":[0,1168,312,91,153,46,151,-17.1,-110.5,18.8,-110.4,1.9,-93.5],"idle12":[0,736,157,91,154,46,152,-17.3,-110.5,18.7,-110.4,1.7,-93.5],"idle13":[0,828,157,90,154,46,152,-17.5,-110.5,18.5,-110.5,1.6,-93.5],"idle14":[0,919,157,91,154,46,152,-17.7,-110.7,18.3,-110.7,1.4,-93.7],"idle15":[0,1011,157,91,154,46,152,-17.9,-110.8,18.1,-111.0,1.2,-93.8],"idle16":[0,1103,157,91,154,46,152,-18.2,-111.0,17.8,-111.2,0.9,-94.0],"idle17":[0,1195,157,91,154,46,152,-18.4,-111.2,17.6,-111.5,0.7,-94.2],"idle18":[0,474,0,91,155,46,153,-18.6,-111.3,17.4,-111.7,0.5,-94.4],"idle19":[0,566,0,91,155,46,153,-18.9,-111.3,17.1,-111.8,0.3,-94.5],"idle20":[0,658,0,92,155,46,153,-19.1,-111.3,16.9,-111.9,0.1,-94.5],"idle21":[0,751,0,91,155,45,153,-19.2,-111.2,16.8,-111.8,-0.0,-94.5],"idle22":[0,843,0,91,155,45,153,-19.3,-111.0,16.7,-111.7,-0.1,-94.3],"idle23":[0,1287,157,91,154,45,152,-19.4,-110.7,16.6,-111.5,-0.2,-94.2],"idle24":[0,1379,157,91,154,45,152,-19.4,-110.5,16.6,-111.3,-0.2,-94.0],"idle25":[0,1471,157,92,154,45,152,-19.3,-110.3,16.7,-111.0,-0.1,-93.8],"idle26":[0,1564,157,92,154,45,152,-19.2,-110.2,16.8,-110.8,-0.0,-93.6],"idle27":[0,1657,157,91,154,44,152,-19.0,-110.2,17.0,-110.7,0.1,-93.5],"idle28":[0,1749,157,91,154,44,152,-18.7,-110.3,17.2,-110.6,0.2,-93.5],"idle29":[0,1841,157,91,154,44,152,-18.5,-110.5,17.5,-110.6,0.4,-93.5],"idle30":[0,1933,157,91,154,44,152,-18.2,-110.8,17.8,-110.6,0.7,-93.7],"idle31":[0,0,312,91,154,44,152,-17.9,-111.1,18.1,-110.7,0.9,-93.8],"rw0":[0,1739,467,87,140,40,137,-10.3,-100.8,25.5,-95.5,12.0,-83.0],"rw1":[0,1552,467,87,141,40,138,-10.5,-102.0,25.4,-96.7,11.9,-84.2],"rw2":[0,1363,467,87,143,40,140,-10.9,-104.1,25.0,-99.1,11.6,-86.5],"rw3":[0,995,467,86,145,40,142,-11.3,-105.5,24.6,-100.7,11.3,-88.0],"rw4":[0,816,467,86,146,40,144,-11.7,-106.4,24.2,-101.8,11.0,-89.0],"rw5":[0,283,467,87,148,40,146,-11.9,-106.9,24.1,-102.4,10.9,-89.6],"rw6":[0,107,467,88,149,40,147,-11.7,-106.9,24.2,-102.2,11.0,-89.5],"rw7":[0,371,467,90,148,40,146,-11.3,-106.3,24.6,-101.5,11.3,-88.8],"rw8":[0,636,467,92,147,41,144,-10.9,-105.4,25.0,-100.4,11.6,-87.8],"rw9":[0,1082,467,94,145,43,142,-10.5,-104.4,25.4,-99.1,11.9,-86.6],"rw10":[0,1827,467,96,140,44,137,-10.3,-100.8,25.5,-95.5,12.0,-83.0],"rw11":[0,1640,467,98,141,47,138,-10.5,-102.0,25.4,-96.7,11.9,-84.2],"rw12":[0,1451,467,100,143,49,140,-10.9,-104.1,25.0,-99.1,11.6,-86.5],"rw13":[0,1177,467,97,145,47,142,-11.3,-105.5,24.6,-100.7,11.3,-88.0],"rw14":[0,903,467,91,146,43,144,-11.7,-106.4,24.2,-101.8,11.0,-89.0],"rw15":[0,462,467,87,148,40,146,-11.9,-106.9,24.1,-102.4,10.9,-89.6],"rw16":[0,196,467,86,149,40,147,-11.7,-106.9,24.2,-102.2,11.0,-89.5],"rw17":[0,550,467,85,148,40,146,-11.3,-106.3,24.6,-101.5,11.3,-88.8],"rw18":[0,729,467,86,147,40,144,-10.9,-105.4,25.0,-100.4,11.6,-87.8],"rw19":[0,1275,467,87,145,40,142,-10.5,-104.4,25.4,-99.1,11.9,-86.6],"happy0":[0,1260,312,90,153,45,151,-18.0,-111.0,18.0,-111.0,1.0,-94.0],"happy1":[0,1351,312,103,153,54,151,-18.0,-111.0,17.0,-111.0,0.0,-94.0],"happy2":[0,935,0,105,155,47,153,-18.0,-110.0,16.0,-111.0,-1.0,-94.0],"happy3":[0,1041,0,114,155,56,153,-18.0,-110.0,16.0,-111.0,-1.0,-94.0],"happy4":[0,0,0,114,156,58,155,-20.0,-113.0,14.0,-113.0,-3.0,-97.0],"happy5":[0,115,0,119,156,61,155,-21.0,-112.0,13.0,-112.0,-4.0,-96.0],"happy6":[0,92,312,106,154,51,153,-19.0,-113.0,14.0,-113.0,-3.0,-97.0],"happy7":[0,1455,312,88,153,45,152,-18.0,-111.0,17.0,-111.0,0.0,-94.0],"happy0-1.1":[0,1544,312,100,153,54,151,-18.0,-111.0,17.7,-111.0,0.7,-94.0],"happy0-1.2":[0,1645,312,101,153,54,151,-18.0,-111.0,17.3,-111.0,0.3,-94.0],"happy1-2.1":[0,199,312,112,154,54,152,-18.0,-110.7,16.7,-111.0,-0.3,-94.0],"happy1-2.2":[0,312,312,112,154,54,152,-18.0,-110.3,16.3,-111.0,-0.7,-94.0],"happy2-3.1":[0,1156,0,108,155,50,153,-18.0,-110.0,16.0,-111.0,-1.0,-94.0],"happy2-3.2":[0,1265,0,111,155,53,153,-18.0,-110.0,16.0,-111.0,-1.0,-94.0],"happy3-4.1":[0,425,312,116,154,58,153,-18.7,-111.0,15.3,-111.7,-1.7,-95.0],"happy3-4.2":[0,1377,0,116,155,58,154,-19.3,-112.0,14.7,-112.3,-2.3,-96.0],"happy4-5.1":[0,235,0,118,156,61,155,-20.3,-112.7,13.7,-112.7,-3.3,-96.7],"happy4-5.2":[0,354,0,119,156,61,155,-20.7,-112.3,13.3,-112.3,-3.7,-96.3],"happy5-6.1":[0,1494,0,119,155,61,154,-20.3,-112.3,13.3,-112.3,-3.7,-96.3],"happy5-6.2":[0,542,312,118,154,61,153,-19.7,-112.7,13.7,-112.7,-3.3,-96.7],"happy6-7.1":[0,661,312,103,154,48,153,-18.7,-112.3,15.0,-112.3,-2.0,-96.0],"happy6-7.2":[0,765,312,101,154,46,153,-18.3,-111.7,16.0,-111.7,-1.0,-95.0],"happy7-0.1":[0,1747,312,89,153,45,152,-18.0,-111.0,17.3,-111.0,0.3,-94.0],"happy7-0.2":[0,1837,312,89,153,45,152,-18.0,-111.0,17.7,-111.0,0.7,-94.0],"happy0-2.1":[0,1927,312,104,152,46,150,-18.0,-110.7,17.3,-111.0,0.3,-94.0],"happy0-2.2":[0,1614,0,104,155,46,153,-18.0,-110.3,16.7,-111.0,-0.3,-94.0],"happy2-4.1":[0,867,312,116,154,58,153,-18.7,-111.0,15.3,-111.7,-1.7,-95.0],"happy2-4.2":[0,1719,0,116,155,58,154,-19.3,-112.0,14.7,-112.3,-2.3,-96.0],"happy0-3.1":[0,0,467,106,152,48,150,-18.0,-110.7,17.3,-111.0,0.3,-94.0],"happy0-3.2":[0,1836,0,110,155,52,153,-18.0,-110.3,16.7,-111.0,-0.3,-94.0],"hello0":[1,1120,0,90,153,45,151,-23.0,-109.0,18.0,-107.0,2.0,-93.0],"hello1":[1,888,0,116,154,64,153,-21.0,-110.0,18.0,-108.0,3.0,-95.0],"hello2":[1,283,0,130,157,53,157,-23.0,-110.0,16.0,-108.0,1.0,-94.0],"hello3":[1,756,310,140,126,90,126,3.0,-95.0,32.0,-83.0,20.0,-69.0],"hello4":[1,0,159,142,150,74,150,-13.0,-112.0,31.0,-111.0,13.0,-95.0],"hello5":[1,697,159,127,148,65,157,-11.0,-119.0,25.0,-119.0,8.0,-103.0],"hello6":[1,301,310,165,137,83,157,-15.0,-115.0,27.0,-115.0,5.0,-99.0],"hello7":[1,166,310,134,138,74,140,-23.0,-97.0,19.0,-97.0,-2.0,-83.0],"hello8":[1,237,159,165,149,86,150,-19.0,-107.0,23.0,-107.0,2.0,-92.0],"hello9":[1,1451,159,127,146,65,148,-23.0,-106.0,22.0,-107.0,0.0,-91.0],"hello10":[1,143,159,93,150,49,151,-27.0,-109.0,17.0,-107.0,-1.0,-93.0],"hello0-1.1":[1,1211,0,112,153,64,151,-22.3,-109.3,18.0,-107.3,2.3,-93.7],"hello0-1.2":[1,1005,0,114,154,64,152,-21.7,-109.7,18.0,-107.7,2.7,-94.3],"hello1-2.1":[1,0,0,140,158,64,157,-21.7,-110.0,17.3,-108.0,2.3,-94.7],"hello1-2.2":[1,141,0,141,158,64,157,-22.3,-110.0,16.7,-108.0,1.7,-94.3],"hello2-3.1":[1,414,0,167,157,90,157,-14.3,-105.0,21.3,-99.7,7.3,-85.7],"hello2-3.2":[1,582,0,166,157,90,157,-5.7,-100.0,26.7,-91.3,13.7,-77.3],"hello3-4.1":[1,467,310,146,134,90,134,-2.3,-100.7,31.7,-92.3,17.7,-77.7],"hello3-4.2":[1,1887,159,152,142,90,142,-7.7,-106.3,31.3,-101.7,15.3,-86.3],"hello4-5.1":[1,1324,0,140,153,74,153,-12.3,-114.3,29.0,-113.7,11.3,-97.7],"hello4-5.2":[1,749,0,138,155,74,155,-11.7,-116.7,27.0,-116.3,9.7,-100.3],"hello5-6.1":[1,825,159,165,148,83,157,-12.3,-117.7,25.7,-117.7,7.0,-101.7],"hello5-6.2":[1,991,159,165,148,83,157,-13.7,-116.3,26.3,-116.3,6.0,-100.3],"hello6-7.1":[1,1465,0,165,153,83,157,-17.7,-109.0,24.3,-109.0,2.7,-93.7],"hello6-7.2":[1,1631,0,165,153,83,157,-20.3,-103.0,21.7,-103.0,0.3,-88.3],"hello7-8.1":[1,0,310,165,142,86,144,-21.7,-100.3,20.3,-100.3,-0.7,-86.0],"hello7-8.2":[1,1579,159,165,145,86,147,-20.3,-103.7,21.7,-103.7,0.7,-89.0],"hello8-9.1":[1,403,159,165,149,86,150,-20.3,-106.7,22.7,-107.0,1.3,-91.7],"hello8-9.2":[1,1157,159,165,147,86,149,-21.7,-106.3,22.3,-107.0,0.7,-91.3],"hello9-10.1":[1,1323,159,127,147,65,149,-24.3,-107.0,20.3,-107.0,-0.3,-91.7],"hello9-10.2":[1,569,159,127,149,65,150,-25.7,-108.0,18.7,-107.0,-0.7,-92.3],"hello10-0.1":[1,1890,0,92,151,48,151,-25.7,-109.0,17.3,-107.0,0.0,-93.0],"hello10-0.2":[1,1797,0,92,152,47,151,-24.3,-109.0,17.7,-107.0,1.0,-93.0],"hello1-3.1":[1,1745,159,141,145,90,144,-13.0,-105.0,22.7,-99.7,8.7,-86.3],"hello1-3.2":[1,614,310,141,134,90,134,-5.0,-100.0,27.3,-91.3,14.3,-77.7],"push2":[2,621,0,162,142,80,141,-17.0,-97.0,27.0,-96.0,12.0,-80.0],"push3":[2,1264,151,179,128,92,129,-13.0,-91.0,29.0,-84.0,11.0,-70.0],"push4":[2,1444,151,185,127,93,133,-5.0,-94.0,38.0,-87.0,20.0,-73.0],"push5":[2,369,288,184,126,93,133,1.0,-94.0,44.0,-87.0,26.0,-73.0],"push6":[2,920,288,182,125,93,133,2.0,-94.0,45.0,-87.0,27.0,-73.0],"push7":[2,1103,288,182,125,93,133,2.0,-94.0,45.0,-87.0,27.0,-73.0],"push8":[2,545,151,170,135,93,144,-13.0,-96.0,28.0,-94.0,13.0,-78.0],"push9":[2,1673,0,174,137,82,145,-25.0,-101.0,21.0,-99.0,5.0,-83.0],"push10":[2,489,0,131,144,58,149,-18.0,-106.0,26.0,-106.0,4.0,-90.0],"push11":[2,0,0,162,150,82,154,-18.0,-106.0,26.0,-106.0,4.0,-91.0],"push2-3.1":[2,1134,0,166,138,84,137,-15.7,-95.0,27.7,-92.0,11.7,-76.7],"push2-3.2":[2,716,151,175,134,88,133,-14.3,-93.0,28.3,-88.0,11.3,-73.3],"push3-4.1":[2,1078,151,185,129,93,130,-10.3,-92.0,32.0,-85.0,14.0,-71.0],"push3-4.2":[2,892,151,185,131,93,132,-7.7,-93.0,35.0,-86.0,17.0,-72.0],"push4-5.1":[2,1630,151,185,127,93,133,-3.0,-94.0,40.0,-87.0,22.0,-73.0],"push4-5.2":[2,1816,151,185,127,93,133,-1.0,-94.0,42.0,-87.0,24.0,-73.0],"push5-6.1":[2,0,288,184,127,93,134,1.3,-94.0,44.3,-87.0,26.3,-73.0],"push5-6.2":[2,185,288,183,127,93,134,1.7,-94.0,44.7,-87.0,26.7,-73.0],"push6-7.1":[2,554,288,182,126,93,134,2.0,-94.0,45.0,-87.0,27.0,-73.0],"push6-7.2":[2,737,288,182,126,93,134,2.0,-94.0,45.0,-87.0,27.0,-73.0],"push7-8.1":[2,1848,0,182,136,93,144,-3.0,-94.7,39.3,-89.3,22.3,-74.7],"push7-8.2":[2,0,151,182,136,93,144,-8.0,-95.3,33.7,-91.7,17.7,-76.3],"push8-4.1":[2,1301,0,185,138,93,144,-10.3,-95.3,31.3,-91.7,15.3,-76.3],"push8-4.2":[2,1487,0,185,138,93,144,-7.7,-94.7,34.7,-89.3,17.7,-74.7],"push8-9.1":[2,183,151,181,136,89,144,-17.0,-97.7,25.7,-95.7,10.3,-79.7],"push8-9.2":[2,365,151,179,136,87,144,-21.0,-99.3,23.3,-97.3,7.7,-81.3],"push9-10.1":[2,959,0,174,140,82,147,-22.7,-102.7,22.7,-101.3,4.7,-85.3],"push9-10.2":[2,784,0,174,142,82,148,-20.3,-104.3,24.3,-103.7,4.3,-87.7],"push10-11.1":[2,326,0,162,149,82,154,-18.0,-106.0,26.0,-106.0,4.0,-90.3],"push10-11.2":[2,163,0,162,150,82,154,-18.0,-106.0,26.0,-106.0,4.0,-90.7],"fall0":[3,771,0,84,125,42,124,-15.0,-94.0,15.0,-95.0,0.0,-80.0],"fall1":[3,325,0,91,126,45,124,-18.0,-95.0,12.0,-96.0,-3.0,-81.0],"fall2":[3,417,0,85,126,42,124,-17.0,-95.0,13.0,-96.0,-2.0,-81.0],"fall3":[3,856,0,85,125,42,124,-13.0,-95.0,16.0,-96.0,2.0,-81.0],"fall4":[3,942,0,103,125,51,124,-23.0,-93.0,7.0,-97.0,-6.0,-80.0],"fall5":[3,1872,0,87,83,43,94],"fall6":[3,409,152,109,66,51,69],"fall7":[3,997,152,127,46,65,48],"fall8":[3,110,152,112,76,61,84],"fall9":[3,1661,0,103,97,55,108,-14.0,-79.0,22.0,-78.0,5.0,-64.0],"fall10":[3,247,0,77,139,42,140,-17.0,-115.0,19.0,-115.0,1.0,-99.0],"fall11":[3,0,0,83,151,42,151,-19.0,-117.0,17.0,-117.0,-1.0,-101.0],"fall0-1.1":[3,1046,0,86,125,43,124,-16.0,-94.3,14.0,-95.3,-1.0,-80.3],"fall0-1.2":[3,503,0,89,126,44,124,-17.0,-94.7,13.0,-95.7,-2.0,-80.7],"fall1-2.1":[3,593,0,89,126,44,124,-17.7,-95.0,12.3,-96.0,-2.7,-81.0],"fall1-2.2":[3,683,0,87,126,43,124,-17.3,-95.0,12.7,-96.0,-2.3,-81.0],"fall2-3.1":[3,1133,0,86,125,43,124,-15.7,-95.0,14.0,-96.0,-0.7,-81.0],"fall2-3.2":[3,1220,0,84,125,42,124,-14.3,-95.0,15.0,-96.0,0.7,-81.0],"fall3-4.1":[3,1305,0,90,125,45,124,-16.3,-94.3,13.0,-96.3,-0.7,-80.7],"fall3-4.2":[3,1396,0,96,125,48,124,-19.7,-93.7,10.0,-96.7,-3.3,-80.3],"fall5-6.1":[3,223,152,88,75,43,84],"fall5-6.2":[3,312,152,96,68,44,75],"fall6-7.1":[3,636,152,115,57,56,61],"fall6-7.2":[3,875,152,121,50,61,53],"fall7-8.1":[3,752,152,122,56,64,60],"fall7-8.2":[3,519,152,116,66,62,72],"fall8-9.1":[3,0,152,109,83,59,92],"fall8-9.2":[3,1765,0,106,89,57,99],"fall9-10.1":[3,1571,0,89,110,48,118,-15.0,-91.0,21.0,-90.3,3.7,-75.7],"fall9-10.2":[3,1493,0,77,125,42,130,-16.0,-103.0,20.0,-102.7,2.3,-87.3],"fall10-11.1":[3,167,0,79,143,42,144,-17.7,-115.7,18.3,-115.7,0.3,-99.7],"fall10-11.2":[3,84,0,82,148,43,148,-18.3,-116.3,17.7,-116.3,-0.3,-100.3],"rain0":[4,1223,216,103,153,52,151,-23.0,-106.0,23.0,-106.0,1.0,-89.0],"rain1":[4,492,216,103,179,52,177,-21.0,-106.0,25.0,-106.0,3.0,-89.0],"rain2":[4,916,216,103,157,52,155,-23.0,-106.0,23.0,-106.0,1.0,-89.0],"rain3":[4,1739,216,101,147,50,146,-23.0,-106.0,23.0,-106.0,1.0,-89.0],"rain4":[4,1327,216,103,153,52,151,-23.0,-106.0,23.0,-106.0,1.0,-89.0],"rain5":[4,1431,216,103,153,52,151,-23.0,-106.0,23.0,-106.0,1.0,-89.0],"rain6":[4,1020,216,101,155,48,155,-23.0,-107.0,23.0,-107.0,1.0,-90.0],"rain7":[4,666,399,104,142,51,140,-23.0,-99.0,23.0,-99.0,1.0,-82.0],"rain8":[4,1841,216,143,147,68,149,-23.0,-101.0,25.0,-101.0,3.0,-84.0],"rain9":[4,771,399,142,142,66,144,-23.0,-102.0,23.0,-102.0,1.0,-85.0],"rain10":[4,166,216,159,181,80,181,-13.0,-114.0,31.0,-114.0,9.0,-98.0],"rain11":[4,1278,0,165,183,83,183,-23.0,-108.0,21.0,-108.0,-1.0,-92.0],"rain12":[4,326,216,165,180,83,180,-21.0,-110.0,23.0,-110.0,1.0,-94.0],"rain13":[4,970,0,141,199,66,201,-23.0,-102.0,25.0,-102.0,1.0,-85.0],"rain14":[4,0,0,106,215,50,214,-23.0,-96.0,23.0,-96.0,1.0,-80.0],"rain5-6.1":[4,1535,216,100,152,49,152,-23.0,-106.3,23.0,-106.3,1.0,-89.3],"rain5-6.2":[4,1122,216,100,154,48,154,-23.0,-106.7,23.0,-106.7,1.0,-89.7],"rain6-7.1":[4,1636,216,102,150,49,150,-23.0,-104.3,23.0,-104.3,1.0,-87.3],"rain6-7.2":[4,0,399,103,145,50,145,-23.0,-101.7,23.0,-101.7,1.0,-84.7],"rain7-8.1":[4,532,399,133,143,58,143,-23.0,-99.7,23.7,-99.7,1.7,-82.7],"rain7-8.2":[4,104,399,140,145,65,146,-23.0,-100.3,24.3,-100.3,2.3,-83.3],"rain8-9.1":[4,245,399,143,145,67,147,-23.0,-101.3,24.3,-101.3,2.3,-84.3],"rain8-9.2":[4,389,399,142,144,66,146,-23.0,-101.7,23.7,-101.7,1.7,-84.7],"rain9-10.1":[4,756,216,159,161,80,163,-19.7,-106.0,25.7,-106.0,3.7,-89.3],"rain9-10.2":[4,596,216,159,163,80,164,-16.3,-110.0,28.3,-110.0,6.3,-93.7],"rain10-11.1":[4,1776,0,165,182,83,183,-16.3,-112.0,27.7,-112.0,5.7,-96.0],"rain10-11.2":[4,1444,0,165,183,83,183,-19.7,-110.0,24.3,-110.0,2.3,-94.0],"rain11-12.1":[4,1610,0,165,183,83,183,-22.3,-108.7,21.7,-108.7,-0.3,-92.7],"rain11-12.2":[4,0,216,165,182,83,183,-21.7,-109.3,22.3,-109.3,0.3,-93.3],"rain12-13.1":[4,804,0,165,200,83,201,-21.7,-107.3,23.7,-107.3,1.0,-91.0],"rain12-13.2":[4,1112,0,165,199,83,201,-22.3,-104.7,24.3,-104.7,1.0,-88.0],"rain13-14.1":[4,107,0,135,215,60,214,-23.0,-100.0,24.3,-100.0,1.0,-83.3],"rain13-14.2":[4,243,0,133,215,58,214,-23.0,-98.0,23.7,-98.0,1.0,-81.7],"rain14-7.1":[4,377,0,106,215,50,214,-23.0,-97.0,23.0,-97.0,1.0,-80.7],"rain14-7.2":[4,484,0,106,215,50,214,-23.0,-98.0,23.0,-98.0,1.0,-81.3],"rain14-5.1":[4,591,0,106,215,50,214,-23.0,-99.3,23.0,-99.3,1.0,-83.0],"rain14-5.2":[4,698,0,105,215,49,214,-23.0,-102.7,23.0,-102.7,1.0,-86.0]},"tw":{"happy0-1":2,"happy1-2":2,"happy2-3":2,"happy3-4":2,"happy4-5":2,"happy5-6":2,"happy6-7":2,"happy7-0":2,"happy0-2":2,"happy2-4":2,"happy0-3":2,"hello0-1":2,"hello1-2":2,"hello2-3":2,"hello3-4":2,"hello4-5":2,"hello5-6":2,"hello6-7":2,"hello7-8":2,"hello8-9":2,"hello9-10":2,"hello10-0":2,"hello1-3":2,"push2-3":2,"push3-4":2,"push4-5":2,"push5-6":2,"push6-7":2,"push7-8":2,"push8-4":2,"push8-9":2,"push9-10":2,"push10-11":2,"fall0-1":2,"fall1-2":2,"fall2-3":2,"fall3-4":2,"fall5-6":2,"fall6-7":2,"fall7-8":2,"fall8-9":2,"fall9-10":2,"fall10-11":2,"rain5-6":2,"rain6-7":2,"rain7-8":2,"rain8-9":2,"rain9-10":2,"rain10-11":2,"rain11-12":2,"rain12-13":2,"rain13-14":2,"rain14-7":2,"rain14-5":2},"idle":[32,3.2],"rw":[20,58.62068965517242],"reach":{"push2":51,"push3":46,"push4":57,"push5":61,"push6":62,"push7":65,"push8":61,"push9":60,"push10":66,"push11":45}};/*END-BEAR-DATA*/
  var STAND = 150, BV = "s1";
  var ATL = BD.atlas.map(function (fn) { return { fn: fn, img: null, ok: false }; });
  function loadAtlas(i) {
    var a = ATL[i]; if (!a || a.img) return;
    var im = new Image(); im.decoding = "async"; im.onload = function () { a.ok = true; }; im.src = BASE + a.fn + "?v=" + BV; a.img = im;
  }
  loadAtlas(0);                                                     // idle, walk, waving: needed straight away
  setTimeout(function () { [3, 2, 1, 4].forEach(function (i, n) { setTimeout(function () { loadAtlas(i); }, n * 350); }); }, 1200);
  function has(n) { var d = BD.f[n]; return !!(d && ATL[d[0]].ok); }
  function sheetReady(sh) { return has(sh + (sh === "push" ? 4 : 0)); }

  var PI = Math.PI, TAU = 2 * PI;
  function sm(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var HOME_MIN = -130, HOME_MAX = 0;     // how far left of its corner the bear may wander (px)
  var PARSE = {};
  function key(n) { return PARSE[n] || (PARSE[n] = (/^([a-z]+)(\d+)$/.exec(n) || [0, n, "-1"]).slice(1)); }
  // the frames for moving from drawing a to drawing b (fraction s): the in-betweens if there are any, else a quick dissolve
  function seg(a, b, s) {
    if (a === b || s <= 0) return { f: a };
    if (s >= 1) return { f: b };
    var ka = key(a), kb = key(b);
    if (ka[0] === kb[0]) {
      var nm = ka[0] + ka[1] + "-" + kb[1], K = BD.tw[nm], rev = false;
      if (K === undefined) { nm = ka[0] + kb[1] + "-" + ka[1]; K = BD.tw[nm]; rev = true; }
      if (K) {
        var x = s * (K + 1), i = Math.floor(x);
        var fr = function (j) { return j <= 0 ? a : j >= K + 1 ? b : nm + "." + (rev ? K + 1 - j : j); };
        return { f: fr(i), f2: fr(i + 1), mix: x - i };
      }
    }
    return { f: a, f2: b, mix: sm((s - .3) / .4) };
  }
  // a timeline of drawings [[frame, seconds, move]]: "move" = the part of the step spent gliding on to the next drawing
  function tl(steps, u) {
    var t = 0;
    for (var i = 0; i < steps.length; i++) {
      var st = steps[i], d = st[1];
      if (u < t + d) {
        var nx = steps[i + 1], mv = st[2] === undefined ? 1 : st[2];
        if (!nx || mv <= 0) return { f: st[0] };
        var s = ((u - t) / d - (1 - mv)) / mv;
        return s <= 0 ? { f: st[0] } : seg(st[0], nx[0], mv < 1 ? sm(s) : s);
      }
      t += d;
    }
    return null;
  }
  function seq(sh, keys, fps) { return keys.map(function (k) { return [sh + k, 1 / fps]; }); }
  function dur(steps) { return steps.reduce(function (s, x) { return s + x[1]; }, 0); }
  function idlePose(now) { var N = BD.idle[0], x = (now / BD.idle[1] % 1) * N, i = Math.floor(x); return { f: "idle" + i, f2: "idle" + (i + 1) % N, mix: x - i }; }
  function walkPose(ph) { var N = BD.rw[0], x = (((ph % 1) + 1) % 1) * N, i = Math.floor(x); return { f: "rw" + i, f2: "rw" + (i + 1) % N, mix: x - i }; }
  var WALK_V = 30;    // walking speed, px per second
  // walk to A.to with the rigged walk cycle: the legs advance exactly as far as the body moves, so the feet never slide.
  // eases in, brakes into the stop. returns the pose while walking, null once there
  function walkTo(B, A) {
    var dt = B.dt === undefined ? .016 : B.dt, d = A.to - B.x, dist = Math.abs(d);
    if (dist < .5) { B.x = A.to; return null; }
    var dir = d > 0 ? 1 : -1, sc = B.cv.__scale || .43;
    A.wt = (A.wt || 0) + dt;
    var v = WALK_V * sm(A.wt / .4) * Math.min(1, Math.sqrt(dist / 16));
    v = Math.max(v, 5); if (v * dt > dist) v = dist / Math.max(dt, 1e-3);
    B.x += dir * v * dt; B.face = dir;
    A.ph = (A.ph === undefined ? .2 : A.ph) + v * dt / (BD.rw[1] * sc);
    var p = walkPose(A.ph); p.flip = dir < 0; p.walk = 1; return p;
  }
  function puff(B, dx, n, big) {     // little dust clouds at the bear's feet
    if (!B.cv || reduce) return;
    var r = B.cv.getBoundingClientRect(), sc = B.cv.__scale || .43, now = performance.now() / 1000, f = B.pose ? B.pose.fx < 0 ? -1 : 1 : 1;
    for (var i = 0; i < n; i++) FX.push({ k: "P", x: r.left + r.width / 2 + f * dx * sc + rnd(-6, 6), y: r.bottom - 3, vx: rnd(-28, 28) + f * (dx < 0 ? -18 : 18) * (big ? 1.5 : .6), vy: -rnd(4, 18),
      t0: now, life: rnd(.45, .8) * (big ? 1.3 : 1), r: rnd(3, 5.5) * (big ? 1.35 : 1) });
  }

  /* ---- actions: each returns a pose {f,f2,mix, flip,sx,sy,rot,ty} for time u, or null when finished ---- */
  var WAVE = seq("happy", [0, 1, 2, 3, 4, 5, 6, 7, 0], 5), HELLO = seq("hello", [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10], 6);
  var DANCE = seq("happy", [2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3], 6);
  var STRETCH = [["happy0", .14], ["happy2", .3], ["happy4", 1.5, .22], ["happy3", .3, .6], ["happy0", .36]];
  var SPIN = seq("hello", [3, 4, 5, 6, 7, 8, 9, 10], 7);
  var NAP = [["fall11", .2], ["fall10", .22], ["fall9", .22], ["fall8", .22], ["fall7", 4.4, .1], ["fall8", .24], ["fall9", .24], ["fall10", .24], ["fall11", .3]];
  var CRASH = seq("fall", [5, 6, 7], 7).concat(seq("fall", [8, 9, 10, 11], 4.5)).concat([["fall11", .2]]);
  var AIR = [0, 1, 2, 3, 4, 3, 2, 1];
  var PUSH = [["push2", .2], ["push3", .2]];
  [.3, .36, .44].forEach(function (h, n) { PUSH = PUSH.concat([["push4", .16], ["push5", .14], ["push6", .14], ["push7", h, .45], ["push6", .14], ["push5", .14]]); });
  PUSH = PUSH.concat([["push4", .2], ["push5", .15], ["push6", .15], ["push7", .3, .5], ["push8", .5, .5], ["push9", .32, .6], ["push10", .4, .6], ["push11", 1, .25], ["push10", .3]]);
  var STRAIN = { push3: .35, push4: .55, push5: .8, push6: 1, push7: 1.15 };
  var T8 = (function () { var t = 0; for (var i = 0; i < PUSH.length; i++) { if (PUSH[i][0] === "push8") return t; t += PUSH[i][1]; } return t; })();
  var ACT = {
    wave: function (u, B) { var p = tl(WAVE, u); if (p) p.rot = .03 * Math.sin(u * 5); return p; },
    hello: function (u, B) {
      var p = tl(HELLO, u); if (!p) return null;
      if (u > 8 / 6 && !B.landed) { B.landed = 1; B.wob = 1; puff(B, 0, 4); }
      return p; },
    look: function (u, B) {   // glance the other way with a little hop
      if (u > .9) return null; if (u > .35 && !B.flipped) { B.flipped = 1; B.face *= -1; B.wob = .6; }
      return { ty: -7 * Math.sin(Math.min(1, u / .7) * PI), sy: 1 - .06 * Math.max(0, Math.sin(u / .35 * PI)) }; },
    wander: function (u, B, A) {   // waddle to a new spot
      if (A.to === undefined) { var t; do { t = rnd(HOME_MIN, HOME_MAX); } while (Math.abs(t - B.x) < 35); A.to = t; }
      var p = walkTo(B, A); if (!p) { B.wob = .3; return null; } return p; },
    dance: function (u, B) {   // bouncy little dance, arms up, swaying to a beat
      if (u > 3.2) { B.wob = 1; return null; }
      var beat = u * 2.6 * TAU, b = (1 - Math.cos(beat)) / 2;
      if (Math.floor(u * 1.3) !== B.lastFlip) { B.lastFlip = Math.floor(u * 1.3); B.face *= -1; }
      var p = tl(DANCE, u) || { f: "happy3" };
      p.ty = -9 * b; p.sy = 1 - .07 * (1 - b) * (1 - b) + .03 * b; p.sx = 1 + .05 * (1 - b) * (1 - b); p.rot = .12 * Math.sin(beat / 2); return p; },
    stretch: function (u, B) {   // big stretch up, then a happy shake
      var p = tl(STRETCH, u); if (!p) return null;
      var k = sm((u - .3) / .6) * (1 - sm((u - 1.9) / .4));
      if (u > 1.9 && !B.landed) { B.landed = 1; B.wob = 1; }
      p.sy = 1 + .07 * k; p.sx = 1 - .03 * k; p.rot = .04 * k * Math.sin(u * 3); return p; },
    spin: function (u, B) {   // crouch, leap, turn around in the air, land
      var p = tl(SPIN, u); if (!p) return null;
      if (u > 3 / 7 && !B.flipped) { B.flipped = 1; B.face *= -1; }
      if (u > 4 / 7 && !B.landed) { B.landed = 1; B.wob = 1; puff(B, 0, 4); }
      return p; },
    nap: function (u, B) {   // lies down for a little rest, breathing, then gets back up
      var p = tl(NAP, u); if (!p) { B.wob = 1; return null; }
      if (u > .86 && u < 5.1) { var v = u - .86; p.sy = 1 + .035 * Math.sin(v * TAU / 1.8); p.sx = 1 - .015 * Math.sin(v * TAU / 1.8); }
      return p; },
    push: function (u, B, A) {   // walks up to the Facebook button and pushes with all its might
      if (A.to === undefined) A.to = A.pushX;
      if (A.arrive === undefined) { var w = walkTo(B, A); if (w) return w; A.arrive = u; B.face = 1; }
      var v = u - A.arrive, p = tl(PUSH, v); if (!p) { B.wob = .5; return null; }
      B.x = A.to - 7 * sm((v - T8 + .2) / .7);                                                  // steps back from the button when it gives up
      var s1 = STRAIN[p.f] || 0, s2 = p.f2 ? STRAIN[p.f2] || 0 : s1, strain = s1 + (s2 - s1) * (p.mix || 0);
      p.push = 1; p.strain = strain; p.flip = false;
      if (strain > .9) { p.sx = 1 + .025 * Math.sin(v * 31); p.rot = -.012 * Math.sin(v * 23); }       // trembling with effort
      if (strain > .95 && (!A.lastPuff || v - A.lastPuff > .5)) { A.lastPuff = v; puff(B, -40, 2); }
      return p; },
    spew: function (u, B, A) {   // holds its tummy, bends over and throws up a stream that spells "ICE UPDATE" on the ground
      var R = 1.1, POUR = 2.25;
      if (!A.init) {            // needs room on its left for the words: walk back toward its corner first if it wandered off
        A.init = 1; A.to = Math.min(0, Math.max(B.x, B.x + (250 - (B.cv ? B.cv.getBoundingClientRect().left + 85 : 999))));
      }
      if (A.arrive === undefined) { var w = walkTo(B, A); if (w) return w; A.arrive = u; }
      u -= A.arrive; B.face = -1;
      if (u < R) {              // retching: paw on tummy, three heaves
        var g = Math.max(0, Math.sin(u / R * PI * 3)), q = u > R - .16 ? seg("hello1", "hello3", sm((u - R + .16) / .16)) : { f: "hello1" };
        q.flip = true; q.sy = 1 - .05 * g; q.sx = 1 + .03 * g; q.rot = -.13 * g; return q;
      }
      if (!A.fx) { A.fx = { k: "S", B: B, act: A, t0: A.t0 + A.arrive + R }; FX.push(A.fx); }
      var v = u - R;
      if (v < POUR) return { f: "hello3", flip: true, rot: -.1 - .03 * Math.sin(v * 9), sy: 1 + .025 * Math.sin(v * 13), sx: 1 - .012 * Math.sin(v * 13) };
      if (v < POUR + .35) { var p1 = seg("hello3", "hello1", sm((v - POUR) / .25)); p1.flip = true; return p1; }   // phew
      if (v < POUR + .75) { var p2 = seg("hello1", "happy1", sm((v - POUR - .35) / .2)); p2.rot = .05 * Math.sin(v * 6); return p2; }   // wipes its mouth
      var wv = tl(WAVE, v - POUR - .75); if (wv) return wv;
      if (v < 5.6) return {};
      B.wob = .5; return null;
    },
    rain: function (u, B, A) {   // sunglasses drop on, grabs cash and makes it rain (3 throws), glasses pop off again
      if (!A.steps) {
        var st = [[0, .1, 0], [1, .1, 0], [2, .1, 0], [3, .1, 0], [4, .18, 0], [5, .3, .5], [6, .45]];
        for (var n = 0; n < 3; n++) st = st.concat([[7, .12], [8, .1], [9, .1], [10, .1, 1, 1], [11, .12], [12, .12], [11, .12], [12, .12], [13, .16], [14, .28]]);
        st = st.concat([[5, .35, 0], [2, .08, 0], [1, .08, 0], [0, .12, 0]]);
        A.steps = st.map(function (x) { return ["rain" + x[0], x[1], x[2], x[3]]; }); A.done = -1;
      }
      var t = 0, i = 0; for (; i < A.steps.length; i++) { t += A.steps[i][1]; if (u < t) break; }
      if (i >= A.steps.length) { B.wob = .5; return null; }
      if (A.steps[i][3] && A.done < i) { A.done = i; fxBills(B); B.wob = .5; }
      var p = tl(A.steps, u); if (p) p.flip = false; return p;
    },
    crash: function (u, B) {   // hits the ground after a big fall: belly flop, lies there, gets up
      if (!B.landed) { B.landed = 1; puff(B, 0, 7, 1); }
      return tl(CRASH, u); },
    bump: function (u, B) {    // small drop: knees bend on landing
      if (u > .5) return null;
      if (!B.landed) { B.landed = 1; puff(B, 0, 3); }
      var p = u < .22 ? { f: "hello3" } : seg("hello3", "hello2", sm((u - .22) / .2));
      p.sy = 1 - .08 * Math.sin(Math.min(1, u / .5) * Math.PI); return p; }
  };
  var NEEDS = { hello: "hello", spin: "hello", spew: "hello", bump: "hello", push: "push", nap: "fall", crash: "fall", rain: "rain" };
  /* ---- effects overlay (drawn above the bear): the "ICE UPDATE" stream and the banknotes ---- */
  var FX = [], fxNew = [], fxCv = null;
  function fxCanvas() {
    if (fxCv) return fxCv;
    fxCv = document.createElement("canvas"); fxCv.setAttribute("aria-hidden", "true");
    fxCv.id = "iu-bear-fx"; fxCv.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:9992";
    document.body.appendChild(fxCv); return fxCv;
  }
  // a point on the bear's drawing (sprite px from its feet-centre) -> where it is on screen in this very frame
  function bearPt(B, px, py) {
    var r = B.cv.getBoundingClientRect(), s = B.cv.__scale || .43, q = B.pose || { rot: 0, fx: 1, sy: 1 };
    var x = q.fx * px * s, y = q.sy * py * s, cs = Math.cos(q.rot), sn = Math.sin(q.rot);
    return { x: r.left + r.width / 2 + x * cs - y * sn, y: r.bottom - 2 + x * sn + y * cs, ground: r.bottom - 2 };
  }
  var MOUTH = { x: 40, y: -89 };      // the mouth in the bent-over frame (hello #3)
  function fxBills(B) {   // a burst of banknotes from both raised paws
    var r = B.cv.getBoundingClientRect(), sc = B.cv.__scale || .43, cx = r.left + r.width / 2, top = r.bottom - 2 - 150 * sc, now = performance.now() / 1000;
    for (var h = -1; h <= 1; h += 2) for (var j = 0; j < 13; j++) {
      FX.push({ k: "B", x: cx + h * 40 * sc + rnd(-6, 6), y: top + rnd(-6, 6), vx: h * rnd(20, 190) + rnd(-60, 60), vy: -rnd(240, 560), t0: now, life: rnd(2.6, 3.8),
        rot: Math.random() * 6, vr: rnd(-7, 7), ph: Math.random() * 6, sz: rnd(.8, 1.15), ground: r.bottom - 3 - Math.random() * 4 });
    }
  }
  /* the stream: one smooth arc of icy liquid straight out of the mouth; the letters ride down it, land, and slide
     along the ground into place to spell ICE UPDATE; then the word shines and melts back into the puddle */
  var WORD = ["I", "C", "E", " ", "U", "P", "D", "A", "T", "E"], VX = 96, VY = -24, GR = 540;
  function glyph(c, ch, fs, ice, hi) {      // one letter of the wordmark, standing on its baseline at (0,0)
    c.font = "800 " + fs + "px Sora, Inter, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.lineJoin = "round";
    c.fillStyle = "#06183a"; c.strokeStyle = "#06183a"; c.lineWidth = fs * .26; c.strokeText(ch, 0, fs * .09); c.fillText(ch, 0, fs * .09);   // drop edge
    c.lineWidth = fs * .22; c.strokeStyle = "#0b2a55"; c.strokeText(ch, 0, 0);
    var g = c.createLinearGradient(0, -fs * .78, 0, 0);
    if (ice) { g.addColorStop(0, "#ffffff"); g.addColorStop(.45, "#aeeeff"); g.addColorStop(1, "#35b6f2"); }
    else { g.addColorStop(0, "#ffffff"); g.addColorStop(.6, "#eef9ff"); g.addColorStop(1, "#a9defa"); }
    c.fillStyle = g; c.fillText(ch, 0, 0);
    if (hi > .02) { c.globalAlpha *= Math.min(1, hi); c.fillStyle = "#ffffff"; c.fillText(ch, 0, 0); }
  }
  function drawSpew(c, p, now, dt) {
    var B = p.B, u = now - p.t0, m = bearPt(B, MOUTH.x, MOUTH.y), dir = (B.pose && B.pose.fx < 0) ? -1 : 1, ground = m.ground;
    if (!p.lay) {             // lay the word out once, on the ground in front of the bear
      var hgt = ground - m.y, tl = (-VY + Math.sqrt(VY * VY + 2 * GR * hgt)) / GR, landX = m.x + dir * VX * tl;
      var avail = dir < 0 ? landX - 22 : innerWidth - landX - 22, fs = 27, ws, W;
      for (; fs >= 13; fs--) {
        c.font = "800 " + fs + "px Sora, Inter, system-ui, sans-serif";
        ws = WORD.map(function (ch) { return ch === " " ? fs * .36 : c.measureText(ch).width + fs * .05; });
        W = ws.reduce(function (a, b) { return a + b; }, 0); if (W <= avail) break;
      }
      var x = dir < 0 ? landX - 12 - W : landX + 12, L = [], order = 0, n = WORD.filter(function (ch) { return ch !== " "; }).length;
      WORD.forEach(function (ch, i) { if (ch !== " ") { L.push({ ch: ch, x: x + ws[i] / 2, ice: i < 3, idx: order++, slide: .3 + Math.abs(x + ws[i] / 2 - landX) / 430 }); } x += ws[i]; });
      // the letter that must travel farthest leaves the mouth first, so letters never cross
      L.forEach(function (l) { var k = dir < 0 ? l.idx : n - 1 - l.idx; l.emit = .15 + k * .2; });
      p.lay = { L: L, fs: fs, x0: dir < 0 ? landX - 12 - W : landX + 12, W: W, pourEnd: .15 + (n - 1) * .2 + .4, dir: dir };
    }
    var lay = p.lay, fs = lay.fs, MELT = 5.0, END = 5.7;
    if (B.act !== p.act && p.abort === undefined && u < lay.pourEnd) p.abort = u;      // bear got interrupted (e.g. scrolled into the air)
    var stop = p.abort !== undefined ? p.abort : lay.pourEnd;
    if (p.abort !== undefined) { MELT = Math.min(MELT, p.abort + .5); END = MELT + .7; }
    if (u > END) return false;
    var melt = u > MELT ? Math.min(1, (u - MELT) / (END - MELT)) : 0;
    // the arc, measured from the mouth as it is right now
    var hgt2 = Math.max(4, ground - m.y), TL = (-VY + Math.sqrt(VY * VY + 2 * GR * hgt2)) / GR;
    var arc = function (t) { return { x: m.x + lay.dir * VX * t, y: m.y + VY * t + .5 * GR * t * t }; };
    var land = arc(TL);
    // ---- puddle under the word (grows as the letters arrive)
    var far = land.x;
    lay.L.forEach(function (l) { var a = u - l.emit - TL; if (a > 0 && l.emit < stop) { var e = 1 - Math.pow(1 - Math.min(1, a / l.slide), 3); far = lay.dir < 0 ? Math.min(far, land.x + (l.x - land.x) * e - fs * .5) : Math.max(far, land.x + (l.x - land.x) * e + fs * .5); } });
    if (u > TL * .8) {
      var pa = land.x + lay.dir * -10, pcx = (pa + far) / 2, prx = Math.abs(far - pa) / 2 + 6, k = (1 - melt) * Math.min(1, (u - TL * .8) / .3);
      c.save(); c.globalAlpha = .55 * k; c.fillStyle = "#7fd8ff"; c.beginPath(); c.ellipse(pcx, ground + 1.5, prx, 4.2, 0, 0, 7); c.fill();
      c.globalAlpha = .7 * k; c.strokeStyle = "#e9fbff"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(pcx - prx * .15, ground + .6, prx * .7, 2, 0, PI * 1.05, PI * 1.9); c.stroke(); c.restore();
    }
    // ---- letters
    c.save();
    lay.L.forEach(function (l) {
      if (l.emit >= stop) return;
      var a = u - l.emit; if (a < 0) return;
      c.save();
      if (a < TL) {                    // riding down the stream
        var q = arc(a); c.translate(q.x, q.y); c.rotate(lay.dir * a * 7); c.scale(.42, .42); c.translate(0, fs * .35);
        glyph(c, l.ch, fs, l.ice, 0);
      } else {                          // landed: slide along the ground to its place, stand up, settle with a wobble
        var s2 = a - TL, e = 1 - Math.pow(1 - Math.min(1, s2 / l.slide), 3), x = land.x + (l.x - land.x) * e, sc = .42 + .58 * e;
        var arr = s2 - l.slide, bounce = arr > 0 ? Math.exp(-arr * 6) * Math.sin(arr * 20) : 0;
        var sweep = (u - 2.95) / .7, sx0 = lay.x0 - 20 + (lay.W + 40) * sweep, hi = sweep > 0 && sweep < 1 ? Math.exp(-Math.pow((x - sx0) / (fs * .6), 2)) : 0;
        c.globalAlpha = 1 - melt;
        c.translate(x, ground - 1.5 - 6 * hi); c.rotate(lay.dir * (1 - Math.min(1, s2 / .14)) * .9);
        c.scale(sc * (1 - .16 * bounce), sc * (1 + .22 * bounce) * (1 - .82 * melt) * (1 + .1 * hi));
        glyph(c, l.ch, fs, l.ice, hi * .85);
      }
      c.restore();
    });
    c.restore();
    // sparkle at the end of the shine
    var sp = (u - 3.6) / .5;
    if (sp > 0 && sp < 1 && p.abort === undefined) {
      var sx1 = lay.x0 + lay.W + 3, sy1 = ground - fs * .95, rr = 9 * Math.sin(sp * PI);
      c.save(); c.translate(sx1, sy1); c.rotate(sp * 1.2); c.fillStyle = "#ffffff"; c.beginPath();
      for (var i = 0; i < 8; i++) { var ang = i * PI / 4, rad = i % 2 ? rr * .28 : rr; c.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad); }
      c.closePath(); c.fill(); c.restore();
    }
    // ---- the stream itself, from the mouth to the ground
    var ta = Math.max(0, u - stop), tb = Math.min(u, TL);
    if (tb > ta + .01) {
      var N = 22, pts = [];
      for (var j = 0; j <= N; j++) { var t = ta + (tb - ta) * j / N, q2 = arc(t), wv = 1.3 * Math.sin(t * 26 - u * 16) * Math.min(1, t * 8); pts.push({ x: q2.x, y: q2.y + wv, w: 4.4 + 7.2 * Math.min(1, t / (TL * .7)) }); }
      c.save(); c.lineCap = "round"; c.lineJoin = "round";
      var pass = function (col, add, mul) { c.strokeStyle = col; for (var j2 = 1; j2 < pts.length; j2++) { c.lineWidth = pts[j2].w * mul + add; c.beginPath(); c.moveTo(pts[j2 - 1].x, pts[j2 - 1].y); c.lineTo(pts[j2].x, pts[j2].y); c.stroke(); } };
      pass("#0b2a55", 3.6, 1); pass("#7fd8ff", 0, 1); pass("#c9f3ff", 0, .5);
      c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = 1.6; c.setLineDash([5, 9]); c.lineDashOffset = -u * 150;        // flowing glints
      c.beginPath(); pts.forEach(function (q3, j3) { j3 ? c.lineTo(q3.x, q3.y - q3.w * .22) : c.moveTo(q3.x, q3.y - q3.w * .22); }); c.stroke(); c.setLineDash([]);
      if (ta === 0) { c.fillStyle = "#2a0f1c"; c.beginPath(); c.ellipse(m.x - lay.dir * 1.2, m.y + .3, 2.9, 3.3, 0, 0, 7); c.fill();   // open mouth
        c.fillStyle = "#7fd8ff"; c.beginPath(); c.arc(m.x + lay.dir * .6, m.y + .3, 2.2, 0, 7); c.fill(); }
      c.restore();
      if (tb >= TL - .01 && Math.random() < dt * 34)       // splashes where it hits the ground
        fxNew.push({ k: "D", x: land.x + rnd(-4, 4), y: ground - 2, vx: rnd(-70, 70), vy: -rnd(60, 170), t0: now, life: rnd(.35, .6), r: rnd(1.2, 2.6), ground: ground });
    }
    return true;
  }
  function fxDraw(now, dt) {
    if (!FX.length) { if (fxCv && fxCv.__on) { fxCv.getContext("2d").clearRect(0, 0, fxCv.width, fxCv.height); fxCv.__on = 0; } return; }
    var cv = fxCanvas(), dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; }
    var c = cv.getContext("2d"); cv.__on = 1;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    // draw in real screen coordinates, measured from where this canvas actually sits (phone browsers resize the
    // viewport when the address bar hides, which used to push the effects below the bear's mouth)
    var fr = cv.getBoundingClientRect(); if (!fr.width || !fr.height) return;
    var kx = W / fr.width, ky = H / fr.height; c.setTransform(kx, 0, 0, ky, -fr.left * kx, -fr.top * ky);
    FX = FX.filter(function (p) {
      var age = now - p.t0;
      if (p.k === "S") return drawSpew(c, p, now, dt);
      if (p.k === "P") {   // dust puff
        if (age > p.life) return false;
        var q = age / p.life; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-dt * 3.5); p.vy *= Math.exp(-dt * 3.5);
        c.globalAlpha = .7 * (1 - q * q) * Math.min(1, age / .05); c.fillStyle = "#f3f6f9"; c.strokeStyle = "rgba(60,72,92,.45)"; c.lineWidth = .9;
        c.beginPath(); c.arc(p.x, p.y - p.r * q * .8, p.r * (.55 + .8 * q), 0, 7); c.fill(); c.stroke(); c.globalAlpha = 1; return true;
      }
      if (p.k === "D") {   // splash droplet
        if (age > p.life) return false;
        p.vy += 620 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > p.ground + 2) return false;
        c.globalAlpha = Math.min(1, (p.life - age) / .2); c.fillStyle = "#bff0ff"; c.strokeStyle = "#0b2a55"; c.lineWidth = .8;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); c.stroke(); c.globalAlpha = 1; return true;
      }
      // banknote: shoots up, then flutters down and settles
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
    });
    if (fxNew.length) { FX = FX.concat(fxNew); fxNew = []; }
  }
  function bstate(cv) { return cv.__b || (cv.__b = { x: 0, face: 1, act: null, wob: 0, next: performance.now() / 1000 + rnd(2, 4), last: "", seen: performance.now() / 1000 }); }
  function play(el, name) {
    if (reduce || !el || !ACT[name]) return false;
    if (NEEDS[name] && !sheetReady(NEEDS[name])) return false;
    var cv = el.querySelector ? el.querySelector(".pa-bear") : null; if (!cv) return false;
    var B = bstate(cv);
    if (B.act && B.act.name === "fall") return false;
    if (B.act && name !== "fall" && B.act.name !== "wander" && B.act.name !== "look") return false;
    B.act = { name: name, t0: performance.now() / 1000 }; B.flipped = 0; B.landed = 0; B.lastFlip = -1; B.last = name;
    if (name === "push") B.act.pushX = pushTarget(cv);
    return true;
  }
  function pushTarget(cv) {   // where the bear must stand so its paws just touch the social button
    var btn = document.querySelector("#iu-social .sd-btn"), mv = cv.parentNode;
    if (!btn) return 0;
    var r = btn.getBoundingClientRect(), m = mv.getBoundingClientRect(), mx = m.left + m.width / 2 - (mv.__tx || 0);
    return Math.max(-20, Math.min(60, r.left - BTN.x - (mx + BD.reach.push4 * (cv.__scale || .43))));
  }
  /* the social button reacts to the push: it gets shoved by exactly as much as the paws press into it, squashes a
     little, and springs back with a wobble when the bear lets go */
  var BTN = { x: 0, v: 0, on: 0, el: null };
  function btnStep(dt, target, held) {
    var el = BTN.el && BTN.el.isConnected ? BTN.el : (BTN.el = document.querySelector("#iu-social .sd-btn")); if (!el) return;
    var k = held ? 900 : 230, c = held ? 55 : 7.5, n = Math.ceil(dt / .006), h = dt / Math.max(1, n);
    for (var i = 0; i < n; i++) { BTN.v += (k * (target - BTN.x) - c * BTN.v) * h; BTN.x += BTN.v * h; }        // small steps: stable on slow phones too
    if (!(Math.abs(BTN.x) < 40)) { BTN.x = 0; BTN.v = 0; }
    if (!held && Math.abs(BTN.x) < .03 && Math.abs(BTN.v) < .1) { if (BTN.on) { el.style.transform = ""; BTN.on = 0; } BTN.x = 0; BTN.v = 0; return; }
    BTN.on = 1;
    var x = BTN.x;
    el.style.transform = "translateX(" + x.toFixed(2) + "px) rotate(" + (x * 1.9).toFixed(2) + "deg) scale(" + (1 - Math.max(0, x) * .014).toFixed(3) + "," + (1 + Math.max(0, x) * .008).toFixed(3) + ")";
  }
  function reachOf(n) { if (!n) return 0; var k = key(n); if (k[1] !== "-1") return BD.reach[n] || 0;
    var m = /^push(\d+)-(\d+)\.(\d+)$/.exec(n); if (!m) return 0; var K = BD.tw["push" + m[1] + "-" + m[2]], t = m[3] / (K + 1);
    return (BD.reach["push" + m[1]] || 0) * (1 - t) + (BD.reach["push" + m[2]] || 0) * t; }
  /* the "brain": picks what to do next on its own, never repeats the same thing twice in a row */
  var CHOICES = [["wander", 3], ["look", 2.2], ["dance", 1.6], ["stretch", 1.4], ["wave", 1.4], ["hello", 1.2], ["push", 1.5], ["spin", 1], ["nap", .6], ["spew", 1.3], ["rain", 1.4]];
  function think(cv, B, now) {
    if (document.documentElement.getAttribute("data-bear-idle") === "off") return;
    var bored = now - B.seen > 40, list = CHOICES.filter(function (c) { return c[0] !== B.last && (!NEEDS[c[0]] || sheetReady(NEEDS[c[0]])); }).map(function (c) {
      var w = c[1]; if (c[0] === "nap") w *= bored ? 5 : 1; if (c[0] === "push" && B.x < -60) w *= .5; return [c[0], w]; });
    var sum = list.reduce(function (s, c) { return s + c[1]; }, 0), r = Math.random() * sum;
    for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) { play(cv.closest(".pa-launch"), list[i][0]); break; } }
  }
  /* ---- drawing ---- */
  function frameChain(n) { var d = n && BD.f[n]; return d && d.length > 7 ? d.slice(7) : null; }
  // one pose = up to two neighbouring frames, dissolved in premultiplied space ("lighter"), so the body never goes see-through
  function drawPose(c, P, wgt, k) {
    var parts = [[P.f, 1 - (P.f2 ? P.mix : 0)]]; if (P.f2) parts.push([P.f2, P.mix]);
    for (var i = 0; i < parts.length; i++) {
      var d = BD.f[parts[i][0]], a = parts[i][1] * wgt; if (!d || a <= .003) continue;
      var at = ATL[d[0]]; if (!at.ok) { d = BD.f["idle0"]; at = ATL[0]; if (!at.ok) continue; }
      c.globalAlpha = Math.min(1, a);
      c.drawImage(at.img, d[1], d[2], d[3], d[4], -d[5] * k, -d[6] * k, d[3] * k, d[4] * k);
    }
  }
  function poseChain(P) {
    var a = frameChain(P.f), b = P.f2 ? frameChain(P.f2) : a;
    if (!a || !b) return a && (!P.f2 || P.mix < .5) ? a : b && P.mix >= .5 ? b : null;
    var m = P.f2 ? P.mix : 0; return a.map(function (v, i) { return v + (b[i] - v) * m; });
  }
  function xform(c, P, W, H, dpr, isLaunch) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.translate(W / 2, H - 2 * dpr);
    c.rotate(P.rot || 0); c.scale((P.flip ? -1 : 1) * (P.sx || 1), P.sy || 1);
  }
  /* the chain: drawn live on the bear in the same ink and shading as the drawing, ends tucked into the neck fur,
     the pendant swings with every step, jump and fall */
  function drawChain(c, k, ch, B, dt, alpha) {
    var S = B.chs || (B.chs = { x: ch[4], y: ch[5], vx: 0, vy: 0 });
    var acc = B.acc || [0, 0], sc = B.cv.__scale || .43, f = B.pose && B.pose.fx < 0 ? -1 : 1;
    if (dt > 0) {
      var K = 95, C = 8.5, ax = -acc[0] / sc * f * .6, ay = -acc[1] / sc * .6, n = Math.ceil(dt / .008), h = dt / n;
      for (var i0 = 0; i0 < n; i0++) { S.vx += (K * (ch[4] - S.x) - C * S.vx + ax) * h; S.vy += (K * (ch[5] - S.y) - C * S.vy + ay) * h; S.x += S.vx * h; S.y += S.vy * h; }
      if (!(Math.abs(S.x - ch[4]) < 50 && Math.abs(S.y - ch[5]) < 50)) { S.x = ch[4]; S.y = ch[5]; S.vx = S.vy = 0; }
      var ox = S.x - ch[4], oy = S.y - ch[5], d = Math.hypot(ox, oy); if (d > 6) { S.x = ch[4] + ox / d * 6; S.y = ch[5] + oy / d * 6; S.vx *= .5; S.vy *= .5; }
      if (S.y < ch[5] - 3.5) { S.y = ch[5] - 3.5; S.vy = Math.max(0, S.vy); }
    }
    var A = [ch[0], ch[1]], Bp = [ch[2], ch[3]], P = [S.x, S.y];
    // the chain hangs as a soft U from each side of the neck down to the pendant
    var path = [];
    var q = function (p0, p1, p2, n) { for (var i = 0; i <= n; i++) { var t = i / n, u = 1 - t; path.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } };
    q(A, [A[0] + (P[0] - A[0]) * .15, P[1] + 1], [P[0], P[1] - 1.5], 14); path.pop();
    q([P[0], P[1] - 1.5], [Bp[0] + (P[0] - Bp[0]) * .15, P[1] + 1], Bp, 14);
    var L = [0]; for (var i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    var tot = L[L.length - 1]; if (tot < 4) return;
    c.save(); c.globalCompositeOperation = "source-atop"; c.lineCap = "round";
    var STEP = 2.5, j = 0;
    for (var s = 1.2; s < tot - 1; s += STEP, j++) {
      var ii = 1; while (ii < L.length - 1 && L[ii] < s) ii++;
      var t2 = (s - L[ii - 1]) / Math.max(.001, L[ii] - L[ii - 1]), x = path[ii - 1][0] + (path[ii][0] - path[ii - 1][0]) * t2, y = path[ii - 1][1] + (path[ii][1] - path[ii - 1][1]) * t2;
      var ang = Math.atan2(path[ii][1] - path[ii - 1][1], path[ii][0] - path[ii - 1][0]), fade = Math.min(1, Math.min(s, tot - s) / 7);
      c.globalAlpha = alpha * fade;
      c.save(); c.translate(x * k, y * k); c.rotate(ang);
      if (j % 2) {   // link seen flat: a little oval ring
        c.beginPath(); c.ellipse(0, 0, 1.75 * k, 1.15 * k, 0, 0, TAU); c.fillStyle = "#2a1d0c"; c.fill();
        c.beginPath(); c.ellipse(0, 0, 1.3 * k, .72 * k, 0, 0, TAU); c.fillStyle = "#d9a93f"; c.fill();
        c.beginPath(); c.ellipse(-.25 * k, -.28 * k, .62 * k, .28 * k, 0, 0, TAU); c.fillStyle = "#fbe7a6"; c.fill();
        c.beginPath(); c.ellipse(0, .05 * k, .55 * k, .2 * k, 0, 0, TAU); c.fillStyle = "#2a1d0c"; c.fill();
      } else {       // link seen edge-on: a short bar
        c.lineWidth = 1.5 * k; c.strokeStyle = "#2a1d0c"; c.beginPath(); c.moveTo(-1.6 * k, 0); c.lineTo(1.6 * k, 0); c.stroke();
        c.lineWidth = .8 * k; c.strokeStyle = "#e4b84a"; c.beginPath(); c.moveTo(-1.25 * k, -.1 * k); c.lineTo(1.25 * k, -.1 * k); c.stroke();
      }
      c.restore();
    }
    c.restore();
    // the pendant: a small gold medallion with an ice-blue stone, hanging from the lowest link
    var tilt = Math.max(-.6, Math.min(.6, (S.x - ch[4]) * .09 + S.vx * .004));
    c.save(); c.globalAlpha = alpha; c.translate(P[0] * k, (P[1] + .4) * k); c.rotate(tilt);
    c.beginPath(); c.arc(0, 3.6 * k, 3.35 * k, 0, TAU); c.fillStyle = "#2a1d0c"; c.fill();
    var g = c.createLinearGradient(0, 1 * k, 0, 6.6 * k); g.addColorStop(0, "#f6d77a"); g.addColorStop(1, "#c0912f");
    c.beginPath(); c.arc(0, 3.6 * k, 2.55 * k, 0, TAU); c.fillStyle = g; c.fill();
    c.beginPath(); c.arc(0, 3.7 * k, 1.45 * k, 0, TAU); c.fillStyle = "#1c5f86"; c.fill();
    c.beginPath(); c.arc(0, 3.6 * k, 1.05 * k, 0, TAU); c.fillStyle = "#8fe3ff"; c.fill();
    c.beginPath(); c.arc(-.4 * k, 3.15 * k, .42 * k, 0, TAU); c.fillStyle = "#ffffff"; c.fill();
    c.beginPath(); c.arc(0, .6 * k, .75 * k, 0, TAU); c.lineWidth = .55 * k; c.strokeStyle = "#2a1d0c"; c.stroke();
    var gl = ((performance.now() / 1000 + 1.1) % 3.4) / .5;     // bling: the stone catches the light now and then
    if (gl < 1 && !reduce) {
      var gr = 4.2 * k * Math.sin(gl * PI); c.translate(-1 * k, 2.4 * k); c.rotate(gl * 1.4); c.fillStyle = "#ffffff"; c.beginPath();
      for (var gi = 0; gi < 8; gi++) { var ga = gi * PI / 4, gd = gi % 2 ? gr * .26 : gr; c.lineTo(Math.cos(ga) * gd, Math.sin(ga) * gd); }
      c.closePath(); c.fill();
    }
    c.restore();
  }
  var OFF = null;
  function drawBearCanvas(cv, now, opts) {
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var isLaunch = !!cv.closest(".pa-launch"), standPx = isLaunch ? 64 : h * .86;
    cv.__scale = standPx / STAND;
    var B = bstate(cv), dt = Math.min(.1, now - (B.tPrev || now)); B.tPrev = now; B.cv = cv; B.dt = dt;
    // ---- base: the breathing idle loop (the drawing itself moves: chest, arms, head, ears)
    var P = idlePose(now), src = "idle";
    P.sx = 1; P.sy = 1; P.rot = .012 * Math.sin(now * TAU / 4.1); P.dx = 0; P.ty = 0;
    if (opts && opts.happy) { var hp = tl(DANCE, now % 4); P = hp || P; P.ty = -5 * Math.abs(Math.sin(now * 5)); src = "happy"; }
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
        if (B.h <= 0) { var hit = -B.vh; B.h = 0; B.vh = 0; B.act = null; B.landed = 0;
          if (hit > 1100 && sheetReady("fall")) { B.act = { name: "crash", t0: now }; B.wob = 1.4; B.cut = 1; }
          else if (hit > 250 && sheetReady("hello")) { B.act = { name: "bump", t0: now }; B.wob = .9; B.cut = 1; } else B.wob = .5; }
      }
      if (B.gone) B.h = Math.max(B.h, sky);
      if (B.h > 1) { air = B.h; if (B.act) B.act = null; }
    }
    if (B.act) {
      var r = ACT[B.act.name](now - B.act.t0, B, B.act);
      if (!r) { B.act = null; B.next = now + rnd(1.2, 3.6); }
      else {
        src = B.act.name + (r.walk ? ":walk" : "");
        if (r.f) { P.f = r.f; P.f2 = r.f2; P.mix = r.mix; }
        P.flip = r.flip; P.push = r.push; P.strain = r.strain; P.walk = r.walk;
        P.sx *= (r.sx || 1); P.sy *= (r.sy || 1); P.rot = (r.rot || 0) + P.rot * .4; P.ty = (r.ty || 0); P.dx *= .3;
      }
    } else if (isLaunch && !reduce && now > B.next && !root.classList.contains("open")) think(cv, B, now);
    if (P.flip === undefined) P.flip = B.face < 0;
    // ---- in the air: arms up, legs paddling (the hand-drawn falling frames, in-betweened)
    var G = null, gw = 0;
    if (air) {
      var lift = Math.min(1, air / 34), ph = now * 4.5, i0 = Math.floor(ph);
      if (sheetReady("fall")) { var ap = seg("fall" + AIR[i0 % 8], "fall" + AIR[(i0 + 1) % 8], ph - i0);
        if (lift < 1) { G = P; gw = 1 - lift; }                    // the feet leave the ground gradually
        P = { f: ap.f, f2: ap.f2, mix: ap.mix, flip: P.flip, sx: 1, sy: 1, rot: .08 * Math.sin(now * 2.6) * lift, dx: 0 }; }
      else { P.f = "happy4"; P.f2 = null; }
      P.ty = -air; src = "air"; }
    // ---- skin/fur jiggle after landings and big moves (decays)
    B.wob = Math.max(0, (B.wob || 0) - dt * 1.6);
    var jig = B.wob * Math.sin(now * 26); P.sx *= 1 + .05 * jig; P.sy *= 1 - .05 * jig;
    // ---- whenever it switches from one thing to another, the two poses melt into each other
    if (src !== B.src) {
      if (B.lastP && !reduce) {
        var side = function (Q) { return !!(Q.walk || /^push/.test(Q.f || "")); };
        B.turn = side(B.lastP) !== side(P);                    // front <-> side: a quick turn, not a slow dissolve
        B.from = B.lastP; B.fromT = now; B.fromD = B.cut ? .07 : B.turn ? .13 : src === "air" || B.src === "air" ? .12 : .2;
      }
      B.src = src; B.cut = 0;
    }
    if (B.from && !G) { var bw = (now - B.fromT) / B.fromD; if (bw >= 1) B.from = null; else {
      G = B.from; gw = 1 - sm(bw);
      if (B.turn) { G = Object.assign({}, G, { sx: (G.sx || 1) * (1 - .1 * sm(bw)) }); P.sx *= 1 - .1 * (1 - sm(bw)); } } }
    if (isLaunch) {
      document.documentElement.classList.toggle("iu-bear-push", !!P.push);
      var mv = cv.parentNode, tx = B.x + (P.dx || 0);
      mv.__tx = tx;
      mv.style.transform = "translate(" + tx.toFixed(1) + "px," + (P.ty || 0).toFixed(1) + "px)";
      // how the bear is moving on screen (for the chain's swing)
      var vx = dt > 0 ? (tx - (B.ptx === undefined ? tx : B.ptx)) / dt : 0, vy = dt > 0 ? ((P.ty || 0) - (B.pty === undefined ? 0 : B.pty)) / dt : 0;
      B.vel = B.vel || [0, 0]; var ax = dt > 0 ? (vx - B.vel[0]) / dt : 0, ay = dt > 0 ? (vy - B.vel[1]) / dt : 0;
      B.acc = [Math.max(-4000, Math.min(4000, ax)), Math.max(-4000, Math.min(4000, ay))]; B.vel = [vx, vy]; B.ptx = tx; B.pty = P.ty || 0;
      // the button gets shoved exactly as far as the paws press into it
      if (P.push && B.act) {
        var A = B.act; if (A.btnL === undefined) { var bb = document.querySelector("#iu-social .sd-btn"); A.btnL = bb ? bb.getBoundingClientRect().left - BTN.x : 1e9; }
        var cr = cv.getBoundingClientRect(), paw = cr.left + cr.width / 2 + (reachOf(P.f) * (1 - (P.f2 ? P.mix : 0)) + (P.f2 ? reachOf(P.f2) * P.mix : 0)) * cv.__scale;
        var press = Math.max(0, Math.min(7, paw - A.btnL + .5)) * (P.strain > 0 ? 1 : 0);
        btnStep(dt, press + (P.strain > .9 ? .6 * Math.sin(now * 31) : 0), P.strain > 0);
      } else btnStep(dt, 0, false);
    }
    if (isLaunch) B.pose = { rot: P.rot || 0, fx: (P.flip ? -1 : 1) * (P.sx || 1), sy: P.sy || 1 };
    B.lastP = P;
    if (!ATL[0].ok) return;
    var c = cv.getContext("2d"), k = cv.__scale * dpr;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    if (!P.noShadow) { var lf = Math.min(1, Math.max(0, -(P.ty || 0)) / 30), sw = P.walk ? 36 : 40; c.fillStyle = "rgba(0,0,0," + (.2 * (1 - lf)) + ")"; c.beginPath();
      c.ellipse(W / 2, H - 3 * dpr, sw * k * (1 - .4 * lf), 5.5 * k, 0, 0, 7); c.fill(); }
    // the bear itself, composed off-screen so dissolves stay solid
    var o = OFF || (OFF = document.createElement("canvas")); if (o.width !== W || o.height !== H) { o.width = W; o.height = H; }
    var oc = o.getContext("2d");
    var comp = function (Q) {        // one pose, its two neighbouring frames dissolved in premultiplied space
      oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalCompositeOperation = "source-over"; oc.globalAlpha = 1; oc.clearRect(0, 0, W, H);
      oc.globalCompositeOperation = "lighter"; xform(oc, Q, W, H, dpr, isLaunch); drawPose(oc, Q, 1, k);
      oc.globalCompositeOperation = "source-over"; oc.globalAlpha = 1; oc.setTransform(1, 0, 0, 1, 0, 0);
    };
    // switching poses: the old one fades out underneath while the new one fades in on top (never see-through)
    if (G) { comp(G); c.globalAlpha = Math.min(1, gw * 2); c.drawImage(o, 0, 0); }
    comp(P); c.globalAlpha = G ? Math.min(1, (1 - gw) * 2) : 1; c.drawImage(o, 0, 0); c.globalAlpha = 1;
    // the chain, in the main pose's own space
    var ch = poseChain(P), cha = G ? Math.max(0, 1 - gw * 1.6) : 1;
    if (G && gw > .5) { var chg = poseChain(G); if (chg) { ch = chg; cha = 1; xform(c, G, W, H, dpr, isLaunch); } else xform(c, P, W, H, dpr, isLaunch); }
    else xform(c, P, W, H, dpr, isLaunch);
    if (ch && cha > .02) drawChain(c, k, ch, B, isLaunch ? dt : 0, cha);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  }
  var fxPrev = 0;
  function bearLoop() {
    var now = performance.now() / 1000;
    if (!document.hidden) {
      var list = root.querySelectorAll(".pa-bear:not(.pa-bear-mini)");
      for (var i = 0; i < list.length; i++) {
        var inHead = list[i].closest(".pa-head");
        if (inHead && !root.classList.contains("open")) continue;
        if (!inHead && root.classList.contains("open")) continue;
        drawBearCanvas(list[i], now, { happy: inHead && root.classList.contains("thinking") });
      }
      var minis = root.querySelectorAll(".pa-bear-mini:not([data-done])");
      for (var j = 0; j < minis.length; j++) { var ok = ATL[0].ok; drawBearCanvas(minis[j], 0, null); if (ok && minis[j].clientWidth) minis[j].setAttribute("data-done", "1"); }
    }
    fxDraw(now, Math.min(.05, now - (fxPrev || now))); fxPrev = now;   // after the bear, so the stream starts exactly at its mouth
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
