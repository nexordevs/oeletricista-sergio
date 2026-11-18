import Link from "next/link";
export function Locked({ feature }: { feature: string }) {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <p className="text-xl font-bold text-navy">{feature} faz parte do plano Premium</p>
      <p className="mt-2 text-muted">Faça upgrade para acompanhar entradas, saídas e o desempenho dos seus orçamentos.</p>
      <Link href="/painel/assinatura?plano=premium" className="btn-primary mt-5">Conhecer o Premium</Link>
    </div>
  );
}
