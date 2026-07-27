const APP_VERSION="v10.0";
const FEATURE_LEVEL=10;
const STORAGE_KEY="baccaratAnalyzerGames";
const SESSION_KEY="baccaratAnalyzerSessionName";
const THEME_KEY="baccaratAnalyzerTheme";
let games=loadGames();
let redoStack=[];

const featureLevels={stats:1,bead:2,bigroad:3,recent:4,streaks:5,difference:6,charts:7,transfer:8,derived:10};
document.querySelectorAll("[data-feature]").forEach(el=>{const f=el.dataset.feature;el.dataset.hidden=FEATURE_LEVEL<(featureLevels[f]||1)?"true":"false"});

function addGame(){
 const bankerInput=document.getElementById("banker"),playerInput=document.getElementById("player");
 const bt=bankerInput.value.trim(),pt=playerInput.value.trim();
 if(bt===""||pt===""){showMessage("請輸入莊與閒的點數","error");return}
 const banker=Number(bt),player=Number(pt);
 if(!Number.isInteger(banker)||!Number.isInteger(player)||banker<0||banker>9||player<0||player>9){showMessage("點數只能輸入 0～9 的整數","error");return}
 let winner="和";if(banker>player)winner="莊";else if(player>banker)winner="閒";
 games.push({banker,player,difference:banker-player,winner,createdAt:new Date().toISOString()});
 redoStack=[];saveGames();renderAll();clearInputs();showMessage("牌局已新增","success")
}

function calcRate(c,t){return t===0?"0.0":((c/t)*100).toFixed(1)}
function counts(list){let b=0,p=0,t=0;list.forEach(g=>g.winner==="莊"?b++:g.winner==="閒"?p++:t++);return{b,p,t,total:list.length}}

function updateStats(){
 const c=counts(games);
 document.getElementById("stats").innerHTML=[
  ["總局數",c.total],["莊",`${c.b} 次（${calcRate(c.b,c.total)}%）`],["閒",`${c.p} 次（${calcRate(c.p,c.total)}%）`],["和",`${c.t} 次（${calcRate(c.t,c.total)}%）`]
 ].map(x=>`<div class="stat-card"><span class="stat-label">${x[0]}</span><strong class="stat-value">${x[1]}</strong></div>`).join("")
}

function updateRecent(){
 const box=document.getElementById("recentStats");if(!box)return;
 box.innerHTML=[10,20,50].map(n=>{const c=counts(games.slice(-n));return`<div class="recent-card"><strong>最近 ${n} 局</strong><div>莊 ${c.b}｜閒 ${c.p}｜和 ${c.t}</div><div>莊率 ${calcRate(c.b,c.total)}%｜閒率 ${calcRate(c.p,c.total)}%</div></div>`}).join("")
}

function getStreaks(){
 let currentType="",current=0,maxB=0,maxP=0;
 games.filter(g=>g.winner!=="和").forEach(g=>{if(g.winner===currentType)current++;else{currentType=g.winner;current=1}if(currentType==="莊")maxB=Math.max(maxB,current);else maxP=Math.max(maxP,current)});
 return{currentType,current,maxB,maxP}
}
function updateStreaks(){
 const s=getStreaks(),box=document.getElementById("streakStats");if(!box)return;
 box.innerHTML=[["目前連續",s.currentType?`${s.currentType} ${s.current} 局`:"0"],["最長連莊",s.maxB],["最長連閒",s.maxP],["非和局數",games.filter(g=>g.winner!=="和").length]].map(x=>`<div class="stat-card"><span class="stat-label">${x[0]}</span><strong class="stat-value">${x[1]}</strong></div>`).join("")
}

function renderBeadRoad(){
 const box=document.getElementById("beadRoad");if(!box)return;
 const cols=Math.max(12,Math.ceil(games.length/6));let html="";
 for(let c=0;c<cols;c++)for(let r=0;r<6;r++){const i=c*6+r,g=games[i];html+=g?`<div class="cell"><div class="bead ${g.winner==="莊"?"banker":g.winner==="閒"?"player":"tie"}">${g.winner}</div></div>`:`<div class="cell"></div>`}
 box.innerHTML=html
}

