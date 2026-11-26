"use client";
// Desenho do quadro de distribuição montado (SVG) + baixar como imagem PNG para mandar ao cliente.
import { useRef } from "react";
import type { Projeto } from "@/lib/eletrica/dimensionamento";

type Mod = { tipo: "geral" | "dr" | "dps" | "circ" | "reserva"; polos: number; topo: string; etiqueta: string };
const MW = 34, MH = 96, PAD = 22, ROWGAP = 22; // módulo DIN (largura/altura em px), margem e espaço entre trilhos

const curto = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function QuadroDesenho({ pj, titulo }: { pj: Projeto; titulo: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const porTrilho = pj.quadro <= 8 ? pj.quadro : pj.quadro === 18 ? 9 : 12;
  const mods: Mod[] = [
    { tipo: "geral", polos: pj.polosGeral, topo: `${pj.geral.disjuntor ?? "—"}A`, etiqueta: "GERAL" },
    { tipo: "dr", polos: pj.dr.polos, topo: `${pj.dr.corrente}A`, etiqueta: "DR 30mA" },
    ...Array.from({ length: pj.dps }, (_, i) => ({ tipo: "dps" as const, polos: 1, topo: "DPS", etiqueta: i === pj.dps - 1 ? "N" : `F${i + 1}` })),
    ...pj.circuitos.map((c) => ({ tipo: "circ" as const, polos: c.polos, topo: `${c.r.disjuntor ?? "—"}A`, etiqueta: `C${c.n}` })),
  ];
  // distribui nos trilhos sem partir disjuntor de 2/3 polos entre trilhos; sobra = reserva
  const trilhos: Mod[][] = [[]];
  const usado = (t: Mod[]) => t.reduce((a, m) => a + m.polos, 0);
  for (const m of mods) {
    if (usado(trilhos[trilhos.length - 1]) + m.polos > porTrilho) trilhos.push([]);
    trilhos[trilhos.length - 1].push(m);
  }
  const nTrilhos = Math.max(trilhos.length, Math.ceil(pj.quadro / porTrilho));
  while (trilhos.length < nTrilhos) trilhos.push([]);
  for (const t of trilhos) while (usado(t) < porTrilho) t.push({ tipo: "reserva", polos: 1, topo: "", etiqueta: "" });

  const W = PAD * 2 + porTrilho * MW + 24, boxH = PAD + nTrilhos * (MH + ROWGAP) + 52;
  const legenda = pj.circuitos;
  const LH = 17, legH = 34 + legenda.length * LH + 22;
  const H = 40 + boxH + legH;

  const baixar = () => {
    const svg = ref.current; if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = W * 2; c.height = H * 2;
      const ctx = c.getContext("2d")!; ctx.scale(2, 2); ctx.drawImage(img, 0, 0, W, H);
      c.toBlob((b) => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "quadro-de-disjuntores.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  };

  return (
    <div className="card p-0">
      <p className="rounded-t-2xl bg-navy px-4 py-2.5 text-sm font-bold uppercase text-white">Como fica o quadro</p>
      <div className="overflow-x-auto p-3">
        <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full" style={{ maxWidth: Math.max(360, W) }} role="img" aria-label={`Quadro de ${pj.quadro} disjuntores com ${pj.circuitos.length} circuitos`} fontFamily="Arial, Helvetica, sans-serif">
          <rect width={W} height={H} fill="#ffffff" />
          <text x={W / 2} y={18} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0b2545">{titulo}</text>
          <text x={W / 2} y={33} textAnchor="middle" fontSize={10.5} fill="#5b6b7f">Quadro de {pj.quadro} disjuntores · {pj.modulos} usados + {pj.quadro - pj.modulos > 0 ? pj.quadro - pj.modulos : pj.reserva} reserva</text>
          {/* caixa do quadro */}
          <g transform="translate(0,40)">
            <rect x={4} y={0} width={W - 8} height={boxH} rx={10} fill="#e9edf2" stroke="#9aa7b6" strokeWidth={2} />
            <rect x={12} y={8} width={W - 24} height={boxH - 16} rx={6} fill="#f7f9fb" stroke="#c6cfd9" />
            {trilhos.map((t, ti) => {
              const y = PAD + ti * (MH + ROWGAP);
              let x = PAD + 12;
              return (
                <g key={ti}>
                  {/* trilho DIN */}
                  <rect x={PAD + 4} y={y + MH / 2 - 9} width={porTrilho * MW + 16} height={18} fill="#b8c2cd" />
                  {t.map((m, mi) => {
                    const w = m.polos * MW, x0 = x; x += w;
                    return <Modulo key={mi} m={m} x={x0} y={y} w={w} />;
                  })}
                </g>
              );
            })}
            {/* barramentos de neutro e terra */}
            <g transform={`translate(${PAD + 4},${boxH - 46})`}>
              <Barra x={0} cor="#1e6fd9" rot="NEUTRO" w={(porTrilho * MW) / 2 - 6} />
              <Barra x={(porTrilho * MW) / 2 + 10} cor="#1f9d55" rot="TERRA" w={(porTrilho * MW) / 2 - 6} />
            </g>
          </g>
          {/* legenda (etiquetas do quadro) */}
          <g transform={`translate(${PAD},${40 + boxH + 26})`}>
            <text fontSize={12} fontWeight={700} fill="#0b2545">Identificação dos circuitos</text>
            {legenda.map((c, i) => (
              <g key={c.n} transform={`translate(0,${20 + i * LH})`}>
                <rect x={0} y={-11} width={28} height={14} rx={3} fill="#0b2545" />
                <text x={14} y={0} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff">C{c.n}</text>
                <text x={36} y={0} fontSize={10.5} fill="#1f2a37">{curto(c.carga.nome, 34)} · {c.r.disjuntor ?? "—"} A{c.polos > 1 ? (c.polos === 2 ? " bipolar" : " tripolar") : ""} · {c.r.secao != null ? String(c.r.secao).replace(".", ",") : "—"} mm²{c.r.dr === "obrigatorio" ? " · DR" : ""}</text>
              </g>
            ))}
            <text y={20 + legenda.length * LH + 4} fontSize={9.5} fill="#5b6b7f">Geral {pj.geral.disjuntor ?? "—"} A · DR {pj.dr.corrente} A 30 mA · {pj.dps} DPS · desenho ilustrativo</text>
          </g>
        </svg>
      </div>
      <div className="px-3 pb-3"><button type="button" onClick={baixar} className="btn-outline w-full">⬇ Baixar imagem do quadro</button>
        <p className="mt-1.5 text-xs text-muted">Imagem ilustrativa para mostrar ao cliente. A posição real segue o quadro e o fabricante escolhidos.</p></div>
    </div>
  );
}

function Barra({ x, cor, rot, w }: { x: number; cor: string; rot: string; w: number }) {
  const furos = Math.max(4, Math.floor(w / 16));
  return (
    <g transform={`translate(${x},0)`}>
      <rect width={w} height={12} rx={2} fill={cor} />
      {Array.from({ length: furos }, (_, i) => <circle key={i} cx={8 + i * ((w - 16) / (furos - 1))} cy={6} r={2.6} fill="#e8eef5" />)}
      <text x={w / 2} y={26} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={cor}>{rot}</text>
    </g>
  );
}

function Modulo({ m, x, y, w }: { m: Mod; x: number; y: number; w: number }) {
  if (m.tipo === "reserva") return (
    <g><rect x={x + 1} y={y + 6} width={w - 2} height={MH - 12} rx={3} fill="#dde3ea" stroke="#c3ccd6" strokeDasharray="3 3" />
      <text x={x + w / 2} y={y + MH / 2 + 3} textAnchor="middle" fontSize={7.5} fill="#8a97a6" transform={`rotate(-90 ${x + w / 2} ${y + MH / 2})`}>reserva</text></g>
  );
  const corpo = m.tipo === "geral" ? "#ffffff" : m.tipo === "dr" ? "#ffffff" : m.tipo === "dps" ? "#4a5563" : "#ffffff";
  const alavanca = m.tipo === "geral" ? "#c62828" : m.tipo === "dr" ? "#1565c0" : "#263238";
  const texto = m.tipo === "dps" ? "#ffffff" : "#1f2a37";
  return (
    <g>
      <rect x={x + 1} y={y} width={w - 2} height={MH} rx={4} fill={corpo} stroke="#7d8894" strokeWidth={1.2} />
      {/* faixa superior com a corrente */}
      <text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={m.tipo === "geral" ? "#c62828" : texto}>{m.topo}</text>
      {m.tipo === "dps" ? (
        <g><rect x={x + 7} y={y + 26} width={w - 14} height={16} rx={2} fill="#2e7d32" /><text x={x + w / 2} y={y + 37} textAnchor="middle" fontSize={7} fill="#fff">OK</text></g>
      ) : (
        <g>
          {/* alavanca (uma barra única ligando os polos) */}
          <rect x={x + 6} y={y + 30} width={w - 12} height={22} rx={3} fill={alavanca} />
          {m.polos > 1 && <rect x={x + 6} y={y + 39} width={w - 12} height={4} fill="#ffffff" opacity={0.35} />}
          {m.tipo === "dr" && <g><circle cx={x + w - 12} cy={y + 64} r={5} fill="#f9a825" /><text x={x + w - 12} y={y + 67} textAnchor="middle" fontSize={7} fontWeight={700} fill="#1f2a37">T</text></g>}
        </g>
      )}
      {/* etiqueta embaixo */}
      <rect x={x + 3} y={y + MH - 24} width={w - 6} height={18} rx={2} fill={m.tipo === "circ" ? "#0b2545" : m.tipo === "geral" ? "#c62828" : m.tipo === "dr" ? "#1565c0" : "#1f2a37"} />
      <text x={x + w / 2} y={y + MH - 11.5} textAnchor="middle" fontSize={m.etiqueta.length > 4 && w < 60 ? 7.5 : 9.5} fontWeight={700} fill="#ffffff">{m.etiqueta}</text>
    </g>
  );
}
