/*
 * Turns a page snapshot (from shared/page-snapshot.js) into a plain-English explanation.
 * Works without any AI service. Depends on EasyAccessEngine (scam-engine.js).
 */
(function (root) {
  "use strict";
  const E = root.EasyAccessEngine || (typeof require === "function" ? require("./scam-engine.js") : null);

  // What common buttons mean. risky: could spend money, share data, install something or delete.
  const BUTTONS = [
    { re: /^(accept( all)?( cookies)?|allow (all )?cookies|i accept|got it|agree( and close)?|ok(ay)?, ?got it)$/i, meaning: "Agrees to let the website use \"cookies\" (small files that remember you and track your visits). This is optional — choosing \"Reject\", \"Necessary only\" or closing the message is also fine.", optional: true },
    { re: /(reject( all)?|necessary only|essential only|decline|manage (cookies|preferences|options)|cookie settings)/i, meaning: "Limits how much the website tracks you. Choosing this is safe.", optional: true },
    { re: /^(sign ?in|log ?in|login|sign on|log on)$/i, meaning: "Opens the place to type your username and password. Only do this if you went to this website yourself and the address is correct." },
    { re: /(sign ?up|register|create (an )?account|join( now| free)?|get started)/i, meaning: "Creates a new account on this website. You'll usually be asked for your email and a new password. Optional unless you need this service.", optional: true },
    { re: /(download|save file|get the (app|file))/i, meaning: "Saves a file onto your computer. It will usually appear in your \"Downloads\" folder. Only download things from websites you trust." },
    { re: /(buy now|purchase|place (your )?order|complete (purchase|order)|pay( now)?|checkout|check out|proceed to (checkout|payment)|confirm (payment|purchase)|donate|subscribe and pay|start (free )?trial)/i, meaning: "Spends money or starts a payment. Check the price, the website address and what you're agreeing to before clicking.", risky: true },
    { re: /(add to (cart|basket|bag)|add to order)/i, meaning: "Puts the item in your shopping basket. It does NOT pay yet — you can still remove it later." },
    { re: /(allow( notifications)?|turn on notifications|enable notifications|yes,? notify me)/i, meaning: "Lets this website send pop-up messages to your computer even when you're not on it. Usually it's best to say \"Block\" or \"No thanks\".", optional: true, risky: true },
    { re: /(block|no,? thanks|not now|maybe later|skip|dismiss)/i, meaning: "Says no to the offer or message. This is safe and usually the right choice for pop-ups you didn't expect.", optional: true },
    { re: /(install|run|scan now|clean (now|your pc)|fix (now|errors)|update now|repair|remove (virus|threats)|activate (protection|now))/i, meaning: "Asks to install or run a program. Never click this on a website that warned you about a virus — real virus warnings come from your own computer's security program, not from websites.", risky: true },
    { re: /(call( now| us| support)?|contact support|speak to (an )?(agent|technician))/i, meaning: "Asks you to phone someone. Be very careful: only call numbers you have checked yourself on an official website or your card/statement.", risky: true },
    { re: /^(submit|send|apply|confirm|continue|next|proceed|save( changes)?|done|finish)$/i, meaning: "Sends what you have typed, or moves to the next step. Check what you entered before clicking." },
    { re: /^(cancel|close|x|×|✕|back|go back|exit)$/i, meaning: "Closes this box or goes back without doing anything. This is safe.", optional: true },
    { re: /(delete|remove|erase|discard|clear all)/i, meaning: "Deletes something. Make sure it's what you want — deleted things may not come back.", risky: true },
    { re: /(i agree|accept (the )?terms|agree to (the )?terms|accept and continue)/i, meaning: "Agrees to the website's rules (terms and conditions). It's normal on trusted sites, but you can read the terms first." },
    { re: /^(search|go|find)$/i, meaning: "Searches for what you typed in the search box." },
    { re: /(menu|☰|more options|navigation)/i, meaning: "Opens a list of the website's sections — like a table of contents.", optional: true },
    { re: /(share|send to a friend)/i, meaning: "Lets you send this page to someone else by email or social media. Optional.", optional: true },
    { re: /^print/i, meaning: "Prints this page or document on your printer.", optional: true },
    { re: /(learn more|read more|details|more info|see more|view more|show more)/i, meaning: "Shows more information. It's safe and doesn't commit you to anything.", optional: true },
    { re: /(verify|confirm (your )?(identity|account)|unlock (your )?account|restore (access|account))/i, meaning: "Asks you to prove who you are. This is normal on real websites you logged into yourself, but scam pages use it to steal passwords. Check the address carefully.", risky: true },
    { re: /unsubscribe/i, meaning: "Stops a company from sending you emails. On a trusted company's email it's fine; on suspicious emails it's better to just delete them.", optional: true },
    { re: /^(reply|reply all|forward|compose|new message|write)$/i, meaning: "Starts writing an email. Nothing is sent until you press \"Send\"." },
    { re: /(chat|live chat|message us)/i, meaning: "Opens a chat window to type messages with the company. Never type passwords or full card numbers in a chat.", optional: true },
    { re: /(watch|play)/i, meaning: "Starts playing a video or sound.", optional: true },
    { re: /(upload|attach|choose file|browse)/i, meaning: "Lets you pick a file from your computer to send to this website. Only upload documents to websites you trust." },
  ];

  function explainButton(text) {
    for (const b of BUTTONS) if (b.re.test(text.trim())) return { text, meaning: b.meaning, risky: !!b.risky, optional: !!b.optional };
    return null;
  }

  const KIND_WORDS = {
    password: "a password", card: "credit or debit card details", ssn: "a Social Security number", code: "a security code (like one sent to your phone)",
    email: "your email address", phone: "your phone number", dob: "your date of birth", address: "your home address", name: "your name",
    search: "something to search for", file: "a file from your computer", checkbox: "some tick boxes", radio: "a choice between options", choice: "a choice from a list", text: "some typed information",
  };

  function pageKind(s, a) {
    const t = ((s.title || "") + " " + (s.headings || []).map((h) => h.text).join(" ") + " " + (s.url || "")).toLowerCase();
    if (a && a.fakeAlert) return "fake-alert";
    if (a && a.asks.payment) return "payment";
    if (a && a.asks.password) return "login";
    if (/(404|not found|page can.?t be found|error|something went wrong|access denied|this site can.?t be reached)/.test(t)) return "error";
    if ((s.downloads || []).length && /download/.test(t)) return "download";
    if (/mail\.google|outlook\.(live|office)|mail\.yahoo|inbox/.test(t)) return "email";
    if (/(cart|basket|checkout|shop|store|product)/.test(t)) return "shopping";
    if (/(zoom\.us|meet\.google|teams\.microsoft|join (a )?meeting|video call)/.test(t)) return "video";
    if ((s.forms || []).some((f) => f.fields.length >= 3)) return "form";
    if (/(google\.|bing\.com|duckduckgo|search)/.test(t) && (s.url || "").includes("q=")) return "search";
    if (/(news|article|story)/.test(t) || (s.text || "").length > 3000) return "article";
    return "general";
  }

  const KIND_TEXT = {
    "fake-alert": "This page shows a warning message that looks like a FAKE virus or security alert.",
    payment: "This is a payment page. It asks for card or payment details.",
    login: "This is a sign-in page. It asks for your username or email and a password.",
    error: "This page shows an error. The website couldn't show what was asked for.",
    download: "This is a download page, where you can save a file to your computer.",
    email: "This is your email (inbox) page.",
    shopping: "This is a shopping page.",
    video: "This is a video calling or meeting page.",
    form: "This page has a form to fill in.",
    search: "These are search results — a list of websites that match what was searched for.",
    article: "This is a page for reading — like an article or information page.",
    general: "This is an information page.",
  };

  const NEXT_STEPS = {
    "fake-alert": ["Do NOT call any phone number shown on the page.", "Do not click buttons on the page, even \"OK\" or \"Close\".", "Close the tab: press Ctrl+W (Windows) or Command+W (Mac). If it won't close, hold down the power button to turn the computer off, wait a moment, then turn it back on.", "Your computer is most likely fine — this is a web page pretending to be a warning."],
    payment: ["Check the website address is the real company you meant to buy from.", "Check the price and what you're buying.", "Only enter card details if you came here yourself (not from an unexpected email or text)."],
    login: ["Make sure the website address is exactly right for the company (for example \"paypal.com\" — not \"paypal-secure-login.com\").", "If you got here by clicking a link in an email or text message, it's safer to close this page and type the company's address yourself.", "Your browser's password manager can fill in your saved password — it only offers it on the real website."],
    error: ["Try pressing the \"Reload\" button (the circular arrow at the top left), or press F5.", "Check your internet connection is working.", "If you typed the address yourself, check the spelling."],
    download: ["Look for a button that says \"Download\" — it's usually large and colourful.", "Ignore flashing adverts that also say \"Download\" or \"Start\" — they're often fake.", "After downloading, the file will usually be in your \"Downloads\" folder."],
    email: ["Click on an email in the list to open and read it.", "Before clicking links in an email, you can ask EasyAccess \"Is this email safe?\"."],
    shopping: ["Add the item to your basket, then choose \"Checkout\" when you're ready to pay.", "Check the website address and reviews before buying from a shop you haven't used before."],
    video: ["Look for a \"Join\" button.", "When asked, allow the microphone and camera so the other people can hear and see you."],
    form: ["Fill in each box from top to bottom. Boxes marked with a star (*) are required.", "Press the button at the bottom (often \"Submit\" or \"Continue\") when finished."],
    search: ["Click a blue title to open that website.", "Results marked \"Sponsored\" or \"Ad\" are adverts — they're not always trustworthy."],
    article: ["Scroll down with your mouse wheel or the arrow keys to keep reading.", "You can ask EasyAccess to read this page to you."],
    general: ["Scroll down to see more.", "Click underlined words or buttons to go to other pages."],
  };

  /**
   * explainPage(snapshot) → { kind, intro, site, asks[], buttons[], nextSteps[], warnings[], analysis, speech }
   */
  function explainPage(s) {
    s = s || {};
    const a = E.analyzePage(s);
    const kind = pageKind(s, a);
    const host = s.host || a.url.host || "";
    const brand = a.url.official ? E.brandName(a.url.official) : "";
    let site;
    if (!host) site = "I couldn't tell which website this is.";
    else if (brand) site = `You are on ${brand}'s website (${E.registrableDomain(host)}). The address matches ${brand}'s real website.`;
    else site = `You are on the website "${E.registrableDomain(host)}"${s.siteName ? ` (it calls itself "${s.siteName}")` : ""}.`;

    const main = (s.headings || []).find((h) => h.level === 1) || (s.headings || [])[0];
    const about = main ? `The main heading says: "${main.text}".` : s.title ? `The page title is: "${s.title}".` : "";

    // What it's asking for
    const asks = [];
    const kinds = new Set();
    (s.forms || []).forEach((f) => f.fields.forEach((x) => kinds.add(x.kind)));
    ["password", "card", "ssn", "code", "dob", "address", "phone", "email", "name", "file", "search"].forEach((k) => {
      if (kinds.has(k)) asks.push({ kind: k, text: `It asks for ${KIND_WORDS[k]}.`, sensitive: ["password", "card", "ssn", "code"].includes(k) });
    });
    if ((s.dialogs || []).length) asks.push({ kind: "popup", text: `A pop-up box is showing: "${s.dialogs[0].text.slice(0, 160)}${s.dialogs[0].text.length > 160 ? "…" : ""}"` });
    if (s.overlay && typeof s.overlay === "string" && !(s.dialogs || []).length) asks.push({ kind: "overlay", text: `Something is covering most of the page: "${s.overlay.slice(0, 160)}"` });
    (s.alerts || []).slice(0, 2).forEach((t) => asks.push({ kind: "alert", text: `There's a message on the page: "${t.slice(0, 160)}"` }));

    // Buttons
    const buttons = [];
    (s.buttons || []).forEach((b) => {
      const e = explainButton(b.text);
      if (e) buttons.push(Object.assign({ onScreen: b.onScreen }, e));
    });
    if (a.fakeAlert) buttons.forEach((b) => { b.risky = true; b.meaning = "On this fake warning page, don't click any buttons — close the tab instead. " + (b.meaning || ""); });

    // Warnings (plain language)
    const warnings = a.reasons.slice(0, 6).map((r) => r.text);

    const nextSteps = NEXT_STEPS[kind].slice();
    if (a.level === "red" && kind !== "fake-alert") nextSteps.unshift("This page has serious warning signs. It's safest not to type anything or click anything here. Close this tab.");

    const verdictWord = { green: "I didn't see obvious warning signs on this page.", yellow: "Be careful on this page — some things need checking.", red: "Warning: this page has serious warning signs." }[a.level];

    const safeToEnter = a.level === "green" && (brand || s.secure)
      ? "I didn't see warning signs, and the connection is secure. If you came here yourself (not from an unexpected message), it's reasonable to continue — but no check can promise a website is safe."
      : a.level === "red"
        ? "No. Please don't enter your information here."
        : "I'm not sure. Before typing personal information, check the address carefully, or close this page and go to the company's website by typing its address yourself.";

    const speechParts = [KIND_TEXT[kind], site, about, verdictWord, asks.map((x) => x.text).join(" "), "Here is what to do: " + nextSteps.slice(0, 2).join(" ")];

    return {
      kind, kindText: KIND_TEXT[kind], site, about, asks, buttons: buttons.slice(0, 12), nextSteps, warnings,
      verdict: a.level, verdictText: verdictWord, analysis: a, safeToEnter,
      speech: speechParts.filter(Boolean).join(" "),
    };
  }

  const api = { explainPage, explainButton, pageKind };
  root.EasyAccessExplainer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
