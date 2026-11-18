import { ResetForm } from "../../forms";
export const metadata = { title: "Nova senha" };
export default async function Page(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return (<><h1 className="text-2xl font-bold text-navy">Criar nova senha</h1><p className="mb-6 mt-1 text-muted">Escolha uma senha nova para sua conta.</p><ResetForm token={params.token} /></>);
}
