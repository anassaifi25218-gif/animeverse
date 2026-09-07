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


// ===============================
// STATUS
// ===============================

async function checkStatus() {
  try {
    const res = await fetch(
      "/api/admin/status",
      {
        credentials: "same-origin",
        cache: "no-store"
      }
    );

    if (!res.ok) {
      showLogin();
      return;
    }

    const data = await res.json();

    if (data.isAdmin) {
      showDashboard();
    } else {
      showLogin();
    }

  } catch (e) {
    loginMsg.textContent =
      "Server connection error";
  }
}


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

          body: JSON.stringify({
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

    } catch (e) {

      console.error(
        "LOGIN ERROR:",
        e
      );

      loginMsg.textContent =
        "Server connection error";

    }
  }
);


// ===============================
// CLOUDINARY UPLOAD
// ===============================

async function uploadToCloudinary(
  file,
  resourceType
) {

  if (!file) {
    throw new Error(
      "File select nahi hui"
    );
  }

  // Get signed upload information
  const signRes =
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

        body: JSON.stringify({
          resource_type:
            resourceType
        })
      }
    );


  // Login/session expired
  if (signRes.status === 401) {

    showLogin();

    throw new Error(
      "Session expire ho gaya. Dobara login karo."
    );
  }


  const signData =
    await signRes.json();


  if (!signRes.ok) {

    throw new Error(
      signData.error ||
      "Unable to start upload"
    );
  }


  if (
    !signData.cloud_name ||
    !signData.api_key ||
    !signData.signature ||
    !signData.timestamp ||
    !signData.folder
  ) {

    throw new Error(
      "Cloudinary configuration incomplete hai."
    );
  }


  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      signData.cloud_name
    )}/${resourceType}/upload`;


  const cloudinaryForm =
    new FormData();

  cloudinaryForm.append(
    "file",
    file
  );

  cloudinaryForm.append(
    "api_key",
    signData.api_key
  );

  cloudinaryForm.append(
    "timestamp",
    signData.timestamp
  );

  cloudinaryForm.append(
    "signature",
    signData.signature
  );

  cloudinaryForm.append(
    "folder",
    signData.folder
  );


  let uploadRes;

  try {

    uploadRes = await fetch(
      uploadUrl,
      {
        method: "POST",
        body: cloudinaryForm
      }
    );

  } catch (error) {

    console.error(
      "CLOUDINARY FETCH ERROR:",
      error
    );

    throw new Error(
      "Cloudinary se connection nahi ho pa raha. Internet check karo."
    );
  }


  let uploadData = {};

  try {
    uploadData =
      await uploadRes.json();
  } catch {
    uploadData = {};
  }


  if (!uploadRes.ok) {

    throw new Error(
      uploadData.error?.message ||
      "Cloudinary upload failed"
    );
  }


  if (
    !uploadData.secure_url ||
    !uploadData.public_id
  ) {

    throw new Error(
      "Cloudinary ne upload URL return nahi kiya."
    );
  }


  return uploadData;
}


// ===============================
// LOGOUT
// ===============================

logoutBtn.addEventListener(
  "click",
  async () => {

    try {

      await fetch(
        "/api/admin/logout",
        {
          method: "POST",
          credentials:
            "same-origin"
        }
      );

    } catch {}

    showLogin();
  }
);


// ===============================
// UPLOAD ANIME
// ===============================

uploadForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    uploadMsg.textContent =
      "Starting upload...";


    const videoInput =
      uploadForm.querySelector(
        '[name="video"]'
      );

    const posterInput =
      uploadForm.querySelector(
        '[name="poster"]'
      );


    const videoFile =
      videoInput?.files?.[0];

    const posterFile =
      posterInput?.files?.[0];


    if (!videoFile) {

      uploadMsg.textContent =
        "Video select karo.";

      return;
    }


    try {

      // ===============================
      // VIDEO
      // ===============================

      uploadMsg.textContent =
        "Uploading video...";


      const videoResult =
        await uploadToCloudinary(
          videoFile,
          "video"
        );


      // ===============================
      // POSTER
      // ===============================

      let posterResult = null;


      if (posterFile) {

        uploadMsg.textContent =
          "Uploading poster...";


        posterResult =
          await uploadToCloudinary(
            posterFile,
            "image"
          );
      }


      // ===============================
      // SAVE DATA
      // ===============================

      uploadMsg.textContent =
        "Saving anime information...";


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

        video: {

          secure_url:
            videoResult.secure_url,

          public_id:
            videoResult.public_id

        },

        poster:
          posterResult
            ? {

                secure_url:
                  posterResult.secure_url,

                public_id:
                  posterResult.public_id

              }
            : null
      };


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


      if (saveRes.status === 401) {

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
        "Anime uploaded successfully!";

      uploadForm.reset();

      await loadAnime();

    } catch (e) {

      console.error(
        "UPLOAD ERROR:",
        e
      );

      uploadMsg.textContent =
        "Upload error: " +
        e.message;
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
          cache: "no-store"
        }
      );

    const list =
      await res.json();


    adminList.innerHTML = "";


    if (!list.length) {

      adminList.innerHTML =
        "<p class='muted'>No anime uploaded yet.</p>";

      return;
    }


    list.forEach(
      (anime) => {

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "admin-anime";


        item.innerHTML = `
          <strong>
            ${escapeHtml(anime.title)}
          </strong>

          <span class="muted">
            Episode ${anime.episode || 1}
            •
            ${escapeHtml(
              anime.category || "Anime"
            )}
          </span>

          <button
            class="secondary"
            data-id="${anime.id}"
          >
            Delete
          </button>
        `;


        item
          .querySelector("button")
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

  } catch (e) {

    console.error(
      "LOAD ANIME ERROR:",
      e
    );

    adminList.innerHTML =
      "<p class='msg'>Unable to load anime.</p>";
  }
}


// ===============================
// DELETE ANIME
// ===============================

async function deleteAnime(id) {

  if (
    !confirm(
      "Delete this anime?"
    )
  ) {
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


    if (res.status === 401) {

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


    await loadAnime();

  } catch (e) {

    console.error(
      "DELETE ERROR:",
      e
    );

    alert(
      "Delete error"
    );
  }
}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(s) {

  return String(s).replace(
    /[&<>"']/g,
    (c) => ({

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
