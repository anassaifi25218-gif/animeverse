const loginForm =
  document.getElementById("loginForm");

const loginBox =
  document.getElementById("loginBox");

const dashboard =
  document.getElementById("dashboard");

const loginMsg =
  document.getElementById("loginMsg");

const uploadForm =
  document.getElementById("uploadForm");

const uploadMsg =
  document.getElementById("uploadMsg");

const logoutBtn =
  document.getElementById("logout");

const adminList =
  document.getElementById("adminList");

const videoUploadBtn =
  document.getElementById("videoUploadBtn");

const posterUploadBtn =
  document.getElementById("posterUploadBtn");

const videoStatus =
  document.getElementById("videoStatus");

const posterStatus =
  document.getElementById("posterStatus");

const searchAdmin =
  document.getElementById("searchAdmin");

const totalAnime =
  document.getElementById("totalAnime");

const totalEpisodes =
  document.getElementById("totalEpisodes");


const CLOUDINARY_UPLOAD_PRESET =
  "animeverse_upload";


let uploadedVideo = null;
let uploadedPoster = null;

let allAnime = [];
let selectedAnimeId = null;

// ===============================
// LOGIN STATUS
// ===============================

async function checkStatus() {

  try {

    const res =
      await fetch(
        "/api/admin/status",
        {
          credentials:
            "same-origin",
          cache:
            "no-store"
        }
      );

    const data =
      await res.json();

    if (data.isAdmin) {
      showDashboard();
    } else {
      showLogin();
    }

  } catch (error) {

    console.error(
      "STATUS ERROR:",
      error
    );

    loginMsg.textContent =
      "Server connection error";
  }
}


// ===============================
// SHOW DASHBOARD
// ===============================

function showDashboard() {

  loginBox.hidden = true;
  dashboard.hidden = false;

  loadAnime();
}


function showLogin() {

  loginBox.hidden = false;
  dashboard.hidden = true;
}


// ===============================
// LOGIN
// ===============================

loginForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    loginMsg.textContent =
      "Logging in...";


    const password =
      document.getElementById(
        "password"
      ).value;


    try {

      const res =
        await fetch(
          "/api/admin/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                password
              })
          }
        );


      const data =
        await res.json();


      if (!res.ok) {

        loginMsg.textContent =
          data.error ||
          "Login failed";

        return;
      }


      loginForm.reset();

      loginMsg.textContent = "";

      showDashboard();

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      loginMsg.textContent =
        "Server connection error";
    }
  }
);


// ===============================
// CLOUDINARY CONFIG
// ===============================

async function getCloudinaryConfig(
  resourceType
) {

  const res =
    await fetch(
      "/api/admin/upload-signature",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        credentials:
          "same-origin",

        body:
          JSON.stringify({
            resource_type:
              resourceType
          })
      }
    );


  if (res.status === 401) {

    showLogin();

    throw new Error(
      "Session expire ho gaya. Dobara login karo."
    );
  }


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data.error ||
      "Cloudinary configuration nahi mili."
    );
  }


  return data;
}


// ===============================
// CLOUDINARY WIDGET
// ===============================

async function openCloudinaryWidget(
  resourceType
) {

  const config =
    await getCloudinaryConfig(
      resourceType
    );


  if (
    typeof cloudinary ===
    "undefined"
  ) {

    throw new Error(
      "Cloudinary Widget load nahi hua."
    );
  }


  return new Promise(
    (resolve, reject) => {

      let finished = false;


      const widget =
        cloudinary.createUploadWidget(
          {

            cloudName:
              config.cloud_name,

            uploadPreset:
              CLOUDINARY_UPLOAD_PRESET,

            resourceType:
              resourceType,

            multiple: false,

            sources: [
              "local"
            ],

            clientAllowedFormats:
              resourceType === "video"
                ? [
                    "mp4",
                    "webm",
                    "ogg"
                  ]
                : [
                    "jpg",
                    "jpeg",
                    "png",
                    "webp"
                  ]

          },

          (error, result) => {

            if (error) {

              console.error(
                "CLOUDINARY ERROR:",
                error
              );

              if (!finished) {

                finished = true;

                reject(
                  new Error(
                    error.message ||
                    "Cloudinary upload failed."
                  )
                );
              }

              return;
            }


            if (
              result &&
              result.event ===
                "upload-added"
            ) {

              uploadMsg.textContent =
                "Uploading...";
            }


            if (
              result &&
              result.event ===
                "success"
            ) {

              const info =
                result.info;


              if (
                !info.secure_url ||
                !info.public_id
              ) {

                if (!finished) {

                  finished = true;

                  reject(
                    new Error(
                      "Cloudinary URL nahi mili."
                    )
                  );
                }

                return;
              }


              if (!finished) {

                finished = true;

                resolve({
                  secure_url:
                    info.secure_url,

                  public_id:
                    info.public_id
                });
              }
            }

          }
        );


      widget.open();

    }
  );
}


