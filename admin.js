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
// UI VISIBILITY
// ===============================

function showDashboard() {

  if (loginBox) {
    loginBox.hidden = true;
    loginBox.style.display = "none";
  }

  if (dashboard) {
    dashboard.hidden = false;
    dashboard.style.display = "block";
  }

  loadAnime();
}


function showLogin() {

  if (dashboard) {
    dashboard.hidden = true;
    dashboard.style.display = "none";
  }

  if (loginBox) {
    loginBox.hidden = false;
    loginBox.style.display = "grid";
  }

  uploadedVideo = null;
  uploadedPoster = null;
  selectedAnimeId = null;

  if (uploadMsg) {
    uploadMsg.textContent = "";
  }

  if (videoStatus) {
    videoStatus.textContent =
      "No video selected";
  }

  if (posterStatus) {
    posterStatus.textContent =
      "No poster selected";
  }
}


// ===============================
// LOGIN STATUS
// ===============================

async function checkStatus() {

  try {

    const res =
      await fetch(
        "/api/admin/status",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store"
        }
      );

    if (!res.ok) {
      showLogin();
      return;
    }

    const data =
      await res.json();

    if (data.isAdmin === true) {
      showDashboard();
    } else {
      showLogin();
    }

  } catch (error) {

    console.error(
      "STATUS ERROR:",
      error
    );

    showLogin();

    if (loginMsg) {
      loginMsg.textContent =
        "Server connection error";
    }
  }
}


// ===============================
// LOGIN
// ===============================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      if (loginMsg) {
        loginMsg.textContent =
          "Logging in...";
      }

      const passwordInput =
        document.getElementById("password");

      const password =
        passwordInput
          ? passwordInput.value
          : "";

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

              credentials: "include",

              body:
                JSON.stringify({
                  password: password
                })
            }
          );

        let data = {};

        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) {

          if (loginMsg) {
            loginMsg.textContent =
              data.error ||
              "Login failed";
          }

          return;
        }

        loginForm.reset();

        if (loginMsg) {
          loginMsg.textContent =
            "Checking login...";
        }

        // Check session
        const statusRes =
          await fetch(
            "/api/admin/status",
            {
              method: "GET",

              credentials:
                "include",

              cache:
                "no-store"
            }
          );

        let statusData = {};

        try {
          statusData =
            await statusRes.json();
        } catch {
          statusData = {};
        }

        if (
          statusRes.ok &&
          statusData.isAdmin === true
        ) {

          if (loginMsg) {
            loginMsg.textContent = "";
          }

          showDashboard();

        } else {

          if (loginMsg) {
            loginMsg.textContent =
              "Login hua, lekin session save nahi hua.";
          }

          console.error(
            "LOGIN SESSION NOT ACTIVE"
          );
        }

      } catch (error) {

        console.error(
          "LOGIN ERROR:",
          error
        );

        if (loginMsg) {
          loginMsg.textContent =
            "Server connection error";
        }
      }
    }
  );
}


// ===============================
// LOGOUT
// ===============================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        await fetch(
          "/api/admin/logout",
          {
            method: "POST",

            credentials:
              "include",

            cache:
              "no-store"
          }
        );

      } catch (error) {

        console.error(
          "LOGOUT ERROR:",
          error
        );

      } finally {

        showLogin();

        if (loginMsg) {
          loginMsg.textContent =
            "Logged out.";
        }
      }
    }
  );
}


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
          "include",

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

  let data = {};

  try {
    data = await res.json();
  } catch {
    data = {};
  }

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

            multiple:
              false,

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

              if (uploadMsg) {
                uploadMsg.textContent =
                  "Uploading...";
              }
            }

            if (
              result &&
              result.event ===
                "success"
            ) {

              const info =
                result.info;

              if (
                !info ||
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

if (videoUploadBtn) {

  videoUploadBtn.addEventListener(
    "click",
    async () => {

      try {

        videoUploadBtn.disabled =
          true;

        if (videoStatus) {
          videoStatus.textContent =
            "Uploading video...";
        }

        const result =
          await openCloudinaryWidget(
            "video"
          );

        uploadedVideo =
          result;

        if (videoStatus) {
          videoStatus.textContent =
            "✅ Video uploaded";
        }

        if (uploadMsg) {
          uploadMsg.textContent =
            "Video ready.";
        }

      } catch (error) {

        console.error(
          "VIDEO ERROR:",
          error
        );

        if (videoStatus) {
          videoStatus.textContent =
            "❌ Video upload failed";
        }

        if (uploadMsg) {
          uploadMsg.textContent =
            "Upload error: " +
            error.message;
        }

      } finally {

        videoUploadBtn.disabled =
          false;
      }
    }
  );
}


// ===============================
// POSTER UPLOAD
// ===============================

if (posterUploadBtn) {

  posterUploadBtn.addEventListener(
    "click",
    async () => {

      try {

        posterUploadBtn.disabled =
          true;

        if (posterStatus) {
          posterStatus.textContent =
            "Uploading poster...";
        }

        const result =
          await openCloudinaryWidget(
            "image"
          );

        uploadedPoster =
          result;

        if (posterStatus) {
          posterStatus.textContent =
            "✅ Poster uploaded";
        }

        if (uploadMsg) {
          uploadMsg.textContent =
            "Poster ready.";
        }

      } catch (error) {

        console.error(
          "POSTER ERROR:",
          error
        );

        if (posterStatus) {
          posterStatus.textContent =
            "❌ Poster upload failed";
        }

        if (uploadMsg) {
          uploadMsg.textContent =
            "Poster error: " +
            error.message;
        }

      } finally {

        posterUploadBtn.disabled =
          false;
      }
    }
  );
}


// ===============================
// SAVE ANIME / NEW EPISODE
// ===============================

if (uploadForm) {

  uploadForm.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      if (!uploadedVideo) {

        if (uploadMsg) {
          uploadMsg.textContent =
            "Pehle Video upload karo.";
        }

        return;
      }

      if (uploadMsg) {
        uploadMsg.textContent =
          "Publishing anime...";
      }

      const formData =
        new FormData(uploadForm);

      const body = {

        title:
          formData.get("title") || "",

        description:
          formData.get("description") || "",

        category:
          formData.get("category") ||
          "Anime",

        episode:
          Number(
            formData.get("episode") ||
            1
          ),

        animeId:
          selectedAnimeId,

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
                "include",

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

        let saveData = {};

        try {
          saveData =
            await saveRes.json();
        } catch {
          saveData = {};
        }

        if (
          !saveRes.ok ||
          !saveData.ok
        ) {

          throw new Error(
            saveData.error ||
            "Anime save failed"
          );
        }

        if (uploadMsg) {
          uploadMsg.textContent =
            "✅ Anime published successfully!";
        }

        uploadForm.reset();

        uploadedVideo = null;
        uploadedPoster = null;
        selectedAnimeId = null;

        if (videoStatus) {
          videoStatus.textContent =
            "No video selected";
        }

        if (posterStatus) {
          posterStatus.textContent =
            "No poster selected";
        }

        await loadAnime();

      } catch (error) {

        console.error(
          "SAVE ERROR:",
          error
        );

        if (uploadMsg) {
          uploadMsg.textContent =
            "Upload error: " +
            error.message;
        }
      }
    }
  );
}


