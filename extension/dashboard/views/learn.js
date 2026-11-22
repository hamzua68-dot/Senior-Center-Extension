import { html, raw, platform, modKey } from "../../shared/ui.js";
import { createReader } from "../../shared/speech.js";
import { TUTORIALS, TUTORIAL_CATEGORIES, findTutorial } from "../../data/tutorials.js";
import { on, ico, tile } from "./common.js";

// Simple illustrations of the parts of Chrome the lessons talk about.
const PICTURES = {
  tabs: `<svg viewBox="0 0 420 120" role="img" aria-label="Drawing of browser tabs at the top of Chrome, with a plus button for a new tab">
    <rect x="2" y="2" width="416" height="116" rx="10" fill="var(--surface-2)" stroke="var(--border)" stroke-width="3"/>
    <path d="M14 50 L24 18 H140 L150 50 Z" fill="var(--surface)" stroke="var(--brand)" stroke-width="3"/><text x="38" y="40" font-size="16" fill="var(--text)">Medicare</text><text x="124" y="40" font-size="18" fill="var(--text)">×</text>
    <path d="M150 50 L160 22 H270 L280 50 Z" fill="var(--surface-2)" stroke="var(--border)" stroke-width="3"/><text x="174" y="42" font-size="16" fill="var(--text-soft)">Weather</text>
    <circle cx="302" cy="36" r="15" fill="var(--help)"/><text x="295" y="43" font-size="22" font-weight="bold" fill="#fff">+</text>
    <text x="322" y="42" font-size="15" fill="var(--help)" font-weight="bold">New tab</text>
    <rect x="14" y="62" width="392" height="36" rx="18" fill="var(--surface)" stroke="var(--border)" stroke-width="2"/><text x="32" y="86" font-size="15" fill="var(--text-soft)">www.medicare.gov   ← the address bar</text></svg>`,
  "chrome-menu": `<svg viewBox="0 0 420 110" role="img" aria-label="Drawing of the top-right corner of Chrome with the three dots menu button highlighted">
    <rect x="2" y="2" width="416" height="106" rx="10" fill="var(--surface-2)" stroke="var(--border)" stroke-width="3"/>
    <rect x="14" y="36" width="300" height="36" rx="18" fill="var(--surface)" stroke="var(--border)" stroke-width="2"/>
    <circle cx="380" cy="54" r="24" fill="none" stroke="var(--help)" stroke-width="4"/>
    <circle cx="380" cy="42" r="4" fill="var(--text)"/><circle cx="380" cy="54" r="4" fill="var(--text)"/><circle cx="380" cy="66" r="4" fill="var(--text)"/>
    <text x="330" y="100" font-size="14" fill="var(--help)" font-weight="bold">three dots ⋮</text></svg>`,
  "download-icon": `<svg viewBox="0 0 420 110" role="img" aria-label="Drawing of the download arrow icon at the top right of Chrome">
    <rect x="2" y="2" width="416" height="106" rx="10" fill="var(--surface-2)" stroke="var(--border)" stroke-width="3"/>
    <rect x="14" y="36" width="260" height="36" rx="18" fill="var(--surface)" stroke="var(--border)" stroke-width="2"/>
    <circle cx="330" cy="54" r="24" fill="none" stroke="var(--help)" stroke-width="4"/>
    <path d="M330 40 V62 M320 53 L330 63 L340 53 M318 68 H342" stroke="var(--text)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="390" cy="54" r="3.5" fill="var(--text)"/><circle cx="390" cy="44" r="3.5" fill="var(--text)"/><circle cx="390" cy="64" r="3.5" fill="var(--text)"/>
    <text x="290" y="100" font-size="14" fill="var(--help)" font-weight="bold">downloads</text></svg>`,
};

function stepText(step) {
  const p = platform();
  const t = (p === "mac" && step.mac) || (p === "cros" && step.cros) || (p === "win" && step.win) || step.text;
  return t.replace(/\{mod\}/g, modKey());
}
function stepKeys(step) {
  const p = platform();
  const keys = (p === "mac" && step.macKeys) || (p === "cros" && step.crosKeys) || step.keys;
  return (keys || []).map((k) => (k === "{mod}" ? (p === "mac" ? "⌘ Command" : "Ctrl") : k));
}

