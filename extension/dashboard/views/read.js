import { html, esc, toast } from "../../shared/ui.js";
import { getValue, setValue, session } from "../../shared/storage.js";
import { updateSettings } from "../../shared/settings.js";
import { createReader, getVoices, speechSupported } from "../../shared/speech.js";
import { aiStatus, simplifyEmail } from "../../shared/ai-client.js";
import { on, ico, sendToBackground, hasChromeApis } from "./common.js";

export default {
  title: "Read this to me",
  async render(el, ctx) {
    const s = ctx.settings;
    const lastEmail = await getValue("lastEmail", null, session);
    const lastSnap = await getValue("lastSnapshot", null, session);
    const pendingRead = await getValue("pendingReadText", "", session);
    const voices = speechSupported() ? (await getVoices()).filter((v) => v.lang && v.lang.startsWith((s.language || "en").slice(0, 2))) : [];
    const st = await aiStatus();

    el.innerHTML = String(html`
      ${ctx.pageHeader("Read this to me", "Have emails, websites, messages and instructions read aloud. The words are highlighted as they're read.")}
      ${!speechSupported() ? html`<div class="notice">Reading aloud isn't available in this browser.</div>` : ""}

      <div class="card">
        <h2>Read a website</h2>
        <ol class="steps-list">
          <li>Go to the website you'd like read to you.</li>
          <li>Click the <strong>EasyAccess button</strong> (blue shield) at the top right of Chrome.</li>
          <li>Click <strong>"Read this page to me"</strong>. A small control bar appears at the bottom of the page with Pause, Slower and Faster buttons.</li>
        </ol>
        <p>Or highlight some words on any website, right-click, and choose <strong>"EasyAccess: Read this aloud"</strong>.</p>
        ${hasChromeApis() ? html`<button type="button" class="btn" id="read-last-tab">${ico("speaker")} Read the last website I was on</button> <span id="tab-msg" role="status"></span>` : ""}
      </div>

      <div class="card">
        <h2>Read something I paste</h2>
        <div class="problem-list" style="margin-bottom:0.8rem">
          ${lastEmail ? html`<button type="button" class="btn" data-fill="email">${ico("mail")} Use my last checked email</button>` : ""}
          ${lastSnap ? html`<button type="button" class="btn" data-fill="page">${ico("globe")} Use the last page I checked</button>` : ""}
        </div>
        <label for="text">Words to read</label>
        <textarea id="text" placeholder="Paste or type the words here"></textarea>

        <div class="two-col" style="margin-top:1rem">
          <div class="field"><label for="rate">Reading speed: <span id="rate-val"></span></label>
            <input id="rate" type="range" min="0.5" max="1.5" step="0.1" value="${s.speechRate}" style="width:100%"></div>
          <div class="field"><label for="volume">Volume: <span id="vol-val"></span></label>
            <input id="volume" type="range" min="0.1" max="1" step="0.1" value="${s.speechVolume}" style="width:100%"></div>
          ${voices.length ? html`<div class="field"><label for="voice">Voice</label><select id="voice"><option value="">Computer's usual voice</option>
            ${voices.map((v) => html`<option value="${v.name}" ${v.name === s.voiceName ? "selected" : ""}>${v.name}</option>`)}</select></div>` : ""}
        </div>

        <div class="btn-row" id="controls">
          <button type="button" class="btn btn-primary btn-lg" data-r="play">${ico("play")} Read aloud</button>
          <button type="button" class="btn btn-lg" data-r="pause">${ico("pause")} Pause</button>
          <button type="button" class="btn btn-lg" data-r="resume">${ico("play")} Continue</button>
          <button type="button" class="btn btn-lg" data-r="repeat">${ico("repeat")} Repeat sentence</button>
          <button type="button" class="btn btn-lg" data-r="stop">${ico("stop")} Stop</button>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" id="explain">${ico("lightbulb")} Explain this in simpler words</button>
        </div>
        <div id="explain-out" aria-live="polite"></div>
        <div class="card" id="reading-box" hidden style="margin-top:1rem"><h3>Now reading</h3><div class="read-text" id="reading" data-no-read></div></div>
      </div>`);

    const ta = el.querySelector("#text");
    if (pendingRead) { ta.value = pendingRead; setValue("pendingReadText", "", session); }
    const rate = el.querySelector("#rate"), volume = el.querySelector("#volume");
    const label = () => {
      const r = +rate.value;
      el.querySelector("#rate-val").textContent = r < 0.8 ? "slow" : r > 1.15 ? "fast" : "normal";
      el.querySelector("#vol-val").textContent = Math.round(volume.value * 100) + "%";
    };
    label();
    const readingEl = el.querySelector("#reading");
    const reader = createReader({
      onSentence: (i, sents) => {
        readingEl.innerHTML = sents.map((t, n) => (n === i ? `<mark>${esc(t)}</mark>` : esc(t))).join(" ");
        const m = readingEl.querySelector("mark"); m && m.scrollIntoView({ block: "nearest" });
      },
      onEnd: () => { readingEl.innerHTML = esc(reader.sentences.join(" ")); },
    });

    on(el, "click", "[data-r]", (e, b) => {
      const act = b.dataset.r;
      if (act === "play") {
        if (!ta.value.trim()) { toast("Please paste or type some words first."); ta.focus(); return; }
        el.querySelector("#reading-box").hidden = false;
        reader.speak(ta.value, { rate: +rate.value, volume: +volume.value, voiceName: el.querySelector("#voice")?.value });
      }
      if (act === "pause") reader.pause();
      if (act === "resume") reader.resume();
      if (act === "repeat") reader.repeat();
      if (act === "stop") reader.stop();
    });
    rate.addEventListener("change", () => { label(); updateSettings({ speechRate: +rate.value }); reader.setRate(+rate.value); });
    rate.addEventListener("input", label);
    volume.addEventListener("input", label);
    volume.addEventListener("change", () => updateSettings({ speechVolume: +volume.value }));
    el.querySelector("#voice")?.addEventListener("change", (e) => updateSettings({ voiceName: e.target.value }));
    on(el, "click", "[data-fill]", (e, b) => {
      ta.value = b.dataset.fill === "email"
        ? `Email from ${lastEmail.sender || "unknown sender"}. Subject: ${lastEmail.subject || "no subject"}.\n\n${lastEmail.text}`
        : `${lastSnap.title}.\n\n${lastSnap.text}`;
    });
    el.querySelector("#explain").addEventListener("click", async () => {
      const out = el.querySelector("#explain-out");
      const text = ta.value.trim();
      if (!text) { toast("Please paste or type some words first."); return; }
      if (st.ready) {
        out.innerHTML = '<p class="spinner-text">Asking the AI helper</p>';
        try { const reply = await simplifyEmail(text, "explain"); out.innerHTML = String(html`<div class="notice" id="simpler">${reply.split(/\n{2,}/).map((p) => html`<p>${p}</p>`)}</div>`); }
        catch (err) { out.innerHTML = String(html`<div class="notice">${err.message}</div>`); }
      } else {
        // Built-in: show the first sentences and explain any difficult words we know.
        const { GLOSSARY } = await import("../../data/glossary.js");
        const lower = text.toLowerCase();
        const words = GLOSSARY.filter((g) => lower.includes(g.term.split(" (")[0].toLowerCase()));
        out.innerHTML = String(html`<div class="notice">
          <p><strong>The main point:</strong> ${text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")}</p>
          ${words.length ? html`<p><strong>Words explained:</strong></p><ul class="list-plain">${words.map((w) => html`<li><strong>${w.term}</strong>: ${w.meaning}</li>`)}</ul>` : ""}
          <p class="muted">For a full explanation in simpler words, a family member can turn on the AI helper in Settings.</p></div>`);
      }
    });
    const tabBtn = el.querySelector("#read-last-tab");
    tabBtn && tabBtn.addEventListener("click", async () => {
      const res = await sendToBackground({ type: "read-last-tab" });
      el.querySelector("#tab-msg").textContent = res && res.ok
        ? "Reading now — switch to that tab to see the controls."
        : "I can't reach that website from here. Please go to the website and use the EasyAccess button there (or turn on \"Protect me on every website\" in Settings).";
    });
    if (pendingRead) el.querySelector("[data-r=play]").click();
    return () => reader.stop();
  },
};
