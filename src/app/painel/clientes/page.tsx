import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { fmtPhone } from "@/lib/money";
import { ClientForm } from "./ClientForm";
import { IconUsers } from "@/components/icons";

export default async function Clientes(
  props: { searchParams: Promise<{ q?: string; novo?: string; back?: string }> }
) {
  const searchParams = await props.searchParams;
  const { user } = await panelContext();
  const q = (searchParams.q || "").trim().slice(0, 80);
  const clients = await prisma.client.findMany({
    where: { userId: user.id, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }, { address: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { name: "asc" }, take: 200, include: { _count: { select: { quotes: true } } },
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Buscar por nome, telefone ou endereço" className="input" /><button className="btn-navy">Buscar</button></form>
        {clients.length === 0 ? (
          <div className="card text-center"><IconUsers className="mx-auto h-10 w-10 text-muted" /><p className="mt-2 font-bold text-navy">{q ? "Nenhum cliente encontrado." : "Nenhum cliente ainda."}</p><p className="text-sm text-muted">{q ? "Tente outro termo." : "Cadastre ao lado — leva 10 segundos."}</p></div>
        ) : (
          <ul className="card divide-y divide-line p-0">
            {clients.map((c) => (
              <li key={c.id}><Link href={`/painel/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-light">
                <span className="min-w-0"><span className="block truncate font-bold text-navy">{c.name}</span><span className="block truncate text-sm text-muted">{[fmtPhone(c.phone), c.address].filter(Boolean).join(" · ") || "Sem contato"}</span></span>
                <span className="shrink-0 text-xs font-bold text-muted">{c._count.quotes} orç.</span>
              </Link></li>
            ))}
          </ul>
        )}
      </div>
      <aside className="card h-fit" id="novo"><p className="mb-4 text-lg font-bold text-navy">Novo cliente</p><ClientForm back={searchParams.back} /></aside>
    </div>
  );
}
