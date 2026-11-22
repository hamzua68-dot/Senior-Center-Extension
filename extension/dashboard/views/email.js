import { html, toast, copyText } from "../../shared/ui.js";
import { getValue, setValue, session } from "../../shared/storage.js";
import { aiStatus, simplifyEmail } from "../../shared/ai-client.js";
import { say, stopSpeaking } from "../../shared/speech.js";
import { GLOSSARY } from "../../data/glossary.js";
import { on, ico, tile } from "./common.js";
import { messageResult } from "./results.js";

const JARGON = {
  "rsvp": "A request to reply and say whether you will come.",
  "invoice": "A bill asking for payment for goods or services.",
  "statement": "A summary of your account, such as money in and out.",
  "autopay": "Automatic payments taken from your account on a schedule.",
  "premium": "The regular amount you pay for insurance.",
  "deductible": "The amount you pay yourself before insurance starts paying.",
  "copay": "A fixed amount you pay for a doctor's visit or prescription.",
  "eob": "Explanation of Benefits — a summary from your insurer. It is NOT a bill.",
  "explanation of benefits": "A summary from your insurer of what they paid. It is NOT a bill.",
  "portal": "A private website area where you sign in to see your information (for example, a patient portal).",
  "unsubscribe": "A link to stop receiving emails from that sender.",
  "verification code": "A short code sent to your phone or email to prove it's you. Never share it with anyone.",
  "two-factor": "An extra security step after your password, usually a code sent to your phone.",
  "attachment": "A file sent with the email (shown with a paperclip).",
  "cc": "\"Carbon copy\" — other people who also received the email.",
  "bcc": "\"Blind carbon copy\" — hidden recipients.",
  "no-reply": "An address that can't receive replies.",
  "phishing": "A trick email pretending to be a company to steal information.",
  "ach": "A bank-to-bank electronic payment.",
  "routing number": "A number that identifies your bank. Don't share it with people who contact you out of the blue.",
  "pdf": "A common document format that opens in your browser.",
  "link": "Words or a button you can click to go to a web page.",
  "account suspended": "A phrase scammers often use to scare people. Check by signing in yourself, not through the email.",
};

const MONTHS = "(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)";
const DATE_RE = new RegExp(`\\b(${MONTHS}\\.? \\d{1,2}(st|nd|rd|th)?(,? \\d{4})?|\\d{1,2}(st|nd|rd|th)? (of )?${MONTHS}(,? \\d{4})?|\\d{1,2}/\\d{1,2}(/\\d{2,4})?|(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|today|tomorrow|tonight|this (week|weekend|morning|afternoon|evening)|next (week|month|monday|tuesday|wednesday|thursday|friday)|within \\d+ (hours|days))\\b(,? at \\d{1,2}(:\\d\\d)? ?(am|pm|a\\.m\\.|p\\.m\\.)?)?`, "gi");
const MONEY_RE = /\$\s?\d[\d,]*(\.\d\d)?/g;
const ACTION_RE = /\b(please|you (must|need to|should|have to)|required|reply|respond|call|click|pay|confirm|submit|sign|return|bring|send|log ?in|update|complete|schedule|rsvp|let (me|us) know|deadline|due)\b/i;

function sentences(text) {
  return String(text).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 2);
}

