import { html } from "../../shared/ui.js";
import { getValue } from "../../shared/storage.js";
import { SITES } from "../../data/sites.js";
import { tile, ico } from "./common.js";

export default {
  title: "Help me connect",
  async render(el, ctx) {
    const contacts = await getValue("familyContacts", []);
    const comms = SITES.filter((s) => s.cat === "email" || s.cat === "video");
    el.innerHTML = String(html`
      ${ctx.pageHeader("Help me connect", "Stay in touch with family and friends — email, video calls and messages, all in one place.")}

      <h2 class="section-title">My people</h2>
      ${contacts.length ? html`<div class="tile-grid">
        ${contacts.map((c) => html`<div class="card" style="margin:0">
          <h3>${ico("heart")} ${c.name}</h3>
          <p class="muted">${c.relationship || ""}</p>
          <div class="btn-row" style="margin-bottom:0">
            ${c.email ? html`<a class="btn btn-primary" href="mailto:${encodeURIComponent(c.email)}">${ico("mail")} Email ${c.name.split(" ")[0]}</a>` : ""}
            ${c.phone ? html`<a class="btn" href="tel:${c.phone.replace(/[^\d+]/g, "")}">${ico("phone")} Call</a>` : ""}
            ${c.videoLink ? html`<a class="btn" href="${c.videoLink}" target="_blank" rel="noopener noreferrer">${ico("video")} Video call</a>` : ""}
          </div></div>`)}
      </div>
      <p><a href="#/family">Add or change my people</a></p>`
      : html`<p>Add the people you talk to most, so you can email or video call them with one click. Their details stay on this computer.</p>
        <a class="btn btn-primary" href="#/family/add">${ico("plus")} Add a family member or friend</a>`}

      <h2 class="section-title">Email, video calls and messages</h2>
      <div class="fav-row">
        ${comms.map((s) => html`<a class="btn" href="${s.url}" target="_blank" rel="noopener noreferrer">${ico(s.cat === "email" ? "mail" : "video")} ${s.name}</a>`)}
      </div>

      <h2 class="section-title">Step-by-step guides</h2>
      <div class="tile-grid">
        ${tile({ href: "#/learn/video-call", iconName: "video", title: "Start or join a video call", desc: "Zoom, Google Meet and more." })}
        ${tile({ href: "#/learn/mic-camera", iconName: "mic", title: "Microphone and camera on or off", desc: "So people can hear and see you." })}
        ${tile({ href: "#/learn/attach", iconName: "camera", title: "Send pictures by email", desc: "Attach photos to an email." })}
        ${tile({ href: "#/learn/upload", iconName: "file", title: "Share a document", desc: "Upload or attach documents." })}
        ${tile({ href: "#/learn/appointments", iconName: "calendar", title: "Book an appointment online", desc: "Doctors, pharmacies and services." })}
        ${tile({ href: "#/learn/email-basics", iconName: "mail", title: "Read and write email", desc: "The basics, one step at a time." })}
      </div>

      <div class="card" style="margin-top:1.5rem">
        <h2>${ico("alert")} Is it really them? Messages from "family"</h2>
        <p>Scammers sometimes pretend to be a grandchild, child or friend — by text, email, social media or even a phone call that sounds just like them.</p>
        <ul class="reason-list">
          <li><strong>Warning signs:</strong> a new phone number, an emergency, a request for money or gift cards, and "please don't tell anyone".</li>
          <li><strong>Check:</strong> call them back on the number you already have for them, or ask another relative.</li>
          <li><strong>Safe word:</strong> agree a secret family word to use in real emergencies.</li>
        </ul>
        <div class="btn-row"><a class="btn btn-primary" href="#/check/message">${ico("shieldCheck")} Check a message</a><a class="btn" href="#/emergency/fake-family">${ico("alert")} I already sent money</a></div>
      </div>`);
  },
};
