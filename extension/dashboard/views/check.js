import { html, toast } from "../../shared/ui.js";
import { getValue, setValue, session } from "../../shared/storage.js";
import { checkUrlReputation, reviewMessage, aiStatus } from "../../shared/ai-client.js";
import { tile, on, ico } from "./common.js";
import { messageResult, urlResult } from "./results.js";

const E = () => window.EasyAccessEngine;

const SCAM_TYPES = [
  { t: "Fake virus alerts & tech support", d: "A website or pop-up says your computer is infected and shows a phone number. Microsoft, Apple and Google never do this. Close the page; never call." },
  { t: "Fake bank or account warnings", d: "\"Your account is suspended — click here.\" Banks don't ask you to sign in through email links. Call the number on your card." },
  { t: "Fake delivery messages", d: "A text says a package is held and asks for a small fee. Track packages only on the delivery company's own website." },
  { t: "Government impostors", d: "Callers claiming to be Social Security, IRS or Medicare who threaten arrest or ask for payment. Agencies don't do this." },
  { t: "Grandparent / family emergency", d: "\"Grandma, I'm in trouble, don't tell Mom.\" Voices can be copied by computers. Call your family member back on their usual number." },
  { t: "Romance & friendship scams", d: "A new online friend who is always far away, can't video call, and eventually needs money. Never send money to someone you've only met online." },
  { t: "Prize, lottery & inheritance", d: "You \"won\" something you never entered, but must pay a fee. Real prizes never cost money." },
  { t: "Gift card payment requests", d: "Anyone asking you to pay with gift cards is a scammer. No exceptions." },
  { t: "Investment & cryptocurrency", d: "Guaranteed high returns, crypto \"opportunities\", or a Bitcoin ATM. Real investments always have risk." },
  { t: "Fake Amazon orders & renewals", d: "\"Your $499 order\" or \"Norton renewal\" with a number to call to cancel. Check your account yourself instead." },
  { t: "Fake customer service numbers", d: "Search results and adverts can show fake support numbers. Use the number from the company's own website or your bill." },
  { t: "QR code scams", d: "QR codes on parking meters, letters or emails can lead to fake payment pages. Check the address before entering details." },
  { t: "Fake job offers", d: "Easy money for little work, or a check to deposit and send part back. The check will bounce." },
  { t: "Social media impostors", d: "Fake profiles copying friends, or celebrities offering prizes. Check with the real person another way." },
  { t: "AI voice & video impostors", d: "Computer-made voices and videos that look and sound like people you know. Agree a family safe word." },
];

export default {
  title: "Check before you click",
  async render(el, ctx) {
    const sub = ctx.params[0] || "";
    if (sub === "message") return renderMessage(el, ctx);
    if (sub === "link") return renderLink(el, ctx);
    if (sub === "phone") return renderPhone(el, ctx);
    if (sub === "shopping") return renderShopping(el, ctx);
    if (sub === "scams") return renderScamTypes(el, ctx);
    el.innerHTML = String(html`
      ${ctx.pageHeader("Check before you click", "Not sure if something is real? Check it here first. Nothing you check is opened or clicked.")}
      <div class="tile-grid">
        ${tile({ href: "#/check/message", iconName: "mail", title: "Check an email or message", desc: "Paste an email, text message or social media message." })}
        ${tile({ href: "#/check/link", iconName: "link", title: "Check a link or website address", desc: "Find out if an address looks dangerous — without visiting it." })}
        ${tile({ href: "#/screen", iconName: "eye", title: "Check the website I'm on", desc: "Is this website real? Is this pop-up real?" })}
        ${tile({ href: "#/email", iconName: "mail", title: "Is my Gmail email safe?", desc: "Check the email you have open in Gmail." })}
        ${tile({ href: "#/check/phone", iconName: "phone", title: "Check a phone call or number", desc: "Someone called or texted you. Is it real?" })}
        ${tile({ href: "#/check/shopping", iconName: "cart", title: "Is this online shop real?", desc: "Signs of fake shops and too-good-to-be-true deals." })}
        ${tile({ href: "#/check/link?qr=1", iconName: "search", title: "Check a QR code's address", desc: "Type the address your phone shows after scanning." })}
        ${tile({ href: "#/check/scams", iconName: "book", title: "Learn the common scams", desc: "Short descriptions of today's most common tricks." })}
      </div>
      <div class="notice notice-info" style="margin-top:1.5rem"><strong>Remember:</strong> a check can only find warning signs. It can't promise something is safe. If a message asks for money, passwords or personal details, always check with the sender in another way.</div>
    `);
  },
};

