// Trusted family help. Principles:
//  • The senior stays in control: nothing is shared without reviewing it and saying yes.
//  • Sharing goes through the person's OWN email program (mailto:) — no hidden servers.
//  • Family never get passwords, account access or remote control from EasyAccess.
//  • Every share is recorded in a log the senior can see and clear.
import { html, toast, uid, formatDate, copyText } from "../../shared/ui.js";
import { getValue, setValue, session } from "../../shared/storage.js";
import { findTutorial } from "../../data/tutorials.js";
import { on, ico } from "./common.js";

async function contacts() { return getValue("familyContacts", []); }
async function saveContacts(c) { return setValue("familyContacts", c); }
async function log(entry) {
  const l = await getValue("shareLog", []);
  l.unshift({ id: uid(), at: Date.now(), ...entry });
  await setValue("shareLog", l.slice(0, 200));
}

function inviteCode() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, "0");
}

const EMAIL_RE = /^[^\s@<>()"]+@[^\s@<>()"]+\.[a-z]{2,}$/i;

export default {
  title: "Trusted family help",
  async render(el, ctx) {
    const sub = ctx.params[0] || "";
    if (sub === "add" || sub === "edit") return renderEdit(el, ctx);
    if (sub === "share") return renderShare(el, ctx);
    if (sub === "log") return renderLog(el, ctx);
    const list = await contacts();
    el.innerHTML = String(html`
      ${ctx.pageHeader("Trusted family help", "Choose people you trust to help you check suspicious emails, understand websites, or learn computer tasks. You decide what to share — every time.")}
      <div class="btn-row">
        <a class="btn btn-help btn-lg" href="#/family/share">${ico("send")} Ask someone to check something</a>
        <a class="btn btn-lg" href="#/family/add">${ico("plus")} Add a trusted person</a>
      </div>
      <h2 class="section-title">My trusted people</h2>
      ${list.length ? html`<ul class="list-plain card">${list.map((c) => html`<li class="site-item">
        <div><div class="site-name">${c.name} ${c.relationship ? html`<span class="muted">(${c.relationship})</span>` : ""}</div>
          <div class="site-url">${c.email || ""}${c.phone ? ` · ${c.phone}` : ""}</div>
          <div>${c.confirmed ? html`<span class="badge" style="border-color:var(--safe)">✓ Confirmed</span>` : html`<span class="badge" style="border-color:var(--caution)">Not confirmed yet</span>`}</div></div>
        <div class="btn-row" style="margin:0">
          ${!c.confirmed ? html`<a class="btn" href="#/family/edit/${c.id}">${ico("check")} Confirm</a>` : ""}
          <a class="btn" href="#/family/edit/${c.id}">${ico("edit")} Change</a>
          <button type="button" class="btn btn-quiet" data-remove="${c.id}">${ico("trash")} Remove</button>
        </div></li>`)}</ul>`
      : html`<p>You haven't added anyone yet.</p>`}

      <div class="two-col">
        <div class="card"><h2>${ico("shieldCheck")} How EasyAccess keeps this safe</h2><ul class="reason-list">
          <li>You see exactly what will be shared before anything is sent.</li>
          <li>Messages are sent from your own email program — you press Send yourself.</li>
          <li>Family members never get your passwords or access to your email or bank accounts.</li>
          <li>EasyAccess does not let anyone control your computer.</li>
          <li>You can remove a person at any time.</li>
          <li>Every share is recorded in your <a href="#/family/log">sharing record</a>.</li>
        </ul></div>
        <div class="card"><h2>${ico("alert")} Good to know</h2><ul class="reason-list">
          <li>Only add people you know well and have met in person.</li>
          <li>A real family member will never ask for your passwords or for money through EasyAccess.</li>
          <li>Being related doesn't automatically make someone safe to trust with money. It's okay to say no.</li>
          <li>Remote control: if someone you trust needs to see your screen, set it up together in person with a well-known tool — never because someone contacted you.</li>
        </ul></div>
      </div>`);
    on(el, "click", "[data-remove]", async (e, b) => {
      const all = await contacts();
      const c = all.find((x) => x.id === b.dataset.remove);
      if (!c || !confirm(`Remove ${c.name} from your trusted people?\n\nThey won't be notified. You can add them again later.`)) return;
      await saveContacts(all.filter((x) => x !== c));
      await log({ action: "removed", to: c.name, what: "Removed from trusted people" });
      toast(`${c.name} has been removed.`);
      ctx.navigate("#/family");
    });
  },
};

