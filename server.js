import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));

/**
 * Admin key: ligger i Railway Variables.
 */
const ADMIN_KEY = process.env.ADMIN_KEY || "dev-admin-key";

/**
 * Spilvarighed (minutter)
 */
const GAME_MINUTES = 75;

/**
 * Faste holdkoder (genbruges igen og igen)
 */
const TEAM_CODES = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  return { code: `HOLD${n}`, name: `Hold ${n}` };
});

/**
 * Poster (fritekst). Forkert svar = -1 point.
 * Når post er løst korrekt, kan man ikke svare igen.
 */
const POSTS = [
  {
    id: 1,
    title: "Post 1 – Skovkanten",
    question: "Hvilket symbol fandt I?",
    answers: ["TIMEGLAS", "TIME GLAS"],
    clue: "Ledetråd: I kan udelukke PERSON C.",
    points: 10,
    hint: "Tip: Symbolet handler om tid.",
  },
  {
    id: 2,
    title: "Post 2 – Lysningen",
    question: "Hvilken retning peger pilene samlet set?",
    answers: ["NORD"],
    clue: "Ledetråd: GENSTAND B var ikke involveret.",
    points: 10,
  },
  {
    id: 3,
    title: "Post 3 – Stenringen",
    question: "Hvilken farve-sekvens var korrekt?",
    answers: ["GRØN-RØD-BLÅ", "GRØN RØD BLÅ", "GRØN,RØD,BLÅ"],
    clue: "Ledetråd: Hændelsen skete IKKE ved STED D.",
    points: 10,
    hint: "Skriv fx: GRØN-RØD-BLÅ",
  },
];

/**
 * Slutvalg (billeder/tiles). Kun 1 forsøg pr. hold.
 * Rigtigt = +40, forkert = 0.
 *
 * imageUrl kan være tom => så viser vi en pæn “placeholder”.
 * Når du har rigtige billeder, sæt en URL ind (https://...).
 */
const FINAL = {
  title: "Slutvalg",
  question: "Hvem / hvad var den rigtige løsning?",
  correctId: "suspect_b",
  pointsCorrect: 40,
  options: [
    { id: "suspect_a", label: "Mistænkt A", imageUrl: "" },
    { id: "suspect_b", label: "Mistænkt B", imageUrl: "" },
    { id: "suspect_c", label: "Mistænkt C", imageUrl: "" },
    { id: "suspect_d", label: "Mistænkt D", imageUrl: "" },
  ],
};

/**
 * In-memory state
 */
const teams = {};
for (const t of TEAM_CODES) {
  teams[t.code] = {
    name: t.name,
    score: 0,
    solved: new Set(), // postId
    attempts: new Map(), // postId -> count (forkerte + korrekte)
    finalSubmitted: false,
    finalChoiceId: null,
    finalCorrect: null,
  };
}

/**
 * Game state
 * idle -> running -> ended
 */
const gameState = {
  status: "idle",
  startTimeMs: null,
  endTimeMs: null,
};

function nowMs() {
  return Date.now();
}

function isRunning() {
  if (gameState.status !== "running") return false;
  if (gameState.endTimeMs && nowMs() >= gameState.endTimeMs) {
    // auto-end når tiden er gået
    gameState.status = "ended";
    return false;
  }
  return true;
}

function isEnded() {
  // Sørg for auto-end at slå igennem
  if (gameState.status === "running") isRunning();
  return gameState.status === "ended";
}

