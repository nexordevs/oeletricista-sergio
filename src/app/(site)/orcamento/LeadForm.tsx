"use client";
import { useActionState } from "react";
import { createLead } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";
import { IconWhatsApp, IconCheck } from "@/components/icons";

export function LeadForm({ services, wa, preset, reviewUrl }: { services: string[]; wa: string; preset?: string; reviewUrl?: string }) {
  const [state, action] = useActionState(createLead, undefined);
  if (state?.ok && state.data) {
    const d = state.data;
    const msg = `Olá! Acabei de pedir um orçamento pelo site.\nNome: ${d.name}\nBairro: ${d.neighborhood}\nServiço: ${d.service}${d.description ? `\nDetalhes: ${d.description}` : ""}`;
    return (
      <div className="card text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700"><IconCheck className="h-7 w-7" /></span>
        <p className="mt-4 text-xl font-bold text-navy">{state.message}</p>
        <p className="mt-1 text-muted">Quer agilizar? Continue a conversa pelo WhatsApp:</p>
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener" className="btn-wa mt-5"><IconWhatsApp /> Continuar no WhatsApp</a>
        {reviewUrl && <p className="mt-6 text-sm text-muted">Já foi atendido por mim? <a href={reviewUrl} target="_blank" rel="noopener" className="font-bold text-navy underline">Deixe sua avaliação no Google</a> ⭐</p>}
      </div>
    );
  }
  return (
    <form action={action} className="card space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seu nome" name="name" state={state}><input id="name" name="name" className="input" autoComplete="name" required /></Field>
        <Field label="Telefone / WhatsApp" name="phone" state={state}><input id="phone" name="phone" className="input" inputMode="tel" autoComplete="tel" placeholder="(83) 9 0000-0000" required /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bairro" name="neighborhood" state={state}><input id="neighborhood" name="neighborhood" className="input" required /></Field>
        <Field label="Serviço desejado" name="service" state={state}>
          <select id="service" name="service" className="input" defaultValue={preset || ""} required>
            <option value="" disabled>Selecione…</option>
            {services.map((s) => <option key={s}>{s}</option>)}
            <option>Outro serviço</option>
          </select>
        </Field>
      </div>
      <Field label="Descreva o que precisa" name="description" state={state}><textarea id="description" name="description" rows={4} className="input" placeholder="Ex.: chuveiro desarmando o disjuntor, preciso trocar…" /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Submit className="btn-primary w-full sm:w-auto" pending="Enviando...">Enviar solicitação</Submit>
      <p className="text-xs text-muted">Seus dados são usados apenas para retornar o contato sobre este orçamento.</p>
    </form>
  );
}
