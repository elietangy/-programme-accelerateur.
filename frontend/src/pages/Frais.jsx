import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { Card, Field, inputCls, Tabs, Alert, EmptyRow } from "../components/ui.jsx";
import { money } from "../utils/format.js";

export default function Frais() {
  const [tab, setTab] = useState("types");
  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { key: "types", label: "Types de frais" },
          { key: "tarifs", label: "Tarifs par année" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "types" ? <TypesFraisTab /> : <TarifsTab />}
    </div>
  );
}

const VIDE_TYPE = { id: null, nom: "" };

function TypesFraisTab() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(VIDE_TYPE);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    api.get("/types-frais").then(setTypes).catch((e) => setErreur(e.message));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      if (form.id) await api.put(`/types-frais/${form.id}`, form);
      else await api.post("/types-frais", form);
      setForm(VIDE_TYPE);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer ce type de frais ?")) return;
    try {
      await api.del(`/types-frais/${id}`);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card title={form.id ? "Modifier le type de frais" : "Ajouter un type de frais"}>
        {erreur && (
          <div className="mb-3">
            <Alert onClose={() => setErreur("")}>{erreur}</Alert>
          </div>
        )}
        <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Field label="Libellé">
            <input className={inputCls} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
          </Field>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
              <Plus className="w-4 h-4" /> {form.id ? "Enregistrer" : "Ajouter"}
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm(VIDE_TYPE)} className="text-stone-600 text-sm px-3 py-2">
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
              <th className="px-4 py-2">Type de frais</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{t.nom}</td>
                <td className="px-4 py-2">{t.actif ? "Actif" : "Désactivé"}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setForm(t)} className="text-stone-400 hover:text-indigo-950 mr-2">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => supprimer(t.id)} className="text-stone-400 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {types.length === 0 && <EmptyRow colSpan={3}>Aucun type de frais.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TarifsTab() {
  const [annees, setAnnees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [types, setTypes] = useState([]);
  const [anneeId, setAnneeId] = useState("");
  const [tarifs, setTarifs] = useState([]);
  const [form, setForm] = useState({ type_frais_id: "", classe_id: "", montant: "" });
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    Promise.all([api.get("/annees-scolaires"), api.get("/classes"), api.get("/types-frais")]).then(
      ([a, c, t]) => {
        setAnnees(a);
        setClasses(c);
        setTypes(t);
        const active = a.find((x) => x.active) || a[0];
        if (active) setAnneeId(String(active.id));
      }
    );
  }, []);

  const chargerTarifs = useCallback(() => {
    if (!anneeId) return;
    api.get(`/tarifs?annee_scolaire_id=${anneeId}`).then(setTarifs).catch((e) => setErreur(e.message));
  }, [anneeId]);

  useEffect(() => {
    chargerTarifs();
  }, [chargerTarifs]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      await api.post("/tarifs", {
        type_frais_id: form.type_frais_id,
        annee_scolaire_id: anneeId,
        classe_id: form.classe_id || null,
        montant: form.montant,
      });
      setForm({ type_frais_id: "", classe_id: "", montant: "" });
      chargerTarifs();
    } catch (err) {
      setErreur(err.message);
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer ce tarif ?")) return;
    await api.del(`/tarifs/${id}`);
    chargerTarifs();
  };

  return (
    <div className="space-y-6">
      <Field label="Année scolaire">
        <select className={inputCls + " w-56"} value={anneeId} onChange={(e) => setAnneeId(e.target.value)}>
          {annees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle} {a.active ? "(active)" : ""}
            </option>
          ))}
        </select>
      </Field>

      <Card title="Configurer un tarif">
        {erreur && (
          <div className="mb-3">
            <Alert onClose={() => setErreur("")}>{erreur}</Alert>
          </div>
        )}
        <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <Field label="Type de frais">
            <select
              className={inputCls}
              value={form.type_frais_id}
              onChange={(e) => setForm({ ...form, type_frais_id: e.target.value })}
              required
            >
              <option value="">Choisir…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Classe (optionnel)">
            <select className={inputCls} value={form.classe_id} onChange={(e) => setForm({ ...form, classe_id: e.target.value })}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Montant (FCFA)">
            <input
              type="number"
              className={inputCls}
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              required
            />
          </Field>
          <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center justify-center gap-2 hover:bg-indigo-900">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </form>
      </Card>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-2">Type de frais</th>
              <th className="px-4 py-2">Classe</th>
              <th className="px-4 py-2">Montant</th>
              <th className="px-4 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {tarifs.map((t) => (
              <tr key={t.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{t.type_frais_nom}</td>
                <td className="px-4 py-2">{t.classe_nom || "Toutes les classes"}</td>
                <td className="px-4 py-2 font-mono">{money(t.montant)}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => supprimer(t.id)} className="text-stone-400 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {tarifs.length === 0 && <EmptyRow colSpan={4}>Aucun tarif configuré pour cette année.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
