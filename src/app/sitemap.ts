import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await prisma.portfolioService.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
  const base = ["", "/servicos", "/portfolio", "/orcamento", "/sistema"].map((p) => ({ url: env.appUrl + p, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 }));
  return [...base, ...services.map((s) => ({ url: `${env.appUrl}/servicos/${s.slug}`, lastModified: s.updatedAt, priority: 0.7 }))];
}
