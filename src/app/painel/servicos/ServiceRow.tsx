"use client";
import { useFormState } from "react-dom";
import { saveService, deleteService } from "./actions";
import { Submit } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { brl } from "@/lib/money";

type S = { id: string; name: string; unit: string; price: string; category: string; suggested: string | null; min: string | null; max: string | null };
export function ServiceRow({ s }: { s: S }) {
  const [st, a] = useFormState(saveService, undefined);
  const diff = s.suggested != null && Number(s.suggested) !== Number(s.price);
  return (
    <div className="border-b border-line px-4 py-3 last:border-0">
      <form action={a} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[1fr_90px_130px_auto]">
        <input type="hidden" name="id" value={s.id} /><input type="hidden" name="category" value={s.category} />
        <div className="col-span-2 sm:col-span-1"><label className="sr-only" htmlFor={`n${s.id}`}>Nome</label><input id={`n${s.id}`} name="name" defaultValue={s.name} className="input py-2.5 font-bold" /></div>
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`u${s.id}`}>Unid.</label><input id={`u${s.id}`} name="unit" defaultValue={s.unit} className="input py-2.5" /></div>
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`p${s.id}`}>Preço (R$)</label><input id={`p${s.id}`} name="price" defaultValue={Number(s.price).toFixed(2).replace(".", ",")} inputMode="decimal" className="input py-2.5 text-right font-bold" /></div>
        <div className="col-span-2 flex gap-2 sm:col-span-1"><Submit className="btn-navy btn-sm flex-1" pending="...">Salvar</Submit></div>
      </form>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted">{[s.min && s.max ? `Mercado: ${brl(s.min)} a ${brl(s.max)}` : "", diff ? `médio ${brl(s.suggested)}` : ""].filter(Boolean).join(" · ")} {st?.ok && <b className="text-green-700">✓ {st.message}</b>}{st?.error && <b className="text-red-700">{Object.values(st.fields || {})[0] || st.error}</b>}</span>
        <form action={deleteService}><input type="hidden" name="id" value={s.id} /><ConfirmButton message={`Remover "${s.name}" da sua tabela?`} className="font-bold text-red-700 hover:underline">Remover</ConfirmButton></form>
      </div>
    </div>
  );
}
