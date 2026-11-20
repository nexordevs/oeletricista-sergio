"use client";
// Formulários com ações do servidor que NÃO apagam o que o usuário digitou quando há erro.
// (No React 19, <form action={...}> limpa os campos automaticamente após o envio.)
import { createContext, startTransition, useActionState, useContext } from "react";
import type { ActionState } from "@/lib/form";

export const PendingContext = createContext<boolean | null>(null);
export const usePendingOverride = () => useContext(PendingContext);

export function useStickyAction(action: (s: ActionState, fd: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending] as const;
}

export function StickyForm({ pending, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { pending: boolean; ref?: React.Ref<HTMLFormElement> }) {
  return <PendingContext.Provider value={pending}><form {...props} /></PendingContext.Provider>;
}
