import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hashPassword } from '../server/auth.js';

async function hidden(prompt) {
  if(!stdin.isTTY)throw new Error('Execute em um terminal interativo.');
  stdout.write(prompt);stdin.setRawMode(true);stdin.resume();
  return new Promise((resolve,reject)=>{
    let value='';
    function finish(){stdin.off('data',onData);stdin.setRawMode(false);stdin.pause();stdout.write('\n');}
    function onData(buffer){for(const c of buffer.toString()){
      if(c==='\r'||c==='\n'){finish();resolve(value);return;}
      if(c==='\u0003'){finish();reject(new Error('Cancelado.'));return;}
      if(c==='\u007f')value=value.slice(0,-1);else if(c>=' ')value+=c;
    }}stdin.on('data',onData);
  });
}
try {
  const rl=createInterface({input:stdin,output:stdout});
  const email=(await rl.question('E-mail do administrador Netlify: ')).trim().toLowerCase();rl.close();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('E-mail inválido.');
  const password=await hidden('Senha (12–256 caracteres, entrada oculta): ');
  const confirmation=await hidden('Confirme a senha: ');
  if(password.length<12||password.length>256||password!==confirmation)throw new Error('Senhas diferentes ou fora do limite.');
  const {salt,hash}=await hashPassword(password);
  console.log('\nCopie os valores abaixo para variáveis protegidas da função na Netlify. Não envie ao GitHub ou ao chat.');
  console.log(`ADMIN_EMAIL=${email}\nADMIN_PASSWORD_SALT=${salt}\nADMIN_PASSWORD_HASH=${hash}`);
  console.log('\nA senha original não foi gravada. Republicar aplica os novos valores e invalida as sessões antigas.');
} catch(e){console.error(e.message);process.exitCode=1;}
