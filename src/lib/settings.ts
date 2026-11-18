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
  about: { label: "Sobre mim", value: "Sou o Sergio, eletricista em João Pessoa. Trabalho com instalações e manutenção elétrica para residências, comércios, hotéis e indústria, com atenção à segurança, organização e respeito ao seu tempo e à sua casa.", long: true },
  differentials: { label: "Diferenciais (um por linha)", value: "Atendimento emergencial\nOrçamento claro e por escrito\nGarantia de 90 dias na mão de obra\nServiço limpo e organizado", long: true },
  attendance: { label: "Frase sobre o atendimento (sem horário)", value: "Atendimento emergencial e orçamento pelo WhatsApp" },
  clients: { label: "Alguns clientes atendidos (um por linha, só nomes — sem logomarca)", value: "Loja Torras\nHotel Bessa Beach\nKlabin\nResidências em João Pessoa", long: true },
  googleReviewUrl: { label: "Link de avaliação do Google (Perfil da Empresa)", value: "https://g.page/r/Cc1CDiOtR5kpECE/review" },
  faq: { label: "Perguntas frequentes (pergunta na 1ª linha, resposta abaixo; separe com uma linha em branco)", long: true, value: "Quais bairros você atende?\nAtendo João Pessoa e região, incluindo Bessa, Bancários, José Américo, Mangabeira, Manaíra, Tambaú, Cabo Branco, Altiplano, Valentina, Geisel e outros bairros. Fale comigo no WhatsApp para confirmar.\n\nComo peço um orçamento?\nChame no WhatsApp ou preencha o formulário do site, contando o que precisa. Envio o orçamento por escrito, com material e mão de obra separados.\n\nO material está incluso?\nO orçamento mostra separadamente o material e a mão de obra. Se você preferir comprar o material, cobro apenas a mão de obra.\n\nO serviço tem garantia?\nSim. A mão de obra tem garantia de 90 dias.\n\nVocê faz atendimento emergencial?\nSim. Atendo emergências elétricas como falta de energia, curto-circuito, disjuntor desarmando e cheiro de queimado. Chame no WhatsApp e explique o problema.\n\nVocê faz reparo de curto-circuito e quadro de distribuição (QDC)?\nSim. Faço diagnóstico de curto-circuito, troca de disjuntores, DR e DPS, e montagem e organização de quadros elétricos." },
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
