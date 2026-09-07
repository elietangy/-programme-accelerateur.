export function StatCard({ label, value, accent = "text-indigo-950" }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`font-mono text-2xl mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="block text-stone-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500";

export function Stamped({ status }) {
  const styles = {
    Payé: "border-emerald-700 text-emerald-700",
    Partiel: "border-amber-700 text-amber-700",
    Impayé: "border-red-700 text-red-700",
  };
  return (
    <span
      className={`inline-block text-[11px] font-serif tracking-widest uppercase px-2 py-1 rounded border-2 ${
        styles[status] || "border-stone-400 text-stone-500"
      }`}
      style={{ transform: "rotate(-2deg)" }}
    >
      {status}
    </span>
  );
}

export function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-lg p-5 ${className}`}>
      {title && <h3 className="font-serif text-lg text-indigo-950 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-stone-200">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            active === t.key
              ? "border-amber-500 text-indigo-950 font-medium"
              : "border-transparent text-stone-500 hover:text-indigo-950"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Alert({ type = "erreur", children, onClose }) {
  const styles =
    type === "erreur"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-emerald-50 border-emerald-200 text-emerald-800";
  return (
    <div className={`border rounded-md px-4 py-2 text-sm flex items-start justify-between gap-3 ${styles}`}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="text-inherit opacity-60 hover:opacity-100">
          ×
        </button>
      )}
    </div>
  );
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-stone-400">
        {children}
      </td>
    </tr>
  );
}
