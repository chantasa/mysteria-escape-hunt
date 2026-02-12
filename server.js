import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));

const ADMIN_KEY = process.env.ADMIN_KEY || "dev-admin-key";
const GAME_MINUTES = 75;

/* ============================
   TEAM CODES
============================ */
const TEAM_CODES = Array.from({ length: 10 }, (_, i) => `HOLD${i + 1}`);

/* ============================
   POSTS
============================ */
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
  correctAnswer: `SVAR${i + 1}`
}));

/* ============================
   STATE
============================ */
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

/* ============================
   LAYOUT
============================ */
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
        font-family: "Georgia", serif;
      }

      .container {
        width:100%;
        max-width:1100px;
        padding:20px;
      }

      .card {
        background:#0f1b17;
        border:1px solid #2e4a3d;
        padding:20px;
        border-radius:16px;
        margin-bottom:20px;
        box-shadow:0 0 20px rgba(0,0,0,0.4);
      }

      h1, h2 { color:#d4b26a; }

      button {
        background:#1f332a;
        border:1px solid #3f6b58;
        color:#f2e8c8;
        padding:10px 16px;
        border-radius:10px;
        cursor:pointer;
      }

      input {
        padding:10px;
        border-radius:8px;
        border:1px solid #3f6b58;
        background:#08110e;
        color:white;
        width:100%;
      }

      .score {
        font-size:1.2rem;
        margin-top:10px;
      }

     .grid {
  display:grid;
  grid-template-columns: repeat(5, 1fr);
  gap:18px;
}

@media (max-width:900px){
  .grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width:600px){
  .grid { grid-template-columns: repeat(2, 1fr); }
}

.post-box {
  background: linear-gradient(145deg, #162820, #0f1b17);
  border: 1px solid #3f6b58;
  border-radius: 16px;
  height: 120px;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:15px;
  font-size:1rem;
  font-weight:600;
  color:#f7f1d0;
  letter-spacing:0.3px;
  transition:0.25s ease;
}

.post-box:hover {
  background: linear-gradient(145deg, #1f3a30, #14241d);
  transform: translateY(-4px);
  box-shadow:0 6px 18px rgba(0,0,0,0.6);
  border-color:#6ca889;
}

.post-box strong {
  color:#fff6cc;
}

      .leaderboard li {
        margin-bottom:8px;
      }

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

/* ============================
   LOGIN FLOW
============================ */

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
    score: 50
  };
  res.redirect(`/intro/${req.params.code}`);
});

app.get("/intro/:code", (req, res) => {
  const team = teams[req.params.code];
  res.send(layout("Intro", `
    <div class="card">
      <h1>Velkommen ${team.name}</h1>
      <p>Kun de mest værdige vil samle flest point.</p>
      <form method="POST">
        <button>Træd ind i skoven</button>
      </form>
    </div>
  `));
});

app.post("/intro/:code", (req, res) => {
  res.redirect(`/game/${req.params.code}`);
});

/* ============================
   GAME
============================ */

app.get("/game/:code", (req, res) => {
  if (!isRunning()) {
    return res.send(layout("Venter", `
      <div class="card"><h2>Spillet er ikke startet endnu.</h2></div>
    `));
  }

  const team = teams[req.params.code];

  const posts = POSTS.map(p => `
    <a href="#">
      <div class="post-box">
        <strong>${p.id}. ${p.title}</strong>
      </div>
    </a>
  `).join("");

  res.send(layout("Spil", `
    <div class="card">
      <h1>${team.name}</h1>
      <div class="score">Jeres point: <strong>${team.score}</strong></div>
      <div>⏱ Tid tilbage: ${formatTime(timeLeft())}</div>
    </div>

    <div class="card">
      <h2>Lokationer</h2>
      <div class="grid">
        ${posts}
      </div>
    </div>
  `));
});

/* ============================
   GM DASHBOARD
============================ */

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
