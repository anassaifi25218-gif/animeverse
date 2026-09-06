        import express from "express";
import session from "express-session";
import multer from "multer";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "change-this-password";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "replace-this-secret";

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(__dirname, "anime.db"));


// ===============================
// DATABASE
// ===============================

db.exec(`
  CREATE TABLE IF NOT EXISTS anime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Anime',
    poster TEXT,
    video TEXT NOT NULL,
    episode INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);


// अगर anime.db पहले से बना हुआ है,
// तो उसमें episode column automatically add होगा.
try {
  db.exec(`
    ALTER TABLE anime
    ADD COLUMN episode INTEGER DEFAULT 1
  `);
} catch (error) {
  if (!error.message.includes("duplicate column name")) {
    throw error;
  }
}


// ===============================
// MULTER UPLOAD
// ===============================

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 1024 * 1024 * 1024
  },

  fileFilter: (_req, file, cb) => {

    if (file.fieldname === "video") {

      if (!/\.(mp4|webm|ogg)$/i.test(file.originalname)) {
        return cb(
          new Error("Video must be MP4, WEBM or OGG")
        );
      }

      return cb(null, true);
    }

    if (file.fieldname === "poster") {

      if (!/\.(jpg|jpeg|png|webp)$/i.test(file.originalname)) {
        return cb(
          new Error("Poster must be JPG, JPEG, PNG or WEBP")
        );
      }

      return cb(null, true);
    }

    cb(new Error("Unexpected file field"));
  }
});


// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

  res.status(401).json({
    error: "Admin login required"
  });
}


// ===============================
// STATIC UPLOAD FILES
// ===============================

app.use(
  "/uploads",
  express.static(uploadDir)
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

app.get("/api/anime", (_req, res) => {

  try {

    const anime = db.prepare(`
      SELECT
        id,
        title,
        description,
        category,
        poster,
        video,
        episode,
        created_at
      FROM anime
      ORDER BY id DESC
    `).all();

    console.log(
      "API /api/anime:",
      anime
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
});


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
// UPLOAD ANIME
// ===============================

app.post(
  "/api/admin/anime",
  adminOnly,

  upload.fields([
    {
      name: "video",
      maxCount: 1
    },
    {
      name: "poster",
      maxCount: 1
    }
  ]),

  (req, res) => {

    console.log(
      "Anime upload request received"
    );

    try {

      const video =
        req.files?.video?.[0];

      const poster =
        req.files?.poster?.[0];


      // Video check
      if (!video) {

        return res.status(400).json({
          error: "Video is required"
        });
      }


      // Title
      const title =
        String(
          req.body.title || ""
        ).trim();

      if (!title) {

        return res.status(400).json({
          error: "Title is required"
        });
      }


      // Episode number
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


      // Video path
      const videoPath =
        `/uploads/${video.filename}`;


      // Poster path
      const posterPath =
        poster
          ? `/uploads/${poster.filename}`
          : null;


      // Save to database
      const info = db
        .prepare(`
          INSERT INTO anime
          (
            title,
            description,
            category,
            poster,
            video,
            episode
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(

          title,

          String(
            req.body.description || ""
          ),

          String(
            req.body.category || "Anime"
          ),

          posterPath,

          videoPath,

          episode
        );


      console.log(
        "Anime uploaded:",
        title,
        "Episode:",
        episode
      );


      res.json({

        ok: true,

        id: info.lastInsertRowid,

        episode: episode
      });

    } catch (error) {

      console.error(
        "UPLOAD ERROR:",
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
// ADMIN LOGOUT
// ===============================

app.post(
  "/api/admin/logout",
  adminOnly,

  (req, res) => {

    req.session.destroy(() => {

      res.json({
        ok: true
      });

    });
  }
);


// ===============================
// DELETE ANIME
// ===============================

app.delete(
  "/api/admin/anime/:id",
  adminOnly,

  (req, res) => {

    try {

      const item = db
        .prepare(
          "SELECT poster, video FROM anime WHERE id=?"
        )
        .get(req.params.id);


      if (!item) {

        return res.status(404).json({
          error: "Not found"
        });
      }


      // Delete uploaded files
      for (
        const filePath of [
          item.poster,
          item.video
        ]
      ) {

        if (filePath) {

          const file =
            path.join(
              __dirname,
              filePath.replace(
                /^\/uploads\//,
                "uploads/"
              )
            );


          if (
            fs.existsSync(file)
          ) {

            fs.unlinkSync(file);

          }
        }
      }


      // Delete database record
      db.prepare(
        "DELETE FROM anime WHERE id=?"
      ).run(req.params.id);


      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        "DELETE ERROR:",
        error
      );

      res.status(500).json({
        error: error.message
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
        "Upload failed"

    });
  }
);


// ===============================
// START SERVER
// ===============================

app.listen(
  PORT,
  () => {

    console.log(
      `Anime site running on port ${PORT}`
    );

  }
);
