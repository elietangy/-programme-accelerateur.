import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Stamp } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Field, inputCls, Alert } from "../components/ui.jsx";

export default function Login() {
  const { utilisateur, chargement, connecter } = useAuth();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  if (!chargement && utilisateur) return <Navigate to="/" replace />;

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    try {
      await connecter(identifiant, motDePasse);
    } catch (err) {
      setErreur(err.message || "Connexion impossible.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-indigo-950 flex items-center justify-center mb-3">
            <Stamp className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="font-serif text-xl text-indigo-950">Registre-École</h1>
          <p className="text-xs text-stone-500 mt-1 text-center">
            Gestion administrative et comptable — Secrétariat
          </p>
        </div>

        <form onSubmit={soumettre} className="space-y-4">
          {erreur && <Alert type="erreur">{erreur}</Alert>}
          <Field label="Identifiant">
            <input
              className={inputCls}
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <Field label="Mot de passe">
            <input
              type="password"
              className={inputCls}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </Field>
          <button
            type="submit"
            disabled={enCours}
            className="w-full bg-indigo-950 text-white rounded-md px-4 py-2 text-sm hover:bg-indigo-900 disabled:opacity-60"
          >
            {enCours ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
