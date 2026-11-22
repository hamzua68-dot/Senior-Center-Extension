// EasyAccess dashboard: app shell + hash router. Each section lives in views/<name>.js
// and exports { title, render(container, ctx) }.
import { initSettings, getSettings, updateSettings, biggerTextSize } from "../shared/settings.js";
import { icon } from "../shared/icons.js";
import { html, esc, toast, raw } from "../shared/ui.js";
import { createReader, speechSupported } from "../shared/speech.js";

const VIEWS = {
  home: () => import("./views/home.js"),
  welcome: () => import("./views/welcome.js"),
  assistant: () => import("./views/assistant.js"),
  check: () => import("./views/check.js"),
  screen: () => import("./views/screen.js"),
  email: () => import("./views/email.js"),
  learn: () => import("./views/learn.js"),
  sites: () => import("./views/sites.js"),
  read: () => import("./views/read.js"),
  connect: () => import("./views/connect.js"),
  security: () => import("./views/security.js"),
  family: () => import("./views/family.js"),
  emergency: () => import("./views/emergency.js"),
  settings: () => import("./views/settings.js"),
  privacy: () => import("./views/privacy.js"),
};

const view = document.getElementById("view");
const main = document.getElementById("main");
let settings;
let pageReader;
let cleanup = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "") || "home";
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || "home", params: parts.slice(1), query: new URLSearchParams(query) };
}

export function navigate(route) {
  if (location.hash === route) render();
  else location.hash = route;
}

/** Standard page header used by every section: Back, title, plain-English intro. */
function pageHeader(title, intro, { back = true } = {}) {
  return html`
    <div class="page-top">
      ${back ? html`<button type="button" class="btn btn-quiet" data-nav-back>${raw(icon("back"))} Back</button>` : ""}
    </div>
    <h1 class="page-title">${title}</h1>
    ${intro ? html`<p class="page-intro">${intro}</p>` : ""}`;
}

function readPageAloud() {
  if (!speechSupported()) { toast("Reading aloud isn't available in this browser."); return; }
  pageReader = pageReader || createReader({
    onState: (s) => {
      const b = document.getElementById("nav-read");
      b.innerHTML = s === "speaking" ? `${icon("stop")} <span>Stop reading</span>` : `${icon("speaker")} <span class="label-long">Read this page</span><span class="visually-hidden"> aloud</span>`;
    },
  });
  if (pageReader.state === "speaking") { pageReader.stop(); return; }
  const text = Array.from(view.querySelectorAll("h1, h2, h3, p, li, .lesson-step, label, .verdict-title"))
    .filter((el) => !el.closest("[data-no-read]") && el.offsetParent !== null)
    .map((el) => el.innerText.trim()).filter(Boolean).join(". ");
  pageReader.speak(text);
}

async function render() {
  const { name, params, query } = parseHash();
  const loader = VIEWS[name] || VIEWS.home;
  if (typeof cleanup === "function") { try { cleanup(); } catch (e) { /* ignore */ } }
  cleanup = null;
  pageReader && pageReader.stop();
  settings = await getSettings();
  if (!settings.onboarded && name !== "welcome" && name !== "privacy" && name !== "settings") {
    location.replace("#/welcome");
    return;
  }
  try {
    const mod = await loader();
    const v = mod.default;
    document.title = v.title ? `${v.title} – EasyAccess` : "EasyAccess";
    // A fresh container per page, so listeners from the previous page are discarded.
    const container = document.createElement("div");
    view.replaceChildren(container);
    const ctx = { params, query, settings, navigate, pageHeader, readPageAloud };
    cleanup = await v.render(container, ctx);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="card"><h1>Sorry, something went wrong</h1><p>This part of EasyAccess couldn't open. Please go back to the home screen and try again.</p><p class="muted">${esc(err.message)}</p><a class="btn btn-primary" href="#/home">${icon("home")} Go to the home screen</a></div>`;
  }
  // Move focus to the new page for keyboard and screen-reader users
  const h1 = view.querySelector("h1");
  if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}

function setupHeader() {
  document.getElementById("nav-home").innerHTML = `${icon("home")} <span>Home</span>`;
  document.getElementById("nav-bigger").innerHTML = `${icon("textSize")} <span>Bigger text</span>`;
  document.getElementById("nav-read").innerHTML = `${icon("speaker")} <span class="label-long">Read this page</span><span class="visually-hidden"> aloud</span>`;
  document.getElementById("nav-settings").innerHTML = `${icon("settings")} <span>Settings</span>`;

  document.getElementById("nav-bigger").addEventListener("click", async () => {
    const s = await getSettings();
    const next = biggerTextSize(s.textSize);
    if (next === s.textSize) {
      toast("This is already the biggest text size. You can also press Ctrl and + to zoom in.");
      return;
    }
    await updateSettings({ textSize: next });
    toast("Text is now bigger.");
  });
  document.getElementById("nav-read").addEventListener("click", readPageAloud);

  // Delegated "Back" buttons
  document.addEventListener("click", (e) => {
    const back = e.target.closest("[data-nav-back]");
    if (back) {
      e.preventDefault();
      // Go back within EasyAccess if we navigated here; otherwise go home.
      if (navCount > 0) { navCount -= 2; history.back(); }
      else navigate("#/home");
    }
  });
}

let navCount = 0; // number of in-app page changes in this tab
window.addEventListener("hashchange", () => {
  navCount = Math.max(0, navCount + 1);
  render();
});

(async function start() {
  settings = await initSettings((s) => { settings = s; });
  setupHeader();
  render();
  main.focus({ preventScroll: true });
})();
