// EasyAccess helper server — keeps API keys OUT of the browser extension.
//
//   AI explanations  → Claude API (ANTHROPIC_API_KEY)  or  Google Gemini API (GEMINI_API_KEY)
//   Website threats  → Google Safe Browsing v4 (GOOGLE_SAFE_BROWSING_KEY, optional)
//
// Privacy: request bodies are never logged or stored. Only counts and errors are logged.
// Run:  cd backend && npm install && ANTHROPIC_API_KEY=... node server.mjs
import http from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, ApiError as GeminiApiError } from "@google/genai";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const CLAUDE_MODEL = process.env.EASYACCESS_MODEL || "claude-opus-5-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const EFFORT = process.env.EASYACCESS_EFFORT || "low"; // fast, friendly answers; raise for harder questions
const ACCESS_CODE = process.env.EASYACCESS_ACCESS_CODE || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY || "";
const RATE_PER_MIN = Number(process.env.RATE_LIMIT_PER_MINUTE || 20);

// Which AI service to use: AI_PROVIDER=claude|gemini, or whichever key is present (Claude first).
const hasClaudeKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const PROVIDER = (process.env.AI_PROVIDER || (hasClaudeKey ? "claude" : hasGeminiKey ? "gemini" : "")).toLowerCase();
const hasAi = (PROVIDER === "claude" && hasClaudeKey) || (PROVIDER === "gemini" && hasGeminiKey);
const MODEL = PROVIDER === "gemini" ? GEMINI_MODEL : CLAUDE_MODEL;
const client = hasAi && PROVIDER === "claude" ? new Anthropic() : null;
const gemini = hasAi && PROVIDER === "gemini"
  ? new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}),
  })
  : null;

// ------------------------------------------------------------------ prompts
const BASE_SYSTEM = `You are the EasyAccess helper: a patient, warm computer helper for older adults who may have little computer experience.

How to answer:
- Use plain, everyday words. Avoid jargon; if a technical word is unavoidable, explain it in a few words.
- Keep answers short: usually 2–5 short sentences. When giving instructions, give ONE step at a time unless the person asks for all steps, and end by asking them to tell you when it's done.
- Be encouraging and never make the person feel embarrassed. Mistakes and scams can happen to anyone.
- Assume Google Chrome. If the computer type matters (Windows, Mac, Chromebook), give the most common way and briefly mention the other, or ask.
- Write plain text only: no markdown, no asterisks, no headings, no tables.

Safety rules (always follow):
- Never ask for, and tell the person never to share: passwords, PINs, one-time codes, full card or bank numbers, or Social Security numbers.
- Never say anything is guaranteed safe. Say what you can see and what to check.
- If something might be a scam: tell them not to click links, call numbers in the message, pay, or allow remote access; and to contact the organisation using a number from their card, statement or the official website they type themselves.
- Never encourage sending money, buying gift cards or cryptocurrency, or installing remote-access software for someone who contacted them.
- You cannot click, type or act on their computer. You only explain.
- For emergencies (money already sent, identity theft), point them to their bank (number on the card), ReportFraud.ftc.gov, IdentityTheft.gov, or the National Elder Fraud Hotline 1-833-372-8311. For danger to life, 911.`;

const TASKS = {
  chat: "",
  "explain-page": `\nThe person is looking at a web page. You are given a text summary of what is visible (headings, buttons, form fields, pop-ups, text). Explain what the page is, what it is asking them to do, which buttons matter and what they do, anything risky, and the single best next step. If the page looks like a fake virus or tech-support warning, say clearly that it looks fake, that their computer has not been confirmed to have a virus, not to call any number, and how to close the tab (Ctrl+W, or Command+W on a Mac; restart if it won't close).`,
  "explain-screenshot": `\nThe person has shared a picture of their browser screen. Describe what is on the screen in plain words, point out where the important buttons are (by their words and position, e.g. "the blue button at the bottom right that says Download"), flag anything that looks like a scam or fake warning, and give the best next step. Do not read out personal details you can see.`,
  "review-message": `\nThe person wants a second opinion on whether a message (email, text or social media message) is a scam. EasyAccess's own rule-based check has already run; its verdict is included. Give your view in plain words: say whether it looks like a scam, the 2–4 most important warning signs (or reassuring signs), and exactly what to do now. Never say it is definitely safe.`,
  email: `\nThe person needs help with an email.`,
};

