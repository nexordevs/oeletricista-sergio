import { quoteSubject, quoteSections, NO_MATERIAL } from "@/lib/quote-title";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { publicQuote } from "@/lib/public-quote";
import { brl, fmtDate, fmtPhone, waLink, toNum } from "@/lib/money";
import { IconDownload, IconWhatsApp } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orçamento", robots: { index: false, follow: false } };

// Página que o cliente final abre pelo link: mostra SOMENTE a identidade do eletricista.
export default async function PublicQuote(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const d = await publicQuote(params.token);
  if (!d) notFound();
  const { quote, brand } = d;
  const viewer = await getUser();
  if (quote.status === "SENT" && viewer?.id !== quote.userId) {
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "VIEWED", viewedAt: new Date() } });
  }
  const P = brand.primaryColor, A = brand.accentColor;
  const issued = quote.issuedAt || quote.createdAt;
  const validUntil = new Date(issued.getTime() + quote.validityDays * 864e5);
  const expired = quote.status === "EXPIRED" || validUntil < new Date();
  const name = brand.companyName || brand.professionalName;
  const discount = toNum(quote.subtotal) - toNum(quote.total);
  const groups = quoteSections(quote.items).filter((g) => g.k === "MATERIAL" || g.items.length);
  const wa = brand.whatsapp ? waLink(brand.whatsapp, `Olá! Vi o orçamento nº ${String(quote.number).padStart(3, "0")} (${brl(quote.total)}) e gostaria de conversar.`) : null;

  return (
    <div className="min-h-screen bg-light pb-16" style={{ ["--p" as string]: P }}>
      <header style={{ background: P, borderBottom: `6px solid ${A}` }} className="text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-6">
          <div className="flex items-center gap-3">
            {brand.logo && <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white p-1.5" style={{ border: `3px solid ${A}` }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/o/${params.token}/logo`} alt={name} className="max-h-full max-w-full object-contain" /></span>}
            <div><p className="text-xl font-bold">{name}</p>{brand.tagline && <p className="text-sm opacity-75">{brand.tagline}</p>}</div>
          </div>
          <div className="text-right"><p className="text-lg font-bold">ORÇAMENTO</p><p className="text-sm opacity-75">Nº {String(quote.number).padStart(3, "0")} · {fmtDate(issued)}</p></div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-6">
        {quote.status === "REJECTED" ? <p className="rounded-xl bg-amber-100 px-4 py-3 font-bold text-amber-900">Esta proposta não está mais disponível. Fale com o profissional para receber um novo orçamento.</p>
          : expired && <p className="rounded-xl bg-amber-100 px-4 py-3 font-bold text-amber-900">Esta proposta venceu em {fmtDate(validUntil)}. Fale com o profissional para atualizar os valores.</p>}
        {quote.status === "APPROVED" && <p className="rounded-xl bg-green-100 px-4 py-3 font-bold text-green-800">Orçamento aprovado.</p>}
        <section className="card">
          <p className="text-xs font-bold uppercase text-muted">Cliente</p><p className="text-lg font-bold" style={{ color: P }}>{quote.clientName}</p>
          {quote.clientAddress && <p className="text-sm text-muted">{quote.clientAddress}</p>}
          {quoteSubject(quote.title) && <p className="mt-3 font-bold">{quoteSubject(quote.title)}</p>}
        </section>
        {groups.map((g) => (
          <section key={g.k} className="card p-0">
            <p className="rounded-t-2xl px-4 py-2.5 text-sm font-bold uppercase text-white" style={{ background: P }}>{g.title}</p>
            {g.items.length === 0 && <p className="px-4 py-3 font-bold text-muted">{NO_MATERIAL}</p>}
            <ul className="divide-y divide-line">{g.items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3"><span><span className="block font-bold">{i.description}</span><span className="text-sm text-muted">{Number(i.quantity).toLocaleString("pt-BR")} {i.unit} × {brl(i.unitPrice)}</span></span><b className="shrink-0">{brl(i.total)}</b></li>))}
            </ul>
          </section>
        ))}
        <section className="card space-y-1.5">
          {toNum(quote.travelFee) > 0 && <p className="flex justify-between"><span className="text-muted">Deslocamento</span><b>{brl(quote.travelFee)}</b></p>}
          {discount > 0 && <p className="flex justify-between"><span className="text-muted">Desconto</span><b className="text-red-700">- {brl(discount)}</b></p>}
          <div className="mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-white" style={{ background: P }}><span className="text-sm font-bold opacity-80">VALOR TOTAL</span><span className="text-2xl font-bold">{brl(quote.total)}</span></div>
        </section>
        <section className="card space-y-1 text-[15px]">
          {quote.paymentTerms && <p><b>Pagamento:</b> {quote.paymentTerms}</p>}
          {quote.executionTime && <p><b>Prazo de execução:</b> {quote.executionTime}</p>}
          <p><b>Validade:</b> até {fmtDate(validUntil)}</p>
          {quote.notes && <p className="whitespace-pre-line pt-2 text-muted">{quote.notes}</p>}
        </section>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href={`/o/${params.token}/pdf`} className="btn flex-1 text-white" style={{ background: P }}><IconDownload /> Baixar PDF</a>
          {wa && <a href={wa} target="_blank" rel="noopener" className="btn-wa flex-1"><IconWhatsApp /> Falar com {brand.professionalName.split(" ")[0]}</a>}
        </div>
        <p className="pt-4 text-center text-sm text-muted">{name}{brand.whatsapp && ` · ${fmtPhone(brand.whatsapp)}`}{brand.email && ` · ${brand.email}`}</p>
      </main>
    </div>
  );
}
