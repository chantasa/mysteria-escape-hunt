import express from "express";
const app = express();
app.use(express.urlencoded({ extended: true }));

const ADMIN_KEY = process.env.ADMIN_KEY || "dev-key";
const GAME_MINUTES = 75;

/* ===============================
   POSTS
================================ */

const POSTS = [
  "Dragernes Dal","Den Dunkle Sti","Elverlysningen","Skyggeskoven",
  "Den Glemte Kløft","Runestenen","Månesøen","Den Hviskende Eng",
  "Tågedalen","Den Forladte Hytte","Troldens Passage","Krystalhulen",
  "Skovens Hjerte","Den Brændte Stub","Den Skjulte Bro","Ravnenes Tårn",
  "Den Knirkende Port","Vildnisets Port","Stjernestien","Den Gamle Egestamme"
].map((name,i)=>({
  id:i+1,
  name,
  answer:"SVAR"+(i+1)
}));

/* ===============================
   STATE
================================ */

const teams = {};
let gameState = {
  status:"idle",
  start:null,
  end:null
};

/* ===============================
   CHANCE DECK
================================ */

function createChanceDeck(){
  const deck=[
    "double","double","double","double","double",
    "minus","minus","minus",
    "steal","steal"
  ];
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}

/* ===============================
   UTIL
================================ */

