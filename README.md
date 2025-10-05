# Telegram WebApp Starter (Vanilla HTML/CSS/JS)

Minimal starter for building Telegram Mini Apps (Web Apps) without frameworks.

## Features
- Uses official `telegram-web-app.js`
- Handles theme and color scheme changes
- Main Button + sendData example
- Works in browser fallback (for local testing)

## Local development
Serve the static files with any HTTP server (Telegram requires HTTPS in production, but local HTTP is fine for testing).

```bash
cd /Users/romanlunkin/sculptor_twa
python3 -m http.server 5173
```

Then open `http://localhost:5173` in a browser.

## Telegram Integration
1. Host your app on HTTPS (e.g., GitHub Pages, Vercel, Netlify).
2. Create a bot via `@BotFather` and set Web App URLs:
   - Set `Menu Button` → `Web App` with your URL.
   - Or attach a `web_app` button in a custom keyboard.
3. Launch Mini App from Telegram. The app will receive `initData` and `themeParams`.

Docs: see `Telegram Mini Apps` Web Apps API (via Context7) or `core.telegram.org/bots/webapps`.

## Deploy (GitHub Pages)
- Create a repo on GitHub and push (see below).
- Enable GitHub Pages (Settings → Pages) and point to `main` branch `/root`.

## Push to GitHub
Using GitHub CLI:
```bash
cd /Users/romanlunkin/sculptor_twa
git init -b main
git add .
git commit -m "chore: init Telegram WebApp vanilla starter"
# Create and push repo
gh repo create sculptor_twa --public --source=. --remote=origin --push -y
```

## Notes
- Outside Telegram, the app shows a browser fallback UI. In Telegram, it enables Main Button, `sendData`, `showAlert`, and reacts to `themeChanged`.
- In production, make sure your domain is allowed in BotFather settings.
