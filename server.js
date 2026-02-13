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
  {
    id: 1,
    title: "Dragernes Dal",
    correctAnswer: "SVAR1",
    hints: [
      "Se efter noget, der ikke hører naturligt hjemme i dalen.",
      "Drager beskytter ofte noget værdifuldt – hvad vogter denne?"
    ]
  },
  {
    id: 2,
    title: "Den Dunkle Sti",
    correctAnswer: "SVAR2",
    hints: [
      "Når lyset forsvinder, må I bruge andre sanser.",
      "Stien skjuler noget i mørket – kig lavt."
    ]
  },
  {
    id: 3,
    title: "Runernes Lysning",
    correctAnswer: "SVAR3",
    hints: [
      "Runer skal læses i den rigtige rækkefølge.",
      "Tæl symbolerne og omdan dem til tal."
    ]
  },
  {
    id: 4,
    title: "Den Tavse Kilde",
    correctAnswer: "SVAR4",
    hints: [
      "Vand taler, selv når det er stille.",
      "Lyt – eller se på det, der spejler sig."
    ]
  },
  {
    id: 5,
    title: "Skyggernes Kreds",
    correctAnswer: "SVAR5",
    hints: [
      "Skygger ændrer sig med lyset.",
      "Hvad danner de tilsammen?"
    ]
  },
  {
    id: 6,
    title: "Måneporten",
    correctAnswer: "SVAR6",
    hints: [
      "Månen har faser – hvilken er vigtig her?",
      "Tænk i cirkler."
    ]
  },
  {
    id: 7,
    title: "Den Glemte Høj",
    correctAnswer: "SVAR7",
    hints: [
      "Gamle steder gemmer gamle hemmeligheder.",
      "Se på det ældste element omkring jer."
    ]
  },
  {
    id: 8,
    title: "Skovens Puls",
    correctAnswer: "SVAR8",
    hints: [
      "Noget gentager sig i naturen.",
      "Tæl rytmen."
    ]
  },
  {
    id: 9,
    title: "Den Brændte Eg",
    correctAnswer: "SVAR9",
    hints: [
      "Ilden efterlader spor.",
      "Hvad overlevede flammerne?"
    ]
  },
  {
    id: 10,
    title: "Stenvogternes Plads",
    correctAnswer: "SVAR10",
    hints: [
      "Sten står ikke altid tilfældigt.",
      "Se på deres placering."
    ]
  },
  {
    id: 11,
    title: "Den Forladte Hytte",
    correctAnswer: "SVAR11",
    hints: [
      "Selv tomme steder taler.",
      "Hvad mangler?"
    ]
  },
  {
    id: 12,
    title: "Elvernes Grænse",
    correctAnswer: "SVAR12",
    hints: [
      "Grænser markerer overgange.",
      "Hvad ændrer sig her?"
    ]
  },
  {
    id: 13,
    title: "Tågernes Bro",
    correctAnswer: "SVAR13",
    hints: [
      "Tåge skjuler detaljer.",
      "Se under overfladen."
    ]
  },
  {
    id: 14,
    title: "Den Hule Klippe",
    correctAnswer: "SVAR14",
    hints: [
      "Hulrum kan forstærke lyd.",
      "Er der et ekko?"
    ]
  },
  {
    id: 15,
    title: "Vildskovens Hjerte",
    correctAnswer: "SVAR15",
    hints: [
      "Midten er ofte vigtigst.",
      "Find centrum."
    ]
  },
  {
    id: 16,
    title: "Den Faldne Sten",
    correctAnswer: "SVAR16",
    hints: [
      "Noget har bevæget sig.",
      "Hvor lå det før?"
    ]
  },
  {
    id: 17,
    title: "Nordlysets Port",
    correctAnswer: "SVAR17",
    hints: [
      "Lyset bevæger sig i mønstre.",
      "Hvilket mønster ser I?"
    ]
  },
  {
    id: 18,
    title: "Den Knækkede Gren",
    correctAnswer: "SVAR18",
    hints: [
      "Brud kan være et tegn.",
      "Hvem – eller hvad – forårsagede det?"
    ]
  },
  {
    id: 19,
    title: "Mørkets Spejl",
    correctAnswer: "SVAR19",
    hints: [
      "Spejle vender ting på hovedet.",
      "Skal I læse det bagfra?"
    ]
  },
  {
    id: 20,
    title: "Den Sidste Ring",
    correctAnswer: "SVAR20",
    hints: [
      "Ringe kan symbolisere afslutning.",
      "Hvad forbinder begyndelsen og slutningen?"
    ]
  }
];


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
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createShuffledDeck() {
  return shuffle([
    "double","double","double","double","double",
    "minus","minus","minus",
    "steal","steal"
  ]);
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

  /* Links uden underline */
a {
  text-decoration: none;
  color: inherit;
}

/* GRID – mobil først */
a {
  text-decoration: none;
  color: inherit;
  display:block;         /* vigtig */
  height:100%;           /* vigtig */
}

.grid {
  display:grid;
  grid-template-columns: repeat(2, 1fr);
  gap:16px;
}

@media (min-width:700px){
  .grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width:1100px){
  .grid { grid-template-columns: repeat(5, 1fr); }
}

.post-box {
  background: linear-gradient(145deg, #162820, #0f1b17);
  border: 1px solid #3f6b58;
  border-radius: 18px;
  aspect-ratio: 1 / 1;          /* ← Ens størrelse */
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:15px;
  text-align:center;
  transition:0.25s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.post-number {
  font-size:1.2rem;
  font-weight:700;
  color:#d4b26a;
  margin-bottom:8px;
}

.post-title {
  font-size:0.95rem;
  color:#fff6cc;
  line-height:1.3;
}

.post-box:hover {
  background: linear-gradient(145deg, #1f3a30, #14241d);
  transform: translateY(-3px);
  border-color:#6ca889;
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
    score: 50,
    solvedPosts: [],
    postStates: {},
    chanceDeck: []
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
  <a href="/post/${req.params.code}/${p.id}">
    <div class="post-box">
      <div class="post-number">${p.id}</div>
      <div class="post-title">${p.title}</div>
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
app.get("/post/:code/:postId", (req, res) => {
  const { code, postId } = req.params;
  const team = teams[code];
  const post = POSTS.find(p => p.id == postId);

  if (!team || !post) return res.send("Fejl");

  if (team.solvedPosts.includes(post.id)) {
    return res.send(layout("Løst", `
      <div class="card">
        <h2>Denne opgave er allerede løst.</h2>
        <a href="/game/${code}"><button>Tilbage</button></a>
      </div>
    `));
  }

  if (!team.postStates[post.id]) {
    team.postStates[post.id] = {
      hintsUsed: [],
      answeredCorrect: false,
      rewardChosen: false
    };
  }

const state = team.postStates[post.id];

let hintHtml = "";

post.hints.forEach((hintText, index) => {
  const hintNumber = index + 1;
  const cost = hintNumber === 1 ? 10 : 40;

  if (state.hintsUsed.includes(hintNumber)) {
    hintHtml += `
      <div class="card">
        <strong>Hint ${hintNumber}:</strong>
        <p>${hintText}</p>
      </div>
    `;
  } else if (!state.answeredCorrect) {
    hintHtml += `
      <form method="POST" action="/post/${code}/${post.id}/hint/${hintNumber}">
        <button>Køb hint ${hintNumber} (-${cost} point)</button>
      </form>
    `;
  }
});


app.post("/post/:code/:postId/answer", (req, res) => {
  const { code, postId } = req.params;
  const team = teams[code];
  const post = POSTS.find(p => p.id == postId);

  if (!team || !post) {
    return res.send("Fejl");
  }

  const answer = (req.body.answer || "").toUpperCase().trim();

  if (answer === post.correctAnswer.toUpperCase()) {
    team.solvedPosts.push(post.id);
    team.score += 100;

    return res.send(layout("Korrekt!", `
      <div class="card">
        <h2>Tillykke! I har fået 100 point.</h2>
        <a href="/game/${code}"><button>Gå videre</button></a>
      </div>
    `));
  }

  team.score -= 5;

  res.send(layout("Forkert", `
    <div class="card">
      <h2>Forkert svar (-5 point)</h2>
      <a href="/post/${code}/${postId}"><button>Prøv igen</button></a>
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
