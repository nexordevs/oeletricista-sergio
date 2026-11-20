"use client";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { useEffect, useRef } from "react";
import { saveService } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";
export function NewService({ categories, kind }: { categories: string[]; kind: "SERVICE" | "MATERIAL" }) {
  const mat = kind === "MATERIAL";
  const [s, a, aPending] = useStickyAction(saveService);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok) ref.current?.reset(); }, [s]);
  return (
    <StickyForm ref={ref} pending={aPending} onSubmit={a} className="space-y-3" noValidate>
      <FormMessage state={s} />
      <input type="hidden" name="kind" value={kind} />
      <Field label={mat ? "Nome do material" : "Nome do serviço"} name="name" state={s}><input id="name" name="name" className="input" placeholder={mat ? "Ex.: Disjuntor Tramontina 25 A" : "Ex.: Instalação de interfone"} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unidade" name="unit" state={s}><input id="unit" name="unit" defaultValue="un" className="input" /></Field>
        <Field label="Preço (R$)" name="price" state={s}><input id="price" name="price" inputMode="decimal" className="input" placeholder="0,00" /></Field>
      </div>
      <Field label="Categoria" name="category" state={s}>
        <input id="category" name="category" list="cats" className="input" placeholder={mat ? "Meus materiais" : "Meus serviços"} />
        <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </Field>
      <Submit className="btn-primary w-full">{mat ? "Adicionar material" : "Adicionar serviço"}</Submit>
    </StickyForm>
  );
}
