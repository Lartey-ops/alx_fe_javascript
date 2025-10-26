let quotes = JSON.parse(localStorage.getItem('quotes')) || [
  { text: "Success is not final, failure is not fatal.", category: "Motivation", updatedAt: Date.now() },
  { text: "In the middle of every difficulty lies opportunity.", category: "Wisdom", updatedAt: Date.now() },
  { text: "Act as if what you do makes a difference. It does.", category: "Inspiration", updatedAt: Date.now() }
];

const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteButton = document.getElementById("newQuote");
const categoryFilter = document.getElementById("categoryFilter");

const notification = document.createElement("div");
notification.id = "notification";
document.body.appendChild(notification);


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


function createAddQuoteForm() {
  const formContainer = document.createElement("div");
  
  const quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.type = "text";
  quoteInput.placeholder = "Enter a new quote";

  const categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";

  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.addEventListener("click", addQuote);

  formContainer.appendChild(quoteInput);
  formContainer.appendChild(categoryInput);
  formContainer.appendChild(addButton);

  document.body.appendChild(formContainer);
}


function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();

  if (text && category) {
    const newQuote = { text, category, updatedAt: Date.now() };
    quotes.push(newQuote);
    saveQuotes();
    populateCategories();
    postQuoteToServer(newQuote);
    showNotification("Quote added and synced with server.");
    showRandomQuote();
    document.getElementById("newQuoteText").value = "";
    document.getElementById("newQuoteCategory").value = "";
  } else {
    alert("Please enter both quote text and category.");
  }
}


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


function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}


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
    return serverQuotes;
  } catch (error) {
    console.error("Error fetching data from server:", error);
    return [];
  }
}


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


async function syncQuotes() {
  await fetchQuotesFromServer();
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
  setInterval(syncQuotes, 15000);
}

newQuoteButton.addEventListener("click", showRandomQuote);
categoryFilter.addEventListener("change", filterQuotes);

init();
createAddQuoteForm();


function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2); 
  const blob = new Blob([dataStr], { type: "application/json" }); 
  const url = URL.createObjectURL(blob); 
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json"; 
  a.click(); 
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
        quotes = importedQuotes.map(q => ({
          text: q.text,
          category: q.category || "General",
          updatedAt: q.updatedAt || Date.now()
        }));
        saveQuotes();
        populateCategories();
        showRandomQuote();
        showNotification("Quotes imported successfully.");
      } else {
        alert("Invalid JSON format.");
      }
    } catch (err) {
      alert("Error importing file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}


document.getElementById("exportQuotes").addEventListener("click", exportToJsonFile);
document.getElementById("importQuotes").addEventListener("change", importFromJsonFile);

