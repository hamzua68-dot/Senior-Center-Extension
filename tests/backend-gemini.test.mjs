// Backend tests for the Google Gemini provider, against a mock Gemini API (no real key needed).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
let mock, proc, base;
const seen = [];
let nextReply = () => ({ candidates: [{ content: { role: "model", parts: [{ text: "Gemini mock answer" }] }, finishReason: "STOP" }] });

before(async () => {
  mock = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body || "{}") });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(nextReply()));
    });
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  const port = 17000 + Math.floor(Math.random() * 900);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), GEMINI_API_KEY: "test-gemini-key", GEMINI_BASE_URL: `http://127.0.0.1:${mock.address().port}`, ALLOWED_ORIGINS: "chrome-extension://testid" };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  proc = spawn(process.execPath, ["server.mjs"], { cwd: path.join(here, "..", "backend"), env, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    proc.stdout.on("data", (d) => { if (String(d).includes("helper server on")) resolve(); });
    proc.on("exit", (c) => reject(new Error("server exited " + c)));
    setTimeout(() => reject(new Error("server did not start")), 8000);
  });
});

after(() => { proc?.kill(); mock?.close(); });

const post = (p, body) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Origin: "chrome-extension://testid" }, body: JSON.stringify(body) })
  .then(async (r) => ({ status: r.status, data: await r.json() }));

test("health reports Gemini as the AI provider", async () => {
  const r = await fetch(base + "/api/health").then((x) => x.json());
  assert.equal(r.ai, true);
  assert.equal(r.provider, "gemini");
  assert.equal(r.model, "gemini-3.8-flash");
});

test("chat is sent to Gemini with the safety instructions and conversation history", async () => {
  const r = await post("/api/chat", { messages: [
    { role: "user", content: "How do I print?" },
    { role: "assistant", content: "Press Ctrl and P." },
    { role: "user", content: "My card is 4111 1111 1111 1111, nothing happened" },
  ] });
  assert.equal(r.status, 200);
  assert.equal(r.data.reply, "Gemini mock answer");
  const req = seen.at(-1);
  assert.match(req.url, /models\/gemini-3\.8-flash:generateContent/);
  assert.equal(req.headers["x-goog-api-key"], "test-gemini-key", "key is sent in a header, not the URL");
  assert.ok(!req.url.includes("test-gemini-key"));
  assert.match(JSON.stringify(req.body.systemInstruction), /Never ask for/);
  assert.deepEqual(req.body.contents.map((c) => c.role), ["user", "model", "user"]);
  assert.ok(!JSON.stringify(req.body.contents).includes("4111"), "card number removed");
});

test("screenshots are sent as inline image data", async () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const r = await post("/api/explain-screenshot", { image: png });
  assert.equal(r.status, 200);
  const parts = seen.at(-1).body.contents[0].parts;
  assert.equal(parts[0].inlineData.mimeType, "image/png");
  assert.ok(parts[1].text.length > 0);
});

test("Google safety blocks become a kind, safe message", async () => {
  nextReply = () => ({ promptFeedback: { blockReason: "SAFETY" }, candidates: [] });
  const r = await post("/api/review-message", { message: { text: "test", localVerdict: "yellow" } });
  nextReply = () => ({ candidates: [{ content: { role: "model", parts: [{ text: "Gemini mock answer" }] }, finishReason: "STOP" }] });
  assert.equal(r.status, 200);
  assert.match(r.data.reply, /Elder Fraud Hotline/);
});
