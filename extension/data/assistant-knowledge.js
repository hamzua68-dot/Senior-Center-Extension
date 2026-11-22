// The built-in (offline) helper. It recognises common problems and answers with a
// short, kind reply plus big buttons to the right place in EasyAccess.
// When the AI helper is configured, free-form questions go to the AI instead.

export const COMMON_PROBLEMS = [
  { label: "I think something is a scam", say: "I think something might be a scam" },
  { label: "A pop-up says I have a virus", say: "A pop-up says my computer has a virus" },
  { label: "I can't find a file I downloaded", say: "I can't find the document I downloaded" },
  { label: "I don't understand this website", say: "I don't understand what this website is asking" },
  { label: "An email says I owe money", say: "This email says I owe money" },
  { label: "I want to video call my family", say: "I want to make a video call with my family" },
  { label: "The text is too small", say: "The writing on the screen is too small" },
  { label: "I clicked something I shouldn't have", say: "I clicked a suspicious link" },
  { label: "How do I attach a picture?", say: "I don't know how to attach a picture" },
  { label: "I forgot a password", say: "I forgot my password" },
  { label: "I can't print", say: "I can't print" },
  { label: "My internet isn't working", say: "My internet isn't working" },
];

// Each intent: patterns (all lowercase regex), reply (plain text, one step at a time), actions [{label, route}]
export const INTENTS = [
  { id: "greeting", re: /^(hi|hello|hey|good (morning|afternoon|evening))\b/,
    reply: "Hello! I'm here to help — there's no rush and no silly questions. What would you like help with today?" },
  { id: "thanks", re: /\b(thank(s| you)|that helped|great)\b/,
    reply: "You're very welcome! You're doing great. Is there anything else I can help with?" },
  { id: "clicked-link", re: /(clicked|opened|tapped).*(link|attachment|something)|i (think i )?(got|been) (scammed|hacked)|gave (them|him|her|someone)/,
    reply: "Thank you for telling me — you did the right thing. Let's go through it calmly, one step at a time. First: close that website now. Then choose what happened on the next screen.",
    actions: [{ label: "I clicked a suspicious link", route: "#/emergency/clicked-link" }, { label: "Other emergency help", route: "#/emergency" }] },
  { id: "fake-virus", re: /(virus|infected|hacked|locked|pop.?up).*(call|number|microsoft|apple|support|warning|alert)|(fake|scary) (warning|alert)|pop.?up.*virus|computer (has|has got) a virus|says .*virus/,
    reply: "Let's stay calm — your computer is most likely fine. Warnings on websites that tell you to call a phone number are fake. First step: do NOT call the number, and don't click anything on that warning. Next, close the tab by pressing Ctrl and W together (Command and W on a Mac). If the page won't go away, hold the power button until the computer turns off, wait a moment, and turn it back on. Tell me when you've done that.",
    actions: [{ label: "Explain my screen", route: "#/screen" }, { label: "I already called them", route: "#/emergency/remote-access" }] },
  { id: "owe-money", re: /(owe|overdue|unpaid|debt|invoice|bill|charged|payment due|renewal)/,
    reply: "Let's look at it together. Please don't click any links or call any numbers in that message yet. Copy the message (or open it in Gmail) and I'll check it for warning signs. A real company will never mind you checking first.",
    actions: [{ label: "Check the message", route: "#/check/message" }, { label: "Is my Gmail email safe?", route: "#/email" }] },
  { id: "scam", re: /(scam|fraud|suspicious|phishing|fishy|is this real|legit|fake|trust this|safe to (click|open))/,
    reply: "Good thinking to check first! You can paste the email or message, or a website address, and I'll look for warning signs. If it's the website you're on right now, click the EasyAccess button at the top of Chrome and choose \"Is this website safe?\".",
    actions: [{ label: "Check a message", route: "#/check/message" }, { label: "Check a link", route: "#/check/link" }, { label: "Check the website I'm on", route: "#/screen" }] },
  { id: "find-download", re: /(can'?t|cannot|where).*(find|is).*(download|file|document)|downloaded.*(where|find|gone|lost)|find (my|the) (download|file)/,
    reply: "No problem, I'll help you find it. First step: in Chrome, press the Ctrl key and the J key together (on a Mac: Command, Shift and J). A list of your downloads will appear. Can you see your file there?",
    actions: [{ label: "Show me step by step", route: "#/learn/find-downloads" }] },
  { id: "download", re: /(how|help).*(download|save (a|the) (file|document|pdf))/,
    reply: "Let's download it together. Look on the website for a button or link that says \"Download\" — it's usually near the document's name. Watch out for flashing adverts that also say Download. Would you like me to walk you through it?",
    actions: [{ label: "Show me step by step", route: "#/learn/download" }, { label: "What am I looking at?", route: "#/screen" }] },
  { id: "attach", re: /(attach|attachment|send (a )?(picture|photo|file|document)|add (a )?(picture|photo) to)/,
    reply: "That's okay — I'll walk you through it one step at a time. First, start writing your email. Then look at the bottom of the email for a little paperclip symbol. Let me know when you see it.",
    actions: [{ label: "Show me step by step", route: "#/learn/attach" }] },
  { id: "understand-page", re: /(understand|confus|what('?s| is) this (page|website|site|screen)|what am i looking at|what (is|does) (it|this website) (want|asking)|what should i (click|do))/,
    reply: "I can explain the page you're on. Go to the website, then click the EasyAccess button at the top-right of Chrome (the blue shield) and choose \"What am I looking at?\". I'll tell you what the page is, what it's asking, and what's safe to click.",
    actions: [{ label: "Understand my screen", route: "#/screen" }] },
  { id: "button", re: /(what does (this|the) button|which button|where (do i|should i) click)/,
    reply: "I can explain the buttons on the page. Click the EasyAccess button at the top of Chrome and choose \"What am I looking at?\" — I'll list the important buttons and what each one does, before you click anything.",
    actions: [{ label: "Understand my screen", route: "#/screen" }] },
  { id: "video-call", re: /(video ?call|zoom|facetime|google meet|skype|teams|see my (family|grand)|call my (family|grand|son|daughter))/,
    reply: "Lovely! The easiest way is usually for a family member to send you a link to their call. When it's time, click the link, allow your microphone and camera if asked, then click \"Join\". Would you like the step-by-step guide?",
    actions: [{ label: "Video call guide", route: "#/learn/video-call" }, { label: "Help me connect", route: "#/connect" }] },
  { id: "text-size", re: /(too small|can'?t (read|see)|bigger|larger|zoom|hard to read|tiny|font)/,
    reply: "Let's make things bigger. For EasyAccess, press the \"Make everything easier to see\" button. For any website, hold the Ctrl key and press the plus (+) key — each press makes the page bigger (Command and + on a Mac).",
    actions: [{ label: "Make everything easier to see", route: "#/settings/easier" }, { label: "Make websites bigger", route: "#/learn/browser-settings" }] },
  { id: "password", re: /(forgot|forgotten|lost|reset|change|remember).*(password|passcode|log ?in)|password/,
    reply: "Don't worry, this happens to everyone. On the website's sign-in page, look for a link that says \"Forgot password?\" and click it. The website will send a reset link to your email or phone. Also, Chrome may have saved it for you — would you like to see how to check?",
    actions: [{ label: "Find saved passwords", route: "#/learn/passwords" }, { label: "Password safety", route: "#/security" }] },
  { id: "print", re: /(print|printer)/,
    reply: "Let's get it printing. First, check the printer is turned on and has paper. Then, on the page you want, press the Ctrl key and the P key together (Command and P on a Mac). Tell me what you see.",
    actions: [{ label: "Printing step by step", route: "#/learn/print" }] },
  { id: "wifi", re: /(wi-?fi|internet (isn'?t|is not|not) working|no internet|can'?t connect|offline|disconnected)/,
    reply: "Let's check your connection. First step: look for the Wi-Fi symbol (curved lines) at the bottom-right of your screen (top-right on a Mac). Click it and check that Wi-Fi is turned on and connected to your home network. If it still doesn't work, try turning your internet box (router) off, waiting one minute, and turning it back on.",
    actions: [{ label: "Wi-Fi step by step", route: "#/learn/wifi" }] },
  { id: "email-help", re: /(email|e-mail|gmail|outlook|inbox|reply|forward)/,
    reply: "I can help with email. I can explain an email in simple words, check it for scam signs, or show you how to reply, forward or attach a file. What would you like to do?",
    actions: [{ label: "Help me with email", route: "#/email" }, { label: "Reply to an email", route: "#/learn/email-basics" }, { label: "Forward an email", route: "#/learn/forward" }] },
  { id: "read-aloud", re: /(read (it|this|the page)? ?(to me|aloud|out loud)|can'?t read)/,
    reply: "I can read things aloud for you. On any website, click the EasyAccess button at the top of Chrome and choose \"Read this page to me\". Or paste some writing into \"Read this to me\".",
    actions: [{ label: "Read this to me", route: "#/read" }] },
  { id: "family", re: /(ask (my )?(family|son|daughter|grand)|family (check|help)|share with)/,
    reply: "You can ask a trusted person to look at something for you. You'll see exactly what will be shared before anything is sent, and nothing is ever shared without your OK.",
    actions: [{ label: "Trusted family help", route: "#/family" }] },
  { id: "volume", re: /(volume|sound|can'?t hear|too loud|too quiet|speaker)/,
    reply: "Let's fix the sound. Click the speaker symbol at the bottom-right of your screen (top-right on a Mac) and drag the slider to the right. If there's a line through the speaker, click it to unmute.",
    actions: [{ label: "Volume step by step", route: "#/learn/volume" }] },
  { id: "tab", re: /(tab|window|close (the|this) page|new page)/,
    reply: "Tabs are the little labels along the top of Chrome, one for each website. To open a new one, click the + at the top. To close one, click the little × on it.",
    actions: [{ label: "Tabs step by step", route: "#/learn/new-tab" }] },
  { id: "bookmark", re: /(bookmark|favourite|favorite|save (this|a) (website|page|site))/,
    reply: "You can save websites you like. Click the star at the end of the address bar, or add it to your EasyAccess favourites so it's on your home screen.",
    actions: [{ label: "My websites", route: "#/sites" }, { label: "Bookmarks step by step", route: "#/learn/bookmark" }] },
];

export function matchIntent(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return null;
  for (const intent of INTENTS) if (intent.re.test(t)) return intent;
  return null;
}

export const FALLBACK_REPLY = "I'm not sure I understood that yet — that's my fault, not yours. You could try saying it another way, or pick one of the common problems below. If you'd like, a family member can also turn on the full AI helper in Settings so I can answer any question.";
