# Ice Update website — setup in 5 minutes

## 1. Put it online (free, GitHub Pages)
1. On github.com click **New repository** → name it `iceupdate` (or `YOURNAME.github.io` for a clean address) → **Public** → Create.
2. Click **uploading an existing file** → drag in EVERYTHING from this folder (index.html, style.css, app.js, config.js, `.nojekyll`, the `assets` folder) → **Commit changes**.
3. Go to **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.
4. Wait ~1 minute. Your link appears at the top of that page: `https://YOURNAME.github.io/iceupdate/`

## 2. Edit anything → open `config.js`
- Click `config.js` on GitHub → pencil icon → change → Commit. The site updates in ~1 minute.
- **WhatsApp / Telegram:** replace `YOUR_CHANNEL_ID` and `YOUR_TELEGRAM` in `links`. (Also in `socials` if you want.)
- **Social profiles:** edit each line in `socials`. Add a profile picture by uploading it to `assets/avatars/` and writing `avatar: "assets/avatars/me.jpg"`.
- **Videos:**
  - YouTube: `{ title:"Hammer", desc:"Lesson 1", category:"Candlesticks", url:"https://youtu.be/XXXXXXXXXXX" }`
  - TikTok / Instagram / Facebook: paste the post link as `url` (post must be public). It plays on your site in a pop-up. TikTok needs the full `tiktok.com/@name/video/123…` link.
  - Your own file: upload the mp4 to `assets/videos/` then `url:"assets/videos/hammer.mp4"`. (GitHub limit: 25 MB per file in the browser; for bigger videos use YouTube/Vimeo.)
- **PDFs:** upload to `assets/pdfs/` then add `{ title:"...", desc:"...", file:"assets/pdfs/name.pdf", size:"2 MB" }`.
- **Pictures:** upload to `assets/images/` then add `{ src:"assets/images/x.jpg", caption:"..." }`.
- **Broker logos:** upload each logo to `assets/brokers/` (use the logos you have permission to use), set `logo` and your referral `url`. If the file is missing, a letter badge shows instead.
- **Wallpaper:** `theme.wallpaper: "assets/images/wall.jpg"` or leave empty for the animated aurora. Change colours with `accent1/2/3`.

## 3. Track your website performance (free)
**Easiest — GoatCounter:** sign up at goatcounter.com, choose a code (e.g. `iceupdate`), then in `config.js` set `analytics.goatcounter: "iceupdate"`. Your dashboard: `https://iceupdate.goatcounter.com` shows visitors, countries, devices, referrers (TikTok/Instagram…), top pages — plus **clicks** on Join WhatsApp, Join Telegram, each video, PDF, broker and social button.

**Optional — Google Analytics 4:** create a property, copy the `G-XXXXXXXXXX` ID into `analytics.ga4`. Button clicks are sent as `click` events with the button name.

## 4. Own domain (optional)
Settings → Pages → Custom domain (e.g. iceupdate.com) and point your domain's DNS to GitHub Pages.
