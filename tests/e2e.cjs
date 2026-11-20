// Testes de ponta a ponta (Playwright). Requer: app rodando em localhost:3000, banco local e admin criado com
// npm run create-admin -- admin@teste.local "TesteAdmin123" "Sergio". Executar: node tests/e2e.cjs
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const B = process.env.BASE_URL || 'http://localhost:3000', S = require('os').tmpdir() + '/';
const sql = (q) => execSync(`psql ${process.env.DATABASE_URL} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim().split('\n')[0];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function signup(b, name, email) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  await p.goto(B + '/cadastro'); await p.fill('#name', name); await p.fill('#email', email); await p.fill('#password', 'Senha12345');
  await p.check('input[name=terms]'); await p.click('button[type=submit]'); await p.waitForURL(/\/painel/); return p;
}
async function makeQuote(p, client, beforeClick) {
  await p.goto(B + '/painel/orcamentos/novo'); await p.waitForLoadState('networkidle');
  const sel = p.locator('select[aria-label="Escolher cliente"]'); if (await sel.count()) await sel.selectOption('__new');
  await p.fill('input[aria-label="Nome do cliente"]', client);
  await p.click('text=Serviço da tabela'); await p.click('button:has-text("Substituição de disjuntor monofásico")');
  if (beforeClick) beforeClick();
  await p.click('button:has-text("Finalizar orçamento")');
  await Promise.race([p.waitForURL(/salvo=1/, { timeout: 15000 }), p.waitForSelector('[role=alert].rounded-xl', { timeout: 15000 })]).catch(() => {});
  return p.url();
}
(async () => {
  const b = await chromium.launch(); const t = Date.now();
  const r401 = await fetch(B + '/api/webhooks/mercadopago?data.id=1&type=payment', { method: 'POST', body: '{}' });
  ok(r401.status === 401, 'webhook sem assinatura é recusado (401)');
  const anon = await (await b.newContext()).newPage();
  await anon.goto(B + '/painel'); ok(anon.url().includes('/entrar'), 'visitante é mandado para login ao abrir /painel');
  await anon.goto(B + '/admin'); ok(anon.url() === B + '/', 'visitante em /admin vai para a página inicial');

  // Formulário com erro mantém o que foi digitado (regressão do React 19)
  const fk = await (await b.newContext()).newPage();
  await fk.goto(B + '/cadastro'); await fk.fill('#name', 'Fulano Teste'); await fk.fill('#email', `fk${t}@teste.local`); await fk.fill('#password', 'curta'); await fk.check('input[name=terms]');
  await fk.click('button[type=submit]'); await fk.waitForSelector('[role=alert].rounded-xl');
  ok(await fk.inputValue('#name') === 'Fulano Teste' && await fk.inputValue('#email') === `fk${t}@teste.local`, 'formulário com erro mantém os campos digitados');

  const A = await signup(b, 'Eletricista A', `a${t}@teste.local`);
  ok(await A.isVisible('text=Sua assinatura não está ativa'), 'sem assinatura: aviso no painel');
  await A.goto(B + '/painel/orcamentos/novo');
  ok(await A.locator('button:has-text("Finalizar orçamento")').isDisabled(), 'sem assinatura: botão de salvar desabilitado na tela');
  await A.goto(B + '/admin'); ok(A.url() === B + '/', 'eletricista comum em /admin vai para a página inicial');

  // Admin libera acesso manual (plano Inicial)
  const adm = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await adm.goto(B + '/entrar'); await adm.fill('#email', 'admin@teste.local'); await adm.fill('#password', 'TesteAdmin123'); await adm.click('button[type=submit]'); await adm.waitForURL(/admin/); ok(adm.url().endsWith('/admin'), 'administrador entra pelo login comum e cai direto no painel de admin');
  const aId = sql(`select id from "User" where email='a${t}@teste.local'`);
  await adm.goto(B + '/admin/usuarios/' + aId);
  const inicial = sql(`select id from "Plan" where slug='inicial'`);
  await adm.selectOption('#planId', inicial); await adm.click('button:has-text("Liberar acesso")'); await adm.waitForSelector('text=Acesso liberado.');
  ok(true, 'admin liberou acesso manual');

  const url = await makeQuote(A, 'Cliente do A');
  ok(await A.isVisible('text=plano Profissional'), 'plano Inicial: WhatsApp/status bloqueados com aviso de upgrade');
  // servidor: acesso cortado depois da tela carregada -> salvamento recusado
  await makeQuote(A, 'Teste servidor', () => sql(`update "User" set "manualAccessUntil"=now() - interval '1 day' where id='${aId}'`));
  ok(await A.isVisible('text=assinatura não está ativa'), 'servidor recusa salvar sem assinatura ativa (mesmo burlando a tela)');
  sql(`update "User" set "manualAccessUntil"=now() + interval '30 day' where id='${aId}'`);
  ok(/salvo=1/.test(url), 'com acesso liberado: orçamento salvo');
  const qid = url.split('/orcamentos/')[1].split('?')[0];

  // Limite do plano
  await makeQuote(A, 'Outro cliente', () => sql(`update "Plan" set "quoteLimit"=1 where slug='inicial'`));
  ok(await A.isVisible('text=atingiu o limite'), 'limite mensal do plano é respeitado no servidor');
  sql(`update "Plan" set "quoteLimit"=30 where slug='inicial'`);

  // Status do orçamento (Aprovado / Recusado / Voltar para Enviado) — plano com status
  const prem = sql(`select id from "Plan" where slug='premium'`);
  sql(`update "User" set "manualPlanId"='${prem}' where id='${aId}'`);
  await A.goto(B + '/painel/orcamentos/' + qid);
  await A.click('button:has-text("Aprovado")'); await A.waitForTimeout(2500);
  ok(sql(`select status from "Quote" where id='${qid}'`) === 'APPROVED', 'botão Aprovado muda o status para APROVADO');
  await A.click('button:has-text("Voltar para")'); await A.waitForTimeout(2500);
  ok(sql(`select status from "Quote" where id='${qid}'`) === 'SENT', 'botão Voltar para Enviado funciona');
  await A.click('button:has-text("Recusado")'); await A.waitForTimeout(2500);
  ok(sql(`select status from "Quote" where id='${qid}'`) === 'REJECTED', 'botão Recusado muda o status para RECUSADO');
  sql(`update "Quote" set status='SENT', "decidedAt"=null where id='${qid}'`);

  // Isolamento: B não vê nada de A
  const Bp = await signup(b, 'Eletricista B', `b${t}@teste.local`);
  const r1 = await Bp.goto(B + '/painel/orcamentos/' + qid); ok(r1.status() === 404, 'B não abre orçamento de A (404)');
  const r2 = await Bp.goto(B + `/painel/orcamentos/${qid}/pdf`); ok(r2.status() === 404, 'B não baixa PDF de A (404)');
  const cA = sql(`select id from "Client" where "userId"='${aId}' limit 1`);
  const r3 = await Bp.goto(B + '/painel/clientes/' + cA); ok(r3.status() === 404, 'B não abre cliente de A (404)');
  await Bp.goto(B + '/painel/servicos');
  const bSvc = sql(`select id from "UserService" where "userId"=(select id from "User" where email='b${t}@teste.local') and name='Substituição de disjuntor monofásico'`);
  await Bp.fill(`#p${bSvc}`, '999,00'); await Bp.locator(`#p${bSvc}`).locator('xpath=ancestor::form').locator('button[type=submit]').click(); await Bp.waitForTimeout(1500);
  const aPrice = sql(`select price from "UserService" where "userId"='${aId}' and name='Substituição de disjuntor monofásico'`);
  ok(aPrice === '70.00', `alterar preço em B não muda a tabela de A (A=${aPrice})`);

  // Rascunho não é público
  const draftTok = sql(`insert into "Quote"(id,"userId",number,"clientName","shareToken","updatedAt") values ('dq${t}','${aId}',99,'X','tok${t}abcdefghijklmnop',now()) returning "shareToken"`);
  const r4 = await anon.goto(B + '/o/' + draftTok); ok(r4.status() === 404, 'rascunho não abre pelo link público');

  // Pagamento pendente: assinante vê "Já paguei"; admin ativa manualmente e o valor é contabilizado
  const bId = sql(`select id from "User" where email='b${t}@teste.local'`);
  const prof = sql(`select id from "Plan" where slug='profissional'`);
  const subId = sql(`insert into "Subscription"(id,"userId","planId",amount,status,"mpPreapprovalId","updatedAt") values ('sub${t}','${bId}','${prof}',34.90,'PENDING','pre_fake_${t}',now()) returning id`);
  await Bp.goto(B + '/painel/assinatura');
  ok(await Bp.isVisible('text=Já paguei'), 'assinante com pagamento pendente vê o botão "Já paguei"');
  await adm.goto(B + '/admin/pagamentos');
  ok(await adm.isVisible('text=Eletricista B'), 'admin vê a assinatura aguardando pagamento');
  const row = adm.locator('li', { hasText: `b${t}@teste.local` });
  await row.locator('summary:has-text("Ativar manualmente")').click();
  adm.once('dialog', (d) => d.accept());
  await row.locator('button:has-text("Confirmar pagamento e ativar")').click();
  for (let i = 0; i < 30 && sql(`select status from "Subscription" where id='${subId}'`) !== 'ACTIVE'; i++) await adm.waitForTimeout(500);
  ok(sql(`select status from "Subscription" where id='${subId}'`) === 'ACTIVE', 'admin ativou a assinatura manualmente');
  ok(sql(`select count(*) from "Payment" where "subscriptionId"='${subId}' and status='manual' and amount=34.90`) === '1', 'pagamento manual contabilizado (R$ 34,90)');
  await Bp.goto(B + '/painel/orcamentos/novo');
  ok(!(await Bp.locator('button:has-text("Finalizar orçamento")').isDisabled()), 'assinante liberado após ativação manual');

  // Cancelamento seguro: se o Mercado Pago não confirmar (aqui ele não está configurado), nada muda e o assinante é avisado
  await Bp.goto(B + '/painel/assinatura');
  Bp.once('dialog', (d) => d.accept());
  await Bp.click('button:has-text("Cancelar assinatura")');
  await Bp.waitForSelector('text=Não foi possível cancelar no Mercado Pago', { timeout: 15000 }).catch(() => {});
  ok(await Bp.isVisible('text=Não foi possível cancelar no Mercado Pago') && sql(`select status from "Subscription" where id='${subId}'`) === 'ACTIVE', 'cancelamento só vale se o Mercado Pago confirmar (assinante avisado do erro)');

  // Lead do site chega no admin
  await anon.goto(B + '/orcamento'); await anon.fill('#name', 'Maria Teste'); await anon.fill('#phone', '83999998888'); await anon.fill('#neighborhood', 'Manaíra');
  await anon.selectOption('#service', { index: 1 }); await anon.click('button:has-text("Enviar solicitação")'); await anon.waitForSelector('text=Continuar no WhatsApp');
  await adm.goto(B + '/admin/solicitacoes'); ok(await adm.isVisible('text=Maria Teste'), 'solicitação do site aparece no admin');
  const lead = adm.locator('div.card', { hasText: 'Maria Teste' }).first();
  await lead.locator('button:has-text("Em contato")').click(); await adm.waitForTimeout(2500);
  ok(sql(`select status from "LeadRequest" where name='Maria Teste' order by "createdAt" desc limit 1`) === 'CONTACTED', 'admin muda status da solicitação para Em contato');
  await adm.screenshot({ path: S + 'admin-leads.png' });
  await adm.goto(B + '/admin'); await adm.screenshot({ path: S + 'admin.png', fullPage: true });
  await A.goto(B + '/painel'); await A.screenshot({ path: S + 'painel.png', fullPage: true });
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
  await m.goto(B + '/entrar'); await m.fill('#email', `a${t}@teste.local`); await m.fill('#password', 'Senha12345'); await m.click('button[type=submit]'); await m.waitForURL(/painel/);
  await m.goto(B + '/painel/orcamentos/novo'); await m.click('text=Serviço da tabela'); await m.click('button:has-text("Instalação de chuveiro")');
  await m.screenshot({ path: S + 'editor-m.png' });
  sql(`delete from "Quote" where id='dq${t}'`);
  console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS OS TESTES PASSARAM'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
