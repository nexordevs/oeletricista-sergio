import Link from "next/link";
import { panelContext } from "@/lib/panel";
import { NeedsPlan } from "@/components/panel/NeedsPlan";
import { GUIAS } from "@/lib/eletrica/guia";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export default async function Guia({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { access } = await panelContext();
  if (!access.active) return <NeedsPlan what="O guia de solução de problemas" />;
  const q = norm(((await searchParams).q || "").slice(0, 80));
  const list = q ? GUIAS.filter((g) => norm([g.titulo, g.resumo, ...g.sintomas, ...g.causas].join(" ")).includes(q)) : GUIAS;
  const cats = [...new Set(list.map((g) => g.categoria))];
  return (
    <div className="space-y-5">
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Ex.: contator, DR, motor, curto…" className="input" aria-label="Buscar" /><button className="btn-navy">Buscar</button></form>
      {list.length === 0 && <div className="card text-center text-muted">Nada encontrado para “{q}”.</div>}
      {cats.map((c) => (
        <section key={c}>
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{c}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.filter((g) => g.categoria === c).map((g) => (
              <Link key={g.slug} href={`/painel/guia/${g.slug}`} className="card transition hover:border-brand">
                <p className="font-bold text-navy">{g.titulo}</p><p className="mt-1 text-sm text-muted">{g.resumo}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
