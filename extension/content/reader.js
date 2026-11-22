// EasyAccess read-aloud bar. Injected into a page ONLY when the person asks
// ("Read this page to me" or right-click "Read this aloud").
// It reads text, highlights each paragraph as it's read, and never changes page content.
(function () {
  if (window.__easyAccessReader) return;

  const synth = window.speechSynthesis;
  let blocks = [];        // [{ el|null, text }]
  let index = 0;
  let rate = 0.9, volume = 1, voiceName = "", lang = "en-US";
  let state = "idle";
  let token = 0;
  let host, root, statusEl, pauseBtn;
  let highlighted = null;
  let savedOutline = "", savedBg = "";

  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get("settings", (r) => {
          const s = (r && r.settings) || {};
          rate = s.speechRate || 0.9; volume = s.speechVolume ?? 1; voiceName = s.voiceName || ""; lang = s.language || "en-US";
          resolve();
        });
      } catch (e) { resolve(); }
    });
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  function collectBlocks() {
    const container = document.querySelector("article, main, [role=main]") || document.body;
    const els = Array.from(container.querySelectorAll("h1, h2, h3, h4, p, li, blockquote, td, figcaption, [role=alert], dialog[open]"))
      .filter((el) => !el.closest("nav, footer, aside, script, style, noscript, [aria-hidden=true]") && visible(el))
      .filter((el) => !el.querySelector("p, li, h1, h2, h3"));
    const out = [];
    for (const el of els) {
      const text = el.innerText.replace(/\s+/g, " ").trim();
      if (text.length > 1) out.push({ el, text });
      if (out.length > 400) break;
    }
    if (!out.length) {
      const t = (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 20000);
      if (t) out.push({ el: null, text: t });
    }
    return out;
  }

  function splitLong(list) {
    const out = [];
    for (const b of list) {
      if (b.text.length <= 280) { out.push(b); continue; }
      const parts = b.text.split(/(?<=[.!?])\s+/);
      let buf = "";
      for (const p of parts) {
        if ((buf + " " + p).length > 260 && buf) { out.push({ el: b.el, text: buf }); buf = p; } else buf = buf ? buf + " " + p : p;
      }
      if (buf) out.push({ el: b.el, text: buf });
    }
    return out;
  }

  function highlight(el) {
    if (highlighted && highlighted !== el) { highlighted.style.outline = savedOutline; highlighted.style.backgroundColor = savedBg; highlighted = null; }
    if (!el || highlighted === el) return;
    highlighted = el;
    savedOutline = el.style.outline; savedBg = el.style.backgroundColor;
    el.style.outline = "4px solid #1f5fad";
    el.style.backgroundColor = "rgba(252, 243, 224, 0.95)";
    el.scrollIntoView({ block: "center", behavior: "auto" });
  }

  function speakFrom(i) {
    const my = ++token;
    synth.cancel();
    index = i;
    setState("speaking");
    const voice = synth.getVoices().find((v) => v.name === voiceName);
    const next = () => {
      if (my !== token) return;
      if (index >= blocks.length) { setState("done"); highlight(null); return; }
      const b = blocks[index];
      const u = new SpeechSynthesisUtterance(b.text);
      u.rate = rate; u.volume = volume; u.lang = lang;
      if (voice) u.voice = voice;
      u.onstart = () => { highlight(b.el); status(`Reading part ${index + 1} of ${blocks.length}`); };
      u.onend = () => { if (my === token) { index++; next(); } };
      u.onerror = (e) => { if (my === token && e.error !== "interrupted" && e.error !== "canceled") { index++; next(); } };
      synth.speak(u);
    };
    next();
  }

  function setState(s) {
    state = s;
    if (!pauseBtn) return;
    pauseBtn.textContent = s === "paused" ? "▶ Continue" : s === "done" ? "▶ Read again" : "❚❚ Pause";
    if (s === "done") status("Finished reading.");
  }
  function status(t) { if (statusEl) statusEl.textContent = t; }

  function buildBar() {
    host = document.createElement("div");
    host.id = "easyaccess-reader-host";
    host.style.cssText = "all: initial; position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483647;";
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .bar { font: 600 18px/1.4 "Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif; background: #ffffff; color: #1b2a41; padding: 12px 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; border-top: 3px solid #1f5fad; box-shadow: 0 -4px 16px rgba(27,42,65,.15); }
        .name { font-weight: 800; margin-right: 8px; }
        button { font: inherit; font-size: 18px; min-height: 56px; padding: 8px 16px; border-radius: 12px; border: 2px solid #8a94a6; background: #fff; color: #1b2a41; cursor: pointer; }
        button:hover { background: #e8f0fa; border-color: #1f5fad; }
        button[data-a=pause] { background: #1f5fad; border-color: #1f5fad; color: #fff; }
        button:focus-visible { outline: 3px solid #1b2a41; outline-offset: 3px; }
        button.close { margin-left: auto; }
        .status { flex-basis: 100%; font-weight: 500; font-size: 17px; color: #4a5568; }
      </style>
      <div class="bar" role="region" aria-label="EasyAccess reading controls">
        <span class="name">EasyAccess is reading</span>
        <button data-a="pause">❚❚ Pause</button>
        <button data-a="back">⏮ Back</button>
        <button data-a="repeat">↻ Repeat</button>
        <button data-a="next">⏭ Skip</button>
        <button data-a="slower">🐢 Slower</button>
        <button data-a="faster">🐇 Faster</button>
        <button data-a="close" class="close">✕ Stop &amp; close</button>
        <div class="status" aria-live="polite"></div>
      </div>`;
    statusEl = root.querySelector(".status");
    pauseBtn = root.querySelector("[data-a=pause]");
    root.querySelector(".bar").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const a = b.dataset.a;
      if (a === "pause") {
        if (state === "speaking") { synth.pause(); setState("paused"); status("Paused."); }
        else if (state === "paused") { synth.resume(); setState("speaking"); }
        else speakFrom(0);
      }
      if (a === "repeat") speakFrom(index);
      if (a === "back") speakFrom(Math.max(0, index - 1));
      if (a === "next") speakFrom(Math.min(blocks.length - 1, index + 1));
      if (a === "slower" || a === "faster") {
        rate = Math.max(0.5, Math.min(1.6, rate + (a === "faster" ? 0.1 : -0.1)));
        status(`Speed: ${rate < 0.8 ? "slow" : rate > 1.15 ? "fast" : "normal"}`);
        try { chrome.storage.local.get("settings", (r) => chrome.storage.local.set({ settings: { ...(r.settings || {}), speechRate: Math.round(rate * 10) / 10 } })); } catch (err) { /* ignore */ }
        if (state === "speaking") speakFrom(index);
      }
      if (a === "close") stop();
    });
    document.documentElement.appendChild(host);
  }

  function stop() {
    token++;
    synth.cancel();
    highlight(null);
    if (host) host.remove();
    host = null; pauseBtn = null; statusEl = null;
    state = "idle";
  }

  window.__easyAccessReader = {
    async start(text) {
      await loadSettings();
      if (!host) buildBar();
      blocks = text && text.trim() ? splitLong([{ el: null, text: text.trim() }]) : splitLong(collectBlocks());
      if (!blocks.length) { status("I couldn't find any words to read on this page."); return; }
      speakFrom(0);
    },
    stop,
  };
})();
