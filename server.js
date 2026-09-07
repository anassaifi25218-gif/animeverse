import express from "express";
import session from "express-session";
import multer from "multer";
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


// ===============================
// CLOUDINARY
// ===============================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// ===============================
// TEMPORARY UPLOAD FOLDER
// ===============================

const tempDir = path.join(__dirname, "temp-uploads");

fs.mkdirSync(tempDir, {
  recursive: true
});


// ===============================
// MULTER
// ===============================

const storage = multer.diskStorage({

  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },

  filename: (_req, file, cb) => {

    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(
      null,
      `${Date.now()}-${safeName}`
    );
  }

});


const upload = multer({

  storage,

  limits: {
    fileSize: 1024 * 1024 * 1024
  },

  fileFilter: (_req, file, cb) => {

    if (file.fieldname === "video") {

      if (
        !/\.(mp4|webm|ogg)$/i.test(
          file.originalname
        )
      ) {

        return cb(
          new Error(
            "Video must be MP4, WEBM or OGG"
          )
        );

      }

      return cb(null, true);
    }


    if (file.fieldname === "poster") {

      if (
        !/\.(jpg|jpeg|png|webp)$/i.test(
          file.originalname
        )
      ) {

        return cb(
          new Error(
            "Poster must be JPG, JPEG, PNG or WEBP"
          )
        );

      }

      return cb(null, true);
    }


    cb(
      new Error(
        "Unexpected file field"
      )
    );

  }

});


// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
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

      maxAge:
        1000 *
        60 *
        60 *
        8

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
// CLOUDINARY DATABASE
// ===============================

const DATA_PUBLIC_ID =
  "animeverse/anime-data";


// Load anime data from Cloudinary
async function loadAnime() {

  try {

    const url =
      cloudinary.url(
        DATA_PUBLIC_ID,
        {
          resource_type: "raw",
          type: "upload",
          secure: true
        }
      );

    const response =
      await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data;

  } catch (error) {

    console.log(
      "No existing Cloudinary database found."
    );

    return [];

  }

}


// Save anime data to Cloudinary
async function saveAnime(anime) {

  const tempFile =
    path.join(
      tempDir,
      "anime-data.json"
    );


  fs.writeFileSync(
    tempFile,
    JSON.stringify(
      anime,
      null,
      2
    )
  );


  await new Promise(
    (resolve, reject) => {

      cloudinary.uploader.upload(
        tempFile,
        {

          resource_type: "raw",

          type: "upload",

          public_id:
            DATA_PUBLIC_ID,

          overwrite: true

        },

        (error, result) => {

          if (error) {

            return reject(error);

          }

          resolve(result);

        }

      );

    }
  );


  try {

    fs.unlinkSync(
      tempFile
    );

  } catch {}

}


// ===============================
// CLOUDINARY VIDEO UPLOAD
// ===============================

async function uploadVideo(filePath) {

  return new Promise(
    (resolve, reject) => {

      console.log(
        "Starting Cloudinary video upload..."
      );

      cloudinary.uploader.upload_large(
        filePath,
        {

          resource_type: "video",

          folder:
            "animeverse/videos",

          chunk_size:
            20 * 1024 * 1024

        },

        (error, result) => {

          if (error) {

            console.error(
              "CLOUDINARY VIDEO ERROR:",
              error
            );

            return reject(
              error
            );

          }

          console.log(
            "Cloudinary video upload complete:",
            result.secure_url
          );

          resolve(
            result
          );

        }

      );

    }
  );

}


// ===============================
// CLOUDINARY POSTER UPLOAD
// ===============================

async function uploadPoster(filePath) {

  return new Promise(
    (resolve, reject) => {

      cloudinary.uploader.upload(
        filePath,
        {

          resource_type: "image",

          folder:
            "animeverse/posters"

        },

        (error, result) => {

          if (error) {

            return reject(
              error
            );

          }

          resolve(
            result
          );

        }

      );

    }
  );

}


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
// HTML FILES
// ===============================

