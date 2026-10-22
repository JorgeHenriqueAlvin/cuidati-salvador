import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createNetlifyHandler} from '../server/netlify-api.js';
import {hashPassword,digest} from '../server/auth.js';

test('Netlify: migração Postgres e fluxo completo da função',async t=>{
  const database=new PGlite();
  await database.exec(await readFile(new URL('../netlify/database/migrations/20261022170000_create_cuidati.sql',import.meta.url),'utf8'));
  const credentials=await hashPassword('Netlify test only 123!');
  const env={ADMIN_EMAIL:'test@example.invalid',ADMIN_PASSWORD_SALT:credentials.salt,ADMIN_PASSWORD_HASH:credentials.hash,URL:'https://cuidati-test.netlify.app'};
  let releaseCount=0,connectionCount=0;
  const pool={async connect(){connectionCount++;return {query:(sql,params)=>database.query(sql,params),release(){releaseCount++;}};}};
  const handle=createNetlifyHandler({pool,env});
  let cookie='',leadId,clientId,visitId;
  const call=async(path,method='GET',data,logged=false,extra={})=>{
    const request=new Request(env.URL+'/api'+path,{method,headers:{...(method!=='GET'?{Origin:env.URL,'Content-Type':'application/json'}:{}),...(logged?{Cookie:cookie}:{}),...extra},body:data?JSON.stringify(data):undefined});
    const result=await handle(request,{ip:'198.51.100.10'});return {status:result.status,headers:result.headers,body:await result.json()};
  };
  t.after(async()=>{assert.equal(releaseCount,connectionCount,'todas as conexões devem ser devolvidas');await database.close();});
  await t.test('configuração ausente não cria administrador público',async()=>{
    const h=createNetlifyHandler({pool,env:{URL:env.URL}});
    const result=await h(new Request(env.URL+'/api/login',{method:'POST',headers:{Origin:env.URL,'Content-Type':'application/json'},body:JSON.stringify({email:'x',password:'x'})}),{ip:'198.51.100.11'});
    assert.equal(result.status,503);
  });
  await t.test('saúde do banco, configurações vazias e APIs protegidas',async()=>{
    assert.equal((await call('/health')).status,200);
    assert.deepEqual((await call('/settings')).body,{phone:'',email:'',hours:''});
    for(const [path,method]of[['/admin/data','GET'],['/settings','PATCH'],['/visits','POST'],['/leads/'+randomUUID(),'DELETE']])assert.equal((await call(path,method,method==='GET'?undefined:{})).status,401);
  });
  await t.test('renomear domínio não invalida a origem; fixação explícita é respeitada',async()=>{
    const renamed='https://cuidati-renamed.netlify.app';
    const request=()=>new Request(renamed+'/api/leads',{method:'POST',headers:{Origin:renamed,'Content-Type':'application/json'},body:'{}'});
    assert.equal((await handle(request(),{ip:'198.51.100.12'})).status,400);
    const pinned=createNetlifyHandler({pool,env:{...env,APP_ORIGIN:env.URL}});
    assert.equal((await pinned(request(),{ip:'198.51.100.12'})).status,403);
  });
  await t.test('origem, autenticação e cookie seguro',async()=>{
    assert.equal((await call('/login','POST',{},false,{Origin:'https://attacker.invalid'})).status,403);
    assert.equal((await call('/login','POST',{email:env.ADMIN_EMAIL,password:'wrong'})).status,401);
    const result=await call('/login','POST',{email:env.ADMIN_EMAIL,password:'Netlify test only 123!'});
    assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/Secure/);assert.match(result.headers.get('set-cookie'),/HttpOnly/);cookie=result.headers.get('set-cookie').split(';')[0];
  });
  const payload={request_id:randomUUID(),name:'Teste Netlify',company:'Empresa fictícia',phone:'71999999999',neighborhood:'Pituba',computers:4,difficulty:'Teste automatizado',interest:'Plano recorrente',website:''};
  await t.test('validação e envio idempotente com desafio',async()=>{
    assert.equal((await call('/leads','POST',{...payload,computers:0})).status,400);
    assert.equal((await call('/leads','POST',payload)).status,400);
    const c=(await call('/challenge')).body;
    await database.query('UPDATE challenges SET created=$1 WHERE token=$2',[Date.now()-1500,digest(c.token)]);
    const [a,b]=c.question.match(/\d+/g).map(Number);
    const result=await call('/leads','POST',{...payload,challenge_token:c.token,challenge_answer:a+b});
    assert.equal(result.status,201);assert.deepEqual(result.body,{ok:true});
    assert.equal((await call('/leads','POST',payload)).status,200);
    const data=(await call('/admin/data','GET',undefined,true)).body;assert.equal(data.leads.length,1);leadId=data.leads[0].id;
  });
  await t.test('conversão transacional, cliente e visita',async()=>{
    assert.equal((await call('/leads/'+leadId,'PATCH',{status:'Proposta enviada',notes:'Teste'},true)).status,200);
    clientId=(await call(`/leads/${leadId}/convert`,'POST',{},true)).body.id;assert.ok(clientId);
    assert.equal((await call(`/leads/${leadId}/convert`,'POST',{},true)).body.id,clientId);
    assert.equal((await call('/leads/'+leadId,'PATCH',{status:'Novo',notes:''},true)).status,400);
    const client=(await call('/admin/data','GET',undefined,true)).body.clients[0];
    assert.equal((await call('/clients/'+clientId,'PATCH',{...client,service:'Plano teste',monthly_cents:25000},true)).status,200);
    const visit={client_id:clientId,scheduled_at:'2026-11-01T10:00:00-03:00',description:'Teste preventiva',status:'Agendada',notes:'',next_at:null};
    assert.equal((await call('/visits','POST',{...visit,client_id:randomUUID()},true)).status,400);
    visitId=(await call('/visits','POST',visit,true)).body.id;assert.ok(visitId);
    assert.equal((await call('/visits/'+visitId,'PATCH',{...visit,status:'Realizada',next_at:'2026-12-01T10:00:00-03:00'},true)).status,200);
  });
  await t.test('configurações e exclusão preservam cliente e visitas',async()=>{
    assert.equal((await call('/settings','PATCH',{phone:'',email:'contato@example.invalid',hours:'Dias úteis'},true)).status,200);
    assert.equal((await call('/settings')).body.email,'contato@example.invalid');
    assert.equal((await call('/leads/'+leadId,'DELETE',undefined,true)).status,200);
    const d=(await call('/admin/data','GET',undefined,true)).body;assert.equal(d.leads.length,0);assert.equal(d.clients[0].lead_id,null);assert.equal(d.visits.length,1);
  });
  await t.test('credencial alterada revoga sessão e logout remove token',async()=>{
    const changed=await hashPassword('Another test password!');
    const h=createNetlifyHandler({pool,env:{...env,ADMIN_PASSWORD_HASH:changed.hash,ADMIN_PASSWORD_SALT:changed.salt}});
    assert.equal((await h(new Request(env.URL+'/api/session',{headers:{Cookie:cookie}}))).status,401);
    assert.equal((await call('/logout','POST',{},true)).status,200);
    assert.equal((await call('/admin/data','GET',undefined,true)).status,401);
  });
  await t.test('limite de login persiste no banco',async()=>{
    let result;for(let i=0;i<12;i++)result=await call('/login','POST',{email:'test@example.invalid',password:'wrong'});
    assert.equal(result.status,429);
  });
});
