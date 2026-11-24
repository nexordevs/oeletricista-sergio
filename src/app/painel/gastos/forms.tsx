"use client";
import { useEffect, useRef, useState } from "react";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { Submit, FormMessage, Field } from "@/components/ui";
import { saveCategory, addExpense } from "./actions";
import { GROUPS, type Group } from "@/lib/budget";

type Cat = { id: string; name: string };

export function ExpenseForm({ cats, today }: { cats: Cat[]; today: string }) {
  const [s, a, pending] = useStickyAction(addExpense);
  const ref = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState(""); const [desc, setDesc] = useState("");
  useEffect(() => { if (s?.ok) { setAmount(""); setDesc(""); } }, [s]);
  return (
    <StickyForm ref={ref} pending={pending} onSubmit={a} className="space-y-3" noValidate>
      <FormMessage state={s} />
      <Field label="Categoria" name="categoryId" state={s}>
        <select id="categoryId" name="categoryId" className="input" defaultValue=""><option value="" disabled>Escolha…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Valor (R$)" name="amount" state={s}><input id="amount" name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input text-right" placeholder="0,00" /></Field>
        <Field label="Data" name="date" state={s}><input id="date" name="date" type="date" defaultValue={today} className="input" /></Field>
      </div>
      <Field label="Descrição (opcional)" name="description" state={s}><input id="description" name="description" value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder="Ex.: conta de luz de novembro" /></Field>
      <Submit className="btn-primary w-full">Lançar gasto</Submit>
    </StickyForm>
  );
}

const fmt = (n: number) => (n ? n.toFixed(2).replace(".", ",") : "");

export function CategoryForm({ c }: { c?: { id: string; name: string; planned: number; group: Group } }) {
  const [s, a, pending] = useStickyAction(saveCategory);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok && !c) ref.current?.reset(); }, [s, c]);
  const k = c?.id ?? "new";
  return (
    <StickyForm ref={ref} pending={pending} onSubmit={a} className="space-y-2" noValidate>
      {c && <input type="hidden" name="id" value={c.id} />}
      {!c && <FormMessage state={s} />}
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`n${k}`}>Categoria</label><input id={`n${k}`} name="name" defaultValue={c?.name} className="input py-2" placeholder="Ex.: Manutenção do carro" /></div>
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`p${k}`}>Planejado/mês</label><input id={`p${k}`} name="planned" inputMode="decimal" defaultValue={fmt(c?.planned ?? 0)} className="input py-2 text-right" placeholder="0,00" /></div>
      </div>
      <div className="flex items-center gap-2">
        <select name="group" aria-label="Grupo" defaultValue={c?.group ?? "ESSENCIAL"} className="input w-auto flex-1 py-2 text-sm">{(Object.keys(GROUPS) as Group[]).map((g) => <option key={g} value={g}>{GROUPS[g].label} ({GROUPS[g].pct}%)</option>)}</select>
        <Submit className="btn-navy btn-sm" pending="...">{c ? "Salvar" : "Criar"}</Submit>
      </div>
      {c && s?.ok && <p className="text-xs font-bold text-green-700">✓ {s.message}</p>}
      {c && s?.error && <p className="text-xs font-bold text-red-700">{Object.values(s.fields || {})[0] || s.error}</p>}
    </StickyForm>
  );
}
