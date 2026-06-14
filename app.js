const $ = (id)=>document.getElementById(id);
const state = {
  runners: [],
  results: [],
  racing: false,
  lockedOrder: [],
  raceState: [],
  lastRankKeys: "",
  activeRaceTime: 0,
  lastFrameTime: 0,
  paused: false,
  finishIds: []
};

const marks = ["◎","○","▲","△","☆","注","穴","笑"];
const gateClasses = ["g1","g2","g3"];
const RACE_DURATION = 15000;      // 15秒で1周
const BOOST_DURATION = 2400;      // スキル加速表示時間
const STOP_DURATION = 1500;       // ハプニング停止時間
const CUTIN_DURATION = 950;       // カットイン中はレース時間を止める
const FINISH_WINDOW = 1200;       // ゴール順表示の時間幅

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
  const first = Math.random() < 0.28 ? katakanaName(r.name) : pick(t.parts);
  r.horseName = `${first}${pick(ENDINGS)}`.replace(/[^ァ-ヴー]/g,"");
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
  return pick(COMMENT_TEMPLATES[r.tags[0] || "natural"] || ["本紙の評価は高いが、根拠はかなり薄い。"]);
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
      <div class="tag-row">${TAGS.map(t=>`<span class="tag ${r.tags.includes(t.key)?"active":""}" data-tag="${i}:${t.key}">${t.label}</span>`).join("")}</div>
      <div class="reroll-row"><button class="tiny-btn ghost" data-reroll="${i}">この馬名だけ再生成</button></div>
    `;
    root.appendChild(card);
  });

  root.querySelectorAll("[data-name]").forEach(el=>el.oninput=e=>{
    const r=state.runners[+el.dataset.name];
    r.name=e.target.value;
    generateRunner(r);
    state.results=[];
    renderAll();
  });

  root.querySelectorAll("[data-tag]").forEach(el=>el.onclick=()=>{
    const [idx,key]=el.dataset.tag.split(":");
    const r=state.runners[+idx];
    r.tags.includes(key) ? r.tags=r.tags.filter(x=>x!==key) : r.tags.push(key);
    if(!r.tags.length) r.tags=["natural"];
    generateRunner(r);
    state.results=[];
    flashMessage(`${r.name || "名無し"} → ${r.horseName} を生成`);
    renderAll();
  });

  root.querySelectorAll("[data-reroll]").forEach(el=>el.onclick=()=>{
    const r=state.runners[+el.dataset.reroll];
    generateRunner(r);
    state.results=[];
    flashMessage(`${r.horseName} が誕生`);
    renderAll();
  });

  root.querySelectorAll("[data-photo]").forEach(el=>el.onchange=e=>{
    const file=e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      state.runners[+el.dataset.photo].photo=reader.result;
      renderAll();
    };
    reader.readAsDataURL(file);
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
  const race=$("raceName").value;
  const purpose=$("purpose").value;
  const venue=$("venue").value;
  const today=new Date().toLocaleDateString("ja-JP");

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
    <div class="comment">※印・オッズは雰囲気です。結果は毎回ランダムです。</div>
  `;
}

