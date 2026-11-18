import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const plans = [
  { slug: "inicial", name: "Inicial", description: "Para começar a enviar orçamentos profissionais.", priceMonthly: 19.9, priceYearly: 199, quoteLimit: 30, sortOrder: 1 },
  { slug: "profissional", name: "Profissional", description: "Para quem orça todo dia e quer acompanhar cada cliente.", priceMonthly: 34.9, priceYearly: 349, quoteLimit: null, featBrandFull: true, featClientHistory: true, featStatus: true, featWhatsapp: true, highlight: true, sortOrder: 2 },
  { slug: "premium", name: "Premium", description: "Gestão completa: financeiro, relatórios e indicadores.", priceMonthly: 49.9, priceYearly: 499, quoteLimit: null, featBrandFull: true, featClientHistory: true, featStatus: true, featWhatsapp: true, featFinance: true, featReports: true, sortOrder: 3 },
];

// Preços SUGERIDOS de mão de obra (referência inicial, editáveis pelo admin e por cada eletricista)
const templates: [string, string, string, number, string][] = [
  ["Instalação de tomada", "Instalação de tomada em ponto existente", "ponto", 40, "Tomadas e interruptores"],
  ["Instalação de interruptor", "Instalação de interruptor simples ou paralelo", "ponto", 40, "Tomadas e interruptores"],
  ["Troca de tomada ou interruptor", "Substituição de peça existente", "un", 25, "Tomadas e interruptores"],
  ["Instalação de ponto elétrico novo", "Novo ponto com passagem de fiação e caixa", "ponto", 90, "Instalações"],
  ["Instalação de chuveiro", "Instalação de chuveiro elétrico", "un", 90, "Chuveiros"],
  ["Troca de resistência de chuveiro", "Substituição da resistência", "un", 50, "Chuveiros"],
  ["Troca de disjuntor", "Substituição de disjuntor no quadro", "un", 60, "Quadros e disjuntores"],
  ["Montagem de quadro de distribuição", "Montagem e organização de quadro elétrico", "un", 450, "Quadros e disjuntores"],
  ["Instalação de luminária", "Luminária, plafon ou spot", "un", 50, "Iluminação"],
  ["Instalação de lustre", "Lustre ou pendente", "un", 90, "Iluminação"],
  ["Instalação de refletor externo", "Refletor LED em área externa", "un", 70, "Iluminação"],
  ["Instalação de ventilador de teto", "Instalação com controle ou interruptor", "un", 120, "Ventiladores e ar-condicionado"],
  ["Circuito para ar-condicionado", "Circuito dedicado com disjuntor para split", "un", 250, "Ventiladores e ar-condicionado"],
  ["Manutenção elétrica", "Diagnóstico e reparo (por hora)", "hora", 100, "Manutenção"],
  ["Visita técnica", "Avaliação no local", "visita", 80, "Manutenção"],
];

const services = [
  ["instalacao-eletrica-residencial", "Instalações elétricas residenciais", "Instalação elétrica completa ou parcial para casas e apartamentos, seguindo as normas de segurança.",
    "Faço instalações elétricas novas, ampliações e adequações em residências: passagem de fiação, pontos de tomada e iluminação, circuitos dedicados e organização do quadro.\n\nTodo serviço é feito com material adequado à carga de cada circuito e acabamento limpo.", "Instalação elétrica residencial em João Pessoa", "Instalação elétrica residencial em João Pessoa: fiação, pontos de tomada e iluminação, circuitos e quadro. Orçamento pelo WhatsApp."],
  ["instalacao-de-chuveiro", "Instalação e troca de chuveiros", "Instalação de chuveiro elétrico com fiação e disjuntor dimensionados corretamente.",
    "Instalo e troco chuveiros elétricos e resistências, verificando a bitola do fio, o disjuntor e o aterramento para evitar choques, aquecimento e queda de energia.", "Instalação de chuveiro em João Pessoa", "Instalação e troca de chuveiro elétrico em João Pessoa com fiação e disjuntor corretos. Peça seu orçamento."],
  ["tomadas-e-interruptores", "Instalação de tomadas e interruptores", "Instalação, troca e mudança de tomadas e interruptores, inclusive no padrão novo.",
    "Instalo novas tomadas e interruptores, faço trocas para o padrão atual e crio novos pontos onde você precisar, com acabamento caprichado.", "Instalação de tomadas e interruptores em João Pessoa", "Instalação e troca de tomadas e interruptores em João Pessoa. Novos pontos e adequação ao padrão atual."],
  ["instalacao-de-luminarias", "Instalação de luminárias", "Luminárias, lustres, spots, plafons e refletores instalados com segurança.",
    "Instalo luminárias, lustres, pendentes, spots, plafons, fitas de LED e refletores externos, com fixação segura e ligação correta.", "Instalação de luminárias e lustres em João Pessoa", "Instalação de luminárias, lustres, spots e refletores em João Pessoa. Atendimento rápido."],
  ["disjuntores", "Instalação e substituição de disjuntores", "Troca de disjuntores com dimensionamento correto para cada circuito.",
    "Disjuntor desarmando ou esquentando? Faço o diagnóstico e substituo pelo modelo correto para a carga do circuito, aumentando a segurança da instalação.", "Troca de disjuntor em João Pessoa", "Instalação e troca de disjuntores em João Pessoa com diagnóstico do circuito. Orçamento pelo WhatsApp."],
  ["manutencao-eletrica", "Manutenção elétrica", "Diagnóstico e reparo de problemas elétricos em casas e comércios.",
    "Atendo falta de energia em parte da casa, curto-circuito, tomadas sem funcionar, disjuntor desarmando e outros problemas, com diagnóstico e reparo no local.", "Manutenção elétrica em João Pessoa", "Manutenção elétrica residencial e comercial em João Pessoa: curto-circuito, falta de energia e reparos."],
  ["quadros-eletricos", "Montagem e organização de quadros elétricos", "Montagem, troca e organização de quadros de distribuição.",
    "Monto e reorganizo quadros elétricos com identificação dos circuitos, disjuntores corretos e DR quando necessário, deixando a instalação mais segura e fácil de manter.", "Montagem de quadro elétrico em João Pessoa", "Montagem e organização de quadros de distribuição em João Pessoa, com identificação de circuitos."],
  ["ar-condicionado", "Instalação e manutenção de ar-condicionado", "Instalação e manutenção de ar-condicionado com circuito elétrico dedicado.",
    "Faço a parte elétrica completa para ar-condicionado, com circuito dedicado e disjuntor adequado, além da instalação e manutenção do aparelho.", "Instalação de ar-condicionado em João Pessoa", "Instalação e manutenção de ar-condicionado em João Pessoa com circuito elétrico dedicado."],
];

async function main() {
  for (const p of plans) await prisma.plan.upsert({ where: { slug: p.slug }, update: {}, create: p });
  if ((await prisma.serviceTemplate.count()) === 0)
    await prisma.serviceTemplate.createMany({ data: templates.map(([name, description, unit, suggestedPrice, category]) => ({ name, description, unit, suggestedPrice, category })) });
  for (const [i, s] of services.entries())
    await prisma.portfolioService.upsert({ where: { slug: s[0] }, update: {}, create: { slug: s[0], title: s[1], summary: s[2], body: s[3], seoTitle: s[4], seoDescription: s[5], published: true, sortOrder: i } });
  if ((await prisma.serviceArea.count()) === 0) await prisma.serviceArea.create({ data: { name: "João Pessoa", sortOrder: 0 } });
  console.log("Seed concluído.");
}
main().finally(() => prisma.$disconnect());
