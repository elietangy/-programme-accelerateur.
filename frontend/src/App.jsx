import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Eleves from "./pages/Eleves.jsx";
import Frais from "./pages/Frais.jsx";
import Facturation from "./pages/Facturation.jsx";
import Paiements from "./pages/Paiements.jsx";
import Depenses from "./pages/Depenses.jsx";
import Rapport from "./pages/Rapport.jsx";
import Parametres from "./pages/Parametres.jsx";

function Protegee({ children }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400">Chargement…</div>;
  }
  if (!utilisateur) return <Navigate to="/connexion" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route
        path="/"
        element={
          <Protegee>
            <Layout />
          </Protegee>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="eleves" element={<Eleves />} />
        <Route path="frais" element={<Frais />} />
        <Route path="facturation" element={<Facturation />} />
        <Route path="paiements" element={<Paiements />} />
        <Route path="depenses" element={<Depenses />} />
        <Route path="rapport" element={<Rapport />} />
        <Route path="parametres" element={<Parametres />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