async function renderEdit(el, ctx) {
  const list = await contacts();
  const existing = ctx.params[1] ? list.find((c) => c.id === ctx.params[1]) : null;
  const c = existing || { id: uid(), name: "", relationship: "", email: "", phone: "", videoLink: "", confirmed: false, code: inviteCode() };
  if (!c.code) c.code = inviteCode();
  el.innerHTML = String(html`
    ${ctx.pageHeader(existing ? `Change ${c.name}` : "Add a trusted person", "Their details are saved only on this computer.")}
    <form id="f" class="card">
      <div class="field"><label for="name">Name</label><input id="name" type="text" required value="${c.name}" placeholder="For example: Susan"></div>
      <div class="field"><label for="rel">How do you know them? <span class="muted">(optional)</span></label><input id="rel" type="text" value="${c.relationship}" placeholder="For example: daughter, neighbour, friend"></div>
      <div class="field"><label for="email">Email address</label><input id="email" type="email" value="${c.email}" placeholder="name@example.com"></div>
      <div class="field"><label for="phone">Phone number <span class="muted">(optional)</span></label><input id="phone" type="tel" value="${c.phone}"></div>
      <div class="field"><label for="video">Their video call link <span class="muted">(optional — for example a Google Meet or Zoom link they gave you)</span></label><input id="video" type="url" value="${c.videoLink || ""}"></div>
      <p id="msg" role="status"></p>
      <button class="btn btn-primary btn-lg" type="submit">${ico("check")} Save</button>
    </form>
    <div class="card">
      <h2>Confirm it's really them</h2>
      <p>To make sure the email address is right (and belongs to the person you think), send them an invitation, then <strong>phone them</strong> and ask them to read you the code in it.</p>
      <p>Their code is: <strong style="font-size:1.6rem;letter-spacing:0.15em">${c.code}</strong></p>
      <div class="btn-row">
        <button type="button" class="btn" id="invite">${ico("mail")} Send an invitation from my email</button>
        <button type="button" class="btn btn-primary" id="confirm" ${c.confirmed ? "disabled" : ""}>${ico("check")} ${c.confirmed ? "Confirmed" : "They read me the right code"}</button>
      </div>
    </div>`);

  const read = () => ({
    ...c,
    name: el.querySelector("#name").value.trim().slice(0, 60),
    relationship: el.querySelector("#rel").value.trim().slice(0, 60),
    email: el.querySelector("#email").value.trim(),
    phone: el.querySelector("#phone").value.trim().slice(0, 30),
    videoLink: el.querySelector("#video").value.trim(),
  });
  const validate = (x) => {
    if (!x.name) return "Please type their name.";
    if (x.email && !EMAIL_RE.test(x.email)) return "That email address doesn't look quite right. It should look like name@example.com.";
    if (!x.email && !x.phone) return "Please add an email address or phone number.";
    if (x.videoLink && !/^https:\/\//i.test(x.videoLink)) return "The video call link should start with https://";
    if (x.videoLink && window.EasyAccessEngine.analyzeUrl(x.videoLink).level === "red") return "That video call link has warning signs, so I won't save it.";
    return "";
  };
  const save = async (x) => {
    const all = await contacts();
    const i = all.findIndex((y) => y.id === x.id);
    if (i >= 0) all[i] = x; else all.push(x);
    await saveContacts(all);
    if (i < 0) await log({ action: "added", to: x.name, what: "Added as a trusted person" });
    Object.assign(c, x);
  };
  el.querySelector("#f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const x = read();
    const err = validate(x);
    if (err) { el.querySelector("#msg").textContent = err; return; }
    if (existing && existing.email !== x.email) x.confirmed = false;
    await save(x);
    toast(`${x.name} has been saved.`);
    ctx.navigate("#/family");
  });
  el.querySelector("#invite").addEventListener("click", async () => {
    const x = read();
    const err = validate(x);
    if (err || !x.email) { el.querySelector("#msg").textContent = err || "Please add their email address first."; return; }
    await save(x);
    const body = `Hello ${x.name},\n\nI'm using EasyAccess, a helper for using my computer safely. I've chosen you as someone I trust to help me check suspicious emails or websites.\n\nWhen I'm unsure about something, I may email it to you and ask "Does this look real?". You'll never be asked for passwords or money.\n\nTo confirm this reached you, please phone me and read me this code: ${x.code}\n\nThank you!`;
    await log({ action: "invited", to: x.name, what: "Invitation email" });
    location.href = `mailto:${encodeURIComponent(x.email)}?subject=${encodeURIComponent("Will you be my trusted helper?")}&body=${encodeURIComponent(body)}`;
  });
  el.querySelector("#confirm").addEventListener("click", async () => {
    const x = read();
    const err = validate(x);
    if (err) { el.querySelector("#msg").textContent = err; return; }
    x.confirmed = true;
    await save(x);
    await log({ action: "confirmed", to: x.name, what: "Confirmed by phone code" });
    toast(`${x.name} is now confirmed.`);
    ctx.navigate("#/family");
  });
}

