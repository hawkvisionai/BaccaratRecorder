const APP_VERSION="v11.0";
const FEATURE_LEVEL=11;
const DATA_KEY="baccaratAnalyzerDataV11";
const LEGACY_GAMES_KEY="baccaratAnalyzerGames";
const LEGACY_SESSION_KEY="baccaratAnalyzerSessionName";
const THEME_KEY="baccaratAnalyzerTheme";

let data=loadData();
let games=getCurrentShoe().games;
let redoStack=[];

const featureLevels={stats:1,bead:2,bigroad:3,recent:4,streaks:5,difference:6,charts:7,transfer:8,derived:10};
document.querySelectorAll("[data-feature]").forEach(el=>{const f=el.dataset.feature;el.dataset.hidden=FEATURE_LEVEL<(featureLevels[f]||1)?"true":"false"});

function loadData(){
 try{
  const saved=JSON.parse(localStorage.getItem(DATA_KEY)||"null");
  if(saved&&Array.isArray(saved.shoes)&&saved.shoes.length){
   if(!saved.shoes.some(s=>s.id===saved.currentShoeId))saved.currentShoeId=saved.shoes[0].id;
   const maxNo=Math.max(0,...saved.shoes.map(s=>Number(String(s.id).replace(/\D/g,""))||0));
   saved.nextShoeNumber=Math.max(Number(saved.nextShoeNumber)||1,maxNo+1);
   return saved;
  }
 }catch{}
 let oldGames=[];
 try{const x=JSON.parse(localStorage.getItem(LEGACY_GAMES_KEY)||"[]");if(Array.isArray(x))oldGames=x}catch{}
 const first={id:"S000001",name:localStorage.getItem(LEGACY_SESSION_KEY)||"",status:"open",createdAt:new Date().toISOString(),finishedAt:null,games:oldGames};
 const migrated={version:"11.0",currentShoeId:first.id,nextShoeNumber:2,shoes:[first]};
 localStorage.setItem(DATA_KEY,JSON.stringify(migrated));
 return migrated;
}
function saveData(){localStorage.setItem(DATA_KEY,JSON.stringify(data))}
function getCurrentShoe(){let s=data.shoes.find(x=>x.id===data.currentShoeId);if(!s){s=data.shoes[0];data.currentShoeId=s.id}return s}
function syncCurrent(){games=getCurrentShoe().games;sessionName.value=getCurrentShoe().name||""}
function nextShoe(name=""){const n=data.nextShoeNumber++;return{id:`S${String(n).padStart(6,"0")}`,name:name.trim(),status:"open",createdAt:new Date().toISOString(),finishedAt:null,games:[]}}
function formatDate(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString("zh-TW")}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function startNewShoe(){
 const cur=getCurrentShoe();
 if(cur.status==="open"&&cur.games.length&&!confirm("目前牌靴還沒結束。確定要結束它並開始新牌靴嗎？"))return;
 if(cur.status==="open"){cur.status="finished";cur.finishedAt=new Date().toISOString()}
 const name=prompt("新牌靴名稱（可留空）","")||"";
 const shoe=nextShoe(name);data.shoes.push(shoe);data.currentShoeId=shoe.id;redoStack=[];syncCurrent();saveData();renderAll();showMessage(`已開始 ${shoe.id}`,"success")
}
function finishCurrentShoe(){const s=getCurrentShoe();if(s.status==="finished"){showMessage("目前牌靴已經結束","error");return}if(!confirm(`確定要結束 ${s.id} 嗎？`))return;s.status="finished";s.finishedAt=new Date().toISOString();saveData();renderAll();showMessage("目前牌靴已結束","success")}
function switchShoe(id){const s=data.shoes.find(x=>x.id===id);if(!s)return;data.currentShoeId=id;redoStack=[];syncCurrent();saveData();renderAll();showMessage(`已切換到 ${id}`,"success")}
function reopenShoe(id){const s=data.shoes.find(x=>x.id===id);if(!s)return;const open=data.shoes.find(x=>x.status==="open"&&x.id!==id);if(open){if(!confirm(`${open.id} 仍在進行中。要先結束它，再開啟 ${id} 嗎？`))return;open.status="finished";open.finishedAt=new Date().toISOString()}s.status="open";s.finishedAt=null;data.currentShoeId=id;syncCurrent();saveData();renderAll();showMessage(`${id} 已重新開啟`,"success")}
function deleteShoe(id){if(data.shoes.length===1){showMessage("至少要保留一個牌靴","error");return}const s=data.shoes.find(x=>x.id===id);if(!s)return;if(!confirm(`確定刪除 ${id}？此操作無法復原。`))return;data.shoes=data.shoes.filter(x=>x.id!==id);if(data.currentShoeId===id)data.currentShoeId=data.shoes[data.shoes.length-1].id;redoStack=[];syncCurrent();saveData();renderAll();showMessage("牌靴已刪除","success")}

