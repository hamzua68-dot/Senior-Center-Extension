# Installing and configuring EasyAccess

EasyAccess has two parts:

1. **The Chrome extension** (`extension/`) — everything a person uses. It works on its own, with no account, server or internet service needed.
2. **The helper server** (`backend/`) — *optional*. It adds the AI helper (free-form questions, richer page and screenshot explanations, email drafts) and website threat-list checks. It exists so that API keys are **never** put inside the extension.

---

## 1. Install the extension (5 minutes)

Works in Google Chrome 116 or newer (and other Chromium browsers such as Microsoft Edge).

1. Download this project (green **Code** button on GitHub → **Download ZIP**) and unzip it — or `git clone` it.
2. Open Chrome and type `chrome://extensions` into the address bar, then press Enter.
3. Turn on **Developer mode** (switch in the top-right corner).
4. Click **Load unpacked** and choose the **`extension`** folder inside this project.
5. The EasyAccess welcome tour opens automatically.
6. **Pin the button** so it's always visible: click the jigsaw-puzzle icon at the top right of Chrome, then the pin next to *EasyAccess*.

Keyboard shortcut: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> opens the EasyAccess menu. (Change it at `chrome://extensions/shortcuts`.)

### Recommended first-time setup (best done with a family member)

- Choose a comfortable **text size** and **colours** in the welcome tour (or Settings → *Make everything easier to see*).
- Settings → **Protect me on every website** → turn on. Chrome will ask to allow access to all sites; this powers the link guard, fake-virus-alert detector and the colour badge. It can be turned off at any time.
- **Find what I need** → add the person's own bank, doctor and utility websites (copy the address from a card or paper bill).
- **Trusted family help** → add one or two trusted people and confirm them with the phone code.
- Optional: set up the AI helper (below).

### Updating

Replace the folder with the new version and click the circular **reload** arrow on the EasyAccess card at `chrome://extensions`. Settings are kept.

---

## 2. Set up the helper server (optional, for AI features)

Requirements: Node.js 20.6+ and an AI key: **either** an Anthropic (Claude) key from https://console.anthropic.com **or** a Google Gemini key from https://aistudio.google.com/apikey. A Google Safe Browsing key is optional.

```bash
cd backend
npm install
cp .env.example .env    # then edit .env (never commit it)
```

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | For AI (option 1) | Claude API key. |
| `GEMINI_API_KEY` | For AI (option 2) | Google Gemini API key. If the same Google key is also used for Safe Browsing, its API restrictions must allow both "Generative Language API" and "Safe Browsing API". |
| `AI_PROVIDER` | No | `claude` or `gemini`. Default: Claude if its key is set, otherwise Gemini. Without any AI key, AI endpoints answer "not set up" and the extension keeps using its built-in helper. |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.8-flash`. |
| `GOOGLE_SAFE_BROWSING_KEY` | No | Enables known-dangerous-website lookups (Google Safe Browsing v4 Lookup API). |
| `ALLOWED_ORIGINS` | **Yes in production** | `chrome-extension://<your-extension-id>` — only your installed extension may call the server. Find the ID on `chrome://extensions`. |
| `EASYACCESS_ACCESS_CODE` | Recommended if the server is public | A shared code entered in EasyAccess Settings. |
| `EASYACCESS_MODEL` | No | Defaults to `claude-opus-5-5`. |
| `EASYACCESS_EFFORT` | No | `low` (default, quick answers) · `medium` · `high`. |
| `RATE_LIMIT_PER_MINUTE` | No | Per-IP request limit (default 20). |
| `PORT`, `HOST` | No | Default `8787`, `127.0.0.1`. |

Start it (the server reads environment variables; with a `.env` file use Node's `--env-file`):

```bash
node --env-file=.env server.mjs
```

For a single computer, running it locally (`http://localhost:8787`) is fine. For a senior center or family serving several people, deploy it to any Node host behind **HTTPS** (Render, Fly.io, Railway, a VPS with Caddy/nginx, etc.), set `HOST=0.0.0.0`, and set `ALLOWED_ORIGINS` and `EASYACCESS_ACCESS_CODE`.

### Connect the extension

EasyAccess → **Settings** → **AI helper**:

1. *Helper server address*: e.g. `https://easyaccess-helper.example.org` (must be `https://` unless it's `localhost`).
2. *Access code*: if you set one.
3. Click **Test the connection** — it should say *Connected! AI: ready*.
4. The person ticks **"I understand and agree…"** and clicks **Save**. AI features stay off until they agree.

### Endpoints

| Method & path | Purpose |
|---|---|
| `GET /api/health` | Status: whether AI and Safe Browsing are configured |
| `POST /api/chat` | Assistant conversation (`messages`, optional page `context`) |
| `POST /api/explain-page` | Explain a page snapshot (`snapshot`, `question`) |
| `POST /api/explain-screenshot` | Explain a screenshot (`image` data URL, `question`) |
| `POST /api/review-message` | AI second opinion on a possibly-scam message |
| `POST /api/email` | `task`: `summarize` · `explain` · `draft` |
| `POST /api/check-url` | Safe Browsing lookup of one URL |

---

## 3. Development

There is no build step — the extension is plain HTML, CSS and JavaScript modules. Edit a file, then click **reload** on `chrome://extensions` (and reopen the popup or dashboard).

```bash
npm install                # installs Playwright for the browser tests (root folder)
npm test                   # engine + backend unit tests
npm run test:e2e           # loads the real extension in Chromium and runs the senior scenarios
npm run icons              # re-render icons from the SVG
```

Useful places to extend:

| To add… | Edit |
|---|---|
| A lesson | `extension/data/tutorials.js` (steps support Windows/Mac/Chromebook variants and keyboard keys) |
| A website in the directory | `extension/data/sites.js` — **only official addresses you have verified** |
| An emergency pathway | `extension/data/emergency.js` |
| A scam rule | `RULES` in `extension/engine/scam-engine.js`, plus a test in `tests/engine.test.mjs` |
| A built-in helper topic | Answer + label in `extension/data/assistant-knowledge.js`, example phrases in `tools/intent-data.mjs`, then `npm run train` (prints accuracy on held-out phrases and writes `extension/data/intent-model.json`) |
| A dashboard section | a new `extension/dashboard/views/<name>.js` exporting `{ title, render(el, ctx) }`, registered in `dashboard/app.js` |

### Publishing to the Chrome Web Store

Zip the **contents** of `extension/` and upload it in the Chrome Web Store Developer Dashboard. In the privacy section, declare: no data sold; page content is read only on user action (or with the optional all-sites permission); optional AI processing via the user-configured helper server. Reuse `docs/PRIVACY.md` for the privacy policy.
