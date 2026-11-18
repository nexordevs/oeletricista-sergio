"use client";
import { useEffect, useRef, useActionState } from "react";
import type { ActionState } from "@/lib/form";

/** Formulário genérico para ações do servidor com mensagem de sucesso/erro. */
export function ActionForm({ action, children, className = "space-y-4", reset }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; children: React.ReactNode; className?: string; reset?: boolean }) {
  const [s, a] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok && reset) ref.current?.reset(); }, [s, reset]);
  return (
    <form ref={ref} action={a} className={className} noValidate>
      {s?.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{s.error}{s.fields && <ul className="mt-1 list-disc pl-5 font-normal">{Object.entries(s.fields).map(([k, v]) => <li key={k}><b>{k}</b>: {v}</li>)}</ul>}</div>}
      {s?.ok && s.message && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{s.message}</p>}
      {children}
    </form>
  );
}
