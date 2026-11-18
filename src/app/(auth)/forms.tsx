"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup, requestReset, resetPassword } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [s, a] = useActionState(login, undefined);
  return (
    <form action={a} className="space-y-4" noValidate>
      <FormMessage state={s} />
      <input type="hidden" name="next" value={next || ""} />
      <Field label="E-mail" name="email" state={s}><input id="email" name="email" type="email" autoComplete="email" className="input" required /></Field>
      <Field label="Senha" name="password" state={s}><input id="password" name="password" type="password" autoComplete="current-password" className="input" required /></Field>
      <Submit className="btn-primary w-full" pending="Entrando...">Entrar</Submit>
      <div className="flex justify-between text-sm"><Link href="/recuperar-senha" className="font-bold text-navy hover:underline">Esqueci a senha</Link><Link href="/cadastro" className="font-bold text-navy hover:underline">Criar conta</Link></div>
    </form>
  );
}

export function SignupForm({ plano }: { plano?: string }) {
  const [s, a] = useActionState(signup, undefined);
  return (
    <form action={a} className="space-y-4" noValidate>
      <FormMessage state={s} />
      <input type="hidden" name="plano" value={plano || ""} />
      <Field label="Seu nome" name="name" state={s}><input id="name" name="name" autoComplete="name" className="input" required /></Field>
      <Field label="E-mail" name="email" state={s}><input id="email" name="email" type="email" autoComplete="email" className="input" required /></Field>
      <Field label="Crie uma senha" name="password" state={s} hint="Mínimo de 8 caracteres, com letras e números."><input id="password" name="password" type="password" autoComplete="new-password" className="input" required /></Field>
      <div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" className="mt-1 h-4 w-4 accent-navy" /> <span>Li e aceito os <Link href="/termos" target="_blank" className="font-bold underline">termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-bold underline">política de privacidade</Link>.</span></label>
        {s?.fields?.terms && <p className="mt-1 text-sm font-bold text-red-700">{s.fields.terms}</p>}
      </div>
      <Submit className="btn-primary w-full" pending="Criando conta...">Criar minha conta</Submit>
      <p className="text-center text-sm">Já tem conta? <Link href="/entrar" className="font-bold text-navy hover:underline">Entrar</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [s, a] = useActionState(requestReset, undefined);
  return (
    <form action={a} className="space-y-4" noValidate>
      <FormMessage state={s} />
      {!s?.ok && <>
        <Field label="E-mail da sua conta" name="email" state={s}><input id="email" name="email" type="email" autoComplete="email" className="input" required /></Field>
        <Submit className="btn-primary w-full" pending="Enviando...">Enviar link</Submit>
      </>}
      <p className="text-center text-sm"><Link href="/entrar" className="font-bold text-navy hover:underline">Voltar para o login</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, a] = useActionState(resetPassword, undefined);
  if (s?.ok) return <div className="space-y-4"><FormMessage state={s} /><Link href="/entrar" className="btn-primary w-full">Entrar</Link></div>;
  return (
    <form action={a} className="space-y-4" noValidate>
      <FormMessage state={s} />
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" name="password" state={s} hint="Mínimo de 8 caracteres, com letras e números."><input id="password" name="password" type="password" autoComplete="new-password" className="input" required /></Field>
      <Field label="Repita a nova senha" name="confirm" state={s}><input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" required /></Field>
      <Submit className="btn-primary w-full">Salvar nova senha</Submit>
    </form>
  );
}
