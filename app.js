import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rwxujvpakpemiwkitltk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aN_1_fzAV3hR6FmW7FTZGg_6SF0MUHF";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const loginPanel = $("loginPanel");
const appPanel = $("appPanel");
const logoutButton = $("logoutButton");
const loginMessage = $("loginMessage");
const appMessage = $("appMessage");

let currentShoe = null;
let currentGames = [];
let busy = false;

function setSync(text, type = "pending") {
  const el = $("syncStatus");
  el.textContent = text;
  el.className = `status ${type}`;
}

function showMessage(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`.trim();
  clearTimeout(el._timer);
  if (text) el._timer = setTimeout(() => {
    el.textContent = "";
    el.className = "message";
  }, 3000);
}

function setBusy(value) {
  busy = value;
  ["loginButton","addGameButton","undoButton","finishShoeButton","newShoeButton","refreshButton"]
    .forEach(id => $(id).disabled = value);
}

function winnerOf(banker, player) {
  if (banker > player) return "莊";
  if (player > banker) return "閒";
  return "和";
}

function render() {
  $("shoeNumber").textContent = currentShoe?.shoe_number || "尚未建立";
  $("gameCount").textContent = String(currentGames.length);
  $("shoeState").textContent = currentShoe
    ? (currentShoe.status === "open" ? "進行中" : "已結束")
    : "未開始";

  const canEdit = !!currentShoe && currentShoe.status === "open" && !busy;
  $("addGameButton").disabled = !canEdit;
  $("undoButton").disabled = !canEdit || currentGames.length === 0;
  $("finishShoeButton").disabled = !canEdit;

  const rows = [...currentGames].slice(-10).reverse();
  $("recentGames").innerHTML = rows.length
    ? rows.map(g => `
      <div class="game-row">
        <strong>第 ${g.game_number} 局</strong>
        <span>莊 ${g.banker_points} 點</span>
        <span>閒 ${g.player_points} 點</span>
        <span class="winner ${g.winner === "莊" ? "banker" : g.winner === "閒" ? "player" : "tie"}">${g.winner}</span>
      </div>`).join("")
    : '<p class="empty">尚無牌局資料</p>';
}

async function loadCloudData() {
  setSync("同步中", "pending");
  const { data: shoes, error: shoeError } = await supabase
    .from("shoes")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);

  if (shoeError) throw shoeError;
  currentShoe = shoes?.[0] || null;

  if (!currentShoe) {
    currentGames = [];
    setSync("已連線", "ok");
    render();
    return;
  }

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .eq("shoe_id", currentShoe.id)
    .order("game_number", { ascending: true });

  if (gamesError) throw gamesError;
  currentGames = games || [];
  setSync("已同步", "ok");
  render();
}

async function nextShoeNumber() {
  const { data, error } = await supabase.from("shoes").select("shoe_number");
  if (error) throw error;
  const max = (data || []).reduce((m, row) => {
    const n = Number(String(row.shoe_number || "").replace(/\D/g, "")) || 0;
    return Math.max(m, n);
  }, 0);
  return `S${String(max + 1).padStart(6, "0")}`;
}

async function createNewShoe() {
  if (busy) return;
  if (currentShoe?.status === "open" && currentGames.length > 0) {
    const ok = confirm("目前牌靴尚未結束。要先結束它並開始新牌靴嗎？");
    if (!ok) return;
  }

  setBusy(true);
  try {
    setSync("同步中", "pending");

    if (currentShoe?.status === "open") {
      const { error } = await supabase
        .from("shoes")
        .update({ status: "finished", finished_at: new Date().toISOString() })
        .eq("id", currentShoe.id);
      if (error) throw error;
    }

    const shoe_number = await nextShoeNumber();
    const { data, error } = await supabase
      .from("shoes")
      .insert({ shoe_number, name: "", status: "open" })
      .select()
      .single();

    if (error) throw error;
    currentShoe = data;
    currentGames = [];
    showMessage(appMessage, `已開始 ${shoe_number}`, "success");
    setSync("已同步", "ok");
  } catch (error) {
    console.error(error);
    setSync("同步失敗", "error");
    showMessage(appMessage, error.message || "建立牌靴失敗", "error");
  } finally {
    setBusy(false);
    render();
    $("bankerInput").focus();
  }
}

async function addGame() {
  if (busy || !currentShoe || currentShoe.status !== "open") return;

  const banker = Number($("bankerInput").value);
  const player = Number($("playerInput").value);
  if (!Number.isInteger(banker) || !Number.isInteger(player) ||
      banker < 0 || banker > 9 || player < 0 || player > 9) {
    showMessage(appMessage, "莊與閒都只能輸入 0～9 的整數", "error");
    return;
  }

  setBusy(true);
  try {
    setSync("同步中", "pending");
    const game = {
      shoe_id: currentShoe.id,
      game_number: currentGames.length + 1,
      banker_points: banker,
      player_points: player,
      winner: winnerOf(banker, player),
      difference: banker - player
    };

    const { data, error } = await supabase
      .from("games")
      .insert(game)
      .select()
      .single();

    if (error) throw error;
    currentGames.push(data);
    $("bankerInput").value = "";
    $("playerInput").value = "";
    setSync("已同步", "ok");
    showMessage(appMessage, `第 ${data.game_number} 局已儲存`, "success");
  } catch (error) {
    console.error(error);
    setSync("同步失敗", "error");
    showMessage(appMessage, error.message || "新增失敗", "error");
  } finally {
    setBusy(false);
    render();
    $("bankerInput").focus();
  }
}

async function deleteLastGame() {
  if (busy || !currentGames.length || currentShoe?.status !== "open") return;
  const last = currentGames[currentGames.length - 1];
  if (!confirm(`確定刪除第 ${last.game_number} 局嗎？`)) return;

  setBusy(true);
  try {
    setSync("同步中", "pending");
    const { error } = await supabase.from("games").delete().eq("id", last.id);
    if (error) throw error;
    currentGames.pop();
    setSync("已同步", "ok");
    showMessage(appMessage, "上一局已刪除", "success");
  } catch (error) {
    console.error(error);
    setSync("同步失敗", "error");
    showMessage(appMessage, error.message || "刪除失敗", "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function finishShoe() {
  if (busy || !currentShoe || currentShoe.status !== "open") return;
  if (!confirm(`確定結束 ${currentShoe.shoe_number} 嗎？`)) return;

  setBusy(true);
  try {
    setSync("同步中", "pending");
    const { data, error } = await supabase
      .from("shoes")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", currentShoe.id)
      .select()
      .single();

    if (error) throw error;
    currentShoe = data;
    setSync("已同步", "ok");
    showMessage(appMessage, "牌靴已結束", "success");
  } catch (error) {
    console.error(error);
    setSync("同步失敗", "error");
    showMessage(appMessage, error.message || "結束牌靴失敗", "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function login() {
  if (busy) return;
  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;
  if (!email || !password) {
    showMessage(loginMessage, "請輸入 Email 和密碼", "error");
    return;
  }

  setBusy(true);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showMessage(loginMessage, "登入成功", "success");
  } catch (error) {
    console.error(error);
    showMessage(loginMessage, "登入失敗，請確認帳號或密碼", "error");
  } finally {
    setBusy(false);
  }
}

async function logout() {
  await supabase.auth.signOut();
}

async function showAuthenticated() {
  loginPanel.classList.add("hidden");
  appPanel.classList.remove("hidden");
  logoutButton.classList.remove("hidden");
  try {
    await loadCloudData();
  } catch (error) {
    console.error(error);
    setSync("連線失敗", "error");
    showMessage(appMessage, error.message || "讀取雲端資料失敗", "error");
  }
}

function showLoggedOut() {
  loginPanel.classList.remove("hidden");
  appPanel.classList.add("hidden");
  logoutButton.classList.add("hidden");
  currentShoe = null;
  currentGames = [];
}

$("loginButton").addEventListener("click", login);
$("logoutButton").addEventListener("click", logout);
$("addGameButton").addEventListener("click", addGame);
$("undoButton").addEventListener("click", deleteLastGame);
$("finishShoeButton").addEventListener("click", finishShoe);
$("newShoeButton").addEventListener("click", createNewShoe);
$("refreshButton").addEventListener("click", async () => {
  try { await loadCloudData(); }
  catch (error) {
    setSync("連線失敗", "error");
    showMessage(appMessage, error.message || "重新整理失敗", "error");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (!loginPanel.classList.contains("hidden")) login();
    else if (document.activeElement === $("bankerInput") || document.activeElement === $("playerInput")) addGame();
  }
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session) await showAuthenticated();
  else showLoggedOut();
});

const { data: { session } } = await supabase.auth.getSession();
if (session) await showAuthenticated();
else showLoggedOut();
