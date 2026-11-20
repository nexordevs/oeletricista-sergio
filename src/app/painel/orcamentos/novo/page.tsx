import { panelContext } from "@/lib/panel";
import { canCreateQuote } from "@/lib/access";
import { QuoteEditor } from "../QuoteEditor";
import { editorData } from "../editor-data";

export default async function Novo(props: { searchParams: Promise<{ cliente?: string }> }) {
  const searchParams = await props.searchParams;
  const { user, access } = await panelContext();
  const { services, clients, brand } = await editorData(user.id);
  const c = clients.find((x) => x.id === searchParams.cliente);
  const blocked = !access.active ? "Assinatura inativa: você pode montar o orçamento, mas só consegue salvar com um plano ativo."
    : !canCreateQuote(access) ? `Você usou os ${access.quoteLimit} orçamentos do seu plano este mês.` : undefined;
  return (
    <QuoteEditor services={services} clients={clients} defaultNotes={brand?.defaultNotes} markup={brand?.materialMarkup ?? 0} blocked={blocked} initial={{
      clientId: c?.id ?? null, clientName: c?.name ?? "", clientPhone: c?.phone ?? "", clientAddress: c?.address ?? "",
      title: "", items: [], travelFee: "", discountType: "VALUE", discountValue: "",
      paymentTerms: brand?.defaultPaymentTerms ?? "", executionTime: brand?.defaultExecution ?? "", validityDays: String(brand?.defaultValidityDays ?? 7), notes: brand?.defaultNotes ?? "",
    }} />
  );
}
