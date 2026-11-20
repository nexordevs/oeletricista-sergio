"use client";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { saveMarkup } from "./actions";
import { Submit, FormMessage } from "@/components/ui";
export function MarkupForm({ value }: { value: number }) {
  const [s, a, pending] = useStickyAction(saveMarkup);
  return (
    <StickyForm pending={pending} onSubmit={a} className="space-y-3 rounded-xl border-2 border-brand bg-white p-4" noValidate>
      <FormMessage state={s} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label htmlFor="materialMarkup" className="label">Seu ganho em cima do material (%)</label>
          <div className="flex items-center gap-2"><input id="materialMarkup" name="materialMarkup" inputMode="decimal" defaultValue={value} className="input w-28 text-right text-lg font-bold" /><span className="text-lg font-bold text-navy">%</span></div>
        </div>
        <Submit className="btn-navy">Salvar margem</Submit>
      </div>
      <p className="text-sm text-muted">Coloque abaixo o <b>preço que você paga</b> (custo). Ao adicionar o material no orçamento, o sistema soma a sua margem. Ex.: custo R$ 10,00 + 30% = <b>R$ 13,00</b> para o cliente. Dá para mudar a % em cada orçamento.</p>
    </StickyForm>
  );
}
