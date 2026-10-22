import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { openDB } from '../server/db.js';
import { hashPassword } from '../server/auth.js';
// A senha chega via entrada oculta em terminal; nunca via argumentos, logs ou arquivo.
async function hidden(prompt) {
  if (!stdin.isTTY) throw new Error('Execute em um terminal interativo.');
  stdout.write(prompt); stdin.setRawMode(true); stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function done() { stdin.off('data', onData); stdin.setRawMode(false); stdin.pause(); stdout.write('\n'); }
    function onData(buf) {
      for (const c of buf.toString()) {
        if (c === '\r' || c === '\n') { done(); resolve(value); return; }
        if (c === '\u0003') { done(); reject(new Error('Cancelado')); return; }
        if (c === '\u007f') value = value.slice(0, -1); else if (c >= ' ') value += c;
      }
    }
    stdin.on('data', onData);
  });
}
try {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = (await rl.question('E-mail do administrador: ')).trim().toLowerCase(); rl.close();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
  const password = await hidden('Senha (mínimo 12 caracteres, entrada oculta): ');
  const confirmation = await hidden('Confirme a senha: ');
  if (password.length < 12 || password.length > 256 || password !== confirmation) throw new Error('Senhas diferentes ou fora do limite de 12–256 caracteres.');
  const db = openDB(); const { salt, hash } = await hashPassword(password);
  db.prepare('INSERT INTO admins(email,salt,hash) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET salt=excluded.salt,hash=excluded.hash').run(email, salt, hash);
  db.prepare('DELETE FROM sessions WHERE admin_id=(SELECT id FROM admins WHERE email=?)').run(email);
  db.close(); console.log('Administrador configurado; sessões anteriores encerradas.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
