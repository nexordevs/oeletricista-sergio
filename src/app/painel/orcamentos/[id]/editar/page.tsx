import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { QuoteEditor } from "../../QuoteEditor";
import { editorData } from "../../editor-data";

const f = (n: unknown) => Number(n).toFixed(2).replace(".", ",");
export default async function Editar({ params }: { params: { id: string } }) {
  const { user, access } = await panelContext();
  const q = await prisma.quote.findFirst({ where: { id: params.id, userId: user.id }, include: { items: { orderBy: { position: "asc" } } } });
  if (!q) notFound();
  if (q.status === "APPROVED" || q.status === "REJECTED") redirect(`/painel/orcamentos/${q.id}`);
  const { services, clients } = await editorData(user.id);
  return (
    <QuoteEditor services={services} clients={clients} blocked={access.active ? undefined : "Assinatura inativa: não é possível salvar alterações."} initial={{
      id: q.id, status: q.status, clientId: q.clientId, clientName: q.clientName, clientPhone: q.clientPhone ?? "", clientAddress: q.clientAddress ?? "", title: q.title,
      items: q.items.map((i) => ({ kind: i.kind, description: i.description, unit: i.unit, quantity: String(Number(i.quantity)).replace(".", ","), unitPrice: f(i.unitPrice) })),
      travelFee: Number(q.travelFee) ? f(q.travelFee) : "", discountType: q.discountType, discountValue: Number(q.discountValue) ? String(Number(q.discountValue)).replace(".", ",") : "",
      paymentTerms: q.paymentTerms ?? "", executionTime: q.executionTime ?? "", validityDays: String(q.validityDays), notes: q.notes ?? "",
    }} />
  );
}
