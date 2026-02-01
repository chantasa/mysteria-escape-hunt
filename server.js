import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));

/**
 * POC admin-nøgle.
 * Senere flytter vi den til en environment variable på Railway.
 */
const ADMIN_KEY = process.env.ADMIN_KEY || "dev-admin-key";

/**
 * POC: Hold + point (in-memory).
 * Senere kan vi gøre det “rigtigt” med database.
 */
const teams = {
  "team-red": { name: "Hold Rød", score: 0, solved: new Set() },
  "team-blue": { name: "Hold Blå", score: 0, solved: new Set() },
};

/**
 * POC: 3 poster (multiple choice)
 * Senere gør vi det til 12-18 poster og genererer QR-links.
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
    .wrap { max-width: 720px; margin: 0 auto; padding: 18px; }
    .card { background: #121a20; border: 1px solid #22313c; border-radius: 14px; padding: 16px; margin: 14px 0; }
    a { color: #8cc4ff; text-decoration: none; }
    .btn { display: inline-block; border: 1px solid #2c3f4d; background: #18222b; color: #e9eef2; padding: 10px 12px; border-radius: 12px; }
    .btn:hover { background: #1c2a35; }
    select, button { width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #2c3f4d; background: #0f151a; color: #e9eef2; font-size: 1rem; }
    button { background: #1a2a35; cursor: pointer; }
    button:hover { background: #203443; }
    .muted { color: #aab7c4; }
    .ok { border-left: 4px solid #29c46f; padding-left: 10px; }
    .bad { border-left: 4px solid #ff6b6b; padding-left: 10px; }
    ul { padding-left: 18px; }
    code { background: #0f151a; padding: 2px 6px; border-radius: 8px; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; }
  </style>
</head>
<body>
  <div class="wrap">
    ${body}
    <p class="muted" style="margin-top:20px;">POC • Mysteria Outdoor Game Engine</p>
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

app.get("/", (req, res) => {
  res.send(layout("Start", `
    <div class="card">
      <h1>Mysteria – Outdoor POC</h1>
      <p class="muted">Vælg hold for at teste. I drift laver vi unikke hold-links/QR.</p>
      <div class="row">
        <a class="btn" href="/t/team-red">Åbn Hold Rød</a>
        <a class="btn" href="/t/team-blue">Åbn Hold Blå</a>
        <a class="btn" href="/admin?key=${encodeURIComponent(ADMIN_KEY)}">GM-dashboard</a>
      </div>
    </div>
  `));
});

app.get("/t/:teamId", (req, res) => {
  const team = teams[req.params.teamId];
  if (!team) return res.status(404).send(layout("Ukendt hold", `<div class="card"><h1>Ukendt hold</h1></div>`));

  const list = POSTS.map(p => {
    const solved = team.solved.has(p.id);
    return `
      <div class="card">
        <h2>${escapeHtml(p.title)}</h2>
        <p class="muted">${solved ? "✅ Løst (point givet)" : "Ikke løst endnu"}</p>
        <a class="btn" href="/t/${encodeURIComponent(req.params.teamId)}/p/${p.id}">Gå til posten</a>
      </div>
    `;
  }).join("");

  res.send(layout(team.name, `
    <div class="card">
      <h1>${escapeHtml(team.name)}</h1>
      <p class="muted">Point: <code>${team.score}</code></p>
      <p class="muted">Vælg en post. Korrekt svar giver ledetråd med det samme.</p>
    </div>
    ${list}
  `));
});

app.get("/t/:teamId/p/:postId", (req, res) => {
  const team = teams[req.params.teamId];
  const post = getPost(req.params.postId);
  if (!team || !post) return res.status(404).send(layout("Ikke fundet", `<div class="card"><h1>Ikke fundet</h1></div>`));

  const options = post.options.map((o, i) => `<option value="${i}">${escapeHtml(o)}</option>`).join("");
  const alreadySolved = team.solved.has(post.id);

  res.send(layout(post.title, `
    <div class="card">
      <a class="btn" href="/t/${encodeURIComponent(req.params.teamId)}">← Tilbage</a>
    </div>

    <div class="card">
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.question)}</p>
      <p class="muted">${alreadySolved ? "I har allerede løst denne post (ingen ekstra point)." : "Svar for at få feedback og ledetråd."}</p>

      <form method="POST" action="/t/${encodeURIComponent(req.params.teamId)}/p/${post.id}">
        <label class="muted">Vælg svar</label>
        <select name="answer_index" required>${options}</select>
        <div style="height:10px"></div>
        <button type="submit">Send svar</button>
      </form>
    </div>
  `));
});

app.post("/t/:teamId/p/:postId", (req, res) => {
  const team = teams[req.params.teamId];
  const post = getPost(req.params.postId);
  if (!team || !post) return res.status(404).send(layout("Ikke fundet", `<div class="card"><h1>Ikke fundet</h1></div>`));

  const answerIndex = Number(req.body.answer_index);
  const isCorrect = answerIndex === post.correctIndex;

  if (!isCorrect) {
    return res.send(layout("Forkert", `
      <div class="card bad">
        <h2>❌ Ikke korrekt</h2>
        <p class="muted">Prøv igen eller gå videre.</p>
        <div class="row">
          <a class="btn" href="/t/${encodeURIComponent(req.params.teamId)}/p/${post.id}">Tilbage til posten</a>
          <a class="btn" href="/t/${encodeURIComponent(req.params.teamId)}">Til oversigt</a>
        </div>
      </div>
    `));
  }

  // Correct: only award once per team+post
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
      <div class="row">
        <a class="btn" href="/t/${encodeURIComponent(req.params.teamId)}">Til oversigt</a>
        <a class="btn" href="/admin?key=${encodeURIComponent(ADMIN_KEY)}">GM-dashboard</a>
      </div>
    </div>
  `));
});

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
    .map(([id, t]) => ({ id, ...t, solvedCount: t.solved.size }))
    .sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);

  const leaderboard = rows.map((t, i) => `
    <li><strong>#${i + 1}</strong> ${escapeHtml(t.name)} — <code>${t.score}</code> point (<code>${t.solvedCount}</code> poster)</li>
  `).join("");

  res.send(layout("GM-dashboard", `
    <div class="card">
      <h1>GM-dashboard (POC)</h1>
      <p class="muted">Live leaderboard (POC – nul database).</p>
      <ul>${leaderboard}</ul>
      <p class="muted">Tip: Admin link: <code>/admin?key=...</code></p>
    </div>
  `));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port", PORT));
