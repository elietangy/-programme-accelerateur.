import "dotenv/config";

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: required("JWT_SECRET", process.env.NODE_ENV === "production" ? undefined : "dev-secret-non-securise"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  cookieName: "registre_ecole_token",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 5),
};