const EMAIL_TASKS = {
  summarize: "Explain this email in very simple words: who it's from (if known), what it's about, what (if anything) the person needs to do and by when. Mention anything that looks like a scam.",
  explain: "Explain this text in very simple words, as if to someone who doesn't use computers much. Keep it short.",
  draft: "Write a short, polite reply the person could send to this email. Only the reply text, signed off with \"Best wishes,\" and no name. If the email looks like a scam, instead write one sentence advising not to reply.",
};

// ------------------------------------------------------------------ helpers
function json(res, status, body, origin) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...corsHeaders(origin),
  });
  res.end(JSON.stringify(body));
}

function originAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length) return ALLOWED_ORIGINS.includes(origin);
  return origin.startsWith("chrome-extension://"); // development default: any extension
}

function corsHeaders(origin) {
  if (!originAllowed(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-EasyAccess-Code",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function codeOk(req) {
  if (!ACCESS_CODE) return true;
  const given = String(req.headers["x-easyaccess-code"] || "");
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(ACCESS_CODE).digest();
  return timingSafeEqual(a, b);
}

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE_PER_MIN;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error("Too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { reject(Object.assign(new Error("Bad JSON"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

const clip = (s, n) => String(s ?? "").slice(0, n);

// Remove things that look like card or Social Security numbers before anything leaves this server.
function redact(text) {
  return String(text)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[number removed]")
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[number removed]");
}

const REFUSAL_REPLY = "I'm sorry, I can't help with that one. If you're worried about a scam or your safety, please call your bank using the number on your card, or the National Elder Fraud Hotline at 1-833-372-8311.";

/** Send one request to whichever AI service is configured. `content` is a string or Claude-style blocks. */
async function askAI(task, content, history = []) {
  if (!hasAi) throw Object.assign(new Error("The AI helper isn't set up on the server (add ANTHROPIC_API_KEY or GEMINI_API_KEY)."), { status: 503 });
  return PROVIDER === "gemini" ? askGemini(task, content, history) : askClaude(task, content, history);
}

async function askGemini(task, content, history) {
  const toParts = (c) => (typeof c === "string" ? [{ text: c }] : c.map((b) => (b.type === "image"
    ? { inlineData: { mimeType: b.source.media_type, data: b.source.data } }
    : { text: b.text })));
  const contents = [
    ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    { role: "user", parts: toParts(content) },
  ];
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction: BASE_SYSTEM + (TASKS[task] || "") },
  });
  const finish = response.candidates && response.candidates[0] && response.candidates[0].finishReason;
  if ((response.promptFeedback && response.promptFeedback.blockReason) || finish === "SAFETY" || finish === "PROHIBITED_CONTENT") return REFUSAL_REPLY;
  const text = (response.text || "").trim();
  return text || "Sorry, I couldn't think of an answer. Could you ask in a different way?";
}

async function askClaude(task, content, history = []) {
  const messages = [...history, { role: "user", content }];
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system: BASE_SYSTEM + (TASKS[task] || ""),
    output_config: { effort: EFFORT },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages,
  });
  if (response.stop_reason === "refusal") return REFUSAL_REPLY;
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  return text || "Sorry, I couldn't think of an answer. Could you ask in a different way?";
}

