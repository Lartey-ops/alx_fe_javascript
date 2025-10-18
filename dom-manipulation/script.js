
let quotes = JSON.parse(localStorage.getItem('quotes')) || [
  { text: "Success is not final, failure is not fatal.", category: "Motivation" },
  { text: "In the middle of every difficulty lies opportunity.", category: "Wisdom" },
  { text: "Act as if what you do makes a difference. It does.", category: "Inspiration" }
];


const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteButton = document.getElementById('newQuote');
const addQuoteButton = document.getElementById('addQuote');
const exportButton = document.getElementById('exportQuotes');
const importInput = document.getElementById('importQuotes');
const categoryFilter = document.getElementById('categoryFilter');


function showRandomQuote() {
  const filtered = getFilteredQuotes();
  if (filtered.length === 0) {
    quoteDisplay.innerHTML = "<p>No quotes in this category yet.</p>";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filtered.length);
  const quote = filtered[randomIndex];
  quoteDisplay.innerHTML = `<p>"${quote.text}"</p><p><strong>${quote.category}</strong></p>`;
  sessionStorage.setItem('lastViewedQuote', JSON.stringify(quote));
}


function addQuote() {
  const newText = document.getElementById('newQuoteText').value.trim();
  const newCategory = document.getElementById('newQuoteCategory').value.trim();

  if (!newText || !newCategory) {
    alert("Please fill in both fields.");
    return;
  }

  const newQuote = { text: newText, category: newCategory };
  quotes.push(newQuote);
  localStorage.setItem('quotes', JSON.stringify(quotes));

  document.getElementById('newQuoteText').value = "";
  document.getElementById('newQuoteCategory').value = "";

  populateCategories();
  alert("New quote added!");
}


function getFilteredQuotes() {
  const selectedCategory = categoryFilter.value;
  if (selectedCategory === 'all') return quotes;
  return quotes.filter(q => q.category === selectedCategory);
}


function filterQuotes() {
  const selected = categoryFilter.value;
  localStorage.setItem('selectedCategory', selected);
  showRandomQuote();
}


function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  
  const savedCategory = localStorage.getItem('selectedCategory');
  if (savedCategory && [...categoryFilter.options].some(o => o.value === savedCategory)) {
    categoryFilter.value = savedCategory;
  }
}


function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'quotes.json';
  link.click();

  URL.revokeObjectURL(url);
}


function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedQuotes = JSON.parse(e.target.result);
      if (Array.isArray(importedQuotes)) {
        quotes = importedQuotes;
        localStorage.setItem('quotes', JSON.stringify(quotes));
        populateCategories();
        alert("Quotes imported successfully!");
      } else {
        alert("Invalid file format.");
      }
    } catch {
      alert("Error reading file.");
    }
  };
  reader.readAsText(file);
}


newQuoteButton.addEventListener('click', showRandomQuote);
addQuoteButton.addEventListener('click', addQuote);
exportButton.addEventListener('click', exportToJsonFile);
importInput.addEventListener('change', importFromJsonFile);


populateCategories();


const lastViewed = sessionStorage.getItem('lastViewedQuote');
if (lastViewed) {
  const quote = JSON.parse(lastViewed);
  quoteDisplay.innerHTML = `<p>"${quote.text}"</p><p><strong>${quote.category}</strong></p>`;
} else {
  showRandomQuote();
}