function renderCurrentShoeInfo(){const s=getCurrentShoe(),c=counts(s.games);currentShoeInfo.textContent=`${s.id}${s.name?`｜${s.name}`:""}｜${s.status==="open"?"進行中":"已結束"}｜${c.total} 局`;addButton.disabled=s.status==="finished";finishShoeButton.disabled=s.status==="finished"}
function renderShoeHistory(){shoeHistoryList.innerHTML=[...data.shoes].reverse().map(s=>{const c=counts(s.games),current=s.id===data.currentShoeId;return`<div class="shoe-card ${current?"current":""}"><div class="shoe-card-header"><div><h4 class="shoe-card-title">${s.id}${s.name?`｜${escapeHtml(s.name)}`:""}</h4><div class="shoe-meta"><span class="status-badge ${s.status==="open"?"status-open":"status-finished"}">${s.status==="open"?"進行中":"已結束"}</span><br>建立：${formatDate(s.createdAt)}<br>結束：${formatDate(s.finishedAt)}<br>總局數 ${c.total}｜莊 ${c.b}｜閒 ${c.p}｜和 ${c.t}</div></div><div class="shoe-actions"><button class="secondary-button" data-action="switch" data-id="${s.id}" type="button">${current?"目前牌靴":"查看"}</button>${s.status==="finished"?`<button class="secondary-button" data-action="reopen" data-id="${s.id}" type="button">重新開啟</button>`:""}<button class="danger-button" data-action="delete" data-id="${s.id}" type="button">刪除</button></div></div></div>`}).join("")}

