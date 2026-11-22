# EasyAccess — Privacy, Security and Responsible AI

EasyAccess is built for people who are often targeted by scammers. Privacy and safety decisions err on the side of caution.

## What EasyAccess stores, and where

Everything is stored **only in Chrome on this computer** (`chrome.storage`). Nothing is synced to an EasyAccess server — there isn't one by default.

| Data | Where | How long |
|---|---|---|
| Settings (text size, colours, voice, helper server address, consent) | `chrome.storage.local` | Until changed or erased |
| Favourite and custom websites | local | Until removed |
| Trusted people (name, relationship, email/phone, optional video link, confirmation code) | local | Until removed |
| Sharing record (what was shared, with whom, when — not the content) | local | Until cleared (max 200 entries) |
| Reminders, checklist ticks, emergency-step ticks | local | Until removed |
| Last page snapshot, screenshot, checked email/message, assistant conversation | `chrome.storage.session` | **Cleared when Chrome closes** |

**Settings → Delete everything EasyAccess has saved** erases all of it and removes the optional all-sites permission.

EasyAccess **never** stores passwords, card numbers, bank credentials or Social Security numbers. It never reads what a person types into website fields: page snapshots record only the *kind* of field (for example "password box"), never its value.

## When a web page is read

- **On request only**: clicking the EasyAccess button grants Chrome's `activeTab` permission for that tab alone, then EasyAccess reads the visible page (headings, buttons, form labels, pop-ups, text) to explain it.
- **Right-click menu**: same as above, for the chosen action only.
- **Optional "Protect me on every website"**: only if the person turns it on (Chrome shows its own permission prompt). The guard script runs locally on each page to spot dangerous links, fake virus alerts and password boxes on look-alike sites. It sends nothing anywhere, except: if a helper server is configured with Safe Browsing *and* that option is on, the **address** of a page being explained may be checked against threat lists.

## What leaves the computer

| Action | Sent to | Sent only when |
|---|---|---|
| Scam checks (messages, links, pages) | **Nowhere** — runs locally | — |
| AI question / explanation / email help | The helper server configured in Settings, which forwards it to Anthropic's Claude API | A server address is set **and** the person ticked the consent box. Screenshots additionally require a confirmation each time. |
| Threat-list lookup | Helper server → Google Safe Browsing (website address only) | A server is configured with a Safe Browsing key and the option is on |
| Sharing with family | The person's own email program (`mailto:`) or clipboard | After reviewing the exact content and ticking "I've checked this" |

The helper server:
- does not log or store request content (only method, path, status and error type),
- strips things that look like card numbers and Social Security numbers before forwarding,
- rejects requests from websites (CORS + `ALLOWED_ORIGINS`), supports an access code, and rate-limits,
- requires HTTPS from the extension (except `localhost`).

Anthropic's handling of API data is governed by its commercial terms and privacy policy. Operators should review them before deploying.

## Chrome permissions (least privilege)

| Permission | Why |
|---|---|
| `storage` | Save settings locally |
| `activeTab` | Read the current tab only after a click |
| `scripting` | Inject the page reader / read-aloud bar into that tab |
| `contextMenus` | Right-click actions |
| `alarms` | Reminders |
| `<all_urls>` — **optional** | Only for "Protect me on every website"; requested at runtime, revocable |

Not requested: `tabs`, `history`, `cookies`, `webRequest`, `downloads`, `identity`, `notifications`, `clipboardRead`.

## Security design

- **Manifest V3** with a strict extension CSP (`script-src 'self'`, no inline scripts, no `eval`, no remote code).
- **No untrusted HTML**: all page and user text is escaped (`esc()` / `html```) or set with `textContent`. Page-reading functions are self-contained and read-only.
- **In-page UI uses closed shadow DOM**, so websites can't restyle or read EasyAccess warnings.
- **No API keys in the extension.** All keys live on the helper server.
- **Never acts for the person**: no clicking, form filling, purchases, sending, forwarding or deleting. Even "Open it anyway" on a warning needs two confirmations.
- **No remote control** feature. Family sharing is review-then-send through the person's own email.
- Links are analysed **without visiting them**.

## Responsible AI

- AI is optional, off by default, and requires informed consent.
- The AI is instructed never to request passwords, codes, card or Social Security numbers; never to say something is guaranteed safe; never to encourage payments, gift cards, crypto or remote access; and to point to official resources in emergencies.
- AI never makes decisions or takes actions — it only explains. It cannot send emails, transfer money or enter information.
- The local rule-based checks always run, independently of AI. The UI says plainly that AI and automated checks can be wrong.
- Model refusals are turned into a kind message pointing to the bank and the National Elder Fraud Hotline.

## Limitations (stated honestly in the app)

- Rule-based detection catches common patterns, not every scam. New scam sites and well-written messages can pass. A green result means "no obvious warning signs", never "safe".
- The look-alike check covers major brands, banks, carriers and agencies; it can't know every legitimate company.
- Gmail reading relies on Gmail's page structure and may need updating if Gmail changes.
- Speech features depend on the voices and speech recognition available in Chrome on that computer.
- Phone numbers can't be verified; EasyAccess teaches how to verify calls safely instead.
