export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class ApiClientError extends Error {
  constructor(message, statut) {
    super(message);
    this.statut = statut;
  }
}

async function requete(chemin, options = {}) {
  const res = await fetch(`${API_URL}/api${chemin}`, {
    credentials: "include",
    headers: options.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const estJson = contentType.includes("application/json");
  const data = estJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiClientError(data?.erreur || `Erreur ${res.status}`, res.status);
  }
  return data;
}

export const api = {
  get: (chemin) => requete(chemin),
  post: (chemin, body) =>
    requete(chemin, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (chemin, body) =>
    requete(chemin, { method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body) }),
  del: (chemin) => requete(chemin, { method: "DELETE" }),
  fichierUrl: (chemin) => `${API_URL}/api${chemin}`,
};

export { ApiClientError };
