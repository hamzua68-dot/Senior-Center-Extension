import { getValue, setValue, onChanged } from "./storage.js";

export const DEFAULT_SETTINGS = Object.freeze({
  textSize: "medium",          // small | medium | large | xlarge
  theme: "light",              // light | dark | contrast
  reduceMotion: false,
  simpleMode: false,
  voiceAnswers: false,         // speak the assistant's answers aloud
  speechRate: 0.9,             // 0.5 – 1.5
  speechVolume: 1,             // 0 – 1
  voiceName: "",               // "" = browser default
  language: "en-US",
  protectionEnabled: false,    // link guard + fake alert detector on every site (needs optional permission)
  aiServerUrl: "",             // e.g. https://easyaccess.example.org  (empty = AI features off)
  aiAccessCode: "",            // optional shared code the backend may require
  aiConsent: false,            // person agreed that text they choose may be sent to the AI service
  safeBrowsingViaServer: true, // ask the backend to check sites against threat lists (if configured)
  onboarded: false,
});

export async function getSettings() {
  const stored = await getValue("settings", {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await setValue("settings", next);
  return next;
}

/** Reflect visual settings onto <html> so base.css can react. */
export function applySettings(settings, doc = document) {
  const root = doc.documentElement;
  root.dataset.textSize = settings.textSize;
  root.dataset.theme = settings.theme;
  root.dataset.reduceMotion = String(!!settings.reduceMotion);
  root.lang = (settings.language || "en-US").split("-")[0];
}

/** Apply now and keep in sync when settings change in another window. */
export async function initSettings(onChange) {
  const s = await getSettings();
  applySettings(s);
  onChanged((changes, areaName) => {
    if (areaName === "local" && changes.settings) {
      const next = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };
      applySettings(next);
      onChange && onChange(next);
    }
  });
  return s;
}

export const TEXT_SIZES = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
  { id: "xlarge", label: "Extra large" },
];

export function biggerTextSize(current) {
  const order = TEXT_SIZES.map((t) => t.id);
  const i = order.indexOf(current);
  return order[Math.min(order.length - 1, i + 1)];
}