function buildBigRoad(){
 const seq=[];let lastNonTie=-1;
 games.forEach((g,index)=>{if(g.winner==="和"){if(lastNonTie>=0)seq[lastNonTie].ties++;return}seq.push({result:g.winner,ties:0,sourceIndex:index});lastNonTie=seq.length-1});
 const cells=[],occ=new Set();let prev=null,streakStart=0;
 seq.forEach((item,i)=>{let col,row;if(i===0){col=0;row=0;streakStart=0}else if(item.result===prev.result){col=prev.col;row=prev.row+1;if(row>5||occ.has(`${col},${row}`)){row=prev.row;col=prev.col+1;while(occ.has(`${col},${row}`))col++}}else{streakStart=streakStart+1;col=streakStart;row=0;while(occ.has(`${col},${row}`)){col++;streakStart=col}}
 const cell={...item,col,row};cells.push(cell);occ.add(`${col},${row}`);prev=cell});
 return cells
}

function renderGridRoad(boxId,cells,mini=false){
 const box=document.getElementById(boxId);if(!box)return;
 const maxCol=Math.max(11,...cells.map(c=>c.col));box.style.width=`${(maxCol+1)*52}px`;
 box.innerHTML=cells.map(c=>mini?`<div class="mini-mark ${c.color}" style="left:${c.col*52}px;top:${c.row*52}px"></div>`:`<div class="road-mark ${c.result==="莊"?"banker":"player"}" style="left:${c.col*52}px;top:${c.row*52}px">${c.result}${c.ties?`<span class="tie-badge">${c.ties}</span>`:""}</div>`).join("")
}

function buildDerived(big,offset){
 const heights={};big.forEach(c=>heights[c.col]=Math.max(heights[c.col]||0,c.row+1));
 const out=[];big.forEach(c=>{const minCol=offset+1;if(c.col<minCol)return;let red;
  if(c.row===0)red=(heights[c.col-1]||0)===(heights[c.col-offset-1]||0);
  else red=big.some(x=>x.col===c.col-offset&&x.row===c.row);
  out.push({color:red?"red":"blue"})
 });
 let col=0,row=0,prev=null,occ=new Set(),streakStart=0;
 return out.map((x,i)=>{if(i===0){col=0;row=0;streakStart=0}else if(x.color===prev.color){let nr=row+1,nc=col;if(nr>5||occ.has(`${nc},${nr}`)){nr=row;nc=col+1;while(occ.has(`${nc},${nr}`))nc++}row=nr;col=nc}else{streakStart++;col=streakStart;row=0;while(occ.has(`${col},${row}`)){col++;streakStart=col}}const cell={...x,col,row};occ.add(`${col},${row}`);prev=cell;return cell})
}

function renderRoads(){const big=buildBigRoad();renderGridRoad("bigRoad",big,false);if(FEATURE_LEVEL>=10){renderGridRoad("bigEyeRoad",buildDerived(big,1),true);renderGridRoad("smallRoad",buildDerived(big,2),true);renderGridRoad("cockroachRoad",buildDerived(big,3),true)}}

function updateDifference(){
 const box=document.getElementById("differenceStats");if(!box)return;const map={};for(let i=-9;i<=9;i++)map[i]=0;games.forEach(g=>map[g.difference]++);
 box.innerHTML=Object.keys(map).map(k=>`<div class="difference-card"><span>差值 ${Number(k)>0?"+":""}${k}</span><strong>${map[k]}</strong></div>`).join("")
}

function drawBarChart(canvasId,labels,values,title){
 const canvas=document.getElementById(canvasId);if(!canvas)return;const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#111827";ctx.font="22px sans-serif";ctx.fillText(title,24,34);
 const max=Math.max(1,...values),pad=55,chartH=h-95,bw=(w-pad*2)/values.length;
 values.forEach((v,i)=>{const bh=v/max*chartH;ctx.fillStyle="#64748b";ctx.fillRect(pad+i*bw,h-45-bh,bw*.68,bh);ctx.fillStyle="#111827";ctx.font="14px sans-serif";ctx.textAlign="center";ctx.fillText(labels[i],pad+i*bw+bw*.34,h-22);ctx.fillText(v,pad+i*bw+bw*.34,h-50-bh)});ctx.textAlign="start"
}
function drawCharts(){if(FEATURE_LEVEL<7)return;const c=counts(games);drawBarChart("resultChart",["莊","閒","和"],[c.b,c.p,c.t],"莊／閒／和次數");const m={};for(let i=-9;i<=9;i++)m[i]=0;games.forEach(g=>m[g.difference]++);drawBarChart("differenceChart",Object.keys(m),Object.values(m),"點數差值分布")}

