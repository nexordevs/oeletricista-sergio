import Link from "next/link";
export function NeedsPlan({ what }: { what: string }) {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <p className="text-xl font-bold text-navy">{what} é exclusivo para assinantes</p>
      <p className="mt-2 text-muted">Ative um plano para usar as ferramentas técnicas do sistema.</p>
      <Link href="/painel/assinatura" className="btn-primary mt-5">Ver planos</Link>
    </div>
  );
}
