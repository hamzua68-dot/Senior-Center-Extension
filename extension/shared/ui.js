// Small DOM helpers used across views. All user/page-provided text goes through
// esc() (or textContent) — we never inject untrusted HTML.
import { icon } from "./icons.js";

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Marks a string as already-safe HTML for the html`` template. */
export const raw = (value) => ({ __raw: true, value: String(value), toString() { return String(value); } });

/** Tagged template that escapes every interpolation unless it was wrapped with raw()/html``. */
export function html(strings, ...values) {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i];
      if (v && v.__raw) out += v.value;
      else if (Array.isArray(v)) out += v.map((x) => (x && x.__raw ? x.value : esc(x))).join("");
      else if (v === false || v == null) out += "";
      else out += esc(v);
    }
  });
  return raw(out);
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

export function toast(message, ms = 3500) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.parentNode && el.parentNode.removeChild(el), ms);
}

const VERDICT_TEXT = {
  green: { title: "No obvious warning signs found", icon: "check" },
  yellow: { title: "Be careful — something needs checking", icon: "alert" },
  red: { title: "Warning — this looks dangerous", icon: "x" },
};

export function verdictBox(level, bodyHtml, titleOverride) {
  const v = VERDICT_TEXT[level] || VERDICT_TEXT.yellow;
  const word = level === "green" ? "Green" : level === "red" ? "Red" : "Yellow";
  return raw(`<div class="verdict verdict-${level}" role="status">
    <div class="verdict-icon">${icon(v.icon)}</div>
    <div><p class="verdict-title"><span class="visually-hidden">${word}: </span>${esc(titleOverride || v.title)}</p>${bodyHtml ? String(bodyHtml) : ""}</div>
  </div>`);
}

export function copyText(text) {
  return navigator.clipboard.writeText(text).then(() => true, () => false);
}

export function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function platform() {
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent;
  if (/cros/i.test(navigator.userAgent) || /chrome ?os/i.test(p)) return "cros";
  if (/mac/i.test(p)) return "mac";
  if (/win/i.test(p)) return "win";
  return "linux";
}

export function modKey() { return platform() === "mac" ? "Command (⌘)" : "Ctrl"; }

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
