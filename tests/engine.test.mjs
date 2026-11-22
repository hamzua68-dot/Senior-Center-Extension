// Unit tests for the local scam engine.  Run with:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const E = require("../extension/engine/scam-engine.js");

const lvl = (r) => r.level;

test("official websites have no warning signs", () => {
  for (const u of ["https://www.paypal.com/signin", "https://www.ssa.gov/myaccount/", "https://mail.google.com/mail/u/0/", "https://www.amazon.com/gp/your-account", "https://www.medicare.gov", "https://www.chase.com", "https://www.bbc.co.uk/news", "https://www.wikipedia.org"]) {
    assert.equal(lvl(E.analyzeUrl(u)), "green", u + " " + JSON.stringify(E.analyzeUrl(u).reasons));
  }
});

test("look-alike and disguised addresses are red", () => {
  const bad = [
    "http://paypa1.com/login",
    "https://paypal.com.account-verify.net/signin",
    "https://www.arnazon.com/",
    "http://secure-wellsfargo-login.com",
    "http://45.77.12.9/bank/login",
    "https://xn--pple-43d.com",
    "https://micros0ft-support.top/",
    "https://www.google.com@evil.example/",
    "javascript:alert(1)",
    "http://amazon-refund-department.com",
    "https://bankofamerlca.com/",
  ];
  for (const u of bad) assert.equal(lvl(E.analyzeUrl(u)), "red", u + " " + JSON.stringify(E.analyzeUrl(u).reasons));
});

test("home router and local addresses are not flagged", () => {
  for (const u of ["http://192.168.1.1/", "http://localhost:8080/", "http://10.0.0.1/login"]) assert.equal(lvl(E.analyzeUrl(u)), "green", u);
});

test("shortened links are flagged yellow (destination unknown)", () => {
  assert.equal(lvl(E.analyzeUrl("https://bit.ly/3abcXYZ")), "yellow");
});

test("ordinary .html pages are not treated as downloads", () => {
  assert.equal(lvl(E.analyzeUrl("https://www.example.org/news/story.html")), "green");
});

test("program downloads are red", () => {
  assert.equal(lvl(E.analyzeUrl("https://files.example.com/invoice.exe")), "red");
});

test("Scenario 1: bank account suspension email is red", () => {
  const r = E.analyzeMessage({
    sender: "Wells Fargo Online <alerts@wellsfargo-secure-update.com>",
    subject: "URGENT: Your account has been suspended",
    text: "Dear Customer,\nWe detected unusual activity on your account. Your account will be suspended within 24 hours unless you verify your identity. Click here to confirm your account number and password: http://wellsfargo-secure-update.com/verify\nWells Fargo Security Team",
  });
  assert.equal(r.level, "red", JSON.stringify(r.reasons, null, 1));
  assert.ok(r.links.length === 1 && r.links[0].level === "red");
});

test("Scenario 2: fake virus pop-up text is red", () => {
  const r = E.analyzeMessage("WARNING! Your computer has been infected with a Trojan spyware. Do not shut down your computer. Call Microsoft Support immediately at 1-888-555-0199 to unlock your PC.");
  assert.equal(r.level, "red");
  assert.ok(r.categories.includes("Fake virus or tech support"));
  assert.deepEqual(r.phones, ["1-888-555-0199"]);
});

test("Scenario 5: grandchild emergency message is red", () => {
  const r = E.analyzeMessage("Hi Grandma, it's me, your grandson. I'm in jail after an accident and need money for bail. Please don't tell Mom. The lawyer says you can pay with Target gift cards, just read me the numbers on the back.");
  assert.equal(r.level, "red");
  assert.ok(r.categories.includes("Family emergency / grandparent scam"));
  assert.ok(r.categories.includes("Gift card payment"));
});

test("government impersonation is red", () => {
  const r = E.analyzeMessage("This is the Social Security Administration. Your Social Security number has been suspended due to suspicious activity. Call immediately or a warrant will be issued for your arrest.");
  assert.equal(r.level, "red");
});

test("fake delivery text is at least yellow", () => {
  const r = E.analyzeMessage("USPS: Your package could not be delivered due to an incomplete address. Pay the $1.99 redelivery fee here: https://usps-redelivery.top/track");
  assert.equal(r.level, "red");
});

test("fake invoice / refund scam is flagged", () => {
  const r = E.analyzeMessage({ sender: "Geek Squad <billing.team0921@gmail.com>", text: "Your Geek Squad subscription has been renewed for $399.99. If you did not authorize this charge, call us now to cancel at (808) 555-0142." });
  assert.equal(r.level, "red", JSON.stringify(r.reasons, null, 1));
});

test("romance scam signs are flagged", () => {
  const r = E.analyzeMessage("My darling, I am an engineer working offshore on an oil rig. I can't video call right now. Customs is holding my package and I need help to pay the customs fees. Please send it by Western Union, my love.");
  assert.ok(["red", "yellow"].includes(r.level));
  assert.ok(r.categories.includes("Romance or friendship scam signs"));
});

test("ordinary personal and newsletter messages are green", () => {
  const msgs = [
    { sender: "Susan Miller <susan.miller@gmail.com>", text: "Hi Mom! Just wanted to say the kids loved the cookies. We'll see you Sunday for lunch. Love, Sue" },
    { sender: "City Library <news@citylibrary.org>", text: "Our book club meets next Tuesday at 2pm in the community room. This month we're reading a mystery novel. Coffee and snacks will be provided." },
    { text: "Your appointment with Dr. Patel is confirmed for Thursday, March 12 at 10:30 AM. Please arrive 15 minutes early." },
  ];
  for (const m of msgs) assert.equal(E.analyzeMessage(m).level, "green", JSON.stringify(E.analyzeMessage(m).reasons));
});

test("sender name/brand mismatch is detected", () => {
  const r = E.analyzeSender("PayPal Service <paypal.service.team@gmail.com>");
  assert.ok(r.reasons.length > 0);
  assert.equal(E.analyzeSender("PayPal <service@paypal.com>").reasons.length, 0);
});

test("dangerous attachments are red", () => {
  const r = E.analyzeMessage({ text: "Please see the attached invoice.", attachments: ["Invoice_2024.pdf.exe"] });
  assert.equal(r.level, "red");
});

test("page analysis: fake support page with full-screen takeover is red", () => {
  const r = E.analyzePage({
    url: "http://windows-defender-alert.xyz/", title: "Security Alert",
    headings: [{ level: 1, text: "Windows Defender Security Center" }],
    text: "Your computer has been blocked. Pornographic spyware detected. Call Microsoft Support +1-844-555-0111 immediately. Do not restart your computer.",
    dialogs: [{ text: "Access to this PC has been blocked for security reasons." }],
    forms: [], fullscreen: true,
  });
  assert.equal(r.level, "red");
  assert.ok(r.fakeAlert);
});

test("page analysis: real login page is not red", () => {
  const r = E.analyzePage({ url: "https://accounts.google.com/signin", title: "Sign in - Google Accounts", text: "Sign in. Use your Google Account. Email or phone. Forgot email?", forms: [{ fields: [{ kind: "email" }, { kind: "password" }] }] });
  assert.equal(r.level, "green", JSON.stringify(r.reasons));
});

test("page analysis: password form on look-alike site is red", () => {
  const r = E.analyzePage({ url: "https://appleid-verify-account.com/", title: "Apple ID", text: "Sign in to verify your Apple ID", forms: [{ fields: [{ kind: "email" }, { kind: "password" }] }] });
  assert.equal(r.level, "red");
});
