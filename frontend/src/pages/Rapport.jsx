import { useEffect, useState, useCallback } from "react";
import { Save, FileDown } from "lucide-react";
import { api } from "../api/client.js";
import { Card, Field, inputCls, StatCard, Alert, EmptyRow } from "../components/ui.jsx";
import { money, fmtDate, todayISO } from "../utils/format.js";

export default function Rapport() {
  const [date, setDate] = useState(todayISO());
  const [rapport, setRapport] = useState(null);
  const [notes, setNotes] = useState("");
  const [paiements, setPaiements] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [erreur, setErreur] = useState("");
  const [messageOk, setMessageOk] = useState("");

  const charger = useCallback(() => {
    api
      .get(`/rapports/journalier?date=${date}`)
      .then((r) => {
        setRapport(r);
        setNotes(r.notes || "");
      })
      .catch((e) => setErreur(e.message));
    api
      .get(`/paiements?date_debut=${date}&date_fin=${date}`)
      .then(setPaiements)
      .catch(() => {});
    api
      .get(`/depenses?date_debut=${date}&date_fin=${date}`)
      .then(setDepenses)
      .catch(() => {});
  }, [date]);

  const chargerHistorique = useCallback(() => {
    api.get("/rapports").then(setHistorique).catch(() => {});
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    chargerHistorique();
  }, [chargerHistorique]);

  const archiver = async () => {
    setErreur("");
    setMessageOk("");
    try {
      const r = await api.post("/rapports/journalier", { date, notes });
      setRapport({ ...r, archive: true });
      setMessageOk("Rapport archivé.");
      chargerHistorique();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Field label="Date du rapport">
        <input type="date" className={inputCls + " w-56"} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {erreur && <Alert onClose={() => setErreur("")}>{erreur}</Alert>}
      {messageOk && (
        <Alert type="succes" onClose={() => setMessageOk("")}>
          {messageOk}
        </Alert>
      )}

      {rapport && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Recettes du jour" value={money(rapport.recettes_total)} accent="text-emerald-700" />
          <StatCard label="Dépenses du jour" value={money(rapport.depenses_total)} accent="text-red-700" />
          <StatCard label="Solde du jour" value={money(rapport.solde)} accent="text-amber-700" />
        </div>
      )}

      <Card title="Note / observations du jour">
        <textarea
          className={inputCls + " min-h-[100px]"}
          placeholder="Ex : visite du fournisseur de manuels, incident cantine, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={archiver} className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
            <Save className="w-4 h-4" /> {rapport?.archive ? "Mettre à jour l'archive" : "Archiver le rapport"}
          </button>
          {rapport?.id && (
            <a
              href={api.fichierUrl(`/rapports/${rapport.id}/pdf`)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-indigo-950 flex items-center gap-1 hover:underline"
            >
              <FileDown className="w-4 h-4" /> Générer le PDF
            </a>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600">Paiements reçus</div>
          <table className="w-full text-sm">
            <tbody>
              {paiements.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-2">{p.eleve_nom} {p.eleve_prenom}</td>
                  <td className="px-4 py-2 font-mono text-right">{money(p.montant)}</td>
                </tr>
              ))}
              {paiements.length === 0 && <EmptyRow colSpan={2}>Aucun paiement ce jour.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600">Dépenses</div>
          <table className="w-full text-sm">
            <tbody>
              {depenses.map((d) => (
                <tr key={d.id} className="border-t border-stone-100">
                  <td className="px-4 py-2">{d.libelle}</td>
                  <td className="px-4 py-2 font-mono text-right">{money(d.montant)}</td>
                </tr>
              ))}
              {depenses.length === 0 && <EmptyRow colSpan={2}>Aucune dépense ce jour.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </div>

      <Card title="Rapports archivés">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Recettes</th>
                <th className="px-4 py-2">Dépenses</th>
                <th className="px-4 py-2">Solde</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {historique.map((r) => (
                <tr key={r.id} className="border-t border-stone-100">
                  <td className="px-4 py-2">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2 font-mono">{money(r.recettes_total)}</td>
                  <td className="px-4 py-2 font-mono">{money(r.depenses_total)}</td>
                  <td className="px-4 py-2 font-mono">{money(r.solde)}</td>
                  <td className="px-4 py-2 text-right">
                    <a href={api.fichierUrl(`/rapports/${r.id}/pdf`)} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-indigo-950">
                      <FileDown className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
              {historique.length === 0 && <EmptyRow colSpan={5}>Aucun rapport archivé.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