function addGame(){const s=getCurrentShoe();if(s.status==="finished"){showMessage("此牌靴已結束，請先開始新牌靴","error");return}const bt=banker.value.trim(),pt=player.value.trim();if(bt===""||pt===""){showMessage("請輸入莊與閒的點數","error");return}const b=Number(bt),p=Number(pt);if(!Number.isInteger(b)||!Number.isInteger(p)||b<0||b>9||p<0||p>9){showMessage("點數只能輸入 0～9 的整數","error");return}let w="和";if(b>p)w="莊";else if(p>b)w="閒";games.push({banker:b,player:p,difference:b-p,winner:w,createdAt:new Date().toISOString()});redoStack=[];saveData();renderAll();clearInputs();showMessage("牌局已新增","success")}
function calcRate(c,t){return t===0?"0.0":((c/t)*100).toFixed(1)}
function counts(list){let b=0,p=0,t=0;list.forEach(g=>g.winner==="莊"?b++:g.winner==="閒"?p++:t++);return{b,p,t,total:list.length}}
function updateStats(){const c=counts(games);stats.innerHTML=[["總局數",c.total],["莊",`${c.b} 次（${calcRate(c.b,c.total)}%）`],["閒",`${c.p} 次（${calcRate(c.p,c.total)}%）`],["和",`${c.t} 次（${calcRate(c.t,c.total)}%）`]].map(x=>`<div class="stat-card"><span class="stat-label">${x[0]}</span><strong class="stat-value">${x[1]}</strong></div>`).join("")}
function updateRecent(){recentStats.innerHTML=[10,20,50].map(n=>{const c=counts(games.slice(-n));return`<div class="recent-card"><strong>最近 ${n} 局</strong><div>莊 ${c.b}｜閒 ${c.p}｜和 ${c.t}</div><div>莊率 ${calcRate(c.b,c.total)}%｜閒率 ${calcRate(c.p,c.total)}%</div></div>`}).join("")}
function getStreaks(){let currentType="",current=0,maxB=0,maxP=0;games.filter(g=>g.winner!=="和").forEach(g=>{if(g.winner===currentType)current++;else{currentType=g.winner;current=1}if(currentType==="莊")maxB=Math.max(maxB,current);else maxP=Math.max(maxP,current)});return{currentType,current,maxB,maxP}}
function updateStreaks(){const s=getStreaks();streakStats.innerHTML=[["目前連續",s.currentType?`${s.currentType} ${s.current} 局`:"0"],["最長連莊",s.maxB],["最長連閒",s.maxP],["非和局數",games.filter(g=>g.winner!=="和").length]].map(x=>`<div class="stat-card"><span class="stat-label">${x[0]}</span><strong class="stat-value">${x[1]}</strong></div>`).join("")}
function renderBeadRoad(){const cols=Math.max(12,Math.ceil(games.length/6));let html="";for(let c=0;c<cols;c++)for(let r=0;r<6;r++){const g=games[c*6+r];html+=g?`<div class="cell"><div class="bead ${g.winner==="莊"?"banker":g.winner==="閒"?"player":"tie"}">${g.winner}</div></div>`:`<div class="cell"></div>`}beadRoad.innerHTML=html}
function buildBigRoad(){const seq=[];let last=-1;games.forEach((g,i)=>{if(g.winner==="和"){if(last>=0)seq[last].ties++;return}seq.push({result:g.winner,ties:0,sourceIndex:i});last=seq.length-1});const cells=[],occ=new Set();let prev=null,start=0;seq.forEach((item,i)=>{let col,row;if(i===0){col=0;row=0}else if(item.result===prev.result){col=prev.col;row=prev.row+1;if(row>5||occ.has(`${col},${row}`)){row=prev.row;col=prev.col+1;while(occ.has(`${col},${row}`))col++}}else{start++;col=start;row=0;while(occ.has(`${col},${row}`)){col++;start=col}}const cell={...item,col,row};cells.push(cell);occ.add(`${col},${row}`);prev=cell});return cells}
function renderGridRoad(id,cells,mini=false){const box=document.getElementById(id),maxCol=Math.max(11,...cells.map(c=>c.col));box.style.width=`${(maxCol+1)*52}px`;box.innerHTML=cells.map(c=>mini?`<div class="mini-mark ${c.color}" style="left:${c.col*52}px;top:${c.row*52}px"></div>`:`<div class="road-mark ${c.result==="莊"?"banker":"player"}" style="left:${c.col*52}px;top:${c.row*52}px">${c.result}${c.ties?`<span class="tie-badge">${c.ties}</span>`:""}</div>`).join("")}
function buildDerived(big,offset){const heights={};big.forEach(c=>heights[c.col]=Math.max(heights[c.col]||0,c.row+1));const out=[];big.forEach(c=>{if(c.col<offset+1)return;const red=c.row===0?(heights[c.col-1]||0)===(heights[c.col-offset-1]||0):big.some(x=>x.col===c.col-offset&&x.row===c.row);out.push({color:red?"red":"blue"})});let col=0,row=0,prev=null,occ=new Set(),start=0;return out.map((x,i)=>{if(i===0){col=0;row=0}else if(x.color===prev.color){let nr=row+1,nc=col;if(nr>5||occ.has(`${nc},${nr}`)){nr=row;nc=col+1;while(occ.has(`${nc},${nr}`))nc++}row=nr;col=nc}else{start++;col=start;row=0;while(occ.has(`${col},${row}`)){col++;start=col}}const cell={...x,col,row};occ.add(`${col},${row}`);prev=cell;return cell})}
function renderRoads(){const big=buildBigRoad();renderGridRoad("bigRoad",big);renderGridRoad("bigEyeRoad",buildDerived(big,1),true);renderGridRoad("smallRoad",buildDerived(big,2),true);renderGridRoad("cockroachRoad",buildDerived(big,3),true)}
function updateDifference(){const map={};for(let i=-9;i<=9;i++)map[i]=0;games.forEach(g=>map[g.difference]++);differenceStats.innerHTML=Object.keys(map).map(k=>`<div class="difference-card"><span>差值 ${Number(k)>0?"+":""}${k}</span><strong>${map[k]}</strong></div>`).join("")}
function drawBarChart(id,labels,values,title){const c=document.getElementById(id),ctx=c.getContext("2d"),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#111827";ctx.font="22px sans-serif";ctx.fillText(title,24,34);const max=Math.max(1,...values),pad=55,ch=h-95,bw=(w-pad*2)/values.length;values.forEach((v,i)=>{const bh=v/max*ch;ctx.fillStyle="#64748b";ctx.fillRect(pad+i*bw,h-45-bh,bw*.68,bh);ctx.fillStyle="#111827";ctx.font="14px sans-serif";ctx.textAlign="center";ctx.fillText(labels[i],pad+i*bw+bw*.34,h-22);ctx.fillText(v,pad+i*bw+bw*.34,h-50-bh)});ctx.textAlign="start"}
function drawCharts(){const c=counts(games);drawBarChart("resultChart",["莊","閒","和"],[c.b,c.p,c.t],"莊／閒／和次數");const m={};for(let i=-9;i<=9;i++)m[i]=0;games.forEach(g=>m[g.difference]++);drawBarChart("differenceChart",Object.keys(m),Object.values(m),"點數差值分布")}
function showHistory(){const q=historySearch.value.trim().toLowerCase(),rows=games.map((g,i)=>({g,i})).filter(({g,i})=>!q||String(i+1).includes(q)||g.winner.includes(q)||String(g.banker).includes(q)||String(g.player).includes(q));history.innerHTML=rows.length?rows.map(({g,i})=>`<div class="game-record"><div class="record-title"><strong>第 ${i+1} 局</strong><span class="winner ${g.winner==="莊"?"banker":g.winner==="閒"?"player":"tie"}">${g.winner}</span></div><div class="record-details"><span>莊：${g.banker} 點</span><span>閒：${g.player} 點</span><span>差值：${g.difference>0?"+":""}${g.difference}</span><span>${formatDate(g.createdAt)}</span></div></div>`).join(""):'<p class="empty-text">尚無符合的牌局資料</p>'}
function undoLastGame(){if(getCurrentShoe().status==="finished"){showMessage("已結束的牌靴不能修改","error");return}if(!games.length){showMessage("目前沒有可以刪除的牌局","error");return}redoStack.push(games.pop());saveData();renderAll();showMessage("已刪除上一局","success")}
function redoLastGame(){if(getCurrentShoe().status==="finished"){showMessage("已結束的牌靴不能修改","error");return}if(!redoStack.length){showMessage("沒有可以復原的牌局","error");return}games.push(redoStack.pop());saveData();renderAll();showMessage("已復原上一局","success")}
function clearAllGames(){if(getCurrentShoe().status==="finished"){showMessage("已結束的牌靴不能修改","error");return}if(!games.length){showMessage("目前沒有牌局資料","error");return}if(!confirm("確定要清除目前牌靴的全部牌局嗎？"))return;games.length=0;redoStack=[];saveData();renderAll();showMessage("目前牌靴已清空","success")}
function clearInputs(){banker.value="";player.value="";banker.focus()}
function showMessage(text,type){message.textContent=text;message.className=type;clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>{message.textContent="";message.className=""},2500)}
function download(name,text,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvEscape(v){const s=String(v??"");return/[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function exportCsv(){const s=getCurrentShoe(),rows=[["牌靴編號","牌靴名稱","局數","莊點數","閒點數","勝方","差值","時間"],...games.map((g,i)=>[s.id,s.name,i+1,g.banker,g.player,g.winner,g.difference,g.createdAt])];download(`${s.id}_baccarat.csv`,rows.map(r=>r.map(csvEscape).join(",")).join("\n"),"text/csv;charset=utf-8")}
function importCsv(file){if(getCurrentShoe().status==="finished"){showMessage("已結束的牌靴不能匯入資料","error");return}const r=new FileReader();r.onload=()=>{try{const lines=String(r.result).replace(/^\uFEFF/,"").trim().split(/\r?\n/),newFmt=lines[0].startsWith("牌靴編號"),off=newFmt?2:0;const parsed=lines.slice(1).filter(Boolean).map(line=>{const x=line.split(",");return{banker:Number(x[off+1]),player:Number(x[off+2]),winner:x[off+3],difference:Number(x[off+4]),createdAt:x[off+5]||new Date().toISOString()}});if(parsed.some(g=>!Number.isInteger(g.banker)||!Number.isInteger(g.player)||!["莊","閒","和"].includes(g.winner)))throw Error();games.splice(0,games.length,...parsed);redoStack=[];saveData();renderAll();showMessage("CSV 匯入成功","success")}catch{showMessage("CSV 格式不正確","error")}};r.readAsText(file,"utf-8")}
function exportJson(){download("baccarat_v11_backup.json",JSON.stringify({version:APP_VERSION,...data},null,2),"application/json")}
function importJson(file){const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);if(Array.isArray(obj.shoes)){data={version:"11.0",currentShoeId:obj.currentShoeId,nextShoeNumber:Number(obj.nextShoeNumber)||1,shoes:obj.shoes}}else if(Array.isArray(obj.games)){const s={id:"S000001",name:obj.session||"",status:"open",createdAt:new Date().toISOString(),finishedAt:null,games:obj.games};data={version:"11.0",currentShoeId:s.id,nextShoeNumber:2,shoes:[s]}}else throw Error();if(!data.shoes.length)throw Error();if(!data.shoes.some(s=>s.id===data.currentShoeId))data.currentShoeId=data.shoes[0].id;syncCurrent();redoStack=[];saveData();renderAll();showMessage("JSON 還原成功","success")}catch{showMessage("JSON 格式不正確","error")}};r.readAsText(file,"utf-8")}
function renderAll(){renderCurrentShoeInfo();updateStats();updateRecent();updateStreaks();renderBeadRoad();renderRoads();updateDifference();drawCharts();showHistory();renderShoeHistory()}

