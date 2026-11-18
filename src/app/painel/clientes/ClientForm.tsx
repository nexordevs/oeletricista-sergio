"use client";
import { useEffect, useRef, useActionState } from "react";
import { saveClient } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";

type C = { id?: string; name?: string; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null };
export function ClientForm({ c = {}, back, onDone }: { c?: C; back?: string; onDone?: () => void }) {
  const [s, a] = useActionState(saveClient, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok && !c.id) { ref.current?.reset(); onDone?.(); } }, [s, c.id, onDone]);
  return (
    <form ref={ref} action={a} className="space-y-4" noValidate>
      <FormMessage state={s} />
      {c.id && <input type="hidden" name="id" value={c.id} />}
      {back && <input type="hidden" name="back" value={back} />}
      <Field label="Nome do cliente" name="name" state={s}><input id="name" name="name" defaultValue={c.name} className="input" placeholder="Ex.: Loja Torras" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone / WhatsApp" name="phone" state={s}><input id="phone" name="phone" defaultValue={c.phone ?? ""} inputMode="tel" className="input" /></Field>
        <Field label="E-mail" name="email" state={s}><input id="email" name="email" type="email" defaultValue={c.email ?? ""} className="input" /></Field>
      </div>
      <Field label="Endereço" name="address" state={s}><input id="address" name="address" defaultValue={c.address ?? ""} className="input" /></Field>
      <Field label="Anotações" name="notes" state={s}><textarea id="notes" name="notes" rows={2} defaultValue={c.notes ?? ""} className="input" /></Field>
      <Submit className="btn-primary w-full sm:w-auto">{c.id ? "Salvar alterações" : "Cadastrar cliente"}</Submit>
    </form>
  );
}
