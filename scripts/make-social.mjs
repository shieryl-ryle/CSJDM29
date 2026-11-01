// Generates Facebook-ready images (1080x1350, portrait) into ./social using headless Edge/Chrome.
// Contains no personal data. Edit SLIDES below and re-run: node scripts/make-social.mjs
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const QRCode = require("qrcode");

const SITE = "https://csjdm-29.vercel.app";
const OUT = path.resolve("social");
mkdirSync(OUT, { recursive: true });

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) throw new Error("Edge or Chrome not found");

const qr = await QRCode.toString(SITE, { type: "svg", margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } });

const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const ol = (items) => `<ol>${items.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join("")}</ol>`;

const SLIDES = [
  {
    file: "01-cover",
    kicker: "FREE EVIDENCE DATABASE",
    title: "No USB drive needed.",
    body: `<p class="lead">Upload and keep your evidence here.</p><p class="lead dim">For pet owners affected by the San Jose del Monte animal remains discovery.</p>`,
    qr: true,
  },
  {
    file: "02-how-to-use",
    kicker: "HOW TO USE IT",
    title: "Four steps",
    body: ol([
      ["Create an account", "Email and password. Keeps your files private."],
      ["Start a report", "Enter pet and aftercare details. Entries save automatically."],
      ["Upload evidence", "Photos, receipts, screenshots of messages, certificates. Do not edit or crop."],
      ["Submit", "Then add more evidence at any time."],
    ]),
  },
  {
    file: "03-what-you-can-do",
    kicker: "WHAT YOU CAN DO",
    title: "From your phone",
    body: ul([
      "Upload receipts, messages, photos, certificates and veterinary records",
      "Keep everything in one private place with a timeline and evidence index",
      "Print your case package or download all files as a ZIP when authorities ask",
      "Report an earlier incident",
      "Submit information anonymously, no account needed",
    ]),
  },
  {
    file: "04-protected",
    kicker: "YOUR FILES",
    title: "How they are protected",
    body: ul([
      "Private by default. Only you and authorized reviewers can see them",
      "Originals are never changed",
      "Each file gets a SHA-256 hash so any change can be detected",
      "Contact details are never published",
      "Limits: 50 MB per file, 300 MB per account",
    ]),
  },
  {
    file: "05-please-read",
    kicker: "PLEASE READ",
    title: "Notices",
    body: ul([
      "The recovered-animals registry is still being compiled. Searches may show no results for now",
      "A potential match is an investigative lead only, not a confirmed identification",
      "Some records may contain images of deceased animals. They stay hidden until you choose to reveal them",
      "This platform makes no determination of legal responsibility",
      "Submit only genuine information. Do not alter or fabricate evidence",
    ]),
  },
  {
    file: "06-handover",
    kicker: "ADMINISTRATION HANDOVER",
    title: "Requesting help",
    body: `<p class="lead">This platform was built independently and is not run by any organization.</p>
      <p class="lead dim">Requesting these organizations to take over administration:</p>
      <ul class="orgs"><li>Luna and Furry Siblings</li><li>Animal Kingdom Foundation</li><li>Philippine Animal Welfare Society (PAWS)</li></ul>
      <p class="small">Representatives: message this page or comment on this post. Access is given only after confirming through each organization's official channel.</p>`,
  },
];

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;background:#0a0a0a;color:#fff;font-family:"Segoe UI",Roboto,Arial,sans-serif;display:flex;flex-direction:column}
.bar{height:18px;background:#c1121f;flex:none}
.wrap{flex:1;padding:84px 84px 0;display:flex;flex-direction:column}
.kicker{color:#ff4d4d;font-weight:700;letter-spacing:.18em;font-size:30px}
h1{font-size:104px;line-height:1.04;font-weight:800;margin-top:26px;letter-spacing:-.01em}
.lead{font-size:46px;line-height:1.3;margin-top:44px;font-weight:600}
.dim{color:rgba(255,255,255,.78);font-weight:400}
ul{margin-top:48px;list-style:none}
ul li{font-size:42px;line-height:1.28;padding:22px 0 22px 46px;border-top:2px solid rgba(255,255,255,.16);position:relative}
ul li:first-child{border-top:0}
ul li::before{content:"";position:absolute;left:0;top:38px;width:18px;height:18px;background:#c1121f}
ol{margin-top:48px;list-style:none;counter-reset:s}
ol li{counter-increment:s;display:flex;flex-direction:column;padding:26px 0 26px 118px;border-top:2px solid rgba(255,255,255,.16);position:relative}
ol li:first-child{border-top:0}
ol li::before{content:counter(s);position:absolute;left:0;top:26px;width:76px;height:76px;border-radius:50%;background:#c1121f;font-size:42px;font-weight:800;display:flex;align-items:center;justify-content:center}
ol b{font-size:46px}
ol span{font-size:34px;line-height:1.3;color:rgba(255,255,255,.8);margin-top:6px}
.orgs li{font-size:48px;font-weight:700}
.small{font-size:32px;line-height:1.35;margin-top:36px;color:rgba(255,255,255,.8)}
.qr{position:absolute;right:84px;bottom:190px;width:230px;background:#fff;padding:12px}
.qr svg{display:block;width:100%;height:auto}
.foot{flex:none;padding:0 84px 56px}
.url{font-size:40px;font-weight:700;border-top:4px solid #c1121f;padding-top:26px}
.note{font-size:26px;color:rgba(255,255,255,.6);margin-top:10px}
`;

const html = (s) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="bar"></div>
<div class="wrap"><div class="kicker">${s.kicker}</div><h1>${s.title}</h1>${s.body}</div>
${s.qr ? `<div class="qr">${qr}</div>` : ""}
<div class="foot"><div class="url">${SITE.replace("https://", "")}</div><div class="note">Independent project. Not affiliated with any organization.</div></div>
</body></html>`;

for (const s of SLIDES) {
  const htmlPath = path.join(OUT, `${s.file}.html`);
  const pngPath = path.join(OUT, `${s.file}.png`);
  writeFileSync(htmlPath, html(s));
  execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1080,1350", `--screenshot=${pngPath}`, pathToFileURL(htmlPath).href], { stdio: "ignore" });
  console.log("wrote", pngPath);
}
