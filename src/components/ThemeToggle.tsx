"use client";
// Troca entre tema claro (padrão) e escuro. Guarda no cookie "tema" (1 ano) e aplica na hora.
import { useState } from "react";
import type { Theme } from "@/lib/theme";

export function ThemeToggle({ initial, compact, onDark }: { initial: Theme; compact?: boolean; onDark?: boolean }) {
  const [t, setT] = useState<Theme>(initial);
  const set = (v: Theme) => {
    setT(v);
    document.cookie = `tema=${v === "dark" ? "escuro" : "claro"}; path=/; max-age=31536000; samesite=lax`;
    document.querySelectorAll<HTMLElement>("[data-theme-root]").forEach((el) => el.setAttribute("data-theme", v));
  };
  const btn = (v: Theme, label: string, icon: string) => (
    <button type="button" onClick={() => set(v)} aria-pressed={t === v}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${t === v ? "bg-brand text-navy" : onDark ? "text-navy-soft hover:text-white" : "text-muted hover:text-ink"}`}>
      <span aria-hidden>{icon}</span>{label}
    </button>
  );
  return (
    <div className={compact ? "" : "space-y-1.5"}>
      {!compact && <p className={`text-xs font-bold uppercase tracking-wide ${onDark ? "text-navy-soft" : "text-muted"}`}>Aparência</p>}
      <div role="group" aria-label="Tema da interface" className={`flex gap-1 rounded-xl p-1 ${onDark ? "bg-white/10" : "bg-light"}`}>
        {btn("light", "Claro", "☀️")}{btn("dark", "Escuro", "🌙")}
      </div>
    </div>
  );
}
