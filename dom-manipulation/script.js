// CONFIG
// Replace this mock URL with your real server endpoint.
// The code expects the server to provide an array of quote objects:
// [{ id: "server-id-1", text: "...", category: "...", updatedAt: "ISO" }, ...]
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts"; // mock endpoint for demo
const POLL_INTERVAL_MS = 20000; // poll every 20s

// DOM
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteButton = document.getElementById("newQuote");
const addQuoteButton = document.getElementById("addQuote");
const exportButton = document.getElementById("exportQuotes");
const importInput = document.getElementById("importQuotes");
const categoryFilter = document.getElementById("categoryFilter");
const syncStatusEl = document.getElementById("syncStatus");
const notif = document.getElementById("notif");
const forceSyncBtn = document.getElementById("forceSync");

// STORAGE KEYS
const LS_QUOTES = "quotes";
const LS_SELECTED_CATEGORY = "selectedCategory";
const SS_LAST_QUOTE = "lastViewedQuote";
const LS_LAST_SYNC = "lastSyncTime";

// In-memory
let quotes = loadLocalQuotes();
let lastSyncTime = localStorage.getItem(LS_LAST_SYNC) || null;

// UTILITIES
function nowISO(){ return new Date().toISOString(); }

function saveLocalQuotes(){
  localStorage.setItem(LS_QUOTES, JSON.stringify(quotes));
}

function loadLocalQuotes(){
  try {
    const raw = localStorage.getItem(LS_QUOTES);
    return raw ? JSON.parse(raw) : defaultQuotes();
  } catch { return defaultQuotes(); }
}

function defaultQuotes(){
  return [
    { id: generateId(), text: "Success is not final, failure is not fatal.", category: "Motivation", updatedAt: nowISO() },
    { id: generateId(), text: "In the middle of every difficulty lies opportunity.", category: "Wisdom", updatedAt: nowISO() },
    { id: generateId(), text: "Act as if what you do makes a difference. It does.", category: "Inspiration", updatedAt: nowISO() }
  ];
}

function generateId(){
  return "local-" + Math.random().toString(36).slice(2,9);
}

// UI: show random quote based on filter
function showRandomQuote(){
  const filtered = getFilteredQuotes();
  if(filtered.length === 0){
    quoteDisplay.innerHTML = "<p>No quotes in this category yet.</p>";
    return;
  }
  const i = Math.floor(Math.random()*filtered.length);
  const q = filtered[i];
  renderQuote(q);
  sessionStorage.setItem(SS_LAST_QUOTE, JSON.stringify(q));
}

function renderQuote(q){
  quoteDisplay.innerHTML = `<p>"${escapeHtml(q.text)}"</p><p><strong>${escapeHtml(q.category)}</strong></p><div class="small">id:${q.id} updated:${q.updatedAt}</div>`;
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; });
}

// Filter helpers
function getFilteredQuotes(){
  const sel = categoryFilter.value || "all";
  if(sel === "all") return quotes;
  return quotes.filter(q => q.category === sel);
}

function populateCategories(){
  const cats = [...new Set(quotes.map(q => q.category))].sort();
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryFilter.appendChild(opt);
  });
  const saved = localStorage.getItem(LS_SELECTED_CATEGORY);
  if(saved && [...categoryFilter.options].some(o => o.value === saved)) categoryFilter.value = saved;
}

// Add quote
function addQuote(){
  const t = document.getElementById("newQuoteText").value.trim();
  const c = document.getElementById("newQuoteCategory").value.trim();
  if(!t || !c){ alert("Fill both fields."); return; }
  const q = { id: generateId(), text: t, category: c, updatedAt: nowISO(), _dirty: true };
  quotes.push(q);
  saveLocalQuotes();
  populateCategories();
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
  showNotif("New quote saved locally. It will sync to server on next sync.");
}

