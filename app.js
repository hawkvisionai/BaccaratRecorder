import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rwxujvpakpemiwkitltk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aN_1_fzAV3hR6FmW7FTZGg_6SF0MUHF";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const USER_ADMIN_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/manage-users`;
const $ = id => document.getElementById(id);

const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const DEFAULT_VENUE_KEY = "baccarat_default_venue";
const LOCAL_VENUES_KEY = "baccarat_local_venues";

let currentShoe = null;
let currentGames = [];
let busy = false;
let mode = "complete";
let venueOptions = [];
let allShoes = [];
let editingShoe = null;
let cardState = freshCardState();
let winnerOnlyState = freshWinnerOnlyState();
let currentUser = null;
let currentProfile = null;
let managedUsers = [];
let realtimeChannels = [];
let realtimeReloadTimer = null;
let realtimeManagerTimer = null;
let realtimeReconnectTimer = null;
let realtimeGeneration = 0;
let realtimeJoinedCount = 0;
let onlineProfiles = new Map();
let dashboardData = null;
let dashboardRefreshTimer = null;

const loginPanel = $("loginPanel");
const appPanel = $("appPanel");
const logoutButton = $("logoutButton");
const loginMessage = $("loginMessage");
const appMessage = $("appMessage");
const userArea = $("userArea");

