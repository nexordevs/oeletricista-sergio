"use client";
// Busca de aparelhos por nome (sem acento) — a lista tem mais de 200 itens.
import { useState } from "react";
import { PRESETS } from "@/lib/eletrica/dimensionamento";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Aparelhos que batem com o texto (sem acento; nome antes do grupo). */
export function buscarAparelhos(q: string, max = 15) {
  const termos = norm(q).replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (!termos.length) return [];
  const temTodos = (s: string) => termos.every((t) => norm(s).replace(/\./g, "").includes(t));
  return PRESETS.map((p, i) => ({ p, i })).filter((x) => temTodos(`${x.p.nome} ${x.p.grupo}`))
    .sort((a, b) => Number(temTodos(b.p.nome)) - Number(temTodos(a.p.nome)) || a.i - b.i).slice(0, max);
}

/** Campo do nome da carga com sugestões da lista enquanto digita. */
export function NomeComSugestao({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick: (i: number) => void }) {
  const [aberto, setAberto] = useState(false);
  const achados = aberto ? buscarAparelhos(value, 8) : [];
  return (
    <div className="relative min-w-0 flex-1">
      <input className="input py-2 font-bold" aria-label="Nome da carga" autoComplete="off" value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }} onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => { if (e.key === "Escape") setAberto(false); if (e.key === "Enter" && achados[0]) { e.preventDefault(); onPick(achados[0].i); setAberto(false); } }} />
      {achados.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 divide-y divide-line overflow-auto rounded-xl border border-line bg-white shadow-lg" role="listbox">
          {achados.map(({ p, i }) => (
            <li key={i}><button type="button" className="w-full px-3 py-2 text-left hover:bg-light" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(i); setAberto(false); }}>
              <span className="block text-sm font-bold text-navy">{p.nome}</span><span className="text-xs text-muted">{p.grupo}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BuscaAparelho({ onPick, placeholder = "Buscar aparelho: air fryer, bomba, ar 12000…" }: { onPick: (i: number) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const termos = q.trim() ? [q] : [];
  const achados = buscarAparelhos(q);
  return (
    <div>
      <input type="search" className="input" aria-label="Buscar aparelho" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      {termos.length > 0 && (
        <ul className="mt-1 max-h-72 divide-y divide-line overflow-auto rounded-xl border border-line bg-white">
          {achados.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nada encontrado. Escolha pela lista ou use “carga personalizada”.</li>}
          {achados.map(({ p, i }) => (
            <li key={i}><button type="button" className="w-full px-3 py-2 text-left hover:bg-light" onClick={() => { onPick(i); setQ(""); }}>
              <span className="block text-sm font-bold text-navy">{p.nome}</span><span className="text-xs text-muted">{p.grupo}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
