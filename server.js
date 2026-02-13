import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));

const ADMIN_KEY = process.env.ADMIN_KEY || "dev-admin-key";
const GAME_MINUTES = 75;

/* =============================
   TEAM CODES
============================= */
const TEAM_CODES = Array.from({ length: 10 }, (_, i) => `HOLD${i + 1}`);

/* =============================
   POSTS
============================= */
const POSTS = [
  "Dragernes Dal",
  "Den Dunkle Sti",
  "Runernes Lysning",
  "Den Tavse Kilde",
  "Skyggernes Kreds",
  "Måneporten",
  "Den Glemte Høj",
  "Skovens Puls",
  "Den Brændte Eg",
  "Stenvogternes Plads",
  "Den Forladte Hytte",
  "Elvernes Grænse",
  "Tågernes Bro",
  "Den Hule Klippe",
  "Vildskovens Hjerte",
  "Den Faldne Sten",
  "Nordlysets Port",
  "Den Knækkede Gren",
  "Mørkets Spejl",
  "Den Sidste Ring"
].map((title, i) => ({
  id: i + 1,
  title,
  answer: `SVAR${i + 1}`
}));

/* =============================
   STATE
============================= */
const teams = {};
const gameState = {
  status: "idle",
  startTime: null,
  endTime: null
};

function now() { return Date.now(); }

function isRunning() {
  if (gameState.status !== "running") return false;
  if (now() >= gameState.endTime) {
    gameState.status = "ended";
    return false;
  }
  return true;
}

function timeLeft() {
  if (!isRunning()) return 0;
  return Math.max(0, gameState.endTime - now());
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function layout(title, body, autoRefresh = false) {
  return `
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${autoRefresh ? `<meta http-equiv="refresh" content="5">` : ""}
    <title>${title}</title>
    <style>
      body {
        margin:0;
        min-height:100vh;
        display:flex;
        justify-content:center;
        background: radial-gradient(circle at top, #0f1b17, #060a08);
        color: #f2e8c8;
        font-family: Georgia, serif;
      }

      .container { width:100%; max-width:900px; padding:20px; }

      .card {
        background:#0f1b17;
        border:1px solid #2e4a3d;
        padding:20px;
        border-radius:16px;
        margin-bottom:20px;
        box-shadow:0 0 20px rgba(0,0,0,0.4);
      }

      h1, h2 { color:#d4b26a; margin-top:0; }

      input {
        padding:10px;
        border-radius:8px;
        border:1px solid #3f6b58;
        background:#08110e;
        color:white;
        width:100%;
        margin-bottom:10px;
      }

      button {
        background:#1f332a;
        border:1px solid #3f6b58;
        color:#f2e8c8;
        padding:10px 16px;
        border-radius:10px;
        cursor:pointer;
        width:100%;
      }

      a { text-decoration:none; color:inherit; }

      .grid {
        display:grid;
        grid-template-columns: repeat(2, 1fr);
        gap:12px;
        margin-top:20px;
      }

      @media (min-width:800px){
        .grid { grid-template-columns: repeat(4, 1fr); }
      }

      .post-box {
        border-radius:16px;
        background: linear-gradient(145deg, #162820, #0f1b17);
        border:1px solid #2f4b3f;
        aspect-ratio:1/1;
        display:flex;
        justify-content:center;
        align-items:center;
        transition:0.2s ease;
      }

      .post-box.solved {
        background: linear-gradient(145deg, #2e4a3d, #1c3027);
        border-color:#6ca889;
      }

      .post-inner {
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:6px;
        text-align:center;
      }

      .post-number { font-size:1.2rem; font-weight:700; color:#d4b26a; }
      .post-name { font-size:0.9rem; color:#fff6cc; }

      .score { font-size:1.1rem; margin-top:10px; }

      .leaderboard li { margin-bottom:6px; }
    </style>
  </head>
  <body>
    <div class="container">
      ${body}
    </div>
  </body>
  </html>
  `;
}

/* =============================
   LOGIN FLOW
============================= */

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
  res.send(layout("Login", `
    <div class="card">
      <h1>Mysteria</h1>
      <form method="POST">
        <input name="code" required placeholder="HOLD1"/>
        <button>Fortsæt</button>
      </form>
    </div>
  `));
});

app.post("/login", (req, res) => {
  const code = (req.body.code || "").toUpperCase().trim();
  if (!TEAM_CODES.includes(code)) {
    return res.send(layout("Fejl", `<div class="card"><h2>Ugyldig kode</h2></div>`));
  }
  res.redirect(`/teamname/${code}`);
});

app.get("/teamname/:code", (req, res) => {
  res.send(layout("Holdnavn", `
    <div class="card">
      <h1>Vælg jeres holdnavn</h1>
      <form method="POST">
        <input name="name" required/>
        <button>Fortsæt</button>
      </form>
    </div>
  `));
});

