// ========== QUOTES APP WITH SERVER SYNC AND CONFLICT RESOLUTION ==========

// Default quotes
let quotes = JSON.parse(localStorage.getItem('quotes')) || [
  { text: "Success is not final, failure is not fatal.", category: "Motivation", updatedAt: Date.now() },
  { text: "In the middle of every difficulty lies opportunity.", category: "Wisdom", updatedAt: Date.now() },
  { text: "Act as if what you do makes a difference. It does.", category: "Inspiration", updatedAt: Date.now() }
];

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteButton = document.getElementById('newQuote');
const addQuoteButton = document.getElementById('addQuote');
const categoryFilter = document.getElementById('categoryFilter');
const notification = document.createElement('div');
notification.id = 'notification';
document.body.appendChild(notification);

// ===== Show random quote =====
function showRandomQuote() {
  const filteredQuotes = getFilteredQuotes();
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const quote = filteredQuotes[randomIndex];
  quoteDisplay.innerHTML = `<p>"${quote.text}"</p><p><strong>${quote.category}</strong></p>`;

  // Save last viewed quote in session storage
  sessionStorage.setItem('lastQuote', JSON.stringify(quote));
}

// ===== Add new quote =====
function addQuote() {
  const newText = document.getElementById('newQuoteText').value.trim();
  const newCategory = document.getElementById('newQuoteCategory').value.trim();

  if (newText === "" || newCategory === "") {
    alert("Please fill in both fields.");
    return;
  }

  const newQuote = { text: newText, category: newCategory, updatedAt: Date.now() };
  quotes.push(newQuote);
  saveQuotes();
  populateCategories();

  document.getElementById('newQuoteText').value = "";
  document.getElementById('newQuoteCategory').value = "";

  postQuoteToServer(newQuote);
  alert("New quote added!");
}

// ===== Filter quotes =====
function getFilteredQuotes() {
  const selectedCategory = categoryFilter.value;
  if (selectedCategory === 'all') return quotes;
  return quotes.filter(q => q.category === selectedCategory);
}

function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  localStorage.setItem('lastFilter', selectedCategory);
  showRandomQuote();
}

// ===== Populate categories =====
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  const lastFilter = localStorage.getItem('lastFilter');
  if (lastFilter) categoryFilter.value = lastFilter;
}

// ===== Save to local storage =====
function saveQuotes() {
  localStorage.setItem('quotes', JSON.stringify(quotes));
}

// ===== Server Simulation =====

// Fetch quotes from mock API (simulate JSONPlaceholder)
async function fetchQuotesFromServer() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
    const data = await response.json();
    const serverQuotes = data.map(post => ({
      text: post.title,
      category: "Server",
      updatedAt: Date.now()
    }));

    // Merge with local data and resolve conflicts
    resolveConflicts(serverQuotes);
  } catch (error) {
    console.error("Error fetching from server:", error);
  }
}

// Post new quotes to mock server
async function postQuoteToServer(quote) {
  try {
    await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      body: JSON.stringify(quote),
      headers: { 'Content-type': 'application/json; charset=UTF-8' }
    });
  } catch (error) {
    console.error("Error posting to server:", error);
  }
}

// ===== Conflict resolution =====
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
    showNotification("Quotes updated from server!");
    populateCategories();
  }
}

// ===== Notifications =====
function showNotification(message) {
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "10px";
  notification.style.right = "10px";
  notification.style.background = "orange";
  notification.style.color = "white";
  notification.style.padding = "10px";
  notification.style.borderRadius = "8px";
  setTimeout(() => notification.textContent = "", 3000);
}

// ===== Periodic Sync =====
function syncQuotes() {
  fetchQuotesFromServer();
  setInterval(fetchQuotesFromServer, 15000); // every 15s
}

// ===== Initialize App =====
function init() {
  populateCategories();
  const lastQuote = sessionStorage.getItem('lastQuote');
  if (lastQuote) {
    const quote = JSON.parse(lastQuote);
    quoteDisplay.innerHTML = `<p>"${quote.text}"</p><p><strong>${quote.category}</strong></p>`;
  } else {
    showRandomQuote();
  }
  syncQuotes();
}

// ===== Event Listeners =====
newQuoteButton.addEventListener('click', showRandomQuote);
addQuoteButton.addEventListener('click', addQuote);
categoryFilter.addEventListener('change', filterQuotes);

// Start app
init();