function simplifyLocally(text) {
  const sents = sentences(text);
  const dates = Array.from(new Set((text.match(DATE_RE) || []).map((d) => d.trim()))).slice(0, 8);
  const money = Array.from(new Set(text.match(MONEY_RE) || [])).slice(0, 6);
  const actions = sents.filter((s) => ACTION_RE.test(s)).slice(0, 6);
  const lower = text.toLowerCase();
  const terms = [];
  for (const [term, meaning] of Object.entries(JARGON)) if (new RegExp(`\\b${term.replace(/[-]/g, "[- ]?")}\\b`, "i").test(lower)) terms.push({ term, meaning });
  for (const g of GLOSSARY) {
    const key = g.term.split(" (")[0].toLowerCase();
    if (key.length > 3 && new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\b`, "i").test(lower) && !terms.some((t) => t.term === key)) terms.push({ term: g.term, meaning: g.meaning });
  }
  const gist = sents.slice(0, 2).join(" ");
  return { gist, dates, money, actions, terms: terms.slice(0, 8), length: sents.length };
}

const REPLY_TEMPLATES = [
  { id: "thanks", label: "Thank you", body: "Hello,\n\nThank you for your message. I received it.\n\nBest wishes," },
  { id: "yes", label: "Yes, I'll be there", body: "Hello,\n\nThank you for letting me know. Yes, I will be there.\n\nBest wishes," },
  { id: "no", label: "No, thank you", body: "Hello,\n\nThank you, but I'm not interested.\n\nBest wishes," },
  { id: "later", label: "I'll get back to you", body: "Hello,\n\nThank you for your message. I'll look into this and get back to you soon.\n\nBest wishes," },
  { id: "call", label: "Please call me", body: "Hello,\n\nThank you for your email. Could you please call me to talk about this? \n\nBest wishes," },
];

export default {
  title: "Help me with email",
  async render(el, ctx) {
    const sub = ctx.params[0] || "";
    const gmail = await getValue("lastEmail", null, session);
    if (sub === "") {
      el.innerHTML = String(html`
        ${ctx.pageHeader("Help me with email", "Understand an email in simple words, check if it's a scam, or learn how to reply. EasyAccess never sends, deletes or forwards emails for you.")}
        ${gmail ? html`<div class="notice notice-info"><strong>Email ready to check:</strong> "${gmail.subject || "(no subject)"}" from ${gmail.sender || "unknown sender"}.
          <div class="btn-row"><a class="btn btn-primary" href="#/email/open">${ico("eye")} Check and explain this email</a></div></div>` : ""}
        <div class="tile-grid">
          ${tile({ href: "#/email/paste", iconName: "file", title: "Explain an email in simple words", desc: "Paste an email to get a short summary, dates and what it asks you to do." })}
          ${tile({ href: "#/check/message", iconName: "shieldCheck", title: "Is this email a scam?", desc: "Check an email for warning signs." })}
          ${tile({ href: "#/email/gmail", iconName: "mail", title: "Check the email open in Gmail", desc: "How to check an email without copying it." })}
          ${tile({ href: "#/learn/email-basics", iconName: "send", title: "How to reply", desc: "Step-by-step guide." })}
          ${tile({ href: "#/learn/forward", iconName: "next", title: "How to forward", desc: "Send an email on to someone else." })}
          ${tile({ href: "#/learn/attach", iconName: "file", title: "How to attach a file", desc: "Send a picture or document." })}
        </div>`);
      return;
    }
    if (sub === "gmail") {
      el.innerHTML = String(html`
        ${ctx.pageHeader("Check the email open in Gmail", "EasyAccess can read the email you have open in Gmail — only when you ask.")}
        <div class="card"><ol class="steps-list lesson-step">
          <li>Open Gmail in Chrome (mail.google.com) and click on the email to open it.</li>
          <li>Click the <strong>EasyAccess button</strong> (blue shield) at the top right of Chrome.</li>
          <li>Click <strong>"Is this email safe?"</strong>. EasyAccess will check it and explain it here.</li>
        </ol>
        <p>Using Outlook, Yahoo or another email? Copy the email's words and use <a href="#/email/paste">Explain an email</a> or <a href="#/check/message">Is this email a scam?</a>.</p></div>
        <div class="btn-row"><a class="btn btn-primary" href="https://mail.google.com/" target="_blank" rel="noopener noreferrer">${ico("mail")} Open Gmail</a></div>`);
      return;
    }
    // "open" (from Gmail) or "paste"
    const fromGmail = sub === "open" && gmail;
    el.innerHTML = String(html`
      ${ctx.pageHeader(fromGmail ? "About this email" : "Explain an email in simple words", fromGmail ? "" : "Paste the email below. Nothing is sent anywhere unless you choose the AI helper.")}
      ${fromGmail ? html`<div class="card"><p><strong>From:</strong> ${gmail.sender || "unknown"}<br><strong>Subject:</strong> ${gmail.subject || "(no subject)"}</p></div>` : html`
        <form id="f" class="card">
          <label for="text">The email</label>
          <p class="hint">Click in the box, then hold <span class="kbd">Ctrl</span> and press <span class="kbd">V</span> to paste (<span class="kbd">⌘</span>+<span class="kbd">V</span> on a Mac).</p>
          <textarea id="text" required></textarea>
          <div class="btn-row"><button class="btn btn-primary btn-lg" type="submit">${ico("lightbulb")} Explain this email</button></div>
        </form>`}
      <div id="out" aria-live="polite"></div>`);

    const out = el.querySelector("#out");
    const show = async (input) => {
      const s = simplifyLocally(input.text);
      const scam = window.EasyAccessEngine.analyzeMessage(input);
      await setValue("lastCheck", { kind: "email", text: input.text.slice(0, 5000), sender: input.sender || "", subject: input.subject || "", level: scam.level, summary: scam.summary, at: Date.now() }, session);
      const st = await aiStatus();
      out.innerHTML = String(html`
        <div class="card" id="simple">
          <h2>In simple words</h2>
          <p>${s.gist || "This email is very short."}</p>
          ${s.actions.length ? html`<h3>What it asks you to do</h3><ul class="reason-list">${s.actions.map((a) => html`<li>${a}</li>`)}</ul>` : html`<p>It doesn't seem to ask you to do anything.</p>`}
          ${s.dates.length ? html`<h3>Important dates and times</h3><ul class="reason-list">${s.dates.map((d) => html`<li>${d}</li>`)}</ul>` : ""}
          ${s.money.length ? html`<h3>Money mentioned</h3><p>${s.money.join(", ")}</p>` : ""}
          ${input.attachments && input.attachments.length ? html`<h3>Attachments</h3><p>${input.attachments.join(", ")} — see the safety check below before opening.</p>` : ""}
          ${s.terms.length ? html`<h3>Words explained</h3><ul class="list-plain">${s.terms.map((t) => html`<li><strong>${t.term}</strong>: ${t.meaning}</li>`)}</ul>` : ""}
          <button type="button" class="btn btn-quiet" id="speak">${ico("speaker")} Read this aloud</button>
        </div>
        ${st.ready ? html`<div class="btn-row"><button type="button" class="btn" data-ai="summarize">${ico("chat")} Ask the AI helper to explain it more simply</button></div><div id="ai-out" aria-live="polite"></div>` : ""}
        <h2 class="section-title">Is it safe?</h2>
        ${messageResult(scam, { aiSecondOpinion: false })}
        <h2 class="section-title">Write a reply</h2>
        <div class="card">
          <p>Choose a starting point. You can change the words, then copy them into your email. <strong>EasyAccess never sends emails for you.</strong></p>
          ${scam.level === "red" ? html`<div class="notice"><strong>We don't recommend replying to this email</strong> — it has serious scam warning signs.</div>` : ""}
          <div class="problem-list">${REPLY_TEMPLATES.map((t) => html`<button type="button" class="btn" data-tpl="${t.id}">${t.label}</button>`)}
            ${st.ready ? html`<button type="button" class="btn" data-ai="draft">${ico("chat")} AI: suggest a reply</button>` : ""}</div>
          <div class="field" style="margin-top:1rem"><label for="draft">Your reply</label><textarea id="draft"></textarea></div>
          <div class="btn-row"><button type="button" class="btn btn-primary" id="copy">${ico("copy")} Copy my reply</button><a class="btn btn-quiet" href="#/learn/email-basics">How do I paste it into my email?</a></div>
        </div>`);
      out.querySelector("#speak").addEventListener("click", () => say(out.querySelector("#simple").innerText));
      out.querySelector("#copy").addEventListener("click", async () => {
        const ok = await copyText(out.querySelector("#draft").value);
        toast(ok ? "Copied! Now click in your email's reply box and press Ctrl + V (⌘ + V on a Mac)." : "Sorry, I couldn't copy it. Please select the words and copy them.");
      });
      on(out, "click", "[data-tpl]", (e, b) => { out.querySelector("#draft").value = REPLY_TEMPLATES.find((t) => t.id === b.dataset.tpl).body; });
      on(out, "click", "[data-ai]", async (e, b) => {
        const task = b.dataset.ai;
        const target = task === "draft" ? out.querySelector("#draft") : out.querySelector("#ai-out");
        b.disabled = true;
        if (task !== "draft") target.innerHTML = '<p class="spinner-text">Asking the AI helper</p>';
        try {
          const reply = await simplifyEmail(input.text, task);
          if (task === "draft") target.value = reply;
          else target.innerHTML = String(html`<div class="notice">${reply.split(/\n{2,}/).map((p) => html`<p>${p}</p>`)}</div>`);
        } catch (err) {
          if (task === "draft") toast(err.message, 6000); else target.innerHTML = String(html`<div class="notice">${err.message}</div>`);
        } finally { b.disabled = false; }
      });
      out.scrollIntoView({ block: "start" });
    };

    if (fromGmail) show({ text: gmail.text, sender: gmail.sender, subject: gmail.subject, attachments: gmail.attachments, linkPairs: gmail.links });
    else el.querySelector("#f").addEventListener("submit", (e) => { e.preventDefault(); const t = el.querySelector("#text").value; if (t.trim()) show({ text: t }); else toast("Please paste the email first."); });
    return () => stopSpeaking();
  },
};