app.get(
  "/",
  (_req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);


app.get(
  "/index.html",
  (_req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);


app.get(
  "/watch.html",
  (_req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "watch.html"
      )
    );

  }
);


app.get(
  "/admin.html",
  (_req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "admin.html"
      )
    );

  }
);


app.get(
  "/style.css",
  (_req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "style.css"
      )
    );

  }
);


app.get(
  "/admin.js",
  (_req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "admin.js"
      )
    );

  }
);


app.get(
  "/app.js",
  (_req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "app.js"
      )
    );

  }
);


// ===============================
// GET ALL ANIME
// ===============================

app.get(
  "/api/anime",
  async (_req, res) => {

    try {

      const anime =
        await loadAnime();


      console.log(
        "Anime count:",
        anime.length
      );


      res.json(
        anime
      );

    } catch (error) {

      console.error(
        "ANIME API ERROR:",
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

        error:
          "Wrong password"

      });

    }


    req.session.isAdmin =
      true;


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

  async (req, res) => {

    console.log(
      "Anime upload request received"
    );


    const video =
      req.files?.video?.[0];

    const poster =
      req.files?.poster?.[0];


    try {

      // ===============================
      // VIDEO CHECK
      // ===============================

      if (!video) {

        return res.status(400).json({

          error:
            "Video is required"

        });

      }


      // ===============================
      // TITLE
      // ===============================

      const title =
        String(
          req.body.title || ""
        ).trim();


      if (!title) {

        return res.status(400).json({

          error:
            "Title is required"

        });

      }


      // ===============================
      // EPISODE
      // ===============================

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


      // ===============================
      // UPLOAD VIDEO
      // ===============================

      console.log(
        "Uploading video to Cloudinary..."
      );


      const videoResult =
        await uploadVideo(
          video.path
        );


      // ===============================
      // UPLOAD POSTER
      // ===============================

      let posterResult =
        null;


      if (poster) {

        console.log(
          "Uploading poster to Cloudinary..."
        );


        posterResult =
          await uploadPoster(
            poster.path
          );

      }


      // ===============================
      // GET CURRENT DATA
      // ===============================

      const anime =
        await loadAnime();


      // ===============================
      // NEW ANIME
      // ===============================

      const newAnime = {

        id:
          Date.now(),

        title:
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
          posterResult
            ? posterResult.secure_url
            : null,

        video:
          videoResult.secure_url,

        episode:
          episode,

        created_at:
          new Date().toISOString(),

        video_public_id:
          videoResult.public_id,

        poster_public_id:
          posterResult
            ? posterResult.public_id
            : null

      };


      anime.unshift(
        newAnime
      );


      // ===============================
      // SAVE DATABASE
      // ===============================

      await saveAnime(
        anime
      );


      console.log(
        "Anime uploaded:",
        title,
        "Episode:",
        episode
      );


      res.json({

        ok: true,

        id:
          newAnime.id,

        episode:
          episode

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


    } finally {

      // Temporary files delete
      // Cloudinary files delete नहीं होंगे

      try {

        if (
          video?.path &&
          fs.existsSync(video.path)
        ) {

          fs.unlinkSync(
            video.path
          );

        }

      } catch {}


      try {

        if (
          poster?.path &&
          fs.existsSync(poster.path)
        ) {

          fs.unlinkSync(
            poster.path
          );

        }

      } catch {}

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

    req.session.destroy(
      () => {

        res.json({

          ok: true

        });

      }
    );

  }
);


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

          error:
            "Not found"

        });

      }


      const item =
        anime[index];


      // Delete video from Cloudinary
      if (
        item.video_public_id
      ) {

        await deleteCloudinaryFile(

          item.video_public_id,

          "video"

        );

      }


      // Delete poster from Cloudinary
      if (
        item.poster_public_id
      ) {

        await deleteCloudinaryFile(

          item.poster_public_id,

          "image"

        );

      }


      // Remove from database
      anime.splice(
        index,
        1
      );


      await saveAnime(
        anime
      );


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