function msToClock(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function timeLeftMs() {
  if (!isRunning()) return 0;
  return Math.max(0, gameState.endTimeMs - nowMs());
}

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeAnswer(text) {
  return String(text || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
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
  return POSTS.find((p) => p.id === Number(id));
}

function resetAllTeamsAndGame() {
  for (const code of Object.keys(teams)) {
    teams[code].score = 0;
    teams[code].solved = new Set();
    teams[code].attempts = new Map();
    teams[code].finalSubmitted = false;
    teams[code].finalChoiceId = null;
    teams[code].finalCorrect = null;
  }
  gameState.status = "idle";
  gameState.startTimeMs = null;
  gameState.endTimeMs = null;
}

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
    .wrap { max-width: 860px; margin: 0 auto; padding: 18px; }
    .card { background: #121a20; border: 1px solid #22313c; border-radius: 14px; padding: 16px; margin: 14px 0; }
    a { color: #8cc4ff; text-decoration: none; }
    .btn { display: inline-block; border: 1px solid #2c3f4d; background: #18222b; color: #e9eef2; padding: 10px 12px; border-radius: 12px; }
    .btn:hover { background: #1c2a35; }
    input, button { width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #2c3f4d; background: #0f151a; color: #e9eef2; font-size: 1rem; }
    button { background: #1a2a35; cursor: pointer; }
    button:hover { background: #203443; }
    .muted { color: #aab7c4; }
    .ok { border-left: 4px solid #29c46f; padding-left: 10px; }
    .bad { border-left: 4px solid #ff6b6b; padding-left: 10px; }
    .warn { border-left: 4px solid #f6c445; padding-left: 10px; }
    ul { padding-left: 18px; }
    code { background: #0f151a; padding: 2px 6px; border-radius: 8px; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .small { font-size: 0.95rem; }
    .two { display:grid; grid-template-columns: 1fr; gap:10px; }
    @media (min-width: 640px){ .two{ grid-template-columns: 1fr 1fr; } }
    .grid { display:grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 700px){ .grid{ grid-template-columns: 1fr 1fr; } }
    .tile { border: 1px solid #22313c; border-radius: 14px; overflow: hidden; background: #0f151a; }
    .tile .img {
      height: 160px;
      background: linear-gradient(135deg, #18222b, #0b0f12);
      display:flex; align-items:center; justify-content:center;
      color:#aab7c4; font-weight:600; letter-spacing: .02em;
    }
    .tile img { width:100%; height:160px; object-fit:cover; display:block; }
    .tile .label { padding: 10px; display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .tile button { margin: 10px; width: calc(100% - 20px); }
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

/**
 * ROUTES
 */

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
  res.send(
    layout(
      "Log ind",
      `
    <div class="card">
      <h1>Mysteria – Spil-login</h1>
      <p class="muted">Indtast jeres holdkode (fx <code>HOLD3</code>).</p>
      <form method="POST" action="/login">
        <label class="muted">Holdkode</label>
        <input name="team_code" placeholder="HOLD1" autocomplete="off" required />
        <button type="submit" style="margin-top:10px;">Start</button>
      </form>
      <p class="muted small" style="margin-top:12px;">GM-dashboard: <code>/admin?key=...</code></p>
    </div>
  `
    )
  );
});

app.post("/login", (req, res) => {
  const code = normalizeCode(req.body.team_code);
  if (!teams[code]) {
    return res.status(400).send(
      layout(
        "Forkert holdkode",
        `
      <div class="card bad">
        <h2>❌ Holdkoden findes ikke</h2>
        <p class="muted">Tjek at I har skrevet den rigtigt (fx <code>HOLD1</code>).</p>
        <a class="btn" href="/login">Prøv igen</a>
      </div>
    `
      )
    );
  }
  res.redirect(`/t/${encodeURIComponent(code)}`);
});

function gameBannerHtml() {
  if (gameState.status === "idle") {
    return `<div class="card warn"><h2>⏳ Spillet er ikke startet endnu</h2><p class="muted">Vent på at GM starter spillet.</p></div>`;
  }
  if (isRunning()) {
    return `<div class="card"><div class="row"><h2 style="margin:0;">⏱️ Tid tilbage</h2><code>${msToClock(
      timeLeftMs()
    )}</code></div><p class="muted">I kan løse poster indtil tiden udløber.</p></div>`;
  }
  return `<div class="card warn"><h2>⛔ Spillet er slut</h2><p class="muted">Poster er låst. Afgiv jeres endelige svar hos GM.</p></div>`;
}

app.get("/t/:teamCode", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  if (!team)
    return res
      .status(404)
      .send(layout("Ukendt hold", `<div class="card"><h1>Ukendt hold</h1></div>`));

  const banner = gameBannerHtml();

  const list = POSTS.map((p) => {
    const solved = team.solved.has(p.id);
    const attempts = team.attempts.get(p.id) || 0;
    const locked = !isRunning();
    const statusText = solved ? "✅ Løst" : locked ? "🔒 Låst" : "Ikke løst";

    return `
      <div class="card">
        <h2>${escapeHtml(p.title)}</h2>
        <p class="muted">${statusText} • Forsøg: <code>${attempts}</code></p>
        <a class="btn" href="/t/${encodeURIComponent(code)}/p/${p.id}">Gå til posten</a>
      </div>
    `;
  }).join("");

  const finalStatus = team.finalSubmitted
    ? `<p class="muted">Endeligt svar: <code>afgivet</code> (${team.finalCorrect ? "✅ registreret" : "✅ registreret"})</p>`
    : `<p class="muted">Endeligt svar: <code>ikke afgivet</code></p>`;

  const finalLink = isEnded()
    ? `<a class="btn" href="/t/${encodeURIComponent(code)}/final">Afgiv jeres endelige svar</a>`
    : `<span class="muted small">Det endelige svar åbner, når tiden er gået.</span>`;

  res.send(
    layout(
      team.name,
      `
    <div class="card">
      <h1>${escapeHtml(team.name)}</h1>
      <p class="muted">Holdkode: <code>${escapeHtml(code)}</code></p>
      ${finalStatus}
      <div class="row">
        <a class="btn" href="/login">Skift hold</a>
        ${finalLink}
      </div>
    </div>

    ${banner}
    ${list}
  `
    )
  );
});

app.get("/t/:teamCode/p/:postId", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  const post = getPost(req.params.postId);
  if (!team || !post)
    return res
      .status(404)
      .send(layout("Ikke fundet", `<div class="card"><h1>Ikke fundet</h1></div>`));

  const solved = team.solved.has(post.id);
  const locked = !isRunning();
  const attempts = team.attempts.get(post.id) || 0;

  if (locked) {
    return res.send(
      layout(
        post.title,
        `
      <div class="card">
        <div class="row">
          <a class="btn" href="/t/${encodeURIComponent(code)}">← Tilbage</a>
          ${isEnded() ? `<a class="btn" href="/t/${encodeURIComponent(code)}/final">Afgiv jeres endelige svar</a>` : ""}
        </div>
      </div>
      ${gameBannerHtml()}
      <div class="card warn">
        <h2>🔒 Posten er låst</h2>
        <p class="muted">I kan kun løse poster, mens spillet kører.</p>
      </div>
    `
      )
    );
  }

  if (solved) {
    return res.send(
      layout(
        post.title,
        `
      <div class="card">
        <div class="row">
          <a class="btn" href="/t/${encodeURIComponent(code)}">← Tilbage</a>
        </div>
      </div>
      <div class="card ok">
        <h2>✅ Posten er allerede løst</h2>
        <p class="muted">Forsøg: <code>${attempts}</code></p>
        <p class="muted">I kan ikke svare igen på denne post.</p>
      </div>
    `
      )
    );
  }

  res.send(
    layout(
      post.title,
      `
    <div class="card">
      <div class="row">
        <a class="btn" href="/t/${encodeURIComponent(code)}">← Tilbage</a>
      </div>
    </div>

    ${gameBannerHtml()}

    <div class="card">
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.question)}</p>
      <p class="muted">I får feedback med det samme. Når I rammer korrekt, låses posten.</p>

      <form method="POST" action="/t/${encodeURIComponent(code)}/p/${post.id}">
        <label class="muted">Skriv jeres svar</label>
        <input name="answer_text" placeholder="Skriv svar her" autocomplete="off" required />
        <button type="submit" style="margin-top:10px;">Send svar</button>
      </form>

      ${post.hint ? `<p class="muted small" style="margin-top:10px;">${escapeHtml(post.hint)}</p>` : ""}
      <p class="muted small">Forsøg indtil nu: <code>${attempts}</code></p>
    </div>
  `
    )
  );
});

app.post("/t/:teamCode/p/:postId", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  const post = getPost(req.params.postId);
  if (!team || !post)
    return res
      .status(404)
      .send(layout("Ikke fundet", `<div class="card"><h1>Ikke fundet</h1></div>`));

  if (!isRunning()) {
    return res.send(
      layout(
        "Låst",
        `
      ${gameBannerHtml()}
      <div class="card warn">
        <h2>🔒 Tiden er gået</h2>
        <p class="muted">I kan ikke indsende svar længere.</p>
        <a class="btn" href="/t/${encodeURIComponent(code)}">Tilbage</a>
      </div>
    `
      )
    );
  }

  if (team.solved.has(post.id)) {
    return res.send(
      layout(
        "Allerede løst",
        `
      <div class="card ok">
        <h2>✅ Allerede løst</h2>
        <p class="muted">I kan ikke svare igen på denne post.</p>
        <a class="btn" href="/t/${encodeURIComponent(code)}">Tilbage</a>
      </div>
    `
      )
    );
  }

  // registrér forsøg
  const prevAttempts = team.attempts.get(post.id) || 0;
  team.attempts.set(post.id, prevAttempts + 1);

  const submitted = normalizeAnswer(req.body.answer_text);
  const accepted = (post.answers || []).map(normalizeAnswer);
  const correct = accepted.includes(submitted);

  if (!correct) {
    // -1 point pr forkert (skjult for spillere)
    team.score -= 1;

    return res.send(
      layout(
        "Ikke korrekt",
        `
      ${gameBannerHtml()}
      <div class="card bad">
        <h2>❌ Ikke korrekt</h2>
        <p class="muted">I skrev: <code>${escapeHtml(submitted)}</code></p>
        <p class="muted">Prøv igen eller gå videre.</p>
        <div class="two">
          <a class="btn" href="/t/${encodeURIComponent(code)}/p/${post.id}">Prøv igen</a>
          <a class="btn" href="/t/${encodeURIComponent(code)}">Til oversigt</a>
        </div>
      </div>
    `
      )
    );
  }

  // korrekt: giv point én gang og lås posten (skjult for spillere)
  team.solved.add(post.id);
  team.score += post.points;

  return res.send(
    layout(
      "Korrekt",
      `
    ${gameBannerHtml()}
    <div class="card ok">
      <h2>✅ Korrekt</h2>
      <p>${escapeHtml(post.clue)}</p>
      <div class="two">
        <a class="btn" href="/t/${encodeURIComponent(code)}">Til oversigt</a>
      </div>
    </div>
  `
    )
  );
});

/**
 * FINAL (kun når spil er slut)
 */
app.get("/t/:teamCode/final", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  if (!team)
    return res
      .status(404)
      .send(layout("Ukendt hold", `<div class="card"><h1>Ukendt hold</h1></div>`));

  // ⭐ tving auto-slut når tiden er gået
  isRunning();

  if (!isEnded()) {
    return res.send(
      layout(
        "Slutvalg låst",
        `
      <div class="card warn">
        <h2>⛔ Det endelige svar er ikke åbent endnu</h2>
        <p class="muted">Gå tilbage til GM, når tiden er gået.</p>
        <a class="btn" href="/t/${encodeURIComponent(code)}">Tilbage</a>
      </div>
    `
      )
    );
  }

  if (team.finalSubmitted) {
    return res.send(
      layout(
        "Endeligt svar afgivet",
        `
      <div class="card ok">
        <h2>✅ Jeres endelige svar er registreret</h2>
        <p class="muted">I kan ikke ændre det.</p>
        <a class="btn" href="/t/${encodeURIComponent(code)}">Tilbage til oversigt</a>
      </div>
    `
      )
    );
  }

  const tiles = FINAL.options
    .map((opt) => {
      const hasImg = !!opt.imageUrl;
      const imgHtml = hasImg
        ? `<img src="${escapeHtml(opt.imageUrl)}" alt="${escapeHtml(opt.label)}" />`
        : `<div class="img">BILLEDE</div>`;

      return `
      <div class="tile">
        ${imgHtml}
        <div class="label">
          <div><strong>${escapeHtml(opt.label)}</strong></div>
        </div>
        <form method="POST" action="/t/${encodeURIComponent(code)}/final">
          <input type="hidden" name="choice_id" value="${escapeHtml(opt.id)}" />
          <button type="submit">Vælg</button>
        </form>
      </div>
    `;
    })
    .join("");

  res.send(
    layout(
      "Afgiv endeligt svar",
      `
    <div class="card">
      <div class="row">
        <a class="btn" href="/t/${encodeURIComponent(code)}">← Tilbage</a>
      </div>
    </div>

    <div class="card">
      <h1>${escapeHtml(FINAL.title)}</h1>
      <p>${escapeHtml(FINAL.question)}</p>
      <p class="muted">I har <code>kun 1 forsøg</code>. Vælg med omhu.</p>
    </div>

    <div class="grid">
      ${tiles}
    </div>
  `
    )
  );
});

app.post("/t/:teamCode/final", (req, res) => {
  const code = normalizeCode(req.params.teamCode);
  const team = teams[code];
  if (!team)
    return res
      .status(404)
      .send(layout("Ukendt hold", `<div class="card"><h1>Ukendt hold</h1></div>`));

  // tving auto-slut når tiden er gået
  isRunning();

  if (!isEnded()) {
    return res.status(400).send(
      layout(
        "Ikke åbent",
        `
      <div class="card warn">
        <h2>⛔ Det endelige svar er ikke åbent endnu</h2>
        <a class="btn" href="/t/${encodeURIComponent(code)}">Tilbage</a>
      </div>
    `
      )
    );
  }

  if (team.finalSubmitted) {
    return res.redirect(`/t/${encodeURIComponent(code)}/final`);
  }

  const choice = String(req.body.choice_id || "");
  team.finalSubmitted = true;
  team.finalChoiceId = choice;
  team.finalCorrect = choice === FINAL.correctId;

  // point gives/skjules (kun GM ser det)
  if (team.finalCorrect) {
    team.score += FINAL.pointsCorrect;
  }

  return res.send(
    layout(
      "Registreret",
      `
    <div class="card ok">
      <h2>✅ Jeres endelige svar er registreret</h2>
      <p class="muted">Tak. I kan ikke ændre det.</p>
      <a class="btn" href="/t/${encodeURIComponent(code)}">Tilbage til oversigt</a>
    </div>
  `
    )
  );
});

/**
 * ADMIN
 */
function requireAdmin(req, res) {
  if (req.query.key !== ADMIN_KEY) {
    res.status(401).send(
      layout(
        "Ingen adgang",
        `
      <div class="card">
        <h1>Ingen adgang</h1>
        <p class="muted">Forkert nøgle.</p>
      </div>
    `
      )
    );
    return false;
  }
  return true;
}

app.get("/admin", (req, res) => {
  if (!requireAdmin(req, res)) return;

  // sørg for auto-end opdatering
  isRunning();

  const rows = Object.entries(teams)
    .map(([code, t]) => ({
      code,
      name: t.name,
      score: t.score,
      solvedCount: t.solved.size,
      finalSubmitted: t.finalSubmitted,
      finalCorrect: t.finalCorrect,
    }))
    .sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);

  const leaderboard = rows
    .map(
      (t, i) => `
    <li>
      <strong>#${i + 1}</strong> ${escapeHtml(t.name)} (<code>${escapeHtml(t.code)}</code>) —
      <code>${t.score}</code> point • poster: <code>${t.solvedCount}</code> • slutvalg:
      ${t.finalSubmitted ? (t.finalCorrect ? "✅" : "❌") : "—"}
    </li>
  `
    )
    .join("");

  let statusText = "";
  if (gameState.status === "idle") statusText = "⏳ Ikke startet";
  if (isRunning())
    statusText = `⏱️ Kører • tid tilbage: ${msToClock(timeLeftMs())}`;
  if (isEnded()) statusText = "⛔ Tiden er gået • Slutvalg er åbent";

  res.send(
    layout(
      "GM-dashboard",
      `
    <div class="card">
      <h1>GM-dashboard</h1>
      <p class="muted">Status: <code>${escapeHtml(statusText)}</code></p>

      <div class="two">
        <form method="POST" action="/admin/start?key=${encodeURIComponent(ADMIN_KEY)}">
          <button type="submit" ${gameState.status === "idle" ? "" : "disabled"}>Start spil (${GAME_MINUTES} min)</button>
        </form>

        <form method="POST" action="/admin/end?key=${encodeURIComponent(ADMIN_KEY)}">
          <button type="submit" ${isEnded() ? "disabled" : ""}>Nødstops-knap (åbn slutvalg nu)</button>
        </form>
      </div>
      <p class="muted small" style="margin-top:10px;">
        Slutvalg åbner automatisk, når tiden er gået. Nødstops-knappen er kun backup.
      </p>
    </div>

    <div class="card">
      <h2>Leaderboard</h2>
      <ul>${leaderboard}</ul>
    </div>

    <div class="card warn">
      <h2>Reset (før ny event)</h2>
      <p class="muted">Nulstiller alle hold + spilstatus.</p>
      <form method="POST" action="/admin/reset?key=${encodeURIComponent(ADMIN_KEY)}">
        <button type="submit">Reset alt</button>
      </form>
    </div>
  `
    )
  );
});

app.post("/admin/start", (req, res) => {
  if (!requireAdmin(req, res)) return;

  if (gameState.status === "idle") {
    gameState.status = "running";
    gameState.startTimeMs = nowMs();
    gameState.endTimeMs = gameState.startTimeMs + GAME_MINUTES * 60 * 1000;
  }
  res.redirect(`/admin?key=${encodeURIComponent(ADMIN_KEY)}`);
});

app.post("/admin/end", (req, res) => {
  if (!requireAdmin(req, res)) return;

  // end uanset om den kører/idle
  gameState.status = "ended";
  res.redirect(`/admin?key=${encodeURIComponent(ADMIN_KEY)}`);
});

app.post("/admin/reset", (req, res) => {
  if (!requireAdmin(req, res)) return;
  resetAllTeamsAndGame();
  res.redirect(`/admin?key=${encodeURIComponent(ADMIN_KEY)}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port", PORT));