// Export/Import
function exportToJsonFile(){
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "quotes.json"; a.click();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(e){
  const file = e.target.files[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = function(ev){
    try {
      const imported = JSON.parse(ev.target.result);
      if(!Array.isArray(imported)) throw Error("Invalid format");
      // normalize: ensure id and updatedAt
      imported.forEach(item => {
        if(!item.id) item.id = generateId();
        if(!item.updatedAt) item.updatedAt = nowISO();
      });
      quotes = imported;
      saveLocalQuotes();
      populateCategories();
      showNotif("Quotes imported and saved locally.");
    } catch {
      alert("Failed to import. Provide valid JSON array.");
    }
  };
  r.readAsText(file);
}

// Notifications
function showNotif(msg, persist){
  notif.style.display = "block";
  notif.innerHTML = `<div>${escapeHtml(msg)}</div>`;
  if(!persist) setTimeout(()=>{ notif.style.display = "none"; }, 5000);
}

// SYNC: fetch from server (simulation)
// This function fetches server data and merges it using 'server wins' policy.
// It also detects conflicts and prompts the user when local and server both changed.
async function fetchServerQuotes(){
  setSyncStatus("fetching");
  try {
    const res = await fetch(SERVER_URL);
    if(!res.ok) throw new Error("Server fetch failed");
    // For jsonplaceholder posts, map to quotes shape for demo
    const serverRaw = await res.json();
    const serverQuotes = serverRaw.slice(0,20).map(item => {
      // map typical post to quote shape for demo only
      return {
        id: "srv-" + item.id,
        text: item.title || item.body || ("Quote " + item.id),
        category: "Server",
        updatedAt: nowISO()
      };
    });

    // Merge logic
    const merged = mergeServerAndLocal(serverQuotes);
    quotes = merged;
    saveLocalQuotes();
    localStorage.setItem(LS_LAST_SYNC, nowISO());
    lastSyncTime = localStorage.getItem(LS_LAST_SYNC);
    setSyncStatus("idle");
    populateCategories();
    showNotif("Sync completed. Server changes applied.", false);
  } catch (err) {
    setSyncStatus("error");
    showNotif("Sync failed: " + err.message, false);
  }
}

function setSyncStatus(s){ syncStatusEl.textContent = s; }

// Merge with conflict detection
// Server array takes precedence. If both local and server versions changed, we treat as conflict.
function mergeServerAndLocal(serverList){
  // Build maps
  const serverMap = new Map(serverList.map(s => [s.id, s]));
  const localMap = new Map(quotes.map(l => [l.id, l]));

  // Start with copy of local
  const result = [];

  // Add/replace from server
  serverList.forEach(s => {
    const local = localMap.get(s.id);
    if(!local){
      // new server quote
      result.push(s);
    } else {
      // both exist: conflict check via updatedAt or dirty flag
      const localChanged = !!local._dirty || (local.updatedAt && s.updatedAt && new Date(local.updatedAt) > new Date(s.updatedAt));
      const serverChanged = !!s.updatedAt; // in this demo server always has updatedAt
      if(localChanged && serverChanged){
        // conflict: by default server wins. Offer manual resolution.
        promptConflictResolution(local, s);
        result.push(s); // server precedence
      } else {
        // no conflict: prefer newest by timestamp or server
        result.push(s.updatedAt && local.updatedAt ? (new Date(s.updatedAt) >= new Date(local.updatedAt) ? s : local) : s);
      }
    }
  });

  // Include local-only items (not on server)
  quotes.forEach(l=>{
    if(!serverMap.has(l.id)){
      // local-only item. Keep it. If local marked _dirty then it will need to be pushed to server.
      result.push(l);
    }
  });

  // Ensure updatedAt exists and strip internal flags
  result.forEach(r => { if(!r.updatedAt) r.updatedAt = nowISO(); delete r._dirty; });

  return result;
}

// Prompt user to resolve conflict manually
// For now show a box inside notif with two buttons: keep local or keep server
function promptConflictResolution(localItem, serverItem){
  const box = document.createElement("div");
  box.id = "conflictBox";
  box.innerHTML = `
    <div><strong>Conflict detected for id ${escapeHtml(localItem.id)}</strong></div>
    <div class="small">Local: ${escapeHtml(localItem.text)} (${escapeHtml(localItem.category)})</div>
    <div class="small">Server: ${escapeHtml(serverItem.text)} (${escapeHtml(serverItem.category)})</div>
    <div style="margin-top:8px">
      <button id="keepLocalBtn">Keep Local</button>
      <button id="keepServerBtn">Keep Server</button>
    </div>
  `;
  notif.style.display = "block";
  notif.appendChild(box);

  document.getElementById("keepLocalBtn").onclick = () => {
    // apply local item by pushing to server (simulate push)
    pushLocalItemToServer(localItem).then(()=>{
      notif.removeChild(box);
      showNotif("Kept local and pushed to server.", false);
    }).catch(()=>{
      notif.removeChild(box);
      showNotif("Failed to push local to server.", false);
    });
  };

  document.getElementById("keepServerBtn").onclick = () => {
    // keep server version (no action needed)
    notif.removeChild(box);
    showNotif("Kept server version.", false);
  };
}

// Push local dirty items to server (simulation)
// In a real app you would POST/PUT to your API. This demo uses fetch to mock.
async function pushLocalChanges(){
  setSyncStatus("pushing");
  try {
    const dirty = quotes.filter(q => q._dirty);
    for(const q of dirty){
      await pushLocalItemToServer(q);
      delete q._dirty;
    }
    saveLocalQuotes();
    localStorage.setItem(LS_LAST_SYNC, nowISO());
    setSyncStatus("idle");
    showNotif("Local changes pushed to server.", false);
  } catch(err){
    setSyncStatus("error");
    showNotif("Push failed: " + err.message, false);
  }
}

async function pushLocalItemToServer(q){
  // Simulation: we create a POST to server and ignore response.
  // Replace with your API endpoint and method (POST/PUT)
  try {
    await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: q.text, body: q.category })
    });
    // Update updatedAt to indicate server accepted it
    q.updatedAt = nowISO();
    return true;
  } catch {
    throw new Error("Network error");
  }
}

