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


// ===============================
// IMPROVED SEARCH
// ===============================

let searchAnimeCache = [];
let searchSuggestionBox = null;


// ===============================
// CREATE SEARCH SUGGESTION BOX
// ===============================

function createSearchSuggestionBox() {

  if (!search || searchSuggestionBox) {
    return;
  }

  const searchBox =
    search.closest(".search-box");

  if (!searchBox) {
    return;
  }

  searchBox.style.position = "relative";

  searchSuggestionBox =
    document.createElement("div");

  searchSuggestionBox.id =
    "searchSuggestions";

  searchSuggestionBox.hidden = true;

  searchSuggestionBox.style.cssText = `
    position:fixed;
    top:75px;
    left:18px;
    right:18px;
    z-index:99999;
    background:#111827;
    border:1px solid rgba(255,255,255,.12);
    border-radius:14px;
    overflow:hidden;
    box-shadow:0 15px 40px rgba(0,0,0,.45);
  `;

  searchBox.appendChild(
    searchSuggestionBox
  );
}


// ===============================
// ESCAPE SEARCH HTML
// ===============================

function escapeSearch(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ===============================
// CLOSE SEARCH
// ===============================

function closeSearchSuggestions() {

  if (!searchSuggestionBox) {
    return;
  }

  searchSuggestionBox.hidden = true;
  searchSuggestionBox.innerHTML = "";

}


// ===============================
// LOAD SEARCH DATA
// ===============================

async function loadSearchAnime() {

  try {

    const response =
      await fetch(
        "/api/anime?_=" + Date.now(),
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    searchAnimeCache =
      Array.isArray(data)
        ? data
        : [];

  } catch (error) {

    console.error(
      "SEARCH LOAD ERROR:",
      error
    );

  }

}


// ===============================
// SHOW SEARCH SUGGESTIONS
// ===============================

function showSearchSuggestions(query) {

  createSearchSuggestionBox();

  if (
    !searchSuggestionBox ||
    !search
  ) {
    return;
  }

  query =
    query.toLowerCase().trim();

  if (!query) {

    closeSearchSuggestions();

    return;
  }


  const results =
    searchAnimeCache
      .filter(
        function (anime) {

          const title =
            String(
              anime.title || ""
            ).toLowerCase();

          const categoryName =
            String(
              anime.category || ""
            ).toLowerCase();

          return (
            title.includes(query) ||
            categoryName.includes(query)
          );

        }
      )
      .slice(0, 6);


  searchSuggestionBox.innerHTML = "";


  if (!results.length) {

    searchSuggestionBox.innerHTML = `
      <div style="
        padding:16px;
        color:#9ca3af;
        text-align:center;
        font-size:14px;
      ">
        🔎 Anime नहीं मिला
      </div>
    `;

    searchSuggestionBox.hidden = false;

    return;
  }


  results.forEach(
    function (anime) {

      const button =
        document.createElement("button");

      button.type = "button";

      button.style.cssText = `
        width:100%;
        display:flex;
        align-items:center;
        gap:12px;
        padding:10px 12px;
        border:0;
        border-bottom:1px solid rgba(255,255,255,.08);
        background:transparent;
        color:#fff;
        text-align:left;
        cursor:pointer;
      `;


      const poster =
        anime.poster?.secure_url ||
        anime.poster?.url ||
        anime.poster ||
        "";


      const episodeCount =
        Array.isArray(anime.episodes)
          ? anime.episodes.length
          : (
              anime.episode ||
              1
            );


      button.innerHTML = `

        ${
          poster
            ? `
              <img
                src="${escapeSearch(poster)}"
                alt=""
                loading="lazy"
                style="
                  width:43px;
                  height:58px;
                  object-fit:cover;
                  border-radius:7px;
                  flex:0 0 43px;
                "
              >
            `
            : `
              <div style="
                width:43px;
                height:58px;
                border-radius:7px;
                background:#202536;
                display:grid;
                place-items:center;
                flex:0 0 43px;
                font-size:20px;
              ">
                🎬
              </div>
            `
        }

        <div style="
          min-width:0;
          flex:1;
        ">

          <div style="
            font-size:15px;
            font-weight:700;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${escapeSearch(
              anime.title ||
              "Untitled Anime"
            )}
          </div>

          <div style="
            margin-top:5px;
            font-size:12px;
            color:#9ca3af;
          ">
            ${escapeSearch(
              anime.category ||
              "Anime"
            )}
            • ${episodeCount} EP
          </div>

        </div>

        <span style="
          font-size:20px;
          flex-shrink:0;
        ">
          ›
        </span>

      `;


      button.addEventListener(
        "mouseenter",
        function () {

          button.style.background =
            "rgba(59,130,246,.12)";

        }
      );


      button.addEventListener(
        "mouseleave",
        function () {

          button.style.background =
            "transparent";

        }
      );


      button.addEventListener(
        "click",
        function () {

          search.value =
            anime.title || "";

          closeSearchSuggestions();

          filterAnime();

        }
      );


      searchSuggestionBox.appendChild(
        button
      );

    }
  );


  searchSuggestionBox.hidden = false;

}


// ===============================
// SEARCH EVENTS
// ===============================

if (search) {

  createSearchSuggestionBox();


  search.addEventListener(
    "input",
    function () {

      filterAnime();

      showSearchSuggestions(
        search.value
      );

    }
  );


  search.addEventListener(
    "focus",
    function () {

      if (
        search.value.trim()
      ) {

        showSearchSuggestions(
          search.value
        );

      }

    }
  );


  search.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
      ) {

        closeSearchSuggestions();

        search.blur();

      }

    }
  );

}


// ===============================
// CATEGORY
// ===============================

if (category) {

  category.addEventListener(
    "change",
    function () {

      filterAnime();

    }
  );

}


// ===============================
// CLICK OUTSIDE SEARCH
// ===============================

document.addEventListener(
  "click",
  function (event) {

    if (
      !search ||
      !searchSuggestionBox
    ) {
      return;
    }

    const searchBox =
      search.closest(
        ".search-box"
      );

    if (
      searchBox &&
      !searchBox.contains(
        event.target
      )
    ) {

      closeSearchSuggestions();

    }

  }
);


// ===============================
// INITIAL LOAD
// ===============================
loadAnime();
loadSearchAnime();
