// End-to-end tests: loads the real extension in Chromium and walks through the senior scenarios.
// Run with:  node --test tests/e2e.test.mjs      (needs Playwright + Chromium)
//
// Because a test can't click Chrome's own permission prompt, the test makes a temporary copy of
// the extension with "<all_urls>" pre-granted (host_permissions). The shipped manifest keeps it optional.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { cpSync, readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SHOTS = process.env.EASYACCESS_SHOTS || path.join(root, "docs", "screenshots");

let ctx, extId, server, base, workdir, sw;
const errors = [];

async function dash(route) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${route}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`${route}: ${m.text()}`); });
  await page.goto(`chrome-extension://${extId}/dashboard/dashboard.html${route}`);
  await page.waitForSelector("#view h1");
  return page;
}

// Runs one of the page-reading functions in a website tab, exactly like the popup does after a click.
async function readTab(urlPart, fnName, storeKey) {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/popup/popup.html`);
  await page.evaluate(async ({ urlPart, fnName, storeKey }) => {
    const mod = await import("/shared/page-snapshot.js");
    const tab = (await chrome.tabs.query({})).find((t) => (t.url || "").includes(urlPart));
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: mod[fnName] });
    await chrome.storage.session.set({ [storeKey]: r.result });
  }, { urlPart, fnName, storeKey });
  await page.close();
}

async function shot(page, name) {
  if (process.env.EASYACCESS_SHOTS === "0") return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
}

before(async () => {
  workdir = mkdtempSync(path.join(tmpdir(), "easyaccess-"));
  const extCopy = path.join(workdir, "extension");
  cpSync(path.join(root, "extension"), extCopy, { recursive: true });
  const manifest = JSON.parse(readFileSync(path.join(extCopy, "manifest.json"), "utf8"));
  manifest.host_permissions = ["<all_urls>"];
  writeFileSync(path.join(extCopy, "manifest.json"), JSON.stringify(manifest, null, 2));

  server = createServer((req, res) => {
    const file = path.join(here, "fixtures", path.basename(req.url.split("?")[0]) || "form.html");
    let body;
    try { body = readFileSync(file); } catch (e) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://localhost:${server.address().port}`;

  ctx = await chromium.launchPersistentContext(path.join(workdir, "profile"), {
    channel: "chromium", headless: true, viewport: { width: 1280, height: 900 },
    args: [`--disable-extensions-except=${extCopy}`, `--load-extension=${extCopy}`],
  });
  sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker"));
  extId = sw.url().split("/")[2];
});

after(async () => {
  await ctx?.close();
  server?.close();
  rmSync(workdir, { recursive: true, force: true });
});

test("first run: welcome tour opens and leads to the home dashboard", async () => {
  const page = await dash("#/welcome");
  await shot(page, "01-welcome");
  for (let i = 0; i < 3; i++) await page.click("[data-act=next]");
  await page.click("[data-act=finish]");
  await page.waitForSelector(".tile-help");
  // All nine sections are reachable: three big "most used" tiles + six list rows
  const tiles = await page.$$eval(".tile-grid .tile .tile-title, .menu-row .menu-title", (els) => els.map((e) => e.textContent));
  assert.equal(tiles.length, 9);
  // The most important test: "I need help" and "Emergency help" are visible without scrolling
  for (const sel of [".tile-help", ".tile-danger"]) {
    const box = await page.locator(sel).boundingBox();
    assert.ok(box && box.y + box.height <= 900, `${sel} should be visible without scrolling`);
    assert.ok(box.height >= 64, `${sel} should be a large target`);
  }
  await shot(page, "02-home");
  await page.close();
});

test("every section opens without errors and has a heading", async () => {
  const routes = ["#/home", "#/assistant", "#/check", "#/check/message", "#/check/link", "#/check/phone", "#/check/shopping", "#/check/scams",
    "#/screen", "#/email", "#/email/paste", "#/email/gmail", "#/learn", "#/learn/download", "#/sites", "#/read", "#/connect",
    "#/security", "#/security/checklist", "#/security/quiz", "#/security/reminders", "#/security/words", "#/security/lesson/two-step",
    "#/family", "#/family/add", "#/family/share", "#/family/log", "#/emergency", "#/emergency/gift-cards", "#/settings", "#/privacy"];
  const page = await dash("#/home");
  for (const r of routes) {
    await page.evaluate((h) => { location.hash = h; }, r);
    await page.waitForFunction((h) => location.hash === h && document.querySelector("#view h1"), r);
    await page.waitForTimeout(80);
    const bad = await page.isVisible("text=Sorry, something went wrong");
    assert.equal(bad, false, `route ${r} failed`);
  }
  await page.close();
  assert.deepEqual(errors, []);
});