async function renderMessage(el, ctx) {
  const pending = await getValue("pendingCheckText", "", session);
  if (pending) await setValue("pendingCheckText", "", session);
  el.innerHTML = String(html`
    ${ctx.pageHeader("Check an email or message", "Copy the message and paste it below. Don't worry about getting it perfect.")}
    <form id="f" class="card">
      <div class="field">
        <label for="sender">Who is it from? <span class="muted">(optional)</span></label>
        <p class="hint">The sender's email address or phone number, for example: Bank Support &lt;alerts@example.com&gt;</p>
        <input id="sender" type="text" autocomplete="off">
      </div>
      <div class="field">
        <label for="subject">Subject <span class="muted">(optional)</span></label>
        <input id="subject" type="text" autocomplete="off">
      </div>
      <div class="field">
        <label for="text">The message</label>
        <p class="hint">How to paste: click in the box, then hold <span class="kbd">Ctrl</span> and press <span class="kbd">V</span> (on a Mac: <span class="kbd">⌘</span> + <span class="kbd">V</span>).</p>
        <textarea id="text" required></textarea>
      </div>
      <div class="field">
        <label for="att">Attachment names <span class="muted">(optional — for example "invoice.zip")</span></label>
        <input id="att" type="text" autocomplete="off">
      </div>
      <button class="btn btn-primary btn-lg" type="submit">${ico("shieldCheck")} Check this message</button>
    </form>
    <div id="result" aria-live="polite"></div>
  `);
  const ta = el.querySelector("#text");
  ta.value = pending;
  const resultEl = el.querySelector("#result");
  let last = null;
  const run = async () => {
    const input = { text: ta.value, sender: el.querySelector("#sender").value, subject: el.querySelector("#subject").value, attachments: el.querySelector("#att").value.split(/[,;]/).map((s) => s.trim()).filter(Boolean) };
    if (!input.text.trim() && !input.sender.trim()) { toast("Please paste the message first."); ta.focus(); return; }
    last = { input, result: E().analyzeMessage(input) };
    await setValue("lastCheck", { kind: "message", ...input, level: last.result.level, summary: last.result.summary, at: Date.now() }, session);
    resultEl.innerHTML = String(messageResult(last.result));
    resultEl.querySelector(".verdict").scrollIntoView({ block: "start" });
  };
  el.querySelector("#f").addEventListener("submit", (e) => { e.preventDefault(); run(); });
  on(el, "click", "[data-act=ai-review]", async (e, btn) => {
    const out = el.querySelector("#ai-review");
    const st = await aiStatus();
    if (!st.ready) { out.innerHTML = String(html`<div class="notice">The AI helper isn't turned on. A family member can set it up in <a href="#/settings">Settings</a>. The check above was done on your computer and is still useful.</div>`); return; }
    btn.disabled = true;
    out.innerHTML = '<p class="spinner-text">Asking the AI helper</p>';
    try {
      const reply = await reviewMessage({ ...last.input, localVerdict: last.result.level });
      out.innerHTML = String(html`<div class="card"><h2>AI helper's second opinion</h2>${reply.split(/\n{2,}/).map((p) => html`<p>${p}</p>`)}<p class="muted">AI can make mistakes too. When in doubt, don't act on the message.</p></div>`);
    } catch (err) {
      out.innerHTML = String(html`<div class="notice">${err.message}</div>`);
    } finally { btn.disabled = false; }
  });
  if (pending) run();
}

async function renderLink(el, ctx) {
  const qr = ctx.query.get("qr");
  const initial = ctx.query.get("url") || "";
  el.innerHTML = String(html`
    ${ctx.pageHeader(qr ? "Check a QR code's address" : "Check a link or website address", qr
      ? "When you scan a QR code with your phone camera, it shows a website address before opening it. Type that address here — don't open it yet."
      : "Type or paste the address. I'll check it without visiting the website.")}
    <form id="f" class="card">
      <label for="url">Website address</label>
      <p class="hint">For example: www.example.com/login — tip: right-click a link and choose "Copy link address", then paste it here.</p>
      <input id="url" type="text" inputmode="url" autocomplete="off" spellcheck="false" value="${initial}">
      <div class="btn-row"><button class="btn btn-primary btn-lg" type="submit">${ico("shieldCheck")} Check this address</button></div>
    </form>
    <div id="result" aria-live="polite"></div>
    ${qr ? html`<div class="card"><h2>QR code safety tips</h2><ul class="reason-list">
      <li>Be careful with QR codes stuck on parking meters, posters or sent in unexpected letters and emails — scammers cover real codes with fake ones.</li>
      <li>After scanning, look at the address shown before opening it.</li>
      <li>Never enter payment details on a page opened from a QR code unless you're sure it's the real company.</li></ul></div>` : ""}
  `);
  const resultEl = el.querySelector("#result");
  const run = async () => {
    const value = el.querySelector("#url").value.trim();
    if (!value) { toast("Please type or paste an address first."); return; }
    const r = E().analyzeUrl(value);
    resultEl.innerHTML = String(urlResult(r, null));
    const rep = r.valid && r.href ? await checkUrlReputation(r.href) : null;
    if (rep && rep.configured) resultEl.innerHTML = String(urlResult(r, rep));
    await setValue("lastCheck", { kind: "link", text: value, level: rep && rep.dangerous ? "red" : r.level, at: Date.now() }, session);
  };
  el.querySelector("#f").addEventListener("submit", (e) => { e.preventDefault(); run(); });
  if (initial) run();
}

