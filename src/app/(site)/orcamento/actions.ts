"use server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { parseForm, zText, zPhone, type ActionState } from "@/lib/form";

const schema = z.object({
  name: zText(2, 80, "Informe seu nome"),
  phone: zPhone,
  neighborhood: zText(2, 80, "Informe o bairro"),
  service: zText(2, 120, "Escolha o serviço"),
  description: z.string().max(1500).optional(),
  website: z.string().max(0).optional(), // honeypot anti-spam
});

export async function createLead(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = (await clientIp());
  if (!rateLimit(`lead:${ip}`, 5, 3600e3)) return { error: "Muitas solicitações. Tente novamente mais tarde ou chame no WhatsApp." };
  const p = parseForm(schema, fd);
  if (!p.ok) return p.error;
  if (p.data.website) return { ok: true, message: "Recebido!" };
  const { website: _hp, ...data } = p.data;
  await prisma.leadRequest.create({ data: { ...data, description: data.description || null, ip } });
  return { ok: true, message: "Solicitação enviada! Vou retornar o contato em breve.", data: { name: data.name, neighborhood: data.neighborhood, service: data.service, description: data.description || "" } };
}
