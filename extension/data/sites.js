// Directory of important websites. Government and financial entries use only
// official, well-known addresses. Banks, utilities and bill payments differ per person,
// so EasyAccess helps people add their OWN (from their card or statement) instead of guessing.
// verified: true = official government / organisation address checked by the EasyAccess team.

export const SITE_CATEGORIES = [
  { id: "government", title: "Government services", icon: "shieldCheck" },
  { id: "social-security", title: "Social Security", icon: "shieldCheck" },
  { id: "medicare", title: "Medicare & health insurance", icon: "heart" },
  { id: "healthcare", title: "Health information", icon: "heart" },
  { id: "pharmacy", title: "Pharmacies", icon: "heart" },
  { id: "banking", title: "Banking", icon: "lock" },
  { id: "bills", title: "Utilities & bill payments", icon: "file" },
  { id: "taxes", title: "Taxes", icon: "file" },
  { id: "food", title: "Groceries & food assistance", icon: "cart" },
  { id: "shopping", title: "Online shopping", icon: "cart" },
  { id: "email", title: "Email", icon: "mail" },
  { id: "video", title: "Video calls & messaging", icon: "video" },
  { id: "news", title: "News & weather", icon: "globe" },
  { id: "travel", title: "Transportation & travel", icon: "globe" },
  { id: "community", title: "Libraries & community help", icon: "family" },
  { id: "safety", title: "Fraud help & reporting", icon: "shield" },
  { id: "mine", title: "My own websites", icon: "star" },
];

