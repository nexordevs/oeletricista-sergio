"use client";
import { useFormStatus } from "react-dom";
import { usePendingOverride } from "./form-kit";
export function ConfirmButton({ message, className, children, name, value }: { message: string; className?: string; children: React.ReactNode; name?: string; value?: string }) {
  const status = useFormStatus(); const override = usePendingOverride();
  const pending = override ?? status.pending;
  return <button type="submit" name={name} value={value} disabled={pending} className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{pending ? "Aguarde..." : children}</button>;
}
