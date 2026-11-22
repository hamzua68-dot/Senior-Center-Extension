/*
 * EasyAccess scam engine — local, rule-based analysis of links, messages and pages.
 *
 * Runs everywhere: extension pages (window.EasyAccessEngine), content scripts,
 * the service worker (importScripts) and Node tests (module.exports).
 *
 * IMPORTANT: these are warning signs, not proof. A "green" result means
 * "no obvious warning signs found" — never "guaranteed safe".
 */
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- data
  // Brand → official registrable domains. Used to spot look-alike addresses.
  const BRANDS = {
    paypal: ["paypal.com", "paypal.me"],
    amazon: ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.de", "amazon.com.au", "amazon.in", "amazon.fr", "amazon.es", "amazon.it", "amazon.co.jp", "amazon.com.mx", "a.co", "amzn.to", "amazonaws.com"],
    apple: ["apple.com", "icloud.com", "me.com"],
    microsoft: ["microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com", "office365.com", "windows.com", "hotmail.com", "msn.com", "bing.com", "xbox.com", "skype.com", "sharepoint.com", "onedrive.com"],
    google: ["google.com", "gmail.com", "youtube.com", "google.co.uk", "googleusercontent.com", "gstatic.com", "goo.gl", "g.co", "android.com", "blogger.com"],
    facebook: ["facebook.com", "fb.com", "messenger.com", "meta.com", "instagram.com", "whatsapp.com", "whatsapp.net"],
    netflix: ["netflix.com"],
    chase: ["chase.com", "jpmorganchase.com", "jpmorgan.com"],
    wellsfargo: ["wellsfargo.com"],
    bankofamerica: ["bankofamerica.com", "bofa.com"],
    citibank: ["citi.com", "citibank.com"],
    usbank: ["usbank.com"],
    capitalone: ["capitalone.com"],
    americanexpress: ["americanexpress.com", "aexp.com"],
    discover: ["discover.com"],
    venmo: ["venmo.com"],
    zelle: ["zellepay.com"],
    cashapp: ["cash.app", "squareup.com"],
    coinbase: ["coinbase.com"],
    ebay: ["ebay.com", "ebay.co.uk"],
    walmart: ["walmart.com"],
    target: ["target.com"],
    costco: ["costco.com"],
    bestbuy: ["bestbuy.com"],
    geeksquad: ["geeksquad.com", "bestbuy.com"],
    norton: ["norton.com", "nortonlifelock.com", "gen.digital"],
    mcafee: ["mcafee.com"],
    usps: ["usps.com", "usps.gov"],
    fedex: ["fedex.com"],
    ups: ["ups.com"],
    dhl: ["dhl.com"],
    irs: ["irs.gov"],
    ssa: ["ssa.gov"],
    socialsecurity: ["ssa.gov"],
    medicare: ["medicare.gov", "cms.gov"],
    dropbox: ["dropbox.com"],
    docusign: ["docusign.com", "docusign.net"],
    linkedin: ["linkedin.com"],
    yahoo: ["yahoo.com"],
    aol: ["aol.com"],
    verizon: ["verizon.com"],
    att: ["att.com"],
    tmobile: ["t-mobile.com"],
    comcast: ["comcast.com", "xfinity.com", "comcast.net"],
    xfinity: ["xfinity.com", "comcast.com", "comcast.net"],
    aarp: ["aarp.org"],
  };
  // Brands whose names are common English words — only flag if exact-name lookalike, not substrings.
  const WORD_BRANDS = new Set(["target", "discover", "apple", "chase", "ups", "att", "dhl", "irs", "ssa", "aol"]);

  const FREE_MAIL = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "live.com", "msn.com", "proton.me", "protonmail.com", "gmx.com", "mail.com", "yandex.com", "zoho.com", "comcast.net", "att.net", "verizon.net", "me.com", "mail.ru"];

  const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc", "t.ly", "s.id", "lnkd.in", "qrco.de", "bl.ink"];

  const RISKY_TLDS = ["zip", "mov", "top", "xyz", "click", "country", "gq", "tk", "ml", "cf", "ga", "work", "support", "rest", "loan", "men", "review", "kim", "cam", "quest", "sbs", "cfd", "icu", "buzz", "monster", "lol", "beauty", "hair", "bond", "today", "live", "online", "site", "info", "shop", "store", "vip", "win", "bid", "fit", "life", "best", "pw"];
  const VERY_RISKY_TLDS = ["zip", "mov", "tk", "ml", "cf", "ga", "gq"];

  // Public suffixes with two labels (a small, practical subset).
  const TWO_PART_SUFFIXES = ["co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "net.au", "org.au", "gov.au", "co.nz", "co.jp", "co.in", "com.mx", "com.br", "co.za", "com.sg", "com.hk", "co.kr", "com.tr", "com.cn", "gov.in", "gc.ca", "qc.ca", "on.ca"];

  const DANGEROUS_EXTENSIONS = ["exe", "scr", "msi", "bat", "cmd", "com", "pif", "vbs", "js", "jse", "wsf", "hta", "ps1", "jar", "apk", "dmg", "pkg", "iso", "img", "lnk", "reg", "docm", "xlsm", "pptm"];
  // As email attachments these can hide harmful content; as web addresses only archives are notable.
  const CAUTION_EXTENSIONS = ["zip", "rar", "7z", "html", "htm", "svg", "one", "xll"];
  const CAUTION_URL_EXTENSIONS = ["zip", "rar", "7z", "one", "xll"];

  const REMOTE_TOOLS = ["anydesk", "teamviewer", "ultraviewer", "logmein", "gotoassist", "goto resolve", "supremo", "screenconnect", "connectwise control", "rustdesk", "zoho assist", "splashtop", "ammyy", "remotepc", "quick assist"];

  // --------------------------------------------------------------- helpers
  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  // Replace common character swaps (0→o, 1→l, rn→m, vv→w) to catch disguised names.
  function deconfuse(s) {
    return s.replace(/rn/g, "m").replace(/vv/g, "w").replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s").replace(/\$/g, "s").replace(/@/g, "a");
  }

  function registrableDomain(host) {
    host = String(host || "").toLowerCase().replace(/\.$/, "");
    if (isIp(host)) return host;
    const parts = host.split(".");
    if (parts.length <= 2) return host;
    const lastTwo = parts.slice(-2).join(".");
    if (TWO_PART_SUFFIXES.includes(lastTwo)) return parts.slice(-3).join(".");
    return lastTwo;
  }

  function isIp(host) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[?[0-9a-f:]+\]?$/i.test(host) && host.includes(":");
  }

  function isPrivateHost(host) {
    return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "[::1]";
  }

  function hostMatches(host, domain) {
    host = host.toLowerCase();
    return host === domain || host.endsWith("." + domain);
  }

  function officialBrandFor(host) {
    for (const [brand, domains] of Object.entries(BRANDS)) {
      if (domains.some((d) => hostMatches(host, d))) return brand;
    }
    return null;
  }

  function parseUrl(input) {
    let s = String(input || "").trim();
    if (!s) return null;
    // Undo common "defanging" so pasted warnings can still be analysed (we never visit them).
    s = s.replace(/^hxxp/i, "http").replace(/\[\.\]/g, ".").replace(/\(\.\)/g, ".").replace(/\[:\]/g, ":");
    if (/^(javascript|data|vbscript|file):/i.test(s)) return { scheme: s.split(":")[0].toLowerCase(), href: s, special: true };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "http://" + s;
    try {
      const u = new URL(s);
      return { scheme: u.protocol.replace(":", ""), href: u.href, url: u };
    } catch (e) {
      return null;
    }
  }

  function friendlySiteName(host) {
    const brand = officialBrandFor(host);
    if (brand) return brand;
    return registrableDomain(host);
  }

  // ---------------------------------------------------------- URL analysis
  /**
   * analyzeUrl("http://paypa1-secure.com/login") →
   * { level: "red", score, reasons: [{text, weight}], host, domain, official, strong }
   */
  function analyzeUrl(input, context) {
    context = context || {};
    const parsed = parseUrl(input);
    const reasons = [];
    const add = (weight, text, strong) => reasons.push({ weight, text, strong: !!strong });

    if (!parsed) {
      return { level: "yellow", score: 2, reasons: [{ weight: 2, text: "This doesn't look like a normal website address, so I can't check it properly." }], host: "", domain: "", official: null, valid: false };
    }
    if (parsed.special) {
      add(8, "This is not a normal website link. Links like this can run hidden commands. Do not open it.", true);
      return finish({ host: "", domain: "", official: null, valid: true, href: parsed.href });
    }

    const u = parsed.url;
    const host = u.hostname.toLowerCase();
    const domain = registrableDomain(host);
    const official = officialBrandFor(host);
    const tld = host.split(".").pop();
    const label = domain.split(".")[0];
    const full = (host + u.pathname + u.search).toLowerCase();

    if (!["http", "https"].includes(parsed.scheme)) {
      add(3, `This link uses an unusual type of address ("${parsed.scheme}:").`);
    }

    if (u.username || u.password || /@/.test(u.href.split("?")[0].replace(/^[a-z]+:\/\//i, "").split("/")[0])) {
      add(6, "The address contains an \"@\" symbol, a trick used to hide the real website you would be sent to.", true);
    }

    // Home routers and this computer (192.168.x.x, 10.x.x.x, localhost) are normal to visit.
    const local = isPrivateHost(host);
    if (isIp(host) && !local) {
      add(5, "The address is a string of numbers instead of a website name. Real companies almost never do this.", true);
    }

    if (host.includes("xn--")) {
      add(5, "The address uses special look-alike letters that can disguise a fake website as a real one.", true);
    }

    // Look-alike brand detection
    if (!official && !isIp(host)) {
      const labelPlain = deconfuse(label.replace(/-/g, ""));
      for (const brand of Object.keys(BRANDS)) {
        if (labelPlain === brand && !BRANDS[brand].includes(domain)) {
          add(6, `This address pretends to be ${titleCase(brand)}, but it is not ${titleCase(brand)}'s real website (${BRANDS[brand][0]}).`, true);
          break;
        }
        if (brand.length >= 5 && levenshtein(labelPlain, brand) <= (brand.length >= 8 ? 2 : 1)) {
          add(6, `"${domain}" looks like a misspelling of ${titleCase(brand)} (${BRANDS[brand][0]}). Scammers use addresses like this to trick people.`, true);
          break;
        }
        if (!WORD_BRANDS.has(brand) && brand.length >= 4 && labelPlain.includes(brand)) {
          add(5, `The address includes the name "${titleCase(brand)}", but it is not ${titleCase(brand)}'s real website (${BRANDS[brand][0]}).`, true);
          break;
        }
        // brand used in a subdomain: paypal.com.account-verify.net
        const sub = host.slice(0, Math.max(0, host.length - domain.length - 1));
        if (sub && (sub.split(/[.-]/).includes(brand) || sub.includes(brand + ".com")) && !WORD_BRANDS.has(brand)) {
          add(6, `The address starts with "${titleCase(brand)}" but actually belongs to "${domain}". This is a common trick.`, true);
          break;
        }
      }
    }

    if (SHORTENERS.includes(domain) || SHORTENERS.includes(host)) {
      add(2, "This is a shortened link, so you can't see where it really goes. Be careful with shortened links in unexpected messages.");
    }

    if (VERY_RISKY_TLDS.includes(tld)) add(3, `The address ends in ".${tld}", an ending very often used by scam websites.`);
    else if (RISKY_TLDS.includes(tld) && !official) add(1, `The address ends in ".${tld}", an ending that scam websites use often (many honest sites use it too).`);

    const subdomainCount = host.split(".").length - domain.split(".").length;
    if (subdomainCount >= 3) add(2, "The address has an unusually long chain of parts before the real website name.");

    const hyphens = (domain.match(/-/g) || []).length;
    if (hyphens >= 2) add(1, "The website name has several dashes, which scam websites often use (for example \"secure-account-update\").");

    if (!official && /(log-?in|sign-?in|verify|verification|secure|account|update|unlock|suspend|confirm|billing|wallet|refund|support|helpdesk|recover)/.test(label)) {
      add(2, `The website name contains the word "${label.match(/(log-?in|sign-?in|verify|verification|secure|account|update|unlock|suspend|confirm|billing|wallet|refund|support|helpdesk|recover)/)[0]}". Real companies rarely put words like this in their main address.`);
    }

    if (u.port && !["80", "443", ""].includes(u.port) && !local) add(2, "The link uses an unusual connection number (port), which normal websites don't need.");

    if (u.href.length > 180) add(1, "The link is extremely long, which can be used to hide where it goes.");

    const lastSeg = u.pathname.split("/").pop().toLowerCase();
    const ext = lastSeg.includes(".") ? lastSeg.split(".").pop() : "";
    if (DANGEROUS_EXTENSIONS.includes(ext)) add(5, `This link downloads a program file (".${ext}"). Programs from unexpected links can take over your computer.`, true);
    else if (CAUTION_URL_EXTENSIONS.includes(ext)) add(2, `This link downloads a ".${ext}" file. These are sometimes used to hide harmful files.`);

    if (parsed.scheme === "http" && !local && (context.hasPassword || context.hasPayment || /login|signin|password|account|pay|checkout|bank/.test(full))) {
      add(2, "This page is not using a secure connection (no \"https\"). Never type passwords or card numbers on pages like this.");
    }

    if (/(free-?gift|claim-?prize|winner|lottery|giveaway|bonus-?reward)/.test(full)) {
      add(2, "The address talks about prizes or free gifts — a common lure.");
    }

    return finish({ host, domain, official, valid: true, href: u.href });

    function finish(meta) {
      const score = reasons.reduce((n, r) => n + r.weight, 0);
      const strong = reasons.some((r) => r.strong);
      let level = score >= 5 || strong ? "red" : score >= 2 ? "yellow" : "green";
      reasons.sort((a, b) => b.weight - a.weight);
      return Object.assign({ level, score, strong, reasons, siteName: meta.host ? friendlySiteName(meta.host) : "" }, meta);
    }
  }

  function titleCase(brand) {
    const special = { paypal: "PayPal", wellsfargo: "Wells Fargo", bankofamerica: "Bank of America", usbank: "U.S. Bank", capitalone: "Capital One", americanexpress: "American Express", cashapp: "Cash App", ebay: "eBay", usps: "USPS", fedex: "FedEx", ups: "UPS", dhl: "DHL", irs: "the IRS", ssa: "Social Security", socialsecurity: "Social Security", geeksquad: "Geek Squad", bestbuy: "Best Buy", docusign: "DocuSign", linkedin: "LinkedIn", tmobile: "T-Mobile", att: "AT&T", aarp: "AARP", mcafee: "McAfee", aol: "AOL", citibank: "Citibank" };
    return special[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
  }

  // ------------------------------------------------------ message analysis
  // Each rule: id, category, weight, patterns (regex), explanation, advice. "strong" rules alone can make a message red.
  const RULES = [
    { id: "gift-card", cat: "Gift card payment", weight: 6, strong: true,
      re: /(gift ?cards?|itunes card|google play card|apple card|steam card|ebay card|target card|scratch (off )?the back|card numbers? (on|from) the back)/i,
      also: /(pay|buy|purchase|send|get|read|code|number|scratch|fee|bail)/i,
      why: "It asks for payment with gift cards. Real companies, government offices and banks never ask you to pay with gift cards.",
      advice: "Never buy gift cards because someone asked you to pay with them." },
    { id: "crypto-pay", cat: "Cryptocurrency payment", weight: 5, strong: true,
      re: /(bitcoin|crypto(currency)?|btc|usdt|tether|ethereum|crypto ?atm|bitcoin ?atm|wallet address|qr code to (pay|deposit))/i,
      also: /(pay|send|deposit|transfer|atm|fee|fine|protect|safe|move)/i,
      why: "It asks you to send money using cryptocurrency (like Bitcoin) or a Bitcoin machine. Scammers ask for this because it can't be reversed.",
      advice: "No real government agency, bank or business will ask you to pay with cryptocurrency or a Bitcoin ATM." },
    { id: "wire", cat: "Wire transfer request", weight: 3,
      re: /(wire (the )?(money|funds|transfer)|western union|moneygram|send (money|cash) (by|through|via)|cash in (an?|the) (envelope|box)|courier will (come|pick)|zelle (the|me|it)|cash ?app (me|the)|venmo me)/i,
      why: "It asks you to send money by wire, cash, courier or a payment app. Money sent this way is very hard to get back.",
      advice: "Don't send money to anyone you haven't verified in person or through a phone number you already trust." },
    { id: "credentials", cat: "Asks for passwords or codes", weight: 4, strong: true,
      re: /((confirm|verify|update|enter|provide|send|share|give|tell|read)( us| me)? (your )?(password|passcode|pin\b|pin number|login details|log-?in (information|details)|security code|verification code|one[- ]time (code|password)|6[- ]digit code|account number|routing number|card details|card number|cvv|full card))|(code (we|that was) (just )?sent to your phone)/i,
      why: "It asks for your password, PIN, account number or a security code. Real companies never ask you to send these.",
      advice: "Never share passwords, PINs or codes sent to your phone — not even with someone who says they are from your bank." },
    { id: "ssn", cat: "Asks for Social Security number", weight: 4, strong: true,
      re: /((confirm|verify|provide|send|enter|update|give|need) (us |me )?(your )?(full )?(social security( number)?|ssn|medicare (number|id)|date of birth and social))|(social security number (is|has been) (suspended|blocked|compromised))/i,
      why: "It asks for your Social Security or Medicare number, or says it has been \"suspended\". Social Security numbers cannot be suspended.",
      advice: "Never give your Social Security or Medicare number to someone who contacted you." },
    { id: "urgent", cat: "Pressure to act fast", weight: 2,
      re: /(urgent|immediately|right away|within (24|48|12|72) hours|act now|final (notice|warning|reminder)|last chance|expires? today|as soon as possible|time.?sensitive|don'?t delay|respond (now|today)|limited time|today only)/i,
      why: "It pressures you to act quickly. Scammers rush people so they don't have time to think or ask someone.",
      advice: "Slow down. A real company will give you time to check." },
    { id: "threat", cat: "Threats or account closure", weight: 3,
      re: /(account (will be|has been|is) (suspended|closed|locked|blocked|terminated|disabled|on hold|restricted|frozen)|(suspended|locked|blocked|limited) your account|unusual (sign-?in|activity)|suspicious activity (on|in) your|arrest(ed)?|warrant|legal action|lawsuit|police will|deported|criminal charges|your (service|power|electricity|water) will be (cut|disconnected|shut))/i,
      why: "It threatens that your account will be closed, or that you'll face police or legal trouble. Scary messages are a classic scam trick.",
      advice: "Don't use the links or phone numbers in the message. Contact the company using the number on your card, statement or their official website." },
    { id: "tech-support", cat: "Fake virus or tech support", weight: 4,
      re: /(your (computer|pc|device|mac|system|phone|iphone) (is|has been|was|may be) (infected|hacked|compromised|locked|blocked|at risk)|virus(es)? (detected|found)|(trojan|spyware|malware|pornographic) (detected|found|spyware)|call (microsoft|apple|windows|norton|mcafee|geek squad|amazon|tech) support|(microsoft|windows|apple) (security|support|technician)|do not (shut down|restart|turn off|close) (your|this)|error code:? ?#?0x|firewall (alert|breach)|license (has )?expired|helpdesk number|toll[- ]free support)/i,
      why: "It says your computer has a virus or asks you to call \"support\". Microsoft, Apple and Google never show warnings with phone numbers to call.",
      advice: "Do not call the number. Close the page (if it won't close, restart the computer). A real virus warning never asks you to phone someone." },
    { id: "remote", cat: "Asks for remote access", weight: 5, strong: true,
      re: new RegExp("(" + REMOTE_TOOLS.join("|") + "|remote (access|desktop|control|session)|give (us|me) access to your (computer|screen)|let me (connect|log ?in) to your|share your screen)", "i"),
      why: "It asks you to install a program that lets a stranger control your computer. This is how scammers steal money from bank accounts.",
      advice: "Never let anyone you don't know connect to your computer — even if they say they're from Microsoft, Apple, your bank or the government." },
    { id: "prize", cat: "Prize, lottery or inheritance", weight: 3,
      re: /(you('ve| have)? (won|been selected)|congratulations[!,.]? you|lottery|sweepstakes|jackpot|claim your (prize|reward|winnings|gift)|unclaimed (funds|inheritance|money)|inheritance|beneficiary|next of kin|processing fee|release (the|your) funds|publishers clearing|cash prize)/i,
      why: "It says you won a prize, lottery or inheritance. If you didn't enter, you didn't win — and real prizes never ask you to pay a fee.",
      advice: "Ignore prize messages that ask for fees, taxes or personal details." },
    { id: "delivery", cat: "Fake delivery notice", weight: 2,
      re: /((package|parcel|shipment|delivery) (could not|couldn'?t|was unable to|is on hold|failed|was not|has been (held|suspended|returned))|(redelivery|customs|shipping|delivery) fee|update (your )?(delivery|shipping) (address|details|information)|incomplete (address|delivery)|track(ing)? your (package|parcel) here)/i,
      why: "It says a delivery failed or asks for a small fee to redeliver. This is one of the most common text-message scams.",
      advice: "Check deliveries only by typing the company's website yourself (for example usps.com) and entering your tracking number." },
    { id: "government", cat: "Government impersonation", weight: 3,
      re: /((irs|internal revenue|social security administration|ssa|medicare|department of (justice|homeland)|fbi|federal trade commission|ftc|customs and border|treasury|sheriff|marshal)\b.{0,80}(owe|suspend|arrest|warrant|penalty|fine|refund|stimulus|benefit|card|verify|confirm|call|payment|deactivat))/i,
      why: "It claims to be from a government agency and talks about money, arrest or your benefits. Government agencies contact people by mail first and never demand immediate payment.",
      advice: "Hang up or ignore it. Contact the agency yourself using its official website (ending in .gov) or the number on official letters." },
    { id: "family-emergency", cat: "Family emergency / grandparent scam", weight: 4,
      re: /((hi |hey )?(grandma|grandpa|nana|granny|grandmother|grandfather|mom|mum|dad)\b.{0,120}(jail|arrest|accident|hospital|bail|lawyer|attorney|trouble|stuck|stranded|lost my (phone|wallet))|it'?s me,? your (grandson|granddaughter|son|daughter|nephew|niece)|(this is my|i have a|texting from a) new (number|phone)|please don'?t tell (mom|dad|anyone|my parents)|need (money|cash|help) (for|to pay) (bail|a lawyer|the hospital|a ticket))/i,
      why: "It sounds like a family member in trouble who needs money fast and wants it kept secret. Scammers pretend to be grandchildren — sometimes even using a copied voice.",
      advice: "Hang up and call your family member on the number you already have for them. Agree on a family \"safe word\" to check it's really them." },
    { id: "secrecy", cat: "Asks you to keep it secret", weight: 3,
      re: /(don'?t tell (anyone|your (bank|family|children|kids))|keep (this|it) (a )?(secret|between us|confidential)|do not (discuss|share) this with|bank (staff|employees|teller) (may be|are) (involved|in on it)|lie to the bank)/i,
      why: "It asks you to keep it secret or not tell your bank. Real organisations never ask this — scammers do, so nobody can warn you.",
      advice: "Always feel free to talk to family, a friend or your bank before doing anything." },
    { id: "romance", cat: "Romance or friendship scam signs", weight: 3,
      re: /(my (love|darling|dearest|soulmate)|soul ?mate|(deployed|stationed) (overseas|in)|oil rig|peace ?keeping mission|working (offshore|abroad) as (an? )?(engineer|doctor|contractor)|can'?t (video ?call|facetime|meet) (right now|yet)|customs (is|are) holding (my|the)|(plane|flight) ticket to (see|visit|meet) you|help me (with|pay) (the )?(customs|fees|ticket|medical bills))/i,
      why: "It has signs of a romance scam: strong affection quickly, someone who is always far away and can't video call, and money problems.",
      advice: "Never send money to someone you have only met online, however kind they seem. Talk to someone you trust about it." },
    { id: "investment", cat: "Too-good-to-be-true investment", weight: 3,
      re: /(guaranteed (returns?|profit|income)|risk[- ]free (investment|returns?)|double your (money|investment|bitcoin)|\d{2,3}% (return|profit|interest) (per|a|every) (week|month|day)|trading (platform|account) (expert|mentor)|investment (opportunity|mentor|advisor) (on )?whatsapp|pig butchering|crypto (mining|trading) (opportunity|platform))/i,
      why: "It promises guaranteed or very high investment returns. Real investments always carry risk, and \"guaranteed profit\" offers are a common trick.",
      advice: "Talk to a licensed financial advisor you already know before investing anything." },
    { id: "refund", cat: "Fake refund or overpayment", weight: 3,
      re: /((refund|reimbursement) (of|for) \$?\d|accidentally (sent|refunded|transferred) (you )?(too much|extra|\$)|overpaid|send (back|us back) the (difference|extra)|refund department|auto[- ]?renewal|has been renewed for \$|subscription (has been|will be) (renewed|charged)|charged \$\d{2,4}(\.\d\d)? (for|to)|call (us|now) to cancel)/i,
      why: "It talks about an unexpected charge, renewal or refund and asks you to call or act. Fake invoices (\"Your Geek Squad/Norton renewal of $399\") trick people into calling scammers.",
      advice: "Check your real bank or card statement by logging in yourself. Don't call numbers from unexpected invoices." },
    { id: "job", cat: "Job or work-from-home scam", weight: 2,
      re: /(work from home.{0,40}\$\d|earn \$\d[\d,]* (per|a) (week|day)|no experience (needed|required).{0,60}\$|mystery shopper|reshipping|package forwarding job|deposit (this|the) check and (send|buy|wire)|buy (equipment|supplies) with the check)/i,
      why: "It offers easy money for little work or asks you to deposit a check and send money back. Fake checks bounce days later, and you lose the money.",
      advice: "Never deposit a check from someone you don't know and send part of it back." },
    { id: "generic-greeting", cat: "Generic greeting", weight: 1,
      re: /^(\s*)(dear (valued )?(customer|client|user|member|account holder|sir\/madam|sir or madam|friend|beneficiary)|hello (customer|user|dear))/im,
      why: "It starts with a general greeting (\"Dear Customer\") instead of your name. Companies you do business with usually use your name.",
      advice: "Treat unexpected messages that don't use your name with extra caution." },
    { id: "click-link", cat: "Pushes you to click a link", weight: 1,
      re: /(click (here|the link|below|this link)|tap (here|the link)|follow the link|log ?in (here|now|below)|verify (here|now)|open the attached)/i,
      why: "It pushes you to click a link or open an attachment.",
      advice: "Instead of clicking, go to the company's website by typing the address yourself." },
    { id: "call-number", cat: "Asks you to call a number", weight: 1,
      re: /(call (us |now |immediately )?(at|on)?\s*\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|call (this|the) (number|toll[- ]free))/i,
      why: "It asks you to call a phone number in the message. Scammers put their own numbers in fake messages.",
      advice: "Call only numbers you find yourself — on your card, a statement, or the company's official website." },
    { id: "qr", cat: "QR code", weight: 1,
      re: /(scan (the|this) (qr|code)|qr code)/i,
      why: "It asks you to scan a QR code. QR codes can hide dangerous website addresses, just like links.",
      advice: "Only scan QR codes from sources you trust, and check the address that appears before opening it." },
    { id: "ai-voice", cat: "Voice or video impersonation", weight: 2,
      re: /(voice (message|note) from your (grandson|granddaughter|son|daughter)|video call.{0,40}(can'?t|cannot) (turn on|show) (my )?camera|sounds? (just )?like (my|your) (grandson|granddaughter|son|daughter|child))/i,
      why: "Scammers can now copy a person's voice or face using computer tools. A familiar voice is no longer proof of who's calling.",
      advice: "Hang up and call the person back on a number you already know. Use a family safe word." },
  ];

  const URL_RE = /\b((?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"'()]+|[a-z0-9.-]+\.(?:com|net|org|info|xyz|top|club|online|site|shop|live|click|link|io|co|us|uk|gov|biz|support|app|me|tk|ml|ga|cf|gq|zip|mov|icu|vip|ru|cn)(?:\/[^\s<>"'()]*)?)/gi;
  const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
  const ATTACH_RE = /\b[\w ()-]{1,60}\.(exe|scr|msi|bat|cmd|vbs|js|jar|apk|zip|rar|7z|html?|iso|img|docm|xlsm|pptm|lnk|one|pdf|docx?|xlsx?)\b/gi;

  function extractLinks(text) {
    const found = new Set();
    let m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      let link = m[1].replace(/[.,;:!?)\]]+$/, "");
      if (/@/.test(link) && !/^https?:/i.test(link)) continue; // email address, not a link
      found.add(link);
    }
    return Array.from(found).slice(0, 25);
  }

  function parseSender(sender) {
    // "PayPal Support <service@paypa1.com>" → { name, email, domain }
    const s = String(sender || "").trim();
    if (!s) return null;
    const m = s.match(/^(.*?)\s*<([^>]+)>$/);
    const email = (m ? m[2] : s).trim().toLowerCase();
    const name = (m ? m[1] : "").replace(/["']/g, "").trim();
    const domain = email.includes("@") ? email.split("@").pop() : "";
    return { name, email, domain };
  }

  function analyzeSender(sender) {
    const p = parseSender(sender);
    const reasons = [];
    if (!p || !p.domain) return { reasons, parsed: p };
    const nameLower = (p.name + " " + p.email.split("@")[0]).toLowerCase().replace(/[^a-z0-9 ]/g, " ");
    const domainBrand = officialBrandFor(p.domain);
    const free = FREE_MAIL.includes(p.domain);
    for (const brand of Object.keys(BRANDS)) {
      if (WORD_BRANDS.has(brand) && brand !== "irs") continue;
      const named = nameLower.split(/\s+/).includes(brand) || nameLower.replace(/\s+/g, "").includes(brand) && brand.length >= 5;
      if (named && domainBrand !== brand && !BRANDS[brand].some((d) => hostMatches(p.domain, d))) {
        if (free) reasons.push({ weight: 5, strong: true, text: `The sender's name says "${titleCase(brand)}", but the email really comes from a free personal account (${p.domain}). Real companies don't email from Gmail, Yahoo or similar.` });
        else reasons.push({ weight: 4, strong: true, text: `The sender's name says "${titleCase(brand)}", but the email address is from "${p.domain}", which is not ${titleCase(brand)}'s real address (${BRANDS[brand][0]}).` });
        break;
      }
    }
    if (!reasons.length && free && /(bank|support|security|service|billing|account|admin|team|department|irs|social security|medicare|microsoft|apple|amazon|paypal|geek squad|norton)/.test(nameLower)) {
      reasons.push({ weight: 3, text: `The sender calls itself "${p.name || p.email}" but uses a free personal email account (${p.domain}). Real organisations use their own email addresses.` });
    }
    const domainCheck = analyzeUrl("https://" + p.domain);
    domainCheck.reasons.filter((r) => r.weight >= 3).forEach((r) => reasons.push({ weight: r.weight, strong: r.strong, text: "Sender address: " + r.text }));
    return { reasons, parsed: p, official: domainBrand };
  }

  /**
   * analyzeMessage({ text, sender, subject, attachments: ["invoice.zip"] })
   * → { level, score, reasons, categories, links: [{url, level, reasons}], phones, attachments, advice, summary }
   */
  function analyzeMessage(input) {
    if (typeof input === "string") input = { text: input };
    const text = String(input.text || "");
    const subject = String(input.subject || "");
    const all = subject + "\n" + text;
    const reasons = [];
    const categories = [];
    const advice = [];

    for (const rule of RULES) {
      const m = all.match(rule.re);
      if (!m) continue;
      if (rule.also && !rule.also.test(all)) continue;
      reasons.push({ weight: rule.weight, strong: !!rule.strong, text: rule.why, id: rule.id, quote: m[0].trim().slice(0, 80) });
      categories.push(rule.cat);
      if (rule.advice) advice.push(rule.advice);
    }

    const phones = Array.from(new Set((all.match(PHONE_RE) || []).map((p) => p.trim()))).slice(0, 5);

    // Combinations that are especially telling
    const ids = new Set(reasons.map((r) => r.id));
    if (ids.has("tech-support") && (ids.has("call-number") || ids.has("remote") || phones.length)) {
      reasons.push({ weight: 3, strong: true, id: "combo-tech", text: "It combines a virus warning with a phone number or remote access request — the typical pattern of a tech-support scam." });
    }
    if (ids.has("threat") && ids.has("click-link")) {
      reasons.push({ weight: 2, id: "combo-phish", text: "It combines a threat to your account with a link to click — the typical pattern of a \"phishing\" email that steals passwords." });
    }

    const sender = input.sender ? analyzeSender(input.sender) : { reasons: [] };
    sender.reasons.forEach((r) => reasons.push(r));

    const links = extractLinks(all).map((url) => {
      const a = analyzeUrl(url);
      return { url, level: a.level, host: a.host, reasons: a.reasons, official: a.official };
    });
    // Real link destinations (e.g. from Gmail), including "text says one site, goes to another"
    (input.linkPairs || []).slice(0, 40).forEach((pair) => {
      const href = unwrapRedirect(pair.href || "");
      if (!/^https?:/i.test(href)) return;
      const a = analyzeUrl(href);
      if (!links.some((l) => l.url === href)) links.push({ url: href, level: a.level, host: a.host, reasons: a.reasons, official: a.official, text: pair.text });
      const shown = String(pair.text || "").trim().toLowerCase();
      const m = shown.match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/);
      if (m && a.host) {
        const shownDomain = registrableDomain(m[1]);
        if (shownDomain && shownDomain !== registrableDomain(a.host) && /\./.test(shownDomain)) {
          reasons.push({ weight: 5, strong: true, id: "link-disguise", text: `A link shows the address "${m[1]}", but it really goes to "${a.host}". This is a common trick to disguise dangerous links.` });
        }
      }
    });

    const worstLink = links.reduce((w, l) => (rank(l.level) > rank(w) ? l.level : w), "green");
    if (worstLink === "red") reasons.push({ weight: 5, strong: true, id: "bad-link", text: "One or more links in the message lead to a suspicious website (see the link details below)." });
    else if (worstLink === "yellow") reasons.push({ weight: 1, id: "odd-link", text: "Some links in the message need a closer look (see the link details below)." });

    // Link text says one brand, but goes elsewhere (e.g. "Sign in to PayPal" → otherdomain)
    if (links.length && !links.some((l) => l.official)) {
      for (const brand of ["paypal", "amazon", "apple", "microsoft", "netflix", "chase", "wellsfargo", "bankofamerica", "usps", "fedex", "irs", "medicare"]) {
        if (new RegExp("\\b" + titleCase(brand).replace(/^the /, "") + "\\b", "i").test(all) && links.some((l) => l.host)) {
          reasons.push({ weight: 2, id: "brand-mismatch", text: `The message mentions ${titleCase(brand)}, but none of its links go to ${titleCase(brand)}'s real website.` });
          break;
        }
      }
    }

    const attachments = [].concat(input.attachments || []);
    let am; ATTACH_RE.lastIndex = 0;
    while ((am = ATTACH_RE.exec(all))) attachments.push(am[0].trim());
    const attachmentResults = Array.from(new Set(attachments)).slice(0, 10).map((name) => {
      const ext = String(name).toLowerCase().split(".").pop();
      if (DANGEROUS_EXTENSIONS.includes(ext)) return { name, level: "red", text: `"${name}" is a program file. Opening it could install harmful software. Do not open it.` };
      if (CAUTION_EXTENSIONS.includes(ext)) return { name, level: "yellow", text: `"${name}" is a type of file sometimes used to hide harmful software. Only open it if you were expecting it from someone you trust.` };
      return { name, level: "green", text: `"${name}" is a common document type. Still, only open attachments you were expecting.` };
    });
    attachmentResults.forEach((a) => {
      if (a.level === "red") reasons.push({ weight: 5, strong: true, id: "bad-attachment", text: a.text });
      else if (a.level === "yellow") reasons.push({ weight: 2, id: "odd-attachment", text: a.text });
    });

    const score = reasons.reduce((n, r) => n + r.weight, 0);
    const strongCount = reasons.filter((r) => r.strong).length;
    let level = "green";
    if (strongCount >= 1 && score >= 5 || score >= 7) level = "red";
    else if (score >= 3 || strongCount >= 1) level = "yellow";

    reasons.sort((a, b) => b.weight - a.weight);

    const defaultAdvice = {
      red: ["Do not click any links, open attachments, call phone numbers or reply.", "If it claims to be from a company you use, contact them yourself using the number on your card, statement or their official website.", "You can delete the message, or ask a trusted family member to look at it."],
      yellow: ["Don't click links or call numbers in the message until you've checked.", "Contact the company or person directly using contact details you already have.", "When in doubt, ask a trusted family member or friend."],
      green: ["I didn't find common scam signs, but that doesn't guarantee it's safe.", "If it asks for money, passwords or personal details, check with the sender using contact details you already know."],
    };
    const uniqueAdvice = Array.from(new Set(advice.concat(defaultAdvice[level])));

    return {
      level, score, reasons, categories: Array.from(new Set(categories)),
      links, phones, attachments: attachmentResults,
      sender: sender.parsed || null,
      advice: uniqueAdvice.slice(0, 6),
      summary: summarize(level, categories),
    };
  }

  function summarize(level, categories) {
    if (level === "red") return categories.length
      ? `This looks like a scam. I found serious warning signs: ${categories.slice(0, 3).join(", ").toLowerCase()}.`
      : "This looks dangerous. I found serious warning signs.";
    if (level === "yellow") return categories.length
      ? `Be careful. I found some warning signs: ${categories.slice(0, 3).join(", ").toLowerCase()}.`
      : "Be careful. Some things here need checking.";
    return "I didn't find the usual warning signs of a scam. That is not a guarantee, so stay alert if it asks for money or personal details.";
  }

  // Email services wrap links (google.com/url?q=...). Show the real destination instead.
  function unwrapRedirect(href) {
    try {
      const u = new URL(href);
      if (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname === "/url") return u.searchParams.get("q") || u.searchParams.get("url") || href;
      if (/safelinks\.protection\.outlook\.com$/.test(u.hostname)) return u.searchParams.get("url") || href;
    } catch (e) {}
    return href;
  }

  function rank(level) { return level === "red" ? 2 : level === "yellow" ? 1 : 0; }

  // ---------------------------------------------------------- page analysis
  /**
   * analyzePage(snapshot) — snapshot comes from shared/page-snapshot.js.
   * Combines URL analysis, on-page scam language and what the page asks for.
   */
  function analyzePage(snap) {
    snap = snap || {};
    const forms = snap.forms || [];
    const hasPassword = forms.some((f) => f.fields.some((x) => x.kind === "password"));
    const hasPayment = forms.some((f) => f.fields.some((x) => x.kind === "card"));
    const hasSsn = forms.some((f) => f.fields.some((x) => x.kind === "ssn"));
    const url = analyzeUrl(snap.url || "", { hasPassword, hasPayment });
    const text = [snap.title, (snap.headings || []).map((h) => h.text).join("\n"), (snap.dialogs || []).map((d) => d.text).join("\n"), snap.text].join("\n").slice(0, 20000);
    const msg = analyzeMessage({ text });

    const reasons = url.reasons.slice();
    msg.reasons.filter((r) => !["bad-link", "odd-link", "brand-mismatch", "generic-greeting", "click-link"].includes(r.id)).forEach((r) => reasons.push(r));

    const fakeAlert = msg.reasons.some((r) => r.id === "tech-support" || r.id === "combo-tech");
    if (fakeAlert && (snap.fullscreen || snap.beforeUnload || (snap.dialogs || []).length)) {
      reasons.push({ weight: 3, strong: true, id: "fake-alert-behaviour", text: "This page is behaving like a fake virus alert (taking over the screen or showing pop-up messages)." });
    }
    if (hasPassword && !url.official && url.level !== "green") {
      reasons.push({ weight: 3, strong: true, id: "password-risky", text: "This page asks for a password, and its address has warning signs. Do not type your password here." });
    }
    if (hasSsn) reasons.push({ weight: 2, id: "asks-ssn", text: "This page asks for a Social Security number. Only enter it on official sites you went to yourself (for example ssa.gov or irs.gov)." });
    if (hasPayment && url.level !== "green") reasons.push({ weight: 3, id: "payment-risky", text: "This page asks for card details, and its address has warning signs." });

    const score = reasons.reduce((n, r) => n + r.weight, 0);
    const strong = reasons.some((r) => r.strong);
    let level = score >= 6 || (strong && score >= 5) ? "red" : score >= 3 || strong ? "yellow" : "green";
    reasons.sort((a, b) => b.weight - a.weight);

    return {
      level, score, reasons, url, fakeAlert,
      asks: { password: hasPassword, payment: hasPayment, ssn: hasSsn, personal: forms.some((f) => f.fields.some((x) => ["email", "phone", "address", "name", "dob"].includes(x.kind))) },
      categories: msg.categories,
      phones: msg.phones,
    };
  }

  const api = {
    analyzeUrl, analyzeMessage, analyzeSender, analyzePage,
    extractLinks, registrableDomain, unwrapRedirect, officialBrandFor, parseSender, levenshtein,
    brandName: titleCase,
    _data: { BRANDS, FREE_MAIL, SHORTENERS, RULES },
  };

  root.EasyAccessEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
