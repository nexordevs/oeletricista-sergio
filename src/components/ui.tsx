"use client";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { usePendingOverride } from "./form-kit";
import type { ActionState } from "@/lib/form";

export function Submit({ children, className = "btn-primary", pending: pendingLabel = "Salvando..." }: { children: React.ReactNode; className?: string; pending?: string }) {
  const status = useFormStatus(); const override = usePendingOverride();
  const pending = override ?? status.pending;
  return <button type="submit" className={className} disabled={pending}>{pending ? pendingLabel : children}</button>;
}

// Mostra o resultado e rola a tela até ele (ou até o 1º campo com erro):
// em formulários longos o botão "Salvar" fica embaixo e a mensagem lá em cima, fora da vista.
export function FormMessage({ state }: { state: ActionState }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !state) return;
    const firstErr = state.fields && el.closest("form")?.querySelector<HTMLElement>("[data-field-error]");
    const target = firstErr || el;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (firstErr) firstErr.parentElement?.querySelector<HTMLElement>("input,textarea,select")?.focus({ preventScroll: true });
  }, [state]);
  if (!state) return null;
  if (state.error) return <p ref={ref} role="alert" className="scroll-mt-24 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{state.error}</p>;
  if (state.ok && state.message) return <p ref={ref} role="status" className="scroll-mt-24 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{state.message}</p>;
  return null;
}

export function Field({ label, name, state, hint, children }: { label: string; name: string; state?: ActionState; hint?: string; children: React.ReactNode }) {
  const err = state?.fields?.[name];
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {err ? <p data-field-error className="mt-1 text-sm font-bold text-red-700">{err}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
