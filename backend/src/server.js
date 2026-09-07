import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import "./db/connection.js";

import { authRouter } from "./routes/auth.routes.js";
import { classesRouter } from "./routes/classes.routes.js";
import { elevesRouter } from "./routes/eleves.routes.js";
import { anneesScolairesRouter } from "./routes/anneesScolaires.routes.js";
import { typesFraisRouter } from "./routes/typesFrais.routes.js";
import { tarifsRouter } from "./routes/tarifs.routes.js";
import { categoriesDepensesRouter } from "./routes/categoriesDepenses.routes.js";
import { depensesRouter } from "./routes/depenses.routes.js";
import { facturesRouter } from "./routes/factures.routes.js";
import { paiementsRouter, impayesRouter } from "./routes/paiements.routes.js";
import { rapportsRouter } from "./routes/rapports.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { exportRouter } from "./routes/export.routes.js";
import { parametresRouter } from "./routes/parametres.routes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/sante", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);

// Toutes les routes ci-dessous nécessitent une authentification
app.use("/api/classes", requireAuth, classesRouter);
app.use("/api/eleves", requireAuth, elevesRouter);
app.use("/api/annees-scolaires", requireAuth, anneesScolairesRouter);
app.use("/api/types-frais", requireAuth, typesFraisRouter);
app.use("/api/tarifs", requireAuth, tarifsRouter);
app.use("/api/categories-depenses", requireAuth, categoriesDepensesRouter);
app.use("/api/depenses", requireAuth, depensesRouter);
app.use("/api/factures", requireAuth, facturesRouter);
app.use("/api/paiements", requireAuth, paiementsRouter);
app.use("/api/impayes", requireAuth, impayesRouter);
app.use("/api/rapports", requireAuth, rapportsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/export", requireAuth, exportRouter);
app.use("/api/parametres", requireAuth, parametresRouter);

app.use((req, res) => res.status(404).json({ erreur: "Route introuvable." }));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API Registre-École démarrée sur le port ${config.port} (${config.nodeEnv})`);
});
