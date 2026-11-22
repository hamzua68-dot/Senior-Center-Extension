// Trains the helper's topic classifier and writes extension/data/intent-model.json.
// Usage: node tools/train-intents.mjs
// Model: multinomial logistic regression (softmax) trained with SGD + L2, on word, word-pair
// and letter-trigram features (see extension/shared/intent-model.js).
import { writeFileSync } from "node:fs";
import { TRAIN, TEST, WRAPPERS } from "./intent-data.mjs";
import { featurize, classify } from "../extension/shared/intent-model.js";

// Seeded random numbers so training is reproducible.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];

function typo(text) {
  const words = text.split(" ");
  const i = Math.floor(rand() * words.length);
  const w = words[i];
  if (w.length < 4) return text;
  const j = 1 + Math.floor(rand() * (w.length - 2));
  const kind = rand();
  words[i] = kind < 0.4 ? w.slice(0, j) + w.slice(j + 1)                       // dropped letter
    : kind < 0.7 ? w.slice(0, j) + w[j + 1] + w[j] + w.slice(j + 2)             // swapped letters
      : w.slice(0, j) + w[j] + w.slice(j);                                      // doubled letter
  return words.join(" ");
}

// ---- build the training set with augmentation
const intents = Object.keys(TRAIN);
const examples = [];
for (const intent of intents) {
  for (const phrase of TRAIN[intent]) {
    examples.push([phrase, intent]);
    const wrap = !["greeting", "thanks", "out-of-scope"].includes(intent);
    for (let k = 0; k < 3; k++) {
      let t = wrap ? pick(WRAPPERS).replace("{}", phrase) : phrase;
      if (rand() < 0.6) t = typo(t);
      examples.push([t, intent]);
    }
  }
}
const data = examples.map(([t, intent]) => ({ f: featurize(t), y: intents.indexOf(intent) }));

// ---- train softmax regression with SGD
const W = new Map(); // feature -> Float64Array(classes)
const b = new Float64Array(intents.length);
const C = intents.length;
const L2 = 1e-4;
const PRUNE = Number(process.env.PRUNE || 0.18);
const row = (f) => { let r = W.get(f); if (!r) { r = new Float64Array(C); W.set(f, r); } return r; };

for (let epoch = 0; epoch < 40; epoch++) {
  const lr = 0.8 / (1 + epoch * 0.1);
  for (let i = data.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [data[i], data[j]] = [data[j], data[i]]; }
  for (const { f, y } of data) {
    const s = Array.from(b);
    for (const k in f) { const r = W.get(k); if (r) for (let c = 0; c < C; c++) s[c] += r[c] * f[k]; }
    const m = Math.max(...s);
    const e = s.map((x) => Math.exp(x - m));
    const z = e.reduce((a, x) => a + x, 0);
    for (let c = 0; c < C; c++) {
      const g = (c === y ? 1 : 0) - e[c] / z;
      b[c] += lr * g * 0.1;
      for (const k in f) { const r = row(k); r[c] += lr * (g * f[k] - L2 * r[c]); }
    }
  }
}

// ---- export a compact sparse model
const weights = {};
let kept = 0;
for (const [f, r] of W) {
  const out = [];
  for (let c = 0; c < C; c++) if (Math.abs(r[c]) >= PRUNE) { out.push(c, Math.round(r[c] * 1000) / 1000); kept++; }
  if (out.length) weights[f] = out;
}
const model = { version: 1, trainedAt: new Date().toISOString().slice(0, 10), intents, bias: Array.from(b, (x) => Math.round(x * 1000) / 1000), weights };

// ---- evaluate
function evaluate(set, label) {
  let right = 0, total = 0;
  const misses = [];
  for (const intent of Object.keys(set)) for (const t of set[intent]) {
    total++;
    const r = classify(model, t);
    const guess = r.top.intent;
    if (guess === intent) right++; else misses.push(`  "${t}" → ${guess} (wanted ${intent})`);
  }
  console.log(`${label}: ${right}/${total} correct (${((100 * right) / total).toFixed(1)}%)`);
  if (misses.length && label.startsWith("Held-out")) console.log(misses.join("\n"));
  return right / total;
}
evaluate(TRAIN, "Training phrases");
const acc = evaluate(TEST, "Held-out phrases (never seen in training)");

const path = new URL("../extension/data/intent-model.json", import.meta.url);
writeFileSync(path, JSON.stringify(model));
console.log(`Saved ${intents.length} topics, ${Object.keys(weights).length} features, ${kept} weights → extension/data/intent-model.json (${(JSON.stringify(model).length / 1024).toFixed(0)} KB)`);
if (acc < 0.85) { console.error("Held-out accuracy is below 85% — add more training phrases."); process.exit(1); }
