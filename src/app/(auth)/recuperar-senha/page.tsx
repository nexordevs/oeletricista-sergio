import { ForgotForm } from "../forms";
export const metadata = { title: "Recuperar senha" };
export default function Page() {
  return (<><h1 className="text-2xl font-bold text-navy">Esqueci minha senha</h1><p className="mb-6 mt-1 text-muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p><ForgotForm /></>);
}
