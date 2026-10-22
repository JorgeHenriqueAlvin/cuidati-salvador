import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password, salt = randomBytes(24).toString('hex')) {
  return { salt, hash: (await derive(password, salt, 64)).toString('hex') };
}
export async function verifyPassword(password, admin) {
  const candidate = await hashPassword(password, admin?.salt || 'invalid-account-dummy-salt');
  const expected = Buffer.from(admin?.hash || '00'.repeat(64), 'hex');
  return timingSafeEqual(Buffer.from(candidate.hash, 'hex'), expected) && !!admin;
}
export function session(db, req) {
  const token = /(?:^|;\s*)cuidati_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  if (!token) return null;
  return db.prepare('SELECT admin_id FROM sessions WHERE token=? AND expires>?').get(digest(token), Date.now());
}
export const cookie = (token, production, maxAge = 28800) => `cuidati_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${production ? '; Secure' : ''}`;