function renderPhone(el, ctx) {
  el.innerHTML = String(html`
    ${ctx.pageHeader("Check a phone call or text", "Phone numbers can be faked, so I can't tell who really called. But I can help you spot the warning signs.")}
    <div class="card">
      <h2>Hang up or stop replying if the caller…</h2>
      <ul class="reason-list">
        <li>Says you owe money, or that you'll be arrested or lose benefits.</li>
        <li>Asks for payment by gift card, wire transfer, cryptocurrency or a payment app.</li>
        <li>Asks for your Social Security number, bank details, passwords or a code sent to your phone.</li>
        <li>Wants to connect to your computer, or asks you to install an app.</li>
        <li>Says it's a family member in trouble who needs money and wants it kept secret.</li>
        <li>Pressures you to act right now and stay on the line.</li>
      </ul>
    </div>
    <div class="card">
      <h2>How to check safely</h2>
      <ol class="steps-list">
        <li>Hang up. It's not rude — real organisations understand.</li>
        <li>Find the official number yourself: on the back of your card, a paper statement, or the official website (for government: websites ending in .gov).</li>
        <li>Call that number and ask if they contacted you.</li>
        <li>For family: call them on the number you already have, or ask another relative.</li>
      </ol>
      <p>Don't trust caller ID — scammers can make any name or number appear, even your bank's.</p>
    </div>
    <div class="card">
      <h2>Got a text message? Check its words here</h2>
      <a class="btn btn-primary" href="#/check/message">${ico("chat")} Check a message</a>
    </div>
    <div class="btn-row">
      <a class="btn" href="#/emergency/phone-call">${ico("alert")} I already gave them information</a>
      <a class="btn btn-quiet" href="https://www.donotcall.gov/" target="_blank" rel="noopener noreferrer">${ico("globe")} Reduce sales calls (donotcall.gov)</a>
    </div>`);
}

function renderShopping(el, ctx) {
  el.innerHTML = String(html`
    ${ctx.pageHeader("Is this online shop real?", "Fake shops often appear in social media adverts with amazing prices. Here's how to check before you buy.")}
    <div class="two-col">
      <div class="card"><h2>Warning signs</h2><ul class="reason-list">
        <li>Prices that are much lower than everywhere else.</li>
        <li>The shop only accepts payment by bank transfer, gift card, cryptocurrency or payment apps like Zelle.</li>
        <li>No real address or phone number, or only a contact form.</li>
        <li>The website is brand new, has spelling mistakes, or the address doesn't match the shop's name.</li>
        <li>Reviews only on the shop's own website — none elsewhere.</li>
        <li>Countdown timers and "only 2 left!" pressure.</li>
      </ul></div>
      <div class="card"><h2>Safer shopping</h2><ul class="reason-list">
        <li>Buy from shops you know, by typing their address yourself.</li>
        <li>Pay by credit card — it gives you the most protection if something goes wrong.</li>
        <li>Search for the shop's name plus the word "scam" or "reviews" before buying.</li>
        <li>Check the address bar: does it match the real company?</li>
      </ul></div>
    </div>
    <div class="btn-row">
      <a class="btn btn-primary" href="#/check/link">${ico("link")} Check the shop's address</a>
      <a class="btn" href="#/screen">${ico("eye")} Check the shop I'm on now</a>
    </div>`);
}

function renderScamTypes(el, ctx) {
  el.innerHTML = String(html`
    ${ctx.pageHeader("Learn the common scams", "Knowing the tricks is the best protection. Scammers are clever — anyone can be fooled, so it's always okay to double-check.")}
    <div class="tile-grid" style="--tile-min:18rem">
      ${SCAM_TYPES.map((s) => html`<div class="card" style="margin:0"><h2 style="font-size:1.15rem">${s.t}</h2><p>${s.d}</p></div>`)}
    </div>
    <div class="btn-row"><a class="btn btn-primary" href="#/security/quiz">${ico("quiz")} Test yourself with the scam quiz</a></div>`);
}
