# Testing EasyAccess

## Automated tests

```bash
npm install                 # once, in the project root (Playwright)
npx playwright install chromium   # once, downloads the browser used by the e2e tests
(cd backend && npm install) # once, for the backend tests
npm test                    # scam engine (19) + helper model (7) + backend with mock Claude (7) and Gemini (4) APIs
npm run test:e2e            # 21 browser tests with the real extension loaded in Chromium
```

| Suite | File | What it proves |
|---|---|---|
| Scam engine | `tests/engine.test.mjs` | Official sites are green; look-alikes, IP addresses, `@` tricks, punycode and program downloads are red; router/local addresses and normal `.html` pages aren't flagged; bank, fake-virus, grandparent, government, delivery, fake-invoice and romance messages are flagged; normal family/library/appointment messages stay green; page analysis spots fake alerts and password forms on look-alike sites. |
| Helper model | `tests/intent.test.mjs` | The machine-learning classifier understands held-out phrasings it never trained on (≥ 90%; currently 98.6%), typos and vague wording; every common-problem button is understood confidently; off-topic questions are recognised as "not understood"; on-device learning teaches a new phrase without breaking others. |
| Backend (Gemini) | `tests/backend-gemini.test.mjs` | Requests reach Gemini with the safety instructions, conversation history and screenshots as inline images; the key travels in a header, not the URL; card numbers are removed; Google safety blocks become a kind message. |
| Backend | `tests/backend.test.mjs` | Request shape sent to Claude (model, fallbacks, effort), redaction of card/SSN numbers, page and screenshot formatting, refusal handling, CORS refusal for websites, input validation. |
| End-to-end | `tests/e2e.test.mjs` | Loads the extension in Chromium and runs every section plus the senior scenarios below, the link guard, the warning page, the read-aloud bar, the popup, and the extension → helper server → (mock) Claude chain. Fails on any JavaScript error. Screenshots go to `docs/screenshots/` (set `EASYACCESS_SHOTS=0` to skip). |

The e2e suite uses a temporary copy of the extension with `<all_urls>` pre-granted, because automated tests can't click Chrome's permission prompt. The shipped manifest keeps it optional.

## Senior scenario checklist (Part 19)

Each scenario was walked through without technical knowledge. ✅ = covered by an automated test as well.

| # | Scenario | How EasyAccess handles it | Test |
|---|---|---|---|
| 1 | Email says bank account will be suspended | *Check before you click* or Gmail *Is this email safe?* → **Red**, plain reasons (fake sender, threat, urgency, password request, bad link), "call the number on your card". | ✅ |
| 2 | Pop-up claims the computer has a virus | Popup *Is this real?* or the guard banner → "This looks like a FAKE warning… don't call… close the tab (Ctrl+W)… restart if it won't close". | ✅ |
| 3 | Downloaded a document, can't find it | *I need help* → "can't find a file I downloaded" → one step (Ctrl+J) + *Show me step by step* lesson for their computer type. | ✅ |
| 4 | Confused by an online form | *What am I looking at?* → what it asks for (name, phone, date of birth…), what each button does (Accept all / Reject all / Submit), what's optional. | ✅ |
| 5 | Message from a "grandchild" | Red: family-emergency + gift-card + secrecy signs; "call them back on the number you already have; agree a safe word". | ✅ |
| 6 | Wants to video call family | *Help me connect* → one-click contacts and video links, plus guides for joining a call and turning the mic/camera on. | ✅ |
| 7 | Wants to understand what a website is asking | *What am I looking at?* → kind of page, real/fake site, what it asks, next steps; six quick questions; read aloud. | ✅ |
| 8 | Accidentally clicked a suspicious link | *Emergency help* → *I clicked a suspicious link* → calm, ordered steps that can be ticked off, plus official resources. | ✅ |
| 9 | Wants family to review an email | *Ask my family to check this* → choose person → see exactly what will be sent → tick to agree → own email program opens; logged. | ✅ |
| 10 | Text on a website is too small | *Bigger text* in the header, *Make everything easier to see*, and the Chrome zoom lesson (Ctrl and +). | ✅ |

Improvements made from this walk-through:
- Home-router and local addresses (192.168.x.x, localhost) were wrongly flagged → exempted.
- Ordinary `.html` pages were treated as risky downloads → only archives/programs are flagged for web addresses.
- The guard banner's invisible strip blocked clicks underneath → made click-through.
- The assistant matched "suspicious link" to the general scam answer → emergency answer now takes priority.

## Manual test checklist (before a release)

**Install & permissions**
- [ ] Load unpacked → welcome tour opens; no errors on `chrome://extensions` (click *Errors*).
- [ ] Turn on *Protect me on every website* → Chrome prompt appears; deny → switch turns back off with an explanation.
- [ ] Turn it off → permission is removed (check the extension's *Details* → Site access).

**Accessibility**
- [ ] All four text sizes; light, dark, high contrast; reduce motion.
- [ ] Keyboard only: Tab through home, a lesson (←/→ keys change steps), the scam checker, settings. Focus ring always visible.
- [ ] Screen reader (NVDA/VoiceOver/ChromeVox): page title announced on each page; verdicts announced; toggles have names.
- [ ] Read this page (header), lesson *Read aloud*, read-aloud bar on a news article (pause, slower, faster, skip, close).
- [ ] Voice question in *I need help* (microphone prompt → allow).

**Real sites**
- [ ] Gmail: open an email → popup *Is this email safe?* → explanation appears.
- [ ] A news article: *What am I looking at?* → "page for reading"; *Read this page to me* works.
- [ ] A shopping checkout page: payment page detected, buttons explained.
- [ ] Right-click a link → *Is this link safe?* opens the check without visiting it.

**AI (with the helper server running)**
- [ ] Settings → Test the connection → *Connected*. Without ticking consent, AI stays off.
- [ ] Ask a free-form question; ask about a page; send a screenshot (confirmation shown first); email draft appears in the editable box (never sent).

**Privacy**
- [ ] Settings → *Delete everything* → all lists empty, welcome tour shown, permission removed.
- [ ] Close and reopen Chrome → last snapshot/screenshot/conversation are gone (session storage).

Supported: Chrome 116+ on Windows, macOS, ChromeOS and Linux; Microsoft Edge (Chromium).
