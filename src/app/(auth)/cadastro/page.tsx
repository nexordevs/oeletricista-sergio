import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { SignupForm } from "../forms";
export const metadata = { title: "Criar conta" };
export default async function Cadastro(props: { searchParams: Promise<{ plano?: string }> }) {
  const searchParams = await props.searchParams;
  if (await getUser()) redirect(searchParams.plano ? `/painel/assinatura?plano=${encodeURIComponent(searchParams.plano)}` : "/painel");
  return (<><h1 className="text-2xl font-bold text-navy">Criar conta</h1><p className="mb-6 mt-1 text-muted">Leva menos de 1 minuto.</p><SignupForm plano={searchParams.plano} /></>);
}
