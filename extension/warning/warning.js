import { initSettings } from "../shared/settings.js";
import { icon } from "../shared/icons.js";

await initSettings();
const params = new URLSearchParams(location.search);
const url = params.get("url") || "";
let reasons = [];
try { reasons = JSON.parse(params.get("reasons") || "[]"); } catch (e) { reasons = []; }

let host = "";
try { host = new URL(url).hostname; } catch (e) { host = url.slice(0, 120); }

document.getElementById("title").insertAdjacentHTML("afterbegin", icon("alert"));
document.getElementById("host").textContent = host;
const list = document.getElementById("reasons");
for (const r of (reasons.length ? reasons : ["The address uses tricks commonly used by scam websites."])) {
  const li = document.createElement("li");
  li.textContent = String(r);
  list.appendChild(li);
}

document.getElementById("close").addEventListener("click", async () => {
  const tab = await chrome.tabs.getCurrent();
  if (tab) chrome.tabs.remove(tab.id);
});
document.getElementById("home").addEventListener("click", () => {
  location.href = chrome.runtime.getURL("dashboard/dashboard.html#/home");
});
document.getElementById("proceed").addEventListener("click", async () => {
  if (!/^https?:/i.test(url)) return;
  if (!confirm("Are you completely sure? EasyAccess found serious warning signs on this website.")) return;
  await chrome.runtime.sendMessage({ type: "allow-site", host });
  location.href = url;
});
