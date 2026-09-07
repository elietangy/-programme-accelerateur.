import { useEffect, useState, useCallback } from "react";
import { Plus, FileDown } from "lucide-react";
import { api } from "../api/client.js";
import { Card, Field, inputCls, Alert, Stamped, EmptyRow } from "../components/ui.jsx";
import { money, fmtDate, todayISO } from "../utils/format.js";

const STATUT_LABEL = { impayee: "Impayé", partielle: "Partiel", payee: "Payé" };

export default function Facturation() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [types, setTypes] = useState([]);
  const [mode, setMode] = useState("eleve");
  const [anneeId, setAnneeId] = useState("");
  const [eleveId, setEleveId] = useState("");
  const [classeIdForm, setClasseIdForm] = useState("");
  const [typesChoisis, setTypesChoisis] = useState([]);
  const [dateEmission, setDateEmission] = useState(todayISO());
  const [erreur, setErreur] = useState("");
  const [messageOk, setMessageOk] = useState("");

  const [filtreClasse, setFiltreClasse] = useState("");
  const [factures, setFactures] = useState([]);
  const [totalClasse, setTotalClasse] = useState(0);

  useEffect(() => {
    Promise.all([api.get("/eleves"), api.get("/classes"), api.get("/annees-scolaires"), api.get("/types-frais")]).then(
      ([e, c, a, t]) => {
        setEleves(e);
        setClasses(c);
        setAnnees(a);
        setTypes(t);
        const active = a.find((x) => x.active) || a[0];
        if (active) setAnneeId(String(active.id));
      }
    );
  }, []);

  const chargerFactures = useCallback(() => {
    const params = new URLSearchParams();
    if (filtreClasse) params.set("classe_id", filtreClasse);
    api
      .get(`/factures?${params.toString()}`)
      .then(({ factures, total_classe }) => {
        setFactures(factures);
        setTotalClasse(total_classe);
      })
      .catch((e) => setErreur(e.message));
  }, [filtreClasse]);

  useEffect(() => {
    chargerFactures();
  }, [chargerFactures]);

  const toggleType = (id) => {
    setTypesChoisis((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    setMessageOk("");
    if (typesChoisis.length === 0) {
      setErreur("Sélectionnez au moins un type de frais.");
      return;
    }
    try {
      if (mode === "eleve") {
        if (!eleveId) throw new Error("Choisissez un élève.");
        await api.post("/factures", {
          eleve_id: eleveId,
          annee_scolaire_id: anneeId,
          type_frais_ids: typesChoisis,
          date_emission: dateEmission,
        });
        setMessageOk("Facture créée avec succès.");
      } else {
        if (!classeIdForm) throw new Error("Choisissez une classe.");
        const res = await api.post("/factures/generer-classe", {
          classe_id: classeIdForm,
          annee_scolaire_id: anneeId,
          type_frais_ids: typesChoisis,
          date_emission: dateEmission,
        });
        setMessageOk(
          `${res.nb_factures_creees} facture(s) créée(s)${res.erreurs.length ? `, ${res.erreurs.length} erreur(s)` : ""}.`
        );
      }
      setTypesChoisis([]);
      chargerFactures();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Émettre une facture">
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
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("eleve")}
            className={`px-3 py-1.5 rounded-md text-sm border ${mode === "eleve" ? "bg-indigo-950 text-white border-indigo-950" : "border-stone-300 text-stone-600"}`}
          >
            Un seul élève
          </button>
          <button
            onClick={() => setMode("classe")}
            className={`px-3 py-1.5 rounded-md text-sm border ${mode === "classe" ? "bg-indigo-950 text-white border-indigo-950" : "border-stone-300 text-stone-600"}`}
          >
            Toute une classe
          </button>
        </div>

        <form onSubmit={soumettre} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Année scolaire">
              <select className={inputCls} value={anneeId} onChange={(e) => setAnneeId(e.target.value)} required>
                {annees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.libelle}
                  </option>
                ))}
              </select>
            </Field>
            {mode === "eleve" ? (
              <Field label="Élève">
                <select className={inputCls} value={eleveId} onChange={(e) => setEleveId(e.target.value)} required>
                  <option value="">Choisir…</option>
                  {eleves.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.nom} {el.prenom} — {el.classe_nom}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Classe">
                <select className={inputCls} value={classeIdForm} onChange={(e) => setClasseIdForm(e.target.value)} required>
                  <option value="">Choisir…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Date d'émission">
              <input type="date" className={inputCls} value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} />
            </Field>
          </div>

          <Field label="Types de frais à facturer">
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <label
                  key={t.id}
                  className={`text-sm border rounded-md px-3 py-1.5 cursor-pointer ${
                    typesChoisis.includes(t.id) ? "bg-amber-50 border-amber-500 text-amber-800" : "border-stone-300 text-stone-600"
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={typesChoisis.includes(t.id)} onChange={() => toggleType(t.id)} />
                  {t.nom}
                </label>
              ))}
            </div>
          </Field>

          <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
            <Plus className="w-4 h-4" /> Facturer
          </button>
        </form>
      </Card>

      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-600">Filtrer par classe :</span>
        <select className={inputCls + " w-48"} value={filtreClasse} onChange={(e) => setFiltreClasse(e.target.value)}>
          <option value="">Toutes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <span className="text-sm text-stone-500">
          Total {filtreClasse ? "de la classe" : "général"} : <span className="font-mono text-indigo-950">{money(totalClasse)}</span>
        </span>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-2">N° facture</th>
              <th className="px-4 py-2">Élève</th>
              <th className="px-4 py-2">Classe</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Payé</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f.id} className="border-t border-stone-100">
                <td className="px-4 py-2 font-mono text-xs">{f.numero}</td>
                <td className="px-4 py-2">{f.eleve_nom} {f.eleve_prenom}</td>
                <td className="px-4 py-2">{f.classe_nom}</td>
                <td className="px-4 py-2 font-mono">{money(f.total)}</td>
                <td className="px-4 py-2 font-mono">{money(f.total_paye)}</td>
                <td className="px-4 py-2">
                  <Stamped status={STATUT_LABEL[f.statut]} />
                </td>
                <td className="px-4 py-2">{fmtDate(f.date_emission)}</td>
                <td className="px-4 py-2 text-right">
                  <a href={api.fichierUrl(`/factures/${f.id}/pdf`)} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-indigo-950" title="Reçu PDF">
                    <FileDown className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            ))}
            {factures.length === 0 && <EmptyRow colSpan={8}>Aucune facture.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
