// Tests for the on-device topic classifier used by the built-in helper.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify, learnExample, featurize } from "../extension/shared/intent-model.js";
import { TEST } from "../tools/intent-data.mjs";
import { COMMON_PROBLEMS, INTENTS, INTENT_LABELS } from "../extension/data/assistant-knowledge.js";

const model = JSON.parse(readFileSync(new URL("../extension/data/intent-model.json", import.meta.url)));

test("every topic in the model has an answer and a label", () => {
  for (const id of model.intents.filter((i) => i !== "out-of-scope")) {
    assert.ok(INTENTS.find((i) => i.id === id), `no answer for ${id}`);
    assert.ok(INTENT_LABELS[id], `no label for ${id}`);
  }
});

test("understands held-out phrasings it was never trained on (≥ 90%)", () => {
  let right = 0, total = 0;
  for (const [intent, phrases] of Object.entries(TEST)) for (const t of phrases) { total++; if (classify(model, t).top.intent === intent) right++; }
  assert.ok(right / total >= 0.9, `${right}/${total}`);
});

test("copes with typos and vague wording", () => {
  const cases = { "my printr wont prnt nothing": "print", "were did my donwload go": "find-download", "grandsun says hes in jale needs bail": "fake-family",
    "the computr says virus call this number": "fake-virus", "i cant here the sound": "volume", "how do i sned a foto to my dauhgter by email": "attach" };
  for (const [t, want] of Object.entries(cases)) assert.equal(classify(model, t).top.intent, want, t);
});

test("all the common-problem buttons are understood confidently", () => {
  for (const p of COMMON_PROBLEMS) assert.equal(classify(model, p.say).confidence, "sure", p.say);
});

test("off-topic questions are recognised as not understood", () => {
  for (const t of ["what is the population of canada", "recommend a movie", "asdfgh qwerty"]) assert.equal(classify(model, t).confidence, "lost", t);
});

test("learns a new way of saying something, on this computer only", () => {
  const odd = "the paper machine is being stubborn again";
  assert.notEqual(classify(model, odd).top.intent, "print");
  const personal = learnExample(model, null, odd, "print");
  assert.equal(classify(model, odd, personal).top.intent, "print");
  assert.equal(personal.examples, 1);
  // similar wording now benefits too, and unrelated questions are unaffected
  assert.equal(classify(model, "paper machine stubborn", personal).top.intent, "print");
  assert.equal(classify(model, "my wifi is not working", personal).top.intent, "wifi");
  // the personal layer is small and serialisable
  assert.ok(JSON.stringify(personal).length < 20000);
});

test("features are normalised", () => {
  const f = featurize("Hello there!");
  const norm = Math.sqrt(Object.values(f).reduce((a, v) => a + v * v, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9);
});
