import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PlanCards } from "@/components/site/PlanCards";
import { Emblem } from "@/components/Logo";
import { brl } from "@/lib/money";
import { IconCheck, IconX, IconFile, IconWhatsApp, IconClock, IconChart } from "@/components/icons";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Sistema de orçamentos para eletricistas",
  description: "Crie orçamentos profissionais em PDF com sua logomarca, envie pelo WhatsApp e acompanhe seus clientes. Planos a partir de R$ 19,90/mês.",
  alternates: { canonical: "/sistema" },
};

const rows: [string, (p: import("@prisma/client").Plan) => boolean | string][] = [
  ["Orçamentos por mês", (p) => (p.quoteLimit == null ? "Ilimitados" : String(p.quoteLimit))],
  ["PDF com sua logomarca", () => true],
  ["Cadastro de clientes", () => true],
  ["Catálogo e tabela de preços própria", () => true],
  ["Cores e assinatura no PDF", (p) => p.featBrandFull],
  ["Histórico por cliente", (p) => p.featClientHistory],
  ["Status dos orçamentos", (p) => p.featStatus],
  ["Envio pelo WhatsApp com link", (p) => p.featWhatsapp],
  ["Controle financeiro", (p) => p.featFinance],
  ["Relatórios e indicadores", (p) => p.featReports],
];

export default async function Sistema() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute bottom-2 top-0 right-0 hidden w-1/2 bg-navy-2 md:block" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />
        <div className="container-x relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 font-bold uppercase tracking-[0.2em] text-brand">Para eletricistas</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">Orçamento profissional em PDF, pronto em 2 minutos</h1>
            <p className="mt-5 text-lg text-navy-soft">Escolha os serviços da sua tabela, adicione o material e envie pelo WhatsApp com a sua marca. Sem planilha, sem papel, sem fazer conta na mão.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className="btn-primary text-base">Criar minha conta</Link>
              <a href="#planos" className="btn border-2 border-white/20 text-white hover:border-white/50">Ver planos</a>
            </div>
          </div>
          <DemoQuote />
        </div>
        <div className="h-2 bg-brand" />
      </section>

      <section className="container-x py-16">
        <h2 className="section-title">Como funciona</h2><div className="section-bar" />
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            [IconFile, "1. Coloque sua marca", "Logomarca, telefone, CPF/CNPJ e assinatura. Só uma vez."],
            [IconClock, "2. Monte o orçamento", "Escolha o cliente e os serviços. O total é calculado sozinho."],
            [IconWhatsApp, "3. Envie pelo WhatsApp", "Mande o PDF ou um link que o cliente abre no celular."],
            [IconChart, "4. Acompanhe", "Veja o que foi aprovado, recusado e quanto você orçou no mês."],
          ].map(([I, t, d]) => { const Ic = I as typeof IconFile; return (
            <div key={t as string} className="card"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-navy"><Ic /></span><p className="mt-4 font-bold text-navy">{t as string}</p><p className="mt-1 text-sm text-muted">{d as string}</p></div>); })}
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {["Feito para eletricista autônomo: telas simples, letras grandes, funciona no celular.", "Sua tabela de preços é só sua: comece com os preços sugeridos e ajuste do seu jeito.", "O cliente vê só a sua marca — nada de propaganda do sistema no PDF.", "Pagamento seguro pelo Mercado Pago, cancele quando quiser."].map((b) => (
            <p key={b} className="flex gap-2 text-[15px]"><IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" />{b}</p>
          ))}
        </div>
      </section>

      <section id="planos" className="bg-light py-16">
        <div className="container-x">
          <h2 className="section-title">Planos</h2><div className="section-bar" />
          <div className="mt-10"><PlanCards plans={plans} /></div>
          <div className="mt-12 overflow-x-auto rounded-2xl bg-white p-4">
            <table className="table-x min-w-[640px]">
              <thead><tr><th>Funcionalidade</th>{plans.map((p) => <th key={p.id} className="text-center">{p.name}</th>)}</tr></thead>
              <tbody>
                {rows.map(([label, fn]) => (
                  <tr key={label}><td className="font-bold text-navy">{label}</td>{plans.map((p) => { const v = fn(p); return (
                    <td key={p.id} className="text-center">{typeof v === "string" ? <b>{v}</b> : v ? <IconCheck className="mx-auto h-5 w-5 text-green-600" /> : <IconX className="mx-auto h-5 w-5 text-muted/50" />}</td>); })}</tr>
                ))}
                <tr><td className="font-bold text-navy">Preço mensal</td>{plans.map((p) => <td key={p.id} className="text-center font-bold">{brl(p.priceMonthly)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

/** Demonstração visual do documento gerado (dados de exemplo, identificados como tal). */
function DemoQuote() {
  const items: [string, string, string][] = [["Instalação de chuveiro", "1 un", "R$ 90,00"], ["Troca de disjuntor", "2 un", "R$ 120,00"], ["Instalação de tomada", "4 pontos", "R$ 160,00"]];
  return (
    <div className="relative mx-auto w-full max-w-sm rotate-1 rounded-xl bg-white p-0 text-ink shadow-2xl" aria-label="Exemplo de orçamento gerado">
      <span className="badge absolute -top-3 right-4 z-10 bg-brand text-navy">Exemplo</span>
      <div className="flex items-center justify-between rounded-t-xl border-b-4 border-brand bg-navy px-4 py-3">
        <span className="flex items-center gap-2"><Emblem size={30} /><span className="text-sm font-bold text-white">SUA MARCA</span></span>
        <span className="text-sm font-bold text-white">ORÇAMENTO</span>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase text-muted">Cliente</p><p className="text-sm font-bold text-navy">Nome do cliente</p>
        <div className="mt-3 rounded-md bg-navy px-2 py-1 text-[10px] font-bold text-white">SERVIÇOS</div>
        {items.map(([d, q, v]) => <div key={d} className="flex justify-between border-b border-line px-2 py-1.5 text-xs"><span>{d}</span><span className="text-muted">{q}</span><b>{v}</b></div>)}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-navy px-3 py-2 text-white"><span className="text-[10px] font-bold text-navy-soft">VALOR TOTAL</span><span className="text-lg font-bold">R$ 370,00</span></div>
      </div>
    </div>
  );
}
