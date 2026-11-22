// EasyAccess background service worker (Manifest V3, ES module).
// Responsibilities: right-click menus, optional "protect me everywhere" content scripts,
// per-site safety badge, warning page for clearly dangerous sites, and reminders.
import "../engine/scam-engine.js";
import { collectPageSnapshot } from "../shared/page-snapshot.js";

const E = globalThis.EasyAccessEngine;
const DASHBOARD = chrome.runtime.getURL("dashboard/dashboard.html");
const GUARD_ID = "easyaccess-guard";

// ------------------------------------------------------------------ helpers
async function getSettings() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  return settings;
}

function openDashboard(route = "#/home") {
  return chrome.tabs.create({ url: DASHBOARD + route });
}

function isWebUrl(url) {
  return /^https?:/i.test(url || "");
}

async function hasAllSites() {
  try { return await chrome.permissions.contains({ origins: ["<all_urls>"] }); } catch (e) { return false; }
}

async function takeSnapshot(tabId) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: collectPageSnapshot });
  if (!res || !res.result) throw new Error("no-result");
  await chrome.storage.session.set({ lastSnapshot: res.result });
  return res.result;
}

async function startReader(tabId, text) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content/reader.js"] });
  await chrome.scripting.executeScript({ target: { tabId }, func: (t) => window.__easyAccessReader && window.__easyAccessReader.start(t), args: [text || ""] });
}

// ------------------------------------------------------------------ context menus
function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "ea-explain", title: "EasyAccess: What am I looking at?", contexts: ["page", "frame", "image"] });
    chrome.contextMenus.create({ id: "ea-read-page", title: "EasyAccess: Read this page to me", contexts: ["page", "frame"] });
    chrome.contextMenus.create({ id: "ea-read-selection", title: "EasyAccess: Read this aloud", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "ea-check-text", title: "EasyAccess: Is this a scam?", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "ea-check-link", title: "EasyAccess: Is this link safe?", contexts: ["link"] });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "ea-check-link") {
      // The link is analysed, never opened.
      return openDashboard("#/check/link?url=" + encodeURIComponent(info.linkUrl || ""));
    }
    if (info.menuItemId === "ea-check-text") {
      await chrome.storage.session.set({ pendingCheckText: String(info.selectionText || "").slice(0, 15000) });
      return openDashboard("#/check/message");
    }
    if (!tab || !isWebUrl(tab.url || info.pageUrl)) {
      return openDashboard(info.menuItemId === "ea-explain" ? "#/screen" : "#/read");
    }
    if (info.menuItemId === "ea-explain") {
      await takeSnapshot(tab.id);
      return openDashboard("#/screen");
    }
    if (info.menuItemId === "ea-read-selection") return startReader(tab.id, info.selectionText || "");
    if (info.menuItemId === "ea-read-page") return startReader(tab.id, "");
  } catch (err) {
    console.warn("EasyAccess menu action failed", err);
    if (info.menuItemId === "ea-read-selection" && info.selectionText) {
      await chrome.storage.session.set({ pendingReadText: info.selectionText });
      openDashboard("#/read");
    } else {
      openDashboard(info.menuItemId === "ea-explain" ? "#/screen" : "#/read");
    }
  }
});

// ------------------------------------------------------------------ protection (optional)
async function syncProtection() {
  const s = await getSettings();
  const allowed = await hasAllSites();
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [GUARD_ID] }).catch(() => []);
  if (s.protectionEnabled && allowed) {
    if (!existing.length) {
      await chrome.scripting.registerContentScripts([{
        id: GUARD_ID,
        matches: ["http://*/*", "https://*/*"],
        js: ["engine/scam-engine.js", "content/guard.js"],
        runAt: "document_idle",
        allFrames: false,
        persistAcrossSessions: true,
      }]);
    }
    return true;
  }
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [GUARD_ID] });
  // Clear badges
  return false;
}

chrome.permissions.onRemoved.addListener(async () => {
  if (!(await hasAllSites())) {
    const s = await getSettings();
    await chrome.storage.local.set({ settings: { ...s, protectionEnabled: false } });
    await syncProtection();
  }
});

// Per-site safety badge and warning page (only when protection is on: needs site access).
// Remember the last *website* tab (needs site access to see its address).
async function rememberWebTab(tabId, url) {
  if (isWebUrl(url)) await chrome.storage.session.set({ lastWebTabId: tabId });
}
async function lastWebTabId() {
  const { lastWebTabId: id = null } = await chrome.storage.session.get("lastWebTabId");
  if (id == null) return null;
  try { const t = await chrome.tabs.get(id); return isWebUrl(t.url) ? id : null; } catch (e) { return null; }
}
async function isAllowedThisSession(host) {
  const { allowedHosts = [] } = await chrome.storage.session.get("allowedHosts");
  return allowedHosts.includes(host);
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const t = await chrome.tabs.get(tabId); await rememberWebTab(tabId, t.url); } catch (e) { /* no access */ }
});

chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
  if (!change.url && change.status !== "complete") return;
  if (!tab.url || !isWebUrl(tab.url)) return;
  if (tab.active) await rememberWebTab(tabId, tab.url);
  const s = await getSettings();
  if (!s.protectionEnabled) return;
  const r = E.analyzeUrl(tab.url);
  const colours = { green: "#1b6e3a", yellow: "#b7791f", red: "#b42318" };
  chrome.action.setBadgeBackgroundColor({ tabId, color: colours[r.level] });
  chrome.action.setBadgeText({ tabId, text: r.level === "green" ? "" : r.level === "red" ? "!" : "?" });
  chrome.action.setTitle({ tabId, title: r.level === "red" ? "EasyAccess: Warning — this website looks dangerous. Click for details." : r.level === "yellow" ? "EasyAccess: Be careful on this website. Click for details." : "EasyAccess – click for help" });

  // Only clear, strong signals send the person to the full warning page.
  if (change.url && r.level === "red" && r.strong && r.score >= 6 && !(await isAllowedThisSession(r.host))) {
    const q = new URLSearchParams({ url: tab.url, reasons: JSON.stringify(r.reasons.slice(0, 4).map((x) => x.text)) });
    chrome.tabs.update(tabId, { url: chrome.runtime.getURL("warning/warning.html") + "?" + q });
  }
});

// ------------------------------------------------------------------ reminders
async function syncReminders() {
  const { reminders = [] } = await chrome.storage.local.get("reminders");
  const alarms = await chrome.alarms.getAll();
  for (const a of alarms) if (a.name.startsWith("reminder:")) await chrome.alarms.clear(a.name);
  for (const r of reminders) {
    if (r.when > Date.now() - 60000) chrome.alarms.create("reminder:" + r.id, { when: Math.max(r.when, Date.now() + 1000) });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("reminder:")) return;
  const id = alarm.name.slice(9);
  const { reminders = [] } = await chrome.storage.local.get("reminders");
  const r = reminders.find((x) => x.id === id);
  if (!r) return;
  if (r.repeat) {
    const d = new Date(r.when);
    if (r.repeat === "weekly") d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1);
    r.when = d.getTime();
  }
  const remaining = r.repeat ? reminders : reminders.filter((x) => x.id !== id);
  await chrome.storage.local.set({ reminders: remaining, dueReminder: { what: r.what, at: Date.now() } });
  await syncReminders();
  openDashboard("#/security/reminders?due=1");
});

// ------------------------------------------------------------------ messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg && msg.type) {
      case "protection-changed":
        return { ok: await syncProtection() };
      case "reminders-updated":
        await syncReminders();
        return { ok: true };
      case "snapshot-last-tab": {
        if (!(await hasAllSites())) return { ok: false, error: "no-permission" };
        const id = await lastWebTabId();
        if (id == null) return { ok: false, error: "no-tab" };
        await takeSnapshot(id);
        return { ok: true };
      }
      case "read-last-tab": {
        const id = (await hasAllSites()) ? await lastWebTabId() : null;
        if (id == null) return { ok: false, error: "no-permission" };
        await startReader(id, "");
        return { ok: true };
      }
      case "open-dashboard":
        await openDashboard(msg.route || "#/home");
        return { ok: true };
      case "guard-explain": {
        // From the in-page warning banner: explain this page in the dashboard.
        if (sender.tab) await takeSnapshot(sender.tab.id);
        await openDashboard("#/screen");
        return { ok: true };
      }
      case "close-tab": {
        if (sender.tab) await chrome.tabs.remove(sender.tab.id);
        return { ok: true };
      }
      case "allow-site": {
        if (msg.host) {
          const { allowedHosts = [] } = await chrome.storage.session.get("allowedHosts");
          await chrome.storage.session.set({ allowedHosts: Array.from(new Set(allowedHosts.concat(String(msg.host)))).slice(-50) });
        }
        return { ok: true };
      }
      case "check-url":
        return { ok: true, result: E.analyzeUrl(msg.url || "") };
      default:
        return { ok: false, error: "unknown-message" };
    }
  })().then(sendResponse, (err) => sendResponse({ ok: false, error: String(err && err.message || err) }));
  return true; // keep the channel open for the async reply
});

// ------------------------------------------------------------------ lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  createMenus();
  await syncProtection();
  await syncReminders();
  if (details.reason === "install") openDashboard("#/welcome");
});

chrome.runtime.onStartup.addListener(async () => {
  createMenus();
  await syncProtection();
  await syncReminders();
});
