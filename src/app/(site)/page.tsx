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
import { IconCheck, IconWhatsApp, IconMap, IconStar, IconBolt } from "@/components/icons";

export const revalidate = 300;

export default async function Home() {
  const s = await getSettings();
  const [services, works, testimonials, areas, photo] = await Promise.all([
    prisma.portfolioService.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    prisma.portfolioWork.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3, include: { photos: { select: { id: true, kind: true }, orderBy: { position: "asc" } } } }),
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.serviceArea.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.siteImage.findUnique({ where: { key: "profile" }, select: { updatedAt: true } }),
  ]);
  const faq = parseFaq(s.faq);
  const clients = s.clients.split("\n").map((x) => x.trim()).filter(Boolean);
  const profileUrl = s.googleReviewUrl.replace(/\/review\/?$/, "");
  const wa = waLink(s.whatsapp, "Olá! Vim pelo site e gostaria de um orçamento.");
  const diffs = s.differentials.split("\n").map((x) => x.trim()).filter(Boolean);
  const avg = testimonials.length ? testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length : 0;

  const ld = {
    "@context": "https://schema.org", "@type": "Electrician", name: s.businessName, url: env.appUrl,
    telephone: "+55" + s.whatsapp.replace(/\D/g, ""), image: `${env.appUrl}/icon.svg`,
    address: { "@type": "PostalAddress", addressLocality: s.city, addressRegion: s.state, addressCountry: "BR" },
    areaServed: areas.map((a) => (a.name === s.city ? { "@type": "City", name: a.name } : { "@type": "Place", name: `${a.name}, ${s.city} - ${s.state}` })),
    sameAs: [profileUrl, s.instagram ? `https://instagram.com/${s.instagram.replace(/^@/, "")}` : ""].filter(Boolean),
    ...(testimonials.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: testimonials.length } } : {}),
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Serviços elétricos", itemListElement: services.map((x) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: x.title, url: `${env.appUrl}/servicos/${x.slug}` } })) },
  };

  return (
    <>
      <JsonLd data={ld} />
      {faq.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
      {/* HERO — mesma composição do cabeçalho do orçamento (faixa navy + diagonal) */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute bottom-2 top-0 right-0 hidden w-[40%] bg-navy-2 md:block" style={{ clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)" }} />
        <div className="container-x relative grid items-center gap-10 py-14 md:grid-cols-[1.4fr_1fr] md:py-24">
          <div>
            <h1 className="text-4xl font-bold leading-tight sm:text-6xl">{s.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-lg text-navy-soft">{s.heroText}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={wa} target="_blank" rel="noopener" className="btn-wa text-base"><IconWhatsApp /> Chamar no WhatsApp</a>
              <Link href="/orcamento" className="btn-primary text-base">Pedir orçamento</Link>
            </div>
            <p className="mt-4 text-sm text-navy-soft">{s.attendance} · {fmtPhone(s.whatsapp)}</p>
          </div>
          <div className="hidden justify-center md:flex"><Emblem size={240} bg="#0F2742" /></div>
        </div>
        <div className="h-2 bg-brand" />
      </section>

      {/* DIFERENCIAIS — faixa simples logo abaixo do topo */}
      {diffs.length > 0 && (
        <section className="border-b border-line bg-white">
          <ul className="container-x grid gap-x-6 gap-y-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {diffs.map((d) => <li key={d} className="flex items-center gap-2 font-bold text-navy"><IconCheck className="h-5 w-5 shrink-0 text-brand-dark" />{d}</li>)}
          </ul>
        </section>
      )}

      {/* SERVIÇOS */}
      <section className="container-x py-16">
        <h2 className="section-title">Serviços</h2><div className="section-bar" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((x) => (
            <Link key={x.id} href={`/servicos/${x.slug}`} className="group flex items-start gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-brand"><IconBolt className="h-4 w-4" /></span>
              <span><span className="block font-bold leading-snug text-navy">{x.title}</span><span className="mt-1 block text-sm text-muted">{x.summary}</span></span>
            </Link>
          ))}
        </div>
      </section>

      {/* SOBRE */}
      <section className="bg-light py-16">
        <div className={`container-x grid items-center gap-10 ${photo ? "md:grid-cols-[240px_1fr]" : ""}`}>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/img/site/profile?v=${photo.updatedAt.getTime()}`} alt={`${s.businessName}, eletricista em ${s.city}`} className="mx-auto aspect-[4/5] w-full max-w-[240px] rounded-2xl border-4 border-brand object-cover" />
          )}
          <div>
            <h2 className="section-title">Sobre mim</h2><div className="section-bar" />
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink/80">{s.about}</p>
            {clients.length > 0 && <p className="mt-5 text-sm text-muted"><b className="text-navy">Já atendi:</b> {clients.join(" · ")}</p>}
          </div>
        </div>
      </section>

      {/* TRABALHOS */}
      {works.length > 0 && (
        <section className="container-x py-16">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="section-title">Trabalhos realizados</h2><div className="section-bar" /></div>
            <Link href="/portfolio" className="text-sm font-bold text-navy hover:underline">Ver todos →</Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{works.slice(0, 3).map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}

      {/* AVALIAÇÕES */}
      {(testimonials.length > 0 || s.googleReviewUrl) && (
        <section id="depoimentos" className="bg-navy py-14 text-white">
          <div className="container-x">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold uppercase sm:text-3xl">Avaliações</h2>
                {testimonials.length === 0 && <p className="mt-2 max-w-xl text-navy-soft">Já foi atendido? Sua avaliação no Google ajuda outras pessoas a encontrarem um eletricista de confiança.</p>}
              </div>
              <ReviewButton url={s.googleReviewUrl} className="btn-primary shrink-0" label="Avaliar no Google" />
            </div>
            {testimonials.length > 0 && (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {testimonials.map((t) => (
                  <figure key={t.id} className="rounded-2xl bg-navy-2 p-5">
                    <div className="flex gap-0.5 text-brand">{Array.from({ length: t.rating }).map((_, i) => <IconStar key={i} className="h-4 w-4 fill-brand" />)}</div>
                    <blockquote className="mt-3 text-navy-soft">“{t.text}”</blockquote>
                    <figcaption className="mt-3 font-bold">{t.authorName}{t.neighborhood && <span className="font-normal text-navy-soft"> · {t.neighborhood}</span>}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PERGUNTAS + REGIÃO */}
      <section className="container-x py-16">
        {faq.length > 0 && (
          <>
            <h2 className="section-title">Perguntas frequentes</h2><div className="section-bar" />
            <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
              {faq.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-navy">{f.q}<span className="text-2xl leading-none text-brand-dark transition group-open:rotate-45">+</span></summary>
                  <p className="mt-2 whitespace-pre-line text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </>
        )}
        <p className="mt-10 flex gap-2 text-sm text-muted"><IconMap className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" /><span><b className="text-navy">Eletricista em {s.city} e região:</b> {areas.map((a) => a.name).filter((n) => n !== s.city).join(", ").replace(/, ([^,]*)$/, " e $1")}.</span></p>
        <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl bg-brand p-8 md:flex-row md:items-center">
          <div><p className="text-2xl font-bold text-navy">Precisa de um eletricista?</p><p className="text-navy/80">Fale comigo agora pelo WhatsApp.</p></div>
          <a href={wa} target="_blank" rel="noopener" className="btn-navy"><IconWhatsApp /> Chamar no WhatsApp</a>
        </div>
      </section>
    </>
  );
}
