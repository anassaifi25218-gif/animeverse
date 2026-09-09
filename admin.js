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

function clearUploadState() {
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

function showDashboard() {
if (!loginBox || !dashboard) {
console.error(
"LOGIN BOX or DASHBOARD element not found."
);
return;
}

loginBox.hidden = true;
loginBox.style.display = "none";

dashboard.hidden = false;
dashboard.style.display = "block";

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

clearUploadState();
}

// ===============================
// LOGIN STATUS
// ===============================

async function checkStatus() {
try {
const res = await fetch(
"/api/admin/status?t=" + Date.now(),
{
method: "GET",
credentials: "same-origin",
cache: "no-store"
}
);

if (!res.ok) {
  showLogin();
  return;
}

const data = await res.json();

console.log(
  "ADMIN STATUS:",
  data
);

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
    document.getElementById(
      "password"
    );

  const password =
    passwordInput
      ? passwordInput.value
      : "";

  if (!password) {
    if (loginMsg) {
      loginMsg.textContent =
        "Password enter karo.";
    }
    return;
  }

  try {
    const res = await fetch(
      "/api/admin/login",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        credentials:
          "same-origin",

        cache:
          "no-store",

        body:
          JSON.stringify({
            password
          })
      }
    );

    let data = {};

    try {
      data =
        await res.json();
    } catch {
      data = {};
    }

    console.log(
      "LOGIN RESPONSE:",
      res.status,
      data
    );

    if (!res.ok) {
      if (loginMsg) {
        loginMsg.textContent =
          data.error ||
          "Login failed";
      }
      return;
    }

    /*
     * Login successful.
     * First verify that the server
     * actually sees the session.
     */

    const statusRes =
      await fetch(
        "/api/admin/status?t=" +
          Date.now(),
        {
          method: "GET",
          credentials:
            "same-origin",
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

    console.log(
      "STATUS AFTER LOGIN:",
      statusData
    );

    if (
      statusRes.ok &&
      statusData.isAdmin === true
    ) {
      loginForm.reset();

      if (loginMsg) {
        loginMsg.textContent = "";
      }

      showDashboard();

    } else {
      if (loginMsg) {
        loginMsg.textContent =
          "Login hua, lekin session save nahi hua. Page refresh karke dobara try karo.";
      }
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
const res =
await fetch(
"/api/admin/logout",
{
method: "POST",

          credentials:
            "same-origin",

          cache:
            "no-store"
        }
      );

    console.log(
      "LOGOUT STATUS:",
      res.status
    );

  } catch (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );
  }

  showLogin();

  if (loginMsg) {
    loginMsg.textContent =
      "Logged out.";
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
      "same-origin",

    cache:
      "no-store",

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
data =
await res.json();
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
// SAVE ANIME
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
// LOAD ANIME
// ===============================

async function loadAnime() {
try {
const res =
await fetch(
"/api/anime?t=" +
Date.now(),
{
method: "GET",

      cache:
        "no-store",

      credentials:
        "same-origin"
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

if (adminList) {
  adminList.innerHTML =
    "<p class='msg'>Unable to load anime.</p>";
}

}
}

// ===============================
// STATS
// ===============================

function updateStats(
list
) {
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

if (totalAnime) {
totalAnime.textContent =
uniqueTitles.size;
}

if (totalEpisodes) {
totalEpisodes.textContent =
list.length;
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
        editAnime(
          anime
        );
      }
    );
  }

  const episodeBtn =
    item.querySelector(
      ".episode-btn"
    );

  if (episodeBtn) {
    episodeBtn.addEventListener(
      "click",
      () => {
        prepareNewEpisode(
          anime
        );
      }
    );
  }

  const deleteBtn =
    item.querySelector(
      ".delete-btn"
    );

  if (deleteBtn) {
    deleteBtn.addEventListener(
      "click",
      () => {
        deleteAnime(
          anime.id
        );
      }
    );
  }

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

if (uploadMsg) {
uploadMsg.textContent =
"Saving changes...";
}

try {
const res =
await fetch(
"/api/admin/anime/${anime.id}",
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

let data = {};

try {
  data =
    await res.json();
} catch {
  data = {};
}

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

if (uploadMsg) {
  uploadMsg.textContent =
    "✅ Anime updated successfully!";
}

await loadAnime();

} catch (error) {
console.error(
"EDIT ERROR:",
error
);

if (uploadMsg) {
  uploadMsg.textContent =
    "Edit error: " +
    error.message;
}

}
}

// ===============================
// NEW EPISODE
// ===============================

function prepareNewEpisode(
anime
) {
selectedAnimeId =
anime.id;

const titleInput =
document.getElementById(
"title"
);

const descriptionInput =
document.getElementById(
"description"
);

const categoryInput =
document.getElementById(
"category"
);

const episodeInput =
document.getElementById(
"episode"
);

if (titleInput) {
titleInput.value =
anime.title || "";
}

if (descriptionInput) {
descriptionInput.value =
anime.description || "";
}

if (categoryInput) {
categoryInput.value =
anime.category ||
"Anime";
}

let nextEpisode =
Number(
anime.episode || 0
) + 1;

if (
Array.isArray(
anime.episodes
)
) {
const numbers =
anime.episodes
.map(
item =>
Number(
item.episode
)
)
.filter(
Number.isFinite
);

if (numbers.length) {
  nextEpisode =
    Math.max(
      ...numbers
    ) + 1;
}

}

if (episodeInput) {
episodeInput.value =
nextEpisode;
}

if (uploadMsg) {
uploadMsg.textContent =
"Episode ${nextEpisode} ke liye video upload karo.";
}

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
"Delete "${anime.title}" Episode ${ anime.episode || 1 }?\n\nVideo aur poster bhi Cloudinary se delete ho sakte hain."
);

if (!confirmed) {
return;
}

try {
const res =
await fetch(
"/api/admin/anime/${id}",
{
method: "DELETE",

      credentials:
        "same-origin",

      cache:
        "no-store"
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

let data = {};

try {
  data =
    await res.json();
} catch {
  data = {};
}

if (!res.ok) {
  alert(
    data.error ||
    "Delete failed"
  );

  return;
}

if (uploadMsg) {
  uploadMsg.textContent =
    "✅ Anime deleted.";
}

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
// ESCAPE HTML
// ===============================

function escapeHtml(s) {
return String(
s || ""
).replace(
/[&<>"']/g,
c =>
({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'
