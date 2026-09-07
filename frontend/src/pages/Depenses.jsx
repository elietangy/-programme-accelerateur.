import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Paperclip, Download } from "lucide-react";
import { api } from "../api/client.js";
import { Card, Field, inputCls, Tabs, Alert, StatCard, EmptyRow } from "../components/ui.jsx";
import { money, fmtDate, todayISO } from "../utils/format.js";

export default function Depenses() {
  const [tab, setTab] = useState("depenses");
  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { key: "depenses", label: "Dépenses" },
          { key: "categories", label: "Catégories" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "depenses" ? <DepensesTab /> : <CategoriesTab />}
    </div>
  );
}

const VIDE_DEPENSE = { categorie_id: "", libelle: "", montant: "", date_depense: todayISO() };

function DepensesTab() {
  const [categories, setCategories] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [form, setForm] = useState(VIDE_DEPENSE);
  const [fichier, setFichier] = useState(null);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    api.get("/depenses").then(setDepenses).catch((e) => setErreur(e.message));
  }, []);

  useEffect(() => {
    api.get("/categories-depenses").then(setCategories);
    charger();
  }, [charger]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      const data = new FormData();
      data.append("categorie_id", form.categorie_id);
      data.append("libelle", form.libelle);
      data.append("montant", form.montant);
      data.append("date_depense", form.date_depense);
      if (fichier) data.append("justificatif", fichier);
      await api.post("/depenses", data);
      setForm(VIDE_DEPENSE);
      setFichier(null);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    await api.del(`/depenses/${id}`);
    charger();
  };

  const totalParCategorie = categories.map((c) => ({
    ...c,
    total: depenses.filter((d) => d.categorie_id === c.id).reduce((s, d) => s + d.montant, 0),
  }));

  return (
    <div className="space-y-6">
      <Card title="Enregistrer une dépense">
        {erreur && (
          <div className="mb-3">
            <Alert onClose={() => setErreur("")}>{erreur}</Alert>
          </div>
        )}
        <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <Field label="Catégorie">
            <select className={inputCls} value={form.categorie_id} onChange={(e) => setForm({ ...form, categorie_id: e.target.value })} required>
              <option value="">Choisir…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input className={inputCls} value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} required />
          </Field>
          <Field label="Montant (FCFA)">
            <input type="number" className={inputCls} value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} required />
          </Field>
          <Field label="Date">
            <input type="date" className={inputCls} value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })} />
          </Field>
          <Field label="Justificatif (optionnel)">
            <input type="file" accept="image/*,application/pdf" className="text-xs" onChange={(e) => setFichier(e.target.files?.[0] || null)} />
          </Field>
          <div className="md:col-span-5">
            <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {totalParCategorie.map((c) => (
          <StatCard key={c.id} label={c.nom} value={money(c.total)} accent="text-amber-700" />
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-2">Catégorie</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Montant</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {depenses.map((d) => (
              <tr key={d.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{d.categorie_nom || "-"}</td>
                <td className="px-4 py-2">{d.libelle}</td>
                <td className="px-4 py-2 font-mono">{money(d.montant)}</td>
                <td className="px-4 py-2">{fmtDate(d.date_depense)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {d.justificatif_path && (
                    <a href={api.fichierUrl(`/depenses/${d.id}/justificatif`)} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-indigo-950 mr-2 inline-block" title="Voir le justificatif">
                      <Paperclip className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => supprimer(d.id)} className="text-stone-400 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {depenses.length === 0 && <EmptyRow colSpan={5}>Aucune dépense enregistrée.</EmptyRow>}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <a href={api.fichierUrl("/export/depenses.csv")} className="text-xs border border-stone-300 rounded px-2 py-1.5 flex items-center gap-1 hover:border-indigo-950">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </a>
        <a href={api.fichierUrl("/export/depenses.pdf")} className="text-xs border border-stone-300 rounded px-2 py-1.5 flex items-center gap-1 hover:border-indigo-950">
          <Download className="w-3.5 h-3.5" /> Export PDF
        </a>
      </div>
    </div>
  );
}

const VIDE_CATEGORIE = { id: null, nom: "" };

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(VIDE_CATEGORIE);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    api.get("/categories-depenses").then(setCategories).catch((e) => setErreur(e.message));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      if (form.id) await api.put(`/categories-depenses/${form.id}`, form);
      else await api.post("/categories-depenses", form);
      setForm(VIDE_CATEGORIE);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    await api.del(`/categories-depenses/${id}`);
    charger();
  };

  return (
    <div className="space-y-6">
      <Card title={form.id ? "Modifier la catégorie" : "Ajouter une catégorie"}>
        {erreur && (
          <div className="mb-3">
            <Alert onClose={() => setErreur("")}>{erreur}</Alert>
          </div>
        )}
        <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Field label="Nom de la catégorie">
            <input className={inputCls} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
          </Field>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
              <Plus className="w-4 h-4" /> {form.id ? "Enregistrer" : "Ajouter"}
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm(VIDE_CATEGORIE)} className="text-stone-600 text-sm px-3 py-2">
                Annuler
              </button>
            )}
          </div>
        </form>
      </Card>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-2">Catégorie</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{c.nom}</td>
                <td className="px-4 py-2">{c.actif ? "Active" : "Désactivée"}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setForm(c)} className="text-stone-400 hover:text-indigo-950 mr-2">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => supprimer(c.id)} className="text-stone-400 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <EmptyRow colSpan={3}>Aucune catégorie.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
