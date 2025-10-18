// ===== Dynamic Quote Generator with Server Sync and Conflict Resolution =====

// Load quotes from localStorage or defaults
let quotes = JSON.parse(localStorage.getItem('quotes')) || [
  { text: "Success is not final, failure is not fatal.", category: "Motivation", updatedAt: Date.now() },
  { text: "In the middle of every difficulty lies opportunity.", category: "Wisdom", updatedAt: Date.now() },
  { text: "Act as if what you do makes a difference. It does.", category: "Inspiration", updatedAt: Date.now() }
];

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteButton = document.getElementById("newQuote");
const addQuoteButton = document.getElementById("addQuote");
const categoryFilter = document.getElementById("categoryFilter");

// Notification element for updates/conflicts
const notification = document.createElement("div");
notification.id = "notification";
document.body.appendChild(notification);

// ===== Show random quote =====
function showRandomQuote() {
  const filteredQuotes = getFilteredQuotes();
  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML = "<p>No quotes found.</p>";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const quote = filteredQuotes[randomIndex];
  quoteDisplay.innerHTML = `<p>"${quote.text}"</p><p><strong>${quote.category}</strong></p>`;
  sessionStorage.setItem("lastQuote", JSON.stringify(quote));
}

// ===== Add new quote =====
function addQuote() {
  const newText = document.getElementById("newQuoteText").value.trim();
  const newCategory = document.getElementById("newQuoteCategory").value.trim();

  if (!newText || !newCategory) {
    alert("Please fill in both fields.");
    return;
  }

  const newQuote = { text: newText, category: newCategory, updatedAt: Date.now() };
  quotes.push(newQuote);
  saveQuotes();
  populateCategories();
  postQuoteToServer(newQuote);
  showNotification("Quote added and synced with server.");

  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
}

// ===== Filtering =====
function getFilteredQuotes() {
  const selectedCategory = categoryFilter.value;
  if (selectedCategory === "all") return quotes;
  return quotes.filter(q => q.category === selectedCategory);
}

function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  localStorage.setItem("lastFilter", selectedCategory);
  showRandomQuote();
}

// ===== Populate dropdown =====
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  const lastFilter = localStorage.getItem("lastFilter");
  if (lastFilter) categoryFilter.value = lastFilter;
}

// ===== Save quotes locally =====
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

// ===== Fetching data from server using mock API =====
async function fetchQuotesFromServer() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
    const data = await response.json();
    const serverQuotes = data.map(post => ({
      text: post.title,
      category: "Server",
      updatedAt: Date.now()
    }));

    resolveConflicts(serverQuotes);
  } catch (error) {
    console.error("Error fetching data from server:", error);
  }
}

// ===== Posting data to server using mock API =====
async function postQuoteToServer(quote) {
  try {
    await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(quote)
    });
  } catch (error) {
    console.error("Error posting data:", error);
  }
}

// Existing quote functions
function addQuote() { ... }
function displayQuotes() { ... }

// Local storage functions
function saveQuotes() { ... }
function loadQuotes() { ... }

// Server sync functions
async function fetchQuotesFromServer() { ... }
async function postQuoteToServer() { ... }

// Place this next ↓↓↓
async function syncQuotes() {
  const localQuotes = JSON.parse(localStorage.getItem("quotes")) || [];
  const serverQuotes = await fetchQuotesFromServer();

  const mergedQuotes = [...serverQuotes];
  localQuotes.forEach(localQuote => {
    if (!mergedQuotes.some(q => q.id === localQuote.id)) {
      mergedQuotes.push(localQuote);
    }
  });

  localStorage.setItem("quotes", JSON.stringify(mergedQuotes));

  const message = document.createElement("div");
  message.textContent = "Quotes synced with server!";
  message.style.position = "fixed";
  message.style.bottom = "10px";
  message.style.right = "10px";
  message.style.background = "#4CAF50";
  message.style.color = "white";
  message.style.padding = "10px 20px";
  message.style.borderRadius = "5px";
  document.body.appendChild(message);

  setTimeout(() => message.remove(), 3000);
}

// ===== Conflict Resolution =====
function resolveConflicts(serverQuotes) {
  let updated = false;
  serverQuotes.forEach(serverQuote => {
    const localMatch = quotes.find(q => q.text === serverQuote.text);
    if (!localMatch) {
      quotes.push(serverQuote);
      updated = true;
    } else if (serverQuote.updatedAt > localMatch.updatedAt) {
      Object.assign(localMatch, serverQuote);
      updated = true;
    }
  });

  if (updated) {
    saveQuotes();
    populateCategories();
    showNotification("Quotes updated from server.");
  }
}

// ===== Notifications =====
function showNotification(message) {
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "10px";
  notification.style.right = "10px";
  notification.style.background = "green";
  notification.style.color = "white";
  notification.style.padding = "8px 12px";
  notification.style.borderRadius = "6px";
  notification.style.fontSize = "14px";
  setTimeout(() => (notification.textContent = ""), 3000);
}

// ===== SyncQuotes function =====
function syncQuotes() {
  fetchQuotesFromServer();
  setInterval(fetchQuotesFromServer, 15000); // Periodically check every 15s
}

// ===== Initialize app =====
function init() {
  populateCategories();
  const lastQuote = sessionStorage.getItem("lastQuote");
  if (lastQuote) {
    const quote = JSON.parse(lastQuote);
    quoteDisplay.innerHTML = `<p>"${quote.text}"</p><p><strong>${quote.category}</strong></p>`;
  } else {
    showRandomQuote();
  }
  syncQuotes();
}

// ===== Event listeners =====
newQuoteButton.addEventListener("click", showRandomQuote);
addQuoteButton.addEventListener("click", addQuote);
categoryFilter.addEventListener("change", filterQuotes);

// Start app
init();
