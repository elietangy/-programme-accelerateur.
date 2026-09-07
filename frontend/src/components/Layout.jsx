import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  ClipboardList,
  FileStack,
  Landmark,
  Stamp,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/eleves", label: "Élèves & Classes", icon: Users },
  { to: "/frais", label: "Frais généraux", icon: Landmark },
  { to: "/facturation", label: "Facturation", icon: Receipt },
  { to: "/paiements", label: "Paiements & Restes dus", icon: Wallet },
  { to: "/depenses", label: "Dépenses", icon: FileStack },
  { to: "/rapport", label: "Rapport journalier", icon: ClipboardList },
];

export default function Layout() {
  const { utilisateur, deconnecter } = useAuth();
  const [annee, setAnnee] = useState(null);
  const location = useLocation();

  useEffect(() => {
    api
      .get("/annees-scolaires")
      .then((liste) => setAnnee(liste.find((a) => a.active) || liste[0] || null))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex font-sans">
      <aside className="w-64 shrink-0 bg-indigo-950 text-stone-50 flex flex-col">
        <div className="px-5 py-6 border-b border-indigo-800/60">
          <div className="flex items-center gap-2">
            <Stamp className="w-6 h-6 text-amber-400" />
            <span className="font-serif text-lg tracking-wide">Registre-École</span>
          </div>
          <p className="text-[11px] text-indigo-300 mt-1 leading-snug">
            École Maternelle &amp; Primaire Publique — Gestion Secrétariat / Comptabilité
          </p>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors ${
                  isActive
                    ? "bg-indigo-900 text-amber-400 border-r-2 border-amber-400"
                    : "text-indigo-200 hover:bg-indigo-900/60 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/parametres"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors ${
                isActive
                  ? "bg-indigo-900 text-amber-400 border-r-2 border-amber-400"
                  : "text-indigo-200 hover:bg-indigo-900/60 hover:text-white"
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            Paramètres
          </NavLink>
        </nav>
        <div className="px-5 py-4 border-t border-indigo-800/60">
          <p className="text-[11px] text-indigo-400 mb-2">
            {annee ? `Année scolaire ${annee.libelle}` : "…"}
          </p>
          <div className="flex items-center justify-between text-[12px] text-indigo-300">
            <span>{utilisateur?.identifiant}</span>
            <button
              onClick={deconnecter}
              className="flex items-center gap-1 hover:text-amber-400"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" /> Quitter
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-stone-200 px-8 py-5">
          <h1 className="font-serif text-2xl text-indigo-950">
            {NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label ||
              "Paramètres"}
          </h1>
        </header>
        <div className="p-8 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
