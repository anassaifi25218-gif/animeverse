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


async function checkStatus() {

  try {

    const res =
      await fetch(
        "/api/admin/status"
      );

    const data =
      await res.json();

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

      const res =
        await fetch(
          "/api/admin/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

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

    } catch (e) {

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

        body:
          JSON.stringify({
            resource_type:
              resourceType
          })
      }
    );


  const signData =
    await signRes.json();


  if (!signRes.ok) {

    throw new Error(
      signData.error ||
      "Unable to start upload"
    );

  }


  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${signData.cloud_name}/${resourceType}/upload`;


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


  const uploadRes =
    await fetch(
      uploadUrl,
      {
        method: "POST",
        body: cloudinaryForm
      }
    );


  const uploadData =
    await uploadRes.json();


  if (!uploadRes.ok) {

    throw new Error(
      uploadData.error?.message ||
      "Cloudinary upload failed"
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

    await fetch(
      "/api/admin/logout",
      {
        method: "POST"
      }
    );

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
      // VIDEO DIRECT CLOUDINARY
      // ===============================

      uploadMsg.textContent =
        "Uploading video...";


      const videoResult =
        await uploadToCloudinary(
          videoFile,
          "video"
        );


      // ===============================
      // POSTER DIRECT CLOUDINARY
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
      // SAVE DATA TO SERVER
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
        "/api/anime"
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


    const data =
      await res.json();


    if (!res.ok) {

      alert(
        data.error ||
        "Delete failed"
      );

      return;

    }


    loadAnime();


  } catch (e) {

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
