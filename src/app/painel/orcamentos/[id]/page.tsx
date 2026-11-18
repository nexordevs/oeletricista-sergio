import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { expireQuotes } from "@/lib/quotes";
import { env } from "@/lib/env";
import { brl, fmtDate, toNum } from "@/lib/money";
import { StatusBadge } from "@/lib/quote-status";
import { pdfFilename } from "@/lib/pdf/QuotePdf";
import { SharePanel } from "./SharePanel";
import { duplicateQuote, deleteQuote, setStatus } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { IconCheck } from "@/components/icons";

const KIND: Record<string, string> = { SERVICE: "Serviço", MATERIAL: "Material", LABOR: "Mão de obra" };

export default async function Detalhe(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { user, access } = await panelContext();
  await expireQuotes(user.id);
  const q = await prisma.quote.findFirst({ where: { id: params.id, userId: user.id }, include: { items: { orderBy: { position: "asc" } } } });
  if (!q) notFound();
  const brand = await prisma.brand.findUnique({ where: { userId: user.id }, select: { professionalName: true } });
  const num = String(q.number).padStart(3, "0");
  const link = `${env.appUrl}/o/${q.shareToken}`;
  const canStatus = hasFeature(access, "status");
  const locked = q.status === "APPROVED" || q.status === "REJECTED";
  const msg = `Olá, ${q.clientName.split(" ")[0]}! Tudo bem?\n\nSegue o orçamento nº ${num} (${q.title}) no valor de ${brl(q.total)}.\n\nVocê pode ver e baixar aqui: ${link}\n\nQualquer dúvida, estou à disposição.\n${brand?.professionalName ?? ""}`;
  const discount = toNum(q.subtotal) - toNum(q.total);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        {searchParams.salvo && <p role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-bold text-green-800"><IconCheck /> Orçamento salvo!</p>}
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-sm font-bold text-muted">Orçamento nº {num}</p><p className="text-xl font-bold text-navy">{q.clientName}</p><p className="text-sm text-muted">{q.title}</p></div>
            <StatusBadge s={q.status} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-muted">Criado</dt><dd className="font-bold">{fmtDate(q.createdAt)}</dd></div>
            <div><dt className="text-muted">Emitido</dt><dd className="font-bold">{fmtDate(q.issuedAt)}</dd></div>
            <div><dt className="text-muted">Visualizado</dt><dd className="font-bold">{fmtDate(q.viewedAt)}</dd></div>
            <div><dt className="text-muted">Validade</dt><dd className="font-bold">{q.validityDays} dias</dd></div>
          </dl>
        </section>
        <section className="card p-0">
          <ul className="divide-y divide-line">
            {q.items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <span><span className="block font-bold text-navy">{i.description}</span><span className="text-xs text-muted">{KIND[i.kind]} · {Number(i.quantity).toLocaleString("pt-BR")} {i.unit} × {brl(i.unitPrice)}</span></span><b>{brl(i.total)}</b>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-line px-5 py-4 text-sm">
            {toNum(q.travelFee) > 0 && <p className="flex justify-between"><span>Deslocamento</span><b>{brl(q.travelFee)}</b></p>}
            {discount > 0 && <p className="flex justify-between"><span>Desconto</span><b className="text-red-700">- {brl(discount)}</b></p>}
            <p className="flex justify-between pt-1 text-lg"><span className="font-bold text-navy">Total</span><b className="text-navy">{brl(q.total)}</b></p>
          </div>
        </section>
        <div className="flex flex-wrap gap-2">
          {!locked && <Link href={`/painel/orcamentos/${q.id}/editar`} className="btn-navy btn-sm">Editar</Link>}
          <form action={duplicateQuote}><input type="hidden" name="id" value={q.id} /><button className="btn-outline btn-sm">Duplicar</button></form>
          <form action={deleteQuote}><input type="hidden" name="id" value={q.id} /><ConfirmButton message="Excluir este orçamento definitivamente?" className="btn-danger btn-sm">Excluir</ConfirmButton></form>
        </div>
      </div>
      <aside className="space-y-4">
        <SharePanel id={q.id} link={link} pdfUrl={`/painel/orcamentos/${q.id}/pdf?d=1`} fileName={pdfFilename(q)} phone={q.clientPhone ?? ""} defaultMsg={msg} canWa={hasFeature(access, "whatsapp")} draft={q.status === "DRAFT"} />
        {q.status !== "DRAFT" && (
          <div className="card space-y-3">
            <p className="text-lg font-bold text-navy">Resposta do cliente</p>
            {canStatus ? (
              <form action={setStatus} className="grid grid-cols-2 gap-2">
                <input type="hidden" name="id" value={q.id} />
                <button name="status" value="APPROVED" disabled={q.status === "APPROVED"} className="btn bg-green-600 text-white hover:bg-green-700">Aprovado</button>
                <button name="status" value="REJECTED" disabled={q.status === "REJECTED"} className="btn-danger">Recusado</button>
                {locked && <button name="status" value="SENT" className="btn-ghost btn-sm col-span-2">Voltar para “Enviado”</button>}
              </form>
            ) : <p className="text-sm text-muted">Controle de status no <Link href="/painel/assinatura" className="font-bold text-navy underline">plano Profissional</Link>.</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