export default {
  title: "Help me use my computer",
  async render(el, ctx) {
    const id = ctx.params[0];
    const tut = id && findTutorial(id);
    if (!tut) {
      el.innerHTML = String(html`
        ${ctx.pageHeader("Help me use my computer", "Choose a task. I'll show you one step at a time, and you can go back, repeat or have it read aloud whenever you like.")}
        <label for="find">Search for a task</label>
        <input id="find" type="search" placeholder="For example: print, Wi-Fi, attach" style="max-width:32rem;margin-bottom:1rem">
        <div id="list">
        ${TUTORIAL_CATEGORIES.map((c) => html`
          <section data-cat>
            <h2 class="section-title">${c.title}</h2>
            <div class="tile-grid">
              ${TUTORIALS.filter((t) => t.category === c.id).map((t) => tile({ href: `#/learn/${t.id}`, iconName: t.icon, title: t.title, desc: t.summary, attrs: `data-search="${(t.title + " " + t.summary).toLowerCase().replace(/"/g, "")}"` }))}
            </div>
          </section>`)}
        </div>
        <p id="none" class="notice" hidden>I couldn't find that task. Try another word, or <a href="#/assistant">ask the helper</a>.</p>`);
      const find = el.querySelector("#find");
      find.addEventListener("input", () => {
        const q = find.value.toLowerCase().trim();
        let any = false;
        el.querySelectorAll("[data-cat]").forEach((sec) => {
          let shown = 0;
          sec.querySelectorAll("[data-search]").forEach((a) => { const m = !q || a.dataset.search.includes(q); a.hidden = !m; if (m) shown++; });
          sec.hidden = !shown; if (shown) any = true;
        });
        el.querySelector("#none").hidden = any;
      });
      return;
    }

    let i = Math.min(Number(ctx.query.get("step") || 1) - 1, tut.steps.length - 1);
    let autoRead = ctx.settings.voiceAnswers;
    const reader = createReader();
    const draw = () => {
      const step = tut.steps[i];
      const keys = stepKeys(step);
      el.innerHTML = String(html`
        ${ctx.pageHeader(tut.title, tut.summary)}
        <p class="lesson-progress">Step ${i + 1} of ${tut.steps.length}</p>
        <div class="progress-bar" aria-hidden="true"><span style="width:${((i + 1) / tut.steps.length) * 100}%"></span></div>
        <div class="card">
          <p class="lesson-step" id="step-text" tabindex="-1">${stepText(step)}</p>
          ${keys.length ? html`<div class="keys" aria-label="Keys to press together: ${keys.join(" and ")}">${keys.map((k, n) => html`${n ? html`<span aria-hidden="true">+</span>` : ""}<span class="kbd">${k}</span>`)}</div>${step.tip ? html`<p class="muted">${step.tip}</p>` : ""}` : ""}
          ${step.picture && PICTURES[step.picture] ? html`<div class="lesson-picture">${raw(PICTURES[step.picture])}</div>` : ""}
        </div>
        <div class="lesson-nav">
          <button type="button" class="btn btn-lg" data-act="prev" ${i === 0 ? "disabled" : ""}>${ico("back")} Back</button>
          <button type="button" class="btn btn-lg" data-act="read">${ico("speaker")} Read aloud</button>
          <button type="button" class="btn btn-lg" data-act="repeat">${ico("repeat")} Repeat</button>
          ${i < tut.steps.length - 1
            ? html`<button type="button" class="btn btn-primary btn-lg" data-act="next">Next ${ico("next")}</button>`
            : html`<a class="btn btn-help btn-lg" href="#/learn">${ico("check")} I did it!</a>`}
        </div>
        <div class="btn-row" style="margin-top:1.5rem">
          <a class="btn btn-quiet" href="#/assistant?q=${encodeURIComponent("I'm still confused about: " + tut.title)}">${ico("help")} I'm still confused</a>
          <a class="btn btn-quiet" href="#/family/share?from=lesson&lesson=${tut.id}&step=${i + 1}">${ico("family")} Ask my family for help with this</a>
          <label class="choice" style="margin:0"><input type="checkbox" id="auto" ${autoRead ? "checked" : ""}> Read each step aloud automatically</label>
        </div>`);
      const h1 = el.querySelector("h1"); h1.tabIndex = -1;
      if (autoRead) reader.speak(el.querySelector("#step-text").innerText);
    };
    draw();
    on(el, "click", "[data-act]", (e, b) => {
      const act = b.dataset.act;
      if (act === "next" && i < tut.steps.length - 1) { i++; reader.stop(); draw(); el.querySelector("#step-text").focus(); }
      if (act === "prev" && i > 0) { i--; reader.stop(); draw(); }
      if (act === "read" || act === "repeat") reader.speak(el.querySelector("#step-text").innerText);
    });
    on(el, "change", "#auto", (e, cb) => { autoRead = cb.checked; if (autoRead) reader.speak(el.querySelector("#step-text").innerText); else reader.stop(); });
    const keyHandler = (e) => {
      if (e.target.matches("input, textarea")) return;
      if (e.key === "ArrowRight") el.querySelector("[data-act=next]")?.click();
      if (e.key === "ArrowLeft") el.querySelector("[data-act=prev]")?.click();
    };
    document.addEventListener("keydown", keyHandler);
    return () => { reader.stop(); document.removeEventListener("keydown", keyHandler); };
  },
};
