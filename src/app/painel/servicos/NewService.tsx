"use client";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { useEffect, useRef } from "react";
import { saveService } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";
export function NewService({ categories }: { categories: string[] }) {
  const [s, a, aPending] = useStickyAction(saveService);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok) ref.current?.reset(); }, [s]);
  return (
    <StickyForm ref={ref} pending={aPending} onSubmit={a} className="space-y-3" noValidate>
      <FormMessage state={s} />
      <Field label="Nome do serviço" name="name" state={s}><input id="name" name="name" className="input" placeholder="Ex.: Instalação de interfone" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unidade" name="unit" state={s}><input id="unit" name="unit" defaultValue="un" className="input" /></Field>
        <Field label="Preço (R$)" name="price" state={s}><input id="price" name="price" inputMode="decimal" className="input" placeholder="0,00" /></Field>
      </div>
      <Field label="Categoria" name="category" state={s}>
        <input id="category" name="category" list="cats" className="input" placeholder="Meus serviços" />
        <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </Field>
      <Submit className="btn-primary w-full">Adicionar serviço</Submit>
    </StickyForm>
  );
}
