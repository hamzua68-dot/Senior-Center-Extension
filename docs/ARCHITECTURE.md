# EasyAccess — Dashboard Design & Technical Architecture

> "You don't have to understand computers. Just tell us what you need help with."

## 1. Design principles

| Challenge seniors face | Design answer in EasyAccess |
|---|---|
| Small text | Base text is never below 18px. Four sizes (18 / 20 / 23 / 27px) scale the whole UI via `rem`. |
| Hard-to-find buttons | Every action is a big tile (min. 64px tall) with an icon **and** words. |
| Changing layouts | One consistent layout everywhere: header → big title → plain-English intro → large choices → "Back" and "Home" always in the same place. |
| Jargon | Plain words ("website address" not "URL"). A built-in dictionary explains words that can't be avoided. |
| Fear of clicking something dangerous | EasyAccess **never** clicks, submits, pays or sends anything on its own. Risky actions get a calm, clear warning first. |
| Forgetting how to do tasks | Step-by-step lessons, one step per screen, with Back / Next / Repeat / Read aloud / "I'm still confused". |
| Scams | Green / Yellow / Red verdicts with a reason for each and "what to do now". Never "guaranteed safe". |

**Visual identity:** calm and trustworthy, like a well-designed banking or healthcare app, never dark or futuristic.

| Role | Colour | Contrast |
|---|---|---|
| Background | warm white `#f7f6f2` | — |
| Main text | deep navy `#1b2a41` | 13.9 : 1 |
| Primary actions | calm blue `#1f5fad` | 6.4 : 1 with white text |
| "I need help" | warm terracotta `#a84f22` | 5.4 : 1 with white text |
| Safe | muted green `#2e6b4a` | 6.3 : 1 |
| Emergency / danger | clear red `#b42318` | 6.2 : 1 |

- **Typeface:** Atkinson Hyperlegible Next (Braille Institute, bundled locally, SIL OFL), designed so similar letters (l/1/I, O/0) are easy to tell apart for low-vision readers. Body weight is slightly heavier than regular; headings are bold.
- **Targets:** buttons are 56–64px tall; the help and emergency buttons are larger still.
- **Never colour alone:** every status has an icon and words ("✓ No warning signs found", "✕ Warning signs found").
- **Focus:** a 3px dark ring with a light gap on every control.
- **Restraint:** light borders, very soft shadows, no gradients, glass effects or animation. Lists replace walls of cards where there are many choices.
- Optional dark mode is a soft slate (not black), and high-contrast mode is available for low vision. Checked with axe-core: 0 WCAG 2.2 AA violations across 22 screens in all three modes.

## 2. Dashboard layout

Home screen (what a first-time user sees without scrolling):

```
┌──────────────────────────────────────────────────────────────┐
│  [logo] EasyAccess     [Home] [Bigger text] [Read] [Settings]│
├──────────────────────────────────────────────────────────────┤
│  Good morning!                                               │
│  What would you like help with today?                        │
│  ┌──────────────────────────────────┐ ┌────────────────────┐ │
│  │ (?) I NEED HELP — show me what   │ │ /!\ Emergency help │ │
│  │     to do                        │ │ I think I've been  │ │
│  └──────────────────────────────────┘ │ scammed            │ │
│                                       └────────────────────┘ │
│  Most used                                                   │
│  [Check before you click] [Understand my screen] [Read to me]│
│  More ways I can help                                        │
│  │ Help me use my computer                              →  │ │
│  │ Help me with email                                   →  │ │
│  │ … (find websites, connect, security, family)        →  │ │
└──────────────────────────────────────────────────────────────┘
```

Original concept sketch:

```
┌──────────────────────────────────────────────────────────────┐
│  [logo] EasyAccess          [Aa Make text bigger] [⚙ Settings]│
├──────────────────────────────────────────────────────────────┤
│  Good morning! What would you like help with today?          │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  🧡  I NEED HELP — SHOW ME WHAT TO DO   (type / speak)   ││  ← largest element
│  └──────────────────────────────────────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ Check before│ │ Help me use │ │ Understand  │             │
│  │ you click   │ │ my computer │ │ my screen   │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ Help me     │ │ Find what   │ │ Read this   │             │
│  │ with email  │ │ I need      │ │ to me       │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ Help me     │ │ My security │ │ Trusted     │             │
│  │ connect     │ │ center      │ │ family help │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  ⚠  EMERGENCY HELP — I think I've been scammed          ││  ← red, always visible
│  └──────────────────────────────────────────────────────────┘│
│  My favourite websites:  [Gmail] [Medicare] [Weather] [+]    │
└──────────────────────────────────────────────────────────────┘
```

**Simple dashboard mode** shows only four tiles (I need help, Check before you click, Read this to me, Emergency).