test("Scenario 10: text can be made bigger and 'Make everything easier to see' works", async () => {
  const page = await dash("#/home");
  const before = await page.evaluate(() => document.documentElement.dataset.textSize);
  await page.click("#nav-bigger");
  await page.waitForFunction((b) => document.documentElement.dataset.textSize !== b, before);
  await page.evaluate(() => { location.hash = "#/settings"; });
  await page.waitForSelector("#easier");
  await page.click("#easier");
  await page.waitForFunction(() => document.documentElement.dataset.theme === "contrast" && document.documentElement.dataset.textSize === "xlarge");
  await shot(page, "03-easier-to-see");
  // put back
  await page.click("[data-size=medium]");
  await page.click("[data-theme-choice=light]");
  await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
  await page.close();
});

test("Scenario 1: bank suspension email is flagged red with clear advice", async () => {
  const page = await dash("#/check/message");
  await page.fill("#sender", "Wells Fargo Online <alerts@wellsfargo-secure-update.com>");
  await page.fill("#text", "Dear Customer, your account has been suspended due to unusual activity. Verify your account number and password within 24 hours: http://wellsfargo-secure-update.com/verify");
  await page.click("button[type=submit]");
  await page.waitForSelector(".verdict-red");
  assert.ok(await page.isVisible("text=Do not click any links"));
  await shot(page, "04-scam-check-red");
  await page.close();
});

test("Scenario 5: 'grandchild' message is flagged as a family emergency scam", async () => {
  const page = await dash("#/check/message");
  await page.fill("#text", "Grandma it's me, I'm in jail and need bail money. Please don't tell Mom. Buy Google Play gift cards and send me the numbers.");
  await page.click("button[type=submit]");
  await page.waitForSelector(".verdict-red");
  assert.ok(await page.isVisible("text=call your family member"));
  await page.close();
});

test("look-alike link is red; official address is green", async () => {
  const page = await dash("#/check/link?url=" + encodeURIComponent("http://paypa1.com/login"));
  await page.waitForSelector(".verdict-red");
  await page.fill("#url", "https://www.medicare.gov/");
  await page.click("button[type=submit]");
  await page.waitForSelector(".verdict-green");
  assert.ok(await page.isVisible("text=No obvious warning signs found"));
  await page.close();
});

test("Scenario 2 & 7: 'What am I looking at?' explains a fake virus page", async () => {
  const site = await ctx.newPage();
  await site.goto(`${base}/fake-virus.html`);
  await readTab("fake-virus", "collectPageSnapshot", "lastSnapshot");
  const page = await dash("#/screen");
  await page.waitForSelector(".verdict");
  assert.ok(await page.isVisible("text=FAKE virus or security alert"));
  await page.click("[data-q=real]");
  await page.waitForSelector("#answer-body");
  assert.match(await page.textContent("#answer-body"), /Do not call any phone number/);
  await shot(page, "05-screen-fake-virus");
  await page.close();
  await site.close();
});

test("Scenario 4: an online form is explained (what it asks, what buttons do)", async () => {
  const site = await ctx.newPage();
  await site.goto(`${base}/form.html`);
  await readTab("form.html", "collectPageSnapshot", "lastSnapshot");
  const page = await dash("#/screen");
  await page.click("[data-q=asking]");
  const asking = await page.textContent("#answer-body");
  assert.match(asking, /your phone number/);
  assert.match(asking, /pop-up box/);
  await page.click("[data-q=buttons]");
  const buttons = await page.textContent("#answer-body");
  assert.match(buttons, /Accept all/);
  assert.match(buttons, /Reject all/);
  await shot(page, "06-screen-form");
  await page.close();
  await site.close();
});

test("Gmail email reader extracts sender, subject and disguised link", async () => {
  const site = await ctx.newPage();
  await site.goto(`${base}/gmail.html`);
  await readTab("gmail.html", "collectGmailMessage", "lastEmail");
  const page = await dash("#/email/open");
  await page.waitForSelector(".verdict-red");
  assert.ok(await page.isVisible("text=really goes to"));
  await shot(page, "07-email-gmail");
  await page.close();
  await site.close();
});

