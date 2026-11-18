"use client";
import { useState } from "react";
import Link from "next/link";
import { markShared } from "../actions";
import { IconWhatsApp, IconCopy, IconDownload, IconEye } from "@/components/icons";
import { onlyDigits } from "@/lib/money";

export function SharePanel({ id, link, pdfUrl, fileName, phone, defaultMsg, canWa, draft }: { id: string; link: string; pdfUrl: string; fileName: string; phone: string; defaultMsg: string; canWa: boolean; draft: boolean }) {
  const [msg, setMsg] = useState(defaultMsg);
  const [to, setTo] = useState(phone);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const waUrl = () => { let d = onlyDigits(to); if (d && d.length <= 11) d = "55" + d; return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`; };
  async function sharePdf() {
    setBusy(true);
    try {
      const blob = await (await fetch(pdfUrl)).blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: msg }); await markShared(id); }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName; a.click(); }
    } catch { /* usuário cancelou */ } finally { setBusy(false); }
  }
  if (draft) return <div className="card"><p className="font-bold text-navy">Este orçamento ainda é um rascunho.</p><p className="text-sm text-muted">Finalize para liberar o link e o envio ao cliente. Você já pode baixar o PDF para conferir.</p><a href={`${pdfUrl}&ver=1`} target="_blank" className="btn-outline btn-sm mt-3"><IconEye className="h-4 w-4" /> Ver PDF</a></div>;
  return (
    <div className="card space-y-4">
      <p className="text-lg font-bold text-navy">Enviar para o cliente</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={pdfUrl} className="btn-navy"><IconDownload /> Baixar PDF</a>
        <button type="button" className="btn-outline" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}><IconCopy /> {copied ? "Link copiado!" : "Copiar link"}</button>
      </div>
      {canWa ? (
        <div className="space-y-3 rounded-xl bg-light p-4">
          <p className="font-bold text-navy">WhatsApp</p>
          <div><label className="label" htmlFor="to">Número do cliente</label><input id="to" className="input" inputMode="tel" value={to} onChange={(e) => setTo(e.target.value)} placeholder="(83) 9 0000-0000" /></div>
          <div><label className="label" htmlFor="msg">Mensagem</label><textarea id="msg" rows={5} className="input" value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a href={onlyDigits(to).length >= 10 ? waUrl() : undefined} target="_blank" rel="noopener" onClick={(e) => { if (onlyDigits(to).length < 10) { e.preventDefault(); alert("Informe o WhatsApp do cliente com DDD."); return; } markShared(id); }} className="btn-wa"><IconWhatsApp /> Enviar mensagem com link</a>
            <button type="button" disabled={busy} onClick={sharePdf} className="btn-outline">{busy ? "Preparando..." : "Compartilhar PDF (celular)"}</button>
          </div>
          <p className="text-xs text-muted">Quando o cliente abrir o link, o status muda para <b>Visualizado</b> automaticamente.</p>
        </div>
      ) : (
        <p className="rounded-xl bg-light p-4 text-sm text-muted">Envio direto pelo WhatsApp com mensagem pronta está no <Link href="/painel/assinatura" className="font-bold text-navy underline">plano Profissional</Link>. Você pode baixar o PDF e enviar manualmente.</p>
      )}
    </div>
  );
}