The **toolbar popup** answers four questions from top to bottom: **(1) which website am I on** ("You are on medicare.gov"), **(2) are there warning signs** (icon + words + colour, with the reason), **(3) where is help** (the large "I need help" button, then *What am I looking at?*, *Is this page safe?*, *Read this page to me*, and *Is this email safe?* in Gmail), and **(4) where is emergency help** (a full-width red button, always at the bottom).

## 3. Technical architecture

```
                        ┌───────────────────────────── Chrome ──────────────────────────────┐
  User ──clicks──▶ Popup (popup/)  ──activeTab──▶ executeScript(snapshot / reader / gmail)   │
                   │                                  │ page text, buttons, forms           │
                   │ stores snapshot in               ▼                                     │
                   │ chrome.storage.session   Content (content/) — runs only with consent   │
                   ▼                           • reader.js   read-aloud with highlighting   │
            Dashboard (dashboard/) SPA         • guard.js    link + fake-alert protection   │
            hash router + views/*                            (optional, user-enabled)       │
                   │                                                                        │
                   │ uses ─▶ engine/scam-engine.js  (local rules: URLs, emails, pages)     │
                   │      ─▶ shared/* (settings, storage, speech, AI client, icons)        │
                   │                                                                        │
            Background service worker (background/) — context menus, protection on/off,    │
            badge colour, warning-page redirect, message router                             │
                   └──────────────────────────────────────────────────────────────────────┘
                   │ HTTPS (only if the user configures it AND agrees)
                   ▼
            EasyAccess backend (backend/server.mjs) ── Claude API or Google Gemini API (AI explanations)
                                                   └─ Google Safe Browsing (threat lists)
```

### Folder map

| Path | Purpose |
|---|---|
| `extension/manifest.json` | Manifest V3, least-privilege permissions |
| `extension/background/service-worker.js` | Context menus, message router, protection toggling, badge, warning redirects |
| `extension/popup/` | Toolbar popup — quick companion for the current page |
| `extension/dashboard/` | Full app: `dashboard.html`, `app.js` (router/shell), `views/*.js` (one file per section) |
| `extension/engine/scam-engine.js` | Rule-based scam/phishing analysis for URLs, messages and pages. UMD: works in pages, content scripts, the service worker and Node tests |
| `extension/engine/page-explainer.js` | Turns a page snapshot into a plain-English explanation |
| `extension/shared/page-snapshot.js` | Self-contained function injected into the page to read visible text, headings, buttons, forms, dialogs |
| `extension/shared/` | Settings, storage, speech (TTS + voice input), AI client, icons, UI helpers |
| `extension/content/reader.js` | Read-aloud toolbar with sentence highlighting, injected on request |
| `extension/content/guard.js` | Optional link guard and fake-virus-alert detector |
| `extension/data/` | Tutorials, verified website directory, emergency pathways, glossary, quiz, assistant knowledge |
| `extension/warning/` | Full-page "Stop — this website looks dangerous" screen |
| `backend/` | Optional Node server that keeps API keys out of the extension |

### Permissions (least privilege)

| Permission | Why | When |
|---|---|---|
| `storage` | Save settings, favourites, family contacts, sharing log | Always |
| `activeTab` | Read **only the tab the user is on, only after they click** EasyAccess or a right-click menu | On click |
| `scripting` | Inject the snapshot / reader into that tab | On click |
| `contextMenus` | Right-click "Read this aloud", "Check this link", "What am I looking at?" | Always |
| `optional_host_permissions: <all_urls>` | **Only if the user turns on "Protect me on every website"**: link guard, fake-alert detector, site colour badge | User opt-in, revocable |

No `tabs`, `history`, `cookies`, `webRequest`, `identity` or `downloads` permissions are requested.

### Feature → requirement matrix

| Feature | Works out of the box | Needs |
|---|---|---|
| Dashboard, settings, tutorials, directory, emergency guides, glossary, quiz | ✅ | — |
| Scam check of pasted emails / links / messages | ✅ local rules | Backend + AI for an optional second opinion |
| Website safety colour (current page) | ✅ local rules | Backend + `GOOGLE_SAFE_BROWSING_KEY` for threat lists |
| What am I looking at? (page text) | ✅ local explanation | Backend + AI for richer, conversational explanation |
| Screenshot explanation | Capture ✅ | Backend + AI (vision) + user consent per screenshot |
| Is this Gmail email safe? | ✅ reads the open email on click | — (no Gmail OAuth needed) |
| AI assistant chat | ✅ offline helper (built-in answers) | Backend + `ANTHROPIC_API_KEY` for free-form conversation |
| Read aloud / voice answers | ✅ Chrome speech | — |
| Voice questions | ✅ where Chrome speech recognition is available | Microphone permission |
| Link guard & fake alert detector | ✅ | User turns on "Protect me on every website" |
| Trusted family sharing | ✅ via the person's own email program, with review + log | A relay server would be needed for in-app delivery (not built) |
| Remote control by family | ❌ deliberately not built | Use a dedicated, reputable remote-help tool with in-person setup |
