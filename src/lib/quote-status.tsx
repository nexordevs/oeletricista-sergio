export const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Rascunho", cls: "bg-gray-100 text-gray-700" },
  SENT: { label: "Enviado", cls: "bg-blue-100 text-blue-800" },
  VIEWED: { label: "Visualizado", cls: "bg-indigo-100 text-indigo-800" },
  APPROVED: { label: "Aprovado", cls: "bg-green-100 text-green-800" },
  REJECTED: { label: "Recusado", cls: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expirado", cls: "bg-amber-100 text-amber-800" },
};
export function StatusBadge({ s }: { s: string }) {
  const x = STATUS[s] || STATUS.DRAFT;
  return <span className={`badge ${x.cls}`}>{x.label}</span>;
}
