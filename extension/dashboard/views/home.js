import { html } from "../../shared/ui.js";
import { getValue } from "../../shared/storage.js";
import { tile, ico } from "./common.js";

const SECTIONS = [
  { href: "#/check", iconName: "shieldCheck", title: "Check before you click", desc: "Is this email, link, message or website safe?", simple: true },
  { href: "#/learn", iconName: "lightbulb", title: "Help me use my computer", desc: "Step-by-step help with everyday tasks." },
  { href: "#/screen", iconName: "eye", title: "Understand my screen", desc: "\"What am I looking at?\" in plain English." },
  { href: "#/email", iconName: "mail", title: "Help me with email", desc: "Understand emails, spot scams, write replies." },
  { href: "#/sites", iconName: "search", title: "Find what I need", desc: "Important websites in one safe place." },
  { href: "#/read", iconName: "speaker", title: "Read this to me", desc: "Have emails and web pages read aloud.", simple: true },
  { href: "#/connect", iconName: "video", title: "Help me connect", desc: "Video calls, family and messages." },
  { href: "#/security", iconName: "lock", title: "My security center", desc: "Passwords, safety lessons and checklist." },
  { href: "#/family", iconName: "family", title: "Trusted family help", desc: "Ask someone you trust to take a look." },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning!" : h < 18 ? "Good afternoon!" : "Good evening!";
}

export default {
  title: "Home",
  async render(el, { settings }) {
    const favs = (await getValue("favorites", [])).filter((f) => f.pinned).slice(0, 8);
    const sections = settings.simpleMode ? SECTIONS.filter((s) => s.simple) : SECTIONS;
    el.innerHTML = String(html`
      <h1 class="visually-hidden">EasyAccess home</h1>
      <p class="greeting">${greeting()} What would you like help with today?</p>

      ${tile({ href: "#/assistant", iconName: "help", title: "I need help — show me what to do", desc: "Type or say your question, or choose from a list.", cls: "tile-help" })}

      <h2 class="section-title">Choose what you need</h2>
      <div class="tile-grid">
        ${sections.map((s) => tile(s))}
      </div>

      <div style="margin-top:1.2rem">
        ${tile({ href: "#/emergency", iconName: "alert", title: "Emergency help", desc: "I think I've been scammed, or something suspicious happened.", cls: "tile-danger" })}
      </div>

      <h2 class="section-title">My favourite websites</h2>
      ${favs.length
        ? html`<div class="fav-row">${favs.map((f) => html`<a class="btn" href="${f.url}" target="_blank" rel="noopener noreferrer">${ico("star")} ${f.name}</a>`)}
            <a class="btn btn-quiet" href="#/sites">${ico("edit")} Change my favourites</a></div>`
        : html`<p class="muted">You haven't pinned any favourites yet.</p><a class="btn" href="#/sites">${ico("plus")} Add my favourite websites</a>`}

      ${settings.simpleMode ? html`<p class="muted" style="margin-top:2rem">Simple mode is on, so only the most important choices are shown. <a href="#/settings">Show everything</a></p>` : ""}
    `);
  },
};
