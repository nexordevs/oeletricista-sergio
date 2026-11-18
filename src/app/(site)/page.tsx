import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { waLink, fmtPhone } from "@/lib/money";
import { env } from "@/lib/env";
import { Emblem } from "@/components/Logo";
import { JsonLd } from "@/components/site/JsonLd";
import { WorkCard } from "@/components/site/WorkCard";
import { IconCheck, IconWhatsApp, IconMap, IconStar, IconBolt, IconShield, IconClock, IconFile } from "@/components/icons";

export const revalidate = 300;

export default async function Home() {
  const s = await getSettings();
  const [services, works, testimonials, areas] = await Promise.all([
    prisma.portfolioService.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    prisma.portfolioWork.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 6, include: { photos: { select: { id: true, kind: true }, orderBy: { position: "asc" } } } }),
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.serviceArea.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const wa = waLink(s.whatsapp, "Olá! Vim pelo site e gostaria de um orçamento.");
  const diffs = s.differentials.split("\n").map((x) => x.trim()).filter(Boolean);
  const diffIcons = [IconClock, IconFile, IconShield, IconCheck];
  const avg = testimonials.length ? testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length : 0;

  const ld = {
    "@context": "https://schema.org", "@type": "Electrician", name: s.businessName, url: env.appUrl,
    telephone: "+55" + s.whatsapp.replace(/\D/g, ""), image: `${env.appUrl}/icon.svg`,
    address: { "@type": "PostalAddress", addressLocality: s.city, addressRegion: s.state, addressCountry: "BR" },
    areaServed: areas.map((a) => ({ "@type": "City", name: a.name })),
    ...(testimonials.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: testimonials.length } } : {}),
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Serviços elétricos", itemListElement: services.map((x) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: x.title, url: `${env.appUrl}/servicos/${x.slug}` } })) },
  };

  return (
    <>
      <JsonLd data={ld} />
      {/* HERO — mesma composição do cabeçalho do orçamento (faixa navy + diagonal) */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute bottom-2 top-0 right-0 hidden w-[45%] bg-navy-2 md:block" style={{ clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)" }} />
        <div className="container-x relative grid items-center gap-10 py-14 md:grid-cols-[1.25fr_1fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-brand"><IconBolt className="h-4 w-4" /> Eletricista em {s.city} – {s.state}</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{s.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-lg text-navy-soft">{s.heroText}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={wa} target="_blank" rel="noopener" className="btn-wa text-base"><IconWhatsApp /> Chamar no WhatsApp</a>
              <Link href="/orcamento" className="btn-primary text-base">Pedir orçamento</Link>
            </div>
            <p className="mt-4 text-sm text-navy-soft">{s.hours} · {fmtPhone(s.whatsapp)}</p>
          </div>
          <div className="hidden justify-center md:flex"><Emblem size={260} bg="#0F2742" /></div>
        </div>
        <div className="h-2 bg-brand" />
      </section>

      {/* SERVIÇOS */}
      <section className="container-x py-16">
        <h2 className="section-title">Serviços</h2><div className="section-bar" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((x) => (
            <Link key={x.id} href={`/servicos/${x.slug}`} className="card group transition hover:-translate-y-0.5 hover:border-brand">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-brand"><IconBolt /></span>
              <h3 className="mt-4 font-bold text-navy">{x.title}</h3>
              <p className="mt-1 text-sm text-muted">{x.summary}</p>
              <span className="mt-3 inline-block text-sm font-bold text-navy group-hover:text-brand-dark">Saiba mais →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* DIFERENCIAIS */}
      {diffs.length > 0 && (
        <section className="bg-light py-16">
          <div className="container-x">
            <h2 className="section-title">Por que me chamar</h2><div className="section-bar" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {diffs.map((d, i) => { const I = diffIcons[i % diffIcons.length]; return (
                <div key={d} className="flex items-start gap-3 rounded-2xl bg-white p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-navy"><I /></span>
                  <p className="pt-2 font-bold text-navy">{d}</p>
                </div>); })}
            </div>
            <p className="mt-8 max-w-3xl text-muted">{s.about}</p>
          </div>
        </section>
      )}

      {/* TRABALHOS */}
      {works.length > 0 && (
        <section className="container-x py-16">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="section-title">Trabalhos realizados</h2><div className="section-bar" /></div>
            <Link href="/portfolio" className="btn-outline btn-sm">Ver todos</Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}

      {/* DEPOIMENTOS */}
      {testimonials.length > 0 && (
        <section id="depoimentos" className="bg-navy py-16 text-white">
          <div className="container-x">
            <h2 className="text-2xl font-bold uppercase sm:text-3xl">O que dizem os clientes</h2><div className="section-bar" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-2xl bg-navy-2 p-5">
                  <div className="flex gap-0.5 text-brand">{Array.from({ length: t.rating }).map((_, i) => <IconStar key={i} className="h-4 w-4 fill-brand" />)}</div>
                  <blockquote className="mt-3 text-navy-soft">“{t.text}”</blockquote>
                  <figcaption className="mt-3 font-bold">{t.authorName}{t.neighborhood && <span className="font-normal text-navy-soft"> · {t.neighborhood}</span>}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REGIÕES */}
      <section className="container-x py-16">
        <h2 className="section-title">Regiões atendidas</h2><div className="section-bar" />
        <div className="mt-6 flex flex-wrap gap-2">
          {areas.map((a) => <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-light px-4 py-2 font-bold text-navy"><IconMap className="h-4 w-4 text-brand-dark" />{a.name}</span>)}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl bg-brand p-8 md:flex-row md:items-center">
          <div><p className="text-2xl font-bold text-navy">Precisa de um eletricista?</p><p className="text-navy/80">Fale comigo agora e receba seu orçamento por escrito.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={wa} target="_blank" rel="noopener" className="btn-navy"><IconWhatsApp /> WhatsApp</a>
            <Link href="/orcamento" className="btn bg-white text-navy hover:bg-light">Formulário de orçamento</Link>
          </div>
        </div>
      </section>
    </>
  );
}
