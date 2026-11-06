/* =====================================================================
    ICE UPDATE — EDIT THIS FILE ONLY.  Everything on the website comes
    from here. Change text, add videos, PDFs, pictures, brokers, socials.
    After editing: save/commit on GitHub and the site updates in ~1 minute.
    ===================================================================== */
window.SITE = {
  brand: "Ice Update",
  tagline: "Trading • Online income • Tech updates",
  hero: {
    badge: "Free classes and forex signals for everyone",
    title: "Learn to read the market.",
    subtitle: "Simple video lessons, PDFs and charts that teach you candlesticks, support & resistance and smart risk — step by step."
  },

  /* Your channels (the big Join buttons). Paste your real links. */
  links: {
    whatsapp: "https://whatsapp.com/channel/0029VbE7s6hDuMRfollXDG0P",
    telegram: "https://t.me/iceupdate100"
  },

  /* TRACKING — see README. Fill ONE or BOTH. Leave "" to switch off. */
  analytics: {
    goatcounter: "",   // e.g. "iceupdate"  (free, from goatcounter.com)
    ga4: ""            // e.g. "G-XXXXXXXXXX" (from Google Analytics)
  },

  /* Wallpaper and broker files are uploaded in the repo root. */
  theme: {
    accent1: "#4de1ff",
    accent2: "#8b7bff",
    accent3: "#ff6bd6",
    wallpaper: "IceUpdate-Mono-Desktop-2560x1440.jpg",
    wallpaperMobile: "IceUpdate-Mono-Phone-1080x1920.jpg"
  },

  /* SOCIAL MEDIA — shown as the row of round icons at the bottom of the page (in this order)
     and as the tiny pop-up icons in the bottom-right corner (see dockSocials below).
     An icon with an empty url "" is hidden. To show X, paste your X (Twitter) link into its url. */
  socials: [
    { platform: "x",         name: "X",         handle: "", followers: "", url: "", avatar: "" },
    { platform: "youtube",   name: "YouTube",   handle: "@nanayawasmahannan", followers: "Videos & tutorials", url: "https://www.youtube.com/@nanayawasmahannan", avatar: "" },
    { platform: "instagram", name: "Instagram", handle: "@nanayawasmahannan", followers: "Daily reels & lifestyle", url: "https://www.instagram.com/nanayawasmahannan/", avatar: "" },
    { platform: "facebook",  name: "Facebook",  handle: "Nana Yaw Asmahannan", followers: "Community updates", url: "https://www.facebook.com/profile.php?id=61595902044097", avatar: "" },
    { platform: "tiktok",    name: "TikTok",    handle: "@nana.yaw.asmah.an", followers: "Short-form videos", url: "https://www.tiktok.com/@nana.yaw.asmah.an", avatar: "" },
    { platform: "whatsapp",  name: "WhatsApp",  handle: "Ice Update", followers: "Instant updates", url: "https://whatsapp.com/channel/0029VbE7s6hDuMRfollXDG0P", avatar: "" },
    { platform: "telegram",  name: "Telegram",  handle: "@iceupdate100", followers: "Class group", url: "https://t.me/iceupdate100", avatar: "" }
  ],

  /* The tiny icon in the bottom-right corner pops these out, top to bottom. */
  dockSocials: ["tiktok", "instagram", "youtube", "facebook", "x"],

  videos: [
    // { title: "Hammer candlestick", desc: "Lesson 1", category: "Candlesticks",
    //   url: "https://www.youtube.com/watch?v=XXXXXXXXXXX", thumb: "" },
  ],

  /* PDF LIST — shown top to bottom, in the order written here.
     TO ADD A NEW PDF:
       1) Upload the .pdf file to the main folder of the repository.
       2) (Optional) Upload a picture of its first page and put its file name in thumb.
          No thumb = a clean PDF icon is shown instead.
       3) Copy ONE line below, paste it under the last one, and change the words.
     Clicking a PDF plays the short stick-man loading animation, then opens the PDF. */
  pdfs: [
    { title: "15 Candlestick Patterns", desc: "Visual guide: 15 patterns, one picture per page", file: "candlestick-patterns.pdf", thumb: "candlestick-patterns-thumb.jpg", pages: 16, size: "33 KB" },
    { title: "Candlestick Charts Explained", desc: "A beginner's guide to reading bullish and bearish candles", file: "candlestick-guide.pdf", thumb: "candlestick-guide-thumb.jpg", pages: 4, size: "259 KB" },
    { title: "Support & Resistance: A Practical Field Guide", desc: "How to find the levels that matter and build trades around them", file: "support-and-resistance.pdf", thumb: "support-and-resistance-thumb.jpg", pages: 20, size: "684 KB" },
  ],

  /* GOLD / USD CHART — real market data from the free TradingView widget.
     symbol:  which feed to show (OANDA:XAUUSD is the default gold spot price).
     source:  the name shown under the chart.
     feed:    "live" shows a Live badge while the market is open.
              If you ever find the price is behind the real market, change it to "delayed"
              and the badge will say Delayed instead. Never leave "live" if it is not live.
     interval: starting timeframe: "5", "15", "60", "240" or "D". */
  goldChart: { symbol: "OANDA:XAUUSD", source: "OANDA", feed: "live", interval: "15" },

  /* LOADING ANIMATION + FLOATING ICON
     The 3D loading animation shows the broker logos below plus these two trading platforms.
     loader.minMs = the shortest time the loading screen stays (milliseconds). enabled:false turns it off. */
  platforms: [
    { name: "MetaTrader 5", logo: "mt5-logo.png" },
    { name: "TradingView",  logo: "tradingview-logo.png" }
  ],
  loader: { enabled: true, minMs: 1800 },

  gallery: [
    { src: "https://raw.githubusercontent.com/yawicon122/ICE-UPDATE-/main/a39e0c2cf1b85e1c798876f4526ac48f.jpg", caption: "Gold (XAUUSD) M1 – price falling, sell entries" },
    // { src: "assets/images/chart1.jpg", caption: "Hammer at support" },
  ],

  brokers: [
    { name: "Alchemy Markets",   logo: "alchemy-markets.png",   url: "https://account.alchemymarkets.com/register?brd=1&sidc=D037F675-FE13-4D23-9264-D6F46D9039B4", note: "Official broker" },
    { name: "Ambitious Fincorp", logo: "ambitious-fincorp.png", url: "https://trade.ambitiousfincorp.com/register?refcode=R3142067", note: "Official broker" },
    { name: "CPT Markets",       logo: "cpt-markets.png",       url: "https://portal.cptmarkets.com/user/register?inviteid=jTc85GWUB-MT4&inviteType=1", note: "Official broker" },
    { name: "MH Markets",        logo: "mh-markets.png",        url: "https://client.mhmarkets-asia.com/signup?partnerCode=A4CFMDIG", note: "Official broker" }
  ],

  /* START HERE route (optional): change the five steps. Each step: id, title, desc, cta, and ONE of
       go: "#section"   → scrolls to a part of the page
       pdf: true        → opens the PDF Guides window
       panel: "risk" or "recap" → opens the built-in text panel
     Leave this out to use the default five steps. */
  // route: [ { id: "candle", title: "Understand a candlestick", desc: "…", cta: "Open", go: "#explorer" } ],

  /* BEFORE / AFTER slider (optional): replace the built-in teaching chart with your own two pictures
     of the SAME chart (one plain, one with your marks). Upload them to the repo and write the file names. */
  // compare: { before: "chart-before.jpg", after: "chart-after.jpg", note: "Historical example, XAUUSD M15. Not financial advice." },

  footerNote: "Empowering your trading journey. We provide high-probability trading signals and comprehensive educational content designed to help you navigate the markets with confidence. To ensure the highest quality, we focus on sound risk management, disciplined execution, and practical market education."
};