test("Scenario 3: assistant helps find a downloaded document", async () => {
  const page = await dash("#/assistant");
  await page.click("text=I can't find a file I downloaded");
  await page.waitForFunction(() => document.querySelectorAll(".msg-helper").length >= 2 && !document.body.innerText.includes("Let me think"));
  const last = await page.$$eval(".msg-helper", (els) => els[els.length - 1].innerText);
  assert.match(last, /J key/);
  assert.ok(await page.isVisible("a:has-text('Show me step by step')"));
  await shot(page, "08-assistant");
  await page.close();
});

test("machine-learning helper understands typos and learns new wording", async () => {
  const page = await dash("#/assistant");
  await page.click("#clear");
  // 1. Typos and casual wording are understood
  await page.fill("#question", "my printr wont prnt nothing");
  await page.click("#send");
  await page.waitForSelector("text=Ctrl key and the P key");
  assert.ok(await page.isVisible("text=Did I understand you?"));
  await page.click("[data-fb=yes]");
  await page.waitForSelector("text=I'll remember that");

  // 2. Something it doesn't understand: the person teaches it
  const odd = "the paper machine is being stubborn again";
  await page.fill("#question", odd);
  await page.click("#send");
  await page.waitForSelector("[data-choose]");
  if (!(await page.$("[data-choose=print]"))) await page.click("[data-choose=__more] >> nth=-1");
  await page.click("[data-choose=print] >> nth=-1");
  await page.waitForSelector("text=Next time you say something like");

  // 3. Asked the same way again, it now answers straight away
  await page.fill("#question", odd);
  await page.click("#send");
  await page.waitForFunction(() => {
    const helpers = document.querySelectorAll(".msg-helper");
    return helpers[helpers.length - 1].innerText.includes("Ctrl key and the P key");
  });
  const learned = await sw.evaluate(async () => (await chrome.storage.local.get("intentPersonal")).intentPersonal);
  assert.ok(learned.examples >= 2);
  await shot(page, "17-helper-learning");
  await page.close();
});

test("lessons go step by step with Back and Next", async () => {
  const page = await dash("#/learn/find-downloads");
  assert.match(await page.textContent(".lesson-progress"), /Step 1 of 4/);
  await page.click("[data-act=next]");
  assert.match(await page.textContent(".lesson-progress"), /Step 2 of 4/);
  await page.click("[data-act=prev]");
  assert.match(await page.textContent(".lesson-progress"), /Step 1 of 4/);
  assert.ok(await page.isVisible("text=I'm still confused"));
  await shot(page, "09-lesson");
  await page.close();
});

test("Scenario 9: add a trusted person and prepare a share (review before sending)", async () => {
  const page = await dash("#/family/add");
  await page.fill("#name", "Susan");
  await page.fill("#rel", "daughter");
  await page.fill("#email", "susan@example.com");
  await page.click("#f button[type=submit]");
  await page.waitForSelector("text=Susan");
  // a check result to share
  await page.evaluate(() => { location.hash = "#/check/message"; });
  await page.waitForSelector("#text");
  await page.fill("#text", "You have won the lottery! Pay the processing fee to claim your prize.");
  await page.click("button[type=submit]");
  await page.waitForSelector(".verdict");
  await page.click("text=Ask my family to check this");
  await page.waitForSelector("#p-body");
  assert.match(await page.textContent("#p-body"), /won the lottery/);
  // must agree first
  await page.click("#copy");
  assert.match(await page.textContent("#msg"), /tick the box/);
  await shot(page, "10-family-share");
  await page.close();
});

test("Scenario 6: favourites and connect page", async () => {
  const page = await dash("#/sites");
  await page.click("[data-fav='https://meet.google.com/']");
  await page.waitForSelector("text=In favourites ✓");
  await page.evaluate(() => { location.hash = "#/home"; });
  await page.waitForSelector(".fav-row a:has-text('Google Meet')");
  await page.evaluate(() => { location.hash = "#/connect"; });
  await page.waitForSelector("text=Start or join a video call");
  assert.ok(await page.isVisible("text=Susan"));
  await page.close();
});

test("Scenario 8: emergency pathway shows steps and remembers ticks", async () => {
  const page = await dash("#/emergency/clicked-link");
  await page.check("[data-step='0']");
  await page.waitForTimeout(200);
  await page.reload();
  await page.waitForSelector("[data-step='0']");
  assert.equal(await page.isChecked("[data-step='0']"), true);
  await shot(page, "11-emergency");
  await page.close();
});

