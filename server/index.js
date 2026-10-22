import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { openDB, transaction } from './db.js';
import { digest, verifyPassword, session, cookie } from './auth.js';
import { AppError, text, phone, count, enumValue, leadInput, dateValue, leadStatuses, visitStatuses } from './validation.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createApp({ db = openDB(), origin = process.env.APP_ORIGIN || 'http://localhost:3000', production = process.env.NODE_ENV === 'production', trustProxy = process.env.TRUST_PROXY === '1' } = {}) {
  if (production && !origin.startsWith('https://')) throw new Error('Em produção, APP_ORIGIN deve usar HTTPS.');
  function rate(bucket, max, window = 900000) {
    const now = Date.now();
    db.prepare('DELETE FROM limits WHERE expires<?').run(now);
    const row = db.prepare(`INSERT INTO limits(bucket,hits,expires) VALUES(?,1,?) ON CONFLICT(bucket)
      DO UPDATE SET hits=limits.hits+1 RETURNING hits`).get(bucket, now + window);
    if (row.hits > max) throw new AppError('Muitas tentativas. Aguarde alguns minutos.', 429);
  }
  function json(res, status, body, extra = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
    res.end(JSON.stringify(body));
  }
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new AppError('Envie JSON.', 415);
    let raw = ''; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 20000) throw new AppError('Conteúdo muito grande.', 413); raw += chunk; }
    let data; try { data = JSON.parse(raw); } catch { throw new AppError('JSON inválido.'); }
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new AppError('Dados inválidos.');
    return data;
  }
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const path = new URL(req.url, origin).pathname;
      const method = req.method;
      const ip = trustProxy ? (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress) : req.socket.remoteAddress;
      const ipHash = digest(String(ip));
      if (path.startsWith('/api/')) {
        if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) throw new AppError('Método não permitido.', 405);
        if (method !== 'GET' && req.headers.origin !== origin) throw new AppError('Origem não permitida.', 403);
        if (method === 'GET' && path === '/api/health') return json(res, 200, { ok: true });
        if (method === 'GET' && path === '/api/settings') return json(res, 200, db.prepare('SELECT phone,email,hours FROM settings WHERE id=1').get());
        if (method === 'GET' && path === '/api/challenge') {
          rate(`challenge:${ipHash}`, 100);
          db.prepare('DELETE FROM challenges WHERE created<?').run(Date.now() - 1800000);
          const a = randomInt(1, 10), b = randomInt(1, 10), token = randomBytes(24).toString('hex');
          db.prepare('INSERT INTO challenges VALUES(?,?,?)').run(digest(token), digest(String(a+b)), Date.now());
          return json(res, 200, { token, question: `Quanto é ${a} + ${b}?` });
        }
        if (method === 'POST' && path === '/api/leads') {
          rate(`lead:${ipHash}`, 12);
          const data = await body(req);
          if (!UUID.test(data.request_id || '')) throw new AppError('Identificador de solicitação inválido.');
          if (data.website) throw new AppError('Não foi possível enviar.');
          const values = leadInput(data);
          // Retry idempotente sem divulgar o registro nem seu identificador interno.
          const prior = db.prepare('SELECT id FROM leads WHERE request_id=?').get(data.request_id);
          if (!prior) {
            transaction(db, () => {
              const challenge = db.prepare('DELETE FROM challenges WHERE token=? RETURNING *').get(digest(String(data.challenge_token || '')));
              if (!challenge || Date.now() - challenge.created > 1800000 || Date.now() - challenge.created < 1000 || challenge.answer !== digest(String(data.challenge_answer || '').trim())) throw new AppError('Verificação inválida ou expirada. Atualize a verificação e tente novamente.');
              db.prepare(`INSERT INTO leads(id,request_id,name,company,phone,neighborhood,computers,difficulty,interest,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(), data.request_id, ...Object.values(values), new Date().toISOString());
            });
          }
          return json(res, prior ? 200 : 201, { ok: true });
        }
        if (method === 'POST' && path === '/api/login') {
          rate(`login:${ipHash}`, 10);
          const data = await body(req);
          const email = text(data.email, 'E-mail', 254).toLowerCase();
          if (typeof data.password !== 'string' || !data.password || data.password.length > 256) throw new AppError('Senha inválida.');
          const password = data.password;
          const admin = db.prepare('SELECT * FROM admins WHERE email=?').get(email);
          if (!await verifyPassword(password, admin)) throw new AppError('E-mail ou senha incorretos.', 401);
          db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
          const token = randomBytes(32).toString('hex');
          db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), admin.id, Date.now()+28800000);
          return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(token, production) });
        }
        const user = session(db, req);
        if (!user) throw new AppError('Entre com sua conta de administrador.', 401);
        if (method === 'GET' && path === '/api/session') return json(res, 200, { authenticated: true });
        if (method === 'POST' && path === '/api/logout') {
          const token = /cuidati_session=([a-f0-9]{64})/.exec(req.headers.cookie || '')?.[1];
          if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));
          return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', production, 0) });
        }
        if (method === 'GET' && path === '/api/admin/data') return json(res, 200, {
          leads: db.prepare('SELECT id,name,company,phone,neighborhood,computers,difficulty,interest,status,notes,created_at FROM leads ORDER BY created_at DESC').all(),
          clients: db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all(),
          visits: db.prepare('SELECT * FROM visits ORDER BY scheduled_at').all(),
          settings: db.prepare('SELECT phone,email,hours FROM settings WHERE id=1').get()
        });
        if (method === 'PATCH' && path === '/api/settings') {
          const data = await body(req);
          const p = phone(data.phone, false), email = text(data.email, 'E-mail', 254, false), hours = text(data.hours, 'Horário', 300, false);
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('E-mail inválido.');
          db.prepare('UPDATE settings SET phone=?,email=?,hours=? WHERE id=1').run(p,email,hours);
          return json(res, 200, { ok: true });
        }
        const match = /^\/api\/(leads|clients|visits)\/([a-f0-9-]+)(\/convert)?$/.exec(path);
        if (match) {
          const [, table, id, convert] = match;
          const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
          if (!row) throw new AppError('Registro não encontrado.', 404);
          if (method === 'POST' && table === 'leads' && convert) {
            const result = transaction(db, () => {
              let client = db.prepare('SELECT id FROM clients WHERE lead_id=?').get(id);
              if (!client) {
                client = { id: randomUUID() };
                db.prepare('INSERT INTO clients(id,lead_id,name,company,phone,neighborhood,computers,created_at) VALUES(?,?,?,?,?,?,?,?)').run(client.id,id,row.name,row.company,row.phone,row.neighborhood,row.computers,new Date().toISOString());
              }
              db.prepare("UPDATE leads SET status='Convertido' WHERE id=?").run(id);
              return client;
            });
            return json(res, 200, result);
          }
          if (method === 'DELETE' && table === 'leads' && !convert) {
            // Clientes e seu histórico são preservados; o vínculo passa a nulo.
            db.prepare('DELETE FROM leads WHERE id=?').run(id); return json(res,200,{ok:true});
          }
          if (method === 'PATCH' && !convert) {
            const data = await body(req);
            if (table === 'leads') {
              const status = enumValue(data.status, leadStatuses), notes = text(data.notes, 'Observações', 5000, false);
              const linked = db.prepare('SELECT id FROM clients WHERE lead_id=?').get(id);
              if ((status === 'Convertido') !== !!linked) throw new AppError('Use a conversão para criar o cliente; interessados convertidos preservam esse status.');
              db.prepare('UPDATE leads SET status=?,notes=? WHERE id=?').run(status,notes,id);
            } else if (table === 'clients') {
              const fields = [text(data.name,'Responsável'),text(data.company,'Empresa'),phone(data.phone),text(data.neighborhood,'Bairro'),count(data.computers),text(data.service,'Serviço',1000,false)];
              const cents = data.monthly_cents;
              if (cents !== null && (!Number.isSafeInteger(cents) || cents < 0 || cents > 100000000)) throw new AppError('Valor mensal inválido.');
              db.prepare('UPDATE clients SET name=?,company=?,phone=?,neighborhood=?,computers=?,service=?,monthly_cents=?,status=? WHERE id=?').run(...fields,cents,enumValue(data.status,['Ativo','Inativo']),id);
            } else {
              db.prepare('UPDATE visits SET scheduled_at=?,description=?,status=?,notes=?,next_at=? WHERE id=?').run(dateValue(data.scheduled_at),text(data.description,'Descrição',1000),enumValue(data.status,visitStatuses),text(data.notes,'Observações',5000,false),dateValue(data.next_at,true),id);
            }
            return json(res,200,{ok:true});
          }
        }
        if (method === 'POST' && path === '/api/visits') {
          const data = await body(req);
          if (!db.prepare('SELECT id FROM clients WHERE id=?').get(String(data.client_id))) throw new AppError('Selecione um cliente válido.');
          const id = randomUUID();
          db.prepare('INSERT INTO visits VALUES(?,?,?,?,?,?,?,?)').run(id,data.client_id,dateValue(data.scheduled_at),text(data.description,'Descrição',1000),enumValue(data.status,visitStatuses),text(data.notes,'Observações',5000,false),dateValue(data.next_at,true),new Date().toISOString());
          return json(res,201,{id});
        }
        throw new AppError('Recurso não encontrado.',404);
      }
      if (!['GET','HEAD'].includes(method)) throw new AppError('Método não permitido.',405);
      const files = { '/': ['index.html','text/html'], '/admin': ['index.html','text/html'], '/admin/': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/styles.css': ['styles.css','text/css'], '/favicon.svg': ['favicon.svg','image/svg+xml'] };
      const file = files[path]; if (!file) throw new AppError('Página não encontrada.',404);
      const contents = await readFile(publicDir+file[0]);
      res.writeHead(200,{'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-cache'}); res.end(method === 'HEAD' ? undefined : contents);
    } catch (error) {
      if (!(error instanceof AppError)) console.error('Falha interna:', error.name);
      json(res, error.status || 500, { error: error instanceof AppError ? error.message : 'Não foi possível concluir. Tente novamente.' });
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createApp();
  server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log('CuidaTI iniciado. Configure APP_ORIGIN antes de publicar.'));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
