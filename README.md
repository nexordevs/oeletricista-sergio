# Sergio Eletricista — Portfólio + Sistema de Orçamentos (SaaS)

Plataforma com duas áreas:

1. **Portfólio público** (`/`): divulga os serviços de eletricista em João Pessoa – PB, com WhatsApp, formulário de orçamento, trabalhos (antes e depois), depoimentos e SEO local.
2. **SaaS para eletricistas** (`/sistema`, `/painel`): assinatura mensal ou anual via Mercado Pago para gerar orçamentos em PDF com a marca de cada profissional.

Identidade visual: azul-marinho `#0F2742` / `#1B3B5F`, amarelo `#FFB400` e fonte Carlito (derivada da Lato), as mesmas do orçamento original.

## Tecnologias

| Camada | Escolha |
|---|---|
| Site e painel | Next.js 14 (App Router, renderizado no servidor) + TypeScript + Tailwind |
| Banco | PostgreSQL + Prisma (funciona com Supabase, Neon, Railway etc.) |
| Login | Próprio: senhas com bcrypt, sessão em cookie httpOnly guardada no banco, bloqueio após 5 tentativas |
| Pagamentos | Mercado Pago Assinaturas (preapproval) + webhook com assinatura HMAC |
| PDF | @react-pdf/renderer, gerado no servidor |
| Imagens | Logos e fotos reprocessadas com sharp e guardadas no banco (entram no backup) |

## Mapa do sistema

| Área | Rotas |
|---|---|
| Site público | `/`, `/servicos`, `/servicos/[slug]`, `/portfolio`, `/orcamento`, `/sistema`, `/privacidade`, `/termos`, `/sitemap.xml`, `/robots.txt` |
| Contas | `/cadastro`, `/entrar`, `/recuperar-senha`, `/redefinir-senha/[token]` |
| Painel do eletricista | `/painel` (dashboard + tutorial), `orcamentos` (lista, filtros, novo, editar, duplicar, PDF, WhatsApp, status), `clientes`, `servicos` (tabela de preços própria), `marca`, `financeiro`\*, `relatorios`\*, `assinatura`, `conta` |
| Link do cliente final | `/o/[token]`: só mostra a marca do eletricista e marca o orçamento como **Visualizado** |
| Administração | `/admin`: indicadores, usuários (bloquear e liberar acesso manual), pagamentos, planos, biblioteca de preços sugeridos, solicitações do site, portfólio, serviços anunciados, depoimentos, textos e regiões |

\* Plano Premium.

## Regras de negócio importantes

- **Isolamento**: toda consulta do painel filtra por `userId` da sessão. Um eletricista nunca lê nem altera dados de outro. Os testes automatizados verificam isso.
- **Assinatura** (`src/lib/access.ts`): o acesso vale se houver assinatura com pagamento **aprovado** e período vigente, ou se o admin liberou manualmente. Assinatura cancelada ou com pagamento atrasado continua com acesso até o fim do período pago, depois bloqueia.
- **Pagamento**: o retorno do navegador **não ativa nada**. A conta só é ativada quando o servidor consulta a API do Mercado Pago e encontra um pagamento `approved` (via webhook, página de retorno ou botão "Verificar agora").
- **Limites e recursos dos planos**: são editáveis em `/admin/planos` e verificados no servidor.
- **Preços sugeridos**: o admin altera a biblioteca sem mexer nos preços que cada assinante personalizou. O assinante passa a ver o novo valor como "preço sugerido".
- **Cálculo do orçamento**: é refeito no servidor (`src/lib/quote-calc.ts`). O total enviado pela tela é ignorado.

## Colocar no ar (passo a passo)

### 1. Banco de dados

