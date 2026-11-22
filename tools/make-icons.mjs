// Renders the EasyAccess icon (SVG) to PNGs at the sizes Chrome needs.  Usage: node tools/make-icons.mjs
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="4" y="4" width="120" height="120" rx="28" fill="#1d4e89"/>
  <path d="M64 18 L102 32 V62 C102 88 84 104 64 112 C44 104 26 88 26 62 V32 Z" fill="#ffffff"/>
  <path d="M64 92 C64 92 40 77 40 61 C40 52 47 46 54 46 C58.5 46 62 48.5 64 52 C66 48.5 69.5 46 74 46 C81 46 88 52 88 61 C88 77 64 92 64 92 Z" fill="#c4561a"/>
</svg>`;
writeFileSync(new URL("../extension/icons/icon.svg", import.meta.url), svg);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../extension/icons/icon${size}.png`, import.meta.url).pathname, omitBackground: true });
}
await browser.close();
console.log("icons written");
