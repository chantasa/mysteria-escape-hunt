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
   
  return true;
}

function timeLeft() {
  if (gameState.status !== "running") return 0;

  const remaining = gameState.endTime - Date.now();

  if (remaining <= 0) {
    gameState.status = "ended";
    return 0;
  }

  return remaining;
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
/* === FORM SPACING === */

.answer-form {
  display:flex;
  flex-direction:column;
  gap:14px;
}

/* === SVAR-KNAP (GRØN) === */

.answer-btn {
  background:#2f6b3c;
  border:1px solid #5bd37c;
  font-weight:600;
}

/* === HINT-KNAPPER (BLÅ) === */

.hint-button button {
  background:#2e3f5f;
  border:1px solid #5f7bd4;
}

/* === TILBAGE-KNAP (RØDLIG) === */

.back-btn {
  background:#3a2a2a;
  border:1px solid #a86c6c;
}
/* ===== REWARD CHOICE BUTTONS ===== */

.reward-choice {
  display:flex;
  flex-direction:column;
  gap:20px;
  margin-top:30px;
}

.reward-btn {
  width:100%;
  padding:18px;
  font-size:1.2rem;
  font-weight:700;
  border-radius:14px;
  cursor:pointer;
  transition:0.25s ease;
  letter-spacing:0.5px;
}

/* Behold point – gylden */
.keep-btn {
  background: linear-gradient(145deg,#b9932f,#8a6a1f);
  border:2px solid #e6c46a;
  color:#1a1405;
}

.keep-btn:hover {
  transform:scale(1.02);
  box-shadow:0 0 18px rgba(230,196,106,0.4);
}

.chance-btn {
  position: relative;
  background: linear-gradient(145deg, #0f1f1a, #0a1512);
  border: 2px solid #5be7a3;
  color: #5be7a3;
  overflow: hidden;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

/* Glødende kant */
.chance-btn {
  box-shadow:
    0 0 0px rgba(91,231,163,0.0),
    inset 0 0 10px rgba(91,231,163,0.05);
}

.chance-btn:hover {
  box-shadow:
    0 0 18px rgba(91,231,163,0.6),
    inset 0 0 18px rgba(91,231,163,0.15);
  transform: translateY(-2px);
}

/* Subtil energilinje der bevæger sig */
.chance-btn::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(91,231,163,0.25),
    transparent
  );
  transition: left 0.6s ease;
}

.chance-btn:hover::after {
  left: 100%;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  width: fit-content;      /* 🔥 nøgle */
  margin: 20px auto 0;     /* center */
}

.flip-card {
  width: 100%;
  aspect-ratio: 3 / 4;
  perspective: 1000px;
}

.flip-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card.flipped .flip-inner {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  padding: 10px;
  text-align: center;
}

/* Forside */
.card-front {
  background: linear-gradient(145deg, #0f1b17, #162820);
  border: 2px solid #d4b26a;
  color: #d4b26a;
  font-size: 2rem;
}

/* Bagside */
.card-back {
  background: linear-gradient(145deg, #3a2a12, #1f1507);
  border: 2px solid #d4b26a;
  color: #f5e6c3;
  transform: rotateY(180deg);
  font-size: 0.85rem;
}


/* === INPUT MED LABEL I RAMMEN === */

.input-wrapper {
  position:relative;
}

.input-wrapper input {
  width:100%;
  padding:14px 10px;
  background:#08110e;
  border:1px solid #3f6b58;
  border-radius:8px;
  color:white;
}

.input-wrapper label {
  position:absolute;
  top:-10px;
  left:12px;
  background:#0f1b17;
  padding:0 6px;
  font-size:0.8rem;
  color:#d4b26a;
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
.post-box.solved {
  opacity: 0.55;
  background: linear-gradient(145deg, #0c1411, #070d0a);
  border-color: #1e3028;
  position: relative;
}

.post-box.solved::after {
  content: "◆";   /* diamant-symbol */
  position: absolute;
  top: 8px;
  right: 10px;

  background: linear-gradient(145deg, #f6d365, #d4b26a);
  color: #1a1f1c;

  font-weight: bold;
  font-size: 0.8rem;

  padding: 6px 8px;
  border-radius: 50%;

  box-shadow: 0 0 10px rgba(212,178,106,0.6);
}

/* HINT STYLING */

.hint-button {
  display:flex;
  justify-content:center;
  margin-top:15px;
}

.hint-button button {
  background:#2e3f5f;
  border:1px solid #5f7bd4;
  padding:10px 18px;
}

.hint-card {
  background:#132a3a;
  border:1px solid #2d6f89;
  text-align:center;
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
  if (gameState.status !== "running") {
    return res.send(layout("Venter", `
      <div class="card"><h2>Spillet er ikke startet endnu.</h2></div>
    `));
  }

  const team = teams[req.params.code];
  const remaining = timeLeft();

  const posts = POSTS.map(p => {
    const solved = team.solvedPosts.includes(p.id);
    return `
      <a href="/post/${req.params.code}/${p.id}">
        <div class="post-box ${solved ? "solved" : ""}">
          <div class="post-number">${p.id}</div>
          <div class="post-title">${p.title}</div>
        </div>
      </a>
    `;
  }).join("");

  res.send(layout("Spil", `
    <div class="card">
      <h1>${team.name}</h1>
      <div class="score">Jeres point: <strong>${team.score}</strong></div>
      <div>⏱ Tid tilbage: ${formatTime(remaining)}</div>
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

res.send(layout(post.title, `
  <div class="card">
    <h2>${post.title}</h2>
    <div>Jeres point: <strong>${team.score}</strong></div>
  </div>

   <div class="card">
    
   <form class="answer-form" method="POST" action="/post/${code}/${post.id}/answer">
  <div class="input-wrapper">
    <label>Indtast svar</label>
    <input name="answer" required />
  </div>
  <button class="answer-btn">Svar</button>
</form>
  </div>
  
 ${hintHtml}
 
  <a href="/game/${code}">
  <button class="back-btn">Tilbage</button>
</a>
`));
});

app.post("/post/:code/:postId/answer", (req, res) => {
  const { code, postId } = req.params;
  const team = teams[code];
  const post = POSTS.find(p => p.id == postId);

  if (!team || !post) {
    return res.send("Fejl");
  }
if (!team.postStates[post.id]) {
  team.postStates[post.id] = {
    hintsUsed: [],
    answeredCorrect: false,
    rewardChosen: false
  };
}

  const answer = (req.body.answer || "").toUpperCase().trim();

if (answer === post.correctAnswer.toUpperCase()) {

  team.postStates[post.id].answeredCorrect = true;

  return res.send(layout("Korrekt!", `
    <div class="card">
      <h2>Korrekt!</h2>
      <p>I har vundet <strong>100 point</strong>.</p>
      <p>Vil I beholde dem… eller tage chancen?</p>
    </div>

    <div class="reward-choice">
  <form method="POST" action="/post/${code}/${post.id}/keep">
    <button class="reward-btn keep-btn">
      Behold 100 point
    </button>
  </form>

  <form method="POST" action="/post/${code}/${post.id}/chance">
    <button class="reward-btn chance-btn">
      Tag chancen
    </button>
  </form>
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

app.post("/post/:code/:postId/hint/:hintNumber", (req, res) => {
  const { code, postId, hintNumber } = req.params;

  const team = teams[code];
  const post = POSTS.find(p => p.id == postId);

  if (!team || !post) return res.send("Fejl");

  const state = team.postStates[post.id];

  const hintNum = parseInt(hintNumber);
  const cost = hintNum === 1 ? 10 : 40;

  // Hvis allerede købt → bare tilbage
  if (state.hintsUsed.includes(hintNum)) {
    return res.redirect(`/post/${code}/${postId}`);
  }

  // Hvis allerede svaret korrekt → må ikke købe hint
  if (state.answeredCorrect) {
    return res.redirect(`/post/${code}/${postId}`);
  }

  // Træk point
  team.score -= cost;

  // Gem at hint er brugt
  state.hintsUsed.push(hintNum);

  res.redirect(`/post/${code}/${postId}`);
});

app.post("/post/:code/:postId/keep", (req, res) => {
  const { code, postId } = req.params;
  const team = teams[code];
  const post = POSTS.find(p => p.id == postId);

  if (!team || !post) return res.send("Fejl");

  const state = team.postStates[post.id];

  if (state.rewardChosen) {
    return res.redirect(`/game/${code}`);
  }

  team.score += 100;
  team.solvedPosts.push(post.id);
  state.rewardChosen = true;

  res.send(layout("Point modtaget", `
    <div class="card">
      <h2>Tillykke, I har fået jeres point.</h2>
      <p>Gå videre til næste post.</p>
      <a href="/game/${code}">
        <button class="answer-btn">Tilbage til spillet</button>
      </a>
    </div>
  `));
});
app.post("/post/:code/:postId/chance", (req, res) => {
  const { code, postId } = req.params;
  const team = teams[code];
  const post = POSTS.find(p => p.id == postId);

  if (!team || !post) return res.send("Fejl");

  const state = team.postStates[post.id];

  if (state.rewardChosen) {
    return res.redirect(`/game/${code}`);
  }

  // 🔥 Deck system
if (!team.chanceDeck || team.chanceDeck.length < 3) {
    team.chanceDeck = createShuffledDeck();
  }

  const cards = team.chanceDeck.slice(0, 3);

  res.send(layout("Tag chancen", `
    <div class="card">
      <h2>Vælg ét kort</h2>
      <p>Kun ét kan vælges…</p>
    </div>

    <div class="cards">
      ${cards.map((type, i) => `
        <div class="flip-card" data-type="${type}">
          <div class="flip-inner">
            <div class="card-front">?</div>
            <div class="card-back">
              ${type === "double" ? "🔥 Dobbelt op!" : ""}
              ${type === "minus" ? "💀 Mist 50 point" : ""}
              ${type === "steal" ? "🗡 Stjæl 50 point" : ""}
            </div>
          </div>
        </div>
      `).join("")}
    </div>

    <script>
      const cards = document.querySelectorAll(".flip-card");
      let chosen = false;

      cards.forEach(card => {
        card.addEventListener("click", () => {
          if (chosen) return;

          chosen = true;
          card.classList.add("flipped");

          cards.forEach(other => {
            if (other !== card) {
              other.classList.add("disabled");
            }
          });

          const type = card.dataset.type;

          fetch("/post/${code}/${post.id}/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type })
          }).then(() => {
            setTimeout(() => {
              window.location.href = "/game/${code}";
            }, 2000);
          });
        });
      });
    </script>
  `));
});

app.post("/post/:code/:postId/resolve", express.json(), (req, res) => {
  const { code, postId } = req.params;
  const { type } = req.body;

  const team = teams[code];
  const post = POSTS.find(p => p.id == postId);
  const state = team.postStates[post.id];

  if (!team || !post) return res.send("Fejl");

  let change = 0;

  if (type === "double") change = 200;
  if (type === "minus") change = -50;

  if (type === "steal") {
    const sorted = Object.values(teams)
      .sort((a, b) => b.score - a.score);

    const leader = sorted[0];

    if (leader !== team) {
      leader.score -= 50;
      change = 50;
    } else if (sorted[1]) {
      sorted[1].score -= 50;
      change = 50;
    }
  }

  team.score += change;
  team.solvedPosts.push(post.id);
  state.rewardChosen = true;

  team.chanceDeck = team.chanceDeck.slice(3);

  res.sendStatus(200);
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
