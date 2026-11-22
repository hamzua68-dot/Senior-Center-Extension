import { icon } from "../../shared/icons.js";
import { html, raw } from "../../shared/ui.js";
import { say, stopSpeaking } from "../../shared/speech.js";

/** Delegated event listener: on(root, "click", "[data-action=save]", fn) */
export function on(root, type, selector, fn) {
  const handler = (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) fn(e, el);
  };
  root.addEventListener(type, handler);
  return () => root.removeEventListener(type, handler);
}

export function tile({ href, iconName, title, desc, cls = "", attrs = "" }) {
  return html`<a class="tile ${cls}" href="${href}" ${raw(attrs)}>
    <span class="tile-icon">${raw(icon(iconName))}</span>
    <span><span class="tile-title">${title}</span>${desc ? html`<br><span class="tile-desc">${desc}</span>` : ""}</span>
  </a>`;
}

export function ico(name) { return raw(icon(name)); }

/** A small "Read aloud" button for a block of text. */
export function speakButton(id, label = "Read aloud") {
  return html`<button type="button" class="btn btn-quiet" data-speak="${id}">${ico("speaker")} ${label}</button>`;
}

export function wireSpeakButtons(root) {
  return on(root, "click", "[data-speak]", (e, btn) => {
    const target = root.querySelector(`#${CSS.escape(btn.dataset.speak)}`);
    if (!target) return;
    if (btn.dataset.speaking === "1") { stopSpeaking(); btn.dataset.speaking = "0"; return; }
    btn.dataset.speaking = "1";
    say(target.innerText).finally(() => {});
  });
}

export function hasChromeApis() {
  return typeof chrome !== "undefined" && !!(chrome.runtime && chrome.runtime.id);
}

export function sendToBackground(message) {
  if (!hasChromeApis()) return Promise.resolve({ ok: false, error: "not-extension" });
  return chrome.runtime.sendMessage(message).catch((err) => ({ ok: false, error: String(err && err.message || err) }));
}
