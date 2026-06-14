const $ = (id)=>document.getElementById(id);
const state = { runners: [], results: [], racing:false };
const marks = ["◎","○","▲","△","☆","注","穴","笑"];
const gateClasses = ["g1","g2","g3"];

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function tagByKey(key){ return TAGS.find(t=>t.key===key) || TAGS[0]; }
function katakanaName(name){
  if(NAME_KATAKANA[name]) return NAME_KATAKANA[name];
  return (name || "ナナシ").replace(/[^\u30A0-\u30FF]/g,"").slice(0,5) || "ナナシ";
}

function defaultRunners(){
  return [
    {name:"村埜", tags:["late","bold"], photo:""},
    {name:"西田", tags:["drink","party"], photo:""},
    {name:"山田", tags:["sleepy","serious"], photo:""}
  ];
}

function addRunner(data={name:"", tags:["natural"], photo:""}){
  const r = {
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
  return pick(COMMENT_TEMPLATES[key] || GENERIC_COMMENTS);
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
          <span class="frame-badge">${i+1}枠</span>
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
      flashMessage(`${r.name || "名無し"} → ${r.horseName} を生成`);
      renderAll();
    };
  });

  root.querySelectorAll("[data-reroll]").forEach(el=>{
    el.onclick = ()=>{
      const r=state.runners[+el.dataset.reroll];
      generateRunner(r);
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
  const c = $("commentary");
  c.innerHTML = `生成完了：${text}<br>新聞にも反映されました。`;
}

function sortedByOdds(){
  return [...state.runners].sort((a,b)=>parseFloat(a.odds)-parseFloat(b.odds));
}

function renderEntryPaper(){
  const sorted = sortedByOdds();
  const top = sorted[0] || state.runners[0] || {};
  const race = $("raceName").value, grade=$("raceGrade").value, venue=$("venue").value;
  const today = new Date().toLocaleDateString("ja-JP");

  $("entryPaper").innerHTML = `
    <div class="paper-header">
      <div><div class="masthead">友ダビスポーツ</div><div>しょうもない競馬新聞</div></div>
      <div class="paper-date">${today}<br>${venue}</div>
    </div>
    <section class="big-headline">
      <div class="race">${race} ${grade}</div>
      <h3>${top.horseName || "未定"}<br>主役譲らず</h3>
      <div class="lead">「${top.nickname || "しょうもなさ重賞級"}」本紙◎</div>
    </section>
    <section class="main-visual">
      ${top.photo ? `<img class="main-photo" src="${top.photo}" alt="">` : `<div class="main-photo"></div>`}
      <div class="forecast-box">
        ${sorted.slice(0,4).map((r,i)=>`<div class="mark-line"><span class="mark">${marks[i]}</span> ${r.horseName}<br><small>騎手：${r.name} / ${r.nickname}</small></div>`).join("")}
      </div>
    </section>
    <div class="odds-strip">
      ${sorted.slice(0,3).map((r,i)=>`<div>${i+1}人気<br><b>${r.odds}倍</b><br>${r.horseName}</div>`).join("")}
    </div>
    ${state.runners.map((r,i)=>renderHorseCard(r,i,sorted)).join("")}
    <div class="footer-note">※本紙の予想は雰囲気です。実在の競馬・馬券とは一切関係ありません。</div>
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
        <div class="pill">単勝 ${r.odds}倍</div>
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
  state.runners.forEach((r,i)=>{
    const dot=document.createElement("div");
    dot.className="runner-dot";
    dot.id=`dot-${i}`;
    dot.innerHTML=`<span class="horse-emoji">🐎</span><span class="mini-name">${r.horseName}</span>`;
    root.appendChild(dot);
    setDotPosition(i, 0, i);
  });
}

function ovalPoint(percent, lane=0){
  const track = $("raceTrack");
  const w = track.clientWidth || 480, h = track.clientHeight || 310;
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

function showEvent(kind,title,body,type="skill",runnerIndex=null){
  const card=$("eventCard");
  card.className=`event-card ${type}`;
  card.innerHTML=`<div class="event-kind">${kind}</div><div class="event-title">${title}</div><div class="event-body">${body}</div>`;
  document.querySelectorAll(".runner-dot").forEach(d=>d.classList.remove("skill"));
  if(runnerIndex!==null){
    const dot=$(`dot-${runnerIndex}`);
    if(dot) dot.classList.add("skill");
    setTimeout(()=>dot && dot.classList.remove("skill"),900);
  }
}

function makeRaceEvent(r, phase){
  const tag = tagByKey(pick(r.tags));
  const positive = Math.random() < 0.58;
  const rare = Math.random() < 0.08;
  if(rare){
    return {kind:"SSRスキル", title:"キセキノオイコミ", body:`${r.horseName}、なぜか急に主人公みたいな脚！`, boost:26, type:"rare"};
  }
  if(positive){
    return {kind:"スキル発動", title:tag.good, body:`${r.horseName}【${tag.skill}】`, boost:14 + Math.random()*15, type:"skill"};
  }
  return {kind:"ハプニング", title:tag.bad, body:`${r.horseName}【${tag.trouble}】`, boost:-8 - Math.random()*13, type:"happening"};
}

function startRace(){
  if(state.racing) return;
  state.racing = true;
  state.results = [];
  renderTrack();

  let progress = state.runners.map(()=>0);
  let boost = state.runners.map(()=>0);
  let tick = 0;
  const log = [pick(RACE_LINES.start)];
  $("commentary").innerHTML = log.join("<br>");
  showEvent("実況","ゲートオープン！","20秒くらいでしょうもない事件が起きます。","idle");

  const interval = setInterval(()=>{
    tick++;

    state.runners.forEach((r,i)=>{
      const base = 0.022 + r.stats.ノリ/5200 + r.stats.運/6200 + Math.random()*0.018;
      progress[i] += base + boost[i];
      boost[i] *= 0.35;
      progress[i] = clamp(progress[i],0,1);
      setDotPosition(i, progress[i], i);
    });

    if(tick===3){
      log.push(pick(RACE_LINES.corner1));
      showEvent("実況","第1コーナー",log[log.length-1],"skill");
    }

    if([5,8,11,14].includes(tick)){
      const idx = Math.floor(Math.random()*state.runners.length);
      const ev = makeRaceEvent(state.runners[idx], tick);
      boost[idx] += ev.boost/1000;
      log.push(`${ev.kind}：${state.runners[idx].horseName}「${ev.title}」`);
      showEvent(ev.kind, ev.title, ev.body, ev.type, idx);
    }

    if(tick===9){
      log.push(pick(RACE_LINES.back));
      showEvent("実況","向こう正面",log[log.length-1],"skill");
    }

    if(tick===15){
      log.push(pick(RACE_LINES.corner4));
      showEvent("実況","最後の直線",log[log.length-1],"skill");
      boost = boost.map((b,i)=> b + (state.runners[i].stats.事件/4500) + Math.random()*0.02);
    }

    $("commentary").innerHTML = log.slice(-5).join("<br>");

    if(progress.some(p=>p>=1) || tick>=21){
      clearInterval(interval);
      state.racing = false;
      const ranked = state.runners.map((r,i)=>({r,score:progress[i]})).sort((a,b)=>b.score-a.score).map(x=>x.r);
      state.results = ranked;
      ranked.forEach((r,i)=>setDotPosition(state.runners.indexOf(r), 1 - i*0.015, state.runners.indexOf(r)));
      log.push(pick(RACE_LINES.finish));
      log.push(`1着 ${ranked[0].horseName}！`);
      $("commentary").innerHTML = log.slice(-6).join("<br>");
      showEvent("結果確定",`${ranked[0].horseName} 優勝`,pick(WIN_REASONS),"rare",state.runners.indexOf(ranked[0]));
      renderResultPaper(ranked);
    }
  }, 850);
}

function chooseAward(r){
  const candidates = AWARDS.filter(a=>r.tags.some(k=>a.keys.includes(k)));
  return pick(candidates.length ? candidates : AWARDS).name;
}

function renderResultPaper(results){
  const ranked = results.length ? results : sortedByOdds();
  const winner = ranked[0] || state.runners[0] || {};
  const loser = ranked[ranked.length-1] || winner;
  const race=$("raceName").value, grade=$("raceGrade").value, venue=$("venue").value;
  const today = new Date().toLocaleDateString("ja-JP");

  $("resultPaper").innerHTML = `
    <div class="paper-header">
      <div><div class="masthead">号外</div><div>友ダビスポーツ速報</div></div>
      <div class="paper-date">${today}<br>${venue}</div>
    </div>
    <section class="big-headline">
      <div class="race">${race} ${grade} 結果確定</div>
      <h3>${winner.horseName || "未定"}<br>まさかの勝利</h3>
      <div class="lead">関係者「本人も驚いている」</div>
    </section>
    <section class="result-main">
      ${winner.photo ? `<img class="winner-photo" src="${winner.photo}" alt="">` : `<div class="winner-photo"></div>`}
      <div class="ranking">
        ${ranked.map((r,i)=>`<div><span class="badge">${i+1}着</span>${r.horseName}<br><small>騎手：${r.name} / ${i===0 ? pick(WIN_REASONS) : pick(LOSE_REASONS)}</small></div>`).join("")}
      </div>
    </section>
    <section class="award-grid">
      <div class="award">🏆 MVP：${winner.horseName} / ${chooseAward(winner)}</div>
      <div class="award">💀 今日のやらかし：${loser.horseName} / ${chooseAward(loser)}</div>
      <div class="award">📰 本紙総評：紙面映えだけは全員GI級。</div>
    </section>
    <div class="footer-note">※この号外は仲間内のしょうもない盛り上がり専用です。本人の許可を得て楽しく使ってください。</div>
  `;
}

async function downloadPaper(id, filename){
  const el=$(id);
  const canvas=await html2canvas(el,{backgroundColor:"#fff6df",scale:2,useCORS:true});
  const a=document.createElement("a");
  a.download=filename;
  a.href=canvas.toDataURL("image/png");
  a.click();
}

$("addRunnerBtn").onclick=()=>addRunner({name:"",tags:["natural"],photo:""});
$("startRaceBtn").onclick=startRace;
$("downloadEntryBtn").onclick=()=>downloadPaper("entryPaper","friend-derby-entry-v2.png");
$("downloadResultBtn").onclick=()=>downloadPaper("resultPaper","friend-derby-extra-v2.png");
["raceName","raceGrade","venue"].forEach(id=>$(id).addEventListener("input",()=>renderAll()));
window.addEventListener("resize",()=>renderTrack());

defaultRunners().forEach(addRunner);
renderAll();
