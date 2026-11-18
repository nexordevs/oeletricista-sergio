import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LeadForm } from "./LeadForm";
import { waLink } from "@/lib/money";
import { IconWhatsApp } from "@/components/icons";

export const metadata: Metadata = { title: "Pedir orçamento de eletricista", description: "Solicite orçamento de serviços elétricos em João Pessoa – PB. Resposta rápida pelo WhatsApp.", alternates: { canonical: "/orcamento" } };

export default async function Orcamento(props: { searchParams: Promise<{ servico?: string }> }) {
  const searchParams = await props.searchParams;
  const s = await getSettings();
  const services = (await prisma.portfolioService.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, select: { title: true } })).map((x) => x.title);
  const preset = services.includes(searchParams.servico || "") ? searchParams.servico : undefined;
  return (
    <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="section-title">Pedir orçamento</h1><div className="section-bar" />
        <p className="mb-6 mt-4 text-muted">Preencha os dados abaixo e eu retorno o contato. Se preferir, chame direto no WhatsApp.</p>
        <LeadForm services={services} wa={"55" + s.whatsapp.replace(/\D/g, "")} preset={preset} reviewUrl={s.googleReviewUrl} />
      </div>
      <aside className="h-fit rounded-2xl bg-navy p-6 text-white">
        <p className="text-lg font-bold">Atendimento rápido</p>
        <p className="mt-1 text-navy-soft">{s.attendance}</p>
        <a href={waLink(s.whatsapp, "Olá! Gostaria de um orçamento.")} target="_blank" rel="noopener" className="btn-wa mt-5 w-full"><IconWhatsApp /> WhatsApp</a>
      </aside>
    </div>
  );
}
