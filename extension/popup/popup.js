// Toolbar popup. Clicking the EasyAccess button grants temporary access (activeTab)
// to THIS tab only, which is what lets us read the page when the person asks.
import { initSettings } from "../shared/settings.js";
import { icon } from "../shared/icons.js";
import { esc, verdictBox, html } from "../shared/ui.js";
import { collectPageSnapshot, collectGmailMessage } from "../shared/page-snapshot.js";

const E = window.EasyAccessEngine;
const DASH = chrome.runtime.getURL("dashboard/dashboard.html");
const $ = (s) => document.querySelector(s);

let tab = null;

function open(route) {
  chrome.tabs.create({ url: DASH + route });
  window.close();
}

function busy(btn, text) {
  btn.disabled = true;
  btn.dataset.label = btn.innerHTML;
  btn.innerHTML = `${icon("clock")} <span class="spinner-text">${esc(text)}</span>`;
}
function unbusy(btn) { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }

function showMessage(text) {
  $("#result").innerHTML = `<div class="notice" style="margin-top:0.8rem">${esc(text)}</div>`;
}

async function snapshot() {
  const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectPageSnapshot });
  const snap = res && res.result;
  if (!snap) throw new Error("no snapshot");
  await chrome.storage.session.set({ lastSnapshot: snap });
  return snap;
}

const isWeb = (u) => /^https?:/i.test(u || "");

async function render() {
  await initSettings();
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url;
  const web = isWeb(url);
  const gmail = web && /^https:\/\/mail\.google\.com\//.test(url);

  if (web) {
    const r = E.analyzeUrl(url);
    const host = r.host.replace(/^www\./, "");
    const body = r.level === "green"
      ? `<p>${esc(host)}${r.official ? ` — the real ${esc(E.brandName(r.official))} website` : ""}</p>`
      : `<p>${esc(host)}: ${esc(r.reasons[0] ? r.reasons[0].text : "")}</p>`;
    $("#site").innerHTML = String(verdictBox(r.level, body, r.level === "green" ? "No obvious warning signs" : r.level === "red" ? "Warning: this website looks dangerous" : "Be careful on this website"));
  } else {
    $("#site").innerHTML = `<div class="notice">This isn't a website, so there's nothing to check here. You can still use everything below.</div>`;
  }

  $("#actions").innerHTML = `
    <button class="btn btn-help" data-act="help">${icon("help")} I need help — show me what to do</button>
    ${gmail ? `<button class="btn btn-primary" data-act="gmail">${icon("mail")} Is this email safe?</button>` : ""}
    <button class="btn" data-act="explain" ${web ? "" : "disabled"}>${icon("eye")} What am I looking at?</button>
    <button class="btn" data-act="real" ${web ? "" : "disabled"}>${icon("shieldCheck")} Is this real? Is this page safe?</button>
    <button class="btn" data-act="read" ${web ? "" : "disabled"}>${icon("speaker")} Read this page to me</button>
    <button class="btn" data-act="shot" ${web ? "" : "disabled"}>${icon("camera")} Take a picture of my screen for help</button>
    <div class="btn-row-2">
      <button class="btn btn-danger" data-act="emergency">${icon("alert")} Emergency</button>
      <button class="btn" data-act="home">${icon("home")} Open EasyAccess</button>
    </div>`;

  $("#actions").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    try {
      if (act === "help") return open("#/assistant");
      if (act === "emergency") return open("#/emergency");
      if (act === "home") return open("#/home");
      if (act === "explain") { busy(btn, "Looking at the page"); await snapshot(); return open("#/screen"); }
      if (act === "real") {
        busy(btn, "Checking");
        const snap = await snapshot();
        const a = E.analyzePage(snap);
        unbusy(btn);
        const msg = a.fakeAlert
          ? "This looks like a FAKE warning. Don't call any number on the page or let anyone connect to your computer. Close the tab: press Ctrl + W (⌘ + W on a Mac)."
          : a.level === "red" ? "This page has serious warning signs. Don't type anything into it — it's safest to close it."
            : a.level === "yellow" ? "Be careful. Some things on this page need checking before you trust it."
              : "I didn't see obvious warning signs. That's not a guarantee — be careful if it asks for money or personal details.";
        $("#result").innerHTML = String(verdictBox(a.level, html`<p>${msg}</p>`)) +
          `<button class="btn btn-block" data-act="explain-more">${icon("next")} Show me why and what to do</button>`;
        $("#result").querySelector("[data-act=explain-more]").addEventListener("click", () => open("#/screen?q=real"));
        return;
      }
      if (act === "read") {
        busy(btn, "Starting");
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/reader.js"] });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.__easyAccessReader && window.__easyAccessReader.start("") });
        window.close();
        return;
      }
      if (act === "shot") {
        $("#result").innerHTML = `<div class="notice" style="margin-top:0.8rem"><p><strong>Take a picture of this page?</strong> It stays on your computer. You'll choose later whether to send it to anyone.</p>
          <p class="small">Tip: close anything private (like bank pages or messages) first.</p>
          <div class="btn-row-2"><button class="btn btn-primary" id="shot-yes">${icon("camera")} Yes, take it</button><button class="btn" id="shot-no">No</button></div></div>`;
        $("#shot-no").addEventListener("click", () => { $("#result").innerHTML = ""; });
        $("#shot-yes").addEventListener("click", async () => {
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 });
            await chrome.storage.session.set({ lastScreenshot: { dataUrl, title: tab.title, url: tab.url, at: Date.now() } });
            await snapshot().catch(() => null);
            open("#/screen");
          } catch (err) {
            showMessage("Sorry, I couldn't take a picture of this page. Some pages, like Chrome's own settings, can't be captured.");
          }
        });
        return;
      }
      if (act === "gmail") {
        busy(btn, "Reading the email");
        const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectGmailMessage });
        const m = res && res.result;
        unbusy(btn);
        if (!m || !m.found) { showMessage("Please open the email first (click on it in your inbox), then press this button again."); return; }
        await chrome.storage.session.set({ lastEmail: { ...m, at: Date.now() } });
        return open("#/email/open");
      }
    } catch (err) {
      console.warn(err);
      unbusy(btn);
      showMessage("Sorry, EasyAccess can't read this page. Some pages (like Chrome's own pages or the Chrome Web Store) don't allow it. You can still ask for help or open EasyAccess.");
    }
  });
}

render();
