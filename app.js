const $ = (id)=>document.getElementById(id);
const state = { runners: [], results: [] };
const tags = Object.keys(NAME_DATA.tags);
const frameColors = ["#ffffff","#111111","#d92323","#246bdb","#e6c800","#2db34a","#f08a24","#f5a6c8"];

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

function defaultRunners(){
  return [
    {name:"田中", tags:["遅刻","酒好き"], photo:""},
    {name:"佐藤", tags:["強気","陽キャ"], photo:""},
    {name:"鈴木", tags:["眠い","天然"], photo:""},
    {name:"山田", tags:["真面目","金欠"], photo:""}
  ];
}

function addRunner(data={name:"", tags:[], photo:""}){
  state.runners.push({...data, horseName:"", stats:{}, odds:0, comment:""});
  renderRunnerList();
}

function renderRunnerList(){
  const root = $("runnerList");
  root.innerHTML = "";
  state.runners.forEach((r,i)=>{
    const card = document.createElement("div");
    card.className = "runner-card";
    card.innerHTML = `
      <div>
        <label class="photo-box">
          ${r.photo ? `<img src="${r.photo}">` : "写真"}
          <input type="file" accept="image/*" hidden data-photo="${i}">
        </label>
      </div>
      <div class="runner-fields">
        <label>騎手名<input value="${r.name}" data-name="${i}" placeholder="友だちの名前"></label>
        <div class="tag-row">${tags.map(t=>`<span class="tag ${r.tags.includes(t)?"active":""}" data-tag="${i}:${t}">${t}</span>`).join("")}</div>
        <div class="tiny">馬名：<b>${r.horseName || "未生成"}</b></div>
      </div>`;
    root.appendChild(card);
  });
  root.querySelectorAll("[data-name]").forEach(el=>el.oninput=e=>state.runners[+el.dataset.name].name=e.target.value);
  root.querySelectorAll("[data-tag]").forEach(el=>el.onclick=()=>{
    const [idx,tag]=el.dataset.tag.split(":"); const r=state.runners[+idx];
    r.tags.includes(tag) ? r.tags = r.tags.filter(x=>x!==tag) : r.tags.push(tag);
    renderRunnerList();
  });
  root.querySelectorAll("[data-photo]").forEach(el=>el.onchange=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{ state.runners[+el.dataset.photo].photo=reader.result; renderRunnerList(); };
    reader.readAsDataURL(file);
  });
}

function generateHorseName(r){
  const selected = r.tags.length ? r.tags : [pick(tags)];
  const first = pick(NAME_DATA.tags[pick(selected)] || NAME_DATA.generic);
  const style = Math.random();
  if(style < .15 && r.name) return `${r.name.slice(0,4)}${pick(NAME_DATA.endings)}`.replace(/\s/g,"").toUpperCase();
  if(style < .32) return `${pick(NAME_DATA.generic)}${first}`;
  return `${first}${pick(NAME_DATA.endings)}`;
}

function generateStats(r){
  const base = {speed:50, stamina:50, luck:50, mental:50, party:50, start:50};
  r.tags.forEach(t=>{
    if(t==="遅刻"){base.start-=25;base.luck+=12;base.speed+=8}
    if(t==="酒好き"){base.party+=25;base.stamina+=8;base.mental-=5}
    if(t==="眠い"){base.stamina-=15;base.luck+=10;base.start-=5}
    if(t==="金欠"){base.mental-=8;base.speed+=10;base.luck-=5}
    if(t==="強気"){base.mental+=25;base.speed+=8;base.luck-=6}
    if(t==="天然"){base.luck+=22;base.start-=8}
    if(t==="真面目"){base.start+=18;base.mental+=12;base.luck-=3}
    if(t==="大食い"){base.stamina+=20;base.party+=8}
    if(t==="陽キャ"){base.party+=20;base.mental+=8}
    if(t==="人見知り"){base.mental-=8;base.luck+=8;base.stamina+=6}
  });
  Object.keys(base).forEach(k=>base[k]=clamp(base[k]+Math.floor(Math.random()*31)-15, 5, 99));
  return base;
}

