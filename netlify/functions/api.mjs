import { getDatabase } from '@netlify/database';
import { createNetlifyHandler } from '../../server/netlify-api.js';

export default async function api(request, context) {
  // A identidade de IP vem da plataforma, nunca de um cabeçalho fornecido pelo visitante.
  try {
    return await createNetlifyHandler({ pool: getDatabase().pool, env: process.env })(request, context);
  } catch {
    return Response.json({ error: 'Banco de dados ainda indisponível. Confira a configuração da hospedagem.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const config = { path: '/api/*' };
