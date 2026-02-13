import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

/* ==============================
   BASIC DATA
============================== */

const TEAM_CODES = ["HOLD1","HOLD2","HOLD3","HOLD4","HOLD5"];

const teams = {};

TEAM_CODES.forEach(code => {
  teams[code] = {
    name: code,
    score: 50, // starter med 50 point
    solved: new Set()
     chanceDeck: createChanceDeck()
  };
});

const POSTS = [
  { id:1, name:"Dragernes Dal", question:"Hvad er svaret?", answer:"ILD", hint1:"Det er varmt", hint2:"Drager ånder det" },
  { id:2, name:"Den Dunkle Sti", question:"Hvad er svaret?", answer:"SKYGGE", hint1:"Du har den altid", hint2:"Den følger dig" },
];

/* ==============================
   LAYOUT
============================== */

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
  padding:20px 15px;
}

.wrap{
  width:100%;
  max-width:480px;
}

.card{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.1);
  border-radius:18px;
  padding:20px;
  margin-bottom:20px;
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
}

.solved{
  background:linear-gradient(145deg,#1f4d37,#17352a);
  border-color:#2ecc71;
}
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>
`;
}

/* =============================
   CHANCE DECK FUNCTION
============================= */

function createChanceDeck(){

  let baseDeck = [
    "double",
    "double",
    "minus",
    "minus",
    "steal"
  ]

  function shuffle(array){
    for(let i = array.length - 1; i > 0; i--){
      let j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  let deck
  let valid = false

  while(!valid){
    deck = shuffle([...baseDeck])
    valid = true

    for(let i = 1; i < deck.length; i++){
      if(deck[i] === "minus" && deck[i-1] === "minus"){
        valid = false
        break
      }
    }
  }

  return deck
}


/* ==============================
   PLAYER ROUTES
============================== */

app.get("/", (req,res)=> res.redirect("/login"));

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
  const code=req.body.code?.toUpperCase().trim();
  if(!teams[code]) return res.redirect("/login");
  res.redirect("/name/"+code);
});

app.get("/name/:code",(req,res)=>{
  res.send(layout("Navn",`
  <div class="card">
    <h2>Indtast holdnavn</h2>
    <form method="POST">
      <input name="name" required>
      <button class="btn">Start spil</button>
    </form>
  </div>
  `));
});

app.post("/name/:code",(req,res)=>{
  teams[req.params.code].name=req.body.name;
  res.redirect("/game/"+req.params.code);
});

app.get("/game/:code",(req,res)=>{
  const team=teams[req.params.code];
  if(!team) return res.redirect("/login");

  const postsHTML = POSTS.map(p=>`
    <a href="/post/${req.params.code}/${p.id}" class="post-box ${team.solved.has(p.id)?"solved":""}">
      <div>${p.id}</div>
      <div>${p.name}</div>
    </a>
  `).join("");

  res.send(layout("Game",`
    <div class="card">
      <h2>${team.name}</h2>
      <p>Score: ${team.score}</p>
    </div>
    <div class="grid">${postsHTML}</div>
  `));
});

app.get("/post/:code/:id",(req,res)=>{
  const team = teams[req.params.code];
  const post = POSTS.find(p=>p.id==req.params.id);

  if(!team || !post) return res.redirect("/");

  // 🔒 LÅS POSTEN HVIS DEN ER LØST
  if(team.solved.has(post.id)){
    return res.redirect(`/game/${req.params.code}`);
  }

  res.send(layout(post.name,`
    <div class="card">
      <h3>Point: ${team.score}</h3>
    </div>

    <div class="card">
      <h2>${post.name}</h2>
      <p>${post.question}</p>

      <form method="POST">
        <input name="answer" required>
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
  `));
});



app.post("/hint/:code/:id/:nr",(req,res)=>{
  const team=teams[req.params.code];
  const post=POSTS.find(p=>p.id==req.params.id);
  const cost=req.params.nr==1?10:40;
  team.score-=cost;
  const hint=req.params.nr==1?post.hint1:post.hint2;

  res.send(layout("Hint",`
    <div class="card">
      <h2>Hint</h2>
      <p>${hint}</p>
      <p>- ${cost} point</p>
      <a class="btn" href="/post/${req.params.code}/${post.id}">Tilbage</a>
    </div>
  `));
});

// ======================================
// SVAR PÅ POST
// ======================================

app.post("/post/:code/:id",(req,res)=>{
  let team = teams[req.params.code]
  let post = POSTS.find(p=>p.id==req.params.id)

  if(!team || !post) return res.redirect("/")

  // 🔒 Hvis posten allerede er løst
  if(team.solved.has(post.id)){
    return res.redirect(`/game/${req.params.code}`)
  }

  let answer = req.body.answer?.toUpperCase().trim()

  if(answer === post.answer){

    // Markér post som løst
    team.solved.add(post.id)

    return res.send(layout("Korrekt", `
      <div class="card">
        <h2>Korrekt – I har løst opgaven!</h2>

        <br>

        <a class="btn" href="/reward/${req.params.code}/${post.id}/safe">
          Vælg jeres 100 point
        </a>

        <br><br>

        <a class="btn" href="/reward/${req.params.code}/${post.id}/chance">
          Vælg chancen
        </a>
      </div>
    `))

  } else {

    team.score -= 5

    return res.send(layout("Forkert", `
      <div class="card">
        <h2>Forkert svar -5 point</h2>
        <a class="btn" href="/post/${req.params.code}/${post.id}">
          Prøv igen
        </a>
      </div>
    `))
  }
})


// ======================================
// SAFE REWARD
// ======================================

app.get("/reward/:code/:id/chance",(req,res)=>{
  let team = teams[req.params.code]
  if(!team) return res.redirect("/login")

  let rewardKey = req.params.id + "_rewarded"

  // 🔒 Hvis reward allerede taget
  if(team.solved.has(rewardKey)){
    return res.redirect(`/game/${req.params.code}`)
  }

  // Hvis deck er tomt → lav nyt
  if(!team.chanceDeck || team.chanceDeck.length === 0){
    team.chanceDeck = createChanceDeck()
  }

  // Træk øverste kort
  let result = team.chanceDeck.shift()

  let text = ""

  if(result === "double"){
    team.score += 200
    text = "Tillykke! I fik dobbelt op – +200 point!"
  }

  if(result === "minus"){
    team.score -= 50
    text = "Desværre! I mistede 50 point."
  }

  if(result === "steal"){
    let leader = Object.values(teams).sort((a,b)=>b.score-a.score)[0]
    if(leader && leader !== team){
      leader.score -= 50
      team.score += 50
    }
    text = "I har stjålet 50 point fra førerholdet!"
  }

  team.solved.add(rewardKey)

  res.send(layout("Chance", `
    <div class="card">
      <h2>Chancen er valgt</h2>
      <p>${text}</p>
      <br>
      <a class="btn" href="/game/${req.params.code}">
        Tilbage
      </a>
    </div>
  `))
})


// ======================================
// CHANCE REWARD
// ======================================

app.get("/reward/:code/:id/chance",(req,res)=>{
  let team = teams[req.params.code]
  if(!team) return res.redirect("/login")

  let rewardKey = req.params.id + "_rewarded"

  // 🔒 Hvis reward allerede taget
  if(team.solved.has(rewardKey)){
    return res.redirect(`/game/${req.params.code}`)
  }

  const options = [
    { type:"double", weight:40 },
    { type:"minus", weight:30 },
    { type:"steal", weight:20 }
  ]

  let total = options.reduce((a,b)=>a+b.weight,0)
  let r = Math.random()*total
  let result

  for(let opt of options){
    if(r < opt.weight){
      result = opt.type
      break
    }
    r -= opt.weight
  }

  let text = ""

  if(result === "double"){
    team.score += 200
    text = "Tillykke! I fik dobbelt op – +200 point!"
  }

  if(result === "minus"){
    team.score -= 50
    text = "Desværre! I mistede 50 point."
  }

  if(result === "steal"){
    let leader = Object.values(teams)
      .filter(t => t !== team)
      .sort((a,b)=>b.score-a.score)[0]

    if(leader){
      leader.score -= 50
      team.score += 50
      text = "I har stjålet 50 point fra førerholdet!"
    } else {
      text = "Ingen at stjæle fra – I slap heldigt!"
    }
  }

  team.solved.add(rewardKey)

  res.send(layout("Chance", `
    <div class="card">
      <h2>Chancen er valgt</h2>
      <p>${text}</p>
      <br>
      <a class="btn" href="/game/${req.params.code}">
        Tilbage
      </a>
    </div>
  `))
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
`));
});

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
