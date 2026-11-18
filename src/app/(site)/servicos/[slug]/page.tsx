import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/money";
import { env } from "@/lib/env";
import { JsonLd } from "@/components/site/JsonLd";
import { WorkCard } from "@/components/site/WorkCard";
import { IconWhatsApp } from "@/components/icons";

export const revalidate = 300;
const get = (slug: string) => prisma.portfolioService.findFirst({ where: { slug, published: true } });

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const s = await get(params.slug);
  if (!s) return {};
  return { title: s.seoTitle || s.title, description: s.seoDescription || s.summary, alternates: { canonical: `/servicos/${s.slug}` } };
}

export default async function Servico(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const s = await get(params.slug);
  if (!s) notFound();
  const st = await getSettings();
  const areas = (await prisma.serviceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { name: true } })).map((a) => a.name).filter((n) => n !== st.city);
  const works = await prisma.portfolioWork.findMany({ where: { published: true, serviceSlug: s.slug }, take: 6, orderBy: { createdAt: "desc" }, include: { photos: { select: { id: true, kind: true }, orderBy: { position: "asc" } } } });
  const wa = waLink(st.whatsapp, `Olá! Gostaria de um orçamento para: ${s.title}.`);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Service", name: s.title, description: s.summary, serviceType: s.title, url: `${env.appUrl}/servicos/${s.slug}`, areaServed: { "@type": "City", name: st.city }, provider: { "@type": "Electrician", name: st.businessName, telephone: "+55" + st.whatsapp } }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: env.appUrl },
        { "@type": "ListItem", position: 2, name: "Serviços", item: `${env.appUrl}/servicos` },
        { "@type": "ListItem", position: 3, name: s.title, item: `${env.appUrl}/servicos/${s.slug}` } ] }} />
      <section className="bg-navy py-12 text-white">
        <div className="container-x">
          <nav className="text-sm text-navy-soft"><Link href="/servicos" className="hover:text-white">Serviços</Link> / {s.title}</nav>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{s.seoTitle || s.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-navy-soft">{s.summary}</p>
        </div>
      </section>
      <div className="h-1.5 bg-brand" />
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 text-lg leading-relaxed text-ink/90">
          {s.body.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          {areas.length > 0 && <p className="text-base text-muted"><b className="text-navy">{s.title} em {st.city}:</b> atendo {areas.join(", ").replace(/, ([^,]*)$/, " e $1")}.</p>}
        </div>
        <aside className="card h-fit border-brand/40 bg-light">
          <p className="text-lg font-bold text-navy">Peça seu orçamento</p>
          <p className="mt-1 text-sm text-muted">Atendo em {st.city} e região. {st.attendance}.</p>
          <a href={wa} target="_blank" rel="noopener" className="btn-wa mt-4 w-full"><IconWhatsApp /> WhatsApp</a>
          <Link href={`/orcamento?servico=${encodeURIComponent(s.title)}`} className="btn-primary mt-2 w-full">Formulário</Link>
        </aside>
      </div>
      {works.length > 0 && (
        <section className="container-x pb-6">
          <h2 className="section-title text-xl">Trabalhos deste serviço</h2><div className="section-bar" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}
    </>
  );
}
