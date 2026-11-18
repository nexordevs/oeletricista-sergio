import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { syncSubscription } from "@/lib/mercadopago";
import { IconCheck, IconClock } from "@/components/icons";

// O retorno do navegador NÃO ativa nada por si só: consultamos o Mercado Pago no servidor.
export default async function Retorno(props: { searchParams: Promise<{ s?: string }> }) {
  const searchParams = await props.searchParams;
  const { user } = await panelContext();
  const sub = searchParams.s ? await prisma.subscription.findFirst({ where: { id: searchParams.s, userId: user.id }, include: { plan: true } }) : null;
  let status = sub?.status;
  if (sub?.mpPreapprovalId) status = (await syncSubscription(sub.id).catch(() => null))?.status ?? status;
  const ok = status === "ACTIVE";
  return (
    <div className="card mx-auto max-w-lg text-center">
      <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{ok ? <IconCheck className="h-8 w-8" /> : <IconClock className="h-8 w-8" />}</span>
      <p className="mt-4 text-xl font-bold text-navy">{ok ? `Plano ${sub?.plan.name} ativado!` : "Estamos aguardando a confirmação do pagamento"}</p>
      <p className="mt-2 text-muted">{ok ? "Tudo pronto. Já pode criar seus orçamentos." : "Assim que o Mercado Pago aprovar, seu acesso é liberado automaticamente (normalmente em poucos minutos; boleto/Pix pode levar mais)."}</p>
      <Link href={ok ? "/painel/orcamentos/novo" : "/painel/assinatura"} className="btn-primary mt-6">{ok ? "Criar orçamento" : "Ver minha assinatura"}</Link>
    </div>
  );
}
