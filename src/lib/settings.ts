import "server-only";
import { prisma } from "./db";
import { cache } from "react";

export const SETTING_DEFAULTS: Record<string, { label: string; value: string; long?: boolean }> = {
  businessName: { label: "Nome do negócio", value: "Sergio Eletricista" },
  tagline: { label: "Slogan", value: "Instalações • Manutenção • Emergência" },
  whatsapp: { label: "WhatsApp (só números, com DDD)", value: "83988817266" },
  city: { label: "Cidade", value: "João Pessoa" },
  state: { label: "Estado (sigla)", value: "PB" },
  heroTitle: { label: "Título principal da página inicial", value: "Eletricista em João Pessoa com atendimento rápido e serviço garantido" },
  heroText: { label: "Texto de apresentação", value: "Instalações e manutenção elétrica residencial e comercial em João Pessoa e região. Orçamento sem compromisso pelo WhatsApp.", long: true },
  about: { label: "Sobre mim", value: "Sou o Sergio, eletricista em João Pessoa. Trabalho com instalações e manutenção elétrica para residências e comércios, com atenção à segurança, organização e respeito ao seu tempo e à sua casa.", long: true },
  differentials: { label: "Diferenciais (um por linha)", value: "Atendimento emergencial\nOrçamento claro e por escrito\nGarantia de 90 dias na mão de obra\nServiço limpo e organizado", long: true },
  hours: { label: "Horário de atendimento", value: "Segunda a sábado, das 7h às 18h" },
  email: { label: "E-mail de contato (opcional)", value: "" },
  instagram: { label: "Instagram (opcional, só o @)", value: "" },
};

export const getSettings = cache(async () => {
  const rows = await prisma.siteSetting.findMany();
  const out: Record<string, string> = {};
  for (const [k, d] of Object.entries(SETTING_DEFAULTS)) out[k] = d.value;
  for (const r of rows) out[r.key] = r.value;
  return out;
});