function generateAll(){
  state.runners.forEach((r)=>{
    r.horseName = generateHorseName(r);
    r.stats = generateStats(r);
    const power = r.stats.speed+r.stats.stamina+r.stats.luck+r.stats.mental+r.stats.party+r.stats.start;
    r.odds = Math.max(1.4, (520 / power + Math.random()*6)).toFixed(1);
    r.comment = makeComment(r);
  });
  renderEntryPaper();
  renderTrack();
  renderResultPaper([]);
}

function makeComment(r){
  const tag = r.tags[0] || pick(tags);
  const phrases = {
    "遅刻":"前走も集合時間に姿を見せず。ただし終盤の追い込みは侮れない。",
    "酒好き":"得意条件は夜開催。二次会まで見据えたスタミナはメンバー随一。",
    "眠い":"仕上がりは半信半疑。目が覚めれば一発の魅力。",
    "金欠":"財布事情は厳しいが、割り勘回避への勝負根性は本物。",
    "強気":"根拠なき自信は今回も健在。ハマれば圧勝まで。",
    "天然":"展開は読めないが、読めなさそのものが最大の武器。",
    "真面目":"調整過程は堅実。大崩れしない安定感が魅力。",
    "大食い":"長丁場歓迎。ゴール後のご飯を目標に粘り込む。",
    "陽キャ":"場内人気は上々。声援を受けてさらに伸びるタイプ。",
    "人見知り":"内で脚をためる競馬が得意。静かな差し切りに注意。"
  };
  return phrases[tag] || "個性派ぞろいの一戦で存在感を放つ。";
}

function renderEntryPaper(){
  const race = $("raceName").value, grade=$("raceGrade").value, dist=$("raceDistance").value, venue=$("venue").value;
  const sorted = [...state.runners].sort((a,b)=>+a.odds-+b.odds);
  const marks=["◎","○","▲","△","☆","注","穴",""];
  $("entryPaper").innerHTML = `
    <div class="paper-header"><div><div class="paper-title">友ダビ新聞</div><div>本紙独占・爆笑出馬表</div></div><div class="paper-date">${new Date().toLocaleDateString("ja-JP")}<br>${venue}</div></div>
    <div class="headline">${race} ${grade}<br><span style="font-size:24px">主役候補は「${sorted[0]?.horseName || "未定"}」</span></div>
    <div class="subgrid">
      <div><span class="mark">◎</span> 本命 ${sorted[0]?.horseName || "-"}</div>
      <div><b>距離</b> ${dist}　<b>出走</b> ${state.runners.length}頭</div>
    </div>
    <table class="entry-table">
      <thead><tr><th>枠</th><th>顔</th><th>馬名 / 騎手</th><th>印</th><th>単勝</th><th>能力</th><th>本紙コメント</th></tr></thead>
      <tbody>${state.runners.map((r,i)=>`
        <tr>
          <td class="frame" style="background:${frameColors[i%frameColors.length]};color:${i==1?"#fff":"#111"}">${i+1}</td>
          <td>${r.photo?`<img class="face" src="${r.photo}">`:"<div class='face'></div>"}</td>
          <td><div class="horse-name">${r.horseName}</div><div class="tiny">騎手：${r.name || "名無し"} / ${r.tags.join("・") || "無印"}</div></td>
          <td class="mark">${marks[sorted.indexOf(r)]}</td>
          <td><b>${r.odds}</b></td>
          <td class="tiny">速${r.stats.speed} 持${r.stats.stamina} 運${r.stats.luck}<br>メ${r.stats.mental} ノ${r.stats.party} 出${r.stats.start}</td>
          <td>${r.comment}</td>
        </tr>`).join("")}</tbody>
    </table>
    <div class="odds-box">${sorted.slice(0,4).map((r,i)=>`<div><b>${i+1}人気</b> ${r.horseName} ${r.odds}倍</div>`).join("")}</div>
    <div class="news-comment">【編集部】本紙は完成度の高いネタ感を重視。実力、過去の印象、飲み会適性を総合して印を打った。なお予想の信頼度は極めて低い。</div>`;
}

function renderTrack(){
  const root=$("raceTrack");
  root.innerHTML='<div class="finish-line"></div>' + state.runners.map((r,i)=>`<div class="lane"><div class="horse-icon" id="horse-${i}">🏇 ${r.horseName||r.name}</div></div>`).join("");
}

