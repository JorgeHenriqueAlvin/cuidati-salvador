import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { digest, verifyPassword, cookie } from './auth.js';
import { AppError, text, phone, count, enumValue, leadInput, dateValue, leadStatuses, visitStatuses } from './validation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', 'Referrer-Policy':'no-referrer' };
const json = (data,status=200,extra={}) => new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});

function administrator(env) {
  const email=env.ADMIN_EMAIL?.trim().toLowerCase(), salt=env.ADMIN_PASSWORD_SALT, hash=env.ADMIN_PASSWORD_HASH;
  if (!email || !/^[a-f0-9]{48}$/i.test(salt||'') || !/^[a-f0-9]{128}$/i.test(hash||'')) return null;
  return {email,salt,hash,revision:digest(email+':'+salt+':'+hash)};
}
async function readBody(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('Envie JSON.',415);
  const reader=request.body?.getReader(); if(!reader)throw new AppError('Dados inválidos.');
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();throw new AppError('Conteúdo muito grande.',413);}chunks.push(Buffer.from(value));}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError('JSON inválido.');}
  if(!data || Array.isArray(data) || typeof data!=='object')throw new AppError('Dados inválidos.');
  return data;
}

export function createNetlifyHandler({pool,env=process.env}) {
  return async function handle(request,context={}) {
    let client;
    try {
      const url=new URL(request.url),path=url.pathname,method=request.method;
      if(!path.startsWith('/api/'))throw new AppError('Recurso não encontrado.',404);
      if(!['GET','POST','PATCH','DELETE'].includes(method))throw new AppError('Método não permitido.',405);
      // A URL da requisição é validada pelo roteamento da Netlify. Usar variáveis
      // gravadas no build quebra o formulário após renomear o domínio do site.
      const origin=new URL(env.APP_ORIGIN || url.origin).origin;
      if(method!=='GET'&&request.headers.get('origin')!==origin)throw new AppError('Origem não permitida.',403);
      const production=url.protocol==='https:';
      const admin=administrator(env);
      client=await pool.connect();
      const q=async (sql,...params)=>(await client.query(sql,params)).rows;
      const one=async(sql,...params)=>(await q(sql,...params))[0];
      async function transaction(fn) {
        await client.query('BEGIN');
        try{const result=await fn();await client.query('COMMIT');return result;}
        catch(e){await client.query('ROLLBACK');throw e;}
      }
      async function rate(category,max) {
        const now=Date.now(),bucket=category+':'+digest(context.ip||'unknown');
        await q('DELETE FROM limits WHERE expires<$1',now);
        const row=await one(`INSERT INTO limits(bucket,hits,expires) VALUES($1,1,$2)
          ON CONFLICT(bucket) DO UPDATE SET hits=limits.hits+1 RETURNING hits`,bucket,now+900000);
        if(row.hits>max)throw new AppError('Muitas tentativas. Aguarde alguns minutos.',429);
      }
      async function settings(){return await one('SELECT phone,email,hours FROM settings WHERE id=1') || {phone:'',email:'',hours:''};}
      if(method==='GET'&&path==='/api/health'){await q('SELECT 1');return json({ok:true});}
      if(method==='GET'&&path==='/api/settings')return json(await settings());
      if(method==='GET'&&path==='/api/challenge') {
        await rate('challenge',100);
        await q('DELETE FROM challenges WHERE created<$1',Date.now()-1800000);
        const a=randomInt(1,10),b=randomInt(1,10),token=randomBytes(24).toString('hex');
        await q('INSERT INTO challenges VALUES($1,$2,$3)',digest(token),digest(String(a+b)),Date.now());
        return json({token,question:`Quanto é ${a} + ${b}?`});
      }
      if(method==='POST'&&path==='/api/leads') {
        await rate('lead',12);const data=await readBody(request);
        if(!UUID.test(data.request_id||''))throw new AppError('Identificador de solicitação inválido.');
        if(data.website)throw new AppError('Não foi possível enviar.');
        const v=leadInput(data);
        const exists=await transaction(async()=>{
          // Mesma chave de envio é serializada antes de consultar/inserir.
          await q('SELECT pg_advisory_xact_lock(hashtext($1))',data.request_id);
          if(await one('SELECT id FROM leads WHERE request_id=$1',data.request_id))return true;
          const challenge=await one('DELETE FROM challenges WHERE token=$1 RETURNING *',digest(String(data.challenge_token||'')));
          if(!challenge || Date.now()-Number(challenge.created)>1800000 || Date.now()-Number(challenge.created)<1000 || challenge.answer!==digest(String(data.challenge_answer||'').trim()))throw new AppError('Verificação inválida ou expirada. Atualize a verificação e tente novamente.');
          await q('INSERT INTO leads(id,request_id,name,company,phone,neighborhood,computers,difficulty,interest,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',randomUUID(),data.request_id,v.name,v.company,v.phone,v.neighborhood,v.computers,v.difficulty,v.interest,new Date().toISOString());
          return false;
        });
        return json({ok:true},exists?200:201);
      }
      if(method==='POST'&&path==='/api/login') {
        await rate('login',10);
        if(!admin)throw new AppError('O administrador ainda não foi configurado na hospedagem.',503);
        const data=await readBody(request),email=text(data.email,'E-mail',254).toLowerCase();
        if(typeof data.password!=='string'||!data.password||data.password.length>256)throw new AppError('Senha inválida.');
        if(!await verifyPassword(data.password,email===admin.email?admin:null))throw new AppError('E-mail ou senha incorretos.',401);
        await q('DELETE FROM sessions WHERE expires<$1 OR credential_revision<>$2',Date.now(),admin.revision);
        const token=randomBytes(32).toString('hex');
        await q('INSERT INTO sessions VALUES($1,$2,$3)',digest(token),admin.revision,Date.now()+28800000);
        return json({ok:true},200,{'Set-Cookie':cookie(token,production)});
      }
      const token=/(?:^|;\s*)cuidati_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('cookie')||'')?.[1];
      const logged=admin&&token&&await one('SELECT token FROM sessions WHERE token=$1 AND expires>$2 AND credential_revision=$3',digest(token),Date.now(),admin.revision);
      if(!logged)throw new AppError('Entre com sua conta de administrador.',401);
      if(method==='GET'&&path==='/api/session')return json({authenticated:true});
      if(method==='POST'&&path==='/api/logout'){await q('DELETE FROM sessions WHERE token=$1',digest(token));return json({ok:true},200,{'Set-Cookie':cookie('',production,0)});}
      if(method==='GET'&&path==='/api/admin/data')return json({
        leads:await q('SELECT id,name,company,phone,neighborhood,computers,difficulty,interest,status,notes,created_at FROM leads ORDER BY created_at DESC'),
        clients:await q('SELECT * FROM clients ORDER BY created_at DESC'),visits:await q('SELECT * FROM visits ORDER BY scheduled_at'),settings:await settings()
      });
      if(method==='PATCH'&&path==='/api/settings') {
        const data=await readBody(request),p=phone(data.phone,false),email=text(data.email,'E-mail',254,false),hours=text(data.hours,'Horário',300,false);
        if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AppError('E-mail inválido.');
        await q('INSERT INTO settings(id,phone,email,hours) VALUES(1,$1,$2,$3) ON CONFLICT(id) DO UPDATE SET phone=EXCLUDED.phone,email=EXCLUDED.email,hours=EXCLUDED.hours',p,email,hours);
        return json({ok:true});
      }
      const match=/^\/api\/(leads|clients|visits)\/([a-f0-9-]+)(\/convert)?$/.exec(path);
      if(match) {
        const [,table,id,convert]=match;
        // table só pode ser um dos três nomes fixos da expressão regular.
        const row=await one(`SELECT * FROM ${table} WHERE id=$1`,id);
        if(!row)throw new AppError('Registro não encontrado.',404);
        if(method==='POST'&&table==='leads'&&convert) {
          const result=await transaction(async()=>{
            const lead=await one('SELECT * FROM leads WHERE id=$1 FOR UPDATE',id);
            if(!lead)throw new AppError('Interessado não encontrado.',404);
            let c=await one('SELECT id FROM clients WHERE lead_id=$1',id);
            if(!c){c={id:randomUUID()};await q('INSERT INTO clients(id,lead_id,name,company,phone,neighborhood,computers,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',c.id,id,lead.name,lead.company,lead.phone,lead.neighborhood,lead.computers,new Date().toISOString());}
            await q("UPDATE leads SET status='Convertido' WHERE id=$1",id);return c;
          });return json(result);
        }
        if(method==='DELETE'&&table==='leads'&&!convert){await q('DELETE FROM leads WHERE id=$1',id);return json({ok:true});}
        if(method==='PATCH'&&!convert) {
          const data=await readBody(request);
          if(table==='leads') {
            const status=enumValue(data.status,leadStatuses),notes=text(data.notes,'Observações',5000,false);
            await transaction(async()=>{
              const lead=await one('SELECT id FROM leads WHERE id=$1 FOR UPDATE',id);
              if(!lead)throw new AppError('Interessado não encontrado.',404);
              const linked=await one('SELECT id FROM clients WHERE lead_id=$1',id);
              if((status==='Convertido')!==!!linked)throw new AppError('Use a conversão para criar o cliente; interessados convertidos preservam esse status.');
              await q('UPDATE leads SET status=$1,notes=$2 WHERE id=$3',status,notes,id);
            });
          } else if(table==='clients') {
            const cents=data.monthly_cents;
            if(cents!==null&&(!Number.isSafeInteger(cents)||cents<0||cents>100000000))throw new AppError('Valor mensal inválido.');
            await q('UPDATE clients SET name=$1,company=$2,phone=$3,neighborhood=$4,computers=$5,service=$6,monthly_cents=$7,status=$8 WHERE id=$9',text(data.name,'Responsável'),text(data.company,'Empresa'),phone(data.phone),text(data.neighborhood,'Bairro'),count(data.computers),text(data.service,'Serviço',1000,false),cents,enumValue(data.status,['Ativo','Inativo']),id);
          } else await q('UPDATE visits SET scheduled_at=$1,description=$2,status=$3,notes=$4,next_at=$5 WHERE id=$6',dateValue(data.scheduled_at),text(data.description,'Descrição',1000),enumValue(data.status,visitStatuses),text(data.notes,'Observações',5000,false),dateValue(data.next_at,true),id);
          return json({ok:true});
        }
      }
      if(method==='POST'&&path==='/api/visits') {
        const data=await readBody(request);
        if(!await one('SELECT id FROM clients WHERE id=$1',String(data.client_id)))throw new AppError('Selecione um cliente válido.');
        const id=randomUUID();
        await q('INSERT INTO visits VALUES($1,$2,$3,$4,$5,$6,$7,$8)',id,data.client_id,dateValue(data.scheduled_at),text(data.description,'Descrição',1000),enumValue(data.status,visitStatuses),text(data.notes,'Observações',5000,false),dateValue(data.next_at,true),new Date().toISOString());
        return json({id},201);
      }
      throw new AppError('Recurso não encontrado.',404);
    } catch(error) {
      if(!(error instanceof AppError))console.error('Falha na API Netlify:',error.name);
      return json({error:error instanceof AppError?error.message:'Não foi possível concluir. Tente novamente.'},error instanceof AppError?error.status:500);
    } finally {client?.release();}
  };
}
