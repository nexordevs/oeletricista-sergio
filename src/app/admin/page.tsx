import Link from "next/link";
import { prisma } from "@/lib/db";
import { adminMetrics } from "@/lib/admin-metrics";
import { mpConfigured, env } from "@/lib/env";
import { mailConfigured } from "@/lib/mail";
import { brl, fmtDate } from "@/lib/money";
import { requireAdmin } from "@/lib/auth";
import { studyHours } from "@/lib/mentoria-server";
import { HorasCard } from "./mentoria/HorasCard";

export default async function AdminHome() {
  const u = await requireAdmin();
  const [m, horas] = await Promise.all([adminMetrics(), studyHours(u.id)]);
  const recent = await prisma.user.findMany({ where: { role: "ELECTRICIAN" }, orderBy: { createdAt: "desc" }, take: 6 });
  const checks = [
    { ok: mpConfigured(), label: "Mercado Pago (MP_ACCESS_TOKEN)" },
    { ok: Boolean(env.mpWebhookSecret), label: "Webhook do Mercado Pago (MP_WEBHOOK_SECRET)" },
    { ok: mailConfigured(), label: "E-mail para recuperação de senha (SMTP)" },
    { ok: env.appUrl.startsWith("https://"), label: "Endereço público com HTTPS (APP_URL)" },
  ];
  return (
    <div className="space-y-6">
      {checks.some((c) => !c.ok) && (
        <section className="rounded-2xl border-2 border-brand bg-white p-5">
          <p className="font-bold text-navy">Configuração pendente</p>
          <ul className="mt-2 space-y-1 text-sm">{checks.map((c) => <li key={c.label} className={c.ok ? "text-green-700" : "font-bold text-red-700"}>{c.ok ? "✓" : "✗"} {c.label}</li>)}</ul>
        </section>
      )}
      {horas && <HorasCard h={horas} dashboard />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <K l="Assinantes (total de contas)" v={String(m.users)} />
        <K l="Assinantes ativos" v={String(m.active)} s={`+ ${m.manual} com acesso manual`} />
        <K l="Inadimplentes" v={String(m.pastDue)} red />
        <K l="Novos cadastros (30 dias)" v={String(m.newUsers)} />
        <K l="Receita recorrente mensal" v={brl(m.mrr)} big />
        <K l="Faturamento do mês" v={brl(m.revenueMonth)} big />
        <K l="Cancelamentos (30 dias)" v={String(m.cancelled30)} />
        <K l="Taxa de conversão" v={`${m.conversion.toFixed(1)}%`} s="contas que já pagaram" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-0"><div className="flex justify-between px-5 py-4"><b className="text-navy">Novos cadastros</b><Link href="/admin/usuarios" className="text-sm font-bold text-navy underline">Ver todos</Link></div>
          {recent.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nenhum cadastro ainda.</p> : <ul className="divide-y divide-line">{recent.map((u) => <li key={u.id}><Link href={`/admin/usuarios/${u.id}`} className="flex justify-between px-5 py-3 hover:bg-light"><span className="truncate font-bold text-navy">{u.name}</span><span className="text-sm text-muted">{fmtDate(u.createdAt)}</span></Link></li>)}</ul>}
        </section>
        <section className="card"><b className="text-navy">Solicitações do portfólio</b><p className="mt-2 text-4xl font-bold text-navy">{m.leadsNew}</p><p className="text-sm text-muted">novas aguardando contato</p><Link href="/admin/solicitacoes" className="btn-primary btn-sm mt-4">Ver solicitações</Link></section>
      </div>
    </div>
  );
}
function K({ l, v, s, red, big }: { l: string; v: string; s?: string; red?: boolean; big?: boolean }) {
  return <div className={`card ${big ? "border-l-4 border-l-brand" : ""}`}><p className="text-xs font-bold uppercase text-muted">{l}</p><p className={`mt-1 text-2xl font-bold ${red ? "text-red-700" : "text-navy"}`}>{v}</p>{s && <p className="text-xs text-muted">{s}</p>}</div>;
}
