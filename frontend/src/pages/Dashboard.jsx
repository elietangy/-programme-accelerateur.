import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { StatCard, Card } from "../components/ui.jsx";
import { money, fmtDate } from "../utils/format.js";

const PERIODES = [
  { key: "jour", label: "Jour" },
  { key: "semaine", label: "Semaine" },
  { key: "mois", label: "Mois" },
  { key: "annee", label: "Année scolaire" },
];

export default function Dashboard() {
  const [periode, setPeriode] = useState("jour");
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api
      .get(`/dashboard?periode=${periode}`)
      .then(setDonnees)
      .catch((e) => setErreur(e.message));
  }, [periode]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {PERIODES.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriode(p.key)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              periode === p.key
                ? "bg-indigo-950 text-white border-indigo-950"
                : "bg-white text-stone-600 border-stone-300 hover:border-indigo-950"
            }`}
          >
            {p.label}
          </button>
        ))}
        {donnees && (
          <span className="text-xs text-stone-500 ml-2">
            {fmtDate(donnees.date_debut)} → {fmtDate(donnees.date_fin)}
          </span>
        )}
      </div>

      {erreur && <p className="text-sm text-red-700">{erreur}</p>}

      {donnees && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total facturé" value={money(donnees.total_facture)} />
          <StatCard label="Total encaissé" value={money(donnees.total_encaisse)} accent="text-emerald-700" />
          <StatCard
            label="Reste dû (période)"
            value={money(donnees.total_restant_du_periode)}
            accent="text-red-700"
          />
          <StatCard label="Reste dû (global)" value={money(donnees.total_restant_du_global)} accent="text-red-700" />
          <StatCard label="Total des dépenses" value={money(donnees.total_depenses)} accent="text-amber-700" />
          <StatCard label="Solde de caisse" value={money(donnees.solde_caisse)} accent="text-indigo-950" />
        </div>
      )}

      <Card title="Bienvenue">
        <p className="text-sm text-stone-600 leading-relaxed">
          Utilisez le menu à gauche pour gérer les inscriptions, les frais et tarifs, la facturation, les
          paiements et les dépenses. Le rapport journalier se met à jour automatiquement à partir de vos
          saisies du jour, et peut être archivé et imprimé en PDF.
        </p>
      </Card>
    </div>
  );
}
