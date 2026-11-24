"use client";
// Divisão do valor do orçamento (só o eletricista vê): ajudante, material e quanto ficou para ele.
import { useState } from "react";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { saveSplit } from "@/app/painel/orcamentos/actions";
import { Submit, FormMessage, Field } from "@/components/ui";
import { brl } from "@/lib/money";

const parse = (s: string) => { const n = Number(String(s).replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number) => (n ? n.toFixed(2).replace(".", ",") : "");

export function SplitForm({ id, total, helperName, helperAmount, materialCost, approved, compact }: { id: string; total: number; helperName: string | null; helperAmount: number; materialCost: number; approved: boolean; compact?: boolean }) {
  const [s, a, pending] = useStickyAction(saveSplit);
  const [h, setH] = useState(fmt(helperAmount));
  const [m, setM] = useState(fmt(materialCost));
  const own = Math.round((total - parse(h) - parse(m)) * 100) / 100;
  const pct = total > 0 ? Math.round((own / total) * 100) : 0;
  return (
    <StickyForm pending={pending} onSubmit={a} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage state={s} />
      <div className={`grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-3"}`}>
        <div className={compact ? "col-span-2" : ""}><Field label="Ajudante (nome, opcional)" name="helperName" state={s}><input id="helperName" name="helperName" defaultValue={helperName ?? ""} className="input" placeholder="Ex.: João" /></Field></div>
        <Field label="Pago ao ajudante (R$)" name="helperAmount" state={s}><input id="helperAmount" name="helperAmount" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} className="input text-right" placeholder="0,00" /></Field>
        <Field label="Material, custo (R$)" name="materialCost" state={s}><input id="materialCost" name="materialCost" inputMode="decimal" value={m} onChange={(e) => setM(e.target.value)} className="input text-right" placeholder="0,00" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-light p-3 text-center text-sm">
        <div><p className="text-xs font-bold uppercase text-muted">Total</p><b className="text-navy">{brl(total)}</b></div>
        <div><p className="text-xs font-bold uppercase text-muted">Ajudante + material</p><b className="text-red-700">− {brl(parse(h) + parse(m))}</b></div>
        <div className="rounded-lg bg-navy py-1 text-white"><p className="text-xs font-bold uppercase text-navy-soft">Ficou pra você</p><b className={`text-lg ${own < 0 ? "text-red-300" : "text-brand"}`}>{brl(own)}</b>{total > 0 && <span className="block text-[11px] text-navy-soft">{pct}% do total</span>}</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{approved ? "Ao salvar, as saídas do ajudante e do material entram sozinhas no Financeiro." : "Entra no Financeiro quando o orçamento for marcado como Aprovado."} O cliente nunca vê isso.</p>
        <Submit className="btn-navy btn-sm">Salvar divisão</Submit>
      </div>
    </StickyForm>
  );
}
