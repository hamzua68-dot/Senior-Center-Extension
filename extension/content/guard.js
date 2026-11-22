// EasyAccess guard — runs on websites ONLY if the person turned on "Protect me on every website".
// It never clicks, submits or changes page content. It only:
//   • stops clicks on links with strong warning signs and explains why,
//   • shows a calm banner on pages that look like fake virus / tech-support alerts,
//   • warns before typing a password on a look-alike website.
(function () {
  if (window.__easyAccessGuard || window.top !== window) return;
  window.__easyAccessGuard = true;
  const E = window.EasyAccessEngine;
  if (!E) return;

  const here = E.analyzeUrl(location.href);
  let bannerShown = false;

  // ---------- shared UI (shadow DOM so websites can't restyle or read it) ----------
  function makeHost(position) {
    const host = document.createElement("div");
    host.setAttribute("data-easyaccess", "guard");
    host.style.cssText = `all: initial; position: fixed; z-index: 2147483647; pointer-events: none; ${position}`;
    const root = host.attachShadow({ mode: "closed" });
    document.documentElement.appendChild(host);
    return { host, root };
  }
  const STYLE = `
    * { box-sizing: border-box; }
    .box, .backdrop { pointer-events: auto; }
    .box { font: 500 19px/1.55 "Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif; color: #1b2a41; background: #fff; border: 0; border-left: 10px solid #b42318; border-radius: 16px; padding: 20px 22px; box-shadow: 0 10px 40px rgba(0,0,0,.35); max-width: 640px; }
    .box.yellow { border-left-color: #845400; }
    h2 { margin: 0 0 8px; font-size: 25px; color: #b42318; }
    .yellow h2 { color: #845400; }
    ul { margin: 6px 0 12px; padding-left: 22px; }
    li { margin-bottom: 6px; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    button { font: 650 19px/1.2 "Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif; min-height: 58px; padding: 10px 20px; border-radius: 12px; border: 2px solid #1f5fad; background: #fff; color: #1f5fad; cursor: pointer; }
    button.primary { background: #1f5fad; color: #fff; }
    button.quiet { border-color: #8a94a6; color: #4a5568; font-size: 16px; min-height: 44px; }
    button:focus-visible { outline: 3px solid #1b2a41; outline-offset: 3px; }
    .brand { font-weight: 800; color: #1f5fad; font-size: 15px; margin-bottom: 4px; letter-spacing: .02em; }
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 16px; }`;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const send = (m) => { try { return chrome.runtime.sendMessage(m); } catch (e) { return Promise.resolve(); } };

  // ---------- 1. Link guard ----------
  function linkWarning(href, result, onProceed) {
    const { host, root } = makeHost("inset: 0;");
    root.innerHTML = `<style>${STYLE}</style>
      <div class="backdrop"><div class="box" role="alertdialog" aria-modal="true" aria-labelledby="t">
        <div class="brand">EASYACCESS SAFETY CHECK</div>
        <h2 id="t">Stop — this link looks dangerous</h2>
        <p>The link goes to <strong>${esc(result.host || href.slice(0, 80))}</strong>. I stopped it so you can decide calmly.</p>
        <ul>${result.reasons.slice(0, 3).map((r) => `<li>${esc(r.text)}</li>`).join("")}</ul>
        <div class="row">
          <button class="primary" data-a="back">Stay safe — don't open it</button>
          <button class="quiet" data-a="open">Open it anyway</button>
        </div></div></div>`;
    const close = () => host.remove();
    root.querySelector("[data-a=back]").focus();
    root.addEventListener("click", (e) => {
      const a = e.target.closest("button") && e.target.closest("button").dataset.a;
      if (a === "back") close();
      if (a === "open") {
        if (confirm("Are you sure? EasyAccess found serious warning signs on this link.\n\nOnly continue if you know exactly where it goes.")) { close(); onProceed(); }
      }
    });
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button > 1) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.href;
    // Only ordinary web links are checked; in-page script links are normal on many sites.
    if (!/^https?:/i.test(href) || href.startsWith(location.href.split("#")[0] + "#")) return;
    let r;
    try { r = E.analyzeUrl(href); } catch (err) { return; }
    if (r.level !== "red") return;
    // Links within the same website are left alone, unless they download a program.
    const sameSite = r.host && E.registrableDomain(r.host) === E.registrableDomain(location.hostname);
    const programDownload = r.reasons.some((x) => /program file/.test(x.text));
    if (sameSite && !programDownload) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    linkWarning(href, r, () => { send({ type: "allow-site", host: r.host }); window.open(href, a.target || "_self", "noopener"); });
  }, true);

  // ---------- 2. Fake alert & dangerous page banner ----------
  function pageBanner(level, title, lines) {
    if (bannerShown) return;
    bannerShown = true;
    const { host, root } = makeHost("top: 12px; left: 12px; right: 12px; display: flex; justify-content: center;");
    root.innerHTML = `<style>${STYLE}</style>
      <div class="box ${level === "yellow" ? "yellow" : ""}" role="alert">
        <div class="brand">EASYACCESS</div>
        <h2>${esc(title)}</h2>
        <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
        <div class="row">
          <button class="primary" data-a="leave">Close this page safely</button>
          <button data-a="explain">Explain this page to me</button>
          <button class="quiet" data-a="hide">Hide this message</button>
        </div></div>`;
    root.addEventListener("click", (e) => {
      const a = e.target.closest("button") && e.target.closest("button").dataset.a;
      if (a === "leave") send({ type: "close-tab" });
      if (a === "explain") send({ type: "guard-explain" });
      if (a === "hide") host.remove();
    });
  }

  function checkPage() {
    if (bannerShown) return;
    const text = [document.title, (document.body && document.body.innerText || "").slice(0, 8000)].join("\n");
    const forms = document.querySelector("input[type=password]") ? [{ fields: [{ kind: "password" }] }] : [];
    const a = E.analyzePage({ url: location.href, title: document.title, text, forms, fullscreen: !!document.fullscreenElement, dialogs: [] });
    if (a.fakeAlert) {
      pageBanner("red", "This looks like a FAKE virus or security warning", [
        "Your computer has NOT been confirmed to have a virus.",
        "Do not call any phone number on this page, and don't let anyone connect to your computer.",
        "Press \"Close this page safely\". If the page won't close, restart your computer.",
      ]);
    } else if (a.level === "red") {
      pageBanner("red", "Warning: this website has serious warning signs", a.reasons.slice(0, 3).map((r) => r.text).concat("It's safest not to type anything here."));
    }
  }

  // ---------- 3. Password on a look-alike site ----------
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!el || el.tagName !== "INPUT" || el.type !== "password" || bannerShown) return;
    if (here.level !== "green" && !here.official) {
      pageBanner(here.level === "red" ? "red" : "yellow", "Careful before typing your password here", [
        `This website is "${here.host}". ${here.reasons[0] ? here.reasons[0].text : ""}`,
        "If you came here from a link in an email or text message, close this page and go to the company's website by typing its address yourself.",
      ]);
    }
  }, true);

  checkPage();
  // Fake alerts often appear a moment after loading.
  setTimeout(checkPage, 2500);
  document.addEventListener("fullscreenchange", () => setTimeout(checkPage, 300));
})();
