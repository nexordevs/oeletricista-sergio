type Photo = { id: string; kind: string };
export function WorkCard({ w }: { w: { id: string; title: string; description: string | null; neighborhood: string | null; photos: Photo[] } }) {
  const before = w.photos.find((p) => p.kind === "ANTES");
  const after = w.photos.find((p) => p.kind === "DEPOIS") || w.photos.find((p) => p.kind !== "ANTES");
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      {before || after ? (
        <div className={`grid ${before && after ? "grid-cols-2" : "grid-cols-1"} gap-0.5 bg-line`}>
          {before && <Fig id={before.id} label="Antes" alt={`${w.title} – antes`} />}
          {after && <Fig id={after.id} label={before ? "Depois" : ""} alt={w.title} />}
        </div>
      ) : (
        <div className="flex h-2 bg-brand" />
      )}
      <div className="p-4">
        <h3 className="font-bold text-navy">{w.title}</h3>
        {w.neighborhood && <p className="text-xs font-bold uppercase tracking-wide text-muted">{w.neighborhood}</p>}
        {w.description && <p className="mt-2 text-sm text-muted">{w.description}</p>}
      </div>
    </article>
  );
}
function Fig({ id, label, alt }: { id: string; label: string; alt: string }) {
  return (
    <div className="relative aspect-[4/3] bg-light">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/img/p/${id}`} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      {label && <span className={`badge absolute left-2 top-2 ${label === "Antes" ? "bg-navy text-white" : "bg-brand text-navy"}`}>{label}</span>}
    </div>
  );
}
