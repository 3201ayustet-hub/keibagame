const $ = (id)=>document.getElementById(id);
const state = { runners: [], results: [], racing:false, lockedOrder: [], raceState: [] };
const marks = ["◎","○","▲","△","☆","注","穴","笑"];
const gateClasses = ["g1","g2","g3"];

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function sleep(ms){ return new Promise(resolve=>setTimeout(resolve, ms)); }
function tagByKey(key){ return TAGS.find(t=>t.key===key) || TAGS[0]; }
function katakanaName(name){
  if(NAME_KATAKANA[name]) return NAME_KATAKANA[name];
  return (name || "ナナシ").replace(/[^\u30A0-\u30FF]/g,"").slice(0,5) || "ナナシ";
}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function getRunnerIndex(r){ return state.runners.indexOf(r); }

function defaultRunners(){
  return [
    {name:"村埜", tags:["late","bold"], photo:""},
    {name:"西田", tags:["drink","party"], photo:""},
    {name:"山田", tags:["sleepy","serious"], photo:""}
  ];
}

function addRunner(data={name:"", tags:["natural"], photo:""}){
  const r = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),
    name:data.name || "",
    tags:data.tags || ["natural"],
    photo:data.photo || "",
    horseName:"",
    nickname:"",
    stats:{},
    odds:"-",
    comment:""
  };
  generateRunner(r);
  state.runners.push(r);
  renderAll();
}

function generateRunner(r){
  const t = tagByKey(pick(r.tags.length ? r.tags : ["natural"]));
  const useName = Math.random() < 0.28;
  const first = useName ? katakanaName(r.name) : pick(t.parts);
  const second = pick(ENDINGS);
  r.horseName = `${first}${second}`.replace(/[^ァ-ヴー]/g,"");
  r.nickname = pick(t.title);
  r.stats = makeStats(r);
  r.odds = makeOdds(r);
  r.comment = makeComment(r);
}

function makeStats(r){
  let st = {ノリ:50, 運:50, 事件:50};
  r.tags.forEach(k=>{
    if(k==="late"){st.運+=16;st.事件+=18}
    if(k==="drink"){st.ノリ+=22;st.事件+=10}
    if(k==="sleepy"){st.運+=8;st.事件+=18}
    if(k==="poor"){st.運-=3;st.事件+=14}
    if(k==="bold"){st.ノリ+=18;st.運-=5}
    if(k==="natural"){st.運+=20;st.事件+=22}
    if(k==="food"){st.ノリ+=8;st.事件+=8}
    if(k==="party"){st.ノリ+=24}
    if(k==="shy"){st.運+=9;st.ノリ-=5}
    if(k==="serious"){st.事件-=8;st.運+=4}
  });
  Object.keys(st).forEach(k=>st[k]=clamp(st[k]+Math.floor(Math.random()*25)-12,5,99));
  return st;
}

function makeOdds(r){
  const power = r.stats.ノリ + r.stats.運 + r.stats.事件;
  return Math.max(1.5, (400 / power + Math.random()*5.8)).toFixed(1);
}

function makeComment(r){
  const key = r.tags[0] || "natural";
  return pick(COMMENT_TEMPLATES[key] || ["本紙の評価は高いが、根拠はかなり薄い。"]);
}

function renderAll(){
  renderRunnerList();
  renderEntryPaper();
  renderTrack();
  renderResultPaper(state.results);
}