async function renderShare(el, ctx) {
  const list = await contacts();
  const from = ctx.query.get("from");
  const lastCheck = await getValue("lastCheck", null, session);
  const lastExpl = await getValue("lastExplanation", null, session);
  const lastSnap = await getValue("lastSnapshot", null, session);
  const shot = await getValue("lastScreenshot", null, session);
  const lesson = ctx.query.get("lesson") ? findTutorial(ctx.query.get("lesson")) : null;

  // Choose a sensible default of what to share
  const kinds = [];
  if (lastCheck) kinds.push({ id: "check", label: `The ${lastCheck.kind === "link" ? "link" : "message"} I just checked` });
  if (lastExpl && lastSnap) kinds.push({ id: "screen", label: `The website I asked about (${lastSnap.host})` });
  if (shot) kinds.push({ id: "screenshot", label: "The picture of my screen" });
  if (lesson) kinds.push({ id: "lesson", label: `Help with "${lesson.title}"` });
  kinds.push({ id: "question", label: "A question in my own words" });
  let kind = from === "screen" && kinds.some((k) => k.id === "screen") ? "screen"
    : from === "screenshot" && shot ? "screenshot"
      : from === "lesson" && lesson ? "lesson"
        : from === "check" && lastCheck ? "check" : kinds[0].id;

  if (!list.length) {
    el.innerHTML = String(html`${ctx.pageHeader("Ask someone to check something", "")}
      <div class="card"><p>First, add a person you trust.</p><a class="btn btn-primary" href="#/family/add">${ico("plus")} Add a trusted person</a></div>`);
    return;
  }

  const build = (k, note) => {
    const intro = note ? `${note}\n\n` : "";
    if (k === "check") {
      const lines = [`${intro}Could you please check this for me? EasyAccess rated it ${String(lastCheck.level).toUpperCase()}${lastCheck.summary ? ": " + lastCheck.summary : ""}.`, ""];
      if (lastCheck.sender) lines.push(`From: ${lastCheck.sender}`);
      if (lastCheck.subject) lines.push(`Subject: ${lastCheck.subject}`);
      lines.push("", "----- The message -----", String(lastCheck.text || "").slice(0, 4000), "-----------------------", "", "Please don't click any links in it. Thank you!");
      return { subject: "Can you check this for me? (sent with EasyAccess)", body: lines.join("\n") };
    }
    if (k === "screen") return { subject: "Can you help me understand a website?", body: `${intro}I was on this website and wasn't sure what to do:\n${lastSnap.url}\n\nPage title: ${lastSnap.title}\n\nEasyAccess said: ${lastExpl.summary}\n\nCould you help me? Thank you!` };
    if (k === "screenshot") return { subject: "Can you look at my screen picture?", body: `${intro}I've copied a picture of my screen — it's pasted below (or attached).\n\nCould you tell me what I should do? Thank you!` };
    if (k === "lesson") return { subject: `Can you help me with: ${lesson.title}?`, body: `${intro}I'm learning "${lesson.title}" with EasyAccess and I'm stuck${ctx.query.get("step") ? ` on step ${ctx.query.get("step")}` : ""}. Could you help me, or call me? Thank you!` };
    return { subject: "Can you help me with something on the computer?", body: `${intro || "(Type your question here)\n\n"}Thank you!` };
  };

  const draw = () => {
    el.innerHTML = String(html`
      ${ctx.pageHeader("Ask someone to check something", "Choose who to ask and what to share. You'll see exactly what will be sent before anything happens.")}
      <form id="f">
        <div class="card"><h2>1. Who should I ask?</h2>
          <div class="choice-list" role="radiogroup">${list.map((c, n) => html`<label class="choice"><input type="radio" name="to" value="${c.id}" ${n === 0 ? "checked" : ""}> ${c.name}${c.relationship ? ` (${c.relationship})` : ""}${c.confirmed ? "" : " — not confirmed yet"}</label>`)}</div>
        </div>
        <div class="card"><h2>2. What do I want to share?</h2>
          <div class="choice-list" role="radiogroup">${kinds.map((k) => html`<label class="choice"><input type="radio" name="kind" value="${k.id}" ${k.id === kind ? "checked" : ""}> ${k.label}</label>`)}</div>
          <label for="note">Add a note <span class="muted">(optional)</span></label>
          <textarea id="note" style="min-height:5rem" placeholder="For example: I got this today, is it real?"></textarea>
        </div>
        <div class="card"><h2>3. Check what will be sent</h2>
          <div class="notice"><strong>Before sending:</strong> make sure there are no passwords, bank or card numbers, or Social Security numbers below.</div>
          <p><strong>Subject:</strong> <span id="p-subject"></span></p>
          <div class="share-preview" id="p-body" data-no-read></div>
          ${kind === "screenshot" && shot ? html`<p>The picture will be copied so you can paste it into the email:</p><img class="screenshot" src="${shot.dataUrl}" alt="Picture of your screen" style="max-height:16rem">` : ""}
          <label class="choice" style="margin-top:1rem"><input type="checkbox" id="agree"> I've checked this and I want to share it</label>
          <p id="msg" role="status"></p>
          <div class="btn-row">
            <button type="submit" class="btn btn-help btn-lg">${ico("mail")} Open my email to send it</button>
            <button type="button" class="btn" id="copy">${ico("copy")} Copy it instead</button>
          </div>
          <p class="muted">Your email program will open with this message ready. Nothing is sent until you press Send there.</p>
        </div>
      </form>`);
    const update = () => {
      const msg = build(kind, el.querySelector("#note").value.trim());
      el.querySelector("#p-subject").textContent = msg.subject;
      el.querySelector("#p-body").textContent = msg.body;
      return msg;
    };
    update();
    el.querySelector("#note").addEventListener("input", update);
    const prepare = async () => {
      if (!el.querySelector("#agree").checked) { el.querySelector("#msg").textContent = "Please tick the box to confirm you've checked what will be shared."; return null; }
      const to = list.find((c) => c.id === el.querySelector("input[name=to]:checked").value);
      const msg = update();
      if (kind === "screenshot" && shot) {
        try {
          const blob = await (await fetch(shot.dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          toast("The picture is copied. In your email, press Ctrl + V (⌘ + V on a Mac) to paste it.", 7000);
        } catch (e) { toast("I couldn't copy the picture. You can take a screenshot instead (see the lesson \"Take a picture of your screen\")."); }
      }
      await log({ action: "shared", to: to.name, what: kinds.find((k) => k.id === kind).label });
      return { to, msg };
    };
    el.querySelector("#f").addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = await prepare();
      if (!p) return;
      if (!p.to.email) { el.querySelector("#msg").textContent = `${p.to.name} doesn't have an email address saved. Use "Copy it instead" and send it another way.`; return; }
      location.href = `mailto:${encodeURIComponent(p.to.email)}?subject=${encodeURIComponent(p.msg.subject)}&body=${encodeURIComponent(p.msg.body.slice(0, 1800))}`;
    });
    el.querySelector("#copy").addEventListener("click", async () => {
      const p = await prepare();
      if (!p) return;
      const ok = await copyText(`${p.msg.subject}\n\n${p.msg.body}`);
      if (kind !== "screenshot") toast(ok ? "Copied. You can paste it into an email or message." : "Sorry, copying didn't work.");
    });
  };
  draw();
  on(el, "change", "input[name=kind]", (e, r) => {
    const note = el.querySelector("#note").value;
    const to = el.querySelector("input[name=to]:checked").value;
    kind = r.value;
    draw();
    el.querySelector("#note").value = note;
    el.querySelector(`input[name=to][value="${CSS.escape(to)}"]`).checked = true;
    el.querySelector("#note").dispatchEvent(new Event("input"));
  });
}

async function renderLog(el, ctx) {
  const l = await getValue("shareLog", []);
  el.innerHTML = String(html`
    ${ctx.pageHeader("My sharing record", "Everything you've shared with your trusted people, and changes to your list. This record stays on this computer.")}
    ${l.length ? html`<ul class="list-plain card">${l.map((x) => html`<li><strong>${formatDate(x.at)}</strong> — ${x.what} ${x.to ? html`(<em>${x.to}</em>)` : ""}</li>`)}</ul>
      <button type="button" class="btn btn-quiet" id="clear">${ico("trash")} Clear this record</button>` : html`<p>Nothing has been shared yet.</p>`}`);
  el.querySelector("#clear")?.addEventListener("click", async () => {
    if (!confirm("Clear your sharing record?")) return;
    await setValue("shareLog", []);
    ctx.navigate("#/family/log");
  });
}
