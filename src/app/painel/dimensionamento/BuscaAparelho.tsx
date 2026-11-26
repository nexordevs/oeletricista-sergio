"use client";
// Busca de aparelhos por nome (sem acento) — a lista tem mais de 200 itens.
import { useState } from "react";
import { PRESETS } from "@/lib/eletrica/dimensionamento";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function BuscaAparelho({ onPick, placeholder = "Buscar aparelho: air fryer, bomba, ar 12000…" }: { onPick: (i: number) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const termos = norm(q).replace(/\./g, "").split(/\s+/).filter(Boolean);
  const achados = termos.length === 0 ? [] : PRESETS.map((p, i) => ({ p, i, t: norm(`${p.nome} ${p.grupo}`).replace(/\./g, "") })).filter((x) => termos.every((t) => x.t.includes(t)))
    .sort((a, b) => Number(termos.every((t) => norm(b.p.nome).replace(/\./g, "").includes(t))) - Number(termos.every((t) => norm(a.p.nome).replace(/\./g, "").includes(t))) || a.i - b.i).slice(0, 15);
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