function pageToText(s) {
  if (!s || typeof s !== "object") return "";
  const lines = [];
  lines.push(`Website address: ${clip(s.url, 300)}`);
  lines.push(`Page title: ${clip(s.title, 200)}`);
  if (Array.isArray(s.headings)) lines.push("Headings: " + s.headings.slice(0, 20).map((h) => clip(h.text, 120)).join(" | "));
  if (Array.isArray(s.buttons)) lines.push("Buttons: " + s.buttons.slice(0, 30).map((b) => clip(b.text, 60)).join(" | "));
  if (Array.isArray(s.forms)) s.forms.slice(0, 6).forEach((f, i) => lines.push(`Form ${i + 1} asks for: ` + (f.fields || []).slice(0, 20).map((x) => `${clip(x.kind, 20)}${x.label ? ` ("${clip(x.label, 60)}")` : ""}`).join(", ")));
  if (Array.isArray(s.dialogs) && s.dialogs.length) lines.push("Pop-ups: " + s.dialogs.slice(0, 4).map((d) => clip(d.text, 300)).join(" | "));
  if (Array.isArray(s.alerts) && s.alerts.length) lines.push("Messages on page: " + s.alerts.slice(0, 4).map((a) => clip(a, 200)).join(" | "));
  lines.push("Visible text:\n" + clip(s.text, 8000));
  return redact(lines.join("\n"));
}

async function safeBrowsing(url) {
  if (!SAFE_BROWSING_KEY) return { configured: false };
  const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(SAFE_BROWSING_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client: { clientId: "easyaccess", clientVersion: "1.0.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }],
      },
    }),
  });
  if (!res.ok) throw Object.assign(new Error("Safe Browsing lookup failed"), { status: 502 });
  const data = await res.json();
  const threats = Array.from(new Set((data.matches || []).map((m) => m.threatType)));
  return { configured: true, dangerous: threats.length > 0, threats };
}

// ------------------------------------------------------------------ routes
const ROUTES = {
  "GET /api/health": async () => ({ ok: true, ai: hasAi, provider: hasAi ? PROVIDER : null, safeBrowsing: !!SAFE_BROWSING_KEY, model: hasAi ? MODEL : null }),

  "POST /api/chat": async (b) => {
    const msgs = Array.isArray(b.messages) ? b.messages.slice(-12) : [];
    const clean = msgs
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: redact(clip(m.content, 4000)) }));
    while (clean.length && clean[0].role !== "user") clean.shift();
    if (!clean.length || clean[clean.length - 1].role !== "user") throw Object.assign(new Error("No question was sent."), { status: 400 });
    const last = clean.pop();
    const content = b.context ? `About the page I was just looking at (summary from EasyAccess): ${redact(clip(b.context, 3000))}\n\nMy question: ${last.content}` : last.content;
    return { reply: await askAI("chat", content, clean) };
  },

  "POST /api/explain-page": async (b) => {
    const q = clip(b.question, 500) || "What am I looking at, and what should I do?";
    return { reply: await askAI("explain-page", `${pageToText(b.snapshot)}\n\nThe person asks: ${redact(q)}`) };
  },

  "POST /api/explain-screenshot": async (b) => {
    const m = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ""));
    if (!m) throw Object.assign(new Error("The picture couldn't be read."), { status: 400 });
    const content = [
      { type: "image", source: { type: "base64", media_type: m[1], data: m[3] } },
      { type: "text", text: redact(clip(b.question, 500)) || "What is on this screen and what should I do next?" },
    ];
    return { reply: await askAI("explain-screenshot", content) };
  },

  "POST /api/review-message": async (b) => {
    const msg = b.message || {};
    const text = [
      msg.sender ? `From: ${clip(msg.sender, 300)}` : "",
      msg.subject ? `Subject: ${clip(msg.subject, 300)}` : "",
      Array.isArray(msg.attachments) && msg.attachments.length ? `Attachments: ${msg.attachments.slice(0, 10).map((a) => clip(a, 100)).join(", ")}` : "",
      `EasyAccess rule-based verdict: ${clip(msg.localVerdict, 10)}`,
      "Message:", clip(msg.text, 12000),
    ].filter(Boolean).join("\n");
    return { reply: await askAI("review-message", redact(text)) };
  },

  "POST /api/email": async (b) => {
    const task = EMAIL_TASKS[b.task] ? b.task : "summarize";
    return { reply: await askAI("email", `${EMAIL_TASKS[task]}\n\n---\n${redact(clip(b.text, 12000))}\n---`) };
  },

  "POST /api/check-url": async (b) => {
    const url = clip(b.url, 2000);
    if (!/^https?:\/\//i.test(url)) throw Object.assign(new Error("Not a web address."), { status: 400 });
    return safeBrowsing(url);
  },
};