function showHistory(){
 const history=document.getElementById("history"),q=document.getElementById("historySearch").value.trim().toLowerCase();
 const rows=games.map((g,i)=>({g,i})).filter(({g,i})=>!q||String(i+1).includes(q)||g.winner.includes(q)||String(g.banker).includes(q)||String(g.player).includes(q));
 history.innerHTML=rows.length?rows.map(({g,i})=>`<div class="game-record"><div class="record-title"><strong>第 ${i+1} 局</strong><span class="winner ${g.winner==="莊"?"banker":g.winner==="閒"?"player":"tie"}">${g.winner}</span></div><div class="record-details"><span>莊：${g.banker} 點</span><span>閒：${g.player} 點</span><span>差值：${g.difference>0?"+":""}${g.difference}</span><span>${new Date(g.createdAt).toLocaleString("zh-TW")}</span></div></div>`).join(""):'<p class="empty-text">尚無符合的牌局資料</p>'
}

function undoLastGame(){if(!games.length){showMessage("目前沒有可以刪除的牌局","error");return}redoStack.push(games.pop());saveGames();renderAll();showMessage("已刪除上一局","success")}
function redoLastGame(){if(!redoStack.length){showMessage("沒有可以復原的牌局","error");return}games.push(redoStack.pop());saveGames();renderAll();showMessage("已復原上一局","success")}
function clearAllGames(){if(!games.length){showMessage("目前沒有牌局資料","error");return}if(!confirm("確定要清除全部牌局嗎？清除後無法復原。"))return;games=[];redoStack=[];saveGames();renderAll();showMessage("全部牌局已清除","success")}
function clearInputs(){banker.value="";player.value="";banker.focus()}
function showMessage(text,type){message.textContent=text;message.className=type;clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>{message.textContent="";message.className=""},2500)}
function saveGames(){localStorage.setItem(STORAGE_KEY,JSON.stringify(games))}
function loadGames(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(x)?x:[]}catch{return[]}}
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function exportCsv(){const rows=[["局數","莊點數","閒點數","勝方","差值","時間"],...games.map((g,i)=>[i+1,g.banker,g.player,g.winner,g.difference,g.createdAt])];download("baccarat.csv",rows.map(r=>r.join(",")).join("\n"),"text/csv;charset=utf-8")}
function importCsv(file){const r=new FileReader();r.onload=()=>{try{const lines=String(r.result).trim().split(/\r?\n/).slice(1);const parsed=lines.filter(Boolean).map(line=>{const x=line.split(",");return{banker:Number(x[1]),player:Number(x[2]),winner:x[3],difference:Number(x[4]),createdAt:x[5]||new Date().toISOString()}});if(parsed.some(g=>!Number.isInteger(g.banker)||!Number.isInteger(g.player)))throw Error();games=parsed;saveGames();renderAll();showMessage("CSV 匯入成功","success")}catch{showMessage("CSV 格式不正確","error")}};r.readAsText(file,"utf-8")}
function exportJson(){download("baccarat_backup.json",JSON.stringify({version:APP_VERSION,session:sessionName.value,games},null,2),"application/json")}
function importJson(file){const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);if(!Array.isArray(obj.games))throw Error();games=obj.games;sessionName.value=obj.session||"";localStorage.setItem(SESSION_KEY,sessionName.value);saveGames();renderAll();showMessage("JSON 還原成功","success")}catch{showMessage("JSON 格式不正確","error")}};r.readAsText(file,"utf-8")}

function renderAll(){updateStats();updateRecent();updateStreaks();renderBeadRoad();renderRoads();updateDifference();drawCharts();showHistory()}

addButton.addEventListener("click",addGame);undoButton.addEventListener("click",undoLastGame);redoButton.addEventListener("click",redoLastGame);clearButton.addEventListener("click",clearAllGames);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&(document.activeElement===banker||document.activeElement===player))addGame()});
historySearch.addEventListener("input",showHistory);sessionName.value=localStorage.getItem(SESSION_KEY)||"";sessionName.addEventListener("input",()=>localStorage.setItem(SESSION_KEY,sessionName.value));
themeButton.addEventListener("click",()=>{document.body.classList.toggle("light");localStorage.setItem(THEME_KEY,document.body.classList.contains("light")?"light":"dark")});if(localStorage.getItem(THEME_KEY)==="light")document.body.classList.add("light");
if(FEATURE_LEVEL>=8){exportCsvButton.addEventListener("click",exportCsv);importCsvInput.addEventListener("change",e=>e.target.files[0]&&importCsv(e.target.files[0]));exportJsonButton.addEventListener("click",exportJson);importJsonInput.addEventListener("change",e=>e.target.files[0]&&importJson(e.target.files[0]))}
renderAll();banker.focus();
