const loginForm = document.getElementById("loginForm");
const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginMsg = document.getElementById("loginMsg");

const uploadForm = document.getElementById("uploadForm");
const uploadMsg = document.getElementById("uploadMsg");

const logoutBtn = document.getElementById("logout");
const adminList = document.getElementById("adminList");

const videoUploadBtn =
  document.getElementById("videoUploadBtn");

const posterUploadBtn =
  document.getElementById("posterUploadBtn");

const videoStatus =
  document.getElementById("videoStatus");

const posterStatus =
  document.getElementById("posterStatus");


const CLOUDINARY_UPLOAD_PRESET =
  "animeverse_upload";


let uploadedVideo = null;
let uploadedPoster = null;


// ===============================
// LOGIN STATUS
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

    const data = await res.json();

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
// GET CLOUDINARY CONFIG
// ===============================

async function getCloudinaryConfig() {

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
            resource_type: "video"
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


  if (!data.cloud_name) {

    throw new Error(
      "Cloudinary Cloud Name missing hai."
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
    await getCloudinaryConfig();


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
              result.event === "upload-added"
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
// VIDEO BUTTON
// ===============================

videoUploadBtn.addEventListener(
  "click",
  async () => {

    try {

      videoUploadBtn.disabled =
        true;

      videoStatus.textContent =
        "Cloudinary upload open ho raha hai...";


      const result =
        await openCloudinaryWidget(
          "video"
        );


      uploadedVideo = result;


      videoStatus.textContent =
        "✅ Video uploaded";


      uploadMsg.textContent =
        "Video ready. Ab poster select kar sakte ho.";

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
// POSTER BUTTON
// ===============================

posterUploadBtn.addEventListener(
  "click",
  async () => {

    try {

      posterUploadBtn.disabled =
        true;

      posterStatus.textContent =
        "Cloudinary upload open ho raha hai...";


      const result =
        await openCloudinaryWidget(
          "image"
        );


      uploadedPoster = result;


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

    } catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );
    }


    uploadedVideo = null;
    uploadedPoster = null;

    showLogin();
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
        "Pehle Video select karo.";

      return;
    }


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
        saveRes.status ===
        401
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
        "✅ Anime uploaded successfully!";


      uploadForm.reset();


      uploadedVideo = null;
      uploadedPoster = null;


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
          cache: "no-store"
        }
      );


    const list =
      await res.json();


    adminList.innerHTML = "";


    if (
      !Array.isArray(list) ||
      !list.length
    ) {

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
            ${escapeHtml(
              anime.title
            )}
          </strong>

          <span class="muted">
            Episode ${anime.episode || 1}
            •
            ${escapeHtml(
              anime.category ||
              "Anime"
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


    if (
      res.status ===
      401
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
