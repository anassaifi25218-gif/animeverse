const loginForm = document.getElementById("loginForm");
const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginMsg = document.getElementById("loginMsg");
const uploadForm = document.getElementById("uploadForm");
const uploadMsg = document.getElementById("uploadMsg");
const logoutBtn = document.getElementById("logout");
const adminList = document.getElementById("adminList");

async function checkStatus() {
  try {
    const res = await fetch("/api/admin/status");
    const data = await res.json();

    if (data.isAdmin) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch (e) {
    loginMsg.textContent = "Server connection error";
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

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginMsg.textContent = "Logging in...";

  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (!res.ok) {
      loginMsg.textContent = data.error || "Login failed";
      return;
    }

    loginForm.reset();
    loginMsg.textContent = "";
    showDashboard();
  } catch (e) {
    loginMsg.textContent = "Server connection error";
  }
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/admin/logout", {
    method: "POST"
  });

  showLogin();
});

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  uploadMsg.textContent = "Uploading...";

  const formData = new FormData(uploadForm);

  try {
    const controller = new AbortController();

    // 10 minute timeout
    const timeout = setTimeout(() => {
      controller.abort();
    }, 10 * 60 * 1000);

    const res = await fetch("/api/admin/anime", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await res.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "Server ne JSON response nahi diya. Status: " + res.status
      );
    }

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Upload failed");
    }

    uploadMsg.textContent = "Anime uploaded successfully!";
    uploadForm.reset();

    await loadAnime();

  } catch (e) {
    if (e.name === "AbortError") {
      uploadMsg.textContent =
        "Upload timeout. Video bahut bada ho sakta hai ya server response nahi de raha.";
    } else {
      console.error("UPLOAD ERROR:", e);
      uploadMsg.textContent = "Upload error: " + e.message;
    }
  }
});

async function loadAnime() {
  try {
    const res = await fetch("/api/anime");
    const list = await res.json();

    adminList.innerHTML = "";

    if (!list.length) {
      adminList.innerHTML = "<p class='muted'>No anime uploaded yet.</p>";
      return;
    }

    list.forEach((anime) => {
      const item = document.createElement("div");
      item.className = "admin-anime";

      item.innerHTML = `
        <strong>${escapeHtml(anime.title)}</strong>
<span class="muted">
  Episode ${anime.episode || 1} • ${escapeHtml(anime.category || "Anime")}
</span>
<button class="secondary" data-id="${anime.id}">Delete</button>
      `;

      item.querySelector("button").addEventListener("click", () => {
        deleteAnime(anime.id);
      });

      adminList.appendChild(item);
    });
  } catch (e) {
    adminList.innerHTML = "<p class='msg'>Unable to load anime.</p>";
  }
}

async function deleteAnime(id) {
  if (!confirm("Delete this anime?")) return;

  try {
    const res = await fetch(`/api/admin/anime/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    loadAnime();
  } catch (e) {
    alert("Delete error");
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

checkStatus();