function freshCardState(){
  return { player:[null,null,null], banker:[null,null,null], active:"player0" };
}
function freshWinnerOnlyState(){
  return { winner:null, playerPair:false, bankerPair:false, superSix:false };
}
function setSync(text,type="pending"){
  const el=$("syncStatus"); el.textContent=text; el.className=`status ${type}`;
}
function showMessage(el,text,type=""){
  el.textContent=text; el.className=`message ${type}`.trim();
  clearTimeout(el._timer); if(text) el._timer=setTimeout(()=>{el.textContent="";el.className="message"},3200);
}
function showSaveToast(text,type="success"){
  const el=$("saveToast"); el.textContent=text; el.className=`save-toast ${type} show`;
  clearTimeout(el._timer); el._timer=setTimeout(()=>el.classList.remove("show"),1200);
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function setBusy(value){
  busy=value;
  ["loginButton","nextRoundButton","undoButton","newShoeButton","refreshButton","modeComplete","modeWinnerOnly","confirmShoeButton","addVenueButton","manageShoesButton","saveEditShoeButton","finishShoeButton","dashboardButton","refreshDashboardButton"].forEach(id=>{if($(id))$(id).disabled=value});
  document.querySelectorAll(".winner-button,.check-toggle,.rank-button").forEach(b=>b.disabled=value);
  updateRecordState();
}
function cardValue(rank){ return rank==="A"?1:["10","J","Q","K"].includes(rank)?0:Number(rank); }
function handPoints(cards){ return cards.filter(Boolean).reduce((sum,c)=>sum+cardValue(c),0)%10; }
function winnerOf(banker,player){ return banker>player?"莊":player>banker?"閒":"和"; }
function isNatural(playerTwo,bankerTwo){ return playerTwo>=8 || bankerTwo>=8; }
function playerNeedsThird(playerTwo,bankerTwo){
  if(isNatural(playerTwo,bankerTwo)) return false;
  return playerTwo<=5;
}
function bankerNeedsThird(bankerTwo,playerDrew,playerThirdRank){
  if(!playerDrew) return bankerTwo<=5;
  const p3=cardValue(playerThirdRank);
  if(bankerTwo<=2) return true;
  if(bankerTwo===3) return p3!==8;
  if(bankerTwo===4) return p3>=2 && p3<=7;
  if(bankerTwo===5) return p3>=4 && p3<=7;
  if(bankerTwo===6) return p3===6 || p3===7;
  return false;
}
function pairOf(cards){ return !!cards[0] && cards[0]===cards[1]; }
function completeProgress(){
  const [p1,p2,p3]=cardState.player;
  const [b1,b2,b3]=cardState.banker;
  if(!p1) return {complete:false,next:"player0"};
  if(!p2) return {complete:false,next:"player1"};
  if(!b1) return {complete:false,next:"banker0"};
  if(!b2) return {complete:false,next:"banker1"};
  const pTwo=handPoints([p1,p2]);
  const bTwo=handPoints([b1,b2]);
  if(isNatural(pTwo,bTwo)) return {complete:true,next:null,playerNeeds:false,bankerNeeds:false};
  const pNeeds=playerNeedsThird(pTwo,bTwo);
  if(pNeeds && !p3) return {complete:false,next:"player2",playerNeeds:true};
  const bNeeds=bankerNeedsThird(bTwo,pNeeds,p3);
  if(bNeeds && !b3) return {complete:false,next:"banker2",playerNeeds:pNeeds,bankerNeeds:true};
  return {complete:true,next:null,playerNeeds:pNeeds,bankerNeeds:bNeeds};
}
function completeDerived(){
  const progress=completeProgress();
  if(!progress.complete) return null;
  const pCards=cardState.player.filter(Boolean), bCards=cardState.banker.filter(Boolean);
  const player=handPoints(pCards), banker=handPoints(bCards);
  const pTwo=handPoints(cardState.player.slice(0,2)), bTwo=handPoints(cardState.banker.slice(0,2));
  return {
    player_points:player, banker_points:banker, winner:winnerOf(banker,player),
    player_pair:pairOf(cardState.player), banker_pair:pairOf(cardState.banker),
    player_natural:isNatural(pTwo,bTwo)&&pTwo>=8,
    banker_natural:isNatural(pTwo,bTwo)&&bTwo>=8,
    super_six:banker===6 && banker>player,
    player_card_count:pCards.length, banker_card_count:bCards.length
  };
}
function stepTitle(key){
  return ({player0:"閒第一張",player1:"閒第二張",player2:"閒第三張",banker0:"莊第一張",banker1:"莊第二張",banker2:"莊第三張"})[key];
}
function parseStep(key){ return {side:key.startsWith("player")?"player":"banker",index:Number(key.at(-1))}; }
function visibleSteps(){
  const progress=completeProgress();
  const base=["player0"];
  if(cardState.player[0]) base.push("player1");
  if(cardState.player[1]) base.push("banker0");
  if(cardState.banker[0]) base.push("banker1");
  if(cardState.banker[1]){
    const pTwo=handPoints(cardState.player.slice(0,2)), bTwo=handPoints(cardState.banker.slice(0,2));
    if(!isNatural(pTwo,bTwo) && playerNeedsThird(pTwo,bTwo)) base.push("player2");
    if(cardState.player[2] || !playerNeedsThird(pTwo,bTwo)){
      const pDrew=playerNeedsThird(pTwo,bTwo);
      if(!isNatural(pTwo,bTwo) && bankerNeedsThird(bTwo,pDrew,cardState.player[2])) base.push("banker2");
    }
  }
  if(progress.next) cardState.active=progress.next;
  return [...new Set(base)];
}
function selectCard(key,rank){
  const {side,index}=parseStep(key);
  cardState[side][index]=rank;
  // 修改前面的牌時，清除所有受影響的後續補牌，避免殘留不合理資料。
  if(key==="player0"||key==="player1"||key==="banker0"||key==="banker1"){
    cardState.player[2]=null; cardState.banker[2]=null;
  } else if(key==="player2") cardState.banker[2]=null;
  cardState.active=completeProgress().next || key;
  renderCardInput(); updateRecordState();
}
function renderCardInput(){
  const steps=visibleSteps();
  $("cardSteps").innerHTML=steps.map(key=>{
    const {side,index}=parseStep(key), selected=cardState[side][index], active=cardState.active===key && !completeProgress().complete;
    const buttons=active?`<div class="rank-grid">${RANKS.map(rank=>`<button type="button" class="rank-button ${selected===rank?"selected":""}" data-card-step="${key}" data-rank="${rank}">${rank}</button>`).join("")}</div>`:"";
    return `<section class="card-step ${selected?"complete":""}"><div class="card-step-head"><span class="card-step-title">${stepTitle(key)}</span><button type="button" class="card-value ${selected?"selected":""}" data-open-step="${key}">${selected||"待輸入"}</button></div>${buttons}</section>`;
  }).join("");
  document.querySelectorAll("[data-card-step]").forEach(b=>b.onclick=()=>selectCard(b.dataset.cardStep,b.dataset.rank));
  document.querySelectorAll("[data-open-step]").forEach(b=>b.onclick=()=>{cardState.active=b.dataset.openStep;renderCardInput()});
  const d=completeDerived();
  $("completeSummary").classList.toggle("hidden",!d);
  if(d){
    const tags=[]; if(d.player_pair)tags.push("閒對");if(d.banker_pair)tags.push("莊對");if(d.player_natural||d.banker_natural)tags.push("Natural（天牌）");if(d.super_six)tags.push("Lucky 6（幸運六）");
    $("completeSummary").innerHTML=`閒 ${d.player_points} 點｜莊 ${d.banker_points} 點｜勝方：${d.winner}<br>${tags.length?tags.join("｜"):"無額外項目"}`;
  }
}
function setToggle(id,on){
  const el=$(id); el.setAttribute("aria-pressed",String(on)); el.classList.toggle("selected",on);
  el.textContent=`${on?"☑":"☐"} ${el.textContent.replace(/^[☐☑]\s*/,"")}`;
}
function updateWinnerOnlyUI(){
  document.querySelectorAll(".winner-button").forEach(b=>b.classList.toggle("selected",b.dataset.winner===winnerOnlyState.winner));
  setToggle("winnerPlayerPair",winnerOnlyState.playerPair);
  setToggle("winnerBankerPair",winnerOnlyState.bankerPair);
  const lucky=$("winnerSuperSix"); lucky.classList.toggle("hidden",winnerOnlyState.winner!=="莊");
  if(winnerOnlyState.winner!=="莊") winnerOnlyState.superSix=false;
  setToggle("winnerSuperSix",winnerOnlyState.superSix);
}
function isRecordComplete(){ return mode==="complete" ? completeProgress().complete : !!winnerOnlyState.winner; }
function updateRecordState(){
  const complete=isRecordComplete();
  const state=$("recordState"); state.textContent=complete?"合理":"尚未輸入完整"; state.className=`record-state ${complete?"valid":"incomplete"}`;
  const can=!!currentShoe&&currentShoe.status==="open"&&!busy&&complete;
  $("nextRoundButton").disabled=!can;
}
function resetRound({resetMode=false}={}){
  cardState=freshCardState(); winnerOnlyState=freshWinnerOnlyState();
  if(resetMode) setMode("complete"); else {renderCardInput();updateWinnerOnlyUI();updateRecordState();}
}
function nextGameNumber(){ return currentGames.length?Math.max(...currentGames.map(g=>Number(g.game_number)||0))+1:1; }
function setMode(next){
  mode=next;
  $("modeComplete").classList.toggle("active",next==="complete");
  $("modeWinnerOnly").classList.toggle("active",next==="winner_only");
  $("completePanel").classList.toggle("hidden",next!=="complete");
  $("winnerOnlyPanel").classList.toggle("hidden",next!=="winner_only");
  renderCardInput(); updateWinnerOnlyUI(); updateRecordState();
}
function renderExtra(g){
  const items=[];
  if(g.record_status==="winner_only")items.push("只記勝方");
  if(g.player_pair)items.push("閒對"); if(g.banker_pair)items.push("莊對");
  if(g.player_card_count)items.push(`閒 ${g.player_card_count} 張`); if(g.banker_card_count)items.push(`莊 ${g.banker_card_count} 張`);
  if(g.player_natural)items.push("閒自然牌"); if(g.banker_natural)items.push("莊自然牌"); if(g.super_six)items.push("Lucky 6");
  return items.length?`<div class="game-extra">${items.join("｜")}</div>`:"";
}
function render(){
  const next=nextGameNumber();
  $("shoeNumber").textContent=currentShoe?.shoe_number||"尚未建立";
  $("currentVenue").textContent=currentShoe?.venue||"尚未選擇";
  $("nextGameNumber").textContent=`第 ${next} 局`;
  if(document.activeElement!==$("gameNumberInput")) $("gameNumberInput").value=next;
  $("shoeState").textContent=currentShoe?(currentShoe.status==="open"?"進行中｜已鎖定":"已結束"):"未開始";
  $("shoeOwner").textContent=currentShoe?(currentProfile?.display_name||currentProfile?.username||"目前帳號"):"—";
  const can=!!currentShoe&&currentShoe.status==="open"&&!busy;
  $("undoButton").disabled=!can||!currentGames.length;
  document.querySelectorAll(".winner-button").forEach(b=>b.disabled=!can);
  const rows=[...currentGames].sort((a,b)=>a.game_number-b.game_number).slice(-10).reverse();
  $("recentGames").innerHTML=rows.length?rows.map(g=>`<div class="game-row"><div class="game-main"><strong>第 ${g.game_number} 局</strong><span>${g.record_status==="winner_only"?"點數未記錄":`閒 ${g.player_points} 點｜莊 ${g.banker_points} 點`}</span><span class="winner ${g.winner==="莊"?"banker":g.winner==="閒"?"player":"tie"}">${g.winner}</span></div>${renderExtra(g)}</div>`).join(""):'<p class="empty">尚無牌局資料</p>';
  updateRecordState();
}
function localVenues(){try{return JSON.parse(localStorage.getItem(LOCAL_VENUES_KEY)||"[]").filter(Boolean)}catch{return[]}}
function saveLocalVenues(list){localStorage.setItem(LOCAL_VENUES_KEY,JSON.stringify([...new Set(list)]))}
async function loadVenues(){
  const {data,error}=await supabase.from("shoes").select("venue").not("venue","is",null); if(error)throw error;
  const cloud=(data||[]).map(r=>(r.venue||"").trim()).filter(Boolean);
  venueOptions=[...new Set([...localVenues(),...cloud])].sort((a,b)=>a.localeCompare(b,"zh-Hant")); renderVenueOptions();
}
function renderVenueOptions(selected=""){
  const select=$("venueSelect"),preferred=selected||localStorage.getItem(DEFAULT_VENUE_KEY)||venueOptions[0]||"";
  select.innerHTML='<option value="">請選擇場館</option>'+venueOptions.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if(venueOptions.includes(preferred))select.value=preferred;
}
function openShoeModal(){if(busy)return;renderVenueOptions();$("shoeNameInput").value="";$("startGameInput").value="1";$("defaultVenueCheckbox").checked=false;$("shoeModalMessage").textContent="";$("newShoeModal").classList.remove("hidden")}
function closeShoeModal(){if(!busy)$("newShoeModal").classList.add("hidden")}
function addVenue(){const raw=prompt("請輸入場館名稱");if(raw===null)return;const venue=raw.trim();if(!venue)return showMessage($("shoeModalMessage"),"場館名稱不能空白","error");if(!venueOptions.includes(venue))venueOptions.push(venue);venueOptions.sort((a,b)=>a.localeCompare(b,"zh-Hant"));saveLocalVenues(venueOptions);renderVenueOptions(venue)}
async function loadCloudData(){
  setSync("同步中");
  const {data:shoes,error:se}=await supabase.from("shoes").select("*").eq("status","open").eq("is_archived",false).eq("owner_id",currentUser.id).order("created_at",{ascending:false}).limit(1); if(se)throw se;
  currentShoe=shoes?.[0]||null;
  if(!currentShoe){currentGames=[];setSync("已連線","ok");render();return}
  const {data:games,error:ge}=await supabase.from("games").select("*").eq("shoe_id",currentShoe.id).order("game_number",{ascending:true}); if(ge)throw ge;
  currentGames=games||[];setSync("已同步","ok");render();
}
async function createNewShoe(){
  if(busy)return;const venue=$("venueSelect").value.trim(),name=$("shoeNameInput").value.trim(),start=Number($("startGameInput").value);
  if(!venue)return showMessage($("shoeModalMessage"),"請先選擇或新增場館","error");
  if(!Number.isInteger(start)||start<1)return showMessage($("shoeModalMessage"),"開始局數必須是 1 以上的整數","error");
  if(currentShoe?.status==="open"&&currentGames.length&&!confirm("建立新牌靴後，只會結束你自己目前的牌靴。確定繼續嗎？"))return;
  setBusy(true);
  try{
    setSync("同步中");
    const {data,error}=await supabase.rpc("create_my_shoe",{p_venue:venue,p_name:name||null});
    if(error)throw error;
    currentShoe=data;currentGames=[];
    if($("defaultVenueCheckbox").checked)localStorage.setItem(DEFAULT_VENUE_KEY,venue);
    if(!venueOptions.includes(venue))venueOptions.push(venue);saveLocalVenues(venueOptions);
    resetRound({resetMode:true});$("gameNumberInput").value=start;setSync("已同步","ok");showMessage(appMessage,`已開始 ${data.shoe_number}｜${venue}｜由 ${currentProfile.display_name} 負責`,"success");$("newShoeModal").classList.add("hidden");
  }catch(e){console.error(e);setSync("同步失敗","error");showMessage($("shoeModalMessage"),e.message||"建立牌靴失敗","error")}
  finally{setBusy(false);render();$("gameNumberInput").value=start}
}
async function finishCurrentShoe(){
  if(busy||!currentShoe||currentShoe.status!=="open")return;
  if(!confirm(`確定完成 ${currentShoe.shoe_number}？完成後會鎖定，不能再新增牌局。`))return;
  setBusy(true);
  try{const {data,error}=await supabase.rpc("finish_my_shoe",{p_shoe_id:currentShoe.id});if(error)throw error;currentShoe=data;setSync("已同步","ok");showSaveToast("✓ 牌靴已完成並鎖定");render()}
  catch(e){showMessage(appMessage,e.message||"完成牌靴失敗","error")}
  finally{setBusy(false)}
}
async function saveAndNext(){
  if(busy||!currentShoe||currentShoe.status!=="open")return;
  if(!isRecordComplete())return showMessage(appMessage,"本局尚未輸入完整","error");
  const gameNumber=Number($("gameNumberInput").value);
  if(!Number.isInteger(gameNumber)||gameNumber<1)return showMessage(appMessage,"局數必須是 1 以上的整數","error");
  if(currentGames.some(g=>Number(g.game_number)===gameNumber))return showMessage(appMessage,`第 ${gameNumber} 局已存在，請改用其他局數`,"error");
  let game;
  if(mode==="complete"){
    const d=completeDerived();
    game={shoe_id:currentShoe.id,recorded_by:currentUser.id,game_number:gameNumber,record_status:"complete",...d,difference:d.banker_points-d.player_points,
      player_card_1:cardState.player[0],player_card_2:cardState.player[1],player_card_3:cardState.player[2],
      banker_card_1:cardState.banker[0],banker_card_2:cardState.banker[1],banker_card_3:cardState.banker[2]};
  }else{
    game={shoe_id:currentShoe.id,recorded_by:currentUser.id,game_number:gameNumber,record_status:"winner_only",winner:winnerOnlyState.winner,
      banker_points:null,player_points:null,difference:null,banker_pair:winnerOnlyState.bankerPair,player_pair:winnerOnlyState.playerPair,
      banker_card_count:null,player_card_count:null,banker_natural:false,player_natural:false,super_six:winnerOnlyState.winner==="莊"&&winnerOnlyState.superSix,
      player_card_1:null,player_card_2:null,player_card_3:null,banker_card_1:null,banker_card_2:null,banker_card_3:null};
  }
  setBusy(true);
  try{
    setSync("同步中");const {data,error}=await supabase.from("games").insert(game).select().single();if(error)throw error;
    currentGames.push(data);setSync("已同步","ok");showSaveToast(`✓ 第 ${gameNumber} 局已儲存`);resetRound();$("gameNumberInput").value=gameNumber+1;render();
  }catch(e){console.error(e);setSync("同步失敗","error");showSaveToast("儲存失敗","error");showMessage(appMessage,e.message||"儲存失敗","error")}
  finally{setBusy(false);render()}
}
function formatDate(value){if(!value)return"—";return new Intl.DateTimeFormat("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}
function closeManagerModal(){if(!busy)$("shoeManagerModal").classList.add("hidden")}
function closeDetailModal(){$("shoeDetailModal").classList.add("hidden")}
function closeEditModal(){if(!busy){$("editShoeModal").classList.add("hidden");editingShoe=null}}
async function openShoeManager(){if(busy)return;$("shoeManagerModal").classList.remove("hidden");$("managerMessage").textContent="";$("shoeManagerList").innerHTML='<p class="empty">讀取中…</p>';try{const {data,error}=await supabase.from("shoes").select("*").order("created_at",{ascending:false});if(error)throw error;const {data:people}=await supabase.from("profiles").select("id,display_name,username");const ownerMap=new Map((people||[]).map(p=>[p.id,p.display_name||p.username]));const counts=await Promise.all((data||[]).map(async s=>{const {count}=await supabase.from("games").select("id",{count:"exact",head:true}).eq("shoe_id",s.id);return {...s,owner_name:ownerMap.get(s.owner_id)||"未分配",game_count:count||0}}));allShoes=counts;renderShoeManager()}catch(e){showMessage($("managerMessage"),e.message||"讀取牌靴失敗","error")}}
function filteredShoes(){const q=$("shoeSearchInput").value.trim().toLowerCase(),status=$("shoeStatusFilter").value;return allShoes.filter(s=>{const archived=!!s.is_archived;if(status==="active"&&archived)return false;if(status==="archived"&&!archived)return false;const text=[s.shoe_number,s.name,s.venue].filter(Boolean).join(" ").toLowerCase();return !q||text.includes(q)})}
function renderShoeManager(){
  const list=filteredShoes();
  $("shoeManagerList").innerHTML=list.length?list.map(s=>{const active=currentShoe?.id===s.id,archived=!!s.is_archived;return `<div class="shoe-manager-row ${archived?"archived-row":""}"><div class="shoe-manager-main"><strong>${escapeHtml(s.shoe_number||"未命名")}${active?'<span class="active-shoe-marker">目前</span>':""}</strong><small>${escapeHtml(s.name||"未填名稱")}</small></div><div><strong>${escapeHtml(s.venue||"未選場館")}</strong><div class="shoe-manager-meta">負責：${escapeHtml(s.owner_name||"未分配")}｜${archived?"已封存":s.status==="open"?"進行中":"已結束"}</div></div><div class="shoe-manager-meta">${Number(s.game_count)||"—"}</div><div class="shoe-manager-meta">${formatDate(s.created_at)}</div><div class="shoe-actions"><button class="secondary" data-action="view" data-id="${s.id}">查看</button><button class="warning" data-action="edit" data-id="${s.id}">修改</button><button class="${archived?"restore":"archive"}" data-action="archive" data-id="${s.id}">${archived?"復原":"封存"}</button><button class="danger" data-action="delete" data-id="${s.id}">刪除</button></div></div>`}).join(""):'<p class="empty">沒有符合條件的牌靴</p>';
  document.querySelectorAll("#shoeManagerList [data-action]").forEach(b=>b.onclick=()=>handleShoeAction(b.dataset.action,b.dataset.id));
}
async function handleShoeAction(action,id){const shoe=allShoes.find(s=>String(s.id)===String(id));if(!shoe)return;if(action==="view")return viewShoe(shoe);if(action==="edit")return openEditShoe(shoe);if(action==="archive")return toggleArchiveShoe(shoe);if(action==="delete")return deleteShoe(shoe)}
async function viewShoe(shoe){
  $("shoeDetailTitle").textContent=`${shoe.shoe_number} 牌靴內容`;$("shoeDetailMeta").textContent=`${shoe.venue||"未選場館"}｜${shoe.name||"未填名稱"}`;$("shoeDetailGames").innerHTML='<p class="empty">讀取中…</p>';$("shoeDetailModal").classList.remove("hidden");
  try{const {data,error}=await supabase.from("games").select("*").eq("shoe_id",shoe.id).order("game_number",{ascending:true});if(error)throw error;const games=data||[];$("shoeDetailMeta").textContent=`${shoe.venue||"未選場館"}｜共 ${games.length} 局｜${formatDate(shoe.created_at)}`;$("shoeDetailGames").innerHTML=games.length?games.map(g=>`<div class="detail-game-row"><strong>第 ${g.game_number} 局｜${g.winner}</strong><div class="shoe-manager-meta">${g.record_status==="winner_only"?"只記勝方":`閒 ${g.player_points} 點｜莊 ${g.banker_points} 點`}</div>${renderExtra(g)}</div>`).join(""):'<p class="empty">這個牌靴尚無牌局</p>'}catch(e){$("shoeDetailGames").innerHTML=`<p class="empty">${escapeHtml(e.message||"讀取失敗")}</p>`}
}
function openEditShoe(shoe){editingShoe=shoe;const select=$("editVenueSelect"),options=[...new Set([...venueOptions,shoe.venue].filter(Boolean))].sort((a,b)=>a.localeCompare(b,"zh-Hant"));select.innerHTML='<option value="">請選擇場館</option>'+options.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");select.value=shoe.venue||"";$("editShoeNameInput").value=shoe.name||"";$("editShoeMessage").textContent="";$("editShoeModal").classList.remove("hidden")}
async function saveEditedShoe(){if(busy||!editingShoe)return;const venue=$("editVenueSelect").value.trim(),name=$("editShoeNameInput").value.trim();if(!venue)return showMessage($("editShoeMessage"),"請選擇場館","error");setBusy(true);try{const {data,error}=await supabase.from("shoes").update({venue,name}).eq("id",editingShoe.id).select().single();if(error)throw error;allShoes=allShoes.map(s=>s.id===data.id?{...data,game_count:s.game_count||0}:s);if(currentShoe?.id===data.id)currentShoe=data;if(!venueOptions.includes(venue)){venueOptions.push(venue);saveLocalVenues(venueOptions)}render();renderShoeManager();showSaveToast("✓ 牌靴資料已更新");closeEditModal()}catch(e){showMessage($("editShoeMessage"),e.message||"修改失敗","error")}finally{setBusy(false)}}
async function toggleArchiveShoe(shoe){const willArchive=!shoe.is_archived;if(willArchive&&currentShoe?.id===shoe.id&&!confirm(`這是目前進行中的 ${shoe.shoe_number}。封存後將無法繼續記錄，確定封存嗎？`))return;if(!willArchive&&!confirm(`確定復原 ${shoe.shoe_number} 嗎？`))return;setBusy(true);try{const updates={is_archived:willArchive,archived_at:willArchive?new Date().toISOString():null};if(willArchive&&shoe.status==="open"){updates.status="finished";updates.finished_at=new Date().toISOString()}const {data,error}=await supabase.from("shoes").update(updates).eq("id",shoe.id).select().single();if(error)throw error;allShoes=allShoes.map(s=>s.id===data.id?{...data,game_count:s.game_count||0}:s);if(currentShoe?.id===shoe.id&&willArchive){currentShoe=null;currentGames=[]}render();renderShoeManager();showSaveToast(willArchive?"✓ 牌靴已封存":"✓ 牌靴已復原")}catch(e){showMessage($("managerMessage"),e.message||"操作失敗","error")}finally{setBusy(false)}}
async function deleteShoe(shoe){const {count,error:ce}=await supabase.from("games").select("id",{count:"exact",head:true}).eq("shoe_id",shoe.id);if(ce)return showMessage($("managerMessage"),ce.message||"無法確認牌局數","error");if(!confirm(`確定永久刪除 ${shoe.shoe_number}？\n場館：${shoe.venue||"未選場館"}\n共 ${count||0} 局\n\n此操作無法復原。`))return;setBusy(true);try{let r=await supabase.from("games").delete().eq("shoe_id",shoe.id);if(r.error)throw r.error;r=await supabase.from("shoes").delete().eq("id",shoe.id);if(r.error)throw r.error;allShoes=allShoes.filter(s=>s.id!==shoe.id);if(currentShoe?.id===shoe.id){currentShoe=null;currentGames=[]}render();renderShoeManager();showSaveToast("✓ 牌靴已永久刪除")}catch(e){showMessage($("managerMessage"),e.message||"刪除失敗","error")}finally{setBusy(false)}}
async function deleteLastGame(){if(busy||!currentGames.length)return;const last=[...currentGames].sort((a,b)=>a.game_number-b.game_number).at(-1);if(!confirm(`確定刪除第 ${last.game_number} 局嗎？`))return;setBusy(true);try{setSync("同步中");const {error}=await supabase.from("games").delete().eq("id",last.id);if(error)throw error;currentGames=currentGames.filter(g=>g.id!==last.id);setSync("已同步","ok");showMessage(appMessage,"上一局已刪除","success")}catch(e){setSync("同步失敗","error");showMessage(appMessage,e.message||"刪除失敗","error")}finally{setBusy(false);render()}}


function startOfTodayIso(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString()}
function isOnlineUser(id){return onlineProfiles.has(String(id))}
function flattenPresence(state){
  const map=new Map();
  Object.values(state||{}).flat().forEach(p=>{if(p?.user_id)map.set(String(p.user_id),p)});
  onlineProfiles=map;
  if(isModalOpen("dashboardModal"))renderDashboard();
  if(isModalOpen("userManagerModal"))renderManagedUsers();
}
function closeDashboard(){if(!busy)$("dashboardModal").classList.add("hidden")}
async function openDashboard(){
  if(currentProfile?.role!=="admin")return;
  $("dashboardModal").classList.remove("hidden");
  $("dashboardMessage").textContent="";
  await loadDashboard();
}
function scheduleDashboardReload(){
  if(currentProfile?.role!=="admin"||!isModalOpen("dashboardModal"))return;
  clearTimeout(dashboardRefreshTimer);
  dashboardRefreshTimer=setTimeout(()=>loadDashboard(true),350);
}
async function loadDashboard(silent=false){
  if(currentProfile?.role!=="admin")return;
  if(!silent){
    $("dashboardActiveShoes").innerHTML='<p class="empty">讀取中…</p>';
    $("dashboardFinishedShoes").innerHTML='<p class="empty">讀取中…</p>';
    $("dashboardActivity").innerHTML='<p class="empty">讀取中…</p>';
  }
  try{
    const today=startOfTodayIso();
    const [activeR,todayFinishedR,todayGamesR,totalShoesR,totalGamesR,recentShoesR,finishedR]=await Promise.all([
      supabase.from("shoes").select("id,shoe_number,name,venue,status,created_at,recording_started_at,finished_at,is_archived").eq("status","open").eq("is_archived",false).order("created_at",{ascending:false}),
      supabase.from("shoes").select("id",{count:"exact",head:true}).gte("finished_at",today).eq("is_archived",false),
      supabase.from("games").select("id",{count:"exact",head:true}).gte("created_at",today),
      supabase.from("shoes").select("id",{count:"exact",head:true}).eq("is_archived",false),
      supabase.from("games").select("id",{count:"exact",head:true}),
      supabase.from("shoes").select("id,shoe_number,name,venue,status,created_at,recording_started_at,finished_at,is_archived").order("created_at",{ascending:false}).limit(30),
      supabase.from("shoes").select("id,shoe_number,name,venue,status,created_at,recording_started_at,finished_at,is_archived").not("finished_at","is",null).eq("is_archived",false).order("finished_at",{ascending:false}).limit(10)
    ]);
    const responses=[activeR,todayFinishedR,todayGamesR,totalShoesR,totalGamesR,recentShoesR,finishedR];
    const err=responses.find(r=>r.error)?.error;if(err)throw err;
    const active=activeR.data||[],finished=finishedR.data||[];
    const shoeIds=[...new Set([...active,...finished].map(s=>s.id))];
    let games=[];
    if(shoeIds.length){const gr=await supabase.from("games").select("shoe_id,game_number,created_at").in("shoe_id",shoeIds);if(gr.error)throw gr.error;games=gr.data||[]}
    const gameMap=new Map();
    games.forEach(g=>{const key=String(g.shoe_id),x=gameMap.get(key)||{count:0,last_at:null};x.count+=1;if(!x.last_at||new Date(g.created_at)>new Date(x.last_at))x.last_at=g.created_at;gameMap.set(key,x)});
    const attach=s=>({...s,...(gameMap.get(String(s.id))||{count:0,last_at:null})});
    dashboardData={active:active.map(attach),finished:finished.map(attach),todayFinished:todayFinishedR.count||0,todayGames:todayGamesR.count||0,totalShoes:totalShoesR.count||0,totalGames:totalGamesR.count||0,recentShoes:recentShoesR.data||[]};
    renderDashboard();
  }catch(e){console.error(e);showMessage($("dashboardMessage"),e.message||"讀取管理總覽失敗","error")}
}
function formatDuration(start,end){
  if(!start||!end)return"—";
  const minutes=Math.max(0,Math.round((new Date(end)-new Date(start))/60000));
  if(minutes<60)return`${minutes} 分鐘`;
  const h=Math.floor(minutes/60),m=minutes%60;
  return m?`${h} 小時 ${m} 分`:`${h} 小時`;
}
function dashboardShoeRow(s,finished=false){
  return `<button class="dashboard-row shoe dashboard-open-shoe" data-shoe-id="${s.id}" type="button"><div class="dashboard-row-main"><strong>${escapeHtml(s.shoe_number||"未命名")}</strong><small>${escapeHtml(s.venue||"未選場館")}${s.name&&s.name!==s.shoe_number?`｜${escapeHtml(s.name)}`:""}</small></div><div class="dashboard-shoe-count"><strong>${s.count||0}</strong><small>局</small></div><span class="dashboard-time">${finished?`${formatDate(s.finished_at)}｜記錄時長：${s.recording_started_at?formatDuration(s.recording_started_at,s.finished_at):"尚未開始記錄"}`:(s.last_at?`最後記錄 ${formatDate(s.last_at)}`:`開始 ${formatDate(s.created_at)}`)}</span></button>`;
}
function bindDashboardShoeRows(){
  document.querySelectorAll(".dashboard-open-shoe").forEach(b=>b.onclick=async()=>{
    const id=String(b.dataset.shoeId);
    const shoe=[...(dashboardData?.active||[]),...(dashboardData?.finished||[]),...(dashboardData?.recentShoes||[])].find(s=>String(s.id)===id);
    if(shoe)await viewShoe(shoe);
  });
}
function renderDashboard(){
  if(!dashboardData)return;
  const d=dashboardData;
  $("statActiveShoes").textContent=d.active.length;$("statTodayFinished").textContent=d.todayFinished;$("statTodayGames").textContent=d.todayGames;$("statTotalShoes").textContent=d.totalShoes;$("statTotalGames").textContent=d.totalGames;
  $("dashboardUpdatedAt").textContent=`更新 ${new Intl.DateTimeFormat("zh-TW",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date())}`;
  $("dashboardShoeSummary").textContent=`${d.active.length} 副進行中`;
  $("dashboardActiveShoes").innerHTML=d.active.length?d.active.map(s=>dashboardShoeRow(s,false)).join(""):'<p class="empty">目前沒有進行中的牌靴</p>';
  $("dashboardFinishedShoes").innerHTML=d.finished.length?d.finished.map(s=>dashboardShoeRow(s,true)).join(""):'<p class="empty">目前沒有已完成牌靴</p>';
  const activities=[];d.recentShoes.forEach(s=>{if(s.finished_at)activities.push({at:s.finished_at,text:`完成 ${s.shoe_number}`,kind:"finish"});activities.push({at:s.created_at,text:`建立 ${s.shoe_number}`,kind:"create"})});activities.sort((x,y)=>new Date(y.at)-new Date(x.at));
  $("dashboardActivity").innerHTML=activities.length?activities.slice(0,12).map(x=>`<div class="activity-row"><span class="activity-icon ${x.kind}">${x.kind==="finish"?"✓":"＋"}</span><div><strong>${escapeHtml(x.text)}</strong><small>${formatDate(x.at)}</small></div></div>`).join(""):'<p class="empty">尚無活動資料</p>';
  bindDashboardShoeRows();
}
async function searchDashboardShoes(){
  const input=$("dashboardShoeSearchInput"),box=$("dashboardSearchResults"),q=input.value.trim();
  if(!q){box.classList.add("hidden");box.innerHTML="";return}
  box.classList.remove("hidden");box.innerHTML='<p class="empty">搜尋中…</p>';
  const safe=q.replace(/[%_,]/g," ").trim();
  try{
    const {data,error}=await supabase.from("shoes").select("id,shoe_number,name,venue,status,created_at,recording_started_at,finished_at,is_archived").or(`shoe_number.ilike.%${safe}%,name.ilike.%${safe}%,venue.ilike.%${safe}%`).order("created_at",{ascending:false}).limit(20);
    if(error)throw error;
    const rows=data||[];
    box.innerHTML=rows.length?rows.map(s=>`<button class="dashboard-search-row" data-search-shoe-id="${s.id}" type="button"><strong>${escapeHtml(s.shoe_number||"未命名")}</strong><span>${escapeHtml(s.venue||"未選場館")}｜${s.status==="open"?"進行中":"已完成"}｜${formatDate(s.finished_at||s.created_at)}</span></button>`).join(""):'<p class="empty">找不到符合的牌靴</p>';
    document.querySelectorAll("[data-search-shoe-id]").forEach(b=>b.onclick=async()=>{const shoe=rows.find(s=>String(s.id)===String(b.dataset.searchShoeId));if(shoe)await viewShoe(shoe)});
  }catch(e){box.innerHTML=`<p class="empty">${escapeHtml(e.message||"搜尋失敗")}</p>`}
}

function isModalOpen(id){
  const el=$(id); return !!el && !el.classList.contains("hidden");
}
function scheduleRealtimeReload(reason="資料更新"){
  if(!currentUser)return;
  clearTimeout(realtimeReloadTimer);
  realtimeReloadTimer=setTimeout(async()=>{
    try{
      await loadCloudData();
      if(reason) showSaveToast(`↻ ${reason}`);
    }catch(e){
      console.error("Realtime reload failed",e);
      setSync("同步失敗","error");
    }
  },220);
}
function scheduleManagerReload(kind){
  if(currentProfile?.role!=="admin")return;
  clearTimeout(realtimeManagerTimer);
  realtimeManagerTimer=setTimeout(async()=>{
    try{
      if(kind==="shoes" && isModalOpen("shoeManagerModal")) await openShoeManager();
      if(kind==="users" && isModalOpen("userManagerModal")) await loadManagedUsers();
    }catch(e){console.error("Realtime manager refresh failed",e)}
  },320);
}
async function stopRealtime(){
  realtimeGeneration+=1;
  clearTimeout(realtimeReloadTimer);clearTimeout(realtimeManagerTimer);clearTimeout(realtimeReconnectTimer);clearTimeout(dashboardRefreshTimer);
  const channels=[...realtimeChannels];realtimeChannels=[];realtimeJoinedCount=0;
  await Promise.all(channels.map(channel=>supabase.removeChannel(channel).catch(()=>null)));
}
function updateRealtimeConnection(status,generation){
  if(generation!==realtimeGeneration)return;
  if(status==="SUBSCRIBED"){
    realtimeJoinedCount+=1;
    if(realtimeJoinedCount>=realtimeChannels.length)setSync("即時連線","ok");
    return;
  }
  if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
    setSync(navigator.onLine?"重新連線中":"已離線",navigator.onLine?"pending":"error");
    clearTimeout(realtimeReconnectTimer);
    if(navigator.onLine)realtimeReconnectTimer=setTimeout(()=>startRealtime(),1800);
  }
}
async function startRealtime(){
  if(!currentUser)return;
  await stopRealtime();
  const generation=realtimeGeneration;
  realtimeJoinedCount=0;
  setSync(navigator.onLine?"連線中":"已離線",navigator.onLine?"pending":"error");

  const dataChannel=supabase.channel(`studio-data-${currentUser.id}-${generation}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"shoes"},payload=>{
      scheduleRealtimeReload(payload.eventType==="INSERT"?"牌靴已建立":"牌靴狀態已更新");
      scheduleManagerReload("shoes");
      scheduleDashboardReload();
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"games"},payload=>{
      const changedShoe=payload.new?.shoe_id||payload.old?.shoe_id;
      if(!currentShoe||String(changedShoe)===String(currentShoe.id))scheduleRealtimeReload("牌局已同步");
      scheduleManagerReload("shoes");
      scheduleDashboardReload();
    })
    .subscribe(status=>updateRealtimeConnection(status,generation));

  const profileFilter=currentProfile?.role==="admin"?undefined:`id=eq.${currentUser.id}`;
  const profileConfig={event:"*",schema:"public",table:"profiles"};
  if(profileFilter)profileConfig.filter=profileFilter;
  const profileChannel=supabase.channel(`studio-profiles-${currentUser.id}-${generation}`)
    .on("postgres_changes",profileConfig,async payload=>{
      scheduleManagerReload("users");
      scheduleDashboardReload();
      if(String(payload.new?.id||payload.old?.id)===String(currentUser.id)){
        try{currentProfile=await loadCurrentProfile(currentUser);applyRoleUI()}catch(e){console.error(e)}
      }
    })
    .subscribe(status=>updateRealtimeConnection(status,generation));

  const presenceChannel=supabase.channel("studio-presence-v162",{config:{presence:{key:currentUser.id}}})
    .on("presence",{event:"sync"},()=>flattenPresence(presenceChannel.presenceState()))
    .on("presence",{event:"join"},()=>flattenPresence(presenceChannel.presenceState()))
    .on("presence",{event:"leave"},()=>flattenPresence(presenceChannel.presenceState()))
    .subscribe(async status=>{
      updateRealtimeConnection(status,generation);
      if(status==="SUBSCRIBED")await presenceChannel.track({user_id:currentUser.id,display_name:currentProfile?.display_name||currentProfile?.username,role:currentProfile?.role,online_at:new Date().toISOString()});
    });

  realtimeChannels=[dataChannel,profileChannel,presenceChannel];
}
window.addEventListener("offline",()=>setSync("已離線","error"));
window.addEventListener("online",()=>{setSync("重新連線中","pending");startRealtime()});

function usernameToInternalEmail(value){
  const account=String(value||"").trim().toLowerCase();
  return account.includes("@")?account:`${account}@baccarat.local`;
}
async function login(){
  if(busy)return;
  const account=$("emailInput").value.trim(),password=$("passwordInput").value;
  if(!account||!password)return showMessage(loginMessage,"請輸入帳號和密碼","error");
  const email=usernameToInternalEmail(account);
  setBusy(true);
  try{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
  catch{showMessage(loginMessage,"登入失敗，請確認帳號或密碼","error")}
  finally{setBusy(false)}
}
async function logout(){await supabase.auth.signOut()}
async function loadCurrentProfile(user){
  const {data,error}=await supabase.from("profiles").select("id,email,username,display_name,role,is_active").eq("id",user.id).maybeSingle();
  if(error) throw error;
  if(!data) throw new Error("找不到使用者資料，請先執行 v16.1.0 資料庫升級 SQL");
  if(data.is_active===false){await supabase.auth.signOut();throw new Error("此帳號已被停用，請聯絡管理員");}
  return data;
}
function applyRoleUI(){
  const isAdmin=currentProfile?.role==="admin";
  $("userDisplayName").textContent=currentProfile?.display_name||currentProfile?.email||"使用者";
  $("userRoleBadge").textContent=isAdmin?"管理員":"記錄員";
  $("userRoleBadge").className=`role-badge ${isAdmin?"admin":"recorder"}`;
  $("manageShoesButton").classList.toggle("hidden",!isAdmin);
  $("userManagerButton").classList.toggle("hidden",!isAdmin);
  $("dashboardButton").classList.toggle("hidden",!isAdmin);
  if(!isAdmin && !document.getElementById("recorderNotice")){
    const note=document.createElement("div");note.id="recorderNotice";note.className="recorder-note";
    note.textContent="記錄員模式：可建立與記錄牌靴；牌靴管理功能僅限管理員。";
    $("appMessage").insertAdjacentElement("afterend",note);
  }
  if(isAdmin) document.getElementById("recorderNotice")?.remove();
}
async function showAuthenticated(session){
  currentUser=session.user;
  try{
    currentProfile=await loadCurrentProfile(session.user);
    loginPanel.classList.add("hidden");appPanel.classList.remove("hidden");userArea.classList.remove("hidden");
    applyRoleUI();
    await Promise.all([loadCloudData(),loadVenues()]);
    await startRealtime();
  }catch(e){
    console.error(e);showMessage(loginMessage,e.message||"登入資料讀取失敗","error");
    loginPanel.classList.remove("hidden");appPanel.classList.add("hidden");userArea.classList.add("hidden");
  }
}
function showLoggedOut(){stopRealtime();loginPanel.classList.remove("hidden");appPanel.classList.add("hidden");userArea.classList.add("hidden");currentUser=null;currentProfile=null;currentShoe=null;currentGames=[];setSync("準備中","pending")}


async function callUserAdmin(action,payload={}){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session) throw new Error("登入已失效，請重新登入");
  const response=await fetch(USER_ADMIN_FUNCTION_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify({action,...payload})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error||`人員管理服務錯誤（${response.status}）`);
  return result;
}
function closeUserManager(){if(!busy)$("userManagerModal").classList.add("hidden")}
async function openUserManager(){
  if(currentProfile?.role!=="admin")return;
  $("userManagerModal").classList.remove("hidden");
  $("userManagerMessage").textContent="";
  await loadManagedUsers();
}
async function loadManagedUsers(){
  $("userManagerList").innerHTML='<p class="empty">讀取中…</p>';
  try{const result=await callUserAdmin("list");managedUsers=result.users||[];renderManagedUsers()}
  catch(e){$("userManagerList").innerHTML='<p class="empty">讀取失敗</p>';showMessage($("userManagerMessage"),e.message||"讀取人員失敗","error")}
}
function renderManagedUsers(){
  $("userManagerList").innerHTML=managedUsers.length?managedUsers.map(u=>{
    const admin=u.role==="admin",self=u.id===currentUser?.id,active=u.is_active!==false;
    const online=isOnlineUser(u.id);return `<div class="user-manager-row"><div><strong><span class="presence-dot ${online?"online":"offline"}"></span>${escapeHtml(u.display_name||u.email)}</strong><small>${escapeHtml(u.username||u.email)}｜${online?"目前在線":"目前離線"}</small></div><span class="role-badge ${admin?"admin":"recorder"}">${admin?"管理員":"記錄員"}</span><span class="account-state ${active?"active":"disabled"}">${active?"啟用":"停用"}</span><div class="user-actions">${admin?"":`<button class="secondary" data-user-action="password" data-id="${u.id}">重設密碼</button><button class="${active?"danger":"success"}" data-user-action="active" data-id="${u.id}">${active?"停用":"啟用"}</button>`}${self?'<span class="self-label">目前帳號</span>':""}</div></div>`
  }).join(""):'<p class="empty">尚無人員資料</p>';
  document.querySelectorAll("[data-user-action]").forEach(b=>b.onclick=()=>handleManagedUserAction(b.dataset.userAction,b.dataset.id));
}
async function createManagedUser(){
  if(busy)return;
  const display_name=$("newUserName").value.trim(),username=$("newUsername").value.trim().toLowerCase(),password=$("newUserPassword").value;
  if(!display_name||!username||password.length<8)return showMessage($("userManagerMessage"),"請填寫名稱、帳號，密碼至少 8 碼","error");
  if(!/^[a-z0-9._-]{3,30}$/.test(username))return showMessage($("userManagerMessage"),"帳號限 3～30 碼小寫英文、數字、點、底線或連字號","error");
  setBusy(true);try{await callUserAdmin("create",{display_name,username,password});$("newUserName").value="";$("newUsername").value="";$("newUserPassword").value="";showSaveToast("✓ 記錄員已建立");await loadManagedUsers()}
  catch(e){showMessage($("userManagerMessage"),e.message||"建立失敗","error")}finally{setBusy(false)}
}
async function handleManagedUserAction(action,id){
  const user=managedUsers.find(u=>u.id===id);if(!user||user.role==="admin")return;
  if(action==="password"){
    const password=prompt(`請輸入 ${user.display_name||user.email} 的新密碼（至少 8 碼）`);if(password===null)return;if(password.length<8)return showMessage($("userManagerMessage"),"密碼至少 8 碼","error");
    setBusy(true);try{await callUserAdmin("reset_password",{user_id:id,password});showSaveToast("✓ 密碼已重設")}catch(e){showMessage($("userManagerMessage"),e.message||"重設失敗","error")}finally{setBusy(false)}
  }
  if(action==="active"){
    const active=user.is_active===false;if(!confirm(`確定要${active?"啟用":"停用"} ${user.display_name||user.email} 嗎？`))return;
    setBusy(true);try{await callUserAdmin("set_active",{user_id:id,is_active:active});showSaveToast(active?"✓ 帳號已啟用":"✓ 帳號已停用");await loadManagedUsers()}catch(e){showMessage($("userManagerMessage"),e.message||"操作失敗","error")}finally{setBusy(false)}
  }
}

$("modeComplete").onclick=()=>setMode("complete");
$("modeWinnerOnly").onclick=()=>setMode("winner_only");
$("nextRoundButton").onclick=saveAndNext;
document.querySelectorAll(".winner-button").forEach(b=>b.onclick=()=>{winnerOnlyState.winner=b.dataset.winner;if(winnerOnlyState.winner!=="莊")winnerOnlyState.superSix=false;updateWinnerOnlyUI();updateRecordState()});
$("winnerPlayerPair").onclick=()=>{winnerOnlyState.playerPair=!winnerOnlyState.playerPair;updateWinnerOnlyUI()};
$("winnerBankerPair").onclick=()=>{winnerOnlyState.bankerPair=!winnerOnlyState.bankerPair;updateWinnerOnlyUI()};
$("winnerSuperSix").onclick=()=>{if(winnerOnlyState.winner==="莊"){winnerOnlyState.superSix=!winnerOnlyState.superSix;updateWinnerOnlyUI()}};
$("newShoeButton").onclick=openShoeModal;$("finishShoeButton").onclick=finishCurrentShoe;$("confirmShoeButton").onclick=createNewShoe;$("addVenueButton").onclick=addVenue;$("closeShoeModal").onclick=closeShoeModal;$("cancelShoeButton").onclick=closeShoeModal;document.querySelector("[data-close-modal]").onclick=closeShoeModal;
$("manageShoesButton").onclick=openShoeManager;$("closeManagerModal").onclick=closeManagerModal;document.querySelector("[data-close-manager]").onclick=closeManagerModal;$("shoeSearchInput").oninput=renderShoeManager;$("shoeStatusFilter").onchange=renderShoeManager;
$("closeDetailModal").onclick=closeDetailModal;document.querySelector("[data-close-detail]").onclick=closeDetailModal;$("closeEditModal").onclick=closeEditModal;$("cancelEditShoeButton").onclick=closeEditModal;document.querySelector("[data-close-edit]").onclick=closeEditModal;$("saveEditShoeButton").onclick=saveEditedShoe;
$("dashboardButton").onclick=openDashboard;$("closeDashboardModal").onclick=closeDashboard;document.querySelector("[data-close-dashboard]").onclick=closeDashboard;$("refreshDashboardButton").onclick=()=>loadDashboard();$("dashboardShoeSearchButton").onclick=searchDashboardShoes;$("dashboardShoeSearchInput").addEventListener("keydown",e=>{if(e.key==="Enter")searchDashboardShoes()});
$("userManagerButton").onclick=openUserManager;$("closeUserManagerModal").onclick=closeUserManager;document.querySelector("[data-close-users]").onclick=closeUserManager;$("createUserButton").onclick=createManagedUser;$("refreshUsersButton").onclick=loadManagedUsers;
$("undoButton").onclick=deleteLastGame;$("refreshButton").onclick=async()=>{try{await Promise.all([loadCloudData(),loadVenues()])}catch(e){showMessage(appMessage,e.message||"重新整理失敗","error")}};$("loginButton").onclick=login;$("logoutButton").onclick=logout;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("dashboardModal").classList.contains("hidden"))return closeDashboard();if(!$("userManagerModal").classList.contains("hidden"))return closeUserManager();if(!$("editShoeModal").classList.contains("hidden"))return closeEditModal();if(!$("shoeDetailModal").classList.contains("hidden"))return closeDetailModal();if(!$("shoeManagerModal").classList.contains("hidden"))return closeManagerModal();if(!$("newShoeModal").classList.contains("hidden"))return closeShoeModal()}if(e.key==="Enter"&&!loginPanel.classList.contains("hidden"))login()});

renderCardInput();updateWinnerOnlyUI();updateRecordState();
supabase.auth.onAuthStateChange(async(_event,session)=>session?await showAuthenticated(session):showLoggedOut());
const {data:{session}}=await supabase.auth.getSession();if(session)await showAuthenticated(session);else showLoggedOut();
