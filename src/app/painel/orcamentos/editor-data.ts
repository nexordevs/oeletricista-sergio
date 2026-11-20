import "server-only";
import { prisma } from "@/lib/db";
export async function editorData(userId: string) {
  const [services, clients, brand] = await Promise.all([
    prisma.userService.findMany({ where: { userId }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.client.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true, address: true } }),
    prisma.brand.findUnique({ where: { userId } }),
  ]);
  return { services: services.map((s) => ({ id: s.id, name: s.name, unit: s.unit, price: Number(s.price), category: s.category, kind: s.kind })), clients, brand };
}
