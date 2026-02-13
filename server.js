import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));

const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";
const GAME_MINUTES = 75;

/* =============================
   DATA
============================= */

const TEAM_CODES = Array.from({ length: 10 }, (_, i) => `HOLD${i + 1}`);

const POSTS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: [
    "Dragernes Dal",
    "Den Dunkle Sti",
    "Skovens Hjerte",
    "Måneskinnets Eng",
    "Tågens Kløft",
    "Ravnenes Rede",
    "Den Glemte Lund",
    "Skyggesøen",
    "Stormens Lysning",
    "De Vilde Rødder",
    "Flammernes Fald",
    "Elvernes Port",
    "Den Tavse Kilde",
    "Krystalhulen",
    "Vindens Vej",
    "Den Skæve Eg",
    "Frostens Bue",
    "Ugleklippen",
    "Den Sorte Bæk",
    "Stjerneskoven",
  ][i],
  question: "Indtast det korrekte svar:",
  answer: "TEST",
  hint1: "Hint 1: Tænk simpelt.",
  hint2: "Hint 2: Det er TEST.",
}));

/* =============================
   STATE
============================= */

const teams = {};
let gameState = {
  status: "idle",
  start: null,
  end: null,
};

function resetGame() {
  for (let code of TEAM_CODES) {
    teams[code] = {
      name: "",
      score: 50,
      solved: new Set(),
      hints: {},
      lastChance: null,
    };
  }
  gameState = { status: "idle", start: null, end: null };
}

resetGame();

/* =============================
   HELPERS
============================= */

function now() {
  return Date.now();
}

function isRunning() {
  if (gameState.status !== "running") return false;
  if (now() >= gameState.end) {
    gameState.status = "ended";
    return false;
  }
  return true;
}

function isEnded() {
  if (gameState.status === "running") isRunning();
  return gameState.status === "ended";
}

