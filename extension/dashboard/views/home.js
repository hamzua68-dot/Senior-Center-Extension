import { html, raw } from "../../shared/ui.js";
import { icon } from "../../shared/icons.js";
import { getValue } from "../../shared/storage.js";
import { tile, ico } from "./common.js";

// The three things people need most often get big tiles; the rest are a simple list.
const MOST_USED = [
  { href: "#/check", iconName: "shieldCheck", title: "Check before you click", desc: "Is this email, link, message or website safe?" },
  { href: "#/screen", iconName: "eye", title: "Understand my screen", desc: "\"What am I looking at?\" explained in plain English." },
  { href: "#/read", iconName: "speaker", title: "Read this to me", desc: "Have emails and web pages read aloud." },
];

const MORE = [
  { href: "#/learn", iconName: "lightbulb", title: "Help me use my computer", desc: "Step-by-step help with everyday tasks." },
  { href: "#/email", iconName: "mail", title: "Help me with email", desc: "Understand emails, spot scams, write replies." },
  { href: "#/sites", iconName: "search", title: "Find what I need", desc: "Important websites in one safe place." },
  { href: "#/connect", iconName: "video", title: "Help me connect", desc: "Video calls, family and messages." },
  { href: "#/security", iconName: "lock", title: "My security center", desc: "Passwords, safety lessons and checklist." },
  { href: "#/family", iconName: "family", title: "Trusted family help", desc: "Ask someone you trust to take a look." },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning!" : h < 18 ? "Good afternoon!" : "Good evening!";
}

function menuRow(s) {
  return html`<li><a class="menu-row" href="${s.href}">
    <span class="menu-icon">${raw(icon(s.iconName))}</span>
    <span class="menu-text"><span class="menu-title">${s.title}</span><span class="menu-desc">${s.desc}</span></span>
    <span class="menu-arrow">${raw(icon("next"))}</span>
  </a></li>`;
}

export default {
  title: "Home",
  async render(el, { settings }) {
    const favs = (await getValue("favorites", [])).filter((f) => f.pinned).slice(0, 8);
    el.innerHTML = String(html`
      <h1 class="home-hello">${greeting()}</h1>
      <p class="home-sub">What would you like help with today?</p>

      <div class="home-urgent">
        ${tile({ href: "#/assistant", iconName: "help", title: "I need help — show me what to do", desc: "Type or say your question, or choose from a list.", cls: "tile-help" })}
        ${tile({ href: "#/emergency", iconName: "alert", title: "Emergency help", desc: "I think I've been scammed.", cls: "tile-danger" })}
      </div>

      <h2 class="section-title">Most used</h2>
      <div class="tile-grid">${MOST_USED.map((s) => tile(s))}</div>

      ${settings.simpleMode
        ? html`<p class="muted" style="margin-top:2rem">Simple mode is on, so only the most important choices are shown. <a href="#/settings">Show everything</a></p>`
        : html`<h2 class="section-title">More ways I can help</h2>
          <ul class="menu-list">${MORE.map(menuRow)}</ul>`}

      <h2 class="section-title">My favourite websites</h2>
      ${favs.length
        ? html`<div class="fav-row">${favs.map((f) => html`<a class="btn" href="${f.url}" target="_blank" rel="noopener noreferrer">${ico("star")} ${f.name}</a>`)}
            <a class="btn btn-quiet" href="#/sites">${ico("edit")} Change my favourites</a></div>`
        : html`<p class="muted">You haven't chosen any favourite websites yet.</p><a class="btn" href="#/sites">${ico("plus")} Add my favourite websites</a>`}
    `);
  },
};
