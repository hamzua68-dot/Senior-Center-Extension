# Features that need API keys, servers, permissions or consent

Everything not listed as needing something works immediately after installing the extension, offline.

| Feature | AI API | Threat intel | Gmail auth | Extra permission | Backend | User consent | Status |
|---|---|---|---|---|---|---|---|
| Dashboard, settings, text size, themes, simple mode | – | – | – | – | – | – | ✅ Works |
| Step-by-step lessons (24), dictionary, quiz, checklist, security lessons | – | – | – | – | – | – | ✅ Works |
| Website directory & favourites | – | – | – | – | – | – | ✅ Works |
| Emergency help pathways (10) | – | – | – | – | – | – | ✅ Works |
| Scam check: pasted email / text / link / QR address | – | optional | – | – | optional | – | ✅ Works locally; Safe Browsing adds threat lists |
| "Is this page safe?" (current site colour) | – | optional | – | `activeTab` (on click) | optional | – | ✅ Works |
| What am I looking at? (page explanation) | optional | optional | – | `activeTab` (on click) | optional | AI: yes | ✅ Works locally; AI gives conversational answers |
| Screenshot help | **yes** (vision) | – | – | `activeTab` (on click) | **yes** | **yes, per picture** | ✅ Capture works; explanation needs AI |
| Is this Gmail email safe? | optional | – | **No** — reads the open email on click | `activeTab` | optional | – | ✅ Works (Gmail web) |
| Email: simplify, dates, actions, jargon, reply templates | optional | – | – | – | optional | AI: yes | ✅ Works locally; AI summaries/drafts optional |
| AI assistant (free-form questions) | **yes** | – | – | – | **yes** | **yes** | ✅ Built-in helper always works; AI needs setup |
| Voice answers / read aloud with highlighting | – | – | – | – | – | – | ✅ Uses Chrome speech |
| Voice questions | – | – | – | Microphone (Chrome prompt) | – | – | ✅ Where Chrome speech recognition is available (needs internet on most systems) |
| Link guard, fake-virus-alert banner, password-on-look-alike warning, badge, warning page | – | optional | – | **optional `<all_urls>`** | – | yes (turn on) | ✅ Works when enabled |
| Reminders | – | – | – | `alarms` | – | – | ✅ Opens a reminder page while Chrome runs |
| Trusted family: add, confirm by phone code, share, log, remove | – | – | – | – | – | per share | ✅ Via the person's own email program |
| Family relay inside the app (no email program needed) | – | – | – | – | would need a relay server | – | ❌ Not built — documented future work |
| Remote control by family | – | – | – | – | – | – | ❌ Deliberately not built (security) |
| Gmail API integration (inbox-wide scanning) | – | – | would need OAuth client ID | `identity` | – | – | ❌ Not built — on-click reading covers the main need with less access |

## Keys and where they go

| Key | Where | Never |
|---|---|---|
| `ANTHROPIC_API_KEY` | Helper server environment | In the extension, in git |
| `GOOGLE_SAFE_BROWSING_KEY` | Helper server environment | In the extension, in git |
| Access code | Helper server env + typed into EasyAccess Settings | Reused as a real password |
