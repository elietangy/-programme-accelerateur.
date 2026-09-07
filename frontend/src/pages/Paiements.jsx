import { useEffect, useState, useCallback } from "react";
import { Wallet, Download } from "lucide-react";
import { api } from "../api/client.js";
import { Card, Field, inputCls, Tabs, Alert, Stamped, EmptyRow } from "../components/ui.jsx";
import { money, fmtDate, todayISO } from "../utils/format.js";

export default function Paiements() {
  const [tab, setTab] = useState("encaisser");
  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { key: "encaisser", label: "Enregistrer un paiement" },
          { key: "impayes", label: "Impayés" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "encaisser" ? <EncaisserTab /> : <ImpayesTab />}
    </div>
  );
}

function EncaisserTab() {
  const [recherche, setRecherche] = useState("");
  const [impayes, setImpayes] = useState([]);
  const [factureChoisie, setFactureChoisie] = useState(null);
  const [montant, setMontant] = useState("");
  const [datePaiement, setDatePaiement] = useState(todayISO());
  const [modePaiement, setModePaiement] = useState("especes");
  const [erreur, setErreur] = useState("");
  const [messageOk, setMessageOk] = useState("");

  const charger = useCallback(() => {
    const params = new URLSearchParams();
    if (recherche) params.set("recherche", recherche);
    api.get(`/impayes?${params.toString()}`).then(setImpayes).catch((e) => setErreur(e.message));
  }, [recherche]);

  useEffect(() => {
    charger();
  }, [charger]);

  const choisir = (facture) => {
    setFactureChoisie(facture);
    setMontant(String(facture.reste_du));
    setErreur("");
    setMessageOk("");
  };

  const encaisser = async (e) => {
    e.preventDefault();
    setErreur("");
    setMessageOk("");
    try {
      await api.post("/paiements", {
        facture_id: factureChoisie.id,
        montant,
        date_paiement: datePaiement,
        mode_paiement: modePaiement,
      });
      setMessageOk("Paiement enregistré.");
      setFactureChoisie(null);
      setMontant("");
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Field label="Rechercher un élève ou un numéro de facture">
        <input className={inputCls + " w-80"} value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom de l'élève…" />
      </Field>

      {factureChoisie && (
        <Card title={`Encaisser — ${factureChoisie.eleve_nom} ${factureChoisie.eleve_prenom || ""} (facture ${factureChoisie.numero})`}>
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
          <p className="text-sm text-stone-500 mb-3">
            Total facturé : {money(factureChoisie.total)} — Déjà payé : {money(factureChoisie.total_paye)} — Reste dû :{" "}
            <span className="text-red-700 font-mono">{money(factureChoisie.reste_du)}</span>
          </p>
          <form onSubmit={encaisser} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <Field label="Montant reçu (FCFA)">
              <input type="number" className={inputCls} value={montant} onChange={(e) => setMontant(e.target.value)} required min="1" />
            </Field>
            <Field label="Mode de paiement">
              <select className={inputCls} value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
                <option value="especes">Espèces</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Chèque</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
            <Field label="Date">
              <input type="date" className={inputCls} value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button type="submit" className="bg-indigo-950 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-indigo-900">
                <Wallet className="w-4 h-4" /> Encaisser
              </button>
              <button type="button" onClick={() => setFactureChoisie(null)} className="text-stone-600 text-sm px-3 py-2">
                Annuler
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-2">Élève</th>
              <th className="px-4 py-2">Classe</th>
              <th className="px-4 py-2">N° facture</th>
              <th className="px-4 py-2">Reste dû</th>
              <th className="px-4 py-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {impayes.map((f) => (
              <tr key={f.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{f.eleve_nom} {f.eleve_prenom}</td>
                <td className="px-4 py-2">{f.classe_nom}</td>
                <td className="px-4 py-2 font-mono text-xs">{f.numero}</td>
                <td className="px-4 py-2 font-mono text-red-700">{money(f.reste_du)}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => choisir(f)} className="text-xs bg-indigo-950 text-white rounded px-2 py-1 hover:bg-indigo-900">
                    Encaisser
                  </button>
                </td>
              </tr>
            ))}
            {impayes.length === 0 && <EmptyRow colSpan={5}>Aucun impayé — tout est à jour !</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STATUT_LABEL = { impayee: "Impayé", partielle: "Partiel", payee: "Payé" };

function ImpayesTab() {
  const [classes, setClasses] = useState([]);
  const [filtreClasse, setFiltreClasse] = useState("");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState("reste");
  const [ordre, setOrdre] = useState("desc");
  const [impayes, setImpayes] = useState([]);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/classes").then(setClasses).catch(() => {});
  }, []);

  const charger = useCallback(() => {
    const params = new URLSearchParams({ tri, ordre });
    if (filtreClasse) params.set("classe_id", filtreClasse);
    if (recherche) params.set("recherche", recherche);
    api.get(`/impayes?${params.toString()}`).then(setImpayes).catch((e) => setErreur(e.message));
  }, [filtreClasse, recherche, tri, ordre]);

  useEffect(() => {
    charger();
  }, [charger]);

  const totalReste = impayes.reduce((s, f) => s + f.reste_du, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select className={inputCls + " w-48"} value={filtreClasse} onChange={(e) => setFiltreClasse(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <input className={inputCls + " w-56"} placeholder="Rechercher un élève…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        <select className={inputCls + " w-44"} value={tri} onChange={(e) => setTri(e.target.value)}>
          <option value="reste">Trier par reste dû</option>
          <option value="eleve">Trier par élève</option>
          <option value="classe">Trier par classe</option>
          <option value="date">Trier par date</option>
        </select>
        <select className={inputCls + " w-32"} value={ordre} onChange={(e) => setOrdre(e.target.value)}>
          <option value="desc">Décroissant</option>
          <option value="asc">Croissant</option>
        </select>
        <div className="ml-auto flex gap-2">
          <a href={api.fichierUrl("/export/factures.csv")} className="text-xs border border-stone-300 rounded px-2 py-1.5 flex items-center gap-1 hover:border-indigo-950">
            <Download className="w-3.5 h-3.5" /> CSV
          </a>
          <a href={api.fichierUrl("/export/factures.pdf")} className="text-xs border border-stone-300 rounded px-2 py-1.5 flex items-center gap-1 hover:border-indigo-950">
            <Download className="w-3.5 h-3.5" /> PDF
          </a>
        </div>
      </div>

      {erreur && <Alert onClose={() => setErreur("")}>{erreur}</Alert>}

      <p className="text-sm text-stone-500">
        Total restant dû (liste affichée) : <span className="font-mono text-red-700">{money(totalReste)}</span>
      </p>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-2">Élève</th>
              <th className="px-4 py-2">Classe</th>
              <th className="px-4 py-2">N° facture</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Payé</th>
              <th className="px-4 py-2">Reste dû</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {impayes.map((f) => (
              <tr key={f.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{f.eleve_nom} {f.eleve_prenom}</td>
                <td className="px-4 py-2">{f.classe_nom}</td>
                <td className="px-4 py-2 font-mono text-xs">{f.numero}</td>
                <td className="px-4 py-2 font-mono">{money(f.total)}</td>
                <td className="px-4 py-2 font-mono">{money(f.total_paye)}</td>
                <td className="px-4 py-2 font-mono text-red-700">{money(f.reste_du)}</td>
                <td className="px-4 py-2">
                  <Stamped status={STATUT_LABEL[f.statut]} />
                </td>
                <td className="px-4 py-2">{fmtDate(f.date_emission)}</td>
              </tr>
            ))}
            {impayes.length === 0 && <EmptyRow colSpan={8}>Aucun impayé.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
