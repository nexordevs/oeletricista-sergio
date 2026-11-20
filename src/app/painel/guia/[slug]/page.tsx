import Link from "next/link";
import { notFound } from "next/navigation";
import { panelContext } from "@/lib/panel";
import { NeedsPlan } from "@/components/panel/NeedsPlan";
import { GUIAS, SEGURANCA } from "@/lib/eletrica/guia";

function Sec({ t, items, ordered, tone = "navy" }: { t: string; items: string[]; ordered?: boolean; tone?: string }) {
  const L = ordered ? "ol" : "ul";
  return (
    <section className="card">
      <p className={`mb-3 font-bold ${tone === "green" ? "text-green-800" : "text-navy"}`}>{t}</p>
      <L className={`space-y-2 pl-5 text-[15px] ${ordered ? "list-decimal" : "list-disc"}`}>{items.map((i) => <li key={i}>{i}</li>)}</L>
    </section>
  );
}
export default async function Artigo({ params }: { params: Promise<{ slug: string }> }) {
  const { access } = await panelContext();
  if (!access.active) return <NeedsPlan what="O guia de solução de problemas" />;
  const { slug } = await params;
  const g = GUIAS.find((x) => x.slug === slug);
  if (!g) notFound();
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div><Link href="/painel/guia" className="text-sm font-bold text-navy hover:underline">← Guia de problemas</Link>
          <p className="mt-2 text-xs font-bold uppercase text-muted">{g.categoria}</p><p className="text-2xl font-bold text-navy">{g.titulo}</p><p className="text-muted">{g.resumo}</p></div>
        <Sec t="Sintomas" items={g.sintomas} />
        <Sec t="Causas prováveis" items={g.causas} />
        <Sec t="Como verificar (passo a passo)" items={g.verificar} ordered />
        <Sec t="Solução" items={g.solucao} tone="green" />
        {g.atencao && <p className="rounded-xl border-2 border-red-200 bg-red-50 p-4 font-bold text-red-800">⚠ {g.atencao}</p>}
      </div>
      <aside className="h-fit rounded-2xl bg-navy p-5 text-white lg:sticky lg:top-6">
        <p className="font-bold text-brand">Antes de começar (NR-10)</p>
        <ul className="mt-3 space-y-2 text-sm text-navy-soft">{SEGURANCA.map((s) => <li key={s}>✓ {s}</li>)}</ul>
        <Link href="/painel/dimensionamento" className="btn-primary btn-sm mt-5 w-full">Abrir calculadora de circuitos</Link>
      </aside>
    </div>
  );
}
