"use client";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/form";

export function Submit({ children, className = "btn-primary", pending: pendingLabel = "Salvando..." }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? pendingLabel : children}</button>;
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{state.error}</p>;
  if (state.ok && state.message) return <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{state.message}</p>;
  return null;
}

export function Field({ label, name, state, hint, children }: { label: string; name: string; state?: ActionState; hint?: string; children: React.ReactNode }) {
  const err = state?.fields?.[name];
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {err ? <p className="mt-1 text-sm font-bold text-red-700">{err}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