// Periodic sync routine
let pollTimer = null;
function startPolling(){
  if(pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async ()=>{
    // 1) push local changes first
    await pushLocalChanges();
    // 2) fetch server state and merge
    await fetchServerQuotes();
  }, POLL_INTERVAL_MS);
}

// Manual force sync
async function forceSync(){
  await pushLocalChanges();
  await fetchServerQuotes();
}

// Initialize
function initApp(){
  populateCategories();
  // Restore last viewed quote
  const last = sessionStorage.getItem(SS_LAST_QUOTE);
  if(last){
    try { const q = JSON.parse(last); renderQuote(q); }
    catch { showRandomQuote(); }
  } else showRandomQuote();

  newQuoteButton.addEventListener("click", showRandomQuote);
  addQuoteButton.addEventListener("click", ()=>{
    addQuote();
    // mark new entries _dirty are already marked in addQuote
  });
  exportButton.addEventListener("click", exportToJsonFile);
  importInput.addEventListener("change", importFromJsonFile);
  forceSyncBtn.addEventListener("click", forceSync);
  startPolling();
  showNotif("App initialized. Background sync started.", false);
}

// Add quote modified to mark dirty
function addQuote(){
  const t = document.getElementById("newQuoteText").value.trim();
  const c = document.getElementById("newQuoteCategory").value.trim();
  if(!t||!c){ alert("Fill both fields."); return; }
  const q = { id: generateId(), text: t, category: c, updatedAt: nowISO(), _dirty: true };
  quotes.push(q);
  saveLocalQuotes();
  populateCategories();
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
  showNotif("Quote saved locally and queued for sync.", false);
}

// Filter functions used by UI
function filterQuotes(){
  const sel = categoryFilter.value;
  localStorage.setItem(LS_SELECTED_CATEGORY, sel);
  showRandomQuote();
}

// wire the init variant used here (overload addQuote reference)
window.addQuote = addQuote;

// Start
initApp();