function layout(title, body) {
  return `
<!DOCTYPE html>
<html lang="da">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>

<style>
* { box-sizing: border-box; }

body{
  margin:0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto;
  background: linear-gradient(135deg,#0f2027,#203a43,#2c5364);
  color:#ffffff;
  min-height:100vh;
  display:flex;
  justify-content:center;
  align-items:flex-start;
  padding:20px 15px;
}

.wrap{
  width:100%;
  max-width:480px;
}

.card{
  background:rgba(255,255,255,0.06);
  backdrop-filter: blur(6px);
  border:1px solid rgba(255,255,255,0.1);
  border-radius:18px;
  padding:20px;
  margin-bottom:20px;
  box-shadow:0 10px 30px rgba(0,0,0,0.4);
}

h1,h2,h3{
  margin-top:0;
}

.btn{
  display:inline-block;
  padding:12px 18px;
  border-radius:12px;
  background:#1f3a56;
  color:white;
  text-decoration:none;
  border:none;
  font-weight:600;
  cursor:pointer;
}

.btn:hover{
  background:#294b6d;
}

input{
  width:100%;
  padding:12px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,0.2);
  background:rgba(0,0,0,0.3);
  color:white;
  margin-bottom:10px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
}

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
  text-decoration:none;
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


function timeLeft(){
  if(gameState.status!=="running")return 0;
  const diff=gameState.end-Date.now();
  if(diff<=0){gameState.status="ended";return 0;}
  return diff;
}

function formatTime(ms){
  const total=Math.floor(ms/1000);
  const m=Math.floor(total/60);
  const s=total%60;
  return m+":"+String(s).padStart(2,"0");
}

/* ===============================
   LOGIN
================================ */

app.get("/",(req,res)=>res.redirect("/login"));

app.get("/login",(req,res)=>{
res.send(layout("Login",`
<div class="card">
<h2>Indtast holdkode</h2>
<form method="POST">
<input name="code" required>
<button class="btn">Fortsæt</button>
</form>
</div>
`));
});

app.post("/login",(req,res)=>{
const code=req.body.code.toUpperCase();
if(!teams[code]){
teams[code]={
score:50,
solved:new Set(),
chanceDeck:createChanceDeck(),
name:null
};
}
res.redirect("/team/"+code);
});

/* ===============================
   TEAM NAME
================================ */

app.get("/team/:code",(req,res)=>{
res.send(layout("Holdnavn",`
<div class="card">
<h2>Vælg holdnavn</h2>
<form method="POST">
<input name="name" required>
<button class="btn">Start spil</button>
</form>
</div>
`));
});

app.post("/team/:code",(req,res)=>{
teams[req.params.code].name=req.body.name;
res.redirect("/game/"+req.params.code);
});

/* ===============================
   GAME GRID
================================ */

app.get("/game/:code",(req,res)=>{
const team=teams[req.params.code];
const posts=POSTS.map(p=>`
<a href="/post/${req.params.code}/${p.id}" 
class="post-box ${team.solved.has(p.id)?"solved":""}">
<div>${p.id}</div>
<div>${p.name}</div>
</a>`).join("");

res.send(layout("Spil",`
<div class="card">
<h3>${team.name}</h3>
<p>Score: ${team.score}</p>
${gameState.status==="running"?
`<p>⏱️ Tid tilbage: ${formatTime(timeLeft())}</p>`:
gameState.status==="ended"?
`<p>⛔ Spillet er slut</p>`:
`<p class="muted">Afventer start fra GM</p>`}
</div>
<div class="grid">${posts}</div>
`));
});

/* ===============================
   POST
================================ */

app.get("/post/:code/:id",(req,res)=>{
const team=teams[req.params.code];
const post=POSTS.find(p=>p.id==req.params.id);
if(team.solved.has(post.id))return res.redirect("/game/"+req.params.code);

res.send(layout(post.name,`
<div class="card">
<h2>${post.name}</h2>
<form method="POST">
<input name="answer" required>
<button class="btn">Send svar</button>
</form>
</div>
`));
});

app.post("/post/:code/:id",(req,res)=>{
const team=teams[req.params.code];
const post=POSTS.find(p=>p.id==req.params.id);
const answer=req.body.answer.toUpperCase().trim();

if(answer!==post.answer){
team.score-=5;
return res.send(layout("Forkert",`
<div class="card">
<h2>Forkert svar -5 point</h2>
<a class="btn" href="/post/${req.params.code}/${post.id}">Prøv igen</a>
</div>
`));
}

res.send(layout("Korrekt",`
<div class="card">
<h2>✅ Korrekt – I har løst opgaven!</h2>
<form method="POST" action="/reward/${req.params.code}/${post.id}">
<button name="choice" value="points" class="btn">Vælg jeres 100 point</button>
<button name="choice" value="chance" class="btn">Vælg chancen</button>
</form>
</div>
`));
});

/* ===============================
   REWARD
================================ */

app.post("/reward/:code/:id",(req,res)=>{
const team=teams[req.params.code];
const postId=Number(req.params.id);
if(team.solved.has(postId))return res.redirect("/game/"+req.params.code);

if(req.body.choice==="points"){
team.score+=100;
team.solved.add(postId);
return res.redirect("/game/"+req.params.code);
}

if(team.chanceDeck.length===0){
team.chanceDeck=createChanceDeck();
}

const result=team.chanceDeck.pop();
let message="";

if(result==="double"){team.score+=200;message="🎉 Dobbelt op! +200 point";}
if(result==="minus"){team.score-=50;message="💀 I mistede 50 point";}
if(result==="steal"){
const sorted=Object.entries(teams).sort((a,b)=>b[1].score-a[1].score);
const target=sorted.find(t=>t[0]!==req.params.code);
if(target){target[1].score-=50;team.score+=50;message="🏆 I stjal 50 point!";}
else{team.score+=50;message="🏆 Bonus 50 point!";}
}

team.solved.add(postId);

res.send(layout("Chance",`
<div class="card">
<h2>${message}</h2>
<a class="btn" href="/game/${req.params.code}">Gå videre</a>
</div>
`));
});

/* ===============================
   GM DASHBOARD
================================ */

app.get("/admin",(req,res)=>{
if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang");

const leaderboard=Object.entries(teams)
.sort((a,b)=>b[1].score-a[1].score)
.map(t=>`<li>${t[1].name||t[0]} – ${t[1].score}</li>`).join("");

res.send(layout("GM",`
<div class="card">
<h2>Status</h2>
<p>${gameState.status==="running"?
"⏱️ "+formatTime(timeLeft()):
gameState.status==="ended"?
"⛔ Slut":
"⏳ Ikke startet"}</p>
<form method="POST" action="/admin/start?key=${ADMIN_KEY}">
<button class="btn">Start spil</button>
</form>
<form method="POST" action="/admin/end?key=${ADMIN_KEY}">
<button class="btn">Nødstops-knap</button>
</form>
<form method="POST" action="/admin/reset?key=${ADMIN_KEY}">
<button class="btn">Reset</button>
</form>
</div>

<div class="card">
<h2>Leaderboard</h2>
<ul>${leaderboard}</ul>
</div>
`));
});

app.post("/admin/start",(req,res)=>{
if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang");
gameState.status="running";
gameState.start=Date.now();
gameState.end=Date.now()+GAME_MINUTES*60*1000;
res.redirect("/admin?key="+ADMIN_KEY);
});

app.post("/admin/end",(req,res)=>{
if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang");
gameState.status="ended";
res.redirect("/admin?key="+ADMIN_KEY);
});

app.post("/admin/reset",(req,res)=>{
if(req.query.key!==ADMIN_KEY)return res.send("Ingen adgang");
for(const t in teams){
teams[t].score=50;
teams[t].solved=new Set();
teams[t].chanceDeck=createChanceDeck();
}
gameState.status="idle";
res.redirect("/admin?key="+ADMIN_KEY);
});

app.listen(process.env.PORT||3000);
