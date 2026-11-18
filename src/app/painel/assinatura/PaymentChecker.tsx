"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyPayment } from "./actions";
import { IconCheck, IconClock } from "@/components/icons";

/** Verifica sozinho a cada 6 s (até ~5 min) e oferece o botão "Já paguei". */
export function PaymentChecker({ subId, planName }: { subId: string; planName: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const tries = useRef(0);

  const check = (manual = false) => start(async () => {
    const r = await verifyPayment(subId);
    if (manual || r.status === "ACTIVE") setMsg(r.message);
    if (r.status === "ACTIVE") { setDone(true); router.refresh(); }
  });

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (++tries.current > 50) return clearInterval(t);
      check();
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) return <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-4 font-bold text-green-800"><IconCheck /> {msg}</p>;
  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 font-bold text-amber-900"><IconClock className="h-5 w-5 animate-pulse" /> Aguardando confirmação do pagamento do plano {planName}</p>
      <p className="mt-1 text-sm text-amber-900/80">Estou verificando automaticamente. Se você já pagou, pode clicar abaixo.</p>
      <button type="button" disabled={pending} onClick={() => check(true)} className="btn-primary mt-3">{pending ? "Verificando no Mercado Pago..." : "Já paguei — verificar agora"}</button>
      {msg && <p className="mt-2 text-sm font-bold text-navy">{msg}</p>}
    </div>
  );
}
