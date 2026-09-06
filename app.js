const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const category = document.getElementById("category");

let animeList = [];

async function loadAnime() {
try {
const response = await fetch("/api/anime");

if (!response.ok) {
  throw new Error("Anime load failed");
}

animeList = await response.json();

setupCategories();
displayAnime(animeList);

} catch (error) {
console.error(error);
grid.innerHTML = "<p class='empty'>Anime load नहीं हो पाया।</p>";
}
}

function setupCategories() {
const categories = new Set();

animeList.forEach(anime => {
if (anime.category) {
anime.category
.split("|")
.map(c => c.trim())
.filter(Boolean)
.forEach(c => categories.add(c));
}
});

category.innerHTML = '<option value="">All categories</option>';

[...categories]
.sort()
.forEach(cat => {
const option = document.createElement("option");
option.value = cat;
option.textContent = cat;
category.appendChild(option);
});
}

function displayAnime(list) {
grid.innerHTML = "";

if (!list.length) {
empty.hidden = false;
return;
}

empty.hidden = true;

list.forEach(anime => {
const card = document.createElement("a");

card.className = "anime-card";
card.href = `/watch.html?id=${anime.id}`;

const poster = anime.poster
  ? anime.poster
  : "https://via.placeholder.com/300x420?text=No+Poster";

card.innerHTML = `
  <div class="anime-poster">
    <img
      src="${poster}"
      alt="${escapeHTML(anime.title)}"
      loading="lazy"
    >
  </div>

  <div class="anime-info">
    <h3>${escapeHTML(anime.title)}</h3>
    <p>${escapeHTML(anime.category || "Anime")}</p>
  </div>
`;

grid.appendChild(card);

});
}

function escapeHTML(text) {
const div = document.createElement("div");
div.textContent = text || "";
return div.innerHTML;
}

function filterAnime() {
const searchText = search.value.toLowerCase().trim();
const selectedCategory = category.value;

const filtered = animeList.filter(anime => {
const title = (anime.title || "").toLowerCase();
const categories = (anime.category || "")
.split("|")
.map(c => c.trim());

const matchesSearch =
  !searchText || title.includes(searchText);

const matchesCategory =
  !selectedCategory ||
  categories.includes(selectedCategory);

return matchesSearch && matchesCategory;

});

displayAnime(filtered);
}

search.addEventListener("input", filterAnime);
category.addEventListener("change", filterAnime);

loadAnime();
