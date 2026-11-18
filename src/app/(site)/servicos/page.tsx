import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { IconBolt } from "@/components/icons";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Serviços elétricos em João Pessoa",
  description: "Instalações elétricas, chuveiros, tomadas, luminárias, disjuntores, quadros elétricos e manutenção em João Pessoa – PB.",
  alternates: { canonical: "/servicos" },
};

export default async function Servicos() {
  const services = await prisma.portfolioService.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="container-x py-12">
      <h1 className="section-title">Serviços elétricos em João Pessoa</h1><div className="section-bar" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {services.map((s) => (
          <Link key={s.id} href={`/servicos/${s.slug}`} className="card flex gap-4 transition hover:border-brand">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-brand"><IconBolt /></span>
            <div><h2 className="text-lg font-bold text-navy">{s.title}</h2><p className="mt-1 text-muted">{s.summary}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