export const SITES = [
  // Government
  { id: "usagov", cat: "government", name: "USA.gov — official guide to government services", url: "https://www.usa.gov/", verified: true },
  { id: "usagov-benefits", cat: "government", name: "Find government benefits", url: "https://www.usa.gov/benefits", verified: true },
  { id: "va", cat: "government", name: "Veterans Affairs (VA)", url: "https://www.va.gov/", verified: true },
  { id: "usps", cat: "government", name: "U.S. Postal Service (track packages)", url: "https://www.usps.com/", verified: true },
  { id: "donotcall", cat: "government", name: "National Do Not Call Registry", url: "https://www.donotcall.gov/", verified: true },
  // Social Security
  { id: "ssa", cat: "social-security", name: "Social Security Administration", url: "https://www.ssa.gov/", verified: true },
  { id: "my-ssa", cat: "social-security", name: "my Social Security account", url: "https://www.ssa.gov/myaccount/", verified: true },
  // Medicare
  { id: "medicare", cat: "medicare", name: "Medicare", url: "https://www.medicare.gov/", verified: true },
  { id: "medicaid", cat: "medicare", name: "Medicaid", url: "https://www.medicaid.gov/", verified: true },
  { id: "healthcaregov", cat: "medicare", name: "HealthCare.gov (health insurance marketplace)", url: "https://www.healthcare.gov/", verified: true },
  // Health info
  { id: "medlineplus", cat: "healthcare", name: "MedlinePlus — trusted health information", url: "https://medlineplus.gov/", verified: true },
  { id: "cdc", cat: "healthcare", name: "CDC — Centers for Disease Control", url: "https://www.cdc.gov/", verified: true },
  { id: "eldercare", cat: "healthcare", name: "Eldercare Locator — local help for older adults", url: "https://eldercare.acl.gov/", verified: true },
  // Pharmacy
  { id: "cvs", cat: "pharmacy", name: "CVS Pharmacy", url: "https://www.cvs.com/" },
  { id: "walgreens", cat: "pharmacy", name: "Walgreens", url: "https://www.walgreens.com/" },
  // Banking (guidance + official consumer resources only)
  { id: "fdic", cat: "banking", name: "FDIC — check that a bank is real and insured", url: "https://www.fdic.gov/", verified: true },
  { id: "cfpb", cat: "banking", name: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/", verified: true },
  { id: "annualcredit", cat: "banking", name: "AnnualCreditReport.com — free official credit reports", url: "https://www.annualcreditreport.com/", verified: true },
  // Bills & utilities
  { id: "liheap", cat: "bills", name: "LIHEAP — help paying heating and cooling bills", url: "https://www.acf.hhs.gov/ocs/programs/liheap", verified: true },
  { id: "lifeline", cat: "bills", name: "Lifeline — discounted phone and internet service", url: "https://www.lifelinesupport.org/", verified: true },
  // Taxes
  { id: "irs", cat: "taxes", name: "IRS — Internal Revenue Service", url: "https://www.irs.gov/", verified: true },
  { id: "irs-freefile", cat: "taxes", name: "IRS Free File — file taxes for free", url: "https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free", verified: true },
  { id: "irs-vita", cat: "taxes", name: "Free tax help from volunteers (VITA / TCE)", url: "https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers", verified: true },
  // Food
  { id: "snap", cat: "food", name: "SNAP food assistance", url: "https://www.fns.usda.gov/snap", verified: true },
  { id: "instacart", cat: "food", name: "Instacart — grocery delivery", url: "https://www.instacart.com/" },
  { id: "walmart-grocery", cat: "food", name: "Walmart (groceries & pickup)", url: "https://www.walmart.com/" },
  // Shopping
  { id: "amazon", cat: "shopping", name: "Amazon", url: "https://www.amazon.com/" },
  { id: "target", cat: "shopping", name: "Target", url: "https://www.target.com/" },
  // Email
  { id: "gmail", cat: "email", name: "Gmail", url: "https://mail.google.com/" },
  { id: "outlook", cat: "email", name: "Outlook.com", url: "https://outlook.live.com/" },
  { id: "yahoomail", cat: "email", name: "Yahoo Mail", url: "https://mail.yahoo.com/" },
  // Video & messaging
  { id: "meet", cat: "video", name: "Google Meet", url: "https://meet.google.com/" },
  { id: "zoom", cat: "video", name: "Zoom", url: "https://zoom.us/" },
  { id: "teams", cat: "video", name: "Microsoft Teams", url: "https://teams.microsoft.com/" },
  { id: "whatsapp", cat: "video", name: "WhatsApp Web", url: "https://web.whatsapp.com/" },
  { id: "messenger", cat: "video", name: "Facebook Messenger", url: "https://www.messenger.com/" },
  // News & weather
  { id: "weather", cat: "news", name: "National Weather Service", url: "https://www.weather.gov/", verified: true },
  { id: "apnews", cat: "news", name: "AP News", url: "https://apnews.com/" },
  { id: "npr", cat: "news", name: "NPR", url: "https://www.npr.org/" },
  { id: "bbc", cat: "news", name: "BBC News", url: "https://www.bbc.com/news" },
  // Travel
  { id: "amtrak", cat: "travel", name: "Amtrak trains", url: "https://www.amtrak.com/" },
  { id: "tsa", cat: "travel", name: "TSA — airport security", url: "https://www.tsa.gov/", verified: true },
  { id: "travelstate", cat: "travel", name: "Passports & travel advice (State Department)", url: "https://travel.state.gov/", verified: true },
  // Community
  { id: "211", cat: "community", name: "211 — local help with food, housing, bills", url: "https://www.211.org/" },
  { id: "libby", cat: "community", name: "Libby — free library e-books and audiobooks", url: "https://libbyapp.com/" },
  { id: "aarp", cat: "community", name: "AARP", url: "https://www.aarp.org/" },
  // Fraud help
  { id: "reportfraud", cat: "safety", name: "ReportFraud.ftc.gov — report a scam", url: "https://reportfraud.ftc.gov/", verified: true },
  { id: "identitytheft", cat: "safety", name: "IdentityTheft.gov — recover from identity theft", url: "https://www.identitytheft.gov/", verified: true },
  { id: "ic3", cat: "safety", name: "FBI Internet Crime Complaint Center", url: "https://www.ic3.gov/", verified: true },
  { id: "ftc-consumer", cat: "safety", name: "FTC consumer advice on scams", url: "https://consumer.ftc.gov/", verified: true },
];

export const CATEGORY_TIPS = {
  banking: "Add YOUR bank here: type the website address printed on your bank card or statement. Never use a link from an email or text message to find your bank.",
  bills: "Add your electricity, water, phone and internet companies here — copy the address from a paper bill.",
  mine: "Websites you add yourself appear here.",
};
