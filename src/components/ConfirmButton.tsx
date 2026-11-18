"use client";
import { useFormStatus } from "react-dom";
export function ConfirmButton({ message, className, children, name, value }: { message: string; className?: string; children: React.ReactNode; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending} className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{pending ? "Aguarde..." : children}</button>;
}
