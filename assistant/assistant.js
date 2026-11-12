/* =====================================================================
   ICE UPDATE — Website Assistant (penguin)
   • Floating penguin bottom-right (next to the social icon). Tap → chat.
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
  function pengHTML(cls) {
    return '<span class="pa-peng ' + (cls || "") + '"><picture><source srcset="' + esc(CFG.img) + '" type="image/webp"><img src="' + esc(CFG.imgFallback) + '" alt="" width="62" height="73" decoding="async"></picture><i class="pa-lid l"></i><i class="pa-lid r"></i></span>';
  }
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
    row.innerHTML = (m.r === "me" ? "" : '<span class="pa-mini">' + pengHTML() + "</span>") + '<div class="pa-b">' + inner + "</div>";
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
      t.innerHTML = '<span class="pa-mini">' + pengHTML() + '</span><div class="pa-b" aria-label="Thinking"><i></i><i></i><i></i></div>';
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
      setTimeout(function () { thinking(false); push({ r: "bot", t: res.t, a: res.a }); done(); }, wait);
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
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  // tiny public API: window.IceAssistant.open() / .ask("text")
  window.IceAssistant = { open: open, close: close, ask: function (q) { open(); ask(q); } };
})();
