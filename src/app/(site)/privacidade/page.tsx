import type { Metadata } from "next";
export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };
export default function P() {
  return (
    <div className="container-x max-w-3xl space-y-4 py-12 leading-relaxed">
      <h1 className="section-title">Política de privacidade</h1><div className="section-bar" />
      <p>Coletamos apenas os dados necessários: no formulário de orçamento (nome, telefone, bairro e descrição do serviço) e, no sistema para eletricistas, os dados de cadastro, da marca, dos clientes e dos orçamentos que você cria.</p>
      <p>Os dados de cada eletricista assinante são privados e acessíveis somente pela própria conta e pela administração, para suporte e cumprimento de obrigações legais. Pagamentos são processados pelo Mercado Pago; não armazenamos dados de cartão.</p>
      <p>Você pode solicitar a correção ou exclusão dos seus dados a qualquer momento pelos canais de contato do site, conforme a Lei Geral de Proteção de Dados (LGPD).</p>
    </div>
  );
}
