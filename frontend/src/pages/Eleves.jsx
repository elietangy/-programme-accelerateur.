import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { Card, Field, inputCls, Tabs, Alert, EmptyRow } from "../components/ui.jsx";

const VIDE_ELEVE = {
  id: null,
  nom: "",
  prenom: "",
  classe_id: "",
  statut: "Nouveau",
  parent_nom: "",
  parent_telephone: "",
  parent_email: "",
  parent_adresse: "",
};

export default function Eleves() {
  const [tab, setTab] = useState("eleves");
  const [classes, setClasses] = useState([]);

  const chargerClasses = useCallback(() => {
    api.get("/classes").then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    chargerClasses();
  }, [chargerClasses]);

  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { key: "eleves", label: "Élèves" },
          { key: "classes", label: "Classes" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "eleves" ? (
        <ElevesTab classes={classes} />
      ) : (
        <ClassesTab classes={classes} rafraichir={chargerClasses} />
      )}
    </div>
  );
}

function ElevesTab({ classes }) {
  const [eleves, setEleves] = useState([]);
  const [form, setForm] = useState(VIDE_ELEVE);
  const [filtreClasse, setFiltreClasse] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    const params = new URLSearchParams();
    if (filtreClasse) params.set("classe_id", filtreClasse);
    if (filtreStatut) params.set("statut", filtreStatut);
    if (recherche) params.set("recherche", recherche);
    api
      .get(`/eleves?${params.toString()}`)
      .then(setEleves)
      .catch((e) => setErreur(e.message));
  }, [filtreClasse, filtreStatut, recherche]);

  useEffect(() => {
    charger();
  }, [charger]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      if (form.id) {
        await api.put(`/eleves/${form.id}`, form);
      } else {
        await api.post("/eleves", form);
      }
      setForm(VIDE_ELEVE);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  const modifier = (eleve) => {
    setForm({
      id: eleve.id,
      nom: eleve.nom,
      prenom: eleve.prenom || "",
      classe_id: eleve.classe_id || "",
      statut: eleve.statut,
      parent_nom: eleve.parent_nom || "",
      parent_telephone: eleve.parent_telephone || "",
      parent_email: eleve.parent_email || "",
      parent_adresse: eleve.parent_adresse || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer cet élève ? Cette action est définitive s'il n'a aucune facture.")) return;
    try {
      await api.del(`/eleves/${id}`);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card title={form.id ? "Modifier l'élève" : "Inscrire un élève"}>
        {erreur && (
          <div className="mb-3">
            <Alert onClose={() => setErreur("")}>{erreur}</Alert>
          </div>
        )}
        <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Nom">
            <input className={inputCls} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
          </Field>
          <Field label="Prénom">
            <input className={inputCls} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          </Field>
          <Field label="Classe">
            <select className={inputCls} value={form.classe_id} onChange={(e) => setForm({ ...form, classe_id: e.target.value })}>
              <option value="">Choisir…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select className={inputCls} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
              <option>Nouveau</option>
              <option>Ancien</option>
            </select>
          </Field>
          <Field label="Parent / Tuteur">
            <input
              className={inputCls}
              value={form.parent_nom}
              onChange={(e) => setForm({ ...form, parent_nom: e.target.value })}
            />
          </Field>
          <Field label="Téléphone du parent">
            <input
              className={inputCls}
              value={form.parent_telephone}
              onChange={(e) => setForm({ ...form, parent_telephone: e.target.value })}
            />
          </Field>
          <div className="md:col-span-3 flex gap-2">
            <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
              <Plus className="w-4 h-4" /> {form.id ? "Enregistrer les modifications" : "Ajouter"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(VIDE_ELEVE)}
                className="text-stone-600 text-sm px-3 py-2 hover:text-indigo-950"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <select className={inputCls + " w-48"} value={filtreClasse} onChange={(e) => setFiltreClasse(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <select className={inputCls + " w-40"} value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          <option>Nouveau</option>
          <option>Ancien</option>
        </select>
        <input
          className={inputCls + " w-56"}
          placeholder="Rechercher un nom…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Classe</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Parent/Tuteur</th>
              <th className="px-4 py-2">Téléphone</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {eleves.map((el) => (
              <tr key={el.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{el.nom} {el.prenom}</td>
                <td className="px-4 py-2">{el.classe_nom || "-"}</td>
                <td className="px-4 py-2">{el.statut}</td>
                <td className="px-4 py-2">{el.parent_nom || "-"}</td>
                <td className="px-4 py-2">{el.parent_telephone || "-"}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => modifier(el)} className="text-stone-400 hover:text-indigo-950 mr-2">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => supprimer(el.id)} className="text-stone-400 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {eleves.length === 0 && <EmptyRow colSpan={6}>Aucun élève trouvé.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const VIDE_CLASSE = { id: null, nom: "", niveau: "", ordre_affichage: 0 };

function ClassesTab({ classes, rafraichir }) {
  const [form, setForm] = useState(VIDE_CLASSE);
  const [erreur, setErreur] = useState("");

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      if (form.id) {
        await api.put(`/classes/${form.id}`, form);
      } else {
        await api.post("/classes", form);
      }
      setForm(VIDE_CLASSE);
      rafraichir();
    } catch (err) {
      setErreur(err.message);
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer cette classe ?")) return;
    try {
      await api.del(`/classes/${id}`);
      rafraichir();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card title={form.id ? "Modifier la classe" : "Ajouter une classe"}>
        {erreur && (
          <div className="mb-3">
            <Alert onClose={() => setErreur("")}>{erreur}</Alert>
          </div>
        )}
        <form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <Field label="Nom de la classe">
            <input className={inputCls} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
          </Field>
          <Field label="Niveau (optionnel)">
            <input className={inputCls} value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} />
          </Field>
          <Field label="Ordre d'affichage">
            <input
              type="number"
              className={inputCls}
              value={form.ordre_affichage}
              onChange={(e) => setForm({ ...form, ordre_affichage: e.target.value })}
            />
          </Field>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
              <Plus className="w-4 h-4" /> {form.id ? "Enregistrer" : "Ajouter"}
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm(VIDE_CLASSE)} className="text-stone-600 text-sm px-3 py-2">
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
              <th className="px-4 py-2">Classe</th>
              <th className="px-4 py-2">Niveau</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{c.nom}</td>
                <td className="px-4 py-2">{c.niveau || "-"}</td>
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
            {classes.length === 0 && <EmptyRow colSpan={4}>Aucune classe.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