test("protection: link guard stops a look-alike link and fake-alert banner appears", async () => {
  await sw.evaluate(async () => {
    const { settings = {} } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, protectionEnabled: true } });
  });
  const ok = await sw.evaluate(() => new Promise((res) => chrome.runtime.onMessage.hasListeners() && res(true)));
  assert.ok(ok);
  // trigger protection sync through the same message the settings page sends
  const page = await dash("#/home");
  const r = await page.evaluate(() => chrome.runtime.sendMessage({ type: "protection-changed" }));
  assert.equal(r.ok, true);
  await page.close();

  const links = await ctx.newPage();
  await links.goto(`${base}/links.html`);
  await links.waitForFunction(() => window.__easyAccessGuard === undefined || true);
  await links.waitForTimeout(500);
  await links.click("#bad");
  await links.waitForSelector("[data-easyaccess=guard]", { state: "attached" });
  assert.ok(links.url().includes("links.html"), "navigation was stopped");
  await shot(links, "12-link-guard");
  await links.close();

  const virus = await ctx.newPage();
  await virus.goto(`${base}/fake-virus.html`);
  await virus.waitForSelector("[data-easyaccess=guard]", { state: "attached", timeout: 5000 });
  await shot(virus, "13-fake-alert-banner");
  await virus.close();
});

test("protection: clearly dangerous address is replaced by the warning page", async () => {
  const p = await ctx.newPage();
  await p.goto("http://paypal.com.account-verify-secure.net/signin").catch(() => {});
  await p.waitForURL(/warning\/warning\.html/, { timeout: 8000 });
  assert.ok(await p.isVisible("text=Stop — this website looks dangerous"));
  await shot(p, "14-warning-page");
  await p.close();
});

test("read-aloud bar can be injected into a page", async () => {
  const site = await ctx.newPage();
  await site.goto(`${base}/form.html`);
  const tabId = await sw.evaluate(async () => (await chrome.tabs.query({})).filter((t) => (t.url || "").includes("form.html")).pop().id);
  await sw.evaluate(async (id) => {
    await chrome.scripting.executeScript({ target: { tabId: id }, files: ["content/reader.js"] });
    await chrome.scripting.executeScript({ target: { tabId: id }, func: () => window.__easyAccessReader.start("") });
  }, tabId);
  await site.waitForSelector("#easyaccess-reader-host", { state: "attached" });
  await site.close();
});

test("popup renders its big buttons", async () => {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/popup/popup.html`);
  await page.waitForSelector("[data-act=help]");
  const labels = await page.$$eval("[data-act]", (b) => b.map((x) => x.textContent.trim()));
  assert.ok(labels.some((l) => /I need help/.test(l)));
  assert.ok(labels.some((l) => /Emergency/.test(l)));
  await page.setViewportSize({ width: 430, height: 620 });
  await shot(page, "15-popup");
  await page.close();
});

test("AI helper: extension → helper server → (mock) Claude → answer shown", async () => {
  // A mock of the Claude Messages API, so no real key or network is needed.
  const mock = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", content: [{ type: "text", text: "Of course! First, press Ctrl and P together." }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
    });
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  const port = 19000 + Math.floor(Math.random() * 900);
  const proc = spawn(process.execPath, ["server.mjs"], {
    cwd: path.join(root, "backend"),
    env: { ...process.env, PORT: String(port), ANTHROPIC_API_KEY: "test", ANTHROPIC_BASE_URL: `http://127.0.0.1:${mock.address().port}`, ALLOWED_ORIGINS: `chrome-extension://${extId}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => { proc.stdout.on("data", (d) => String(d).includes("helper server on") && resolve()); setTimeout(() => reject(new Error("no server")), 8000); });
  try {
    const page = await dash("#/settings");
    await page.fill("#ai-url", `http://localhost:${port}`);
    await page.click("#ai-test");
    await page.waitForSelector("text=Connected! AI: ready");
    await page.check("#ai-consent");
    await page.click("#ai-save");
    await page.waitForFunction(() => document.querySelector("#ai-consent")?.checked);
    await page.evaluate(() => { location.hash = "#/assistant"; });
    await page.waitForSelector("text=The AI helper is on.");
    await page.fill("#question", "How do I print this page?");
    await page.click("#send");
    await page.waitForSelector("text=First, press Ctrl and P together.");
    // the built-in helper's buttons are still offered next to the AI answer
    assert.ok(await page.isVisible("a:has-text('Printing step by step')"));
    await shot(page, "16-assistant-ai");
    await page.close();
  } finally {
    proc.kill();
    mock.close();
  }
});

test("no JavaScript errors anywhere", () => {
  assert.deepEqual(errors, []);
});