function renderRunnerList(){
  const root = $("runnerList");
  root.innerHTML = "";
  state.runners.forEach((r,i)=>{
    const card = document.createElement("article");
    card.className = "runner-card";
    card.innerHTML = `
      <div class="runner-top">
        <label class="photo-box">
          <span class="frame-badge">${i+1}番</span>
          ${r.photo ? `<img src="${r.photo}" alt="">` : "写真"}
          <input type="file" accept="image/*" hidden data-photo="${i}">
        </label>
        <div class="runner-name-line">
          <label>騎手名<input value="${r.name}" data-name="${i}" placeholder="名前"></label>
          <div class="generated-box">
            <small>生成馬名</small>
            <div class="horse-name">${r.horseName}</div>
            <div class="nickname">${r.nickname}</div>
          </div>
        </div>
      </div>
      <div class="tag-help">特徴を押すと馬名が即再生成されます</div>
      <div class="tag-row">
        ${TAGS.map(t=>`<span class="tag ${r.tags.includes(t.key)?"active":""}" data-tag="${i}:${t.key}">${t.label}</span>`).join("")}
      </div>
      <div class="reroll-row">
        <button class="tiny-btn ghost" data-reroll="${i}">この馬名だけ再生成</button>
      </div>
    `;
    root.appendChild(card);
  });

  root.querySelectorAll("[data-name]").forEach(el=>{
    el.oninput = (e)=>{
      const r = state.runners[+el.dataset.name];
      r.name = e.target.value;
      generateRunner(r);
      state.results = [];
      renderAll();
    };
  });

  root.querySelectorAll("[data-tag]").forEach(el=>{
    el.onclick = ()=>{
      const [idx,key]=el.dataset.tag.split(":");
      const r=state.runners[+idx];
      if(r.tags.includes(key)){
        r.tags = r.tags.filter(x=>x!==key);
        if(!r.tags.length) r.tags=["natural"];
      } else {
        r.tags.push(key);
      }
      generateRunner(r);
      state.results = [];
      flashMessage(`${r.name || "名無し"} → ${r.horseName} を生成`);
      renderAll();
    };
  });

  root.querySelectorAll("[data-reroll]").forEach(el=>{
    el.onclick = ()=>{
      const r=state.runners[+el.dataset.reroll];
      generateRunner(r);
      state.results = [];
      flashMessage(`${r.horseName} が誕生`);
      renderAll();
    };
  });

  root.querySelectorAll("[data-photo]").forEach(el=>{
    el.onchange=(e)=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        state.runners[+el.dataset.photo].photo=reader.result;
        renderAll();
      };
      reader.readAsDataURL(file);
    };
  });
}

function flashMessage(text){
  $("commentary").innerHTML = `生成完了：${text}<br>新聞にも反映されました。`;
}

function sortedByOdds(){
  return [...state.runners].sort((a,b)=>parseFloat(a.odds)-parseFloat(b.odds));
}

function renderEntryPaper(){
  const sorted = sortedByOdds();
  const top = sorted[0] || state.runners[0] || {};
  const race = $("raceName").value, purpose=$("purpose").value, venue=$("venue").value;
  const today = new Date().toLocaleDateString("ja-JP");

  $("entryPaper").innerHTML = `
    <div class="paper-header">
      <div><div class="masthead">友ダビスポーツ</div><div>ランダム順位決定新聞</div></div>
      <div class="paper-date">${today}<br>${venue}</div>
    </div>
    <section class="big-headline">
      <div class="race">${race} / ${purpose}</div>
      <h3>${top.horseName || "未定"}<br>紙面では主役候補</h3>
      <div class="lead">※実際の順位はレース開始時に完全ランダムで決定</div>
    </section>
    <section class="main-visual">
      ${top.photo ? `<img class="main-photo" src="${top.photo}" alt="">` : `<div class="main-photo"></div>`}
      <div class="forecast-box">
        ${sorted.slice(0,4).map((r,i)=>`<div class="mark-line"><span class="mark">${marks[i]}</span> ${r.horseName}<br><small>${getRunnerIndex(r)+1}番 / 騎手：${r.name}</small></div>`).join("")}
      </div>
    </section>
    <div class="odds-strip">
      ${sorted.slice(0,3).map((r,i)=>`<div>${i+1}人気<br><b>${r.odds}倍</b><br>${r.horseName}</div>`).join("")}
    </div>
    ${state.runners.map((r,i)=>renderHorseCard(r,i,sorted)).join("")}
    <div class="footer-note">※この新聞の印・オッズは雰囲気です。レース結果は毎回ランダムで決まります。</div>
  `;
}

