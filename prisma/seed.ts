import { PrismaClient } from "@prisma/client";
import { importPriceTable } from "../src/lib/price-import";
import { provisionServices } from "../src/lib/provision";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

const plans = [
  { slug: "inicial", name: "Inicial", description: "Para começar a enviar orçamentos profissionais.", priceMonthly: 19.9, priceYearly: 199, quoteLimit: 30, sortOrder: 1 },
  { slug: "profissional", name: "Profissional", description: "Para quem orça todo dia e quer acompanhar cada cliente.", priceMonthly: 34.9, priceYearly: 349, quoteLimit: null, featBrandFull: true, featClientHistory: true, featStatus: true, featWhatsapp: true, highlight: true, sortOrder: 2 },
  { slug: "premium", name: "Premium", description: "Gestão completa: financeiro, relatórios e indicadores.", priceMonthly: 49.9, priceYearly: 499, quoteLimit: null, featBrandFull: true, featClientHistory: true, featStatus: true, featWhatsapp: true, featFinance: true, featReports: true, featCourses: true, sortOrder: 3 },
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

/**
 * Administrador controlado pelas variáveis da Vercel (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME).
 * - Não existe admin: cria.
 * - Já existe: atualiza o e-mail e/ou a senha do MESMO usuário (mantém marca, orçamentos etc.)
 *   e encerra as sessões abertas quando algo muda.
 */
async function syncAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const pass = process.env.ADMIN_PASSWORD;
  if (!email) return console.log("ADMIN_EMAIL não definido — administrador não alterado.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return console.warn("ADMIN_EMAIL inválido — administrador não alterado.");
  if (pass && pass.length < 10) return console.warn("ADMIN_PASSWORD precisa de pelo menos 10 caracteres — administrador não alterado.");
  const name = process.env.ADMIN_NAME?.trim() || "Sergio";
  const byEmail = await prisma.user.findUnique({ where: { email } });
  const admin = byEmail?.role === "ADMIN" ? byEmail : await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  if (!admin) {
    if (byEmail) return console.warn(`O e-mail ${email} já pertence a um eletricista assinante — escolha outro ADMIN_EMAIL.`);
    if (!pass) return console.warn("Defina ADMIN_PASSWORD para criar o administrador.");
    const u = await prisma.user.create({ data: { email, name, role: "ADMIN", onboardedAt: new Date(), passwordHash: await bcrypt.hash(pass, 12), brand: { create: { professionalName: name } } } });
    await provisionServices(u.id);
    return console.log(`Administrador criado: ${email}`);
  }
  if (byEmail && byEmail.id !== admin.id) return console.warn(`O e-mail ${email} já pertence a outra conta — e-mail do administrador não alterado.`);
  const data: { email?: string; passwordHash?: string; failedLogins?: number; lockedUntil?: null; blocked?: boolean } = {};
  if (admin.email !== email) data.email = email;
  if (pass && !(await bcrypt.compare(pass, admin.passwordHash))) data.passwordHash = await bcrypt.hash(pass, 12);
  if (!Object.keys(data).length) return console.log(`Administrador sem alterações (${email}).`);
  await prisma.user.update({ where: { id: admin.id }, data: { ...data, failedLogins: 0, lockedUntil: null, blocked: false } });
  await prisma.session.deleteMany({ where: { userId: admin.id } }); // obriga novo login com os dados novos
  console.log(`Administrador atualizado:${data.email ? ` e-mail → ${email}` : ""}${data.passwordHash ? " (senha alterada)" : ""}`);
}

async function main() {
  for (const p of plans) await prisma.plan.upsert({ where: { slug: p.slug }, update: {}, create: p });
  if ((await prisma.serviceTemplate.count({ where: { minPrice: { not: null } } })) === 0) console.log(await importPriceTable(prisma));
  for (const [i, s] of services.entries())
    await prisma.portfolioService.upsert({ where: { slug: s[0] }, update: {}, create: { slug: s[0], title: s[1], summary: s[2], body: s[3], seoTitle: s[4], seoDescription: s[5], published: true, sortOrder: i } });
  // Bairros e cidades atendidos (editáveis em /admin/site)
  const areas = ["João Pessoa", "Bessa", "Bancários", "José Américo", "Mangabeira", "Manaíra", "Tambaú", "Cabo Branco", "Altiplano", "Jardim Oceania", "Aeroclube", "Valentina", "Geisel", "Cristo Redentor", "Torre", "Centro", "Jaguaribe", "Água Fria", "Cidade Universitária", "Castelo Branco", "Miramar", "Tambauzinho", "Expedicionários", "Cabedelo", "Bayeux", "Santa Rita"];
  if ((await prisma.serviceArea.count()) <= 1) for (const [i, name] of areas.entries()) await prisma.serviceArea.upsert({ where: { name }, update: { sortOrder: i }, create: { name, sortOrder: i } });
  // Trabalhos realizados informados pelo Sergio (sem logomarca dos clientes; fotos podem ser adicionadas no admin)
  const works = [
    { title: "Reparo de quadro de distribuição (QDC) em curto-circuito – Loja Torras", description: "Diagnóstico e correção de curto-circuito no quadro de distribuição da loja, com substituição dos componentes danificados e testes de funcionamento.", serviceSlug: "quadros-eletricos", neighborhood: null },
    { title: "Serviços elétricos – Hotel Bessa Beach", description: "Manutenção e serviços elétricos no hotel.", serviceSlug: "manutencao-eletrica", neighborhood: "Bessa" },
    { title: "Montagem e organização de QDC em residências", description: "Montagem e organização de quadros de distribuição residenciais, com disjuntores dimensionados para cada circuito.", serviceSlug: "quadros-eletricos", neighborhood: null },
    { title: "Instalação de novos pontos de tomada em residências", description: "Criação de novos pontos de tomada com passagem de fiação e acabamento.", serviceSlug: "tomadas-e-interruptores", neighborhood: null },
    { title: "Serviços elétricos em ambiente industrial – Klabin", description: "Experiência em serviços elétricos em ambiente industrial.", serviceSlug: "manutencao-eletrica", neighborhood: null },
  ];
  for (const w of works) if (!(await prisma.portfolioWork.findFirst({ where: { title: w.title } }))) await prisma.portfolioWork.create({ data: { ...w, published: true } });
  await syncAdmin();
  console.log("Seed concluído.");
}
main().finally(() => prisma.$disconnect());
