import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { uploadsDir } from "../db/connection.js";
import { config } from "../config.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nom = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, nom);
  },
});

const typesAutorises = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const uploadJustificatif = multer({
  storage,
  limits: { fileSize: config.maxUploadSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!typesAutorises.has(file.mimetype)) {
      return cb(new Error("Format de fichier non autorisé (image ou PDF uniquement)."));
    }
    cb(null, true);
  },
}).single("justificatif");
