import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { adminVerifySubscription, adminActivateSubscription } from "./actions";
/** Botões do admin para uma assinatura: verificar no MP e ativar manualmente (contabilizando o valor). */
export function SubscriptionAdmin({ id, amount, hasMp }: { id: string; amount: string; hasMp: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {hasMp && <form action={adminVerifySubscription}><input type="hidden" name="id" value={id} /><Submit className="btn-outline btn-sm" pending="Verificando...">Verificar no Mercado Pago</Submit></form>}
      <details className="rounded-xl border border-line bg-white px-3 py-2">
        <summary className="cursor-pointer text-sm font-bold text-navy">Ativar manualmente</summary>
        <ActionForm action={adminActivateSubscription} className="mt-2 space-y-2">
          <input type="hidden" name="id" value={id} />
          <div><label className="label">Valor recebido (R$)</label><input name="amount" defaultValue={Number(amount).toFixed(2).replace(".", ",")} inputMode="decimal" className="input py-2" /></div>
          <div><label className="label">Observação</label><input name="note" placeholder="Ex.: Pix recebido em 18/11" className="input py-2" /></div>
          <ConfirmButton message="Confirmar que você recebeu este pagamento? A assinatura será ativada pelo período do plano." className="btn-primary btn-sm w-full">Confirmar pagamento e ativar</ConfirmButton>
        </ActionForm>
      </details>
    </div>
  );
}
