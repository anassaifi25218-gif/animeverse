import express from "express";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "change-this-password";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "replace-this-secret";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const DATA_PUBLIC_ID = "animeverse/anime-data";

const tempDir = path.join(__dirname, "temp-uploads");
fs.mkdirSync(tempDir, { recursive: true });

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);


// ===============================
// ADMIN CHECK
// ===============================

function adminOnly(req, res, next) {
  if (req.session?.isAdmin) {
    return next();
  }

  return res.status(401).json({
    error: "Admin login required"
  });
}


// ===============================
// CLOUDINARY DATABASE
// ===============================

async function loadAnime() {
  try {
    const url = cloudinary.url(DATA_PUBLIC_ID, {
      resource_type: "raw",
      type: "upload",
      secure: true
    });

    const response = await fetch(
      `${url}?t=${Date.now()}`
    );

    if (!response.ok) {
      console.log(
        "Database HTTP error:",
        response.status
      );

      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data;

  } catch (error) {
    console.error(
      "LOAD DATABASE ERROR:",
      error.message
    );

    return [];
  }
}


async function saveAnime(anime) {
  const tempFile = path.join(
    tempDir,
    "anime-data.json"
  );

  fs.writeFileSync(
    tempFile,
    JSON.stringify(anime, null, 2)
  );

  await new Promise((resolve, reject) => {

    cloudinary.uploader.upload(
      tempFile,
      {
        resource_type: "raw",
        type: "upload",
        public_id: DATA_PUBLIC_ID,
        overwrite: true
      },

      (error, result) => {

        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

  });

  try {
    fs.unlinkSync(tempFile);
  } catch {}
}


// ===============================
// CLOUDINARY SIGNATURE
// ===============================

app.post(
  "/api/admin/upload-signature",
  adminOnly,
  (req, res) => {

    try {

      const resourceType =
        req.body.resource_type === "image"
          ? "image"
          : "video";

      const timestamp =
        Math.floor(Date.now() / 1000);

      const folder =
        resourceType === "video"
          ? "animeverse/videos"
          : "animeverse/posters";

      const paramsToSign = {
        folder,
        timestamp
      };

      const signature =
        cloudinary.utils.api_sign_request(
          paramsToSign,
          process.env.CLOUDINARY_API_SECRET
        );

      res.json({
        ok: true,
        signature,
        timestamp,
        folder,
        cloud_name:
          process.env.CLOUDINARY_CLOUD_NAME,
        api_key:
          process.env.CLOUDINARY_API_KEY
      });

    } catch (error) {

      console.error(
        "SIGNATURE ERROR:",
        error
      );

      res.status(500).json({
        error: error.message
      });
    }
  }
);


// ===============================
// HTML FILES
// ===============================

app.get("/", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.get("/index.html", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.get("/watch.html", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "watch.html")
  );
});

app.get("/admin.html", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "admin.html")
  );
});

app.get("/style.css", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "style.css")
  );
});

app.get("/admin.js", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "admin.js")
  );
});

app.get("/app.js", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "app.js")
  );
});


// ===============================
// GET ALL ANIME
// ===============================

app.get(
  "/api/anime",
  async (_req, res) => {

    try {

      const anime =
        await loadAnime();

      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );

      res.json(anime);

    } catch (error) {

      console.error(
        "ANIME API ERROR:",
        error
      );

      res.status(500).json({
        error: error.message
      });
    }
  }
);


// ===============================
// ADMIN LOGIN
// ===============================

app.post(
  "/api/admin/login",
  (req, res) => {

    if (
      req.body.password !==
      ADMIN_PASSWORD
    ) {

      return res.status(401).json({
        error: "Wrong password"
      });
    }

    req.session.isAdmin = true;

    res.json({
      ok: true
    });
  }
);


// ===============================
// ADMIN STATUS
// ===============================

app.get(
  "/api/admin/status",
  (req, res) => {

    res.json({
      isAdmin:
        !!req.session?.isAdmin
    });
  }
);


// ===============================
// SAVE NEW ANIME / EPISODE
// ===============================

