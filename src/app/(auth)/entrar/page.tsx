import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "../forms";
export const metadata = { title: "Entrar" };
export default async function Entrar(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  const u = await getUser();
  if (u) redirect(u.role === "ADMIN" ? "/admin" : "/painel");
  return (<><h1 className="text-2xl font-bold text-navy">Entrar</h1><p className="mb-6 mt-1 text-muted">Acesse seu painel de orçamentos.</p><LoginForm next={searchParams.next} /></>);
}
