import { ResetForm } from "../../forms";
export const metadata = { title: "Nova senha" };
export default function Page({ params }: { params: { token: string } }) {
  return (<><h1 className="text-2xl font-bold text-navy">Criar nova senha</h1><p className="mb-6 mt-1 text-muted">Escolha uma senha nova para sua conta.</p><ResetForm token={params.token} /></>);
}
