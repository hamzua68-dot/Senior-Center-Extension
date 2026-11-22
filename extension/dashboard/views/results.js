// Shared rendering for scam-check results (messages, links) — plain English, never "guaranteed safe".
import { html, esc, verdictBox, raw } from "../../shared/ui.js";
import { ico } from "./common.js";

const LIMITS = "Automatic checks can miss new scams. When something asks for money, passwords or personal details, check with the company or person using contact details you already trust.";

export function messageResult(r, { aiSecondOpinion = true, shareable = true } = {}) {
  const reasons = r.reasons.slice(0, 8);
  return html`
    ${verdictBox(r.level, html`<p>${r.summary}</p>`)}
    <div class="two-col">
      <div class="card">
        <h2>${r.level === "green" ? "What I checked" : "Why I'm warning you"}</h2>
        ${reasons.length
          ? html`<ul class="reason-list">${reasons.map((x) => html`<li>${x.text}${x.quote ? html` <span class="muted">(“${x.quote}”)</span>` : ""}</li>`)}</ul>`
          : html`<p>I looked for pressure to act fast, threats, requests for money, gift cards, passwords or personal details, fake sender addresses and dangerous links — and didn't find them.</p>`}
      </div>
      <div class="card">
        <h2>What to do now</h2>
        <ul class="reason-list">${r.advice.map((a) => html`<li>${a}</li>`)}</ul>
      </div>
    </div>
    ${r.links.length ? html`
      <div class="card">
        <h2>Links in this message (${r.links.length})</h2>
        <p class="muted">I checked these addresses without opening them.</p>
        ${r.links.map((l) => html`
          <div class="link-detail">
            <span class="badge" style="border-color:var(--${l.level === "red" ? "danger" : l.level === "yellow" ? "caution" : "safe"})">${l.level === "red" ? "Red — dangerous" : l.level === "yellow" ? "Yellow — be careful" : "Green — no obvious signs"}</span>
            <code>${l.url}</code>
            ${l.reasons.length ? html`<ul class="reason-list">${l.reasons.slice(0, 3).map((x) => html`<li>${x.text}</li>`)}</ul>` : ""}
          </div>`)}
      </div>` : ""}
    ${r.attachments.length ? html`
      <div class="card"><h2>Attachments</h2><ul class="reason-list">${r.attachments.map((a) => html`<li>${a.text}</li>`)}</ul></div>` : ""}
    ${r.phones.length ? html`
      <div class="card"><h2>Phone numbers in this message</h2>
        <p>${r.phones.join(", ")}</p>
        <p>${r.level === "green" ? "If you need to call, it's safest to use a number you find yourself on the company's official website or your statement." : "Don't call these numbers. Phone numbers in scam messages connect you to the scammers. Find the real number on your card, statement or the official website."}</p>
      </div>` : ""}
    <p class="muted">${LIMITS}</p>
    <div class="btn-row">
      ${aiSecondOpinion ? html`<button type="button" class="btn" data-act="ai-review">${ico("chat")} Ask the AI helper for a second opinion</button>` : ""}
      ${shareable ? html`<a class="btn" href="#/family/share?from=check">${ico("family")} Ask my family to check this</a>` : ""}
      ${r.level !== "green" ? html`<a class="btn btn-quiet" href="#/emergency">${ico("alert")} I already clicked or replied</a>` : ""}
    </div>
    <div id="ai-review" aria-live="polite"></div>`;
}

export function urlResult(r, reputation) {
  const title = !r.valid ? "I couldn't read that address" : undefined;
  let rep = "";
  if (reputation && reputation.configured) {
    rep = reputation.dangerous
      ? html`<li><strong>This address is on a list of known dangerous websites</strong> (${(reputation.threats || []).join(", ").toLowerCase().replace(/_/g, " ") || "reported as harmful"}).</li>`
      : html`<li>It is not on the known-dangerous-websites list I checked (that list can't include brand-new scam sites).</li>`;
  }
  const level = reputation && reputation.dangerous ? "red" : r.level;
  return html`
    ${verdictBox(level, html`<p>${r.host ? html`Website: <strong>${r.host}</strong>${r.official ? html` — this matches the real address for ${raw(esc(window.EasyAccessEngine.brandName(r.official)))}.` : ""}` : ""}</p>`, title)}
    <div class="card">
      <h2>${level === "green" ? "What I found" : "Why I'm warning you"}</h2>
      <ul class="reason-list">
        ${rep}
        ${r.reasons.length ? r.reasons.map((x) => html`<li>${x.text}</li>`) : html`<li>The address doesn't use the usual tricks (misspelled company names, hidden addresses, numbers instead of a name, or risky file downloads).</li>`}
      </ul>
    </div>
    <div class="card">
      <h2>What to do now</h2>
      <ul class="reason-list">
        ${level === "red" ? html`<li>Don't open this link. If you already did, close the page and don't type anything into it.</li><li>If it came in a message claiming to be a company, contact the company using its official website or the number on your card.</li>`
          : level === "yellow" ? html`<li>Only open it if you were expecting it from someone you trust.</li><li>Safer choice: type the company's address yourself instead of clicking.</li>`
          : html`<li>I didn't find obvious warning signs. That's not a guarantee — still be careful about typing passwords or card details, especially if the link came in an unexpected message.</li>`}
      </ul>
    </div>
    <p class="muted">${LIMITS}</p>`;
}