function eventLine(r){
  const tag = pick(r.tags.length?r.tags:tags);
  return pick(COMMENT_DATA.events[tag]||COMMENT_DATA.start).replace("{horse}", r.horseName);
}

function startRace(){
  if(!state.runners[0]?.horseName) generateAll();
  let progress = state.runners.map(()=>0);
  let tick=0;
  const log=[pick(COMMENT_DATA.start)];
  $("commentary").innerHTML = log.join("<br>");
  const timer=setInterval(()=>{
    tick++;
    state.runners.forEach((r,i)=>{
      const s=r.stats;
      let inc = 4 + s.speed/28 + s.luck/45 + Math.random()*7;
      if(tick>7) inc += s.stamina/36;
      if(tick<3) inc += s.start/45;
      if(Math.random()<.08) inc += (s.party-45)/10;
      progress[i]=Math.min(100, progress[i]+inc);
      const el=$(`horse-${i}`); if(el) el.style.left = `calc(${progress[i]}% - 42px)`;
    });
    if(tick===4 || tick===8 || tick===12){
      const leaderIndex = progress.indexOf(Math.max(...progress));
      log.push(tick===4?pick(COMMENT_DATA.corner):tick===8?eventLine(state.runners[leaderIndex]):pick(COMMENT_DATA.final));
      $("commentary").innerHTML = log.slice(-5).join("<br>");
    }
    if(progress.some(p=>p>=100) || tick>=16){
      clearInterval(timer);
      const results = state.runners.map((r,i)=>({r, score:progress[i]})).sort((a,b)=>b.score-a.score).map(x=>x.r);
      state.results=results;
      log.push(pick(COMMENT_DATA.finish));
      log.push(`1着は ${results[0].horseName}！`);
      $("commentary").innerHTML = log.slice(-6).join("<br>");
      renderResultPaper(results);
    }
  }, 700);
}

function renderResultPaper(results){
  const race=$("raceName").value, grade=$("raceGrade").value;
  if(!results.length) results=[...state.runners].sort((a,b)=>+a.odds-+b.odds);
  const winner=results[0] || {};
  $("resultPaper").innerHTML = `
    <div class="paper-header"><div><div class="paper-title">号外</div><div>FRIEND DERBY EXTRA</div></div><div class="paper-date">${new Date().toLocaleDateString("ja-JP")}<br>結果確定</div></div>
    <div class="headline">${winner.horseName || "未定"}<br><span style="font-size:26px">${race} ${grade} 制覇！</span></div>
    <div class="result-main">
      <div>${winner.photo?`<img class="winner-photo" src="${winner.photo}">`:"<div class='winner-photo'></div>"}</div>
      <div class="ranking">
        ${results.map((r,i)=>`<div><span class="badge">${i+1}着</span>${r.horseName}　<span class="tiny">騎手：${r.name}</span></div>`).join("")}
      </div>
    </div>
    <div class="news-comment">
      【勝因】${winner.horseName || "勝者"}は${pick(COMMENT_DATA.winReasons)}。レース後、関係者からは「今日だけは本当に強かった」と驚きの声が上がった。<br>
      【編集後記】本紙の予想が当たったかどうかはさておき、紙面映えは文句なしの一戦となった。
    </div>`;
}

async function downloadPaper(id, filename){
  const el=$(id);
  const canvas=await html2canvas(el,{backgroundColor:"#fff7df",scale:2,useCORS:true});
  const a=document.createElement("a");
  a.download=filename;
  a.href=canvas.toDataURL("image/png");
  a.click();
}

$("addRunnerBtn").onclick=()=>addRunner();
$("generateBtn").onclick=generateAll;
$("startRaceBtn").onclick=startRace;
$("downloadEntryBtn").onclick=()=>downloadPaper("entryPaper","friend-derby-entry.png");
$("downloadResultBtn").onclick=()=>downloadPaper("resultPaper","friend-derby-extra.png");
["raceName","raceGrade","raceDistance","venue"].forEach(id=>$(id).addEventListener("input",()=>{renderEntryPaper();renderResultPaper(state.results)}));

defaultRunners().forEach(addRunner);
generateAll();
