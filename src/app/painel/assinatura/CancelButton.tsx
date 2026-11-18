"use client";
import { cancelSubscription } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
export function CancelButton({ id, until, pending }: { id: string; until?: string; pending?: boolean }) {
  const msg = pending
    ? "Cancelar esta assinatura? Nenhuma cobrança será feita."
    : `Cancelar sua assinatura?\n\n• Não haverá novas cobranças.\n• Você continua usando até ${until ?? "o fim do período pago"}.`;
  return (
    <ActionForm action={cancelSubscription} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <ConfirmButton message={msg} className="btn-danger btn-sm">{pending ? "Cancelar" : "Cancelar assinatura"}</ConfirmButton>
    </ActionForm>
  );
}
