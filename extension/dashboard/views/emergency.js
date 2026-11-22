import { html } from "../../shared/ui.js";
import { getValue, setValue } from "../../shared/storage.js";
import { say, stopSpeaking } from "../../shared/speech.js";
import { PATHWAYS, RESOURCES, CALM } from "../../data/emergency.js";
import { on, ico } from "./common.js";

function resourceCard(id) {
  const r = RESOURCES[id];
  if (!r) return "";
  return html`<li class="site-item"><div><div class="site-name">${r.name}</div><div class="site-url">${r.detail}</div></div>
    ${r.url ? html`<a class="btn btn-primary" href="${r.url}" target="_blank" rel="noopener noreferrer">${ico("globe")} Open</a>` : ""}
    ${r.phone ? html`<a class="btn btn-primary" href="tel:${r.phone.replace(/[^\d]/g, "")}">${ico("phone")} ${r.phone}</a>` : ""}</li>`;
}

export default {
  title: "Emergency help",
  async render(el, ctx) {
    const id = ctx.params[0];
    const p = id && PATHWAYS.find((x) => x.id === id);
    if (!p) {
      el.innerHTML = String(html`
        ${ctx.pageHeader("Emergency help", CALM)}
        <h2>What happened?</h2>
        <div class="tile-grid">
          ${PATHWAYS.map((x) => html`<a class="tile" href="#/emergency/${x.id}"><span class="tile-icon" style="background:var(--danger-bg);color:var(--danger)">${ico(x.icon)}</span><span class="tile-title">${x.title}</span></a>`)}
        </div>
        <div class="card" style="margin-top:1.5rem">
          <h2>Talk to a real person</h2>
          <ul class="list-plain">${resourceCard("elderHotline")}${resourceCard("reportfraud")}${resourceCard("identitytheft")}${resourceCard("ic3")}</ul>
          <p><strong>Your bank:</strong> call the number on the back of your bank card or on a paper statement. Don't use numbers from emails, texts or pop-ups.</p>
          <p><strong>In danger right now?</strong> Call 911.</p>
        </div>
        <p class="muted">EasyAccess will never ask you to type bank passwords, card numbers or your Social Security number.</p>`);
      return;
    }
    const done = await getValue(`emergency-${p.id}`, []);
    el.innerHTML = String(html`
      ${ctx.pageHeader(p.title, CALM)}
      <div class="card" id="steps">
        <h2>Do these steps, in order</h2>
        <ol class="choice-list">${p.steps.map((s, n) => html`<li><label class="choice" style="font-weight:500"><input type="checkbox" data-step="${n}" ${done.includes(n) ? "checked" : ""}> <span><strong>Step ${n + 1}.</strong> ${s}</span></label></li>`)}</ol>
        <p class="muted">Tick each step when it's done. Your ticks are saved on this computer.</p>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" id="speak">${ico("speaker")} Read these steps aloud</button>
        <a class="btn" href="#/family/share">${ico("family")} Ask my family for help</a>
      </div>
      <div class="card">
        <h2>Official help</h2>
        <ul class="list-plain">${p.resources.map(resourceCard)}</ul>
        <p>Always contact banks and companies using the phone number on your card or statement, or by typing their official website address yourself.</p>
      </div>
      <a class="btn btn-quiet" href="#/emergency">${ico("back")} Something else happened</a>`);
    el.querySelector("#speak").addEventListener("click", () => say(`${p.title}. ${p.steps.map((s, n) => `Step ${n + 1}. ${s}`).join(" ")}`));
    on(el, "change", "[data-step]", async () => {
      const ticked = Array.from(el.querySelectorAll("[data-step]:checked")).map((c) => +c.dataset.step);
      await setValue(`emergency-${p.id}`, ticked);
    });
    return () => stopSpeaking();
  },
};