function renderHorseCard(r,i,sorted){
  const popular = sorted.indexOf(r);
  return `
    <article class="horse-card">
      ${popular===0 ? `<div class="stamp">本命</div>` : ""}
      <div class="horse-card-head">
        <div class="gate ${gateClasses[i%3]}">${i+1}</div>
        ${r.photo ? `<img class="face" src="${r.photo}" alt="">` : `<div class="face"></div>`}
        <div class="horse-meta">
          <small>${r.nickname}</small>
          <div class="name">${r.horseName}</div>
          <div class="sub">騎手：${r.name || "名無し"} / 特徴：${r.tags.map(k=>tagByKey(k).label).join("・")}</div>
        </div>
        <div class="sign">${marks[popular] || "笑"}</div>
      </div>
      <div class="horse-details">
        <div class="pill">馬番 ${i+1}</div>
        <div class="pill">ノリ ${r.stats.ノリ}</div>
        <div class="pill">事件 ${r.stats.事件}</div>
      </div>
      <div class="comment">【本紙】${r.comment}</div>
    </article>
  `;
}

function renderTrack(){
  const root = $("raceTrack");
  root.querySelectorAll(".runner-dot").forEach(n=>n.remove());
  $("goalBoard").classList.add("hidden");
  $("finishOverlay").classList.add("hidden");
  state.runners.forEach((r,i)=>{
    const dot=document.createElement("div");
    dot.className="runner-dot";
    dot.id=`dot-${i}`;
    dot.innerHTML=`<span class="horse-emoji">🐎</span><span class="mini-name">${i+1} ${r.horseName}</span>`;
    root.appendChild(dot);
    setDotPosition(i, 0, i);
  });
  updateLiveRank([]);
}

function ovalPoint(percent, lane=0){
  const track = $("raceTrack");
  const w = track.clientWidth || 480, h = track.clientHeight || 300;
  const cx=w/2, cy=h/2;
  const rx=w/2-48-lane*12, ry=h/2-48-lane*8;
  const theta = -Math.PI/2 + percent * 2 * Math.PI;
  return {x:cx + rx*Math.cos(theta), y:cy + ry*Math.sin(theta)};
}

function setDotPosition(i, percent, laneIndex){
  const el = $(`dot-${i}`); if(!el) return;
  const p = ovalPoint(percent, laneIndex%3);
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
}

function updateLiveRank(raceState){
  const list = $("liveRankList");
  if(!raceState.length){
    list.innerHTML = "レース開始待ち";
    list.className = "";
    return;
  }
  list.className = "live-rank-list";
  const ranked = [...raceState].sort((a,b)=>b.progress-a.progress);
  list.innerHTML = ranked.map((s,i)=>`<div class="live-rank-row"><span>${i+1}位 ${s.runner.horseName}</span><b>${Math.floor(s.progress*100)}%</b></div>`).join("");
}

function showEvent(kind,title,body,type="skill",runnerIndex=null){
  const card=$("eventCard");
  card.className=`event-card ${type}`;
  card.innerHTML=`<div class="event-kind">${kind}</div><div class="event-title">${title}</div><div class="event-body">${body}</div>`;
  document.querySelectorAll(".runner-dot").forEach(d=>d.classList.remove("skill"));
  if(runnerIndex!==null){
    const dot=$(`dot-${runnerIndex}`);
    if(dot) dot.classList.add("skill");
    setTimeout(()=>dot && dot.classList.remove("skill"),1200);
  }
}

async function showCutin(kind, runner, title, body, type="skill"){
  const cutin = $("cutin");
  cutin.className = `cutin ${type}`;
  $("cutinKind").textContent = kind;
  $("cutinHorse").textContent = runner.horseName;
  $("cutinTitle").textContent = title;
  $("cutinBody").textContent = body;
  const photo = $("cutinPhoto");
  photo.style.backgroundImage = runner.photo ? `url("${runner.photo}")` : "";
  photo.textContent = runner.photo ? "" : runner.name || "騎手";
  await sleep(1500);
  cutin.classList.add("hidden");
}

