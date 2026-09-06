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

db.exec(`
  CREATE TABLE IF NOT EXISTS anime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Anime',
    poster TEXT,
    video TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

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
        return cb(new Error("Video must be MP4, WEBM or OGG"));
      }

      return cb(null, true);
    }

    if (file.fieldname === "poster") {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(file.originalname)) {
        return cb(new Error("Poster must be JPG, JPEG, PNG or WEBP"));
      }

      return cb(null, true);
    }

    cb(new Error("Unexpected file field"));
  }
});

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

function adminOnly(req, res, next) {
  if (req.session?.isAdmin) {
    return next();
  }

  res.status(401).json({
    error: "Admin login required"
  });
}

app.use("/uploads", express.static(uploadDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/index.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/watch.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "watch.html"));
});

app.get("/admin.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/style.css", (_req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/admin.js", (_req, res) => {
  res.sendFile(path.join(__dirname, "admin.js"));
});

app.get("/api/anime", (_req, res) => {
  const anime = db
    .prepare(
      `SELECT id,title,description,category,poster,video,created_at
       FROM anime
       ORDER BY id DESC`
    )
    .all();

  res.json(anime);
});

app.post("/api/admin/login", (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: "Wrong password"
    });
  }

  req.session.isAdmin = true;

  res.json({
    ok: true
  });
});

app.get("/api/admin/status", (req, res) => {
  res.json({
    isAdmin: !!req.session?.isAdmin
  });
});

app.post(
  "/api/admin/anime",
  adminOnly,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "poster", maxCount: 1 }
  ]),
  (req, res) => {
    console.log("Anime upload request received");

    try {
      const video = req.files?.video?.[0];
      const poster = req.files?.poster?.[0];

      if (!video) {
        return res.status(400).json({
          error: "Video is required"
        });
      }

      const title = String(req.body.title || "").trim();

      if (!title) {
        return res.status(400).json({
          error: "Title is required"
        });
      }

      const videoPath = `/uploads/${video.filename}`;

      const posterPath = poster
        ? `/uploads/${poster.filename}`
        : null;

      const info = db
        .prepare(
          `INSERT INTO anime
           (title, description, category, poster, video)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          title,
          String(req.body.description || ""),
          String(req.body.category || "Anime"),
          posterPath,
          videoPath
        );

      console.log("Anime uploaded:", title);

      res.json({
        ok: true,
        id: info.lastInsertRowid
      });

    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      res.status(500).json({
        error: error.message || "Upload failed"
      });
    }
  }
);

app.post("/api/admin/logout", adminOnly, (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

app.delete("/api/admin/anime/:id", adminOnly, (req, res) => {
  const item = db
    .prepare("SELECT poster,video FROM anime WHERE id=?")
    .get(req.params.id);

  if (!item) {
    return res.status(404).json({
      error: "Not found"
    });
  }

  for (const filePath of [item.poster, item.video]) {
    if (filePath) {
      const file = path.join(
        __dirname,
        filePath.replace(/^\/uploads\//, "uploads/")
      );

      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  }

  db.prepare("DELETE FROM anime WHERE id=?").run(req.params.id);

  res.json({
    ok: true
  });
});

app.use((err, _req, res, _next) => {
  console.error("SERVER ERROR:", err);

  res.status(400).json({
    error: err.message || "Upload failed"
  });
});

app.listen(PORT, () => {
  console.log(`Anime site running on port ${PORT}`);
});
