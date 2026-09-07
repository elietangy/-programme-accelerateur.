import { useEffect, useState, useCallback } from "react";
import { Save, CheckCircle2, Plus, Download } from "lucide-react";
import { api } from "../api/client.js";
import { Card, Field, inputCls, Alert, EmptyRow } from "../components/ui.jsx";
import { fmtDate } from "../utils/format.js";

export default function Parametres() {
  return (
    <div className="space-y-6">
      <ParametresEcole />
      <AnneesScolaires />
      <Exports />
    </div>
  );
}

function ParametresEcole() {
  const [form, setForm] = useState({ nom_ecole: "", adresse: "", telephone: "" });
  const [erreur, setErreur] = useState("");
  const [messageOk, setMessageOk] = useState("");

  useEffect(() => {
    api.get("/parametres").then((p) =>
      setForm({ nom_ecole: p.nom_ecole || "", adresse: p.adresse || "", telephone: p.telephone || "" })
    );
  }, []);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    setMessageOk("");
    try {
      await api.put("/parametres", form);
      setMessageOk("Paramètres enregistrés.");
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <Card title="Informations de l'école">
      {erreur && (
        <div className="mb-3">
          <Alert onClose={() => setErreur("")}>{erreur}</Alert>
        </div>
      )}
      {messageOk && (
        <div className="mb-3">
          <Alert type="succes" onClose={() => setMessageOk("")}>
            {messageOk}
          </Alert>
        </div>
      )}
      <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <Field label="Nom de l'école">
          <input className={inputCls} value={form.nom_ecole} onChange={(e) => setForm({ ...form, nom_ecole: e.target.value })} required />
        </Field>
        <Field label="Adresse">
          <input className={inputCls} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
        </Field>
        <Field label="Téléphone">
          <input className={inputCls} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </Field>
        <div className="md:col-span-3">
          <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </form>
    </Card>
  );
}

function AnneesScolaires() {
  const [annees, setAnnees] = useState([]);
  const [form, setForm] = useState({ libelle: "", date_debut: "", date_fin: "" });
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    api.get("/annees-scolaires").then(setAnnees).catch((e) => setErreur(e.message));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      await api.post("/annees-scolaires", form);
      setForm({ libelle: "", date_debut: "", date_fin: "" });
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  const activer = async (id) => {
    await api.post(`/annees-scolaires/${id}/activer`, {});
    charger();
  };

  return (
    <Card title="Années scolaires">
      {erreur && (
        <div className="mb-3">
          <Alert onClose={() => setErreur("")}>{erreur}</Alert>
        </div>
      )}
      <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
        <Field label="Libellé (ex : 2026-2027)">
          <input className={inputCls} value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} required />
        </Field>
        <Field label="Date de début">
          <input type="date" className={inputCls} value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
        </Field>
        <Field label="Date de fin">
          <input type="date" className={inputCls} value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
        </Field>
        <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center justify-center gap-2 hover:bg-indigo-900">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </form>

      <table className="w-full text-sm">
        <thead className="bg-stone-100 text-stone-600 text-left">
          <tr>
            <th className="px-4 py-2">Libellé</th>
            <th className="px-4 py-2">Début</th>
            <th className="px-4 py-2">Fin</th>
            <th className="px-4 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {annees.map((a) => (
            <tr key={a.id} className="border-t border-stone-100">
              <td className="px-4 py-2">{a.libelle}</td>
              <td className="px-4 py-2">{fmtDate(a.date_debut)}</td>
              <td className="px-4 py-2">{fmtDate(a.date_fin)}</td>
              <td className="px-4 py-2 text-right">
                {a.active ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <button onClick={() => activer(a.id)} className="text-xs border border-stone-300 rounded px-2 py-1 hover:border-indigo-950">
                    Activer
                  </button>
                )}
              </td>
            </tr>
          ))}
          {annees.length === 0 && <EmptyRow colSpan={4}>Aucune année scolaire.</EmptyRow>}
        </tbody>
      </table>
    </Card>
  );
}

function Exports() {
  const items = [
    { entite: "eleves", label: "Élèves" },
    { entite: "factures", label: "Factures" },
    { entite: "paiements", label: "Paiements" },
    { entite: "depenses", label: "Dépenses" },
    { entite: "rapports", label: "Rapports journaliers" },
  ];
  return (
    <Card title="Exports et archivage">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.entite} className="flex items-center justify-between border border-stone-200 rounded-md px-4 py-3">
            <span className="text-sm text-stone-700">{it.label}</span>
            <div className="flex gap-2">
              <a href={api.fichierUrl(`/export/${it.entite}.csv`)} className="text-xs border border-stone-300 rounded px-2 py-1 flex items-center gap-1 hover:border-indigo-950">
                <Download className="w-3.5 h-3.5" /> CSV
              </a>
              <a href={api.fichierUrl(`/export/${it.entite}.pdf`)} className="text-xs border border-stone-300 rounded px-2 py-1 flex items-center gap-1 hover:border-indigo-950">
                <Download className="w-3.5 h-3.5" /> PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