app.post(
  "/api/admin/anime",
  adminOnly,
  async (req, res) => {

    try {

      const title =
        String(
          req.body.title || ""
        ).trim();

      if (!title) {

        return res.status(400).json({
          error: "Title is required"
        });
      }


      const video =
        req.body.video;

      if (
        !video ||
        !video.secure_url ||
        !video.public_id
      ) {

        return res.status(400).json({
          error:
            "Video upload is required"
        });
      }


      let episode =
        Number(
          req.body.episode || 1
        );

      if (
        !Number.isInteger(episode) ||
        episode < 1
      ) {

        episode = 1;
      }


      const poster =
        req.body.poster || null;


      const anime =
        await loadAnime();


      const newAnime = {

        id: Date.now(),

        title,

        description:
          String(
            req.body.description || ""
          ),

        category:
          String(
            req.body.category ||
            "Anime"
          ),

        poster:
          poster?.secure_url || null,

        video:
          video.secure_url,

        episode,

        created_at:
          new Date().toISOString(),

        video_public_id:
          video.public_id,

        poster_public_id:
          poster?.public_id || null
      };


      anime.unshift(newAnime);

      await saveAnime(anime);


      console.log(
        "Anime saved:",
        title,
        "Episode:",
        episode
      );


      res.json({
        ok: true,
        id: newAnime.id,
        episode
      });

    } catch (error) {

      console.error(
        "SAVE ANIME ERROR:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Upload failed"
      });
    }
  }
);


// ===============================
// EDIT ANIME
// ===============================

app.put(
  "/api/admin/anime/:id",
  adminOnly,
  async (req, res) => {

    try {

      const anime =
        await loadAnime();

      const index =
        anime.findIndex(
          item =>
            String(item.id) ===
            String(req.params.id)
        );

      if (index === -1) {

        return res.status(404).json({
          error: "Anime not found"
        });
      }


      const item =
        anime[index];


      const title =
        String(
          req.body.title || item.title
        ).trim();


      if (!title) {

        return res.status(400).json({
          error: "Title is required"
        });
      }


      let episode =
        Number(
          req.body.episode ||
          item.episode ||
          1
        );


      if (
        !Number.isInteger(episode) ||
        episode < 1
      ) {

        episode =
          item.episode || 1;
      }


      item.title = title;

      item.description =
        String(
          req.body.description ??
          item.description ??
          ""
        );

      item.category =
        String(
          req.body.category ??
          item.category ??
          "Anime"
        );

      item.episode = episode;


      await saveAnime(anime);


      res.json({
        ok: true,
        anime: item
      });

    } catch (error) {

      console.error(
        "EDIT ERROR:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Edit failed"
      });
    }
  }
);


// ===============================
// DELETE CLOUDINARY FILE
// ===============================

async function deleteCloudinaryFile(
  publicId,
  resourceType
) {

  if (!publicId) {
    return;
  }

  try {

    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type:
          resourceType,
        type: "upload"
      }
    );

  } catch (error) {

    console.error(
      "CLOUDINARY DELETE ERROR:",
      error
    );
  }
}


// ===============================
// DELETE ANIME
// ===============================

app.delete(
  "/api/admin/anime/:id",
  adminOnly,
  async (req, res) => {

    try {

      const anime =
        await loadAnime();


      const index =
        anime.findIndex(
          item =>
            String(item.id) ===
            String(req.params.id)
        );


      if (index === -1) {

        return res.status(404).json({
          error: "Not found"
        });
      }


      const item =
        anime[index];


      if (
        item.video_public_id
      ) {

        await deleteCloudinaryFile(
          item.video_public_id,
          "video"
        );
      }


      if (
        item.poster_public_id
      ) {

        await deleteCloudinaryFile(
          item.poster_public_id,
          "image"
        );
      }


      anime.splice(index, 1);

      await saveAnime(anime);


      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        "DELETE ERROR:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });
    }
  }
);


// ===============================
// ERROR HANDLER
// ===============================

app.use(
  (err, _req, res, _next) => {

    console.error(
      "SERVER ERROR:",
      err
    );

    res.status(400).json({
      error:
        err.message ||
        "Request failed"
    });
  }
);


// ===============================
// START
// ===============================

app.listen(
  PORT,
  () => {

    console.log(
      `Anime site running on port ${PORT}`
    );

  }
);
