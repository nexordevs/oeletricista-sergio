import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { WorkCard } from "@/components/site/WorkCard";

export const revalidate = 300;
export const metadata: Metadata = { title: "Trabalhos realizados", description: "Fotos de antes e depois de serviços elétricos realizados em João Pessoa – PB.", alternates: { canonical: "/portfolio" } };

export default async function Portfolio() {
  const works = await prisma.portfolioWork.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, include: { photos: { select: { id: true, kind: true }, orderBy: { position: "asc" } } } });
  return (
    <div className="container-x py-12">
      <h1 className="section-title">Trabalhos realizados</h1><div className="section-bar" />
      {works.length === 0 ? (
        <div className="card mt-8 text-center"><p className="text-lg font-bold text-navy">Em breve, fotos dos trabalhos por aqui.</p><p className="mt-1 text-muted">Enquanto isso, peça seu orçamento.</p><Link href="/orcamento" className="btn-primary mt-4">Pedir orçamento</Link></div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
      )}
    </div>
  );
}