app.post("/teamname/:code", (req, res) => {
  teams[req.params.code] = {
    name: req.body.name,
    score: 50,
    solved: new Set()
  };
  res.redirect(`/game/${req.params.code}`);
});

/* =============================
   GAME OVERVIEW
============================= */

app.get("/game/:code", (req, res) => {
  if (!isRunning()) {
    return res.send(layout("Venter", `
      <div class="card"><h2>Spillet er ikke startet endnu.</h2></div>
    `));
  }

  const team = teams[req.params.code];

  const posts = POSTS.map((p) => {
    const solved = team.solved.has(p.id);
    return `
      <a href="/post/${req.params.code}/${p.id}">
        <div class="post-box ${solved ? "solved" : ""}">
          <div class="post-inner">
            <div class="post-number">${p.id}</div>
            <div class="post-name">${p.title}</div>
          </div>
        </div>
      </a>
    `;
  }).join("");

  res.send(layout("Spil", `
    <div class="card">
      <h1>${team.name}</h1>
      <div class="score">Point: <strong>${team.score}</strong></div>
      <div>⏱ ${formatTime(timeLeft())}</div>
    </div>

    <div class="grid">
      ${posts}
    </div>
  `));
});

/* =============================
   POST PAGE
============================= */

app.get("/post/:code/:id", (req, res) => {
  const team = teams[req.params.code];
  const post = POSTS.find(p => p.id == req.params.id);

  if (!post) return res.send("Post ikke fundet");

  if (team.solved.has(post.id)) {
    return res.send(layout("Løst", `
      <div class="card">
        <h2>Posten er allerede løst</h2>
        <a href="/game/${req.params.code}"><button>Tilbage</button></a>
      </div>
    `));
  }

  res.send(layout(post.title, `
    <div class="card">
      <h2>${post.title}</h2>
      <form method="POST">
        <input name="answer" placeholder="Indtast svar"/>
        <button>Send</button>
      </form>
      <a href="/game/${req.params.code}"><button>Tilbage</button></a>
    </div>
  `));
});

app.post("/post/:code/:id", (req, res) => {
  const team = teams[req.params.code];
  const post = POSTS.find(p => p.id == req.params.id);
  const answer = (req.body.answer || "").toUpperCase().trim();

  if (answer === post.answer) {
    team.score += 100;
    team.solved.add(post.id);
    return res.send(layout("Korrekt", `
      <div class="card">
        <h2>Tillykke! +100 point</h2>
        <a href="/game/${req.params.code}"><button>Videre</button></a>
      </div>
    `));
  } else {
    team.score -= 5;
    return res.send(layout("Forkert", `
      <div class="card">
        <h2>Forkert svar. -5 point</h2>
        <a href="/post/${req.params.code}/${post.id}"><button>Prøv igen</button></a>
      </div>
    `));
  }
});

/* =============================
   GM DASHBOARD
============================= */

app.get("/admin", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.send("Ingen adgang");

  const leaderboard = Object.entries(teams)
    .sort((a,b) => b[1].score - a[1].score)
    .map(([code, t], i) =>
      `<li>#${i+1} ${t.name} (${code}) – ${t.score} point</li>`
    ).join("");

  let statusText = "Ikke startet";
  if (isRunning()) statusText = "Kører – Tid tilbage: " + formatTime(timeLeft());
  if (gameState.status === "ended") statusText = "Tiden er gået";

  res.send(layout("GM", `
    <div class="card">
      <h1>GM Dashboard</h1>
      <div>Status: ${statusText}</div>
      <form method="POST" action="/admin/start?key=${ADMIN_KEY}">
        <button>Start spil (${GAME_MINUTES} min)</button>
      </form>
      <form method="POST" action="/admin/end?key=${ADMIN_KEY}">
        <button>Nødstop</button>
      </form>
      <form method="POST" action="/admin/reset?key=${ADMIN_KEY}">
        <button>Reset</button>
      </form>
    </div>

    <div class="card">
      <h2>Leaderboard</h2>
      <ul class="leaderboard">
        ${leaderboard}
      </ul>
    </div>
  `, true));
});

app.post("/admin/start", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.send("Ingen adgang");
  gameState.status = "running";
  gameState.startTime = now();
  gameState.endTime = now() + GAME_MINUTES * 60 * 1000;
  res.redirect(`/admin?key=${ADMIN_KEY}`);
});

app.post("/admin/end", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.send("Ingen adgang");
  gameState.status = "ended";
  res.redirect(`/admin?key=${ADMIN_KEY}`);
});

app.post("/admin/reset", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.send("Ingen adgang");
  for (let k in teams) delete teams[k];
  gameState.status = "idle";
  res.redirect(`/admin?key=${ADMIN_KEY}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Mysteria running on", PORT));
