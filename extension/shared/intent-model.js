// On-device machine learning for the built-in helper.
//
// A small multinomial logistic-regression text classifier that maps whatever the person
// types ("my printer wont do nothing", "grandsun needs bail") to a helper topic.
//  • Features: word stems, word pairs, and letter-trigrams (so typos still match).
//  • The base model is trained offline by tools/train-intents.mjs → data/intent-model.json.
//  • It keeps learning on this computer: when the person picks the right topic,
//    learnExample() updates a small personal layer of weights stored locally.
// Nothing is sent anywhere. This file has no browser dependencies, so Node uses it for training.

const CONTRACTIONS = [
  [/\bcan'?t\b/g, "can not"], [/\bcannot\b/g, "can not"], [/\bwon'?t\b/g, "will not"], [/\bdon'?t\b/g, "do not"],
  [/\bdoesn'?t\b/g, "does not"], [/\bdidn'?t\b/g, "did not"], [/\bisn'?t\b/g, "is not"], [/\baren'?t\b/g, "are not"],
  [/\bi'?m\b/g, "i am"], [/\bit'?s\b/g, "it is"], [/\bwhat'?s\b/g, "what is"], [/\bwhere'?s\b/g, "where is"],
  [/\bi'?ve\b/g, "i have"], [/\bi'?d\b/g, "i would"], [/\bthat'?s\b/g, "that is"], [/\bhow'?s\b/g, "how is"],
];

// Gentle normalisation of common words and spellings.
const CANON = {
  "e-mail": "email", emails: "email", "e mail": "email", gmail: "email", outlook: "email", yahoo: "email",
  pic: "picture", pics: "picture", photo: "picture", photos: "picture", image: "picture", images: "picture", foto: "picture",
  pc: "computer", laptop: "computer", desktop: "computer", chromebook: "computer", mac: "computer", macbook: "computer", ipad: "computer", tablet: "computer",
  "wi-fi": "wifi", "wi fi": "wifi", wify: "wifi", wireless: "wifi",
  grandson: "grandchild", granddaughter: "grandchild", grandkid: "grandchild", grandsun: "grandchild", grandaughter: "grandchild",
  grandma: "grandparent", grandpa: "grandparent", granny: "grandparent", nana: "grandparent", papa: "grandparent",
  pw: "password", passcode: "password", passwd: "password", pword: "password",
  url: "link", hyperlink: "link", weblink: "link",
  website: "site", webpage: "site", page: "site", web: "site",
  pdf: "document", doc: "document", docs: "document", file: "document", files: "document", paperwork: "document",
  facetime: "videocall", zoom: "videocall", skype: "videocall", "google meet": "videocall", teams: "videocall",
  printer: "print", printing: "print", printed: "print", prints: "print",
  ok: "okay", thx: "thanks", ty: "thanks", pls: "please", plz: "please", u: "you", ur: "your", r: "are",
};

export function normalize(text) {
  let t = String(text || "").toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  t = t.replace(/\bwi[\s-]?fi\b/g, "wifi").replace(/\be[\s-]mail\b/g, "email").replace(/\bgoogle meet\b/g, "videocall");
  t = t.replace(/[^a-z0-9$' ]+/g, " ").replace(/'/g, "").replace(/\s+/g, " ").trim();
  return t.split(" ").filter(Boolean).map((w) => CANON[w] || w).join(" ");
}

export function stem(w) {
  if (w.length <= 3) return w;
  for (const suf of ["ingly", "ing", "edly", "ed", "ies", "es", "ly", "s"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      const base = w.slice(0, -suf.length);
      return suf === "ies" ? base + "y" : base;
    }
  }
  return w;
}

/** Text → sparse feature map { feature: value }, L2-normalised. */
export function featurize(text) {
  const words = normalize(text).split(" ").filter(Boolean);
  const counts = new Map();
  const add = (f, v = 1) => counts.set(f, (counts.get(f) || 0) + v);
  const stems = words.map(stem);
  stems.forEach((s, i) => {
    add("w:" + s);
    if (i > 0) add("b:" + stems[i - 1] + "_" + s);
    const padded = `#${words[i]}#`;
    if (words[i].length >= 3) for (let j = 0; j + 3 <= padded.length; j++) add("c:" + padded.slice(j, j + 3), 0.5);
  });
  let norm = 0;
  counts.forEach((v) => { norm += v * v; });
  norm = Math.sqrt(norm) || 1;
  const out = {};
  counts.forEach((v, f) => { out[f] = v / norm; });
  return out;
}

function softmax(scores) {
  const m = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / z);
}

/** Raw class scores for a feature map. weights: { feature: [classIdx, w, classIdx, w, ...] } */
function scoresFor(model, feats, personal) {
  const scores = model.bias.slice();
  let known = 0, total = 0;
  for (const f in feats) {
    const v = feats[f];
    total++;
    const row = model.weights[f];
    if (row) {
      known++;
      for (let i = 0; i < row.length; i += 2) scores[row[i]] += row[i + 1] * v;
    }
    const p = personal && personal.weights && personal.weights[f];
    if (p) {
      for (const k in p) {
        const idx = model.intents.indexOf(k);
        if (idx >= 0) scores[idx] += p[k] * v;
      }
    }
  }
  return { scores, coverage: total ? known / total : 0 };
}

/**
 * classify(model, text, personal) →
 *   { ranked: [{ intent, p }...], top, confidence: "sure" | "unsure" | "lost", coverage }
 */
export function classify(model, text, personal) {
  const feats = featurize(text);
  if (!Object.keys(feats).length) return { ranked: [], top: null, confidence: "lost", coverage: 0 };
  const { scores, coverage } = scoresFor(model, feats, personal);
  const probs = softmax(scores);
  const ranked = model.intents.map((intent, i) => ({ intent, p: probs[i] })).sort((a, b) => b.p - a.p);
  const top = ranked[0];
  const margin = top.p - (ranked[1] ? ranked[1].p : 0);
  let confidence;
  if (top.intent === "out-of-scope" || coverage < 0.2 || top.p < 0.25) confidence = "lost";
  else if (top.p >= 0.55 && margin >= 0.2) confidence = "sure";
  else confidence = "unsure";
  return { ranked: ranked.filter((r) => r.intent !== "out-of-scope"), top, confidence, coverage };
}

/**
 * On-device learning: nudge the personal weights until `intent` wins for `text`.
 * personal = { weights: { feature: { intent: w } }, examples: n }  (stored in chrome.storage.local)
 */
export function learnExample(model, personal, text, intent, { rate = 1.5, maxSteps = 8 } = {}) {
  personal = personal && personal.weights ? personal : { weights: {}, examples: 0 };
  const target = model.intents.indexOf(intent);
  if (target < 0) return personal;
  const feats = featurize(text);
  for (let step = 0; step < maxSteps; step++) {
    const { scores } = scoresFor(model, feats, personal);
    const probs = softmax(scores);
    const best = probs.indexOf(Math.max(...probs));
    if (best === target && probs[target] >= 0.7) break;
    for (const f in feats) {
      const v = feats[f];
      const row = (personal.weights[f] = personal.weights[f] || {});
      // Gradient of the log-likelihood: raise the right topic, lower the most likely wrong ones.
      model.intents.forEach((k, i) => {
        const g = (i === target ? 1 : 0) - probs[i];
        if (i === target || probs[i] > 0.05) row[k] = Math.round(((row[k] || 0) + rate * g * v) * 1000) / 1000;
      });
    }
  }
  personal.examples = (personal.examples || 0) + 1;
  return personal;
}