function makeRaceEvent(r){
  const tag = tagByKey(pick(r.tags));
  const rare = Math.random() < 0.1;
  const positive = Math.random() < 0.56;
  if(rare){
    return {kind:"SSRスキル", title:"キセキノオイコミ", body:`${r.horseName}、なぜか主人公みたいな演出！`, type:"rare", delta:0.12};
  }
  if(positive){
    return {kind:"スキル発動", title:tag.good, body:tag.skill, type:"skill", delta:0.075};
  }
  return {kind:"ハプニング", title:tag.bad, body:tag.trouble, type:"happening", delta:-0.07};
}

function initRaceState(){
  const order = shuffle(state.runners);
  return state.runners.map((r,i)=>({
    runner:r,
    progress: Math.max(0, Math.random()*0.05 - i*0.002),
    speed: 0.0034 + Math.random()*0.0017,
    momentum: 0,
    finalRank: order.indexOf(r),
    finished:false
  }));
}

async function startRace(){
  if(state.racing || state.runners.length < 2) return;
  state.racing = true;
  state.results = [];
  state.raceState = initRaceState();
  state.lockedOrder = [...state.raceState].sort((a,b)=>a.finalRank-b.finalRank).map(s=>s.runner);
  renderTrack();

  const log = [pick(RACE_LINES.start), "順位はランダム。ただし途中は本当に入れ替わります。"];
  $("commentary").innerHTML = log.join("<br>");
  showEvent("実況","ゲートオープン","まずはバラバラに飛び出しました！","idle");

  const duration = 18000;
  const start = performance.now();
  let cutinDone = {a:false,b:false,c:false,d:false};
  let finishedIds = [];

  async function loop(now){
    if(!state.racing) return;
    const t = clamp((now - start) / duration, 0, 1);

    state.raceState.forEach((s)=>{
      if(s.finished) return;
      const noise = (Math.random() - 0.48) * 0.0012;
      const earlyFreeRun = t < 0.70;
      let correction = 0;

      if(!earlyFreeRun){
        const target = clamp(1 - s.finalRank*0.045, 0.72, 1);
        correction = (target - s.progress) * 0.018;
      }

      s.progress += s.speed + s.momentum + noise + correction;
      s.momentum *= 0.88;
      s.progress = clamp(s.progress, 0, 1);
    });

    state.raceState.forEach((s)=>{
      setDotPosition(getRunnerIndex(s.runner), s.progress, getRunnerIndex(s.runner));
    });
    updateLiveRank(state.raceState);

    if(t > .17 && !cutinDone.a){
      cutinDone.a = true;
      log.push(pick(RACE_LINES.corner1));
      $("commentary").innerHTML = log.slice(-5).join("<br>");
      await triggerRandomEvent(log);
    }

    if(t > .38 && !cutinDone.b){
      cutinDone.b = true;
      log.push(pick(RACE_LINES.back));
      $("commentary").innerHTML = log.slice(-5).join("<br>");
      await triggerRandomEvent(log);
    }

    if(t > .57 && !cutinDone.c){
      cutinDone.c = true;
      await triggerRandomEvent(log);
    }

    if(t > .74 && !cutinDone.d){
      cutinDone.d = true;
      log.push(pick(RACE_LINES.corner4));
      $("commentary").innerHTML = log.slice(-5).join("<br>");
      const lead = state.lockedOrder[0];
      const s = state.raceState.find(x=>x.runner.id===lead.id);
      s.momentum += 0.06;
      showEvent("ラストスパート","ウンメイノツッコミ",`${lead.horseName}、結果発表に向けて一気に前へ！`,"rare",getRunnerIndex(lead));
      await showCutin("ラストスパート", lead, "ウンメイノツッコミ", "ここから運命の直線！", "rare");
    }

    state.raceState.forEach((s)=>{
      if(s.progress >= 0.985 && !s.finished && t > 0.84){
        s.finished = TrueFalseWorkaround();
      }
    });

    const finishCandidates = state.lockedOrder.filter((r,rank)=>{
      const s = state.raceState.find(x=>x.runner.id===r.id);
      return t > 0.86 + rank*0.035 && !finishedIds.includes(r.id);
    });

    if(finishCandidates.length){
      const r = finishCandidates[0];
      finishedIds.push(r.id);
      const rank = finishedIds.length;
      const idx = getRunnerIndex(r);
      const s = state.raceState.find(x=>x.runner.id===r.id);
      if(s){s.progress = 1 - (rank-1)*0.012; s.finished = true;}
      setDotPosition(idx, 1 - (rank-1)*0.012, idx);
      const dot = $(`dot-${idx}`);
      if(dot){
        dot.classList.add("finished");
        dot.querySelector(".mini-name").textContent = `🏁 ${rank}着 ${r.horseName}`;
      }
      updateGoalBoard(finishedIds);
      await showFinishOverlay(rank, r);
    }

    if(t < 1){
      requestAnimationFrame(loop);
    } else {
      finishRace();
    }
  }

  requestAnimationFrame(loop);
}

