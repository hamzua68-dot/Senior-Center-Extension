import { html, toast } from "../../shared/ui.js";
import { updateSettings, TEXT_SIZES } from "../../shared/settings.js";
import { on, ico } from "./common.js";

export default {
  title: "Welcome",
  async render(el, { settings, navigate }) {
    let step = 0;
    const draw = () => {
      const steps = [
        html`
          <h1>Welcome to EasyAccess</h1>
          <p class="page-intro">Your friendly helper for using the computer and the internet. You don't have to understand computers — just tell EasyAccess what you need help with.</p>
          <div class="card">
            <h2>EasyAccess can:</h2>
            <ul class="reason-list">
              <li>Check emails, messages and websites for scams</li>
              <li>Explain what's on your screen in plain English</li>
              <li>Read web pages and emails aloud</li>
              <li>Show you how to do everyday computer tasks, one step at a time</li>
              <li>Help you if you think you've been scammed</li>
            </ul>
          </div>
          <div class="notice notice-info"><strong>You are always in control.</strong> EasyAccess never clicks, buys, sends or deletes anything for you.</div>`,
        html`
          <h1>Is this text easy to read?</h1>
          <p class="page-intro">Choose the size that's most comfortable. You can change it any time.</p>
          <div class="segmented" role="group" aria-label="Text size">
            ${TEXT_SIZES.map((t) => html`<button type="button" class="btn btn-lg" data-size="${t.id}" aria-pressed="${String(settings.textSize === t.id)}">${t.label}</button>`)}
          </div>
          <div class="segmented" role="group" aria-label="Colours" style="margin-top:1rem">
            <button type="button" class="btn" data-theme-choice="light" aria-pressed="${String(settings.theme === "light")}">Light colours</button>
            <button type="button" class="btn" data-theme-choice="dark" aria-pressed="${String(settings.theme === "dark")}">Dark colours</button>
            <button type="button" class="btn" data-theme-choice="contrast" aria-pressed="${String(settings.theme === "contrast")}">Extra-strong contrast</button>
          </div>`,
        html`
          <h1>Where to find EasyAccess</h1>
          <p class="page-intro">On any website, look at the top-right corner of Chrome for the EasyAccess button (a blue shield). Click it for help with the page you're on.</p>
          <div class="card">
            <p><strong>Can't see it?</strong> Click the jigsaw-puzzle piece at the top right of Chrome, then click the pin next to EasyAccess. It will then always be visible.</p>
            <p>You can also open EasyAccess by pressing <span class="kbd">Alt</span> + <span class="kbd">Shift</span> + <span class="kbd">E</span>.</p>
            <p>And you can right-click on any web page or link and choose an EasyAccess option, such as "Read this aloud" or "Check this link".</p>
          </div>`,
        html`
          <h1>Your privacy</h1>
          <p class="page-intro">EasyAccess only looks at a web page when you click it and ask. Your settings and favourites stay on this computer.</p>
          <div class="card">
            <ul class="reason-list">
              <li>EasyAccess never asks for or stores your passwords or bank details.</li>
              <li>Scam checks happen on your computer.</li>
              <li>The optional AI helper only receives what you choose to send — and only after you agree. It's off until you or a family member turns it on.</li>
            </ul>
            <a href="#/privacy">Read more about privacy</a>
          </div>`,
      ];
      el.innerHTML = String(html`
        <p class="lesson-progress">Step ${step + 1} of ${steps.length}</p>
        <div class="progress-bar"><span style="width:${((step + 1) / steps.length) * 100}%"></span></div>
        ${steps[step]}
        <div class="lesson-nav">
          ${step > 0 ? html`<button type="button" class="btn btn-lg" data-act="back">${ico("back")} Back</button>` : html`<span></span>`}
          ${step < steps.length - 1
            ? html`<button type="button" class="btn btn-primary btn-lg" data-act="next">Next ${ico("next")}</button>`
            : html`<button type="button" class="btn btn-help btn-lg" data-act="finish">${ico("check")} Start using EasyAccess</button>`}
        </div>`);
      const h1 = el.querySelector("h1"); h1.tabIndex = -1; h1.focus();
    };
    draw();
    on(el, "click", "[data-act]", async (e, b) => {
      if (b.dataset.act === "next") { step++; draw(); }
      if (b.dataset.act === "back") { step--; draw(); }
      if (b.dataset.act === "finish") { await updateSettings({ onboarded: true }); navigate("#/home"); }
    });
    on(el, "click", "[data-size]", async (e, b) => { settings = await updateSettings({ textSize: b.dataset.size }); draw(); toast("Text size changed."); });
    on(el, "click", "[data-theme-choice]", async (e, b) => { settings = await updateSettings({ theme: b.dataset.themeChoice }); draw(); });
  },
};
