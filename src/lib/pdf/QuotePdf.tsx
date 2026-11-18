import path from "path";
import React from "react";
import { Document, Page, View, Text, Image, Font, StyleSheet, Svg, Polygon, renderToBuffer } from "@react-pdf/renderer";
import type { Brand, Quote, QuoteItem } from "@prisma/client";
import { brl, fmtDate, fmtPhone, toNum } from "../money";

const F = path.join(process.cwd(), "public/fonts");
Font.register({ family: "Brand", fonts: [
  { src: path.join(F, "Carlito-Regular.ttf") },
  { src: path.join(F, "Carlito-Bold.ttf"), fontWeight: 700 },
  { src: path.join(F, "Carlito-Italic.ttf"), fontStyle: "italic" },
] });
Font.registerHyphenationCallback((w) => [w]);

const GR = "#5B6B7D", LT = "#F3F6FA", LN = "#DCE3EC";
function mix(hex: string, white: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - white) + 255 * white);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}
const KIND: Record<string, string> = { SERVICE: "Serviços", MATERIAL: "Material", LABOR: "Mão de obra" };
const qty = (n: unknown) => toNum(n as number).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export type PdfData = { brand: Brand; quote: Quote & { items: QuoteItem[] } };

export function QuotePdf({ brand, quote }: PdfData) {
  const P = brand.primaryColor || "#0F2742", A = brand.accentColor || "#FFB400", P2 = mix(P, 0.1), SOFT = mix(P, 0.7);
  const s = StyleSheet.create({
    page: { fontFamily: "Brand", fontSize: 10, color: "#111", paddingBottom: 58 },
    header: { backgroundColor: P, height: 118, position: "relative" },
    sectionTitle: { fontSize: 12, fontWeight: 700, color: P, textTransform: "uppercase", marginTop: 14 },
    bar: { width: 30, height: 2.5, backgroundColor: A, marginTop: 2, marginBottom: 7 },
    th: { flexDirection: "row", backgroundColor: P, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 8 },
    thText: { color: "#fff", fontWeight: 700, fontSize: 8.5, textTransform: "uppercase" },
    tr: { flexDirection: "row", paddingVertical: 5.5, paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: LN },
  });
  const groups = (["SERVICE", "MATERIAL", "LABOR"] as const).map((k) => ({ k, items: quote.items.filter((i) => i.kind === k).sort((a, b) => a.position - b.position) })).filter((g) => g.items.length);
  const itemsTotal = quote.items.reduce((a, i) => a + toNum(i.total), 0);
  const travel = toNum(quote.travelFee);
  const discount = Math.max(0, Math.round((toNum(quote.subtotal) - toNum(quote.total)) * 100) / 100);
  const issued = quote.issuedAt || quote.createdAt;
  const validUntil = new Date(issued.getTime() + quote.validityDays * 864e5);
  const contact = [brand.whatsapp && `WhatsApp: ${fmtPhone(brand.whatsapp)}`, brand.phone && `Tel: ${fmtPhone(brand.phone)}`].filter(Boolean).join("   ");
  const logo = brand.logo && brand.logoMime ? { data: Buffer.from(brand.logo), format: "png" as const } : null;
  const sig = brand.signature ? { data: Buffer.from(brand.signature), format: "png" as const } : null;
  const col = { d: { flex: 1 }, q: { width: 62, textAlign: "right" as const }, u: { width: 78, textAlign: "right" as const }, t: { width: 82, textAlign: "right" as const } };

  return (
    <Document title={`Orçamento ${String(quote.number).padStart(3, "0")} - ${brand.professionalName}`} author={brand.professionalName} creator={brand.professionalName} producer={brand.professionalName}>
      <Page size="A4" style={s.page}>
        {/* CABEÇALHO */}
        <View style={s.header} fixed={false}>
          <Svg style={{ position: "absolute", top: 0, left: 0 }} width={595} height={118}><Polygon points="370,0 595,0 595,118 310,118" fill={P2} /></Svg>
          <View style={{ position: "absolute", left: 40, top: 22, flexDirection: "row", alignItems: "center", width: 320 }}>
            {logo && <View style={{ width: 74, height: 74, backgroundColor: "#fff", borderRadius: 37, alignItems: "center", justifyContent: "center", marginRight: 12, borderWidth: 3, borderColor: A }}><Image src={logo} style={{ width: 54, height: 54, objectFit: "contain" }} /></View>}
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>{brand.companyName || brand.professionalName}</Text>
              {brand.companyName && <Text style={{ color: A, fontSize: 10, fontWeight: 700, marginTop: 1 }}>{brand.professionalName}</Text>}
              {brand.tagline && <Text style={{ color: SOFT, fontSize: 9, marginTop: 4 }}>{brand.tagline}</Text>}
              {brand.document && <Text style={{ color: SOFT, fontSize: 8.5, marginTop: 2 }}>{brand.document.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF"}: {brand.document}</Text>}
            </View>
          </View>
          <View style={{ position: "absolute", right: 40, top: 28, alignItems: "flex-end" }}>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>ORÇAMENTO</Text>
            <Text style={{ color: SOFT, fontSize: 10, marginTop: 6 }}>Nº {String(quote.number).padStart(3, "0")}/{issued.getFullYear()}</Text>
            <Text style={{ color: SOFT, fontSize: 10, marginTop: 2 }}>Emissão: {fmtDate(issued)}</Text>
            <Text style={{ color: SOFT, fontSize: 10, marginTop: 2 }}>Válido até: {fmtDate(validUntil)}</Text>
          </View>
        </View>
        <View style={{ height: 6, backgroundColor: A }} />

        <View style={{ paddingHorizontal: 40 }}>
          {/* CLIENTE */}
          <View style={{ marginTop: 16, backgroundColor: LT, borderRadius: 8, flexDirection: "row" }}>
            <View style={{ width: 4, backgroundColor: A, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }} />
            <View style={{ padding: 10, flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
              <Info label="Cliente" value={quote.clientName} w="60%" />
              <Info label="Telefone" value={fmtPhone(quote.clientPhone) || "—"} w="40%" />
              <Info label="Endereço" value={quote.clientAddress || "—"} w="100%" />
            </View>
          </View>

          <Text style={s.sectionTitle}>Serviço</Text><View style={s.bar} />
          <Text style={{ fontSize: 11 }}>{quote.title}</Text>

          {/* ITENS */}
          {groups.map((g) => (
            <View key={g.k} wrap={false}>
              <Text style={s.sectionTitle}>{KIND[g.k]}</Text><View style={s.bar} />
              <View style={s.th}><Text style={[s.thText, col.d]}>Descrição</Text><Text style={[s.thText, col.q]}>Qtd</Text><Text style={[s.thText, col.u]}>Valor unit.</Text><Text style={[s.thText, col.t]}>Total</Text></View>
              {g.items.map((i, idx) => (
                <View key={i.id} style={[s.tr, idx % 2 ? { backgroundColor: LT } : {}]}>
                  <Text style={[col.d, { fontSize: 10.5 }]}>{i.description}</Text>
                  <Text style={[col.q, { color: GR }]}>{qty(i.quantity)} {i.unit}</Text>
                  <Text style={[col.u, { color: GR }]}>{brl(i.unitPrice)}</Text>
                  <Text style={[col.t, { fontWeight: 700 }]}>{brl(i.total)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 8, paddingTop: 5 }}>
                <Text style={{ color: GR, fontWeight: 700, marginRight: 14 }}>Subtotal {KIND[g.k].toLowerCase()}</Text>
                <Text style={{ color: P, fontWeight: 700, width: 82, textAlign: "right" }}>{brl(g.items.reduce((a, i) => a + toNum(i.total), 0))}</Text>
              </View>
            </View>
          ))}

          {/* CONDIÇÕES + TOTAIS */}
          <View style={{ flexDirection: "row", marginTop: 18 }} wrap={false}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[s.sectionTitle, { marginTop: 0 }]}>Condições</Text><View style={s.bar} />
              {quote.paymentTerms && <Cond k="Pagamento:" v={quote.paymentTerms} A={A} P={P} />}
              {quote.executionTime && <Cond k="Prazo de execução:" v={quote.executionTime} A={A} P={P} />}
              <Cond k="Validade da proposta:" v={`${quote.validityDays} dias (até ${fmtDate(validUntil)})`} A={A} P={P} />
            </View>
            <View style={{ width: 230 }}>
              <View style={{ paddingHorizontal: 4, marginBottom: 6 }}>
                <Row k="Itens" v={brl(itemsTotal)} />
                {travel > 0 && <Row k="Deslocamento" v={brl(travel)} />}
                {discount > 0 && <Row k={`Desconto${quote.discountType === "PERCENT" ? ` (${qty(quote.discountValue)}%)` : ""}`} v={`- ${brl(discount)}`} red />}
              </View>
              <View style={{ backgroundColor: P, borderRadius: 8, padding: 12 }}>
                <Text style={{ color: SOFT, fontSize: 8.5, fontWeight: 700 }}>VALOR TOTAL</Text>
                <Text style={{ color: "#fff", fontSize: 21, fontWeight: 700, marginTop: 2 }}>{brl(quote.total)}</Text>
              </View>
            </View>
          </View>

          {quote.notes && (
            <View wrap={false}>
              <Text style={s.sectionTitle}>Observações</Text><View style={s.bar} />
              <Text style={{ lineHeight: 1.4 }}>{quote.notes}</Text>
            </View>
          )}

          {/* ASSINATURAS */}
          <View style={{ flexDirection: "row", marginTop: 22, justifyContent: "space-between" }} wrap={false}>
            {[{ name: brand.professionalName, img: sig }, { name: "Cliente – de acordo", img: null }].map((x) => (
              <View key={x.name} style={{ width: "44%", alignItems: "center" }}>
                <View style={{ height: 32, justifyContent: "flex-end" }}>{x.img && <Image src={x.img} style={{ height: 30, objectFit: "contain" }} />}</View>
                <View style={{ borderTopWidth: 0.7, borderTopColor: "#8A99AA", width: "100%", marginTop: 2 }} />
                <Text style={{ color: GR, fontSize: 9, marginTop: 4 }}>{x.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* RODAPÉ */}
        <View fixed style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ height: 3, backgroundColor: A }} />
          <View style={{ backgroundColor: P, paddingHorizontal: 40, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View><Text style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>{brand.companyName || brand.professionalName}</Text>
              <Text style={{ color: SOFT, fontSize: 8.5, marginTop: 2 }}>{[brand.email, brand.address].filter(Boolean).join("  ·  ")}</Text></View>
            <View style={{ alignItems: "flex-end" }}><Text style={{ color: "#fff", fontWeight: 700, fontSize: 10 }}>{contact}</Text>
              <Text style={{ color: SOFT, fontSize: 8 }} render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Página ${pageNumber} de ${totalPages}` : "")} /></View>
          </View>
        </View>
      </Page>
    </Document>
  );

  function Info({ label, value, w }: { label: string; value: string; w: string }) {
    return <View style={{ width: w, marginBottom: 4 }}><Text style={{ fontSize: 7.5, fontWeight: 700, color: GR }}>{label.toUpperCase()}</Text><Text style={{ fontSize: 11, fontWeight: 700, color: P }}>{value}</Text></View>;
  }
}

function Cond({ k, v, A, P }: { k: string; v: string; A: string; P: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 4 }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: A, marginTop: 4, marginRight: 6 }} />
      <Text style={{ flex: 1 }}><Text style={{ fontWeight: 700, color: P }}>{k} </Text>{v}</Text>
    </View>
  );
}
function Row({ k, v, red }: { k: string; v: string; red?: boolean }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}><Text style={{ color: GR }}>{k}</Text><Text style={{ fontWeight: 700, color: red ? "#B91C1C" : "#111" }}>{v}</Text></View>;
}

export const renderQuotePdf = (d: PdfData) => renderToBuffer(<QuotePdf {...d} />);
export const pdfFilename = (q: Quote) => `orcamento-${String(q.number).padStart(3, "0")}-${q.clientName.normalize("NFD").replace(/[^\w]+/g, "-").replace(/-+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
