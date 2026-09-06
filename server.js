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
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const SESSION_SECRET = process.env.SESSION_SECRET || "replace-this-secret";

fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });

const db = new Database(path.join(__dirname, "anime.db"));
db.pragma("journal_mode = WAL");
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
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (_req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB
  fileFilter: (_req, file, cb) => {
    const ok = file.fieldname === "video"
      ? /\.(mp4|webm|ogg)$/i.test(file.originalname)
      : /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    cb(ok ? null : new Error("Invalid file type"), ok);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 8 }
}));

function adminOnly(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: "Admin login required" });
}

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

app.get("/api/anime", (_req, res) => {
  res.json(db.prepare("SELECT id,title,description,category,poster,video,created_at FROM anime ORDER BY id DESC").all());
});

app.post("/api/admin/login", (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Wrong password" });
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post("/api/admin/logout", adminOnly, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/status", (req, res) => {
  res.json({ isAdmin: !!req.session?.isAdmin });
});

app.post("/api/admin/anime", adminOnly, upload.fields([
  { name: "video", maxCount: 1 },
  { name: "poster", maxCount: 1 }
]), (req, res) => {
  try {
    const video = req.files?.video?.[0];
    const poster = req.files?.poster?.[0];
    if (!video) return res.status(400).json({ error: "Video is required" });

    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Title is required" });

    const videoPath = `/uploads/${path.basename(video.filename)}`;
    const posterPath = poster ? `/uploads/${path.basename(poster.filename)}` : null;

    const info = db.prepare(`
      INSERT INTO anime (title,description,category,poster,video)
      VALUES (?,?,?,?,?)
    `).run(
      title,
      String(req.body.description || ""),
      String(req.body.category || "Anime"),
      posterPath,
      videoPath
    );

    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/anime/:id", adminOnly, (req, res) => {
  const item = db.prepare("SELECT poster,video FROM anime WHERE id=?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });

  for (const p of [item.poster, item.video]) {
    if (p) {
      const file = path.join(__dirname, p.replace(/^\/uploads\//, "uploads/"));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
  db.prepare("DELETE FROM anime WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, () => {
  console.log(`Anime site running at http://localhost:${PORT}`);
});
