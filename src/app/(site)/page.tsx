import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { waLink, fmtPhone } from "@/lib/money";
import { env } from "@/lib/env";
import { Emblem } from "@/components/Logo";
import { JsonLd } from "@/components/site/JsonLd";
import { WorkCard } from "@/components/site/WorkCard";
import { ReviewButton } from "@/components/site/ReviewButton";
import { parseFaq } from "@/lib/faq";
import { IconCheck, IconWhatsApp, IconMap, IconStar, IconBolt, IconShield, IconClock, IconFile } from "@/components/icons";

export const revalidate = 300;

export default async function Home() {
  const s = await getSettings();
  const [services, works, testimonials, areas, photo] = await Promise.all([
    prisma.portfolioService.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    prisma.portfolioWork.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 6, include: { photos: { select: { id: true, kind: true }, orderBy: { position: "asc" } } } }),
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.serviceArea.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.siteImage.findUnique({ where: { key: "profile" }, select: { updatedAt: true } }),
  ]);
  const faq = parseFaq(s.faq);
  const clients = s.clients.split("\n").map((x) => x.trim()).filter(Boolean);
  const profileUrl = s.googleReviewUrl.replace(/\/review\/?$/, "");
  const wa = waLink(s.whatsapp, "Olá! Vim pelo site e gostaria de um orçamento.");
  const diffs = s.differentials.split("\n").map((x) => x.trim()).filter(Boolean);
  const diffIcons = [IconClock, IconFile, IconShield, IconCheck];
  const avg = testimonials.length ? testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length : 0;

  const ld = {
    "@context": "https://schema.org", "@type": "Electrician", name: s.businessName, url: env.appUrl,
    telephone: "+55" + s.whatsapp.replace(/\D/g, ""), image: `${env.appUrl}/icon.svg`,
    address: { "@type": "PostalAddress", addressLocality: s.city, addressRegion: s.state, addressCountry: "BR" },
    areaServed: areas.map((a) => (a.name === s.city ? { "@type": "City", name: a.name } : { "@type": "Place", name: `${a.name}, ${s.city} - ${s.state}` })),
    ...(profileUrl ? { sameAs: [profileUrl] } : {}),
    ...(testimonials.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: testimonials.length } } : {}),
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Serviços elétricos", itemListElement: services.map((x) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: x.title, url: `${env.appUrl}/servicos/${x.slug}` } })) },
  };

  return (
    <>
      <JsonLd data={ld} />
      {faq.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
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
            <p className="mt-4 text-sm text-navy-soft">{s.attendance} · {fmtPhone(s.whatsapp)}</p>
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
            <div className={`mt-10 grid items-center gap-8 ${photo ? "md:grid-cols-[260px_1fr]" : ""}`}>
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/img/site/profile?v=${photo.updatedAt.getTime()}`} alt={`${s.businessName}, eletricista em ${s.city}`} className="mx-auto aspect-[4/5] w-full max-w-[260px] rounded-2xl border-4 border-brand object-cover" />
              )}
              <div>
                <h2 className="text-xl font-bold text-navy">Sobre mim</h2>
                <p className="mt-2 max-w-3xl text-lg text-muted">{s.about}</p>
                {clients.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Alguns clientes atendidos</p>
                    <div className="mt-2 flex flex-wrap gap-2">{clients.map((c) => <span key={c} className="rounded-lg bg-white px-3 py-1.5 font-bold text-navy shadow-sm">{c}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
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
      {(testimonials.length > 0 || s.googleReviewUrl) && (
        <section id="depoimentos" className="bg-navy py-16 text-white">
          <div className="container-x">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><h2 className="text-2xl font-bold uppercase sm:text-3xl">O que dizem os clientes</h2><div className="section-bar" /></div>
              <ReviewButton url={s.googleReviewUrl} className="btn-primary" label="Avaliar no Google" />
            </div>
            {testimonials.length === 0 && <p className="mt-6 max-w-2xl text-navy-soft">Já contratou meu serviço? Sua avaliação no Google ajuda outras pessoas de {s.city} a encontrarem um eletricista de confiança. Leva menos de 1 minuto.</p>}
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
        <h2 className="section-title">Eletricista em {s.city} e região</h2><div className="section-bar" />
        <p className="mt-4 max-w-3xl text-muted">Atendo residências, comércios e empresas em {areas.map((a) => a.name).join(", ").replace(/, ([^,]*)$/, " e $1")}. Instalações, manutenção, troca de disjuntores, quadros de distribuição (QDC), chuveiros, tomadas e iluminação.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {areas.map((a) => <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-light px-4 py-2 font-bold text-navy"><IconMap className="h-4 w-4 text-brand-dark" />{a.name}</span>)}
        </div>
        {faq.length > 0 && (
          <div className="mt-14">
            <h2 className="section-title">Perguntas frequentes</h2><div className="section-bar" />
            <div className="mt-6 space-y-3">
              {faq.map((f) => (
                <details key={f.q} className="card group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-navy">{f.q}<span className="text-2xl text-brand-dark transition group-open:rotate-45">+</span></summary>
                  <p className="mt-3 whitespace-pre-line text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}
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
