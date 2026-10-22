import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/index.js';
import { openDB } from '../server/db.js';
import { hashPassword, digest } from '../server/auth.js';
import { leadInput, phone } from '../server/validation.js';

test('validação de dados e telefone',()=>{
  assert.equal(phone('(71) 99999-9999'),'5571999999999');
  assert.equal(phone('+55 71 99999-9999'),'5571999999999');
  assert.equal(phone('',false),'');
  assert.throws(()=>phone('123'));
  const valid={name:'Ana',company:'Loja',phone:'71999999999',neighborhood:'Pituba',computers:5,difficulty:'Computador lento',interest:'Plano recorrente'};
  assert.equal(leadInput(valid).computers,5);
  for(const computers of [0,-1,2.5,'',true])assert.throws(()=>leadInput({...valid,computers}));
  assert.throws(()=>leadInput({...valid,difficulty:'x'.repeat(1001)}));
  assert.throws(()=>leadInput({...valid,name:' '}));
  assert.throws(()=>leadInput({...valid,interest:'Outro'}));
});

test('API integrada: segurança, persistência e fluxo comercial',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'cuidati-test-'));
  const db=openDB(directory);
  const credentials=await hashPassword(' Test-only password 123! ');
  db.prepare('INSERT INTO admins(email,salt,hash) VALUES(?,?,?)').run('test@example.invalid',credentials.salt,credentials.hash);
  const origin='http://localhost:3000';
  const server=createApp({db,origin});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  let cookie='', leadId, clientId, visitId;
  const request=async(path,method='GET',data,auth=false,extra={})=>{
    const response=await fetch(base+path,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json',Origin:origin}:{}),...(auth?{Cookie:cookie}:{}),...extra},body:data?JSON.stringify(data):undefined});
    return {status:response.status,headers:response.headers,body:await response.json()};
  };
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(directory,{recursive:true,force:true});});
  await t.test('página pública e painel servidos com CSP e sem cache de dados',async()=>{
    const response=await fetch(base+'/');assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(await response.text(),/CuidaTI/);
    assert.equal((await fetch(base+'/admin')).status,200);
    assert.equal((await request('/api/settings')).headers.get('cache-control'),'no-store');
  });
  await t.test('visitante não lê nem altera registros administrativos',async()=>{
    for(const [path,method] of [['/api/admin/data','GET'],['/api/session','GET'],['/api/settings','PATCH'],['/api/visits','POST'],['/api/leads/'+randomUUID(),'DELETE']])assert.equal((await request(path,method,method==='GET'?undefined:{})).status,401);
  });
  await t.test('CSRF e login incorreto são recusados',async()=>{
    assert.equal((await request('/api/login','POST',{email:'test@example.invalid',password:'wrong'},{}, {Origin:'https://attacker.invalid'})).status,403);
    assert.equal((await request('/api/login','POST',{email:'test@example.invalid',password:'wrong'})).status,401);
  });
  const payload={request_id:randomUUID(),name:'Cliente de teste',company:'Empresa de teste',phone:'71999999999',neighborhood:'Pituba',computers:5,difficulty:'Teste de fluxo',interest:'Plano recorrente',website:''};
  await t.test('validação no backend e verificação antispam',async()=>{
    assert.equal((await request('/api/leads','POST',{...payload,computers:0})).status,400);
    assert.equal((await request('/api/leads','POST',{...payload,website:'spam'})).status,400);
    assert.equal((await request('/api/leads','POST',payload)).status,400);
    assert.equal(db.prepare('SELECT count(*) n FROM leads').get().n,0);
  });
  await t.test('solicitação salva uma única vez e não retorna dados privados',async()=>{
    const challenge=(await request('/api/challenge')).body;
    db.prepare('UPDATE challenges SET created=? WHERE token=?').run(Date.now()-1500,digest(challenge.token));
    const numbers=challenge.question.match(/\d+/g).map(Number);
    const result=await request('/api/leads','POST',{...payload,challenge_token:challenge.token,challenge_answer:numbers[0]+numbers[1]});
    assert.equal(result.status,201);assert.deepEqual(result.body,{ok:true});
    assert.equal((await request('/api/leads','POST',payload)).status,200);
    assert.equal(db.prepare('SELECT count(*) n FROM leads').get().n,1);
    leadId=db.prepare('SELECT id FROM leads').get().id;
  });
  await t.test('login válido usa cookie HttpOnly e permite listar dados',async()=>{
    const result=await request('/api/login','POST',{email:'test@example.invalid',password:' Test-only password 123! '});
    assert.equal(result.status,200);const header=result.headers.get('set-cookie');assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Strict/);cookie=header.split(';')[0];
    const data=await request('/api/admin/data','GET',undefined,true);assert.equal(data.body.leads.length,1);assert.equal(data.body.clients.length,0);
    assert.equal((await request('/api/leads/'+leadId,'PATCH',{status:'Proposta enviada',notes:'Teste'},true)).status,200);
  });
  await t.test('conversão repetida preserva interessado e cria só um cliente',async()=>{
    clientId=(await request(`/api/leads/${leadId}/convert`,'POST',{},true)).body.id;
    const repeated=await request(`/api/leads/${leadId}/convert`,'POST',{},true);assert.equal(repeated.body.id,clientId);
    assert.equal(db.prepare('SELECT count(*) n FROM clients').get().n,1);
    assert.equal(db.prepare('SELECT status FROM leads').get().status,'Convertido');
    assert.equal((await request('/api/leads/'+leadId,'PATCH',{status:'Novo',notes:''},true)).status,400);
  });
  await t.test('edição de cliente e visita vinculada com histórico',async()=>{
    const client=db.prepare('SELECT * FROM clients').get();
    assert.equal((await request('/api/clients/'+clientId,'PATCH',{...client,service:'Plano piloto',monthly_cents:25000},true)).status,200);
    const visit={client_id:clientId,scheduled_at:'2026-11-01T10:00:00-03:00',description:'Preventiva',status:'Agendada',notes:'',next_at:null};
    assert.equal((await request('/api/visits','POST',{...visit,client_id:randomUUID()},true)).status,400);
    visitId=(await request('/api/visits','POST',visit,true)).body.id;assert.ok(visitId);
    assert.equal((await request('/api/visits/'+visitId,'PATCH',{...visit,status:'Realizada',next_at:'2026-12-01T10:00:00-03:00'},true)).status,200);
    const row=db.prepare('SELECT * FROM visits').get();assert.equal(row.scheduled_at,'2026-11-01T13:00:00.000Z');assert.equal(row.client_id,clientId);
  });
  await t.test('configurações opcionais e exclusão preservam cliente',async()=>{
    assert.equal((await request('/api/settings','PATCH',{phone:'',email:'contato@example.invalid',hours:'Segunda a sexta'},true)).status,200);
    assert.equal((await request('/api/settings')).body.phone,'');
    assert.equal((await request('/api/settings','PATCH',{phone:'123',email:'',hours:''},true)).status,400);
    assert.equal((await request('/api/leads/'+leadId,'DELETE',undefined,true)).status,200);
    assert.equal(db.prepare('SELECT lead_id FROM clients').get().lead_id,null);
    assert.equal(db.prepare('SELECT count(*) n FROM visits').get().n,1);
  });
  await t.test('persistência em nova conexão e encerramento de sessão',async()=>{
    const another=openDB(directory);assert.equal(another.prepare('SELECT count(*) n FROM clients').get().n,1);another.close();
    assert.equal((await request('/api/logout','POST',{},true)).status,200);
    assert.equal((await request('/api/admin/data','GET',undefined,true)).status,401);
  });
  await t.test('limite de tentativas de autenticação é aplicado',async()=>{
    let response;for(let i=0;i<12;i++)response=await request('/api/login','POST',{email:'x@example.invalid',password:'wrong'});
    assert.equal(response.status,429);
  });
});
