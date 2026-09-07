const loginForm = document.getElementById("loginForm");
const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginMsg = document.getElementById("loginMsg");
const uploadForm = document.getElementById("uploadForm");
const uploadMsg = document.getElementById("uploadMsg");
const logoutBtn = document.getElementById("logout");
const adminList = document.getElementById("adminList");


// ===============================
// SHOW LOGIN / DASHBOARD
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
// CHECK LOGIN STATUS
// ===============================

async function checkStatus() {
  try {
    const res = await fetch("/api/admin/status", {
      credentials: "same-origin",
      cache: "no-store"
    });

    const data = await res.json();

    if (data.isAdmin) {
      showDashboard();
    } else {
      showLogin();
    }

  } catch (error) {
    console.error("STATUS ERROR:", error);
    loginMsg.textContent = "Server connection error";
  }
}


// ===============================
// LOGIN
// ===============================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginMsg.textContent = "Logging in...";

  const password =
    document.getElementById("password").value;

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        password: password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      loginMsg.textContent =
        data.error || "Login failed";
      return;
    }

    loginForm.reset();
    loginMsg.textContent = "";

    showDashboard();

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    loginMsg.textContent =
      "Server connection error";
  }
});


// ===============================
// CLOUDINARY UPLOAD
// ===============================

async function uploadToCloudinary(file, resourceType) {

  if (!file) {
    throw new Error("File select nahi hui.");
  }

  // Server se signature lo
  const signRes = await fetch(
    "/api/admin/upload-signature",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      credentials: "same-origin",

      body: JSON.stringify({
        resource_type: resourceType
      })
    }
  );

  if (signRes.status === 401) {
    showLogin();

    throw new Error(
      "Session expire ho gaya. Dobara login karo."
    );
  }

  let signData;

  try {
    signData = await signRes.json();
  } catch {
    throw new Error(
      "Server se valid response nahi mila."
    );
  }

  if (!signRes.ok) {
    throw new Error(
      signData.error ||
      "Upload signature nahi mili."
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


  // Cloudinary URL
  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${signData.cloud_name}/${resourceType}/upload`;


  const form = new FormData();

  form.append("file", file);
  form.append("api_key", signData.api_key);
  form.append("timestamp", signData.timestamp);
  form.append("signature", signData.signature);
  form.append("folder", signData.folder);


  // XMLHttpRequest use kar rahe hain
  // taaki large video upload properly handle ho
  return await new Promise((resolve, reject) => {

    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      uploadUrl,
      true
    );


    // Upload progress
    xhr.upload.onprogress = (event) => {

      if (event.lengthComputable) {

        const percent =
          Math.round(
            (event.loaded / event.total) * 100
          );

        uploadMsg.textContent =
          `Uploading ${resourceType}... ${percent}%`;
      }
    };


    // Upload complete
    xhr.onload = () => {

      let data = {};

      try {
        data = JSON.parse(
          xhr.responseText
        );
      } catch {
        data = {};
      }


      if (
        xhr.status >= 200 &&
        xhr.status < 300
      ) {

        if (
          !data.secure_url ||
          !data.public_id
        ) {

          reject(
            new Error(
              "Cloudinary ne file URL nahi di."
            )
          );

          return;
        }

        resolve(data);
        return;
      }


      reject(
        new Error(
          data.error?.message ||
          `Cloudinary error (${xhr.status})`
        )
      );
    };


    // Network error
    xhr.onerror = () => {

      reject(
        new Error(
          "Cloudinary se connection nahi ho pa raha."
        )
      );
    };


    xhr.onabort = () => {

      reject(
        new Error(
          "Upload cancel ho gaya."
        )
      );
    };


    xhr.ontimeout = () => {

      reject(
        new Error(
          "Upload timeout ho gaya."
        )
      );
    };


    xhr.timeout = 0;

    xhr.send(form);
  });
}


// ===============================
// LOGOUT
// ===============================

logoutBtn.addEventListener("click", async () => {

  try {

    await fetch(
      "/api/admin/logout",
      {
        method: "POST",
        credentials: "same-origin"
      }
    );

  } catch (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );
  }

  showLogin();
});


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
      // VIDEO UPLOAD
      // ===============================

      uploadMsg.textContent =
        "Uploading video...";


      const videoResult =
        await uploadToCloudinary(
          videoFile,
          "video"
        );


      // ===============================
      // POSTER UPLOAD
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
      // SAVE ANIME DATA
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

    } catch (error) {

      console.error(
        "UPLOAD ERROR:",
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
          cache: "no-store"
        }
      );


    const list =
      await res.json();


    adminList.innerHTML = "";


    if (!Array.isArray(list) || !list.length) {

      adminList.innerHTML =
        "<p class='muted'>No anime uploaded yet.</p>";

      return;
    }


    list.forEach((anime) => {

      const item =
        document.createElement("div");

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


      adminList.appendChild(item);

    });

  } catch (error) {

    console.error(
      "LOAD ANIME ERROR:",
      error
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

  } catch (error) {

    console.error(
      "DELETE ERROR:",
      error
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
