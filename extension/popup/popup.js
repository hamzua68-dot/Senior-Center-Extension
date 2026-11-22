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
  $("#result").innerHTML = `<div class="notice">${esc(text)}</div>`;
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

  // 1 + 2: which website, and are there warning signs? (icon + words + colour)
  if (web) {
    const r = E.analyzeUrl(url);
    const host = r.host.replace(/^www\./, "");
    const status = {
      green: { icon: "check", text: "No warning signs found" },
      yellow: { icon: "alert", text: "Be careful on this website" },
      red: { icon: "x", text: "Warning signs found" },
    }[r.level];
    const detail = r.level === "green"
      ? (r.official ? `This is the real ${E.brandName(r.official)} website.` : "No automatic check is perfect, so stay alert if it asks for money or personal details.")
      : (r.reasons[0] ? r.reasons[0].text : "");
    $("#site").innerHTML = `
      <p class="site-label">You are on</p>
      <p class="site-name">${esc(host)}</p>
      <p class="site-status status-${r.level}">${icon(status.icon)} ${esc(status.text)}</p>
      ${detail ? `<p class="site-detail">${esc(detail)}</p>` : ""}`;
  } else {
    $("#site").innerHTML = `
      <p class="site-label">You are on</p>
      <p class="site-name">${esc(tab && tab.title ? tab.title : "A Chrome page")}</p>
      <p class="site-status status-none">${icon("info")} This isn't a website, so there's nothing to check</p>`;
  }

  // 3: help — the biggest button, then questions about this page
  $("#actions").innerHTML = `
    <button class="btn btn-help" data-act="help">${icon("help")} <span class="two-line"><span class="t1">I need help</span><span class="t2">Show me what to do</span></span></button>
    ${web ? `<p class="group-label">Ask about this page</p>` : ""}
    ${gmail ? `<button class="btn btn-primary" data-act="gmail">${icon("mail")} Is this email safe?</button>` : ""}
    ${web ? `
      <button class="btn" data-act="explain">${icon("eye")} What am I looking at?</button>
      <button class="btn" data-act="real">${icon("shieldCheck")} Is this page safe?</button>
      <button class="btn" data-act="read">${icon("speaker")} Read this page to me</button>
      <button class="link-btn" data-act="shot">${icon("camera")} Take a picture of my screen for help</button>` : ""}`;

  // 4: emergency and home — always in the same place at the bottom
  $("#footer").innerHTML = `
    <button class="btn btn-danger" data-act="emergency">${icon("alert")} <span class="two-line"><span class="t1">Emergency help</span><span class="t2">I think I've been scammed</span></span></button>
    <button class="link-btn" data-act="home">${icon("home")} Open the full EasyAccess</button>`;

  document.querySelector(".pop-main").addEventListener("click", async (e) => {
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
        $("#result").innerHTML = `<div class="notice"><p><strong>Take a picture of this page?</strong> It stays on your computer. You'll choose later whether to send it to anyone.</p>
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
