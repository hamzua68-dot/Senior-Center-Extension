import { html, toast, uid, formatDate } from "../../shared/ui.js";
import { getValue, setValue } from "../../shared/storage.js";
import { getSettings } from "../../shared/settings.js";
import { SECURITY_LESSONS, QUIZ, CHECKLIST } from "../../data/learning.js";
import { GLOSSARY } from "../../data/glossary.js";
import { on, ico, tile, sendToBackground } from "./common.js";

export default {
  title: "My security center",
  async render(el, ctx) {
    const sub = ctx.params[0] || "";
    if (sub === "lesson") return renderLesson(el, ctx);
    if (sub === "checklist") return renderChecklist(el, ctx);
    if (sub === "quiz") return renderQuiz(el, ctx);
    if (sub === "reminders") return renderReminders(el, ctx);
    if (sub === "words") return renderGlossary(el, ctx);
    const s = await getSettings();
    const checked = await getValue("checklist", []);
    el.innerHTML = String(html`
      ${ctx.pageHeader("My security center", "Simple ways to protect your accounts, and short lessons to keep you one step ahead of scammers. EasyAccess never asks for or stores your passwords.")}
      <div class="card">
        <h2>Your protection</h2>
        <div class="switch-row"><div class="switch-text"><strong>Protect me on every website</strong><span>${s.protectionEnabled ? "On — EasyAccess warns you about dangerous links and fake virus alerts." : "Off — turn it on in Settings for warnings on every website."}</span></div>
          <a class="btn ${s.protectionEnabled ? "" : "btn-primary"}" href="#/settings">${s.protectionEnabled ? "Change" : "Turn on"}</a></div>
        <div class="switch-row"><div class="switch-text"><strong>Safety checklist</strong><span>${checked.length} of ${CHECKLIST.length} done</span></div>
          <a class="btn" href="#/security/checklist">Open checklist</a></div>
      </div>
      <h2 class="section-title">Learn to protect your accounts</h2>
      <div class="tile-grid">${SECURITY_LESSONS.map((l) => tile({ href: `#/security/lesson/${l.id}`, iconName: l.icon, title: l.title }))}</div>
      <h2 class="section-title">More</h2>
      <div class="tile-grid">
        ${tile({ href: "#/security/quiz", iconName: "quiz", title: "Scam awareness quiz", desc: "10 quick questions. Can you spot the scam?" })}
        ${tile({ href: "#/check/scams", iconName: "book", title: "Common scams explained", desc: "Today's most common tricks." })}
        ${tile({ href: "#/security/reminders", iconName: "clock", title: "Reminders", desc: "Remember to pay a bill, renew something, or check your accounts." })}
        ${tile({ href: "#/security/words", iconName: "list", title: "Computer words explained", desc: "A dictionary of computer words in plain English." })}
        ${tile({ href: "#/learn/passwords", iconName: "key", title: "Find my saved passwords", desc: "Using Chrome's built-in Password Manager." })}
        ${tile({ href: "#/learn/notifications", iconName: "bell", title: "Stop pop-up notifications", desc: "Block websites that send scary pop-ups." })}
      </div>`);
  },
};

function renderLesson(el, ctx) {
  const l = SECURITY_LESSONS.find((x) => x.id === ctx.params[1]) || SECURITY_LESSONS[0];
  const i = SECURITY_LESSONS.indexOf(l);
  const next = SECURITY_LESSONS[i + 1];
  el.innerHTML = String(html`
    ${ctx.pageHeader(l.title, "")}
    <div class="card"><ul class="reason-list lesson-step">${l.points.map((p) => html`<li>${p}</li>`)}</ul></div>
    <div class="btn-row">
      ${next ? html`<a class="btn btn-primary" href="#/security/lesson/${next.id}">Next lesson: ${next.title} ${ico("next")}</a>` : html`<a class="btn btn-primary" href="#/security/quiz">${ico("quiz")} Try the scam quiz</a>`}
      <a class="btn" href="#/security">${ico("lock")} All security lessons</a>
    </div>`);
}

async function renderChecklist(el, ctx) {
  let checked = await getValue("checklist", []);
  el.innerHTML = String(html`
    ${ctx.pageHeader("Digital safety checklist", "Tick each item when it's done. There's no rush — one at a time is great.")}
    <div class="card"><div class="choice-list">${CHECKLIST.map((c) => html`<label class="choice" style="font-weight:500"><input type="checkbox" data-id="${c.id}" ${checked.includes(c.id) ? "checked" : ""}> ${c.text}</label>`)}</div></div>
    <p id="count" class="lesson-progress" role="status"></p>
    <div class="btn-row"><a class="btn" href="#/security">${ico("lock")} Security lessons</a><a class="btn" href="#/settings">${ico("settings")} Settings</a></div>`);
  const count = () => { el.querySelector("#count").textContent = `${checked.length} of ${CHECKLIST.length} done${checked.length === CHECKLIST.length ? " — wonderful!" : ""}`; };
  count();
  on(el, "change", "[data-id]", async (e, cb) => {
    checked = checked.filter((x) => x !== cb.dataset.id);
    if (cb.checked) checked.push(cb.dataset.id);
    await setValue("checklist", checked);
    count();
  });
}

function renderQuiz(el, ctx) {
  let i = 0, score = 0, answered = false;
  const draw = () => {
    if (i >= QUIZ.length) {
      el.innerHTML = String(html`${ctx.pageHeader("Scam awareness quiz", "")}
        <div class="card"><h2>You got ${score} out of ${QUIZ.length}!</h2>
        <p>${score >= 8 ? "Excellent — you know the warning signs well." : score >= 5 ? "Good job! Read the explanations again to become even sharper." : "Thank you for trying — every question you learn makes you safer. Try again any time."}</p>
        <div class="btn-row"><button type="button" class="btn btn-primary" id="again">${ico("repeat")} Try again</button><a class="btn" href="#/check/scams">${ico("book")} Learn the common scams</a></div></div>`);
      el.querySelector("#again").addEventListener("click", () => { i = 0; score = 0; draw(); });
      return;
    }
    const q = QUIZ[i];
    answered = false;
    el.innerHTML = String(html`${ctx.pageHeader("Scam awareness quiz", "")}
      <p class="lesson-progress">Question ${i + 1} of ${QUIZ.length}</p>
      <div class="card"><h2 class="lesson-step" style="font-weight:650">${q.q}</h2>
        ${q.options.map((o, n) => html`<button type="button" class="btn quiz-option" data-opt="${n}">${o}</button>`)}
        <div id="why" aria-live="polite"></div></div>`);
  };
  draw();
  on(el, "click", "[data-opt]", (e, b) => {
    if (answered) return;
    answered = true;
    const q = QUIZ[i];
    const n = +b.dataset.opt;
    if (n === q.answer) score++;
    el.querySelectorAll("[data-opt]").forEach((x) => { x.disabled = true; if (+x.dataset.opt === q.answer) x.classList.add("correct"); });
    if (n !== q.answer) b.classList.add("wrong");
    el.querySelector("#why").innerHTML = String(html`<p class="lesson-step"><strong>${n === q.answer ? "Correct! " : "Not quite. "}</strong>${q.why}</p>
      <button type="button" class="btn btn-primary btn-lg" id="next">${i + 1 < QUIZ.length ? "Next question" : "See my score"} ${ico("next")}</button>`);
    el.querySelector("#next").focus();
  });
  on(el, "click", "#next", () => { i++; draw(); });
}

async function renderReminders(el, ctx) {
  let list = await getValue("reminders", []);
  const due = ctx.query.get("due") ? await getValue("dueReminder", null) : null;
  const draw = () => {
    el.innerHTML = String(html`${due ? html`<div class="verdict verdict-yellow" role="alert"><div class="verdict-icon">${ico("bell")}</div><div><p class="verdict-title">Reminder</p><p class="lesson-step">${due.what}</p></div></div>` : ""}
      ${ctx.pageHeader("Reminders", "EasyAccess can remind you about important online tasks — paying a bill, renewing a prescription, or checking your bank account. When it's time, EasyAccess opens this page to remind you (Chrome needs to be open).")}
      <form id="f" class="card">
        <div class="field"><label for="what">What should I remind you about?</label><input id="what" type="text" required placeholder="For example: Pay the electricity bill"></div>
        <div class="two-col">
          <div class="field"><label for="date">Date</label><input id="date" type="date" required></div>
          <div class="field"><label for="time">Time</label><input id="time" type="time" value="10:00" required></div>
        </div>
        <div class="field"><label for="repeat">Repeat</label><select id="repeat"><option value="">Just once</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></div>
        <button class="btn btn-primary" type="submit">${ico("plus")} Add reminder</button>
      </form>
      <h2 class="section-title">My reminders</h2>
      ${list.length ? html`<ul class="list-plain card">${list.sort((a, b) => a.when - b.when).map((r) => html`<li class="site-item"><div><div class="site-name">${r.what}</div><div class="site-url">${formatDate(r.when)}${r.repeat ? ` · repeats ${r.repeat}` : ""}</div></div>
        <button type="button" class="btn btn-quiet" data-del="${r.id}">${ico("trash")} Delete</button></li>`)}</ul>` : html`<p>No reminders yet.</p>`}`);
    const d = new Date(); d.setDate(d.getDate() + 1);
    el.querySelector("#date").value = d.toISOString().slice(0, 10);
  };
  draw();
  on(el, "submit", "#f", async (e) => {
    e.preventDefault();
    const when = new Date(`${el.querySelector("#date").value}T${el.querySelector("#time").value}`).getTime();
    if (!(when > Date.now())) { toast("Please choose a date and time in the future."); return; }
    list.push({ id: uid(), what: el.querySelector("#what").value.trim().slice(0, 120), when, repeat: el.querySelector("#repeat").value });
    await setValue("reminders", list);
    await sendToBackground({ type: "reminders-updated" });
    toast("Reminder added.");
    draw();
  });
  on(el, "click", "[data-del]", async (e, b) => {
    list = list.filter((r) => r.id !== b.dataset.del);
    await setValue("reminders", list);
    await sendToBackground({ type: "reminders-updated" });
    draw();
  });
}

function renderGlossary(el, ctx) {
  el.innerHTML = String(html`${ctx.pageHeader("Computer words explained", "Type a word to find it, or scroll through the list.")}
    <label for="find">Find a word</label><input id="find" type="search" style="max-width:28rem;margin-bottom:1rem">
    <ul class="list-plain card" id="words">${GLOSSARY.map((g) => html`<li data-term="${(g.term + " " + g.meaning).toLowerCase()}"><span class="glossary-term">${g.term}</span><br>${g.meaning}</li>`)}</ul>`);
  on(el, "input", "#find", (e, inp) => {
    const q = inp.value.toLowerCase().trim();
    el.querySelectorAll("[data-term]").forEach((li) => { li.hidden = q && !li.dataset.term.includes(q); });
  });
}
