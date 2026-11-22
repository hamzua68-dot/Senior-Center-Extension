import { html, verdictBox, toast, formatDate } from "../../shared/ui.js";
import { getValue, setValue, session } from "../../shared/storage.js";
import { aiStatus, explainPage, explainScreenshot, checkUrlReputation } from "../../shared/ai-client.js";
import { say, stopSpeaking } from "../../shared/speech.js";
import { on, ico, sendToBackground, hasChromeApis } from "./common.js";

const QUESTIONS = [
  { id: "asking", label: "What is this website asking me?" },
  { id: "buttons", label: "What do these buttons do?" },
  { id: "real", label: "Is this message or warning real?" },
  { id: "next", label: "What should I click next?" },
  { id: "personal", label: "Is this asking for personal information?" },
  { id: "safe-enter", label: "Is it safe to enter my information here?" },
];

function answerFor(id, x) {
  const a = x.analysis;
  switch (id) {
    case "asking":
      return html`<p>${x.kindText}</p>${x.asks.length ? html`<ul class="reason-list">${x.asks.map((q) => html`<li>${q.text}</li>`)}</ul>` : html`<p>It isn't asking you to fill anything in right now.</p>`}`;
    case "buttons":
      return x.buttons.length
        ? html`<ul class="list-plain">${x.buttons.map((b) => html`<li><strong>"${b.text}"</strong>${b.risky ? html` <span class="badge" style="border-color:var(--danger)">Be careful</span>` : b.optional ? html` <span class="badge">Optional</span>` : ""}<br>${b.meaning}</li>`)}</ul>`
        : html`<p>I didn't find common buttons I can explain on this page. You can ask the AI helper below, or ask your family.</p>`;
    case "real":
      if (x.analysis.fakeAlert) return html`<p><strong>This looks like a FAKE warning.</strong> Your computer has not been confirmed to have a virus. Do not call any phone number shown, and don't let anyone connect to your computer. Close the tab (Ctrl + W, or Command + W on a Mac). If it won't close, restart your computer.</p>`;
      return html`<p>${x.verdictText}</p>${x.warnings.length ? html`<ul class="reason-list">${x.warnings.map((w) => html`<li>${w}</li>`)}</ul>` : html`<p>No check can promise a page is genuine. If it asks for money or personal details, contact the company in another way to confirm.</p>`}`;
    case "next":
      return html`<ol class="steps-list">${x.nextSteps.map((s) => html`<li>${s}</li>`)}</ol>`;
    case "personal": {
      const sensitive = x.asks.filter((q) => q.sensitive);
      const personal = x.asks.filter((q) => ["email", "phone", "address", "name", "dob"].includes(q.kind));
      if (!sensitive.length && !personal.length) return html`<p>No — I don't see boxes asking for personal information on this page right now.</p>`;
      return html`<p>Yes. ${[...sensitive, ...personal].map((q) => q.text).join(" ")}</p>${sensitive.length ? html`<p><strong>Passwords, card numbers, Social Security numbers and phone codes are the most sensitive.</strong> Only enter them on a website you went to yourself, with the correct address.</p>` : ""}`;
    }
    case "safe-enter":
      return html`<p>${x.safeToEnter}</p>${a.url.host ? html`<p>The website address is <strong>${a.url.host}</strong>${a.url.official ? html` — the real address for ${window.EasyAccessEngine.brandName(a.url.official)}.` : "."}</p>` : ""}`;
    default:
      return "";
  }
}

