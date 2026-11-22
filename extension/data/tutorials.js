// Step-by-step lessons. Each step can have platform-specific wording:
//   text (default), win, mac, cros.   {mod} becomes "Ctrl" or "Command (⌘)".
//   keys: keyboard keys to draw, e.g. ["{mod}", "T"].
//   picture: a small illustration id drawn by the lesson view.

export const TUTORIAL_CATEGORIES = [
  { id: "browser", title: "Using the internet browser", icon: "globe" },
  { id: "files", title: "Documents, pictures & printing", icon: "file" },
  { id: "email", title: "Email", icon: "mail" },
  { id: "computer", title: "Computer settings", icon: "settings" },
  { id: "connect", title: "Video calls & staying in touch", icon: "video" },
  { id: "safety", title: "Staying safe", icon: "shield" },
];

export const TUTORIALS = [
  {
    id: "new-tab", category: "browser", title: "Open and close browser tabs", icon: "globe",
    summary: "Tabs let you have several websites open at once, like folders in a drawer.",
    steps: [
      { text: "Look at the very top of your browser window. Each website you have open shows as a \"tab\" — a little label with the website's name.", picture: "tabs" },
      { text: "To open a NEW tab, click the small plus sign (+) just to the right of your last tab.", keys: ["{mod}", "T"], tip: "Or press these keys together on your keyboard." },
      { text: "A new blank tab opens. Type a website address or a search into the long box at the top (the address bar), then press Enter." },
      { text: "To switch between tabs, just click on the tab you want." },
      { text: "To CLOSE a tab, click the small × on the right side of that tab.", keys: ["{mod}", "W"], tip: "Or press these keys together to close the tab you're looking at." },
      { text: "Closed a tab by mistake? Press these keys together to bring it back.", keys: ["{mod}", "Shift", "T"] },
    ],
  },
  {
    id: "new-window", category: "browser", title: "Open a new browser window", icon: "monitor",
    summary: "A window is a whole separate browser, with its own tabs.",
    steps: [
      { text: "Click the three dots (⋮) in the top-right corner of Chrome.", picture: "chrome-menu" },
      { text: "Click \"New window\". A second Chrome window opens on top.", keys: ["{mod}", "N"], tip: "Or press these keys together." },
      { text: "To go back to your first window, click its picture on the taskbar at the bottom of the screen.", mac: "To go back to your first window, click \"Window\" in the menu at the very top of the screen and choose it from the list.", cros: "To go back to your first window, click the Chrome icon on the shelf at the bottom of the screen." },
      { text: "To close a window, click the × in its top-right corner.", mac: "To close a window, click the red circle in its top-left corner." },
    ],
  },
  {
    id: "download", category: "files", title: "Download a document", icon: "download",
    summary: "Downloading saves a copy of a file from a website onto your computer.",
    steps: [
      { text: "Find the link or button on the website that says \"Download\" (or the document's name, often ending in .pdf)." },
      { text: "Careful: some websites show big flashing adverts that also say \"Download\". The real button is usually near the document's name. If unsure, ask EasyAccess \"What am I looking at?\"." },
      { text: "Click the real Download button. Chrome may ask where to save it — if so, choose \"Downloads\" and click Save." },
      { text: "When it's finished, a small download icon (an arrow pointing down) appears at the top right of Chrome. Click it to see your file.", picture: "download-icon" },
      { text: "Click the file's name to open it. Well done!" },
    ],
  },
  {
    id: "find-downloads", category: "files", title: "Find a document I downloaded", icon: "search",
    summary: "Everything you download goes to the \"Downloads\" folder.",
    steps: [
      { text: "The quickest way: in Chrome, press these keys together. A list of everything you've downloaded appears.", keys: ["{mod}", "J"], mac: "The quickest way: in Chrome, press these keys together. A list of everything you've downloaded appears." , macKeys: ["Command (⌘)", "Shift", "J"]},
      { text: "Click the file's name to open it, or click \"Show in folder\" to see where it is on your computer." },
      { text: "Another way: click the yellow folder icon on the taskbar at the bottom of the screen (File Explorer). Then click \"Downloads\" on the left side.", mac: "Another way: click the blue smiling face (Finder) on the Dock at the bottom of the screen. Then click \"Downloads\" on the left side.", cros: "Another way: click the circle in the bottom-left corner, open the \"Files\" app, then click \"Downloads\" on the left side." },
      { text: "Your newest files are usually at the top. Double-click a file to open it." },
    ],
  },
  {
    id: "print", category: "files", title: "Print a page or document", icon: "file",
    summary: "Send what you see on the screen to your printer.",
    steps: [
      { text: "Make sure your printer is switched on and has paper." },
      { text: "Open the page or document you want to print." },
      { text: "Press these keys together. The print window appears.", keys: ["{mod}", "P"] },
      { text: "Next to \"Destination\", check that your printer's name is chosen. If it says \"Save as PDF\", click it and choose your printer." },
      { text: "Choose how many copies you want next to \"Copies\" (if shown), then click the blue \"Print\" button." },
      { text: "Nothing printed? Check the printer for a blinking light or error message, and make sure it's connected to the same Wi-Fi as your computer." },
    ],
  },
  {
    id: "copy-paste", category: "files", title: "Copy and paste", icon: "copy",
    summary: "Copy words from one place and put them somewhere else — no retyping.",
    steps: [
      { text: "Highlight the words you want to copy: press and hold the left mouse button at the start of the words, drag to the end, then let go. The words turn blue." },
      { text: "Copy them by pressing these keys together. Nothing seems to happen — that's normal. The words are now remembered.", keys: ["{mod}", "C"] },
      { text: "Click where you want the words to go (for example, inside an email or a search box)." },
      { text: "Paste them by pressing these keys together. The words appear!", keys: ["{mod}", "V"] },
      { text: "Tip: you can also right-click on highlighted words and choose \"Copy\", then right-click where you want them and choose \"Paste\".", mac: "Tip: you can also click with two fingers on the trackpad (or hold Control and click) and choose \"Copy\", then do the same and choose \"Paste\"." },
    ],
  },
  {
    id: "save-picture", category: "files", title: "Save a picture from a website or email", icon: "camera",
    summary: "Keep a copy of a photo on your computer.",
    steps: [
      { text: "Move your mouse pointer over the picture you want to save." },
      { text: "Right-click on the picture (press the right mouse button). A small menu appears.", mac: "Click with two fingers on the trackpad (or hold Control and click) on the picture. A small menu appears." },
      { text: "Click \"Save image as…\"." },
      { text: "A window asks where to save it. Choose \"Pictures\" (or \"Downloads\") on the left, then click \"Save\"." },
      { text: "Pictures in Gmail: open the email, move your mouse over the photo at the bottom and click the download arrow." },
    ],
  },
  {
    id: "bookmark", category: "browser", title: "Bookmark a favourite website", icon: "star",
    summary: "A bookmark saves a website so you can go back to it with one click.",
    steps: [
      { text: "Go to the website you'd like to save." },
      { text: "Click the star (☆) at the right end of the address bar at the top.", keys: ["{mod}", "D"], tip: "Or press these keys together." },
      { text: "A small box appears. You can change the name to something easy to remember. Click \"Done\"." },
      { text: "To see your bookmarks bar under the address bar, press these keys together.", keys: ["{mod}", "Shift", "B"] },
      { text: "Tip: you can also save favourites inside EasyAccess under \"Find what I need\" — they appear on your EasyAccess home screen." },
    ],
  },
  {
    id: "email-basics", category: "email", title: "Read and write an email", icon: "mail",
    summary: "The basics of using email on a website like Gmail or Outlook.",
    steps: [
      { text: "Open your email website (for example Gmail at mail.google.com, or Outlook at outlook.com). Your list of emails is called the \"Inbox\"." },
      { text: "Click on an email to open and read it. Unread emails are usually in bold." },
      { text: "To answer, click \"Reply\" (a curved arrow). Type your message and click \"Send\"." },
      { text: "To write a new email, click \"Compose\" (Gmail) or \"New mail\" (Outlook)." },
      { text: "In \"To\", type the person's email address. In \"Subject\", type a few words about the email. Then write your message in the big box." },
      { text: "Click \"Send\" when you're ready. Nothing is sent until you press Send." },
      { text: "Safety tip: if an email asks for money, passwords, or tells you to act urgently, use EasyAccess \"Check before you click\" first." },
    ],
  },
  {
    id: "attach", category: "email", title: "Attach a picture or file to an email", icon: "file",
    summary: "Send a photo or document along with your email.",
    steps: [
      { text: "Start writing your email (click Compose, or Reply)." },
      { text: "At the bottom of the email, find the paperclip symbol (📎) and click it." },
      { text: "A window opens showing files on your computer. Click \"Pictures\", \"Documents\" or \"Downloads\" on the left to find your file." },
      { text: "Click the file once to choose it, then click \"Open\"." },
      { text: "The file's name now appears at the bottom of your email. Wait until it has finished loading." },
      { text: "Write your message and click \"Send\"." },
    ],
  },
  {
    id: "forward", category: "email", title: "Forward an email to someone", icon: "send",
    summary: "Send an email you received on to another person.",
    steps: [
      { text: "Open the email you want to pass on." },
      { text: "Click \"Forward\" (an arrow pointing right). In Gmail it may be under the three dots (⋮) at the top right of the email." },
      { text: "Type the email address of the person you want to send it to in the \"To\" box." },
      { text: "Add a short note if you like, for example \"Does this look real to you?\"" },
      { text: "Click \"Send\". Tip: EasyAccess's \"Trusted family help\" can also help you ask someone to check a suspicious email." },
    ],
  },
  {
    id: "upload", category: "files", title: "Upload a document to a website", icon: "download",
    summary: "Send a file from your computer to a website (for example, a doctor's form).",
    steps: [
      { text: "Find the button on the website that says \"Upload\", \"Choose file\", \"Browse\" or \"Attach\". Click it." },
      { text: "A window opens showing files on your computer. Look in \"Documents\", \"Downloads\" or \"Pictures\" on the left." },
      { text: "Click your file once, then click \"Open\"." },
      { text: "The file's name should now show on the website. Some websites then need you to click \"Submit\" or \"Upload\" to finish." },
      { text: "Only upload documents like ID or medical records to websites you went to yourself and trust." },
    ],
  },
  {
    id: "wifi", category: "computer", title: "Connect to Wi-Fi", icon: "wifi",
    summary: "Get your computer onto the internet without a cable.",
    steps: [
      { text: "Look at the bottom-right corner of the screen for the Wi-Fi symbol (curved lines like a fan) or a little globe. Click it.", mac: "Look at the top-right corner of the screen for the Wi-Fi symbol (curved lines like a fan). Click it.", cros: "Click the time in the bottom-right corner of the screen. A panel opens." },
      { text: "Make sure Wi-Fi is turned on (the Wi-Fi button should be coloured, not grey).", cros: "Click the Wi-Fi symbol in the panel, and make sure Wi-Fi is turned on." },
      { text: "A list of networks appears. Click the name of your home network. (It's often printed on a sticker on your internet box/router.)" },
      { text: "Type the Wi-Fi password exactly — capital letters matter. It's often on the same sticker. Then click \"Connect\" (or \"Join\")." },
      { text: "When it says \"Connected\", you're online! Your computer will remember it next time." },
      { text: "Be careful on public Wi-Fi (cafés, hotels): avoid banking or shopping on networks that anyone can join." },
    ],
  },
  {
    id: "brightness", category: "computer", title: "Change screen brightness", icon: "lightbulb",
    summary: "Make the screen brighter or dimmer to be easier on your eyes.",
    steps: [
      { text: "Click the Wi-Fi, speaker or battery symbol in the bottom-right corner of the screen. A panel opens.", mac: "Look at the top row of your keyboard for keys with a small sun picture.", cros: "Click the time in the bottom-right corner of the screen. A panel opens." },
      { text: "Find the slider with a little sun symbol. Drag it to the right to make the screen brighter, or to the left to make it dimmer.", mac: "Press the key with the bigger sun to make the screen brighter, and the smaller sun to make it dimmer. (Or click the Control Center icon — two small switches — at the top right, and use the \"Display\" slider.)" },
      { text: "Desktop computer with a separate screen? Look for buttons on the edge of the monitor itself to change brightness." },
      { text: "Text still hard to read? In EasyAccess, press \"Make everything easier to see\"." },
    ],
  },
  {
    id: "volume", category: "computer", title: "Change the volume", icon: "speaker",
    summary: "Make sounds louder or quieter.",
    steps: [
      { text: "Click the speaker symbol in the bottom-right corner of the screen.", mac: "Click the Control Center icon (two small switches) at the top-right of the screen, or press the volume keys on the top row of the keyboard.", cros: "Click the time in the bottom-right corner, then find the speaker slider." },
      { text: "Drag the slider to the right for louder, left for quieter." },
      { text: "If you see a speaker with a line through it, sound is muted. Click the speaker symbol to turn sound back on." },
      { text: "Watching a video? Videos often have their own volume control (a speaker symbol) at the bottom of the video, too." },
    ],
  },
  {
    id: "video-call", category: "connect", title: "Start or join a video call", icon: "video",
    summary: "See and talk to family and friends using Zoom, Google Meet and similar.",
    steps: [
      { text: "Usually someone sends you a link (in an email or message) to join their call. Click the link at the time of the call." },
      { text: "Your browser may ask to use your microphone and camera. Click \"Allow\" so they can see and hear you." },
      { text: "You may see a preview of yourself. Type your name if asked, then click \"Join\" or \"Join now\"." },
      { text: "Zoom might ask you to download its app. You can — or click \"Join from your browser\" instead." },
      { text: "To start your own Google Meet call: go to meet.google.com, click \"New meeting\", then \"Start an instant meeting\". Share the link with family." },
      { text: "To leave the call, click the red phone or \"Leave\" button." },
    ],
  },
  {
    id: "mic-camera", category: "connect", title: "Turn the microphone and camera on or off", icon: "mic",
    summary: "Control whether people on a call can hear or see you.",
    steps: [
      { text: "During a call, look at the bottom of the screen for a row of buttons." },
      { text: "The microphone button looks like a small microphone. If it has a red line through it, you're \"muted\" — people can't hear you. Click it to turn your sound on." },
      { text: "The camera button looks like a video camera. With a red line through it, people can't see you. Click it to turn your camera on." },
      { text: "If the buttons don't work, Chrome may be blocking them: click the camera symbol at the right end of the address bar and choose \"Always allow\"." },
    ],
  },
  {
    id: "forms", category: "browser", title: "Fill in an online form", icon: "edit",
    summary: "Type your information into boxes on a website.",
    steps: [
      { text: "Click inside the first box. A blinking line appears — this means you can type." },
      { text: "Type your answer. Then press the Tab key to move to the next box (or click on it).", keys: ["Tab"] },
      { text: "Boxes with a star (*) must be filled in. Others are optional." },
      { text: "For drop-down lists (a box with a small arrow), click it and choose from the list." },
      { text: "For tick boxes, click once to add a tick. Read what you're agreeing to." },
      { text: "Check everything, then click the button at the bottom (\"Submit\", \"Continue\" or \"Next\")." },
      { text: "If a box turns red, read the message next to it — it tells you what needs fixing. EasyAccess \"Understand my screen\" can explain it too." },
    ],
  },
  {
    id: "browser-settings", category: "browser", title: "Make websites bigger with Chrome zoom", icon: "textSize",
    summary: "Enlarge everything on a website to make it easier to read.",
    steps: [
      { text: "To make a website bigger, press these keys together. Press again to go even bigger.", keys: ["{mod}", "+"] },
      { text: "To make it smaller, press these keys together.", keys: ["{mod}", "−"] },
      { text: "To go back to normal size, press these keys together.", keys: ["{mod}", "0"] },
      { text: "To make every website bigger by default: click the three dots (⋮) at top right → Settings → Appearance → choose a bigger \"Page zoom\" or \"Font size\"." },
    ],
  },
  {
    id: "notifications", category: "safety", title: "Stop websites sending pop-up notifications", icon: "bell",
    summary: "Some websites trick people into allowing annoying or scary pop-ups.",
    steps: [
      { text: "If a website asks \"Show notifications?\" and you didn't expect it, click \"Block\"." },
      { text: "To remove websites you allowed by mistake: click the three dots (⋮) at top right of Chrome, then \"Settings\"." },
      { text: "Click \"Privacy and security\", then \"Site settings\", then \"Notifications\"." },
      { text: "Under \"Allowed to send notifications\", find any website you don't know. Click the three dots next to it and choose \"Block\" or \"Remove\"." },
      { text: "Fake virus warnings that pop up in the corner of the screen often come from notifications like these. Blocking them stops the warnings." },
    ],
  },
  {
    id: "popups", category: "safety", title: "Understand pop-up messages", icon: "alert",
    summary: "What to do when boxes suddenly appear on your screen.",
    steps: [
      { text: "A pop-up is a box that appears over a website. Many are harmless: cookie questions, newsletter sign-ups, or chat offers." },
      { text: "Cookie messages: it's fine to click \"Reject\", \"Necessary only\" or \"Accept\". Reject is the more private choice." },
      { text: "Newsletter or offers: look for \"No thanks\", \"Close\" or a small × in a corner." },
      { text: "DANGER signs: a pop-up says your computer has a virus, is locked, or shows a phone number to call. These are FAKE. Never call the number." },
      { text: "To escape a fake warning: press these keys together to close the tab. If that doesn't work, restart your computer.", keys: ["{mod}", "W"] },
      { text: "Not sure? Click the EasyAccess button and choose \"What am I looking at?\"." },
    ],
  },
  {
    id: "passwords", category: "safety", title: "Find your saved passwords in Chrome", icon: "key",
    summary: "Chrome's Password Manager can remember passwords safely for you.",
    steps: [
      { text: "Click the three dots (⋮) at the top right of Chrome." },
      { text: "Click \"Passwords and autofill\", then \"Google Password Manager\". (In some versions: Settings → Autofill and passwords.)" },
      { text: "You'll see a list of websites. Click one to see its saved username." },
      { text: "To see the password, click the eye symbol. Your computer may ask for your computer password or fingerprint first — that keeps others out." },
      { text: "Never read your passwords out to anyone who calls or messages you — not even someone claiming to be from Google, Microsoft or your bank." },
    ],
  },
  {
    id: "appointments", category: "connect", title: "Book an appointment online", icon: "calendar",
    summary: "Many doctors, pharmacies and services let you book on their website.",
    steps: [
      { text: "Go to the official website of your doctor, pharmacy or service. Type the address yourself or use your EasyAccess favourites — don't use links from unexpected messages." },
      { text: "Look for a button like \"Book appointment\", \"Schedule\" or \"Appointments\"." },
      { text: "You may need to sign in to a \"patient portal\". Use the details your doctor's office gave you." },
      { text: "Choose the type of appointment, then pick a date and time from the calendar." },
      { text: "Check the details, then click \"Confirm\" or \"Book\". You'll usually get a confirmation email." },
      { text: "Write the appointment on your calendar, or ask EasyAccess to add a reminder (Security center → Reminders)." },
    ],
  },
  {
    id: "screenshot", category: "files", title: "Take a picture of your screen (screenshot)", icon: "camera",
    summary: "Useful to show a family member what you're seeing.",
    steps: [
      { text: "Press these keys together. The screen dims and you can drag a box around the part you want to capture.", keys: ["Windows key", "Shift", "S"], mac: "Press these keys together. The pointer becomes a cross — drag a box around the part you want.", macKeys: ["Command (⌘)", "Shift", "4"], cros: "Press these keys together, then choose the area you want.", crosKeys: ["Ctrl", "Shift", "Show windows"] },
      { text: "The picture is saved. On Windows it's in Pictures → Screenshots (or click the notification that appears). On a Mac it appears on the Desktop. On a Chromebook it's in Files → Downloads." },
      { text: "Easier option: EasyAccess's \"Understand my screen\" can take a picture of the website you're on, with your permission." },
    ],
  },
];

export function findTutorial(id) {
  return TUTORIALS.find((t) => t.id === id);
}