Crie um projeto no [Supabase](https://supabase.com) ou no [Neon](https://neon.tech) e copie a *connection string* do PostgreSQL.

### 2. Hospedagem

Recomendado: [Vercel](https://vercel.com).

1. Importe o repositório.
2. Configure as variáveis do arquivo `.env.example` em *Settings → Environment Variables*.
3. Defina o comando de build: `npx prisma migrate deploy && npm run build`.

### 3. Dados iniciais e administrador

Rode uma vez, com a `DATABASE_URL` de produção:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

```bash
npm run create-admin -- seu-email@exemplo.com "SuaSenhaForte123" "Sergio"
```

O seed cria:

- os 3 planos;
- a **biblioteca com 86 serviços** da tabela de preços médios 2026, com preço padrão (médio) e faixa mínimo–máximo;
- os 8 serviços do portfólio, os bairros atendidos e os trabalhos na Loja Torras e no Hotel Bessa Beach.

Confira em `/admin/servicos` e desmarque o que você não faz.

Para atualizar a biblioteca de preços no futuro, edite `prisma/price-table.ts` e rode o comando abaixo. A tabela pessoal de cada eletricista não é alterada.

```bash
npm run import-prices
```

### 4. Mercado Pago

1. Acesse <https://www.mercadopago.com.br/developers/panel/app> e crie uma aplicação do tipo "Assinaturas".
2. Em *Credenciais de produção*, copie o **Access Token** para `MP_ACCESS_TOKEN`.
3. Em *Webhooks*, configure:
   - URL: `https://SEU-DOMINIO/api/webhooks/mercadopago`
   - Eventos: **Planos e assinaturas** (`subscription_preapproval` e `subscription_authorized_payment`) e **Pagamentos**
4. Copie a **assinatura secreta** gerada para `MP_WEBHOOK_SECRET`.
5. Teste com as credenciais de teste antes de usar as de produção.

### 5. E-mail (recuperação de senha)

Preencha `SMTP_*` e `MAIL_FROM`. Sem isso, em produção a recuperação de senha mostra erro. Em desenvolvimento, o link aparece no terminal.

### 6. Google

- O link de avaliação do Google aparece no rodapé, na seção de depoimentos e após o envio do formulário. Ele pode ser trocado em `/admin/site`.
- A foto de perfil da seção "Sobre mim" é enviada em `/admin/site`.


1. Cadastre o site no Google Search Console e envie `https://SEU-DOMINIO/sitemap.xml`.
2. Crie ou atualize o **Perfil da Empresa no Google** com o mesmo nome, telefone e região. É o fator que mais pesa para aparecer em "eletricista em João Pessoa".

O painel `/admin` mostra um aviso enquanto alguma dessas configurações estiver faltando.

## Backups

- **Supabase/Neon**: os planos pagos fazem backup diário automático. Ative.
- **Backup manual** (inclui logos e fotos):

  ```bash
  DATABASE_URL="..." ./scripts/backup.sh
  ```

  Mantém os 30 arquivos mais recentes em `backups/`. Para restaurar:

  ```bash
  pg_restore --clean --no-owner -d "$DATABASE_URL" arquivo.dump
  ```

## Desenvolvimento

```bash
npm install
```

```bash
cp .env.example .env
```

Depois de copiar, preencha pelo menos `DATABASE_URL` no `.env`. Em seguida:

```bash
npx prisma migrate deploy && npm run db:seed
```

```bash
npm run dev
```

### Testes

Lógica de cálculo, webhook e assinaturas (respostas do Mercado Pago simuladas só no teste):

```bash
npm test
```

Testes no navegador (segurança, isolamento entre eletricistas, bloqueio sem assinatura, limite do plano, solicitações do site):

```bash
DATABASE_URL="..." node tests/e2e.cjs
```

## Segurança aplicada

- Senhas com bcrypt (custo 12), sessões aleatórias guardadas como hash, cookie `httpOnly`, `secure` e `SameSite=Lax`.
- Limite de tentativas de login, cadastro, recuperação e formulário público, mais bloqueio de conta após 5 erros.
- Ações do servidor com validação Zod. As server actions do Next.js já verificam a origem contra CSRF.
- Rotas `/admin` exigem papel ADMIN em cada página e em cada ação, não só no menu.
- Uploads reprocessados com sharp (remove metadados e scripts), com limite de tipo e tamanho.
- Cabeçalhos HSTS, X-Frame-Options, nosniff e Referrer-Policy.
- Migração `rls_lockdown`: liga Row Level Security em todas as tabelas, bloqueando a API automática do Supabase. O app conecta como dono e aplica o isolamento por usuário.
- Chaves secretas só existem no servidor (`src/lib/env.ts`) e nunca vão para o navegador.