// ===============================
// VIDEO UPLOAD
// ===============================

videoUploadBtn.addEventListener(
  "click",
  async () => {

    try {

      videoUploadBtn.disabled =
        true;

      videoStatus.textContent =
        "Uploading video...";


      const result =
        await openCloudinaryWidget(
          "video"
        );


      uploadedVideo =
        result;


      videoStatus.textContent =
        "✅ Video uploaded";


      uploadMsg.textContent =
        "Video ready.";

    } catch (error) {

      console.error(
        "VIDEO ERROR:",
        error
      );

      videoStatus.textContent =
        "❌ Video upload failed";

      uploadMsg.textContent =
        "Upload error: " +
        error.message;

    } finally {

      videoUploadBtn.disabled =
        false;
    }
  }
);


// ===============================
// POSTER UPLOAD
// ===============================

posterUploadBtn.addEventListener(
  "click",
  async () => {

    try {

      posterUploadBtn.disabled =
        true;

      posterStatus.textContent =
        "Uploading poster...";


      const result =
        await openCloudinaryWidget(
          "image"
        );


      uploadedPoster =
        result;


      posterStatus.textContent =
        "✅ Poster uploaded";


      uploadMsg.textContent =
        "Poster ready.";

    } catch (error) {

      console.error(
        "POSTER ERROR:",
        error
      );

      posterStatus.textContent =
        "❌ Poster upload failed";

      uploadMsg.textContent =
        "Poster error: " +
        error.message;

    } finally {

      posterUploadBtn.disabled =
        false;
    }
  }
);


// ===============================
// SAVE ANIME
// ===============================

uploadForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();


    if (!uploadedVideo) {

      uploadMsg.textContent =
        "Pehle Video upload karo.";

      return;
    }


    uploadMsg.textContent =
      "Publishing anime...";


    const formData =
      new FormData(
        uploadForm
      );


    const body = {

      title:
        formData.get("title") || "",

      description:
        formData.get("description") || "",

      category:
        formData.get("category") ||
        "Anime",

      episode:
        formData.get("episode") ||
        1,
  animeId:
    selectedAnimeId || null,
      video: {

        secure_url:
          uploadedVideo.secure_url,

        public_id:
          uploadedVideo.public_id
      },

      poster:
        uploadedPoster
          ? {
              secure_url:
                uploadedPoster.secure_url,

              public_id:
                uploadedPoster.public_id
            }
          : null
    };


    try {

      const saveRes =
        await fetch(
          "/api/admin/anime",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify(body)
          }
        );


      if (
        saveRes.status === 401
      ) {

        showLogin();

        throw new Error(
          "Session expire ho gaya. Dobara login karo."
        );
      }


      const saveData =
        await saveRes.json();


      if (
        !saveRes.ok ||
        !saveData.ok
      ) {

        throw new Error(
          saveData.error ||
          "Anime save failed"
        );
      }


      uploadMsg.textContent =
        "✅ Anime published successfully!";


      uploadForm.reset();

      uploadedVideo = null;
      uploadedPoster = null;
      selectedAnimeId = null;


      videoStatus.textContent =
        "No video selected";

      posterStatus.textContent =
        "No poster selected";


      await loadAnime();

    } catch (error) {

      console.error(
        "SAVE ERROR:",
        error
      );

      uploadMsg.textContent =
        "Upload error: " +
        error.message;
    }
  }
);


// ===============================
// LOAD ANIME
// ===============================

async function loadAnime() {

  try {

    const res =
      await fetch(
        "/api/anime",
        {
          cache:
            "no-store"
        }
      );


    if (!res.ok) {
      throw new Error(
        "Anime load failed"
      );
    }


    const list =
      await res.json();


    allAnime =
      Array.isArray(list)
        ? list
        : [];


    updateStats(
      allAnime
    );

    displayAdminAnime(
      allAnime
    );

  } catch (error) {

    console.error(
      "LOAD ERROR:",
      error
    );

    adminList.innerHTML =
      "<p class='msg'>Unable to load anime.</p>";
  }
}


// ===============================
// STATS
// ===============================

function updateStats(list) {

  const uniqueTitles =
    new Set(
      list.map(
        anime =>
          String(
            anime.title || ""
          ).trim().toLowerCase()
      )
    );

  totalAnime.textContent =
    uniqueTitles.size;

  totalEpisodes.textContent =
    list.length;
}


// ===============================
// SEARCH
// ===============================

if (searchAdmin) {

  searchAdmin.addEventListener(
    "input",
    () => {

      const query =
        searchAdmin.value
          .toLowerCase()
          .trim();


      const filtered =
        allAnime.filter(
          anime => {

            const title =
              String(
                anime.title || ""
              ).toLowerCase();

            const category =
              String(
                anime.category || ""
              ).toLowerCase();

            return (
              title.includes(query) ||
              category.includes(query)
            );
          }
        );


      displayAdminAnime(
        filtered
      );
    }
  );
}


