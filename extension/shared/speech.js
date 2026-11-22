// Read-aloud (Web Speech synthesis) and voice questions (Web Speech recognition).
import { getSettings } from "./settings.js";

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

export function speechSupported() { return !!synth; }

export function getVoices() {
  if (!synth) return Promise.resolve([]);
  const list = synth.getVoices();
  if (list.length) return Promise.resolve(list);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

/** Split text into sentence-sized chunks — short utterances are more reliable in Chrome. */
export function splitSentences(text) {
  return String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .flatMap((s) => (s.length > 260 ? s.match(/.{1,240}(\s|$)/g) : [s]))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A small reading controller: speak(), pause(), resume(), stop(), repeat().
 * onSentence(index, sentences) fires as each sentence starts (for highlighting).
 */
export function createReader({ onSentence, onEnd, onState } = {}) {
  let sentences = [];
  let index = 0;
  let state = "idle"; // idle | speaking | paused
  let opts = {};
  let token = 0;

  const setState = (s) => { state = s; onState && onState(s); };

  async function speakFrom(i) {
    if (!synth) return;
    const my = ++token;
    synth.cancel();
    const settings = await getSettings();
    const voices = await getVoices();
    const voice = voices.find((v) => v.name === (opts.voiceName ?? settings.voiceName));
    index = i;
    setState("speaking");
    const next = () => {
      if (my !== token) return;
      if (index >= sentences.length) { setState("idle"); onEnd && onEnd(); return; }
      const u = new SpeechSynthesisUtterance(sentences[index]);
      u.rate = opts.rate ?? settings.speechRate;
      u.volume = opts.volume ?? settings.speechVolume;
      u.lang = settings.language || "en-US";
      if (voice) u.voice = voice;
      u.onstart = () => onSentence && onSentence(index, sentences);
      u.onend = () => { if (my === token) { index++; next(); } };
      u.onerror = (e) => { if (my === token && e.error !== "interrupted" && e.error !== "canceled") { index++; next(); } };
      synth.speak(u);
    };
    next();
  }

  return {
    speak(text, o = {}) { opts = o; sentences = splitSentences(text); return speakFrom(0); },
    pause() { if (synth && state === "speaking") { synth.pause(); setState("paused"); } },
    resume() { if (synth && state === "paused") { synth.resume(); setState("speaking"); } },
    stop() { token++; synth && synth.cancel(); setState("idle"); },
    repeat() { return speakFrom(Math.max(0, index)); },
    restart() { return speakFrom(0); },
    setRate(r) { opts.rate = r; if (state === "speaking") speakFrom(index); },
    get state() { return state; },
    get sentences() { return sentences; },
  };
}

let shared;
/** Speak a short message once (used for "read this aloud" buttons). */
export function say(text) {
  shared = shared || createReader();
  return shared.speak(text);
}
export function stopSpeaking() { shared && shared.stop(); synth && synth.cancel(); }

// ---------- Voice questions ----------
const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export function listeningSupported() { return !!Recognition; }

/**
 * Listen for one spoken question. Resolves with the transcript.
 * Rejects with a friendly message the UI can show directly.
 */
export function listenOnce({ lang = "en-US", onInterim } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) {
      reject(new Error("Speaking your question isn't available in this browser. You can type it instead."));
      return;
    }
    const rec = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      onInterim && onInterim(finalText + interim);
    };
    rec.onerror = (e) => {
      const messages = {
        "not-allowed": "EasyAccess needs permission to use your microphone. When Chrome asks, choose \"Allow\". You can also type your question.",
        "service-not-allowed": "Voice questions are turned off on this computer. You can type your question instead.",
        "no-speech": "I didn't hear anything. Please try again, a little closer to the microphone.",
        "audio-capture": "I couldn't find a microphone. You can type your question instead.",
        network: "Voice questions need an internet connection. You can type your question instead.",
      };
      reject(new Error(messages[e.error] || "Sorry, I couldn't hear that. Please try again or type your question."));
    };
    rec.onend = () => resolve(finalText.trim());
    try { rec.start(); } catch (err) { reject(new Error("Voice questions couldn't start. Please type your question.")); }
  });
}