export default {
  title: "Understand my screen",
  async render(el, { pageHeader, query }) {
    const snap = await getValue("lastSnapshot", null, session);
    const shot = await getValue("lastScreenshot", null, session);
    const status = await aiStatus();

    if (!snap) {
      el.innerHTML = String(html`
        ${pageHeader("Understand my screen", "I can explain any website in plain English: what it is, what it's asking, which buttons are safe, and whether a warning is real.")}
        <div class="card">
          <h2>How to ask "What am I looking at?"</h2>
          <ol class="steps-list lesson-step">
            <li>Go to the website or pop-up you have a question about.</li>
            <li>Click the <strong>EasyAccess button</strong> (the blue shield) at the top-right corner of Chrome.</li>
            <li>Click <strong>"What am I looking at?"</strong></li>
          </ol>
          <p>Can't see the EasyAccess button? Click the jigsaw-puzzle piece at the top right of Chrome, then click the pin next to EasyAccess.</p>
          <p>You can also right-click anywhere on a web page and choose <strong>"EasyAccess: What am I looking at?"</strong></p>
        </div>
        ${hasChromeApis() ? html`<div class="card"><h2>Or explain the last website I was on</h2>
          <p>This needs "Protect me on every website" to be turned on in Settings.</p>
          <button type="button" class="btn btn-primary" id="last-tab">${ico("eye")} Explain the last website I was on</button>
          <p id="last-tab-msg" role="status"></p></div>` : ""}
      `);
      const btn = el.querySelector("#last-tab");
      btn && btn.addEventListener("click", async () => {
        const res = await sendToBackground({ type: "snapshot-last-tab" });
        if (res && res.ok) location.reload();
        else el.querySelector("#last-tab-msg").textContent = res && res.error === "no-permission"
          ? "EasyAccess doesn't have permission to look at other tabs. Please use the EasyAccess button on the website instead, or turn on \"Protect me on every website\" in Settings."
          : "I couldn't read that website. Please go to it and click the EasyAccess button there.";
      });
      return;
    }

    const x = window.EasyAccessExplainer.explainPage(snap);
    const rep = await checkUrlReputation(snap.url);
    if (rep && rep.dangerous) {
      x.verdict = "red";
      x.verdictText = "Warning: this website is on a list of known dangerous websites.";
      x.warnings.unshift("This website is on a list of known dangerous websites (Google Safe Browsing).");
    }
    const summary = `${x.kindText} ${x.site} ${x.about} ${x.verdictText} ${x.asks.map((a) => a.text).join(" ")} What to do: ${x.nextSteps.slice(0, 3).join(" ")}`;
    await setValue("lastExplanation", { title: snap.title, host: snap.host, summary, at: Date.now() }, session);

    el.innerHTML = String(html`
      ${pageHeader("What am I looking at?", "")}
      <p class="muted">Page checked: <strong>${snap.title || snap.host}</strong> · ${formatDate(snap.capturedAt)}</p>
      ${verdictBox(x.verdict, html`<p>${x.verdictText}</p>`)}
      <div class="card" id="summary">
        <h2>In plain English</h2>
        <p><strong>${x.kindText}</strong></p>
        <p>${x.site}</p>
        ${x.about ? html`<p>${x.about}</p>` : ""}
        ${x.warnings.length ? html`<h3>Warning signs</h3><ul class="reason-list">${x.warnings.map((w) => html`<li>${w}</li>`)}</ul>` : ""}
        <h3>What to do next</h3>
        <ol class="steps-list">${x.nextSteps.map((s) => html`<li>${s}</li>`)}</ol>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" id="speak">${ico("speaker")} Read this explanation aloud</button>
        <a class="btn" href="#/family/share?from=screen">${ico("family")} Ask my family about this page</a>
        <a class="btn btn-quiet" href="#/assistant?about=page">${ico("chat")} Ask a question about this page</a>
      </div>

      <h2 class="section-title">Ask about this page</h2>
      <div class="problem-list">${QUESTIONS.map((q) => html`<button type="button" class="btn" data-q="${q.id}" aria-expanded="false">${q.label}</button>`)}</div>
      <div id="answer" aria-live="polite" style="margin-top:1rem"></div>

      <div class="card" style="margin-top:1.5rem">
        <h2>Ask the AI helper anything about this page</h2>
        ${status.ready ? html`
          <p class="muted">The page's visible words (not anything you've typed into boxes) will be sent to the EasyAccess AI service.</p>
          <form id="ai-form"><label for="ai-q">Your question</label>
            <input id="ai-q" type="text" placeholder="For example: Which button do I press to download the form?">
            <div class="btn-row"><button class="btn btn-primary" type="submit">${ico("send")} Ask</button></div></form>
          <div id="ai-out" aria-live="polite"></div>`
        : html`<p>The AI helper isn't turned on, so I've explained the page using EasyAccess's built-in checks above. A family member can turn on the AI helper in <a href="#/settings">Settings</a> for more detailed answers.</p>`}
      </div>

      ${shot ? html`
        <div class="card">
          <h2>Picture of your screen</h2>
          <p>You took this picture with EasyAccess. It stays on this computer unless you choose to send it.</p>
          <img class="screenshot" src="${shot.dataUrl}" alt="Picture of the website ${shot.title || ""}">
          <div class="btn-row">
            ${status.ready ? html`<button type="button" class="btn btn-primary" id="send-shot">${ico("send")} Send this picture to the AI helper to explain</button>` : ""}
            <a class="btn" href="#/family/share?from=screenshot">${ico("family")} Share with my family</a>
            <button type="button" class="btn btn-quiet" id="del-shot">${ico("trash")} Delete this picture</button>
          </div>
          <div id="shot-out" aria-live="polite"></div>
        </div>` : html`<p class="muted">Tip: in the EasyAccess button menu, choose "Take a picture of my screen" if you'd like help with how the page looks.</p>`}
    `);

    el.querySelector("#speak").addEventListener("click", () => say(el.querySelector("#summary").innerText));
    on(el, "click", "[data-q]", (e, b) => {
      el.querySelectorAll("[data-q]").forEach((x2) => x2.setAttribute("aria-expanded", String(x2 === b)));
      const ans = el.querySelector("#answer");
      ans.innerHTML = String(html`<div class="card"><h3>${b.textContent}</h3><div id="answer-body">${answerFor(b.dataset.q, x)}</div>
        <button type="button" class="btn btn-quiet" id="speak-answer">${ico("speaker")} Read aloud</button></div>`);
      ans.querySelector("#speak-answer").addEventListener("click", () => say(b.textContent + ". " + ans.querySelector("#answer-body").innerText));
      ans.scrollIntoView({ block: "nearest" });
    });
    const q = query.get("q");
    if (q) { const b = el.querySelector(`[data-q="${q}"]`); b && b.click(); }

    const aiForm = el.querySelector("#ai-form");
    aiForm && aiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const out = el.querySelector("#ai-out");
      out.innerHTML = '<p class="spinner-text">Asking the AI helper</p>';
      try {
        const reply = await explainPage(snap, el.querySelector("#ai-q").value);
        out.innerHTML = String(html`<div class="notice">${reply.split(/\n{2,}/).map((p) => html`<p>${p}</p>`)}</div>`);
      } catch (err) { out.innerHTML = String(html`<div class="notice">${err.message}</div>`); }
    });
    const sendShot = el.querySelector("#send-shot");
    sendShot && sendShot.addEventListener("click", async () => {
      if (!confirm("Send this picture of your screen to the EasyAccess AI service so it can explain it?\n\nCheck that the picture doesn't show passwords, bank details or private messages.")) return;
      const out = el.querySelector("#shot-out");
      out.innerHTML = '<p class="spinner-text">The AI helper is looking at the picture</p>';
      try {
        const reply = await explainScreenshot(shot.dataUrl, "What is on this screen and what should I do next?");
        out.innerHTML = String(html`<div class="notice">${reply.split(/\n{2,}/).map((p) => html`<p>${p}</p>`)}</div>`);
      } catch (err) { out.innerHTML = String(html`<div class="notice">${err.message}</div>`); }
    });
    const del = el.querySelector("#del-shot");
    del && del.addEventListener("click", async () => {
      await setValue("lastScreenshot", null, session);
      toast("The picture has been deleted.");
      location.reload();
    });
    return () => stopSpeaking();
  },
};
