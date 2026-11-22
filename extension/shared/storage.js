// Thin promise wrapper around chrome.storage with a localStorage fallback
// (the fallback lets the dashboard be opened as a plain page during development).

const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

function area(name) {
  if (hasChrome && chrome.storage[name]) return chrome.storage[name];
  const prefix = `easyaccess.${name}.`;
  return {
    async get(keys) {
      const out = {};
      const list = keys == null ? Object.keys(localStorage).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length))
        : Array.isArray(keys) ? keys : typeof keys === "string" ? [keys] : Object.keys(keys);
      for (const k of list) {
        const raw = localStorage.getItem(prefix + k);
        if (raw != null) out[k] = JSON.parse(raw);
        else if (keys && typeof keys === "object" && !Array.isArray(keys)) out[k] = keys[k];
      }
      return out;
    },
    async set(obj) { for (const [k, v] of Object.entries(obj)) localStorage.setItem(prefix + k, JSON.stringify(v)); },
    async remove(keys) { for (const k of [].concat(keys)) localStorage.removeItem(prefix + k); },
    async clear() { Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k)); },
  };
}

export const local = area("local");
export const session = area("session");

export async function getValue(key, fallback, store = local) {
  const res = await store.get({ [key]: fallback });
  return res[key] === undefined ? fallback : res[key];
}

export async function setValue(key, value, store = local) {
  await store.set({ [key]: value });
}

export function onChanged(callback) {
  if (hasChrome && chrome.storage.onChanged) chrome.storage.onChanged.addListener(callback);
}

/** Erase everything EasyAccess has stored on this computer. */
export async function eraseAll() {
  await local.clear();
  await session.clear();
}
