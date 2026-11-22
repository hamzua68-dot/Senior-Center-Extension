// Security lessons, the scam-awareness quiz and the digital safety checklist.

export const SECURITY_LESSONS = [
  {
    id: "strong-passwords", title: "Create strong passwords", icon: "key",
    points: [
      "Use a long password — at least 12 characters. Longer is stronger.",
      "An easy way: join three or four random words together, like \"PurpleTeapotGardenRiver\" (but make up your own!).",
      "Use a DIFFERENT password for your email and your bank than for anything else.",
      "Don't use your name, birthday, pet's name or \"password123\".",
      "Let Chrome's Password Manager remember them — it only fills them in on the real website, which also protects you from fake websites.",
    ],
  },
  {
    id: "password-managers", title: "How password managers work", icon: "lock",
    points: [
      "A password manager is like a locked notebook for your passwords, built into Chrome.",
      "When you sign in to a website, Chrome offers to save the password. Click \"Save\".",
      "Next time, Chrome fills it in for you — but only on the real website. If it doesn't offer your password, be suspicious: you might be on a fake site!",
      "To see saved passwords: Chrome menu (⋮) → Passwords and autofill → Google Password Manager. See the lesson \"Find your saved passwords\".",
      "EasyAccess never asks for, stores or sees your passwords.",
    ],
  },
  {
    id: "two-step", title: "Turn on two-step sign-in", icon: "shieldCheck",
    points: [
      "Two-step verification (also called 2FA or multi-factor) adds a second lock: after your password, you enter a code sent to your phone.",
      "Even if a scammer learns your password, they can't get in without your phone.",
      "Turn it on in your account's \"Security\" settings. For Google, go to myaccount.google.com and choose \"Security\".",
      "NEVER read out or share a code sent to your phone. Anyone asking for it — even claiming to be the company — is a scammer.",
    ],
  },
  {
    id: "reset-scams", title: "Recognise password-reset scams", icon: "alert",
    points: [
      "Scammers send emails saying \"Your password expires today\" or \"Someone signed in to your account — click here\".",
      "If you didn't ask to reset your password, ignore the email.",
      "If you're worried, go to the website yourself by typing its address, and check your account there.",
      "A text with a code you didn't ask for may mean someone is trying to get into your account. Don't share it, and change your password.",
    ],
  },
  {
    id: "fake-logins", title: "Spot fake sign-in pages", icon: "eye",
    points: [
      "Fake sign-in pages copy the look of real ones perfectly. The ADDRESS is the giveaway.",
      "Look at the part just before the first single slash: \"paypal.com\" is real; \"paypal.com-secure-login.net\" belongs to \"secure-login.net\" — fake.",
      "Watch for misspellings: \"amaz0n\", \"rnicrosoft\" (r-n looks like m), \"wellsfargo-alerts.com\".",
      "If you got there from a link in an email or text, close it and type the address yourself.",
      "EasyAccess shows a colour (green, yellow or red) for the website you're on. Click the EasyAccess button to check.",
    ],
  },
  {
    id: "recover", title: "Recover a hacked account", icon: "repeat",
    points: [
      "Signs of a hacked account: friends get strange messages from you, you can't sign in, or you see purchases you didn't make.",
      "Go to the website's official \"Forgot password\" or \"Account recovery\" page by typing its address yourself.",
      "Change the password, then sign out of all other devices if the website offers it.",
      "Turn on two-step verification.",
      "Check that the recovery phone number and email address are still yours.",
      "Tell your contacts not to trust messages sent from your account while it was hacked.",
    ],
  },
  {
    id: "check-settings", title: "Check your account security settings", icon: "settings",
    points: [
      "Most big companies have a \"Security checkup\". For Google: myaccount.google.com → Security.",
      "Make sure your recovery phone number and email are correct.",
      "Look at \"Recent activity\" or \"Your devices\" for anything you don't recognise.",
      "Remove old devices you no longer use.",
      "Keep your computer up to date: install updates from your computer's settings when it asks.",
    ],
  },
];

