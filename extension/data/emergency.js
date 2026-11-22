// Emergency help pathways. Each step is short and action-first.
// Phone numbers and websites listed here are official national resources.

export const RESOURCES = {
  reportfraud: { name: "Report the scam to the FTC", url: "https://reportfraud.ftc.gov/", detail: "ReportFraud.ftc.gov" },
  identitytheft: { name: "Get a personal recovery plan", url: "https://www.identitytheft.gov/", detail: "IdentityTheft.gov" },
  ic3: { name: "Report online crime to the FBI", url: "https://www.ic3.gov/", detail: "ic3.gov" },
  elderHotline: { name: "National Elder Fraud Hotline (U.S. Department of Justice)", phone: "1-833-372-8311", detail: "1-833-FRAUD-11 · free help from case managers" },
  annualcredit: { name: "Check your credit reports for free", url: "https://www.annualcreditreport.com/", detail: "AnnualCreditReport.com (the official free site)" },
  ssaOig: { name: "Report Social Security scams", url: "https://oig.ssa.gov/", detail: "oig.ssa.gov" },
  ftcConsumer: { name: "FTC advice on scams", url: "https://consumer.ftc.gov/", detail: "consumer.ftc.gov" },
  donotcall: { name: "Stop sales calls", url: "https://www.donotcall.gov/", detail: "donotcall.gov" },
};

export const CALM = "Take a slow breath. You did the right thing by asking for help. Many people — including very careful people — get caught by scams. Let's go step by step.";

