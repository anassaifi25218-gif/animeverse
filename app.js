const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const category = document.getElementById("category");

let animeList = [];


/* ===============================
   LOAD ANIME
=============================== */

async function loadAnime() {

  try {

    const response = await fetch(
      "/api/anime?_=" + Date.now(),
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Anime load failed: " +
        response.status
      );
    }

    const data =
      await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Invalid anime data"
      );
    }

    animeList = data;

    console.log(
      "Anime loaded:",
      animeList
    );

    setupCategories();

    filterAnime();

  } catch (error) {

    console.error(
      "LOAD ANIME ERROR:",
      error
    );

    if (grid) {

      grid.innerHTML =
        "<p class='empty'>" +
        "Anime load नहीं हो पाया।" +
        "</p>";

    }

  }

}


/* ===============================
   SETUP CATEGORIES
=============================== */

function setupCategories() {

  if (!category) {
    return;
  }

  const categories =
    new Set();


  animeList.forEach(
    function (anime) {

      if (!anime.category) {
        return;
      }

      String(anime.category)
        .split("|")
        .map(
          function (c) {
            return c.trim();
          }
        )
        .filter(Boolean)
        .forEach(
          function (c) {
            categories.add(c);
          }
        );

    }
  );


  category.innerHTML =
    '<option value="">All categories</option>';


  Array.from(categories)
    .sort()
    .forEach(
      function (cat) {

        const option =
          document.createElement(
            "option"
          );

        option.value = cat;

        option.textContent = cat;

        category.appendChild(
          option
        );

      }
    );

}


/* ===============================
   DISPLAY ANIME
=============================== */

function displayAnime(list) {

  if (!grid) {

    console.error(
      "ERROR: #grid element नहीं मिला"
    );

    return;
  }


  grid.innerHTML = "";


  if (!list.length) {

    if (empty) {
      empty.hidden = false;
    }

    return;
  }


  if (empty) {
    empty.hidden = true;
  }


  list.forEach(
    function (anime) {

      const card =
        document.createElement("a");


      card.className =
        "anime-card";


      card.href =
        "/watch.html?id=" +
        encodeURIComponent(
          anime.id
        );


      const poster =
        anime.poster ||
        "https://via.placeholder.com/300x169?text=No+Poster";


      const title =
        anime.title ||
        "Untitled Anime";


      const animeCategory =
        anime.category ||
        "Anime";


      /*
        Episode count
      */

      let episodeText = "";


      if (
        Array.isArray(
          anime.episodes
        ) &&
        anime.episodes.length > 0
      ) {

        episodeText =
          anime.episodes.length +
          " EP";

      } else if (
        anime.episode
      ) {

        episodeText =
          "EP " +
          anime.episode;

      }


      card.innerHTML = `

        <div class="anime-poster">

          <img
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
          >

          ${
            episodeText
              ? `
                <span class="episode-badge">
                  ${escapeHTML(
                    episodeText
                  )}
                </span>
              `
              : ""
          }

        </div>


        <div class="anime-info">

          <h3>
            ${escapeHTML(title)}
          </h3>

          <p>
            ${escapeHTML(
              animeCategory
            )}
          </p>

        </div>

      `;


      grid.appendChild(
        card
      );

    }
  );

}


/* ===============================
   ESCAPE HTML
=============================== */

function escapeHTML(text) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    text || "";

  return div.innerHTML;

}


/* ===============================
   FILTER ANIME
=============================== */

function filterAnime() {

  const searchText =
    search
      ? search.value
          .toLowerCase()
          .trim()
      : "";


  const selectedCategory =
    category
      ? category.value
      : "";


  const filtered =
    animeList.filter(
      function (anime) {

        const title =
          String(
            anime.title || ""
          ).toLowerCase();


        const categories =
          String(
            anime.category || ""
          )
            .split("|")
            .map(
              function (c) {
                return c.trim();
              }
            );


        const matchesSearch =
          !searchText ||
          title.includes(
            searchText
          );


        const matchesCategory =
          !selectedCategory ||
          categories.includes(
            selectedCategory
          );


        return (
          matchesSearch &&
          matchesCategory
        );

      }
    );


  displayAnime(
    filtered
  );

}


/* ===============================
   SEARCH
=============================== */

if (search) {

  search.addEventListener(
    "input",
    function () {

      filterAnime();

    }
  );

}


/* ===============================
   CATEGORY
=============================== */

if (category) {

  category.addEventListener(
    "change",
    function () {

      filterAnime();

    }
  );

}


/* ===============================
   AUTO REFRESH
   New uploads appear automatically
=============================== */

setInterval(
  function () {

    loadAnime();

  },
  30000
);


/* ===============================
   START
=============================== */

loadAnime();