addButton.addEventListener("click",addGame);undoButton.addEventListener("click",undoLastGame);redoButton.addEventListener("click",redoLastGame);clearButton.addEventListener("click",clearAllGames);newShoeButton.addEventListener("click",startNewShoe);finishShoeButton.addEventListener("click",finishCurrentShoe);
showShoeHistoryButton.addEventListener("click",()=>{shoeHistoryPanel.hidden=!shoeHistoryPanel.hidden;if(!shoeHistoryPanel.hidden)renderShoeHistory()});closeShoeHistoryButton.addEventListener("click",()=>shoeHistoryPanel.hidden=true);
shoeHistoryList.addEventListener("click",e=>{const b=e.target.closest("button[data-action]");if(!b)return;const{action,id}=b.dataset;if(action==="switch")switchShoe(id);if(action==="reopen")reopenShoe(id);if(action==="delete")deleteShoe(id)});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&(document.activeElement===banker||document.activeElement===player))addGame()});historySearch.addEventListener("input",showHistory);
sessionName.addEventListener("input",()=>{getCurrentShoe().name=sessionName.value;saveData();renderCurrentShoeInfo();renderShoeHistory()});themeButton.addEventListener("click",()=>{document.body.classList.toggle("light");localStorage.setItem(THEME_KEY,document.body.classList.contains("light")?"light":"dark")});if(localStorage.getItem(THEME_KEY)==="light")document.body.classList.add("light");
exportCsvButton.addEventListener("click",exportCsv);importCsvInput.addEventListener("change",e=>{if(e.target.files[0])importCsv(e.target.files[0]);e.target.value=""});exportJsonButton.addEventListener("click",exportJson);importJsonInput.addEventListener("change",e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value=""});
syncCurrent();renderAll();banker.focus();
