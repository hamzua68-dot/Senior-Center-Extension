// collectPageSnapshot() is injected into the page the person is looking at
// (only after they click EasyAccess) via chrome.scripting.executeScript({ func }).
// It must be completely self-contained: no imports, no outside variables.
// It only READS the page — it never clicks, types or changes anything.

export function collectPageSnapshot() {
  const MAX_TEXT = 12000;
  const visible = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  const inViewport = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  };
  const clean = (s, n = 200) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const labelFor = (el) => {
    const aria = el.getAttribute("aria-label") || el.getAttribute("title");
    if (aria) return clean(aria, 120);
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return clean(l.textContent, 120);
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return clean(parentLabel.textContent, 120);
    return clean(el.getAttribute("placeholder") || el.getAttribute("name") || "", 120);
  };
  const fieldKind = (el) => {
    const t = (el.getAttribute("type") || el.tagName).toLowerCase();
    const hint = [el.name, el.id, el.getAttribute("autocomplete"), el.getAttribute("placeholder"), el.getAttribute("aria-label"), labelFor(el)].join(" ").toLowerCase();
    if (t === "password") return "password";
    if (/cc-number|card ?number|cardnumber|credit ?card|debit|cvv|cvc|security code|expir/.test(hint)) return "card";
    if (/ssn|social security|social-security|tax ?id|\bsin\b/.test(hint)) return "ssn";
    if (/one-time-code|verification code|otp|2fa|passcode/.test(hint)) return "code";
    if (t === "email" || /e-?mail/.test(hint)) return "email";
    if (t === "tel" || /phone|mobile/.test(hint)) return "phone";
    if (/birth|dob|bday/.test(hint)) return "dob";
    if (/address|street|zip|postal|city/.test(hint)) return "address";
    if (/name/.test(hint)) return "name";
    if (t === "search" || /search/.test(hint)) return "search";
    if (t === "file") return "file";
    if (t === "checkbox" || t === "radio") return t;
    if (t === "select") return "choice";
    return "text";
  };

  // Headings
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, [role=heading]"))
    .filter(visible).slice(0, 25)
    .map((h) => ({ level: Number((h.tagName.match(/\d/) || [h.getAttribute("aria-level") || 2])[0]), text: clean(h.textContent, 160) }))
    .filter((h) => h.text);

  // Buttons and button-like links that are on screen now
  const buttonEls = Array.from(document.querySelectorAll("button, [role=button], input[type=submit], input[type=button], a.button, a.btn, a[class*=button], a[class*=btn]"));
  const seen = new Set();
  const buttons = [];
  for (const b of buttonEls) {
    if (!visible(b)) continue;
    const text = clean(b.innerText || b.value || b.getAttribute("aria-label") || b.getAttribute("title"), 80);
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    const r = b.getBoundingClientRect();
    buttons.push({ text, onScreen: inViewport(b), primary: r.width * r.height > 6000, disabled: !!b.disabled || b.getAttribute("aria-disabled") === "true" });
    if (buttons.length >= 30) break;
  }

  // Links (text + destination host only)
  const links = [];
  for (const a of Array.from(document.querySelectorAll("a[href]"))) {
    if (!visible(a)) continue;
    const text = clean(a.innerText || a.getAttribute("aria-label"), 80);
    if (!text) continue;
    let host = "";
    try { host = new URL(a.href, location.href).hostname; } catch (e) {}
    links.push({ text, href: a.href.slice(0, 300), host, external: host && host !== location.hostname });
    if (links.length >= 60) break;
  }

  // Forms and fields — we record what KIND of information is asked for, never the values typed.
  const forms = [];
  const formEls = Array.from(document.querySelectorAll("form"));
  const looseFields = Array.from(document.querySelectorAll("input, select, textarea")).filter((f) => !f.form);
  const groups = formEls.map((f) => ({ el: f, fields: Array.from(f.querySelectorAll("input, select, textarea")) }));
  if (looseFields.length) groups.push({ el: null, fields: looseFields });
  for (const g of groups) {
    const fields = g.fields
      .filter((f) => !["hidden", "submit", "button", "reset", "image"].includes((f.getAttribute("type") || "").toLowerCase()) && visible(f))
      .slice(0, 25)
      .map((f) => ({ kind: fieldKind(f), label: labelFor(f), required: !!f.required }));
    if (!fields.length) continue;
    let action = "";
    try { action = g.el && g.el.action ? new URL(g.el.action, location.href).hostname : ""; } catch (e) {}
    forms.push({ fields, actionHost: action, submit: g.el ? clean((g.el.querySelector("button[type=submit], input[type=submit], button") || {}).innerText || (g.el.querySelector("input[type=submit]") || {}).value, 60) : "" });
    if (forms.length >= 8) break;
  }

  // Dialogs, pop-ups, alerts and error messages
  const dialogs = Array.from(document.querySelectorAll("dialog[open], [role=dialog], [role=alertdialog], [aria-modal=true], .modal.show, .modal.in, .popup, [class*=cookie], [id*=cookie]"))
    .filter(visible).slice(0, 5).map((d) => ({ text: clean(d.innerText, 500) })).filter((d) => d.text);
  const alerts = Array.from(document.querySelectorAll("[role=alert], [aria-live=assertive], .error, .alert, .warning, [class*=error-message], [class*=errorMessage]"))
    .filter(visible).slice(0, 6).map((d) => clean(d.innerText, 300)).filter(Boolean);

  // Big overlays covering most of the screen (common for pop-ups and fake alerts)
  let overlay = false;
  for (const el of Array.from(document.querySelectorAll("body *")).slice(0, 4000)) {
    const cs = getComputedStyle(el);
    if ((cs.position === "fixed" || cs.position === "sticky") && Number(cs.zIndex) > 100 && visible(el)) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height > innerWidth * innerHeight * 0.5) { overlay = clean(el.innerText, 400) || true; break; }
    }
  }

  // Main readable text, preferring the main article area
  const main = document.querySelector("main, article, [role=main]") || document.body;
  const text = clean(main ? main.innerText : "", MAX_TEXT);
  const visibleText = clean(Array.from(document.querySelectorAll("h1,h2,h3,p,li,button,a,label")).filter((e) => visible(e) && inViewport(e)).map((e) => e.innerText).join(" \n "), 3000);

  const downloads = links.filter((l) => /download|\.pdf$|\.docx?$|\.xlsx?$|\.zip$|\.exe$|\.dmg$/i.test(l.text + " " + l.href)).slice(0, 8);
  const metaDesc = (document.querySelector('meta[name="description"]') || {}).content || "";
  const ogSite = (document.querySelector('meta[property="og:site_name"]') || {}).content || "";

  return {
    url: location.href,
    host: location.hostname,
    title: clean(document.title, 200),
    siteName: clean(ogSite, 80),
    description: clean(metaDesc, 300),
    lang: document.documentElement.lang || "",
    headings, buttons, links: links.slice(0, 40), forms, dialogs, alerts, downloads,
    overlay,
    fullscreen: !!document.fullscreenElement,
    selection: clean(String(getSelection ? getSelection() : ""), 3000),
    text, visibleText,
    secure: location.protocol === "https:",
    capturedAt: Date.now(),
  };
}

/** Reads the currently open email in Gmail's web page (only when the person asks). */
export function collectGmailMessage() {
  const clean = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const subject = clean((document.querySelector("h2.hP") || {}).innerText, 300);
  const senderEl = document.querySelector("span.gD[email], .gD[email]");
  const senderName = senderEl ? clean(senderEl.getAttribute("name") || senderEl.innerText, 120) : "";
  const senderEmail = senderEl ? senderEl.getAttribute("email") : "";
  const bodies = Array.from(document.querySelectorAll("div.a3s"));
  const bodyEl = bodies[bodies.length - 1];
  const body = bodyEl ? clean(bodyEl.innerText, 15000) : "";
  const links = bodyEl ? Array.from(bodyEl.querySelectorAll("a[href]")).map((a) => ({ text: clean(a.innerText, 100), href: a.href })).slice(0, 40) : [];
  const attachments = Array.from(document.querySelectorAll("span.aV3, .aQH span[title]")).map((e) => clean(e.innerText || e.getAttribute("title"), 120)).filter(Boolean).slice(0, 10);
  return {
    found: !!(subject || body),
    subject,
    sender: senderEmail ? `${senderName} <${senderEmail}>` : senderName,
    text: body,
    links,
    attachments,
  };
}
