import { html, esc, toast } from "../../shared/ui.js";
import { getValue, setValue, session } from "../../shared/storage.js";
import { updateSettings } from "../../shared/settings.js";
import { aiStatus, chat } from "../../shared/ai-client.js";
import { listenOnce, listeningSupported, say, stopSpeaking } from "../../shared/speech.js";
import { classify, learnExample } from "../../shared/intent-model.js";
import { COMMON_PROBLEMS, matchIntent, intentById, INTENT_LABELS, FALLBACK_REPLY } from "../../data/assistant-knowledge.js";
import { on, ico } from "./common.js";

const WELCOME = "Hello! I'm your EasyAccess helper. Tell me what you need — in your own words. There are no silly questions, and we can go as slowly as you like.";

let modelPromise;
function loadModel() {
  modelPromise = modelPromise || fetch(new URL("../../data/intent-model.json", import.meta.url)).then((r) => r.json()).catch(() => null);
  return modelPromise;
}

function bubble(m, i) {
  const who = m.role === "user" ? "You" : "EasyAccess helper";
  const paragraphs = String(m.content).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const actions = (m.actions || []).map((a) => `<a class="btn" href="${esc(a.route)}">${esc(a.label)}</a>`).join("");
  const choices = (m.choices || []).map((c) => `<button type="button" class="btn" data-choose="${esc(c.intent)}" data-i="${i}">${esc(c.label)}</button>`).join("");
  let feedback = "";
  if (m.feedback && !m.feedback.done) {
    feedback = `<div class="btn-row feedback" role="group" aria-label="Did I understand?"><span class="muted" style="align-self:center">Did I understand you?</span>
      <button type="button" class="btn btn-quiet" data-fb="yes" data-i="${i}">${ico("check")} Yes</button>
      <button type="button" class="btn btn-quiet" data-fb="no" data-i="${i}">${ico("x")} No, I meant something else</button></div>`;
  } else if (m.feedback && m.feedback.note) {
    feedback = `<p class="muted">${esc(m.feedback.note)}</p>`;
  }
  return `<div class="msg msg-${m.role === "user" ? "user" : "helper"}"><span class="msg-who">${who}</span>${paragraphs}${choices ? `<div class="btn-row">${choices}</div>` : ""}${actions ? `<div class="btn-row">${actions}</div>` : ""}${feedback}</div>`;
}

/** Turn a topic into a helper message. */
function answerFor(intentId, asked, extraNote) {
  const intent = intentById(intentId);
  if (!intent) return { role: "assistant", content: FALLBACK_REPLY };
  return { role: "assistant", content: (extraNote ? extraNote + "\n\n" : "") + intent.reply, actions: intent.actions, feedback: asked ? { asked, intent: intentId } : undefined };
}

function choicesFrom(ranked, n) {
  return ranked.filter((r) => INTENT_LABELS[r.intent]).slice(0, n).map((r) => ({ intent: r.intent, label: INTENT_LABELS[r.intent] }));
}