function timeLeft() {
  if (!isRunning()) return "0:00";
  let ms = gameState.end - now();
  let s = Math.floor(ms / 1000);
  let m = Math.floor(s / 60);
  s = s % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* =============================
   LAYOUT
============================= */

function layout(title, body) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body{margin:0;background:#0b0f1a;color:#f5f7ff;font-family:system-ui}
.wrap{max-width:900px;margin:auto;padding:20px}
.card{background:#12172b;border:1px solid #2e3b6b;border-radius:18px;padding:20px;margin-bottom:20px}
.btn{display:inline-block;padding:10px 16px;background:#1f2a50;color:#fff;border-radius:12px;text-decoration:none;border:none;cursor:pointer}
.btn:hover{background:#2d3c80}
a{text-decoration:none;color:inherit}

.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}

.post-box{
height:120px;
display:flex;
flex-direction:column;
justify-content:center;
align-items:center;
border-radius:18px;
background:linear-gradient(145deg,#1a1f3a,#12172b);
border:1px solid #2e3b6b;
text-align:center;
font-weight:600;
color:#f5f7ff;
transition:0.25s ease;
}
.post-box:hover{
transform:translateY(-4px);
box-shadow:0 8px 20px rgba(0,0,0,0.6);
border-color:#5b7cff;
background:linear-gradient(145deg,#222867,#171d40);
}
.solved{
background:linear-gradient(145deg,#1f4d37,#17352a);
border-color:#2ecc71;
}

.point-win{
font-size:28px;
font-weight:700;
color:#2ecc71;
text-align:center;
animation:pop 0.6s ease-out;
}
@keyframes pop{
0%{transform:scale(0.6);opacity:0}
60%{transform:scale(1.2);opacity:1}
100%{transform:scale(1)}
}

.flip-container{perspective:1000px}
.flip-card{
width:100%;height:110px;
position:relative;
transform-style:preserve-3d;
transition:transform 0.6s;
cursor:pointer;
}
.flip-card.flipped{transform:rotateY(180deg)}
.flip-front,.flip-back{
position:absolute;width:100%;height:100%;
border-radius:16px;
display:flex;align-items:center;justify-content:center;
backface-visibility:hidden;
font-weight:600;padding:15px;text-align:center
}
.flip-front{background:#1a1f3a;border:1px solid #2e3b6b}
.flip-back{transform:rotateY(180deg);background:#2c3e50;border:1px solid #5b7cff}
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}

/* =============================
   ROUTES
============================= */

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
  res.send(layout("Login", `
<div class="card">
<h2>Indtast holdkode</h2>
<form method="POST">
<input name="code" required>
<button class="btn">Fortsæt</button>
</form>
</div>
`));
});

app.post("/login", (req, res) => {
  let code = req.body.code.toUpperCase().trim();
  if (!TEAM_CODES.includes(code)) return res.redirect("/login");
  res.redirect(`/name/${code}`);
});

app.get("/name/:code", (req,res)=>{
  res.send(layout("Navn",`
<div class="card">
<h2>Indtast holdnavn</h2>
<form method="POST">
<input name="name" required>
<button class="btn">Start</button>
</form>
</div>`))
})

app.post("/name/:code",(req,res)=>{
  teams[req.params.code].name=req.body.name
  res.redirect(`/game/${req.params.code}`)
})

app.get("/game/:code",(req,res)=>{
  let team=teams[req.params.code]
  if(!team)return res.redirect("/login")

  let postsHTML=POSTS.map(p=>`
<a href="/post/${req.params.code}/${p.id}" class="post-box ${team.solved.has(p.id)?"solved":""}">
<div>${p.id}</div>
<div>${p.name}</div>
</a>`).join("")

  res.send(layout("Game",`
<div class="card">
<h2>${team.name}</h2>
<p>Score: ${team.score}</p>
${isRunning()?`<p>Tid tilbage: ${timeLeft()}</p>`:""}
</div>
<div class="grid">${postsHTML}</div>
`))
})

app.get("/post/:code/:id",(req,res)=>{
  let team=teams[req.params.code]
  let post=POSTS.find(p=>p.id==req.params.id)
  if(!team||!post)return res.redirect("/")

  res.send(layout(post.name,`
<div class="card">
<h2>${post.name}</h2>
<p>${post.question}</p>
<form method="POST">
<input name="answer">
<button class="btn">Svar</button>
</form>
<br>
<form method="POST" action="/hint/${req.params.code}/${post.id}/1">
<button class="btn">Køb hint 1 (-10)</button>
</form>
<form method="POST" action="/hint/${req.params.code}/${post.id}/2">
<button class="btn">Køb hint 2 (-40)</button>
</form>
</div>
`))
})

app.post("/hint/:code/:id/:nr",(req,res)=>{
  let team=teams[req.params.code]
  let post=POSTS.find(p=>p.id==req.params.id)
  let cost=req.params.nr==1?10:40
  team.score-=cost
  let hint=req.params.nr==1?post.hint1:post.hint2
  res.send(layout("Hint",`
<div class="card">
<h2>Hint</h2>
<p>${hint}</p>
<p>- ${cost} point</p>
<a class="btn" href="/post/${req.params.code}/${post.id}">Tilbage</a>
</div>`))
})

app.post("/post/:code/:id",(req,res)=>{
  let team=teams[req.params.code]
  let post=POSTS.find(p=>p.id==req.params.id)
  let answer=req.body.answer?.toUpperCase().trim()

  if(answer===post.answer){
    team.solved.add(post.id)
    return res.send(layout("Korrekt",`
<div class="card">
<h2>Korrekt – I har løst opgaven!</h2>
<div class="point-win">+100 point</div>
<br>
<a class="btn" href="/reward/${req.params.code}/${post.id}/safe">Vælg jeres 100 point</a>
<br><br>
<a class="btn" href="/reward/${req.params.code}/${post.id}/chance">Vælg chancen</a>
</div>`))
  }else{
    team.score-=5
    return res.send(layout("Forkert",`
<div class="card">
<h2>Forkert svar -5 point</h2>
<a class="btn" href="/post/${req.params.code}/${post.id}">Prøv igen</a>
</div>`))
  }
})

app.get("/reward/:code/:id/safe",(req,res)=>{
  let team=teams[req.params.code]
  team.score+=100
  res.redirect(`/game/${req.params.code}`)
})

function weightedChance(team){
  const options=[
    {type:"double",weight:35},
    {type:"minus",weight:20},
    {type:"steal",weight:15},
  ]
  let total=options.reduce((a,b)=>a+b.weight,0)
  let r=Math.random()*total
  for(let opt of options){
    if(r<opt.weight)return opt.type
    r-=opt.weight
  }
}

app.get("/reward/:code/:id/chance",(req,res)=>{
  let team=teams[req.params.code]
  let result=weightedChance(team)

  let text=""
  if(result==="double"){team.score+=200;text="Tillykke! +200 point"}
  if(result==="minus"){team.score-=50;text="Desværre! -50 point"}
  if(result==="steal"){
    let leader=Object.values(teams).sort((a,b)=>b.score-a.score)[0]
    if(leader!==team){
      leader.score-=50
      team.score+=50
    }
    text="I har stjålet 50 point!"
  }

  res.send(layout("Chance",`
<div class="card">
<h2>Chancen er valgt</h2>
<div class="flip-container">
<div class="flip-card flipped">
<div class="flip-front">?</div>
<div class="flip-back">${text}</div>
</div>
</div>
<br>
<a class="btn" href="/game/${req.params.code}">Tilbage</a>
</div>`))
})

/* =============================
   ADMIN
============================= */

app.get("/admin",(req,res)=>{
  if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang")
  let list=Object.entries(teams)
  .sort((a,b)=>b[1].score-a[1].score)
  .map(([code,t],i)=>`<li>${i+1}. ${t.name||code} - ${t.score}</li>`).join("")
  res.send(layout("Admin",`
<div class="card">
<h2>GM Dashboard</h2>
<p>Status: ${gameState.status}</p>
${isRunning()?`<p>Tid tilbage: ${timeLeft()}</p>`:""}
<form method="POST" action="/admin/start?key=${ADMIN_KEY}">
<button class="btn">Start spil</button>
</form>
<form method="POST" action="/admin/end?key=${ADMIN_KEY}">
<button class="btn">Stop spil</button>
</form>
<form method="POST" action="/admin/reset?key=${ADMIN_KEY}">
<button class="btn">Reset</button>
</form>
</div>
<div class="card">
<h3>Leaderboard</h3>
<ul>${list}</ul>
</div>
`))
})

app.post("/admin/start",(req,res)=>{
  if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang")
  gameState.status="running"
  gameState.start=now()
  gameState.end=now()+GAME_MINUTES*60000
  res.redirect(`/admin?key=${ADMIN_KEY}`)
})

app.post("/admin/end",(req,res)=>{
  if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang")
  gameState.status="ended"
  res.redirect(`/admin?key=${ADMIN_KEY}`)
})

app.post("/admin/reset",(req,res)=>{
  if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang")
  resetGame()
  res.redirect(`/admin?key=${ADMIN_KEY}`)
})

app.listen(process.env.PORT||3000)
