// Talks to the optional EasyAccess backend (backend/server.mjs).
// API keys live ONLY on that server — never in the extension.
// Nothing is sent unless (1) a server address is configured and (2) the person has agreed.
import { getSettings } from "./settings.js";

export class AiUnavailable extends Error {}

export async function aiStatus() {
  const s = await getSettings();
  if (!s.aiServerUrl) return { ready: false, reason: "not-configured" };
  if (!s.aiConsent) return { ready: false, reason: "no-consent" };
  return { ready: true, url: s.aiServerUrl };
}

async function post(path, body, { timeoutMs = 60000 } = {}) {
  const s = await getSettings();
  if (!s.aiServerUrl) throw new AiUnavailable("The AI helper isn't set up yet. A family member can set it up in Settings.");
  if (!s.aiConsent) throw new AiUnavailable("You haven't agreed to use the AI helper yet. You can turn it on in Settings → AI helper.");
  let base;
  try {
    base = new URL(s.aiServerUrl);
  } catch (e) {
    throw new AiUnavailable("The AI helper address in Settings doesn't look right.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (base.protocol !== "https:" && !local) throw new AiUnavailable("For your safety, the AI helper address must start with https://");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(new URL(path, base).href, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(s.aiAccessCode ? { "X-EasyAccess-Code": s.aiAccessCode } : {}) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      credentials: "omit",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `The AI helper had a problem (code ${res.status}).`);
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The AI helper is taking too long to answer. Please try again in a moment.");
    if (err instanceof TypeError) throw new Error("I couldn't reach the AI helper. Please check your internet connection.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** messages: [{role: "user"|"assistant", content: string}], context: optional page explanation text */
export async function chat(messages, context) {
  const data = await post("/api/chat", { messages: messages.slice(-12), context: context || null });
  return data.reply;
}

export async function explainPage(snapshot, question) {
  const trimmed = {
    url: snapshot.url, title: snapshot.title, headings: snapshot.headings, buttons: snapshot.buttons,
    forms: snapshot.forms, dialogs: snapshot.dialogs, alerts: snapshot.alerts, text: (snapshot.visibleText || "") + "\n" + (snapshot.text || "").slice(0, 6000),
  };
  const data = await post("/api/explain-page", { snapshot: trimmed, question: question || "" });
  return data.reply;
}

export async function explainScreenshot(imageDataUrl, question) {
  const data = await post("/api/explain-screenshot", { image: imageDataUrl, question: question || "" }, { timeoutMs: 90000 });
  return data.reply;
}

export async function reviewMessage(message) {
  const data = await post("/api/review-message", { message });
  return data.reply;
}

export async function simplifyEmail(text, task) {
  const data = await post("/api/email", { text, task });
  return data.reply;
}

/** Threat-list lookup through the backend (Google Safe Browsing). Returns null if not available. */
export async function checkUrlReputation(url) {
  const s = await getSettings();
  if (!s.aiServerUrl || !s.safeBrowsingViaServer) return null;
  try {
    const base = new URL(s.aiServerUrl);
    const res = await fetch(new URL("/api/check-url", base).href, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(s.aiAccessCode ? { "X-EasyAccess-Code": s.aiAccessCode } : {}) },
      body: JSON.stringify({ url }),
      credentials: "omit",
    });
    if (!res.ok) return null;
    return await res.json(); // { configured: bool, dangerous: bool, threats: [] }
  } catch (e) {
    return null;
  }
}