// ===============================
// DISPLAY ADMIN LIST
// ===============================

function displayAdminAnime(
  list
) {

  adminList.innerHTML = "";


  if (!list.length) {

    adminList.innerHTML =
      "<p class='muted'>No anime found.</p>";

    return;
  }


  list.forEach(
    anime => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "admin-anime";


      item.innerHTML = `

        <div class="anime-main">

          <strong>
            ${escapeHtml(
              anime.title
            )}
          </strong>

          <span class="muted">
            Episode ${anime.episode || 1}
          </span>

          <span class="muted">
            ${escapeHtml(
              anime.category ||
              "Anime"
            )}
          </span>

        </div>


        <div class="anime-actions">

          <button
            class="edit-btn"
            type="button"
          >
            ✏️ Edit
          </button>

          <button
            class="episode-btn"
            type="button"
          >
            ➕ Episode
          </button>

          <button
            class="delete-btn"
            type="button"
          >
            🗑️ Delete
          </button>

        </div>
      `;


      item
        .querySelector(
          ".edit-btn"
        )
        .addEventListener(
          "click",
          () => {
            editAnime(anime);
          }
        );


      item
        .querySelector(
          ".episode-btn"
        )
        .addEventListener(
          "click",
          () => {

            prepareNewEpisode(
              anime
            );
          }
        );


      item
        .querySelector(
          ".delete-btn"
        )
        .addEventListener(
          "click",
          () => {

            deleteAnime(
              anime.id
            );
          }
        );


      adminList.appendChild(
        item
      );

    }
  );
}


// ===============================
// EDIT ANIME
// ===============================

async function editAnime(
  anime
) {

  const title =
    prompt(
      "Anime title:",
      anime.title || ""
    );

  if (title === null) {
    return;
  }


  const description =
    prompt(
      "Description:",
      anime.description || ""
    );

  if (description === null) {
    return;
  }


  const category =
    prompt(
      "Category:",
      anime.category || "Anime"
    );

  if (category === null) {
    return;
  }


  const episode =
    prompt(
      "Episode number:",
      anime.episode || 1
    );

  if (episode === null) {
    return;
  }


  uploadMsg.textContent =
    "Saving changes...";


  try {

    const res =
      await fetch(
        `/api/admin/anime/${anime.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials:
            "same-origin",

          body:
            JSON.stringify({
              title,
              description,
              category,
              episode
            })
        }
      );


    const data =
      await res.json();


    if (
      res.status === 401
    ) {

      showLogin();

      return;
    }


    if (!res.ok) {

      throw new Error(
        data.error ||
        "Edit failed"
      );
    }


    uploadMsg.textContent =
      "✅ Anime updated successfully!";


    await loadAnime();

  } catch (error) {

    console.error(
      "EDIT ERROR:",
      error
    );

    uploadMsg.textContent =
      "Edit error: " +
      error.message;
  }
}


// ===============================
// NEW EPISODE
// ===============================

function prepareNewEpisode(anime) {

  selectedAnimeId = anime.id;

  document.getElementById("title").value =
    anime.title || "";

  document.getElementById("description").value =
    anime.description || "";

  document.getElementById("category").value =
    anime.category || "Anime";


  let nextEpisode =
    Number(anime.episode || 0) + 1;


  if (Array.isArray(anime.episodes)) {

    const numbers =
      anime.episodes
        .map(item => Number(item.episode))
        .filter(Number.isFinite);

    if (numbers.length) {
      nextEpisode =
        Math.max(...numbers) + 1;
    }
  }


  document.getElementById("episode").value =
    nextEpisode;


  uploadMsg.textContent =
    `Episode ${nextEpisode} ke liye video upload karo.`;


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ===============================
// DELETE
// ===============================

async function deleteAnime(
  id
) {

  const anime =
    allAnime.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!anime) {
    return;
  }


  const confirmed =
    confirm(
      `Delete "${anime.title}" Episode ${
        anime.episode || 1
      }?\n\nVideo aur poster bhi Cloudinary se delete ho sakte hain.`
    );


  if (!confirmed) {
    return;
  }


  try {

    const res =
      await fetch(
        `/api/admin/anime/${id}`,
        {
          method: "DELETE",

          credentials:
            "same-origin"
        }
      );


    if (
      res.status === 401
    ) {

      showLogin();

      alert(
        "Session expire ho gaya. Dobara login karo."
      );

      return;
    }


    const data =
      await res.json();


    if (!res.ok) {

      alert(
        data.error ||
        "Delete failed"
      );

      return;
    }


    uploadMsg.textContent =
      "✅ Anime deleted.";

    await loadAnime();

  } catch (error) {

    console.error(
      "DELETE ERROR:",
      error
    );

    alert(
      "Delete error: " +
      error.message
    );
  }
}


// ===============================
// ESCAPE
// ===============================

function escapeHtml(s) {

  return String(s || "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}


// ===============================
// START
// ===============================

checkStatus();