// ===============================
// PREPARE NEW EPISODE
// ===============================

function prepareNewEpisode(anime) {

  selectedAnimeId =
    anime.id;

  if (uploadForm) {

    uploadForm.reset();

    const title =
      document.getElementById("title");

    const description =
      document.getElementById("description");

    const category =
      document.getElementById("category");

    const episode =
      document.getElementById("episode");

    if (title) {
      title.value =
        anime.title || "";
    }

    if (description) {
      description.value =
        anime.description || "";
    }

    if (category) {
      category.value =
        anime.category || "Anime";
    }

    if (episode) {
      const episodes =
        Array.isArray(anime.episodes)
          ? anime.episodes
          : [];

      const maxEpisode =
        episodes.reduce(
          (max, ep) =>
            Math.max(
              max,
              Number(ep.episode) || 0
            ),
          Number(anime.episode) || 0
        );

      episode.value =
        maxEpisode + 1;
    }
  }

  uploadedVideo = null;
  uploadedPoster = null;

  if (videoStatus) {
    videoStatus.textContent =
      "No video selected";
  }

  if (posterStatus) {
    posterStatus.textContent =
      "No poster selected";
  }

  if (uploadMsg) {
    uploadMsg.textContent =
      `➕ Episode add kar rahe ho: ${anime.title}`;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ===============================
// LOAD ANIME
// ===============================

async function loadAnime() {

  if (!adminList) {
    return;
  }

  try {

    const res =
      await fetch(
        "/api/anime",
        {
          method: "GET",

          cache:
            "no-store",

          credentials:
            "include"
        }
      );

    if (!res.ok) {

      if (res.status === 401) {
        showLogin();
      }

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

  if (totalAnime) {

    const uniqueTitles =
      new Set(
        list.map(
          anime =>
            String(
              anime.title || ""
            )
              .trim()
              .toLowerCase()
        )
      );

    totalAnime.textContent =
      uniqueTitles.size;
  }

  if (totalEpisodes) {

    let count = 0;

    list.forEach(
      anime => {

        if (
          Array.isArray(
            anime.episodes
          ) &&
          anime.episodes.length
        ) {

          count +=
            anime.episodes.length;

        } else {

          count += 1;
        }
      }
    );

    totalEpisodes.textContent =
      count;
  }
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
              )
                .toLowerCase();

            const category =
              String(
                anime.category || ""
              )
                .toLowerCase();

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

function displayAdminAnime(list) {

  if (!adminList) {
    return;
  }

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

      const editBtn =
        item.querySelector(
          ".edit-btn"
        );

            if (editBtn) {
        editBtn.addEventListener(
          "click",
          () => {
            editAnime(anime);
          }
        );
      }

      const episodeBtn =
        item.querySelector(".episode-btn");

      if (episodeBtn) {
        episodeBtn.addEventListener(
          "click",
          () => {
            prepareNewEpisode(anime);
          }
        );
      }

      const deleteBtn =
        item.querySelector(".delete-btn");

      if (deleteBtn) {
        deleteBtn.addEventListener(
          "click",
          () => {
            deleteAnime(anime.id);
          }
        );
      }

      adminList.appendChild(item);
    }
  );
}


// ===============================
// START ADMIN PAGE
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    checkStatus();
  }
);
