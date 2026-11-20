"use client";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { useState } from "react";
import Link from "next/link";
import { saveBrand } from "./actions";
import { Submit, FormMessage, Field } from "@/components/ui";

type B = { professionalName: string; companyName: string | null; document: string | null; phone: string | null; whatsapp: string | null; address: string | null; email: string | null; tagline: string | null; primaryColor: string; accentColor: string; defaultPaymentTerms: string | null; defaultExecution: string | null; defaultValidityDays: number; defaultNotes: string | null; hasLogo: boolean; hasSignature: boolean; v: number };

export function BrandForm({ b, full }: { b: B; full: boolean }) {
  const [s, a, aPending] = useStickyAction(saveBrand);
  const [primary, setPrimary] = useState(b.primaryColor);
  const [accent, setAccent] = useState(b.accentColor);
  const [preview, setPreview] = useState<string | null>(null);
  const t = (k: keyof B) => (b[k] as string | null) ?? "";
  return (
    <StickyForm pending={aPending} onSubmit={a} className="space-y-6" noValidate>
      <FormMessage state={s} />
      <section className="card space-y-4">
        <p className="text-lg font-bold text-navy">Logomarca</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-light">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="Prévia" className="max-h-full max-w-full object-contain" /> : b.hasLogo ? <img src={`/painel/marca/img?k=logo&v=${b.v}`} alt="Logomarca" className="max-h-full max-w-full object-contain" /> : <span className="px-2 text-center text-xs text-muted">Sem logo</span>}
          </div>
          <div className="space-y-2">
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:font-bold file:text-white"
              onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
            <p className="text-xs text-muted">PNG com fundo transparente fica melhor. Até 4 MB.</p>
            {b.hasLogo && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeLogo" className="accent-navy" /> Remover logo atual</label>}
          </div>
        </div>
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <p className="text-lg font-bold text-navy sm:col-span-2">Seus dados (aparecem no orçamento)</p>
        <Field label="Nome profissional" name="professionalName" state={s}><input id="professionalName" name="professionalName" defaultValue={b.professionalName} className="input" /></Field>
        <Field label="Nome da empresa (opcional)" name="companyName" state={s}><input id="companyName" name="companyName" defaultValue={t("companyName")} className="input" /></Field>
        <Field label="CPF ou CNPJ" name="document" state={s}><input id="document" name="document" defaultValue={t("document")} inputMode="numeric" className="input" /></Field>
        <Field label="Frase abaixo do nome" name="tagline" state={s}><input id="tagline" name="tagline" defaultValue={t("tagline")} placeholder="Instalações • Manutenção • Emergência" className="input" /></Field>
        <Field label="WhatsApp" name="whatsapp" state={s}><input id="whatsapp" name="whatsapp" defaultValue={t("whatsapp")} inputMode="tel" placeholder="(83) 9 0000-0000" className="input" /></Field>
        <Field label="Telefone (opcional)" name="phone" state={s}><input id="phone" name="phone" defaultValue={t("phone")} inputMode="tel" className="input" /></Field>
        <Field label="E-mail" name="email" state={s}><input id="email" name="email" type="email" defaultValue={t("email")} className="input" /></Field>
        <Field label="Endereço / cidade" name="address" state={s}><input id="address" name="address" defaultValue={t("address")} className="input" /></Field>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between"><p className="text-lg font-bold text-navy">Cores e assinatura</p>{!full && <Link href="/painel/assinatura" className="badge bg-brand text-navy">Plano Profissional</Link>}</div>
        <fieldset disabled={!full} className="grid gap-4 disabled:opacity-50 sm:grid-cols-2">
          <Field label="Cor principal" name="primaryColor" state={s}><div className="flex gap-2"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-12 w-14 cursor-pointer rounded-lg border border-line" aria-label="Escolher cor principal" /><input id="primaryColor" name="primaryColor" value={primary} onChange={(e) => setPrimary(e.target.value)} className="input" /></div></Field>
          <Field label="Cor de destaque" name="accentColor" state={s}><div className="flex gap-2"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-12 w-14 cursor-pointer rounded-lg border border-line" aria-label="Escolher cor de destaque" /><input id="accentColor" name="accentColor" value={accent} onChange={(e) => setAccent(e.target.value)} className="input" /></div></Field>
          <div className="sm:col-span-2">
            <span className="label">Assinatura (imagem)</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.hasSignature && <img src={`/painel/marca/img?k=signature&v=${b.v}`} alt="Assinatura" className="h-14 rounded-lg border border-line bg-white object-contain p-1" />}
              <input type="file" name="signature" accept="image/png,image/jpeg,image/webp" className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:font-bold file:text-white" />
              {b.hasSignature && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeSignature" className="accent-navy" /> Remover</label>}
            </div>
            <p className="mt-1 text-xs text-muted">Dica: assine num papel branco, tire uma foto bem de perto e envie.</p>
          </div>
          <div className="sm:col-span-2 overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between px-4 py-3" style={{ background: primary, borderBottom: `4px solid ${accent}` }}><b className="text-white">Prévia do cabeçalho</b><b style={{ color: accent }}>ORÇAMENTO</b></div>
          </div>
        </fieldset>
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <p className="text-lg font-bold text-navy sm:col-span-2">Padrões dos orçamentos</p>
        <Field label="Condições de pagamento" name="defaultPaymentTerms" state={s}><input id="defaultPaymentTerms" name="defaultPaymentTerms" defaultValue={t("defaultPaymentTerms")} className="input" /></Field>
        <Field label="Prazo de execução" name="defaultExecution" state={s}><input id="defaultExecution" name="defaultExecution" defaultValue={t("defaultExecution")} className="input" /></Field>
        <Field label="Validade (dias)" name="defaultValidityDays" state={s}><input id="defaultValidityDays" name="defaultValidityDays" type="number" min={1} max={180} defaultValue={b.defaultValidityDays} className="input" /></Field>
        <Field label="Observações padrão" name="defaultNotes" state={s}><textarea id="defaultNotes" name="defaultNotes" rows={3} defaultValue={t("defaultNotes")} placeholder="Ex.: Garantia de 90 dias na mão de obra." className="input" /></Field>
      </section>
      <div className="sticky bottom-20 z-10 lg:bottom-4"><Submit className="btn-primary w-full shadow-lg sm:w-auto">Salvar minha marca</Submit></div>
    </StickyForm>
  );
}
