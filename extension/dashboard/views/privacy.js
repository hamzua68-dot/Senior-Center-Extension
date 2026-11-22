import { html } from "../../shared/ui.js";
import { ico } from "./common.js";

export default {
  title: "Privacy",
  render(el, ctx) {
    el.innerHTML = String(html`
      ${ctx.pageHeader("Privacy & how EasyAccess works", "EasyAccess is designed for people who deserve extra protection. Here's exactly what it does — and doesn't do.")}
      <div class="two-col">
        <div class="card"><h2>${ico("check")} EasyAccess does</h2><ul class="reason-list">
          <li>Check messages and website addresses for scam warning signs <strong>on your computer</strong>.</li>
          <li>Look at a web page <strong>only when you click</strong> EasyAccess and ask (or if you turn on "Protect me on every website").</li>
          <li>Save your settings, favourites, trusted people and reminders <strong>only on this computer</strong>.</li>
          <li>Ask before taking a picture of your screen, and again before sending it anywhere.</li>
          <li>Let you delete everything it has saved (Settings → Delete everything).</li>
        </ul></div>
        <div class="card"><h2>${ico("x")} EasyAccess never</h2><ul class="reason-list">
          <li>Asks for, stores or sees your passwords or bank details.</li>
          <li>Reads what you type into websites.</li>
          <li>Clicks buttons, fills in forms, pays, sends, forwards or deletes anything for you.</li>
          <li>Sells or shares your information, or shows adverts.</li>
          <li>Lets anyone control your computer.</li>
          <li>Promises that something is "100% safe" — no automatic check can.</li>
        </ul></div>
      </div>
      <div class="card"><h2>${ico("chat")} The optional AI helper</h2>
        <p>The AI helper is off until someone sets up a helper server and you agree. When on, only the things you choose to ask about are sent: your questions, the words of a message you check, the visible words of a page, or a screen picture (you're asked each time). The helper server passes them to the AI service it is set up with — Anthropic's Claude or Google's Gemini — to write a reply, and does not keep them. On Google's free Gemini plan, Google may use what is sent to improve its products, so a paid plan is better for private questions. AI can make mistakes — EasyAccess's built-in safety checks always run as well.</p></div>
      <div class="card"><h2>${ico("shield")} Website threat lists</h2>
        <p>If the helper server is set up with Google Safe Browsing, EasyAccess can send the <strong>address</strong> of a website (not its contents) to check it against lists of known dangerous websites. You can turn this off in Settings.</p></div>
      <div class="card"><h2>${ico("family")} Trusted family help</h2>
        <p>Sharing happens through your own email program, after you see exactly what will be sent and tick a box to agree. EasyAccess keeps a record of what you shared, on this computer, which you can clear.</p></div>
      <div class="card"><h2>${ico("lock")} Chrome permissions</h2><ul class="reason-list">
        <li><strong>Storage</strong> — to remember your settings on this computer.</li>
        <li><strong>Active tab &amp; scripting</strong> — to read the page you're on, only when you click EasyAccess.</li>
        <li><strong>Context menus</strong> — for the right-click EasyAccess options.</li>
        <li><strong>Alarms</strong> — for your reminders.</li>
        <li><strong>All websites (optional)</strong> — only if you turn on "Protect me on every website". You can turn it off any time.</li>
      </ul></div>`);
  },
};