function TrueFalseWorkaround(){ return false; }

async function triggerRandomEvent(log){
  const s = pick(state.raceState.filter(x=>!x.finished));
  if(!s) return;
  const ev = makeRaceEvent(s.runner);
  s.momentum += ev.delta;
  const effect = ev.delta >= 0 ? "速度アップ！" : "速度ダウン！";
  log.push(`${ev.kind}：${s.runner.horseName}「${ev.title}」${effect}`);
  $("commentary").innerHTML = log.slice(-5).join("<br>");
  showEvent(ev.kind, ev.title, `${s.runner.horseName}：${ev.body} / ${effect}`, ev.type, getRunnerIndex(s.runner));
  await showCutin(ev.kind, s.runner, ev.title, `${ev.body} ${effect}`, ev.type);
}

async function showFinishOverlay(rank, runner){
  const ov = $("finishOverlay");
  ov.classList.remove("hidden");
  ov.innerHTML = `<div><div class="big">${rank}着！</div><div class="name">${runner.horseName}</div><div>騎手：${runner.name}</div></div>`;
  await sleep(700);
  ov.classList.add("hidden");
}

function updateGoalBoard(goalIds){
  const board = $("goalBoard");
  board.classList.remove("hidden");
  const finished = goalIds.map(id => state.lockedOrder.find(r=>r.id===id)).filter(Boolean);
  board.innerHTML = `
    <h3>GOAL!</h3>
    ${finished.map((r,i)=>`<div class="goal-line"><span class="goal-rank">${i+1}着</span><span>${getRunnerIndex(r)+1}番 ${r.horseName}</span></div>`).join("")}
  `;
}

function finishRace(){
  state.racing = false;
  state.results = [...state.lockedOrder];
  state.lockedOrder.forEach((r,rank)=>{
    const idx = getRunnerIndex(r);
    setDotPosition(idx, 1 - rank*0.012, idx);
  });
  $("commentary").innerHTML = `${pick(RACE_LINES.finish)}<br>1着 ${state.results[0].horseName}、2着 ${state.results[1]?.horseName || "-"}、3着 ${state.results[2]?.horseName || "-"}。`;
  showEvent("結果確定",`${state.results[0].horseName} 1着`,`${$("purpose").value} の結果が確定しました。`,"rare",getRunnerIndex(state.results[0]));
  updateGoalBoard(state.results.map(r=>r.id));
  updateLiveRank(state.raceState);
  renderResultPaper(state.results);
}

function rankClass(i){ return i===0 ? "rank-1" : i===1 ? "rank-2" : "rank-3"; }
function rankReason(i){ return i===0 ? `勝因：${pick(WIN_REASONS)}` : `敗因：${pick(LOSE_REASONS)}`; }

