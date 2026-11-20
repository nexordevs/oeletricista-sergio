"use client";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { saveAccount } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";
export function AccountForm({ name, email }: { name: string; email: string }) {
  const [s, a, aPending] = useStickyAction(saveAccount);
  return (
    <StickyForm pending={aPending} onSubmit={a} className="card max-w-xl space-y-4" noValidate>
      <FormMessage state={s} />
      <Field label="Seu nome" name="name" state={s}><input id="name" name="name" defaultValue={name} className="input" /></Field>
      <div><span className="label">E-mail de acesso</span><p className="rounded-xl bg-light px-3.5 py-3">{email}</p></div>
      <p className="pt-2 font-bold text-navy">Trocar senha (opcional)</p>
      <Field label="Senha atual" name="current" state={s}><input id="current" name="current" type="password" autoComplete="current-password" className="input" /></Field>
      <Field label="Nova senha" name="password" state={s}><input id="password" name="password" type="password" autoComplete="new-password" className="input" /></Field>
      <Submit>Salvar</Submit>
    </StickyForm>
  );
}
