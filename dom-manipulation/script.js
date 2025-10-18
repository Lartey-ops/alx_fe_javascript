// ===== Dynamic Quote Generator with Server Sync and Conflict Resolution =====

// Load quotes from localStorage or default
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

// Notification area for data updates/conflicts
const notification = document.createElement('div');
notification.id = 'notification';
document.body.appendChild(notification);

// ====== Display Random Quote ======
function showRandomQuote() {
  const filteredQuotes = getFilteredQuotes();
  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML = "<p>No quotes in this category.</p>";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const quote = filteredQuotes[randomIndex];
  quoteDisplay.innerHTML = `<p>"${quote.text}"</p><p><strong>${quote.category}</strong></p>`;
  sessionStorage.setItem('lastQuote', JSON.stringify(quote));
}

// ====== Add New Quote ======
function addQuote() {
  const newText = document.getElementById('newQuoteText').value.trim();
  const newCategory = document.getElementById('newQuoteCategory').value.trim();

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

  document.getElementById('newQuoteText').value = "";
  document.getElementById('newQuoteCategory').value = "";
}

// ====== Filter Quotes ======
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

// ====== Populate Category Dropdown ======
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

// ====== Save Quotes Locally ======
function saveQuotes() {
