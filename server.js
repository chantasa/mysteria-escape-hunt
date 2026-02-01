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
    answers: ["TIMEGLAS", "TIME GLAS"],
    clue: "Ledetråd: I kan udelukke PERSON C.",
    points: 10,
    hint: "Tip: Det er et symbol på tid." // valgfri
  },
  {
    id: 2,
    title: "Post 2 – Lysningen",
    question: "Hvilken retning peger pilene samlet set?",
    answers: ["NORD"],
    clue: "Ledetråd: GENSTAND B var ikke involveret.",
    points: 10
  },
  {
    id: 3,
    title: "Post 3 – Stenringen",
    question: "Hvilken farve-sekvens var korrekt?",
    answers: ["GRØN-RØD-BLÅ", "GRØN RØD BLÅ", "GRØN,RØD,BLÅ"],
    clue: "Ledetråd: Hændelsen skete IKKE ved STED D.",
    points: 10
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
      <p class="muted">Indtast jeres holdkode (fx <code>HOLD3</code>).</p>
      <form method="POST" action="/login">
        <label class="muted">Holdkode</label>
        <input name="team_code" placeholder="HOLD1" autocomplete="off" required />
        <button type="submit" style="margin-top:10px;">Start</button>
      </form>
      <p class="muted small" style="margin-top:12px;">
        GM-dashboard: <code>/admin?key=...</code>
      </p>
    </div>
  `));
});

// Login handler
app.post("/login", (req, res) => {
  const code = normalizeCode(req.body.team_code);
  if (!teams[code]) {
    return res.status(400).send(layout("Forkert holdkode", `
      <div class="card bad">
        <h2>❌ Holdkoden findes ikke</h2>
        <p class="muted">Tjek at I har skrevet den rigtigt (fx <code>HOLD1</code>).</p>
        <a class="btn" href="/login">Prøv igen</a>
      </div>
    `));
  }
  res.redirect(`/t/${encodeURIComponent(code)}`);
});

// Team oversigt
app.get("/t/:teamCode", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  if (!team) return res.status(404).send(layout("Ukendt hold", `<div class="card"><h1>Ukendt hold</h1></div>`));

  const list = POSTS.map(p => {
    const solved = team.solved.has(p.id);
    return `
      <div class="card">
        <h2>${escapeHtml(p.title)}</h2>
        <p class="muted">${solved ? "✅ Løst (point givet)" : "Ikke løst endnu"}</p>
        <a class="btn" href="/t/${encodeURIComponent(code)}/p/${p.id}">Gå til posten</a>
      </div>
    `;
  }).join("");

  res.send(layout(team.name, `
    <div class="card">
      <h1>${escapeHtml(team.name)}</h1>
      <p class="muted">Holdkode: <code>${escapeHtml(code)}</code></p>
      <p class="muted">Point: <code>${team.score}</code></p>
      <div class="row">
        <a class="btn" href="/login">Skift hold</a>
      </div>
    </div>
    ${list}
  `));
});

// Post side
app.get("/t/:teamCode/p/:postId", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  const post = getPost(req.params.postId);
  if (!team || !post) return res.status(404).send(layout("Ikke fundet", `<div class="card"><h1>Ikke fundet</h1></div>`));

  const options = post.options.map((o, i) => `<option value="${i}">${escapeHtml(o)}</option>`).join("");
  const alreadySolved = team.solved.has(post.id);

  res.send(layout(post.title, `
    <div class="card">
      <div class="row">
        <a class="btn" href="/t/${encodeURIComponent(code)}">← Tilbage</a>
      </div>
    </div>

    <div class="card">
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.question)}</p>
      <p class="muted">${alreadySolved ? "I har allerede løst denne post (ingen ekstra point)." : "Svar for at få feedback og ledetråd."}</p>

      <form method="POST" action="/t/${encodeURIComponent(code)}/p/${post.id}">
        <label class="muted">Vælg svar</label>
        <select name="answer_index" required>${options}</select>
        <button type="submit" style="margin-top:10px;">Send svar</button>
      </form>
    </div>
  `));
});

// Post svar
app.post("/t/:teamCode/p/:postId", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  const post = getPost(req.params.postId);
  if (!team || !post) return res.status(404).send(layout("Ikke fundet", `<div class="card"><h1>Ikke fundet</h1></div>`));

  const answerIndex = Number(req.body.answer_index);
  const isCorrect = answerIndex === post.correctIndex;

  if (!isCorrect) {
    return res.send(layout("Forkert", `
      <div class="card bad">
        <h2>❌ Ikke korrekt</h2>
        <p class="muted">Prøv igen eller gå videre.</p>
        <div class="two">
          <a class="btn" href="/t/${encodeURIComponent(code)}/p/${post.id}">Tilbage til posten</a>
          <a class="btn" href="/t/${encodeURIComponent(code)}">Til oversigt</a>
        </div>
      </div>
    `));
  }

  let awarded = 0;
  if (!team.solved.has(post.id)) {
    team.solved.add(post.id);
    team.score += post.points;
    awarded = post.points;
  }

  res.send(layout("Korrekt", `
    <div class="card ok">
      <h2>✅ Korrekt</h2>
      <p>${escapeHtml(post.clue)}</p>
      <p class="muted">Point: <code>+${awarded}</code> (total: <code>${team.score}</code>)</p>
      <div class="two">
        <a class="btn" href="/t/${encodeURIComponent(code)}">Til oversigt</a>
        <a class="btn" href="/t/${encodeURIComponent(code)}/p/${post.id}">Til samme post</a>
      </div>
    </div>
  `));
});

// Admin dashboard
app.get("/admin", (req, res) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).send(layout("Ingen adgang", `
      <div class="card">
        <h1>Ingen adgang</h1>
        <p class="muted">Forkert nøgle.</p>
      </div>
    `));
  }

  const rows = Object.entries(teams)
    .map(([code, t]) => ({ code, ...t, solvedCount: t.solved.size }))
    .sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);

  const leaderboard = rows.map((t, i) => `
    <li><strong>#${i + 1}</strong> ${escapeHtml(t.name)} (<code>${escapeHtml(t.code)}</code>) —
      <code>${t.score}</code> point (<code>${t.solvedCount}</code> poster)
    </li>
  `).join("");

  res.send(layout("GM-dashboard", `
    <div class="card">
      <h1>GM-dashboard</h1>
      <p class="muted">Leaderboard (live).</p>
      <ul>${leaderboard}</ul>
    </div>

    <div class="card">
      <h2>Reset (før ny event)</h2>
      <p class="muted">Nulstiller alle hold (point + løste poster).</p>
      <form method="POST" action="/admin/reset">
        <input type="hidden" name="key" value="${escapeHtml(ADMIN_KEY)}" />
        <button type="submit">Reset alle hold</button>
      </form>
    </div>
  `));
});

// Admin reset
app.post("/admin/reset", (req, res) => {
  const key = req.body.key || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).send("Unauthorized");
  resetAllTeams();
  res.redirect(`/admin?key=${encodeURIComponent(ADMIN_KEY)}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port", PORT));