function renderResultPaper(results){
  const ranked = results.length ? results : sortedByOdds();
  const race=$("raceName").value, purpose=$("purpose").value, venue=$("venue").value;
  const today = new Date().toLocaleDateString("ja-JP");
  const winner = ranked[0] || state.runners[0] || {};
  const top3 = ranked.slice(0,3);
  const interview = pick(INTERVIEWS);
  const last = ranked[ranked.length-1] || winner;

  $("resultPaper").innerHTML = `
    <div class="result-top">
      <div class="result-titlebox">
        <div class="bar"><span>友ダビスポーツ</span><small>${today}</small></div>
        <div class="result-sub">${race}　${purpose}　${venue}</div>
      </div>
      <div class="result-confirm">確定<small>結果発表</small></div>
    </div>

    <div class="result-main-head">
      <h3>結果が確定しました！</h3>
      <div class="mic">🎙 実況：ともダビ太郎<br>解説：焼肉博士</div>
    </div>

    ${top3.map((r,i)=>`
      <article class="rank-card ${rankClass(i)}">
        <div class="rank-band"><b>${i+1}</b>着</div>
        <div class="rank-center">
          <div class="horse-number">${getRunnerIndex(r)+1}</div>
          <div>
            <div class="rank-horse">${r.horseName}</div>
            <div class="jockey-line"><span class="jockey-label">騎手</span>${r.name || "名無し"}</div>
            <div class="reason-box">${rankReason(i)}</div>
          </div>
        </div>
        <div class="rank-stats">
          <div class="stat-row"><span>称号</span><b>${i===0 ? pick(CHAMPION_TITLES) : i===top3.length-1 ? pick(LOSER_TITLES) : "惜しい人"}</b></div>
          <div class="stat-row"><span>馬番</span><b>${getRunnerIndex(r)+1}</b></div>
          <div class="stat-row"><span>特性</span><b>${r.tags.map(k=>tagByKey(k).label).slice(0,2).join("・")}</b></div>
        </div>
      </article>
    `).join("")}

    <div class="podium">
      ${top3[1] ? podiumCard(2, top3[1]) : ""}
      ${top3[0] ? podiumCard(1, top3[0], "first") : ""}
      ${top3[2] ? podiumCard(3, top3[2]) : ""}
    </div>

    <div class="title-grid">
      <div class="title-box">👑 本日の称号：<b>${pick(CHAMPION_TITLES)}</b><br>${winner.horseName}</div>
      <div class="title-box">💀 今日のやらかし：<b>${pick(LOSER_TITLES)}</b><br>${last.horseName}</div>
    </div>

    <div class="interview">
      <h4>勝利インタビュー</h4>
      <p><b>Q. ${interview[0]}</b></p>
      <p>A. ${interview[1]}</p>
    </div>

    <div class="mvp-line">📣 今日のMVP：<b>${winner.horseName}</b>　👑</div>
  `;
}

function podiumCard(rank, r, extra=""){
  return `<div class="podium-card ${extra}">
    <div class="podium-rank">${rank===1?"🥇":rank===2?"🥈":"🥉"}</div>
    <div class="podium-name">${r.horseName}</div>
    <div>${r.name}</div>
  </div>`;
}

async function downloadPaper(id, filename){
  const el=$(id);
  const canvas=await html2canvas(el,{backgroundColor:"#f7f7f2",scale:2,useCORS:true});
  const a=document.createElement("a");
  a.download=filename;
  a.href=canvas.toDataURL("image/png");
  a.click();
}

$("addRunnerBtn").onclick=()=>addRunner({name:"",tags:["natural"],photo:""});
$("startRaceBtn").onclick=startRace;
$("downloadEntryBtn").onclick=()=>downloadPaper("entryPaper","friend-derby-entry-v4.png");
$("downloadResultBtn").onclick=()=>downloadPaper("resultPaper","friend-derby-result-v4.png");
["raceName","purpose","venue"].forEach(id=>$(id).addEventListener("input",()=>{ state.results=[]; renderAll(); }));
window.addEventListener("resize",()=>renderTrack());

defaultRunners().forEach(addRunner);
renderAll();
