// Backend tests against a mock Claude API (no real API key or network needed).
// Run with:  node --test tests/backend.test.mjs   (after: cd backend && npm install)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
let mock, proc, base;
const seen = [];
let nextReply = { text: "Mock answer", stop_reason: "end_turn" };

before(async () => {
  mock = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body || "{}") });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: "msg_mock", type: "message", role: "assistant", model: "claude-opus-5-5",
        content: nextReply.stop_reason === "refusal" ? [] : [{ type: "text", text: nextReply.text }],
        stop_reason: nextReply.stop_reason, stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      }));
    });
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  const port = 18000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ["server.mjs"], {
    cwd: path.join(here, "..", "backend"),
    env: { ...process.env, PORT: String(port), ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: `http://127.0.0.1:${mock.address().port}`, ALLOWED_ORIGINS: "chrome-extension://testid", EASYACCESS_ACCESS_CODE: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    proc.stdout.on("data", (d) => { if (String(d).includes("helper server on")) resolve(); });
    proc.on("exit", (c) => reject(new Error("server exited " + c)));
    setTimeout(() => reject(new Error("server did not start")), 8000);
  });
});

after(() => { proc?.kill(); mock?.close(); });

const post = (p, body, origin = "chrome-extension://testid") =>
  fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, data: await r.json(), cors: r.headers.get("access-control-allow-origin") }));

test("health reports AI ready", async () => {
  const r = await fetch(base + "/api/health").then((x) => x.json());
  assert.equal(r.ai, true);
  assert.equal(r.model, "claude-opus-5-5");
});

test("chat sends a well-formed request and redacts sensitive numbers", async () => {
  const r = await post("/api/chat", { messages: [
    { role: "assistant", content: "Hello! How can I help?" },
    { role: "user", content: "My SSN is 123-45-6789 and card 4111 1111 1111 1111. How do I print?" },
  ] });
  assert.equal(r.status, 200);
  assert.equal(r.data.reply, "Mock answer");
  assert.equal(r.cors, "chrome-extension://testid");
  const req = seen.at(-1);
  assert.equal(req.body.model, "claude-opus-5-5");
  assert.equal(req.body.fallbacks, "default");
  assert.equal(req.body.output_config.effort, "low");
  assert.match(req.headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
  assert.equal(req.body.messages.length, 1, "leading assistant greeting is dropped");
  const sent = JSON.stringify(req.body.messages);
  assert.ok(!sent.includes("123-45-6789") && !sent.includes("4111"), "sensitive numbers removed");
  assert.match(req.body.system, /Never ask for/);
});

test("explain-page turns the snapshot into readable text", async () => {
  const r = await post("/api/explain-page", { snapshot: { url: "https://example.org/", title: "Example", buttons: [{ text: "Download" }], forms: [{ fields: [{ kind: "email", label: "Email" }] }], text: "Hello" }, question: "What do I click?" });
  assert.equal(r.status, 200);
  const content = seen.at(-1).body.messages[0].content;
  assert.match(content, /Buttons: Download/);
  assert.match(content, /Form 1 asks for: email/);
});

test("screenshot endpoint sends an image block", async () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const r = await post("/api/explain-screenshot", { image: png });
  assert.equal(r.status, 200);
  const blocks = seen.at(-1).body.messages[0].content;
  assert.equal(blocks[0].type, "image");
  assert.equal(blocks[0].source.media_type, "image/png");
});

test("refusals become a kind, safe message", async () => {
  nextReply = { stop_reason: "refusal" };
  const r = await post("/api/review-message", { message: { text: "test", localVerdict: "yellow" } });
  nextReply = { text: "Mock answer", stop_reason: "end_turn" };
  assert.equal(r.status, 200);
  assert.match(r.data.reply, /Elder Fraud Hotline/);
});

test("requests from websites are refused", async () => {
  const r = await post("/api/chat", { messages: [{ role: "user", content: "hi" }] }, "https://evil.example");
  assert.equal(r.status, 403);
});

test("bad input is rejected politely", async () => {
  assert.equal((await post("/api/chat", { messages: [] })).status, 400);
  assert.equal((await post("/api/check-url", { url: "javascript:alert(1)" })).status, 400);
  assert.equal((await post("/api/explain-screenshot", { image: "not-an-image" })).status, 400);
});
