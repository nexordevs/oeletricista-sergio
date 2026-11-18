import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, fmtPhone, waLink } from "@/lib/money";
import { setLeadStatus } from "../actions";
import { IconWhatsApp } from "@/components/icons";
const ST: Record<LeadStatus, [string, string]> = { NEW: ["Nova", "bg-brand text-navy"], CONTACTED: ["Em contato", "bg-blue-100 text-blue-800"], CLOSED: ["Fechado", "bg-green-100 text-green-800"], DISCARDED: ["Descartado", "bg-gray-100 text-gray-600"] };
export default async function Solicitacoes({ searchParams }: { searchParams: { s?: string } }) {
  await requireAdmin();
  const s = searchParams.s && searchParams.s in ST ? (searchParams.s as LeadStatus) : undefined;
  const leads = await prisma.leadRequest.findMany({ where: s ? { status: s } : {}, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><Link href="/admin/solicitacoes" className={`badge px-3 py-1.5 text-sm ${!s ? "bg-navy text-white" : "bg-white text-navy"}`}>Todas</Link>{(Object.keys(ST) as LeadStatus[]).map((k) => <Link key={k} href={`?s=${k}`} className={`badge px-3 py-1.5 text-sm ${s === k ? "bg-navy text-white" : "bg-white text-navy"}`}>{ST[k][0]}</Link>)}</div>
      {leads.length === 0 && <div className="card text-center text-muted">Nenhuma solicitação {s ? "com este status" : "recebida ainda"}.</div>}
      <div className="grid gap-3 md:grid-cols-2">{leads.map((l) => (
        <div key={l.id} className="card space-y-2">
          <div className="flex items-start justify-between gap-2"><div><p className="font-bold text-navy">{l.name}</p><p className="text-sm text-muted">{l.neighborhood} · {fmtDate(l.createdAt)}</p></div><span className={`badge ${ST[l.status][1]}`}>{ST[l.status][0]}</span></div>
          <p className="text-sm"><b>{l.service}</b>{l.description && <> — {l.description}</>}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a href={waLink(l.phone, `Olá, ${l.name.split(" ")[0]}! Aqui é o Sergio, eletricista. Recebi seu pedido de orçamento (${l.service}).`)} target="_blank" rel="noopener" className="btn-wa btn-sm"><IconWhatsApp className="h-4 w-4" /> {fmtPhone(l.phone)}</a>
            <form action={setLeadStatus} className="flex gap-1"><input type="hidden" name="id" value={l.id} />
              {(Object.keys(ST) as LeadStatus[]).filter((k) => k !== l.status).map((k) => <button key={k} name="status" value={k} className="btn-ghost btn-sm text-xs">{ST[k][0]}</button>)}</form>
          </div>
        </div>))}
      </div>
    </div>
  );
}