function renderHorseCard(r,i,sorted){
  const popular = sorted.indexOf(r);
  return `
    <article class="horse-card">
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

function horseMarkup(r){
  const faceStyle = r.photo ? `style="background-image:url('${r.photo}')"` : "";
  const faceText = r.photo ? "" : (r.name || "顔").slice(0,2);
  return `<div class="cute-horse">
    <div class="jockey-face" ${faceStyle}>${faceText}</div>
    <div class="horse-tail"></div>
    <div class="horse-body"></div>
    <div class="horse-head"><div class="horse-ear"></div><div class="horse-eye"></div></div>
    <div class="horse-mane"></div>
    <div class="horse-leg leg1"></div>
    <div class="horse-leg leg2"></div>
  </div>`;
}

function ensureRankNotice(){
  let notice = $("rankNotice");
  if(!notice){
    notice = document.createElement("div");
    notice.id = "rankNotice";
    notice.className = "rank-notice hidden";
    $("raceTrack").appendChild(notice);
  }
  return notice;
}

function renderTrack(){
  const root = $("raceTrack");
  root.querySelectorAll(".runner-dot").forEach(n=>n.remove());
  $("goalBoard").classList.add("hidden");
  $("finishOverlay").classList.add("hidden");
  root.className="oval-track";
  $("cameraLabel").textContent="待機中";
  state.lastRankKeys = "";
  state.finishIds = [];

  state.runners.forEach((r,i)=>{
    const dot=document.createElement("div");
    dot.className="runner-dot";
    dot.id=`dot-${i}`;
    dot.innerHTML=`${horseMarkup(r)}<span class="mini-name">${i+1} ${r.horseName}</span>`;
    root.appendChild(dot);
    setDotPosition(i, 0, i);
  });
  ensureRankNotice().classList.add("hidden");
  updateLiveRank([]);
}

function ovalPoint(percent,lane=0){
  const track=$("raceTrack");
  const w=track.clientWidth || 500;
  const h=track.clientHeight || 320;
  const cx=w/2;
  const cy=h/2;
  const rx=w/2-52-lane*15;
  const ry=h/2-52-lane*10;
  const theta=-Math.PI/2+percent*2*Math.PI;
  return {x:cx+rx*Math.cos(theta), y:cy+ry*Math.sin(theta)};
}
function setDotPosition(i,percent,laneIndex){
  const el=$(`dot-${i}`);
  if(!el) return;
  const p=ovalPoint(percent,laneIndex%3);
  el.style.left=`${p.x}px`;
  el.style.top=`${p.y}px`;
}

function currentRankedStates(){
  return [...state.raceState].sort((a,b)=>b.progress-a.progress);
}

function updateLiveRank(raceState){
  const list=$("liveRankList");
  if(!raceState.length){
    list.innerHTML="レース開始待ち";
    list.className="";
    return;
  }
  const ranked=currentRankedStates();
  const key=ranked.map(s=>s.runner.id).join(",");
  const changed = state.lastRankKeys && state.lastRankKeys !== key;
  list.className = "live-rank-list" + (changed ? " rank-change" : "");
  if(changed) showRankNotice(ranked);
  state.lastRankKeys=key;
  list.innerHTML=ranked.map((s,i)=>`<div class="live-rank-row"><span>${i+1}位 ${s.runner.horseName}</span><b>${Math.floor(s.progress*100)}%</b></div>`).join("");
}

function showRankNotice(ranked){
  const notice = ensureRankNotice();
  notice.classList.remove("hidden");
  notice.innerHTML = `<div>順位変動！</div><div class="small">現在1位：${ranked[0].runner.horseName}</div>`;
  clearTimeout(showRankNotice.timer);
  showRankNotice.timer = setTimeout(()=>notice.classList.add("hidden"), 850);
}

function showEvent(kind,title,body,type="skill",runnerIndex=null){
  $("eventCard").className=`event-card ${type}`;
  $("eventCard").innerHTML=`<div class="event-kind">${kind}</div><div class="event-title">${title}</div><div class="event-body">${body}</div>`;
  document.querySelectorAll(".runner-dot").forEach(d=>d.classList.remove("skill"));
  if(runnerIndex!==null){
    const dot=$(`dot-${runnerIndex}`);
    if(dot) dot.classList.add("skill");
    setTimeout(()=>dot&&dot.classList.remove("skill"),1600);
  }
}

async function showCutin(kind,runner,title,body,type="skill"){
  state.paused = true;
  const cutin=$("cutin");
  cutin.className=`cutin ${type}`;
  $("cutinKind").textContent=kind;
  $("cutinHorse").textContent=runner.horseName;
  $("cutinTitle").textContent=title;
  $("cutinBody").textContent=body;
  const photo=$("cutinPhoto");
  photo.style.backgroundImage=runner.photo?`url("${runner.photo}")`:"";
  photo.textContent=runner.photo?"":runner.name||"騎手";
  await sleep(CUTIN_DURATION);
  cutin.classList.add("hidden");
  state.paused = false;
  state.lastFrameTime = performance.now();
}

function makeRaceEvent(r, forcedType=null){
  const tag=tagByKey(pick(r.tags));
  const rare=Math.random()<0.08;
  const positive = forcedType ? forcedType === "skill" : Math.random()<0.55;

  if(rare && positive){
    return {kind:"SSRスキル",title:"キセキノオイコミ",body:`${r.horseName}、主人公みたいな加速！`,type:"rare",mode:"boost",duration:2500,mult:2.7};
  }
  if(positive){
    return {kind:"スキル発動",title:tag.good,body:tag.skill,type:"skill",mode:"boost",duration:BOOST_DURATION,mult:2.35};
  }
  return {kind:"ハプニング",title:tag.bad,body:tag.trouble,type:"happening",mode:"stop",duration:STOP_DURATION,mult:0};
}

async function showGate(){
  $("gateRows").innerHTML=state.runners.map((r,i)=>`<div class="gate-row"><div class="gate-no">${i+1}</div><div class="gate-name">${r.horseName}</div></div>`).join("");
  $("gateScene").classList.remove("hidden");
  $("cameraLabel").textContent="ゲートカメラ";
  for(const n of ["3","2","1","OPEN!"]){
    $("countdown").textContent=n;
    await sleep(n==="OPEN!"?520:450);
  }
  $("gateScene").classList.add("hidden");
}

function initRaceState(){
  const finalOrder=shuffle(state.runners);
  return state.runners.map((r,i)=>({
    runner:r,
    progress: Math.random()*0.015,
    baseScale: 0.86 + Math.random()*0.28,
    boostRemaining: 0,
    boostMult: 1,
    stopRemaining: 0,
    finalRank: finalOrder.indexOf(r),
    finishAt: RACE_DURATION - FINISH_WINDOW + finalOrder.indexOf(r)*(FINISH_WINDOW/Math.max(1, state.runners.length-1)),
    finished: false
  }));
}

async function startRace(){
  if(state.racing || state.runners.length<2) return;
  state.racing=true;
  state.results=[];
  renderTrack();
  await showGate();

  state.raceState=initRaceState();
  state.lockedOrder=[...state.raceState].sort((a,b)=>a.finalRank-b.finalRank).map(s=>s.runner);
  state.activeRaceTime = 0;
  state.lastFrameTime = performance.now();
  state.paused = false;
  state.finishIds = [];
  state.lastRankKeys = "";

  const log=[pick(RACE_LINES.start),"15秒で1周。途中で加速・停止が入ります。"];
  $("commentary").innerHTML=log.join("<br>");
  showEvent("実況","スタート","各馬ゆっくり飛び出しました！","idle");

  let eventFlags = { e1:false, e2:false, e3:false, e4:false };

  async function loop(now){
    if(!state.racing) return;

    if(state.paused){
      state.lastFrameTime = now;
      requestAnimationFrame(loop);
      return;
    }

    const delta = Math.min(60, Math.max(0, now - state.lastFrameTime));
    state.lastFrameTime = now;
    state.activeRaceTime = Math.min(RACE_DURATION, state.activeRaceTime + delta);
    const t = state.activeRaceTime / RACE_DURATION;

    setCamera(t);
    advanceRace(delta);
    updateTrackDots(now);
    updateLiveRank(state.raceState);

    if(state.activeRaceTime >= 3000 && !eventFlags.e1){
      eventFlags.e1=true;
      log.push(pick(RACE_LINES.corner1));
      $("commentary").innerHTML=log.slice(-5).join("<br>");
      await triggerScriptedEvent("happening", log);
    }

    if(state.activeRaceTime >= 6000 && !eventFlags.e2){
      eventFlags.e2=true;
      log.push(pick(RACE_LINES.back));
      $("commentary").innerHTML=log.slice(-5).join("<br>");
      await triggerScriptedEvent("skill", log);
    }

    if(state.activeRaceTime >= 9000 && !eventFlags.e3){
      eventFlags.e3=true;
      await triggerScriptedEvent(Math.random()<0.5 ? "skill" : "happening", log);
    }

    if(state.activeRaceTime >= 12000 && !eventFlags.e4){
      eventFlags.e4=true;
      log.push(pick(RACE_LINES.corner4));
      $("commentary").innerHTML=log.slice(-5).join("<br>");
      await triggerLastSpurt(log);
    }

    handleFinish();

    if(state.activeRaceTime < RACE_DURATION || state.finishIds.length < state.runners.length){
      requestAnimationFrame(loop);
    } else {
      finishRace();
    }
  }

  requestAnimationFrame(loop);
}

function advanceRace(delta){
  const baseStep = delta / RACE_DURATION;
  const finalPhase = state.activeRaceTime >= 11800;

  state.raceState.forEach(s=>{
    if(s.finished) return;

    let mult = s.baseScale;
    if(s.stopRemaining > 0){
      mult = 0;
      s.stopRemaining = Math.max(0, s.stopRemaining - delta);
    } else if(s.boostRemaining > 0){
      mult *= s.boostMult;
      s.boostRemaining = Math.max(0, s.boostRemaining - delta);
    }

    let step = baseStep * mult;

    // 終盤だけ、決定済み順位へ「前進だけ」で自然収束させる
    if(finalPhase){
      const timeLeft = Math.max(300, s.finishAt - state.activeRaceTime);
      const neededStep = Math.max(0, (0.995 - s.progress) * (delta / timeLeft) * 1.08);
      step = Math.max(step, neededStep);
    }

    const next = s.progress + step;
    s.progress = clamp(Math.max(s.progress, next), 0, 0.999);
  });
}

function updateTrackDots(now){
  state.raceState.forEach(s=>{
    const idx=getRunnerIndex(s.runner);
    const dot=$(`dot-${idx}`);
    setDotPosition(idx,s.progress,idx);
    if(dot){
      dot.classList.toggle("stopped", s.stopRemaining > 0);
      dot.classList.toggle("skill", s.boostRemaining > 0);
    }
  });
}

function chooseEventTarget(kind){
  const ranked = currentRankedStates().filter(s=>!s.finished);
  if(!ranked.length) return null;

  if(kind === "happening"){
    return pick(ranked.slice(0, Math.min(2, ranked.length))); // 先頭側を止めて抜かせる
  }
  if(kind === "skill"){
    return pick(ranked.slice(Math.max(1, Math.floor(ranked.length/2)))); // 後方側を加速して追わせる
  }
  return pick(ranked);
}

async function triggerScriptedEvent(kind, log){
  const s = chooseEventTarget(kind);
  if(!s) return;
  const ev = makeRaceEvent(s.runner, kind);
  applyEventEffect(s, ev);
  const effect = ev.mode === "boost" ? "速度アップ！" : "その場停止！";
  log.push(`${ev.kind}：${s.runner.horseName}「${ev.title}」${effect}`);
  $("commentary").innerHTML=log.slice(-5).join("<br>");
  showEvent(ev.kind, ev.title, `${s.runner.horseName}：${ev.body} / ${effect}`, ev.type, getRunnerIndex(s.runner));
  await showCutin(ev.kind, s.runner, ev.title, `${ev.body} ${effect}`, ev.type);
}

async function triggerLastSpurt(log){
  const winner = state.lockedOrder[0];
  const s = state.raceState.find(x=>x.runner.id===winner.id);
  if(!s) return;
  const ev = {kind:"ラストスパート", title:"ウンメイノツッコミ", body:`${winner.horseName}、ゴール前カメラで一気に加速！`, type:"rare", mode:"boost", duration:2200, mult:2.55};
  applyEventEffect(s, ev);
  log.push(`${winner.horseName}、最後の直線で加速！`);
  $("commentary").innerHTML=log.slice(-5).join("<br>");
  showEvent(ev.kind, ev.title, ev.body, ev.type, getRunnerIndex(winner));
  await showCutin(ev.kind, winner, ev.title, "ここから運命の直線！ 速度アップ！", ev.type);
}

function applyEventEffect(s, ev){
  if(ev.mode === "boost"){
    s.boostRemaining = ev.duration;
    s.boostMult = ev.mult;
    s.stopRemaining = 0;
  } else if(ev.mode === "stop"){
    s.stopRemaining = ev.duration;
    s.boostRemaining = 0;
  }
}

function setCamera(t){
  const track=$("raceTrack");
  track.classList.remove("camera-free","camera-leader","camera-corner","camera-finish");
  if(t<.18){
    track.classList.add("camera-free");
    $("cameraLabel").textContent="俯瞰カメラ";
  } else if(t<.55){
    track.classList.add("camera-leader");
    $("cameraLabel").textContent="先頭追跡カメラ";
  } else if(t<.78){
    track.classList.add("camera-corner");
    $("cameraLabel").textContent="第4コーナーカメラ";
  } else {
    track.classList.add("camera-finish");
    $("cameraLabel").textContent="ゴール前カメラ";
  }
}

function handleFinish(){
  state.lockedOrder.forEach((r, rank)=>{
    if(state.finishIds.includes(r.id)) return;
    const s = state.raceState.find(x=>x.runner.id===r.id);
    if(!s) return;

    if(state.activeRaceTime >= s.finishAt){
      s.progress = 1;
      s.finished = true;
      state.finishIds.push(r.id);
      const idx=getRunnerIndex(r);
      setDotPosition(idx,1,idx);
      const dot=$(`dot-${idx}`);
      if(dot){
        dot.classList.add("finished");
        dot.querySelector(".mini-name").textContent=`🏁 ${rank+1}着 ${r.horseName}`;
      }
      updateGoalBoard(state.finishIds);
      showFinishOverlay(rank+1, r);
    }
  });
}

async function showFinishOverlay(rank,runner){
  const ov=$("finishOverlay");
  ov.classList.remove("hidden");
  ov.innerHTML=`<div><div class="big">${rank}着！</div><div class="name">${runner.horseName}</div><div>騎手：${runner.name}</div></div>`;
  await sleep(520);
  ov.classList.add("hidden");
}

function updateGoalBoard(goalIds){
  const board=$("goalBoard");
  board.classList.remove("hidden");
  const finished=goalIds.map(id=>state.lockedOrder.find(r=>r.id===id)).filter(Boolean);
  board.innerHTML=`<h3>GOAL!</h3>${finished.map((r,i)=>`<div class="goal-line"><span class="goal-rank">${i+1}着</span><span>${getRunnerIndex(r)+1}番 ${r.horseName}</span></div>`).join("")}`;
}

function finishRace(){
  state.racing=false;
  state.results=[...state.lockedOrder];
  state.lockedOrder.forEach((r,rank)=>setDotPosition(getRunnerIndex(r),1,getRunnerIndex(r)));
  $("commentary").innerHTML=`${pick(RACE_LINES.finish)}<br>1着 ${state.results[0].horseName}、2着 ${state.results[1]?.horseName||"-"}、3着 ${state.results[2]?.horseName||"-"}。`;
  showEvent("結果確定",`${state.results[0].horseName} 1着`,`${$("purpose").value} の結果が確定しました。`,"rare",getRunnerIndex(state.results[0]));
  updateGoalBoard(state.results.map(r=>r.id));
  renderResultPaper(state.results);
}

function rankClass(i){ return i===0 ? "rank-1" : i===1 ? "rank-2" : "rank-3"; }
function rankReason(i){ return i===0 ? `勝因：${pick(WIN_REASONS)}` : `敗因：${pick(LOSE_REASONS)}`; }

function renderResultPaper(results){
  const ranked=results.length ? results : sortedByOdds();
  const race=$("raceName").value;
  const purpose=$("purpose").value;
  const venue=$("venue").value;
  const today=new Date().toLocaleDateString("ja-JP");
  const winner=ranked[0] || state.runners[0] || {};
  const top3=ranked.slice(0,3);
  const interview=pick(INTERVIEWS);

  $("resultPaper").innerHTML=`
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
            <div class="jockey-line"><span class="jockey-label">騎手</span>${r.name||"名無し"}</div>
            <div class="reason-box">${rankReason(i)}</div>
          </div>
        </div>
      </article>
    `).join("")}
    <div class="podium">
      ${top3[1]?podiumCard(2,top3[1]):""}
      ${top3[0]?podiumCard(1,top3[0],"first"):""}
      ${top3[2]?podiumCard(3,top3[2]):""}
    </div>
    <div class="interview">
      <h4>勝利インタビュー</h4>
      <p><b>Q. ${interview[0]}</b></p>
      <p>A. ${interview[1]}</p>
    </div>
    <div class="mvp-line">📣 今日のMVP：<b>${winner.horseName}</b>　👑</div>
  `;
}
function podiumCard(rank,r,extra=""){
  return `<div class="podium-card ${extra}"><div class="podium-rank">${rank===1?"🥇":rank===2?"🥈":"🥉"}</div><div>${r.horseName}</div><div>${r.name}</div></div>`;
}

async function downloadPaper(id, filename){
  const canvas=await html2canvas($(id),{backgroundColor:"#f7f7f2",scale:2,useCORS:true});
  const a=document.createElement("a");
  a.download=filename;
  a.href=canvas.toDataURL("image/png");
  a.click();
}

$("addRunnerBtn").onclick=()=>addRunner({name:"",tags:["natural"],photo:""});
$("startRaceBtn").onclick=startRace;
$("downloadEntryBtn").onclick=()=>downloadPaper("entryPaper","friend-derby-entry-v6.png");
$("downloadResultBtn").onclick=()=>downloadPaper("resultPaper","friend-derby-result-v6.png");
["raceName","purpose","venue"].forEach(id=>$(id).addEventListener("input",()=>{state.results=[];renderAll()}));
window.addEventListener("resize",()=>renderTrack());

defaultRunners().forEach(addRunner);
renderAll();
