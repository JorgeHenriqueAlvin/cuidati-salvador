export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const leadStatuses = ['Novo', 'Em contato', 'Proposta enviada', 'Convertido', 'Encerrado'];
export const visitStatuses = ['Agendada', 'Realizada', 'Cancelada'];
export function text(value, label, max = 150, required = true) {
  if (typeof value !== 'string') throw new AppError(`${label}: informe um texto válido.`);
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new AppError(`${label}: campo obrigatório com até ${max} caracteres.`);
  return result;
}
export function phone(value, required = true) {
  const raw = text(value, 'WhatsApp', 30, required);
  if (!raw && !required) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  if (!/^[1-9]\d{9,10}$/.test(digits)) throw new AppError('Informe um WhatsApp brasileiro com DDD.');
  return `55${digits}`;
}
export function count(value) {
  if (value === '' || typeof value === 'boolean') throw new AppError('Informe a quantidade de computadores.');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 10000) throw new AppError('Quantidade de computadores: informe um inteiro entre 1 e 10.000.');
  return n;
}
export function enumValue(value, allowed) {
  if (!allowed.includes(value)) throw new AppError('Opção inválida.');
  return value;
}
export function leadInput(data) {
  return { name: text(data.name, 'Nome'), company: text(data.company, 'Empresa'), phone: phone(data.phone),
    neighborhood: text(data.neighborhood, 'Bairro'), computers: count(data.computers),
    difficulty: text(data.difficulty, 'Dificuldade', 1000),
    interest: enumValue(data.interest, ['Manutenção avulsa', 'Plano recorrente', 'Preciso de orientação']) };
}
export function dateValue(value, optional = false) {
  if (optional && !value) return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new AppError('Data inválida.');
  return new Date(value).toISOString();
}
