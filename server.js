import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));

/**
 * Admin key:
 * Sæt den som environment variable i Railway (Variables) for sikkerhed.
 * Fx ADMIN_KEY = "mysteria-GM-8437"
 */
const ADMIN_KEY = process.env.ADMIN_KEY || "dev-admin-key";

/**
 * Faste holdkoder (genbruges igen og igen)
 * Du kan ændre navnene, farver, osv.
 */
const TEAM_CODES = [
  { code: "HOLD1", name: "Hold 1" },
  { code: "HOLD2", name: "Hold 2" },
  { code: "HOLD3", name: "Hold 3" },
  { code: "HOLD4", name: "Hold 4" },
  { code: "HOLD5", name: "Hold 5" },
  { code: "HOLD6", name: "Hold 6" },
  { code: "HOLD7", name: "Hold 7" },
  { code: "HOLD8", name: "Hold 8" },
  { code: "HOLD9", name: "Hold 9" },
  { code: "HOLD10", name: "Hold 10" },
];

/**
 * In-memory state (POC)
 * OBS: Hvis Railway genstarter, nulstilles dette automatisk.
 * GM-reset virker uanset.
 */
const teams = {};
for (const t of TEAM_CODES) {
  teams[t.code] = { name: t.name, score: 0, solved: new Set() };
}

/**
 * Poster (POC)
 * Du kan bare tilføje flere i samme format.
 */
const POSTS = [
  {
    id: 1,
    title: "Post 1 – Skovkanten",
    question: "Hvilket symbol fandt I?",
    options: ["RAVN", "TIMEGLAS", "ANKER"],
    correctIndex: 1,
    clue: "Ledetråd: I kan udelukke PERSON C.",
    points: 10,
  },
  {
    id: 2,
    title: "Post 2 – Lysningen",
    question: "Hvilken retning peger pilene samlet set?",
    options: ["Nord", "Syd", "Øst", "Vest"],
    correctIndex: 0,
    clue: "Ledetråd: GENSTAND B var ikke involveret.",
    points: 10,
  },
  {
    id: 3,
    title: "Post 3 – Stenringen",
    question: "Hvilken farve-sekvens var korrekt?",
    options: ["Rød-Blå-Grøn", "Grøn-Rød-Blå", "Blå-Grøn-Rød", "Rød-Grøn-Blå"],
    correctIndex: 1,
    clue: "Ledetråd: Hændelsen skete IKKE ved STED D.",
    points: 10,
  },
];

function layout(title, body) {
  return `<!doctype html>
<html lang="da">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    body { margin: 0; background: #0b0f12; color: #e9eef2; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 18px; }
    .card { background: #121a20; border: 1px solid #22313c; border-radius: 14px; padding: 16px; margin: 14px 0; }
    a { color: #8cc4ff; text-decoration: none; }
    .btn { display: inline-block; border: 1px solid #2c3f4d; background: #18222b; color: #e9eef2; padding: 10px 12px; border-radius: 12px; }
    .btn:hover { background: #1c2a35; }
    input, select, button { width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #2c3f4d; background: #0f151a; color: #e9eef2; font-size: 1rem; }
    button { background: #1a2a35; cursor: pointer; }
    button:hover { background: #203443; }
    .muted { color: #aab7c4; }
    .ok { border-left: 4px solid #29c46f; padding-left: 10px; }
    .bad { border-left: 4px solid #ff6b6b; padding-left: 10px; }
    ul { padding-left: 18px; }
    code { background: #0f151a; padding: 2px 6px; border-radius: 8px; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; }
    .small { font-size: 0.95rem; }
    .two { display:grid; grid-template-columns: 1fr; gap:10px; }
    @media (min-width: 640px){ .two{ grid-template-columns: 1fr 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    ${body}
    <p class="muted small" style="margin-top:20px;">POC • Mysteria Outdoor Game Engine</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPost(id) {
  return POSTS.find(p => p.id === Number(id));
}

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ""); // fjern mellemrum
}

function resetAllTeams() {
  for (const code of Object.keys(teams)) {
    teams[code].score = 0;
    teams[code].solved = new Set();
  }
}

/**
 * ROUTES
 */

// Forside -> login
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Login page
app.get("/login", (req, res) => {
  res.send(layout("Log ind", `
    <div class="card">
      <h1>Mysteria – Spil-login</h1>
      <p class="muted">Indtast jeres holdkode (fx <cod
