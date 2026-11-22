import { html, esc, toast } from "../../shared/ui.js";
import { getValue, setValue, session } from "../../shared/storage.js";
import { updateSettings } from "../../shared/settings.js";
import { aiStatus, chat } from "../../shared/ai-client.js";
import { listenOnce, listeningSupported, say, stopSpeaking } from "../../shared/speech.js";
import { COMMON_PROBLEMS, matchIntent, FALLBACK_REPLY } from "../../data/assistant-knowledge.js";
import { on, ico } from "./common.js";

const WELCOME = "Hello! I'm your EasyAccess helper. Tell me what you need — in your own words. There are no silly questions, and we can go as slowly as you like.";

function bubble(m) {
  const who = m.role === "user" ? "You" : "EasyAccess helper";
  const paragraphs = String(m.content).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const actions = (m.actions || []).map((a) => `<a class="btn" href="${esc(a.route)}">${esc(a.label)}</a>`).join("");
  return `<div class="msg msg-${m.role === "user" ? "user" : "helper"}"><span class="msg-who">${who}</span>${paragraphs}${actions ? `<div class="btn-row">${actions}</div>` : ""}</div>`;
}

export default {
  title: "I need help",
  async render(el, { pageHeader, settings, query }) {
    let messages = await getValue("assistantChat", [], session);
    if (!messages.length) messages = [{ role: "assistant", content: WELCOME }];
    const status = await aiStatus();
    const snapshotInfo = await getValue("lastExplanation", null, session);
    let busy = false;

    el.innerHTML = String(html`
      ${pageHeader("I need help — show me what to do", "Type your question, press the microphone to say it, or pick a common problem below.")}
      <div class="chat" id="chat" aria-live="polite" aria-label="Conversation"></div>

      <form class="composer" id="composer" autocomplete="off">
        <label for="question" class="visually-hidden">Your question</label>
        <textarea id="question" placeholder="For example: I can't find the document I downloaded" rows="2"></textarea>
        <button class="btn btn-help btn-lg" type="submit" id="send">${ico("send")} Ask</button>
        <button class="btn btn-lg" type="button" id="mic" ${listeningSupported() ? "" : "hidden"}>${ico("mic")} Speak</button>
      </form>
      <p id="mic-status" class="listening" role="status"></p>

      <div class="switch-row" style="max-width:40rem">
        <div class="switch-text"><strong>Read answers aloud</strong><span>The helper will speak its answers.</span></div>
        <label class="toggle"><input type="checkbox" id="voice" ${settings.voiceAnswers ? "checked" : ""}><span class="track"></span><span class="visually-hidden">Read answers aloud</span></label>
      </div>
      ${snapshotInfo ? html`
        <div class="switch-row" style="max-width:40rem">
          <div class="switch-text"><strong>Questions are about the page I was on</strong><span>${snapshotInfo.title || snapshotInfo.host || "The last page you asked about"}</span></div>
          <label class="toggle"><input type="checkbox" id="use-page" ${query.get("about") === "page" ? "checked" : ""}><span class="track"></span><span class="visually-hidden">Questions are about the page I was on</span></label>
        </div>` : ""}

      <h2 class="section-title">Common problems</h2>
      <div class="problem-list">
        ${COMMON_PROBLEMS.map((p) => html`<button type="button" class="btn" data-say="${p.say}">${p.label}</button>`)}
      </div>

      <div class="notice" style="margin-top:1.5rem">
        ${status.ready
          ? html`<strong>The AI helper is on.</strong> Your questions are sent to the EasyAccess AI service to get an answer. Never type passwords, bank details or your Social Security number. <a href="#/settings">Change</a>`
          : html`<strong>Using the built-in helper.</strong> It knows the most common problems and works without the internet. For any question at all, a family member can turn on the AI helper in <a href="#/settings">Settings</a>.`}
        <button type="button" class="btn btn-quiet" id="clear" style="margin-top:0.6rem">${ico("trash")} Start a new conversation</button>
      </div>
    `);

    const chatEl = el.querySelector("#chat");
    const input = el.querySelector("#question");
    const drawChat = () => {
      chatEl.innerHTML = messages.map(bubble).join("");
      const last = chatEl.lastElementChild;
      last && last.scrollIntoView({ block: "nearest" });
    };
    drawChat();

    async function ask(text) {
      text = text.trim();
      if (!text || busy) return;
      if (/\b\d{3}-?\d{2}-?\d{4}\b/.test(text) || /\b(?:\d[ -]?){15,16}\b/.test(text)) {
        toast("It looks like you typed a Social Security or card number. Please don't share those — I've removed it.", 6000);
        text = text.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[removed]").replace(/\b(?:\d[ -]?){15,16}\b/g, "[removed]");
      }
      busy = true;
      messages.push({ role: "user", content: text });
      const intent = matchIntent(text);
      const thinking = { role: "assistant", content: "Let me think about that…" };
      messages.push(thinking);
      drawChat();
      let reply;
      const usePage = el.querySelector("#use-page") && el.querySelector("#use-page").checked;
      if (status.ready) {
        try {
          const context = usePage && snapshotInfo ? snapshotInfo.summary : null;
          const answer = await chat(messages.filter((m) => m !== thinking && m.content !== WELCOME).map(({ role, content }) => ({ role, content })), context);
          reply = { role: "assistant", content: answer, actions: intent ? intent.actions : undefined };
        } catch (err) {
          reply = intent
            ? { role: "assistant", content: intent.reply + "\n\n(The AI helper couldn't be reached, so I used my built-in answer: " + err.message + ")", actions: intent.actions }
            : { role: "assistant", content: err.message + " In the meantime, try one of the common problems below." };
        }
      } else if (usePage && snapshotInfo && /\b(this|the) (page|site|website|screen|button|message|pop.?up)\b|is (this|it) (real|safe|legit)/i.test(text)) {
        reply = { role: "assistant", content: snapshotInfo.summary, actions: [{ label: "See the full explanation", route: "#/screen" }] };
      } else {
        reply = intent ? { role: "assistant", content: intent.reply, actions: intent.actions } : { role: "assistant", content: FALLBACK_REPLY };
      }
      messages[messages.indexOf(thinking)] = reply;
      await setValue("assistantChat", messages.slice(-30), session);
      busy = false;
      drawChat();
      if (el.querySelector("#voice").checked) say(reply.content);
    }

    el.querySelector("#composer").addEventListener("submit", (e) => { e.preventDefault(); const t = input.value; input.value = ""; ask(t); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.querySelector("#composer").requestSubmit(); } });
    on(el, "click", "[data-say]", (e, b) => ask(b.dataset.say));
    el.querySelector("#voice").addEventListener("change", (e) => { updateSettings({ voiceAnswers: e.target.checked }); if (!e.target.checked) stopSpeaking(); });
    el.querySelector("#clear").addEventListener("click", async () => {
      messages = [{ role: "assistant", content: WELCOME }];
      await setValue("assistantChat", [], session);
      drawChat();
    });
    el.querySelector("#mic").addEventListener("click", async () => {
      const status = el.querySelector("#mic-status");
      status.textContent = "Listening… please speak now.";
      try {
        const text = await listenOnce({ lang: settings.language, onInterim: (t) => { input.value = t; } });
        status.textContent = "";
        if (text) { input.value = ""; ask(text); } else status.textContent = "I didn't catch that. Please try again.";
      } catch (err) {
        status.textContent = err.message;
      }
    });

    const q = query.get("q");
    if (q) ask(q);
    return () => stopSpeaking();
  },
};