// ------------------------------------------------------------------ server
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  const ip = req.socket.remoteAddress || "unknown";
  const path = (req.url || "").split("?")[0];

  if (req.method === "OPTIONS") {
    res.writeHead(originAllowed(origin) ? 204 : 403, corsHeaders(origin));
    res.end();
    return;
  }
  // Browsers always send Origin on cross-origin requests; refuse unknown websites.
  if (origin && !originAllowed(origin)) return json(res, 403, { error: "This server only works with the EasyAccess extension." }, origin);

  const handler = ROUTES[`${req.method} ${path}`];
  if (!handler) return json(res, 404, { error: "Not found" }, origin);
  if (!codeOk(req)) return json(res, 401, { error: "The access code in Settings isn't right. Please ask whoever set up EasyAccess." }, origin);
  if (req.method === "POST" && rateLimited(ip)) return json(res, 429, { error: "Lots of questions at once! Please wait a minute and try again." }, origin);

  try {
    const body = req.method === "POST" ? await readBody(req, path === "/api/explain-screenshot" ? 8 * 1024 * 1024 : 256 * 1024) : {};
    const result = await handler(body);
    json(res, 200, result, origin);
  } catch (err) {
    // Our own errors carry a status and a friendly message; anything else gets a generic message.
    const ours = !!err.status && !(err instanceof Anthropic.APIError) && !(err instanceof GeminiApiError);
    let status = err.status || 500;
    let message = ours ? err.message : "The AI helper had a problem. Please try again in a moment.";
    if (err instanceof Anthropic.RateLimitError) { status = 429; message = "The AI helper is very busy. Please try again in a minute."; }
    else if (err instanceof Anthropic.AuthenticationError) { status = 503; message = "The AI helper isn't set up correctly on the server."; }
    else if (err instanceof Anthropic.APIConnectionError) { status = 502; message = "The AI helper couldn't be reached. Please try again."; }
    else if (err instanceof Anthropic.APIError) { status = 502; }
    else if (err instanceof GeminiApiError) {
      if (err.status === 429) { status = 429; message = "The AI helper is very busy. Please try again in a minute."; }
      else if (err.status === 400 && /api key/i.test(err.message) || err.status === 401 || err.status === 403) { status = 503; message = "The AI helper isn't set up correctly on the server (check the Gemini API key)."; }
      else if (err.status === 404) { status = 503; message = "The AI helper's model name isn't available. Check GEMINI_MODEL on the server."; }
      else status = 502;
    }
    console.error(`[${new Date().toISOString()}] ${req.method} ${path} -> ${status}: ${err.name || "Error"} ${ours ? err.message : ""}`);
    json(res, status, { error: message }, origin);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`EasyAccess helper server on http://${HOST}:${PORT}  (AI: ${hasAi ? `${PROVIDER} · ${MODEL}` : "off"}, Safe Browsing: ${SAFE_BROWSING_KEY ? "on" : "off"}, access code: ${ACCESS_CODE ? "required" : "none"})`);
  if (!ALLOWED_ORIGINS.length) console.log("Note: ALLOWED_ORIGINS is not set — any Chrome extension may call this server. Set it to chrome-extension://<your-extension-id> in production.");
});
