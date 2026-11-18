// Emblema: raio amarelo em círculo azul-marinho com anel amarelo — mesmo desenho do orçamento PDF.
export function Emblem({ size = 40, bg = "#0F2742", ring = "#FFB400", className = "" }: { size?: number; bg?: string; ring?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={ring} />
      <circle cx="50" cy="50" r="43" fill={bg} />
      <path d="M56 17 L31.2 51.7 L48.6 51.7 L42.3 79 L70.8 41.8 L52.2 41.8 L63.4 17 Z" fill={ring} />
    </svg>
  );
}

export function Logo({ name = "SERGIO", sub = "ELETRICISTA", dark = false, size = 40 }: { name?: string; sub?: string; dark?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Emblem size={size} />
      <span className="leading-none">
        <span className={`block text-[22px] font-bold tracking-tight ${dark ? "text-white" : "text-navy"}`}>{name}</span>
        <span className="mt-0.5 block text-[10px] font-bold tracking-[0.35em] text-brand">{sub}</span>
      </span>
    </span>
  );
}