export const QUIZ = [
  { q: "A pop-up says \"Your computer has a virus! Call Microsoft at 1-800-…\". What should you do?",
    options: ["Call the number quickly", "Close the page (or restart the computer) and don't call", "Click OK to fix it"], answer: 1,
    why: "Microsoft never shows warnings with phone numbers. It's a fake page. Close it — if it won't close, restart your computer." },
  { q: "Your \"grandson\" calls crying, saying he's in jail and needs bail money in gift cards. He asks you not to tell his parents. What's the best step?",
    options: ["Buy the gift cards fast", "Hang up and call your grandson (or his parents) on the number you know", "Ask him to text instead"], answer: 1,
    why: "This is the \"grandparent scam\". Scammers can even copy voices. Always check by calling family on a number you already have." },
  { q: "An email from \"Amazon\" says your order of a $999 TV is on its way, and to call a number if you didn't order it. What should you do?",
    options: ["Call the number in the email", "Sign in to Amazon yourself (typing amazon.com) to check your orders", "Reply to the email"], answer: 1,
    why: "Fake order emails try to make you call scammers. Check by visiting the real website yourself." },
  { q: "Which website address really belongs to PayPal?",
    options: ["paypal.com.security-check.net", "www.paypal.com/signin", "paypal-account-help.com"], answer: 1,
    why: "Look at the name just before the first single slash. Only \"www.paypal.com/signin\" ends with paypal.com." },
  { q: "Someone from your bank's \"fraud team\" calls and asks for the code just texted to your phone. What do you do?",
    options: ["Read them the code", "Hang up and call the number on the back of your bank card", "Text the code back"], answer: 1,
    why: "Real banks never ask for those codes. The code lets the scammer into your account." },
  { q: "A text says your package can't be delivered and asks for a $1.50 fee through a link. What's safest?",
    options: ["Pay — it's only $1.50", "Ignore it, or check on the delivery company's real website yourself", "Reply STOP"], answer: 1,
    why: "Small fees are used to steal your card details. Track packages by typing usps.com, ups.com or fedex.com yourself." },
  { q: "A friendly person you met online, who can never video call, asks for money for a plane ticket to visit you. This is…",
    options: ["Probably a romance scam", "A normal request", "Fine if they promise to pay it back"], answer: 0,
    why: "Never send money to someone you've only met online. Talk to a friend or family member about it." },
  { q: "Is it safe to let a stranger \"connect\" to your computer to fix a problem they called you about?",
    options: ["Yes, if they say they're from Microsoft", "No — never let someone who contacted you control your computer", "Yes, if they sound professional"], answer: 1,
    why: "Tech companies don't call people out of the blue. Remote access lets scammers steal from your bank account." },
  { q: "The padlock symbol next to a website address means…",
    options: ["The website is honest and safe", "The connection is private, but the website could still be a scam", "Your computer has no viruses"], answer: 1,
    why: "Scam websites can have a padlock too. It only means nobody can listen in on the connection." },
  { q: "Someone says you've won a lottery you never entered, but must pay a \"processing fee\" first. This is…",
    options: ["A lucky day", "A scam — real prizes never ask you to pay", "Fine if the fee is small"], answer: 1,
    why: "If you didn't enter, you didn't win. Paying fees to collect a prize is always a scam." },
];

export const CHECKLIST = [
  { id: "updates", text: "My computer and browser install updates (from the computer's settings, not website pop-ups)." },
  { id: "unique-email-pw", text: "My email password is long and not used anywhere else." },
  { id: "two-step-email", text: "Two-step verification is turned on for my email." },
  { id: "two-step-bank", text: "Two-step verification is turned on for my bank." },
  { id: "pw-manager", text: "I let Chrome's Password Manager remember my passwords." },
  { id: "safe-word", text: "My family and I have agreed a \"safe word\" for emergencies." },
  { id: "bank-number", text: "I know where to find my bank's real phone number (back of my card)." },
  { id: "notifications", text: "I've blocked websites I don't know from sending notifications." },
  { id: "credit-freeze", text: "I've considered a free credit freeze with Equifax, Experian and TransUnion." },
  { id: "my-ssa", text: "I've created my own my Social Security account (so nobody else can)." },
  { id: "protection", text: "EasyAccess \"Protect me on every website\" is turned on." },
  { id: "trusted-contact", text: "I've chosen a trusted person I can ask before acting on anything suspicious." },
];
