"use client";
import { useEffect, useRef, useState } from "react";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { Submit, FormMessage, Field } from "@/components/ui";
import { saveCategory, addExpense, saveBill, payBill, saveGoal, depositGoal } from "./actions";
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

// ── Contas fixas ─────────────────────────────────────────────────────
export function BillForm({ cats, b }: { cats: Cat[]; b?: { id: string; name: string; amount: number; dueDay: number; categoryId: string | null } }) {
  const [s, a, pending] = useStickyAction(saveBill);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok && !b) ref.current?.reset(); }, [s, b]);
  const k = b?.id ?? "nb";
  return (
    <StickyForm ref={ref} pending={pending} onSubmit={a} className="space-y-2" noValidate>
      {b && <input type="hidden" name="id" value={b.id} />}
      <FormMessage state={s} />
      <div className="grid grid-cols-[1fr_110px_70px] gap-2">
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`bn${k}`}>Conta</label><input id={`bn${k}`} name="name" defaultValue={b?.name} className="input py-2" placeholder="Ex.: Energia" /></div>
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`ba${k}`}>Valor (R$)</label><input id={`ba${k}`} name="amount" inputMode="decimal" defaultValue={b ? fmt(b.amount) : ""} className="input py-2 text-right" placeholder="0,00" /></div>
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`bd${k}`}>Dia</label><input id={`bd${k}`} name="dueDay" inputMode="numeric" defaultValue={b?.dueDay ?? ""} className="input py-2 text-center" placeholder="10" /></div>
      </div>
      <div className="flex items-center gap-2">
        <select name="categoryId" aria-label="Categoria da conta" defaultValue={b?.categoryId ?? ""} className="input w-auto flex-1 py-2 text-sm"><option value="">Sem categoria</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <Submit className="btn-navy btn-sm" pending="...">{b ? "Salvar" : "Criar conta"}</Submit>
      </div>
    </StickyForm>
  );
}

export function PayBillForm({ id, amount, today }: { id: string; amount: number; today: string }) {
  const [s, a, pending] = useStickyAction(payBill);
  return (
    <StickyForm pending={pending} onSubmit={a} className="flex flex-wrap items-center justify-end gap-2" noValidate>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="date" value={today} />
      <label className="sr-only" htmlFor={`pay${id}`}>Valor pago</label>
      <input id={`pay${id}`} name="amount" inputMode="decimal" defaultValue={fmt(amount)} className="input w-24 py-1.5 text-right text-sm" />
      <Submit className="btn-primary btn-sm" pending="...">Pagar</Submit>
      {s?.error && <p className="w-full text-right text-xs font-bold text-red-700">{Object.values(s.fields || {})[0] || s.error}</p>}
    </StickyForm>
  );
}

// ── Metas ────────────────────────────────────────────────────────────
export function GoalForm({ g }: { g?: { id: string; name: string; target: number; deadline: string } }) {
  const [s, a, pending] = useStickyAction(saveGoal);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok && !g) ref.current?.reset(); }, [s, g]);
  const k = g?.id ?? "ng";
  return (
    <StickyForm ref={ref} pending={pending} onSubmit={a} className="space-y-2" noValidate>
      {g && <input type="hidden" name="id" value={g.id} />}
      <FormMessage state={s} />
      <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`gn${k}`}>Meta</label><input id={`gn${k}`} name="name" defaultValue={g?.name} className="input py-2" placeholder="Ex.: Furadeira nova, moto, viagem" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`gt${k}`}>Valor da meta (R$)</label><input id={`gt${k}`} name="target" inputMode="decimal" defaultValue={g ? fmt(g.target) : ""} className="input py-2 text-right" placeholder="0,00" /></div>
        <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`gd${k}`}>Até quando (opcional)</label><input id={`gd${k}`} name="deadline" type="date" defaultValue={g?.deadline ?? ""} className="input py-2" /></div>
      </div>
      <Submit className="btn-navy btn-sm w-full" pending="...">{g ? "Salvar meta" : "Criar meta"}</Submit>
    </StickyForm>
  );
}

export function DepositForm({ id, today, suggestion }: { id: string; today: string; suggestion: number | null }) {
  const [s, a, pending] = useStickyAction(depositGoal);
  const [v, setV] = useState(suggestion ? fmt(suggestion) : "");
  useEffect(() => { if (s?.ok) setV(""); }, [s]);
  return (
    <StickyForm pending={pending} onSubmit={a} className="space-y-1" noValidate>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="date" value={today} />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`dep${id}`}>Valor guardado</label>
        <input id={`dep${id}`} name="amount" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} className="input flex-1 py-2 text-right" placeholder="Quanto guardou? (R$)" />
        <Submit className="btn-primary btn-sm" pending="...">Guardar</Submit>
      </div>
      {s?.ok && <p className="text-xs font-bold text-green-700">{s.message}</p>}
      {s?.error && <p className="text-xs font-bold text-red-700">{Object.values(s.fields || {})[0] || s.error}</p>}
    </StickyForm>
  );
}
