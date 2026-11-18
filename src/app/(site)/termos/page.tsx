import type { Metadata } from "next";
export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/termos" } };
export default function T() {
  return (
    <div className="container-x max-w-3xl space-y-4 py-12 leading-relaxed">
      <h1 className="section-title">Termos de uso do sistema</h1><div className="section-bar" />
      <p>O sistema de orçamentos é oferecido por assinatura mensal ou anual, cobrada de forma recorrente pelo Mercado Pago. O acesso é liberado após a confirmação do pagamento e permanece ativo até o fim do período pago.</p>
      <p>Você pode cancelar a qualquer momento pelo painel; não haverá novas cobranças e o acesso continua até o fim do período já pago. Os preços sugeridos na biblioteca de serviços são apenas referência: cada profissional é responsável pelos valores e condições que informa aos seus clientes.</p>
      <p>É proibido usar o sistema para fins ilícitos ou para acessar dados de outros usuários. Contas que violem estes termos podem ser bloqueadas.</p>
    </div>
  );
}
