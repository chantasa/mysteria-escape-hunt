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
   POSTS (Lokationer)
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
  question: "Indtast jeres svar:",
  correctAnswer: `SVAR${i + 1}`,
  hint1: "Hint 1: Tænk simpelt.",
  hint2: "Hint 2: Svaret er tættere på end I tror."
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

/* ============================
   LAYOUT
============================ */
function layout(title, body) {
  return `
  <html>
  <head>
    <title>${title}</title>
    <style>
      body {
        background: radial-gradient(circle at top, #0f1b17, #060a08);
        color: #f2e8c8;
        font-family: "Georgia", serif;
        padding: 30px;
      }
      .card {
        background: #0f1b17;
        border: 1px solid #2e4a3d;
        padding: 20px;
        border-radius: 14px;
        margin-bottom: 20px;
      }
      h1, h2 { color: #d4b26a; }
      button {
        background: #1f332a;
        border: 1px solid #3f6b58;
        color: #f2e8c8;
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
      }
      input {
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #3f6b58;
        background: #08110e;
        color: white;
      }
      a { color: #d4b26a; text-decoration: none; }
    </style>
  </head>
  <body>
    ${body}
  </body>
  </html>
  `;
}

/* ============================
   LOGIN
============================ */

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
  res.send(layout("Login", `
    <div class="card">
      <h1>Mysteria</h1>
      <p>Indtast jeres holdkode</p>
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

/* ============================
   HOLDNAVN
============================ */

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
    posts: {}
  };
  res.redirect(`/intro/${req.params.code}`);
});

/* ============================
   INTRO
============================ */

app.get("/intro/:code", (req, res) => {
  const team = teams[req.params.code];
  res.send(layout("Intro", `
    <div class="card">
      <h1>Velkommen ${team.name}</h1>
      <p>Skoven kalder... Kun de mest værdige vil bestå prøverne.</p>
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
    return res.send(layout("Venter", `<div class="card"><h2>Spillet er ikke startet endnu.</h2></div>`));
  }

  const team = teams[req.params.code];

  const posts = POSTS.map(p =>
    `<li><a href="/post/${req.params.code}/${p.id}">${p.title}</a></li>`
  ).join("");

  res.send(layout("Spil", `
    <div class="card">
      <h1>${team.name}</h1>
      <p><strong>Jeres point:</strong> ${team.score}</p>
    </div>
    <div class="card">
      <h2>Lokationer</h2>
      <ul>${posts}</ul>
    </div>
  `));
});

/* ============================
   GM
============================ */

app.get("/admin", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.send("No access");

  const list = Object.entries(teams)
    .map(([code, t]) => `<li>${t.name} (${code}) – ${t.score}</li>`)
    .join("");

  res.send(layout("GM", `
    <div class="card">
      <h1>GM Dashboard</h1>
      <form method="POST" action="/admin/start?key=${ADMIN_KEY}">
        <button>Start spil</button>
      </form>
      <ul>${list}</ul>
    </div>
  `));
});

app.post("/admin/start", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.send("No access");
  gameState.status = "running";
  gameState.startTime = now();
  gameState.endTime = now() + GAME_MINUTES * 60 * 1000;
  res.redirect(`/admin?key=${ADMIN_KEY}`);
});

app.listen(3000, () => console.log("Mysteria running"));
