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
  await p.click('button:text-is("Serviço")'); await p.click('button:has-text("Substituição de disjuntor monofásico")');
  await p.click('button:text-is("Material")'); await p.fill('input[placeholder^="Buscar material"]', 'cabo 2,5 750'); await p.click('[role=dialog] button:has-text("Cabo flexível 2,5 mm² 750 V")');
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
  ok(sql(`select count(*) from "FinanceEntry" f join "Quote" q on q.id=f."quoteId" where f."quoteId"='${qid}' and f.auto and f.type='INCOME' and f.amount=q.total`) === '1', 'aprovação cria o lançamento automático no financeiro (valor do orçamento)');
  await A.goto(B + '/painel/financeiro'); ok(await A.isVisible('text=automático'), 'financeiro mostra o lançamento com selo "automático"');
  // Divisão do valor: ajudante e material (só o eletricista vê) → saídas automáticas no financeiro
  await A.goto(B + '/painel/orcamentos/' + qid);
  await A.fill('#helperName', 'Ajudante Teste'); await A.fill('#helperAmount', '50'); await A.fill('#materialCost', '20');
  const totalQ = Number(sql(`select total from "Quote" where id='${qid}'`));
  ok(await A.isVisible(`text=${(totalQ - 70).toFixed(2).replace('.', ',')}`), 'divisão mostra na hora quanto ficou para o eletricista');
  await A.click('button:has-text("Salvar divisão")'); await A.waitForTimeout(2500);
  ok(sql(`select "helperName"||'|'||"helperAmount"||'|'||"materialCost" from "Quote" where id='${qid}'`) === 'Ajudante Teste|50.00|20.00', 'divisão é salva no orçamento');
  ok(sql(`select string_agg("autoKind"||':'||amount, ',' order by "autoKind") from "FinanceEntry" where "quoteId"='${qid}' and type='EXPENSE' and auto`) === 'ajudante:50.00,material:20.00', 'divisão lança as saídas do ajudante e do material no financeiro');
  await A.waitForSelector('button:has-text("Salvar divisão"):not([disabled])'); await A.waitForTimeout(1500);
  await A.fill('#helperAmount', '30'); await A.click('button:has-text("Salvar divisão")');
  for (let i = 0; i < 20 && sql(`select "helperAmount" from "Quote" where id='${qid}'`) !== '30.00'; i++) await A.waitForTimeout(500);
  const upd = sql(`select count(*)||':'||sum(amount) from "FinanceEntry" where "quoteId"='${qid}' and "autoKind"='ajudante'`);
  ok(upd === '1:30.00', 'alterar a divisão atualiza a saída sem duplicar' + (upd === '1:30.00' ? '' : ` (veio ${upd})`));
  await A.fill('#helperAmount', '999'); await A.click('button:has-text("Salvar divisão")'); await A.waitForTimeout(2000);
  ok(sql(`select "helperAmount" from "Quote" where id='${qid}'`) === '30.00' && await A.isVisible('text=passam do total'), 'não deixa ajudante + material passar do total do orçamento');
  const pub = await (await b.newContext()).newPage(); await pub.goto(`${B}/o/${sql(`select "shareToken" from "Quote" where id='${qid}'`)}`);
  const pubHtml = (await pub.innerText('body')) + (await (await fetch(`${B}/o/${sql(`select "shareToken" from "Quote" where id='${qid}'`)}`)).text());
  ok(!pubHtml.includes('Ajudante Teste') && !pubHtml.includes('Divisão') && !pubHtml.includes('ajudante') && !pubHtml.includes('helperName'), 'cliente não vê a divisão no link do orçamento' + (pubHtml.includes('Ajudante Teste') ? ' (achou o nome do ajudante)' : ''));
  await A.goto(B + '/painel/financeiro?aba=divisao'); ok(await A.isVisible('text=Ficou pra você') && await A.isVisible('text=Pago a ajudantes'), 'financeiro tem a aba Divisão por serviço');
  await A.goto(B + '/painel/orcamentos/' + qid);
  await A.click('button:has-text("Voltar para")'); await A.waitForTimeout(2500);
  ok(sql(`select count(*) from "FinanceEntry" where "quoteId"='${qid}' and auto`) === '0', 'tirar a aprovação remove também as saídas da divisão');
  sql(`update "Quote" set "helperName"=null, "helperAmount"=0, "materialCost"=0 where id='${qid}'`);
  await A.click('button:has-text("Aprovado")'); await A.waitForTimeout(2500);
  await A.goto(B + '/painel/orcamentos/' + qid);
  await A.click('button:has-text("Voltar para")'); await A.waitForTimeout(2500);
  ok(sql(`select status from "Quote" where id='${qid}'`) === 'SENT', 'botão Voltar para Enviado funciona');
  ok(sql(`select count(*) from "FinanceEntry" where "quoteId"='${qid}'`) === '0', 'voltar para Enviado remove o lançamento automático');
  await A.click('button:has-text("Recusado")'); await A.waitForTimeout(2500);
  ok(sql(`select status from "Quote" where id='${qid}'`) === 'REJECTED', 'botão Recusado muda o status para RECUSADO');
  ok(sql(`select count(*) from "FinanceEntry" where "quoteId"='${qid}'`) === '0', 'recusado não gera lançamento');
  // lançamento manual nunca é apagado nem duplicado
  sql(`insert into "FinanceEntry"(id,"userId",type,description,amount,date,"quoteId") values ('man${t}','${aId}','INCOME','Recebido à mão',50,now(),'${qid}')`);
  await A.click('button:has-text("Voltar para")'); await A.waitForTimeout(2000); await A.click('button:has-text("Aprovado")'); await A.waitForTimeout(2500);
  ok(sql(`select count(*) from "FinanceEntry" where "quoteId"='${qid}'`) === '1', 'com lançamento manual já existente, aprovação não duplica');
  await A.click('button:has-text("Voltar para")'); await A.waitForTimeout(2500);
  ok(sql(`select count(*) from "FinanceEntry" where id='man${t}'`) === '1', 'lançamento manual não é removido ao mudar o status');
  sql(`delete from "FinanceEntry" where id='man${t}'`);
  sql(`update "Quote" set status='SENT', "decidedAt"=null where id='${qid}'`);

  // Recusa automática: enviado há 8 dias sem resposta → Recusado; há 6 dias → continua Enviado
  sql(`insert into "Quote"(id,"userId",number,"clientName","shareToken",status,"issuedAt","updatedAt") values ('old${t}','${aId}',901,'Cliente Sumido','tokold${t}abcdefghijkl','SENT',now()-interval '8 day',now()),('new${t}','${aId}',902,'Cliente Recente','toknew${t}abcdefghijkl','VIEWED',now()-interval '6 day',now())`);
  await A.goto(B + '/painel/orcamentos');
  ok(sql(`select status||'|'||"autoRejected" from "Quote" where id='old${t}'`) === 'REJECTED|true', 'sem resposta há 8 dias → Recusado automaticamente');
  ok(sql(`select status from "Quote" where id='new${t}'`) === 'VIEWED', 'visualizado há 6 dias → continua aguardando');
  await A.goto(B + '/painel/orcamentos/old' + t); ok(await A.isVisible('text=Recusado automaticamente'), 'orçamento mostra aviso de recusa automática');
  sql(`update "Quote" set status='SENT', "autoRejected"=false, "issuedAt"=now()-interval '9 day' where id='new${t}'`);
  const cl = await (await b.newContext()).newPage(); await cl.goto(`${B}/o/toknew${t}abcdefghijkl`);
  ok(await cl.isVisible('text=não está mais disponível'), 'cliente abrindo o link depois do prazo vê que a proposta não está disponível');
  sql(`delete from "Quote" where id in ('old${t}','new${t}')`);

  // Catálogo de materiais: item escolhido na aba Materiais entra como MATERIAL
  ok(sql(`select string_agg(kind::text, ',' order by kind) from "QuoteItem" where "quoteId"='${qid}'`) === 'SERVICE,MATERIAL' || sql(`select string_agg(kind::text, ',' order by kind) from "QuoteItem" where "quoteId"='${qid}'`) === 'MATERIAL,SERVICE', 'orçamento tem um serviço e um material da tabela');
  ok(Number(sql(`select count(*) from "UserService" where "userId"='${aId}' and kind='MATERIAL'`)) > 100, 'novo eletricista já recebe a tabela de materiais');

  // PDF com observações em várias linhas e emojis (antes dava erro "unitsPerEm")
  sql(`update "Quote" set notes=E'• Garantia de 90 dias.\\r\\n• Materiais não inclusos 👍\\n\\n• NBR 5410 ⚡️' where id='${qid}'`);
  for (const u of [`/painel/orcamentos/${qid}/pdf`, `/o/${sql(`select "shareToken" from "Quote" where id='${qid}'`)}/pdf`]) {
    const r = await A.context().request.get(B + u); ok(r.status() === 200 && (await r.body()).subarray(0, 4).toString() === '%PDF', `PDF com várias linhas e emoji baixa normal (${u.startsWith('/o/') ? 'link do cliente' : 'painel'})`);
  }

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
  await m.goto(B + '/painel/orcamentos/novo'); await m.click('button:text-is("Serviço")'); await m.click('button:has-text("Instalação de chuveiro")');
  await m.screenshot({ path: S + 'editor-m.png' });
  sql(`delete from "Quote" where id='dq${t}'`);
  console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS OS TESTES PASSARAM'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