export const PATHWAYS = [
  {
    id: "clicked-link", title: "I clicked a suspicious link", icon: "link",
    steps: [
      "Close the website now: press Ctrl+W (Windows) or Command+W (Mac), or click the × on its tab.",
      "If you did NOT type anything and did NOT download anything, the risk is usually low.",
      "If you typed a password on that page, go to \"I entered my password on a suspicious website\" below.",
      "If something downloaded, do not open it. Delete it from your Downloads folder.",
      "Run your computer's own security scan: on Windows open \"Windows Security\" and choose \"Quick scan\". On a Mac, keep your Mac updated (Apple menu → System Settings → General → Software Update).",
      "Watch your bank and email accounts for anything unusual over the next few weeks.",
    ],
    resources: ["reportfraud"],
  },
  {
    id: "entered-password", title: "I entered my password on a suspicious website", icon: "key",
    steps: [
      "Change that password right away — go to the real website by typing its address yourself (not using any link from the message).",
      "If you use the same password on other websites, change it on those too, starting with email and banking.",
      "Turn on \"2-step verification\" for that account if offered (see My security center → Two-step sign-in).",
      "If it was your EMAIL password, change it first — email is the key to all your other accounts.",
      "If it was your bank password, call your bank using the number on the back of your card.",
      "Ask a trusted family member to help if any of this feels hard.",
    ],
    resources: ["reportfraud"],
  },
  {
    id: "gave-bank-info", title: "I gave someone my banking information", icon: "lock",
    steps: [
      "Call your bank NOW using the phone number on the back of your bank card or on a paper statement. Say: \"I think I gave my details to a scammer.\"",
      "Ask them to block or replace your card, and to watch for or stop unusual payments.",
      "Change your online banking password (by typing the bank's address yourself).",
      "Don't trust anyone who calls you saying they are from your bank's \"fraud department\" — hang up and call the number on your card yourself.",
      "Report it to the FTC so they can help and track scammers.",
    ],
    resources: ["reportfraud", "elderHotline"],
  },
  {
    id: "sent-money", title: "I sent money to someone suspicious", icon: "alert",
    steps: [
      "Act quickly — the sooner you report it, the better the chance of stopping the payment.",
      "Contact the company you used to send the money: your bank (card/statement number), or the service you used (for example Zelle through your bank, Western Union, MoneyGram, Cash App, PayPal). Tell them it was fraud and ask them to reverse it.",
      "Paid by credit or debit card? Call your card company and ask to \"dispute the charge\".",
      "Paid with cryptocurrency or a Bitcoin ATM? Contact the company that runs the ATM or wallet, and report it to the FBI at ic3.gov.",
      "Stop all contact with the scammer. Don't send more money, even if they promise to return the first payment.",
      "Watch out for \"recovery\" scammers who contact you later promising to get your money back for a fee.",
    ],
    resources: ["reportfraud", "ic3", "elderHotline"],
  },
  {
    id: "gift-cards", title: "I bought gift cards for someone", icon: "cart",
    steps: [
      "Keep the gift cards and your receipts — don't throw them away.",
      "Contact the gift card company straight away (the phone number is usually on the back of the card or on the company's website). Tell them the card was used in a scam and ask if they can freeze the money.",
      "Don't buy any more cards, even if the person insists.",
      "Report it to the FTC at ReportFraud.ftc.gov.",
      "Remember: no real company, government office or family emergency ever needs payment in gift cards.",
    ],
    resources: ["reportfraud", "elderHotline"],
  },
  {
    id: "remote-access", title: "Someone accessed my computer remotely", icon: "monitor",
    steps: [
      "Disconnect from the internet now: turn off Wi-Fi (click the Wi-Fi symbol and switch it off) or unplug the internet cable.",
      "If they are still on the phone, hang up.",
      "Uninstall any program they asked you to install (for example AnyDesk, TeamViewer, UltraViewer). Ask a trusted family member to help if unsure.",
      "Using a DIFFERENT device (like a phone), call your bank using the number on your card and tell them someone accessed your computer.",
      "Change your important passwords (email first, then banking) — from a different device if possible.",
      "Have the computer checked by a trusted local repair shop or a family member who knows computers.",
    ],
    resources: ["reportfraud", "ic3", "elderHotline"],
  },
  {
    id: "shared-ssn", title: "I shared my Social Security number", icon: "shield",
    steps: [
      "Go to IdentityTheft.gov — it gives you a personal step-by-step recovery plan.",
      "Place a free \"fraud alert\" or \"credit freeze\" with the three credit bureaus (Equifax, Experian and TransUnion). This stops scammers opening new accounts in your name. IdentityTheft.gov explains how.",
      "Check your credit reports for free at AnnualCreditReport.com for accounts you don't recognise.",
      "Create your own my Social Security account at ssa.gov/myaccount so nobody else can create one in your name.",
      "If someone claiming to be from Social Security asked for it, report it at oig.ssa.gov.",
    ],
    resources: ["identitytheft", "annualcredit", "ssaOig"],
  },
  {
    id: "fake-family", title: "Someone is pretending to be a family member", icon: "family",
    steps: [
      "Don't send any money or gift cards.",
      "Hang up or stop replying, then call your family member yourself on the phone number you already have for them.",
      "If you can't reach them, call another relative to check.",
      "Scammers can copy voices and photos using computer tools — a familiar voice is not proof.",
      "Agree on a family \"safe word\" that only real family members know, to use in emergencies.",
      "Report the scam to the FTC.",
    ],
    resources: ["reportfraud", "elderHotline"],
  },
  {
    id: "phone-call", title: "I got a threatening or suspicious phone call", icon: "phone",
    steps: [
      "It's okay to hang up. Real agencies and banks won't mind if you call them back.",
      "Don't press any numbers or say \"yes\" to questions from a recorded message.",
      "Government agencies (Social Security, IRS, Medicare, police) don't call to threaten arrest or demand payment by gift card, cryptocurrency or wire.",
      "Phone numbers shown on your phone can be faked. If you're worried, look up the official number yourself and call it.",
      "Report the call to the FTC, and add your number to the Do Not Call Registry to reduce sales calls.",
    ],
    resources: ["reportfraud", "donotcall", "elderHotline"],
  },
  {
    id: "identity-theft", title: "I think my identity has been stolen", icon: "lock",
    steps: [
      "Go to IdentityTheft.gov to report it and get a personal recovery plan with letters you can send.",
      "Call the fraud departments of any companies where you see accounts or charges you don't recognise (use numbers on your cards or statements).",
      "Place a fraud alert or credit freeze with Equifax, Experian and TransUnion.",
      "Check your credit reports for free at AnnualCreditReport.com.",
      "Change your passwords for email and banking, and turn on 2-step verification.",
      "Keep a notebook of who you spoke to and when.",
    ],
    resources: ["identitytheft", "annualcredit", "elderHotline"],
  },
];
