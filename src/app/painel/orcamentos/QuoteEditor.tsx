"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calcQuote } from "@/lib/quote-calc";
import { brl } from "@/lib/money";
import { withMarkup } from "@/lib/quote-title";
import { saveQuote, type QuotePayload } from "./actions";
import { IconPlus, IconTrash, IconX } from "@/components/icons";

type Kind = "SERVICE" | "MATERIAL" | "LABOR";
type Item = { key: string; kind: Kind; description: string; unit: string; quantity: string; unitPrice: string };
type Svc = { id: string; name: string; unit: string; price: number; category: string; kind: Kind };
type Cli = { id: string; name: string; phone: string | null; address: string | null };
export type EditorInitial = {
  id?: string; clientId: string | null; clientName: string; clientPhone: string; clientAddress: string; title: string;
  items: Omit<Item, "key">[]; travelFee: string; discountType: "VALUE" | "PERCENT"; discountValue: string;
  paymentTerms: string; executionTime: string; validityDays: string; notes: string; status?: string;
};

const parse = (s: string) => { const n = Number(String(s).replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number) => n.toFixed(2).replace(".", ",");
let seq = 0; const k = () => `i${++seq}`;
const KIND_LABEL: Record<Kind, string> = { SERVICE: "Serviço", MATERIAL: "Material", LABOR: "Mão de obra" };

export function QuoteEditor({ initial, services, clients, blocked, defaultNotes, markup = 0 }: { initial: EditorInitial; services: Svc[]; clients: Cli[]; blocked?: string; defaultNotes?: string | null; markup?: number }) {
  const [margin, setMargin] = useState(String(markup));
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState(initial);
  const [items, setItems] = useState<Item[]>(initial.items.map((i) => ({ ...i, key: k() })));
  const [newClient, setNewClient] = useState(!initial.clientId && !initial.clientName && clients.length === 0);
  const [saveCli, setSaveCli] = useState(true);
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState<null | "SERVICE" | "MATERIAL">(null);

  const set = <K extends keyof EditorInitial>(key: K, val: EditorInitial[K]) => setV((p) => ({ ...p, [key]: val }));
  const totals = useMemo(() => calcQuote({
    items: items.map((i) => ({ quantity: parse(i.quantity), unitPrice: parse(i.unitPrice) })),
    travelFee: parse(v.travelFee), discountType: v.discountType, discountValue: parse(v.discountValue),
  }), [items, v.travelFee, v.discountType, v.discountValue]);

  const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = norm(search).split(/\s+/).filter(Boolean);
  const filtered = services.filter((s) => (s.kind === "MATERIAL" ? "MATERIAL" : "SERVICE") === picker && words.every((w) => norm(`${s.name} ${s.category}`).includes(w)));
  const marginPct = Math.max(0, parse(margin));
  const salePrice = (s: Svc) => (s.kind === "MATERIAL" ? withMarkup(s.price, marginPct) : s.price);
  const addService = (s: Svc) => { setItems((p) => [...p, { key: k(), kind: s.kind === "MATERIAL" ? "MATERIAL" : "SERVICE", description: s.name, unit: s.unit, quantity: "1", unitPrice: fmt(salePrice(s)) }]); setPicker(null); setSearch(""); };
  const addBlank = (kind: Kind) => setItems((p) => [...p, { key: k(), kind, description: kind === "LABOR" ? "Mão de obra" : "", unit: kind === "LABOR" ? "serv" : "un", quantity: "1", unitPrice: "" }]);
  const upd = (key: string, f: Partial<Item>) => setItems((p) => p.map((i) => (i.key === key ? { ...i, ...f } : i)));
  const pickClient = (id: string) => {
    if (id === "__new") { setNewClient(true); setV((p) => ({ ...p, clientId: null, clientName: "", clientPhone: "", clientAddress: "" })); return; }
    const c = clients.find((x) => x.id === id);
    if (c) { setNewClient(false); setV((p) => ({ ...p, clientId: c.id, clientName: c.name, clientPhone: c.phone || "", clientAddress: c.address || "" })); }
  };

  function submit(intent: "draft" | "finalize") {
    setError(null);
    const payload: QuotePayload = {
      id: v.id, clientId: newClient ? null : v.clientId, clientName: v.clientName, clientPhone: v.clientPhone, clientAddress: v.clientAddress,
      saveClient: newClient && saveCli, title: v.title,
      items: items.map((i) => ({ kind: i.kind, description: i.description, unit: i.unit || "un", quantity: parse(i.quantity), unitPrice: parse(i.unitPrice) })),
      travelFee: parse(v.travelFee), discountType: v.discountType, discountValue: parse(v.discountValue),
      paymentTerms: v.paymentTerms, executionTime: v.executionTime, validityDays: Number(v.validityDays) || 7, notes: v.notes,
    };
    start(async () => {
      const r = await saveQuote(payload, intent);
      if (!r.ok) { setError(r.error); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      router.push(`/painel/orcamentos/${r.id}?salvo=1`);
      router.refresh();
    });
  }

  const sectionCls = "card space-y-4";
  const num = "input py-2.5 text-right";
  return (
    <div className="space-y-5 pb-28">
      {blocked && <div className="rounded-2xl border-2 border-brand bg-white p-4 font-bold text-navy">{blocked} <Link href="/painel/assinatura" className="underline">Ver planos</Link></div>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700">{error}</p>}

      {/* 1. CLIENTE */}
      <section className={sectionCls}>
        <Step n={1} title="Cliente" />
        {clients.length > 0 && (
          <select className="input" value={newClient ? "__new" : v.clientId || ""} onChange={(e) => pickClient(e.target.value)} aria-label="Escolher cliente">
            <option value="" disabled>Escolha um cliente…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__new">+ Novo cliente</option>
          </select>
        )}
        {(newClient || (!v.clientId && v.clientName)) && (
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="input" placeholder="Nome do cliente *" value={v.clientName} onChange={(e) => set("clientName", e.target.value)} aria-label="Nome do cliente" />
            <input className="input" placeholder="Telefone" inputMode="tel" value={v.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} aria-label="Telefone do cliente" />
            <input className="input" placeholder="Endereço" value={v.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} aria-label="Endereço do cliente" />
            {newClient && <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" checked={saveCli} onChange={(e) => setSaveCli(e.target.checked)} className="h-4 w-4 accent-navy" /> Salvar na minha lista de clientes</label>}
          </div>
        )}
        {!newClient && v.clientId && <p className="text-sm text-muted">{[v.clientPhone, v.clientAddress].filter(Boolean).join(" · ") || "Sem telefone/endereço cadastrado"}</p>}
        <div><label className="label" htmlFor="title">Descrição do serviço <span className="font-normal text-muted">(opcional)</span></label><input id="title" className="input" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Troca do quadro de distribuição" /></div>
      </section>

      {/* 2-5. ITENS */}
      <section className={sectionCls}>
        <Step n={2} title="Serviços, materiais e mão de obra" />
        {items.length === 0 && <p className="rounded-xl bg-light p-4 text-center text-muted">Nenhum item ainda. Use os botões abaixo para adicionar.</p>}
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.key} className="rounded-xl border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className={`badge ${i.kind === "SERVICE" ? "bg-navy text-white" : i.kind === "MATERIAL" ? "bg-light text-navy" : "bg-brand text-navy"}`}>{KIND_LABEL[i.kind]}</span>
                <button type="button" onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))} className="flex items-center gap-1 text-sm font-bold text-red-700" aria-label="Remover item"><IconTrash className="h-4 w-4" /> Remover</button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                <input className="input col-span-6 py-2.5 sm:col-span-3" placeholder="Descrição" value={i.description} onChange={(e) => upd(i.key, { description: e.target.value })} aria-label="Descrição" />
                <input className={`${num} col-span-2 sm:col-span-1`} inputMode="decimal" value={i.quantity} onChange={(e) => upd(i.key, { quantity: e.target.value })} aria-label="Quantidade" />
                <input className="input col-span-1 px-2 py-2.5 text-center text-sm sm:col-span-1" value={i.unit} onChange={(e) => upd(i.key, { unit: e.target.value })} aria-label="Unidade" />
                <input className={`${num} col-span-3 sm:col-span-1`} inputMode="decimal" placeholder="R$ 0,00" value={i.unitPrice} onChange={(e) => upd(i.key, { unitPrice: e.target.value })} aria-label="Valor unitário" />
              </div>
              <p className="mt-1.5 text-right text-sm text-muted">Total: <b className="text-navy">{brl(parse(i.quantity) * parse(i.unitPrice))}</b></p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setPicker("SERVICE")} className="btn-navy"><IconPlus /> Serviço</button>
          <button type="button" onClick={() => setPicker("MATERIAL")} className="btn-navy"><IconPlus /> Material</button>
          <button type="button" onClick={() => addBlank("MATERIAL")} className="btn-outline text-sm"><IconPlus /> Material avulso</button>
          <button type="button" onClick={() => addBlank("LABOR")} className="btn-outline text-sm"><IconPlus /> Mão de obra</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-light px-3 py-2 text-sm">
          <label htmlFor="margin" className="font-bold text-navy">Seu ganho no material da tabela:</label>
          <span className="flex items-center gap-1"><input id="margin" className="input w-20 py-1.5 text-right" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} /> %</span>
          {items.some((i) => i.kind === "MATERIAL") && <button type="button" className="text-xs font-bold text-navy underline" onClick={() => setItems((p) => p.map((i) => { const s = services.find((x) => x.kind === "MATERIAL" && x.name === i.description); return s && i.kind === "MATERIAL" ? { ...i, unitPrice: fmt(salePrice(s)) } : i; }))}>Aplicar nos materiais já adicionados</button>}
        </div>
      </section>

      {/* VALORES */}
      <section className={sectionCls}>
        <Step n={3} title="Deslocamento e desconto" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="travel">Deslocamento (R$)</label><input id="travel" className={num} inputMode="decimal" placeholder="0,00" value={v.travelFee} onChange={(e) => set("travelFee", e.target.value)} /></div>
          <div><label className="label" htmlFor="dt">Tipo de desconto</label>
            <select id="dt" className="input" value={v.discountType} onChange={(e) => set("discountType", e.target.value as "VALUE" | "PERCENT")}><option value="VALUE">Em reais (R$)</option><option value="PERCENT">Em porcentagem (%)</option></select></div>
          <div><label className="label" htmlFor="dv">Desconto</label><input id="dv" className={num} inputMode="decimal" placeholder="0" value={v.discountValue} onChange={(e) => set("discountValue", e.target.value)} /></div>
        </div>
      </section>

      {/* CONDIÇÕES */}
      <section className={sectionCls}>
        <Step n={4} title="Condições" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><label className="label" htmlFor="pt">Condições de pagamento</label><input id="pt" className="input" value={v.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} /></div>
          <div><label className="label" htmlFor="vd">Validade (dias)</label><input id="vd" type="number" min={1} max={180} className="input" value={v.validityDays} onChange={(e) => set("validityDays", e.target.value)} /></div>
          <div className="sm:col-span-3"><label className="label" htmlFor="ex">Prazo de execução</label><input id="ex" className="input" value={v.executionTime} onChange={(e) => set("executionTime", e.target.value)} /></div>
          <div className="sm:col-span-3"><div className="flex items-end justify-between gap-2"><label className="label" htmlFor="nt">Observações</label>{defaultNotes && v.notes.trim() !== defaultNotes.trim() && <button type="button" className="mb-1 text-xs font-bold text-navy underline" onClick={() => set("notes", defaultNotes)}>Usar observações padrão</button>}</div><textarea id="nt" rows={3} className="input" value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ex.: Não incluso acabamento do piso." /></div>
        </div>
      </section>

      {/* BARRA FIXA */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t-4 border-brand bg-navy px-4 py-3 text-white lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-navy-soft">Total {totals.discount > 0 && <span>· desconto {brl(totals.discount)}</span>}</p>
            <p className="text-2xl font-bold">{brl(totals.total)}</p>
          </div>
          <div className="flex gap-2">
            {(!v.status || v.status === "DRAFT") && <button type="button" disabled={pending || !!blocked} onClick={() => submit("draft")} className="btn border-2 border-white/25 px-4 text-white hover:border-white/60">Salvar rascunho</button>}
            <button type="button" disabled={pending || !!blocked} onClick={() => submit("finalize")} className="btn-primary px-4">{pending ? "Salvando..." : v.status && v.status !== "DRAFT" ? "Salvar alterações" : "Finalizar orçamento"}</button>
          </div>
        </div>
      </div>

      {/* SELETOR DE SERVIÇOS / MATERIAIS */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={picker === "MATERIAL" ? "Escolher material" : "Escolher serviço"}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-line p-4">
              <input autoFocus className="input" placeholder={picker === "MATERIAL" ? "Buscar material… (ex.: disjuntor, cabo 2,5)" : "Buscar serviço…"} value={search} onChange={(e) => setSearch(e.target.value)} />
              <button onClick={() => setPicker(null)} className="p-2" aria-label="Fechar"><IconX /></button>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {filtered.length === 0 && <li className="p-6 text-center text-muted">Nada encontrado. <Link href={`/painel/servicos${picker === "MATERIAL" ? "?tipo=material" : ""}`} className="font-bold underline">Cadastrar na minha tabela</Link>{picker === "MATERIAL" && <> ou <button type="button" className="font-bold underline" onClick={() => { addBlank("MATERIAL"); setPicker(null); setSearch(""); }}>adicionar material avulso</button></>}</li>}
              {filtered.map((s) => (
                <li key={s.id}><button type="button" onClick={() => addService(s)} className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left hover:bg-light">
                  <span><b className="block text-navy">{s.name}</b><span className="text-xs text-muted">{s.category} · por {s.unit}</span></span><span className="shrink-0 text-right"><b className="block">{brl(salePrice(s))}</b>{s.kind === "MATERIAL" && marginPct > 0 && <span className="text-xs text-muted">custo {brl(s.price)} + {marginPct}%</span>}</span>
                </button></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return <p className="flex items-center gap-2 text-lg font-bold text-navy"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm">{n}</span>{title}</p>;
}
