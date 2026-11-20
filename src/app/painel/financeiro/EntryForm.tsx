"use client";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { useEffect, useRef, useState } from "react";
import { addEntry } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";

export function EntryForm({ quotes, today }: { quotes: { id: string; label: string; total: string }[]; today: string }) {
  const [s, a, aPending] = useStickyAction(addEntry);
  const ref = useRef<HTMLFormElement>(null);
  const [desc, setDesc] = useState(""); const [amount, setAmount] = useState("");
  useEffect(() => { if (s?.ok) { ref.current?.reset(); setDesc(""); setAmount(""); } }, [s]);
  return (
    <StickyForm ref={ref} pending={aPending} onSubmit={a} className="space-y-3" noValidate>
      <FormMessage state={s} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-line p-3 font-bold text-green-700 has-[:checked]:border-green-600 has-[:checked]:bg-green-50"><input type="radio" name="type" value="INCOME" defaultChecked className="sr-only" /> Entrada</label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-line p-3 font-bold text-red-700 has-[:checked]:border-red-600 has-[:checked]:bg-red-50"><input type="radio" name="type" value="EXPENSE" className="sr-only" /> Saída</label>
      </div>
      {quotes.length > 0 && (
        <Field label="Recebimento de orçamento aprovado (opcional)" name="quoteId" state={s}>
          <select id="quoteId" name="quoteId" className="input" defaultValue="" onChange={(e) => { const q = quotes.find((x) => x.id === e.target.value); if (q) { setDesc(`Recebimento ${q.label}`); setAmount(q.total); } }}>
            <option value="">—</option>{quotes.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
          </select>
        </Field>
      )}
      <Field label="Descrição" name="description" state={s}><input id="description" name="description" value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder="Ex.: Compra de material, ajudante…" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Valor (R$)" name="amount" state={s}><input id="amount" name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="input" /></Field>
        <Field label="Data" name="date" state={s}><input id="date" name="date" type="date" defaultValue={today} className="input" /></Field>
      </div>
      <Submit className="btn-primary w-full">Registrar</Submit>
    </StickyForm>
  );
}