export default {
  title: "I need help",
  async render(el, { pageHeader, settings, query }) {
    let messages = await getValue("assistantChat", [], session);
    if (!messages.length) messages = [{ role: "assistant", content: WELCOME }];
    const status = await aiStatus();
    const snapshotInfo = await getValue("lastExplanation", null, session);
    const model = await loadModel();
    let personal = await getValue("intentPersonal", null);
    let busy = false;

    el.innerHTML = String(html`
      ${pageHeader("I need help — show me what to do", "Type your question in your own words, press the microphone to say it, or pick a common problem below.")}
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
          : html`<strong>Using the built-in helper.</strong> It understands everyday wording and typos, works without the internet, and learns from your answers to "Did I understand you?" — on this computer only.
              <span id="learned"></span> For any question at all, a family member can turn on the AI helper in <a href="#/settings">Settings</a>.`}
        <div class="btn-row" style="margin-bottom:0"><button type="button" class="btn btn-quiet" id="clear">${ico("trash")} Start a new conversation</button></div>
      </div>
    `);

    const chatEl = el.querySelector("#chat");
    const input = el.querySelector("#question");
    const showLearned = () => {
      const s = el.querySelector("#learned");
      if (s) s.textContent = personal && personal.examples ? `So far it has learned from ${personal.examples} of your answers.` : "";
    };
    showLearned();
    const save = () => setValue("assistantChat", messages.slice(-30), session);
    const drawChat = () => {
      chatEl.innerHTML = messages.map(bubble).join("");
      const last = chatEl.lastElementChild;
      last && last.scrollIntoView({ block: "nearest" });
    };
    drawChat();
    const speakIf = (text) => { if (el.querySelector("#voice").checked) say(text); };

    async function remember(asked, intentId) {
      if (!model || !asked) return;
      personal = learnExample(model, personal, asked, intentId);
      await setValue("intentPersonal", personal);
      showLearned();
    }

    function offlineReply(text) {
      if (!model) {
        const intent = matchIntent(text);
        return intent ? answerFor(intent.id, null) : { role: "assistant", content: FALLBACK_REPLY };
      }
      const c = classify(model, text, personal);
      if (c.confidence === "sure") return answerFor(c.top.intent, text);
      if (c.confidence === "unsure") {
        return { role: "assistant", asked: text, content: "I want to make sure I understand you. Which of these is closest?",
          choices: choicesFrom(c.ranked, 3).concat({ intent: "__more", label: "Something else" }) };
      }
      // Not understood: try the simple keyword rules before giving up.
      const intent = matchIntent(text);
      if (intent) return answerFor(intent.id, text);
      return { role: "assistant", asked: text, content: FALLBACK_REPLY, choices: [{ intent: "__more", label: "Show me the list of things I can help with" }] };
    }

    async function ask(text) {
      text = text.trim();
      if (!text || busy) return;
      if (/\b\d{3}-?\d{2}-?\d{4}\b/.test(text) || /\b(?:\d[ -]?){15,16}\b/.test(text)) {
        toast("It looks like you typed a Social Security or card number. Please don't share those — I've removed it.", 6000);
        text = text.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[removed]").replace(/\b(?:\d[ -]?){15,16}\b/g, "[removed]");
      }
      busy = true;
      messages.push({ role: "user", content: text });
      const usePage = el.querySelector("#use-page") && el.querySelector("#use-page").checked;
      let reply;
      if (status.ready) {
        const thinking = { role: "assistant", content: "Let me think about that…" };
        messages.push(thinking);
        drawChat();
        const c = model ? classify(model, text, personal) : null;
        const actions = c && c.confidence === "sure" ? (intentById(c.top.intent) || {}).actions : undefined;
        try {
          const context = usePage && snapshotInfo ? snapshotInfo.summary : null;
          const answer = await chat(messages.filter((m) => m !== thinking && m.content !== WELCOME && m.role).map(({ role, content }) => ({ role, content })), context);
          reply = { role: "assistant", content: answer, actions };
        } catch (err) {
          reply = offlineReply(text);
          reply.content = `(The AI helper couldn't be reached — ${err.message}) Here's my built-in answer:\n\n` + reply.content;
        }
        messages[messages.indexOf(thinking)] = reply;
      } else if (usePage && snapshotInfo && /\b(this|the) (page|site|website|screen|button|message|pop.?up)\b|is (this|it) (real|safe|legit)/i.test(text)) {
        reply = { role: "assistant", content: snapshotInfo.summary, actions: [{ label: "See the full explanation", route: "#/screen" }] };
        messages.push(reply);
      } else {
        reply = offlineReply(text);
        messages.push(reply);
      }
      await save();
      busy = false;
      drawChat();
      speakIf(reply.content);
    }

    // "Did I understand you?"
    on(el, "click", "[data-fb]", async (e, b) => {
      const m = messages[+b.dataset.i];
      if (!m || !m.feedback) return;
      if (b.dataset.fb === "yes") {
        m.feedback.done = true;
        m.feedback.note = "Thank you! I'll remember that.";
        await remember(m.feedback.asked, m.feedback.intent);
      } else {
        m.feedback.done = true;
        const ranked = model ? classify(model, m.feedback.asked, personal).ranked.filter((r) => r.intent !== m.feedback.intent) : [];
        messages.push({ role: "assistant", asked: m.feedback.asked, content: "Sorry about that — my mistake. Which of these is closest to what you meant?",
          choices: choicesFrom(ranked, 6).concat({ intent: "__more", label: "Show me everything" }) });
      }
      await save();
      drawChat();
    });

    // Picking a topic from "Did you mean…?" teaches the helper.
    on(el, "click", "[data-choose]", async (e, b) => {
      const m = messages[+b.dataset.i];
      if (!m) return;
      const choice = b.dataset.choose;
      if (choice === "__more") {
        m.choices = Object.entries(INTENT_LABELS).filter(([id]) => !["greeting", "thanks"].includes(id))
          .sort((a, b2) => a[1].localeCompare(b2[1])).map(([intent, label]) => ({ intent, label }));
        m.content = "Here's everything I can help with. Pick the one that's closest:";
      } else {
        m.choices = [];
        await remember(m.asked, choice);
        const reply = answerFor(choice, null, m.asked ? `Got it. Next time you say something like "${m.asked}", I'll know you mean: ${INTENT_LABELS[choice].toLowerCase()}.` : "");
        messages.push(reply);
        speakIf(reply.content);
      }
      await save();
      drawChat();
    });

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
      const st = el.querySelector("#mic-status");
      st.textContent = "Listening… please speak now.";
      try {
        const text = await listenOnce({ lang: settings.language, onInterim: (t) => { input.value = t; } });
        st.textContent = "";
        if (text) { input.value = ""; ask(text); } else st.textContent = "I didn't catch that. Please try again.";
      } catch (err) {
        st.textContent = err.message;
      }
    });

    const q = query.get("q");
    if (q) ask(q);
    return () => stopSpeaking();
  },
};
