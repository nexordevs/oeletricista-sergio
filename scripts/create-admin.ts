// Uso: npm run create-admin -- email@exemplo.com "SenhaForte123" "Sergio"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { provisionServices } from "../src/lib/provision";
const prisma = new PrismaClient();
async function main() {
  const [email, password, name = "Administrador"] = process.argv.slice(2);
  if (!email || !password || password.length < 10) throw new Error('Uso: npm run create-admin -- email "senha (mín. 10 caracteres)" "Nome"');
  const passwordHash = await bcrypt.hash(password, 12);
  const u = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", passwordHash, blocked: false },
    create: { email: email.toLowerCase(), passwordHash, name, role: "ADMIN", onboardedAt: new Date() },
  });
  await prisma.brand.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, professionalName: name } });
  await provisionServices(u.id);
  console.log(`Administrador pronto: ${u.email}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
