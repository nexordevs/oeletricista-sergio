// Teste de ponta a ponta das videoaulas (requer app rodando, banco local, admin@teste.local e a conta demo.video@teste.local com assinatura ativa)
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const B = process.env.BASE_URL || 'http://localhost:3000', O = process.argv[2] || require('os').tmpdir();
const sql = (q) => execSync(`psql ${process.env.DATABASE_URL} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim().split('\n')[0];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const login = async (b, email, pass, w = 1280) => { const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); await p.goto(B + '/entrar'); await p.fill('#email', email); await p.fill('#password', pass); await p.click('button[type=submit]'); await p.waitForURL(/painel|admin/, { timeout: 30000 }); return p; };
(async () => {
  const b = await chromium.launch(); const t = Date.now();
  sql(`delete from "Course" where slug like 'teste-%'`);
  // ADMIN cria curso de assinantes + aula; e um curso grátis e um pago
  const adm = await login(b, 'admin@teste.local', 'TesteAdmin123');
  await adm.goto(B + '/admin/aulas');
  await adm.fill('input[name=title]', 'Teste Quadro de distribuição na prática'); await adm.fill('input[name=slug]', `teste-qdc-${t}`);
  await adm.fill('textarea[name=description]', 'Montagem e organização de QDC.'); await adm.check('input[name=published]');
  await adm.click('button:has-text("Criar curso")'); await adm.waitForSelector('text=Curso criado');
  const cid = sql(`select id from "Course" where slug='teste-qdc-${t}'`);
  await adm.goto(B + '/admin/aulas/' + cid);
  const add = adm.locator('form', { hasText: 'Adicionar aula' }).last();
  await add.locator('input[name=title]').fill('Aula 1 – Ferramentas'); await add.locator('input[name=videoUrl]').fill('https://evil.com/video'); await add.locator('button:has-text("Adicionar aula")').click();
  await adm.waitForSelector('text=Use um link do YouTube, Vimeo ou Panda Video'); ok(true, 'admin: link de site não permitido é recusado');
  await add.locator('input[name=videoUrl]').fill('https://youtu.be/dQw4w9WgXcQ'); await add.locator('input[name=durationMin]').fill('8'); await add.locator('button:has-text("Adicionar aula")').click(); await adm.waitForSelector('text=Aula adicionada');
  await add.locator('input[name=title]').fill('Aula 2 – Barramentos'); await add.locator('input[name=videoUrl]').fill('https://vimeo.com/123456789'); await add.locator('button:has-text("Adicionar aula")').click(); await adm.waitForSelector('text=Aula 2 – Barramentos');
  ok(sql(`select count(*) from "Lesson" where "courseId"='${cid}'`) === '2', 'admin: 2 aulas cadastradas');
  sql(`insert into "Course"(id,slug,title,access,published,"updatedAt") values ('cf${t}','teste-gratis-${t}','Teste Curso grátis','FREE',true,now()),('cp${t}','teste-pago-${t}','Teste Curso pago','PAID',true,now())`);
  sql(`update "Course" set price=97 where id='cp${t}'`);
  sql(`insert into "Lesson"(id,"courseId",title,"videoUrl","sortOrder") values ('lf${t}','cf${t}','Aula grátis','https://youtu.be/dQw4w9WgXcQ',1),('lp${t}','cp${t}','Aula paga','https://youtu.be/dQw4w9WgXcQ',1)`);
  // ASSINANTE assiste e conclui
  const sub = await login(b, 'demo.video@teste.local', 'DemoVideo2026');
  await sub.goto(B + '/painel/aulas'); ok(await sub.isVisible('text=Teste Quadro de distribuição na prática'), 'assinante vê o curso publicado');
  await sub.goto(B + `/painel/aulas/teste-qdc-${t}`);
  ok((await sub.locator('iframe').getAttribute('src')).startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'player do YouTube (sem cookies) carregado');
  await sub.click('button:has-text("Concluí esta aula")'); await sub.waitForSelector('text=✓ Aula concluída');
  ok(await sub.isVisible('text=1 de 2 concluída(s)'), 'progresso: 1 de 2 concluída');
  await sub.click('text=Próxima aula'); await sub.waitForSelector('text=Aula 2 de 2');
  ok((await sub.locator('iframe').getAttribute('src')) === 'https://player.vimeo.com/video/123456789', 'aula 2 com player do Vimeo');
  await sub.goto(B + `/painel/aulas/teste-pago-${t}`); ok(await sub.isVisible('text=será vendido em breve por R$ 97,00'), 'curso pago: bloqueado com "em breve" e preço');
  await sub.goto(B + '/painel/aulas'); await sub.screenshot({ path: O + '/lista.png', fullPage: true });
  await sub.goto(B + `/painel/aulas/teste-qdc-${t}`); await sub.screenshot({ path: O + '/player.png', fullPage: true });
  // SEM PLANO
  const n = await (await b.newContext()).newPage();
  await n.goto(B + '/cadastro'); await n.fill('#name', 'Sem Plano'); await n.fill('#email', `sp${t}@teste.local`); await n.fill('#password', 'Senha12345'); await n.check('input[name=terms]'); await n.click('button[type=submit]'); await n.waitForURL(/painel/);
  await n.goto(B + `/painel/aulas/teste-qdc-${t}`); ok(await n.isVisible('text=plano Premium') && (await n.locator('iframe').count()) === 0, 'sem plano: curso Premium bloqueado, sem vídeo');
  await n.goto(B + `/painel/aulas/teste-gratis-${t}`); ok((await n.locator('iframe').count()) === 1, 'sem plano: curso grátis liberado');
  // PROFISSIONAL (assinante sem videoaulas)
  const pid = sql(`select id from "User" where email='sp${t}@teste.local'`), prof = sql(`select id from "Plan" where slug='profissional'`);
  sql(`insert into "Subscription"(id,"userId","planId",amount,status,"currentPeriodEnd","updatedAt") values ('pr${t}','${pid}','${prof}',34.90,'ACTIVE',now()+interval '30 day',now())`);
  await n.goto(B + `/painel/aulas/teste-qdc-${t}`); ok(await n.isVisible('text=plano Premium') && (await n.locator('iframe').count()) === 0, 'plano Profissional: curso Premium bloqueado com convite');
  await n.goto(B + `/painel/aulas/teste-gratis-${t}`); ok((await n.locator('iframe').count()) === 1, 'plano Profissional: curso grátis liberado');
  // rascunho invisível para eletricista
  sql(`update "Course" set published=false where id='${cid}'`);
  const r = await sub.goto(B + `/painel/aulas/teste-qdc-${t}`); ok(r.status() === 404, 'curso em rascunho não aparece para eletricista (404)');
  sql(`delete from "Course" where slug like 'teste-%'`);
  console.log(fails ? `${fails} FALHA(S)` : 'TODOS OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
