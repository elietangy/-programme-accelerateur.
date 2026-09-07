import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/connection.js";
import { config } from "../config.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: config.nodeEnv === "production" ? "none" : "lax",
  maxAge: 8 * 60 * 60 * 1000,
  path: "/",
};

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { identifiant, mot_de_passe } = req.body || {};
    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ erreur: "Identifiant et mot de passe requis." });
    }
    const user = db
      .prepare("SELECT * FROM utilisateur WHERE identifiant = ?")
      .get(identifiant);
    if (!user) {
      return res.status(401).json({ erreur: "Identifiant ou mot de passe incorrect." });
    }
    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash);
    if (!ok) {
      return res.status(401).json({ erreur: "Identifiant ou mot de passe incorrect." });
    }
    const token = jwt.sign(
      { sub: user.id, identifiant: user.identifiant },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    res.cookie(config.cookieName, token, cookieOptions);
    res.json({ id: user.id, identifiant: user.identifiant });
  })
);

authRouter.post("/logout", (req, res) => {
  res.clearCookie(config.cookieName, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.user.sub, identifiant: req.user.identifiant });
});
