import { html, toast, uid } from "../../shared/ui.js";
import { getValue, setValue } from "../../shared/storage.js";
import { SITES, SITE_CATEGORIES, CATEGORY_TIPS } from "../../data/sites.js";
import { on, ico } from "./common.js";

async function loadFavs() { return getValue("favorites", []); }
async function saveFavs(f) { return setValue("favorites", f); }

export default {
  title: "Find what I need",
  async render(el, ctx) {
    let favs = await loadFavs();
    let customSites = await getValue("customSites", []);
    const allSites = () => SITES.concat(customSites);

    const draw = () => {
      const isFav = (url) => favs.some((f) => f.url === url);
      el.innerHTML = String(html`
        ${ctx.pageHeader("Find what I need", "Important websites in one place. Government and health websites listed here are the official addresses. Click \"Open\" to visit, or the star to add it to your favourites.")}

        <section class="card">
          <h2>${ico("star")} My favourites</h2>
          ${favs.length ? html`<ul class="list-plain">
            ${favs.map((f, n) => html`<li class="site-item">
              <div><div class="site-name">${f.name}</div><div class="site-url">${f.url}</div></div>
              <div class="btn-row" style="margin:0">
                <a class="btn btn-primary" href="${f.url}" target="_blank" rel="noopener noreferrer">${ico("globe")} Open</a>
                <button type="button" class="btn" data-pin="${n}" aria-pressed="${String(!!f.pinned)}">${f.pinned ? "On home screen ✓" : "Show on home screen"}</button>
                <button type="button" class="btn" data-rename="${n}">${ico("edit")} Rename</button>
                <button type="button" class="btn" data-up="${n}" ${n === 0 ? "disabled" : ""} aria-label="Move ${f.name} up">↑ Up</button>
                <button type="button" class="btn" data-down="${n}" ${n === favs.length - 1 ? "disabled" : ""} aria-label="Move ${f.name} down">↓ Down</button>
                <button type="button" class="btn btn-quiet" data-unfav="${f.url}" aria-label="Remove ${f.name} from favourites">${ico("trash")} Remove</button>
              </div></li>`)}
          </ul>` : html`<p>No favourites yet. Click "Add to favourites" next to any website below.</p>`}
        </section>

        <details class="card" id="add-box">
          <summary><strong>${ico("plus")} Add a website of my own</strong> (like my bank, doctor or electricity company)</summary>
          <form id="add" style="margin-top:1rem">
            <div class="notice"><strong>Safety tip:</strong> copy the address from your bank card, a paper statement or bill — never from an email or text message.</div>
            <div class="field"><label for="add-name">Name</label><input id="add-name" type="text" placeholder="For example: My bank" required></div>
            <div class="field"><label for="add-url">Website address</label><input id="add-url" type="text" inputmode="url" placeholder="For example: www.mybank.com" required spellcheck="false"></div>
            <div class="field"><label for="add-cat">Category</label><select id="add-cat">${SITE_CATEGORIES.map((c) => html`<option value="${c.id}" ${c.id === "mine" ? "selected" : ""}>${c.title}</option>`)}</select></div>
            <p id="add-msg" role="status"></p>
            <button type="submit" class="btn btn-primary">${ico("plus")} Add this website</button>
          </form>
        </details>

        <label for="find">Search the list</label>
        <input id="find" type="search" placeholder="For example: Medicare, weather, taxes" style="max-width:32rem">

        ${SITE_CATEGORIES.map((c) => {
          const items = allSites().filter((s) => s.cat === c.id);
          if (!items.length && !CATEGORY_TIPS[c.id]) return "";
          return html`<section class="card" data-cat style="margin-top:1rem">
            <h2>${ico(c.icon)} ${c.title}</h2>
            ${CATEGORY_TIPS[c.id] ? html`<p class="muted">${CATEGORY_TIPS[c.id]}</p>` : ""}
            <ul class="list-plain">${items.map((s) => html`<li class="site-item" data-search="${(s.name + " " + s.url + " " + c.title).toLowerCase()}">
              <div><div class="site-name">${s.name} ${s.verified ? html`<span class="badge" title="Official address checked by EasyAccess">Official</span>` : ""}</div><div class="site-url">${s.url}</div></div>
              <div class="btn-row" style="margin:0">
                <a class="btn btn-primary" href="${s.url}" target="_blank" rel="noopener noreferrer">${ico("globe")} Open</a>
                ${isFav(s.url)
                  ? html`<button type="button" class="btn" data-unfav="${s.url}">${ico("star")} In favourites ✓</button>`
                  : html`<button type="button" class="btn" data-fav="${s.url}">${ico("star")} Add to favourites</button>`}
                ${s.custom ? html`<button type="button" class="btn btn-quiet" data-delsite="${s.id}">${ico("trash")} Delete</button>` : ""}
              </div></li>`)}</ul>
          </section>`;
        })}
        <p class="muted">Company websites (like shops and email) are listed for convenience. Listing doesn't mean EasyAccess endorses them.</p>`);
    };
    draw();

    const persist = async () => { await saveFavs(favs); draw(); };
    on(el, "click", "[data-fav]", async (e, b) => {
      const s = allSites().find((x) => x.url === b.dataset.fav);
      favs.push({ name: s.name.split(" — ")[0], url: s.url, pinned: favs.filter((f) => f.pinned).length < 8 });
      await persist(); toast(`${s.name.split(" — ")[0]} was added to your favourites.`);
    });
    on(el, "click", "[data-unfav]", async (e, b) => { favs = favs.filter((f) => f.url !== b.dataset.unfav); await persist(); toast("Removed from favourites."); });
    on(el, "click", "[data-pin]", async (e, b) => { const f = favs[+b.dataset.pin]; f.pinned = !f.pinned; await persist(); });
    on(el, "click", "[data-up]", async (e, b) => { const n = +b.dataset.up; [favs[n - 1], favs[n]] = [favs[n], favs[n - 1]]; await persist(); });
    on(el, "click", "[data-down]", async (e, b) => { const n = +b.dataset.down; [favs[n + 1], favs[n]] = [favs[n], favs[n + 1]]; await persist(); });
    on(el, "click", "[data-rename]", async (e, b) => {
      const f = favs[+b.dataset.rename];
      const name = prompt("What would you like to call this website?", f.name);
      if (name && name.trim()) { f.name = name.trim().slice(0, 60); await persist(); }
    });
    on(el, "click", "[data-delsite]", async (e, b) => {
      const s = customSites.find((x) => x.id === b.dataset.delsite);
      if (!s || !confirm(`Delete "${s.name}" from your list?`)) return;
      customSites = customSites.filter((x) => x !== s);
      favs = favs.filter((f) => f.url !== s.url);
      await setValue("customSites", customSites);
      await persist();
    });
    on(el, "submit", "#add", async (e) => {
      e.preventDefault();
      const name = el.querySelector("#add-name").value.trim();
      let url = el.querySelector("#add-url").value.trim();
      const msg = el.querySelector("#add-msg");
      const check = window.EasyAccessEngine.analyzeUrl(url);
      if (!check.valid || !check.href || !/^https?:/.test(check.href)) { msg.textContent = "That doesn't look like a website address. It should look like www.example.com."; return; }
      if (check.level === "red") { msg.textContent = "I won't add this address because it has serious warning signs: " + check.reasons[0].text; return; }
      if (check.level === "yellow" && !confirm("Be careful — this address has a warning sign:\n\n" + check.reasons[0].text + "\n\nAdd it anyway?")) return;
      url = check.href.replace(/^http:\/\//, "https://");
      customSites.push({ id: uid(), cat: el.querySelector("#add-cat").value, name: name.slice(0, 60), url, custom: true });
      favs.push({ name: name.slice(0, 60), url, pinned: favs.filter((f) => f.pinned).length < 8 });
      await setValue("customSites", customSites);
      await persist();
      toast(`${name} was added to your list and your favourites.`);
    });
    on(el, "input", "#find", (e, input) => {
      const q = input.value.toLowerCase().trim();
      el.querySelectorAll("[data-cat]").forEach((sec) => {
        let shown = 0;
        sec.querySelectorAll("[data-search]").forEach((li) => { const m = !q || li.dataset.search.includes(q); li.hidden = !m; if (m) shown++; });
        sec.hidden = q && !shown;
      });
    });
  },
};
