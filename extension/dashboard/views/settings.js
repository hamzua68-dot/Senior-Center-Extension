import { html, toast } from "../../shared/ui.js";
import { getSettings, updateSettings, TEXT_SIZES, DEFAULT_SETTINGS } from "../../shared/settings.js";
import { eraseAll, setValue } from "../../shared/storage.js";
import { say } from "../../shared/speech.js";
import { on, ico, sendToBackground, hasChromeApis } from "./common.js";

const LANGS = [
  { id: "en-US", label: "English (United States)" },
  { id: "en-GB", label: "English (United Kingdom)" },
  { id: "es-US", label: "Español (voz y reconocimiento de voz)" },
  { id: "fr-FR", label: "Français (voix et reconnaissance vocale)" },
];

function sw(id, title, desc, checked) {
  return html`<div class="switch-row"><div class="switch-text"><strong id="${id}-label">${title}</strong><span>${desc}</span></div>
    <label class="toggle"><input type="checkbox" id="${id}" aria-labelledby="${id}-label" ${checked ? "checked" : ""}><span class="track"></span></label></div>`;
}

export default {
  title: "Settings",
  async render(el, ctx) {
    const draw = async () => {
      const s = await getSettings();
      el.innerHTML = String(html`
        ${ctx.pageHeader("Settings", "Make EasyAccess work the way you like. Changes are saved straight away.")}
        <button type="button" class="btn btn-help btn-lg btn-block" id="easier" style="margin-bottom:1.5rem">${ico("eye")} Make everything easier to see</button>

        <section class="card">
          <h2>Text size</h2>
          <div class="segmented" role="group" aria-label="Text size">
            ${TEXT_SIZES.map((t) => html`<button type="button" class="btn" data-size="${t.id}" aria-pressed="${String(s.textSize === t.id)}">${t.label}</button>`)}
          </div>
          <p class="muted" style="margin-top:0.8rem">To make websites bigger too, hold <span class="kbd">Ctrl</span> and press <span class="kbd">+</span> (<span class="kbd">⌘</span> and <span class="kbd">+</span> on a Mac).</p>
        </section>

        <section class="card">
          <h2>Colours</h2>
          <div class="segmented" role="group" aria-label="Colours">
            <button type="button" class="btn" data-theme-choice="light" aria-pressed="${String(s.theme === "light")}">Light mode</button>
            <button type="button" class="btn" data-theme-choice="dark" aria-pressed="${String(s.theme === "dark")}">Dark mode</button>
            <button type="button" class="btn" data-theme-choice="contrast" aria-pressed="${String(s.theme === "contrast")}">High contrast</button>
          </div>
        </section>

        <section class="card">
          <h2>Comfort</h2>
          ${sw("simple", "Simple home screen", "Show only the four most important choices on the home screen.", s.simpleMode)}
          ${sw("motion", "Reduce motion", "Turn off all movement and animation.", s.reduceMotion)}
          ${sw("voice", "Voice assistance", "Read the helper's answers and lesson steps aloud automatically.", s.voiceAnswers)}
          <div class="switch-row"><div class="switch-text"><label for="rate" style="margin:0">Reading speed</label><span>How fast EasyAccess reads aloud.</span></div>
            <input id="rate" type="range" min="0.5" max="1.5" step="0.1" value="${s.speechRate}" style="width:12rem"></div>
          <button type="button" class="btn btn-quiet" id="test-voice">${ico("speaker")} Test the voice</button>
          <div class="field" style="margin-top:1rem"><label for="lang">Language for voice</label>
            <select id="lang">${LANGS.map((l) => html`<option value="${l.id}" ${s.language === l.id ? "selected" : ""}>${l.label}</option>`)}</select>
            <p class="hint">EasyAccess's screens are in English. This changes the voice used for reading aloud and for spoken questions.</p></div>
          <p class="muted">EasyAccess works with screen readers (like NVDA, JAWS, VoiceOver and ChromeVox) and can be used entirely with the keyboard: press <span class="kbd">Tab</span> to move, <span class="kbd">Enter</span> to choose.</p>
        </section>

        <section class="card" id="protection">
          <h2>${ico("shield")} Protect me on every website</h2>
          <p>When this is on, EasyAccess quietly watches for dangerous links, fake virus warnings, and password boxes on look-alike websites — on every website you visit — and warns you before anything bad happens. It shows a colour on the EasyAccess button for each website.</p>
          <p class="muted">Chrome will ask you to allow EasyAccess to "read and change data on all websites". EasyAccess only checks pages on your computer — it doesn't send your browsing anywhere${s.aiServerUrl && s.safeBrowsingViaServer ? ", except website addresses for the threat-list check described below" : ""}. You can turn it off at any time.</p>
          ${sw("protect", "Protect me on every website", s.protectionEnabled ? "On" : "Off", s.protectionEnabled)}
          <p id="protect-msg" role="status"></p>
        </section>

        <section class="card" id="ai">
          <h2>${ico("chat")} AI helper (optional)</h2>
          <p>The AI helper can answer any question in your own words, explain websites and screenshots in more detail, and suggest email replies. It needs an EasyAccess helper server, which a family member or your senior center can set up (see the installation guide).</p>
          <div class="field"><label for="ai-url">Helper server address</label><input id="ai-url" type="url" placeholder="https://easyaccess-helper.example.org" value="${s.aiServerUrl}" spellcheck="false"></div>
          <div class="field"><label for="ai-code">Access code <span class="muted">(if the server has one)</span></label><input id="ai-code" type="text" value="${s.aiAccessCode}" autocomplete="off" spellcheck="false"></div>
          <div class="notice">
            <strong>What gets sent:</strong> only what you choose to ask about — your questions, the words of a message you check, the visible words of a web page, or a screen picture (you'll be asked each time for pictures).
            EasyAccess never sends what you type into website boxes, and never sends passwords. The server sends the text to the AI service it is set up with (Anthropic's Claude or Google's Gemini) to write an answer. Press "Test the connection" to see which one. Don't include bank numbers or your Social Security number in questions.
          </div>
          <label class="choice"><input type="checkbox" id="ai-consent" ${s.aiConsent ? "checked" : ""}> I understand and agree that what I choose to ask about may be sent to the AI helper.</label>
          ${sw("sb", "Check websites against known-danger lists", "Sends website addresses (not page contents) to the helper server to check with Google Safe Browsing.", s.safeBrowsingViaServer)}
          <div class="btn-row"><button type="button" class="btn btn-primary" id="ai-save">${ico("check")} Save AI helper settings</button><button type="button" class="btn" id="ai-test">Test the connection</button></div>
          <p id="ai-msg" role="status"></p>
        </section>

        <section class="card">
          <h2>${ico("lock")} Privacy</h2>
          <p>Your settings, favourites, trusted people, reminders and sharing record are stored only on this computer.</p>
          <div class="btn-row">
            <a class="btn" href="#/privacy">${ico("info")} How EasyAccess protects your privacy</a>
            <a class="btn" href="#/family/log">${ico("list")} My sharing record</a>
            <button type="button" class="btn" id="forget-learning">${ico("repeat")} Forget what the helper has learned</button>
            <button type="button" class="btn btn-danger" id="erase">${ico("trash")} Delete everything EasyAccess has saved</button>
          </div>
        </section>
        <button type="button" class="btn btn-quiet" id="reset">Put all settings back to normal</button>
        <a class="btn btn-quiet" href="#/welcome">Show the welcome tour again</a>`);
    };
    await draw();

    const set = async (patch, msg) => { await updateSettings(patch); if (msg) toast(msg); await draw(); };
    on(el, "click", "#easier", () => set({ textSize: "xlarge", theme: "contrast", reduceMotion: true, simpleMode: true }, "Text is now extra large with strong colours. You can change this back below."));
    on(el, "click", "[data-size]", (e, b) => set({ textSize: b.dataset.size }, "Text size changed."));
    on(el, "click", "[data-theme-choice]", (e, b) => set({ theme: b.dataset.themeChoice }, "Colours changed."));
    on(el, "change", "#simple", (e, c) => set({ simpleMode: c.checked }));
    on(el, "change", "#motion", (e, c) => set({ reduceMotion: c.checked }));
    on(el, "change", "#voice", (e, c) => set({ voiceAnswers: c.checked }));
    on(el, "change", "#rate", (e, c) => updateSettings({ speechRate: +c.value }));
    on(el, "change", "#lang", (e, c) => set({ language: c.value }, "Voice language changed."));
    on(el, "change", "#sb", (e, c) => updateSettings({ safeBrowsingViaServer: c.checked }));
    on(el, "click", "#test-voice", () => say("Hello! This is how EasyAccess sounds when it reads to you."));
    on(el, "change", "#protect", async (e, c) => {
      const msg = el.querySelector("#protect-msg");
      if (!hasChromeApis()) { msg.textContent = "This works when EasyAccess is installed in Chrome."; c.checked = false; return; }
      if (c.checked) {
        // Must be requested directly from the click for Chrome to show its permission prompt.
        let granted = false;
        try { granted = await chrome.permissions.request({ origins: ["<all_urls>"] }); } catch (err) { granted = false; }
        if (!granted) { c.checked = false; msg.textContent = "Protection was not turned on because the permission wasn't allowed. You can try again any time."; return; }
        await updateSettings({ protectionEnabled: true });
        const r = await sendToBackground({ type: "protection-changed" });
        msg.textContent = r && r.ok ? "Protection is on. Websites you open from now on will be checked." : "Protection is on.";
      } else {
        await updateSettings({ protectionEnabled: false });
        await sendToBackground({ type: "protection-changed" });
        try { await chrome.permissions.remove({ origins: ["<all_urls>"] }); } catch (err) { /* ignore */ }
        msg.textContent = "Protection is off.";
      }
    });
    on(el, "click", "#ai-save", async () => {
      const url = el.querySelector("#ai-url").value.trim().replace(/\/+$/, "");
      const msg = el.querySelector("#ai-msg");
      if (url) {
        let u;
        try { u = new URL(url); } catch (e) { msg.textContent = "That address doesn't look right. It should start with https://"; return; }
        if (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname)) { msg.textContent = "For your safety, the address must start with https://"; return; }
      }
      await updateSettings({ aiServerUrl: url, aiAccessCode: el.querySelector("#ai-code").value.trim(), aiConsent: el.querySelector("#ai-consent").checked });
      toast(url ? (el.querySelector("#ai-consent").checked ? "AI helper settings saved." : "Saved. The AI helper stays off until you tick the box to agree.") : "AI helper is off.");
      await draw();
    });
    on(el, "click", "#ai-test", async () => {
      const msg = el.querySelector("#ai-msg");
      const url = el.querySelector("#ai-url").value.trim().replace(/\/+$/, "");
      if (!url) { msg.textContent = "Please type the helper server address first."; return; }
      msg.textContent = "Testing…";
      try {
        const res = await fetch(new URL("/api/health", url).href, { headers: el.querySelector("#ai-code").value ? { "X-EasyAccess-Code": el.querySelector("#ai-code").value.trim() } : {}, credentials: "omit" });
        const data = await res.json();
        msg.textContent = res.ok ? `Connected! AI: ${data.ai ? `ready (${data.provider === "gemini" ? "Google Gemini" : "Anthropic Claude"})` : "not set up on the server"}. Website threat lists: ${data.safeBrowsing ? "ready" : "not set up on the server"}.` : `The server answered with a problem (${data.error || res.status}).`;
      } catch (e) { msg.textContent = "I couldn't reach that server. Check the address and that the server is running."; }
    });
    on(el, "click", "#forget-learning", async () => {
      if (!confirm("Forget the words the built-in helper has learned from your answers?\n\nIt will go back to how it was when EasyAccess was installed.")) return;
      await setValue("intentPersonal", null);
      toast("The helper has forgotten what it learned.");
    });
    on(el, "click", "#erase", async () => {
      if (!confirm("Delete everything EasyAccess has saved on this computer?\n\nThis removes your settings, favourites, trusted people, reminders and sharing record. It can't be undone.")) return;
      await eraseAll();
      await sendToBackground({ type: "protection-changed" });
      await sendToBackground({ type: "reminders-updated" });
      if (hasChromeApis()) { try { await chrome.permissions.remove({ origins: ["<all_urls>"] }); } catch (e) { /* ignore */ } }
      toast("Everything has been deleted.");
      ctx.navigate("#/welcome");
    });
    on(el, "click", "#reset", () => set({ ...DEFAULT_SETTINGS, onboarded: true, aiServerUrl: "", aiConsent: false }, "Settings are back to normal."));

    if (ctx.params[0] === "easier") el.querySelector("#easier").focus();
    if (ctx.params[0] === "ai") el.querySelector("#ai").scrollIntoView();
  },
};
