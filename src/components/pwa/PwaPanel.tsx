"use client";
// Registra o service worker, guarda as telas principais para uso offline,
// mostra o aviso "sem internet" e envia os orçamentos feitos offline quando a internet volta.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuote } from "@/app/painel/orcamentos/actions";
import { readQueue, removeFromQueue, markError, isNetworkError, EVENT, type QueuedQuote } from "@/lib/offline-queue";
import { brl } from "@/lib/money";

const WARM = ["/painel", "/painel/orcamentos", "/painel/orcamentos/novo", "/painel/clientes", "/painel/servicos", "/painel/servicos?tipo=material", "/painel/dimensionamento", "/painel/guia", "/painel/financeiro"];

export function PwaPanel({ userId }: { userId: string }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedQuote[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const busy = useRef(false);
  const mine = useCallback(() => readQueue().filter((q) => q.userId === userId), [userId]);

  const sync = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    const items = mine();
    if (!items.length) return;
    busy.current = true; setSending(true);
    let ok = 0;
    for (const it of items) {
      try {
        const r = await saveQuote(it.payload, it.intent);
        if (r.ok) { removeFromQueue(it.id); ok++; } else markError(it.id, r.error);
      } catch (e) {
        if (isNetworkError(e)) break;
        markError(it.id, "Não foi possível enviar. Abra o orçamento e salve de novo.");
      }
    }
    busy.current = false; setSending(false);
    if (ok) { setSent((s) => s + ok); router.refresh(); }
  }, [mine, router]);

  useEffect(() => {
    const upd = () => setQueue(mine());
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    setOnline(navigator.onLine); upd();
    window.addEventListener("online", on); window.addEventListener("offline", off); window.addEventListener(EVENT, upd); window.addEventListener("storage", upd);
    sync();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready).then((reg) => {
        if (navigator.onLine) reg.active?.postMessage({ type: "warm", urls: WARM });
      }).catch(() => {});
    }
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener(EVENT, upd); window.removeEventListener("storage", upd); };
  }, [mine, sync]);

  const pending = queue.length;
  if (online && !pending && !sent) return null;
  return (
    <div className="mb-4 space-y-2" aria-live="polite">
      {!online && <p className="rounded-xl border-2 border-brand bg-navy px-4 py-3 text-sm font-bold text-white">Sem internet. Você está vendo a última versão salva. Orçamentos novos ficam guardados no celular e são enviados quando a internet voltar.</p>}
      {pending > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">{pending} orçamento(s) guardado(s) no celular {online ? (sending ? "— enviando…" : "") : "— serão enviados quando a internet voltar"}</p>
          <ul className="mt-1 space-y-1">{queue.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center justify-between gap-2"><span>{q.clientName || "Sem cliente"} · {brl(q.total)}{q.error && <b className="text-red-700"> — {q.error}</b>}</span>
              {q.error && <button type="button" className="font-bold underline" onClick={() => { if (confirm("Descartar este orçamento guardado?")) removeFromQueue(q.id); }}>Descartar</button>}</li>
          ))}</ul>
          {online && !sending && <button type="button" className="mt-2 font-bold underline" onClick={sync}>Enviar agora</button>}
        </div>
      )}
      {sent > 0 && pending === 0 && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{sent} orçamento(s) feito(s) sem internet foram enviados e já estão na sua lista. <button type="button" className="underline" onClick={() => setSent(0)}>Ok</button></p>}
    </div>
  );
}
