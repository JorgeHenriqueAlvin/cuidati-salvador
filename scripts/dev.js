import { createApp } from '../server/index.js';
const index = process.argv.indexOf('--port');
const port = Number(process.env.PORT || (index >= 0 ? process.argv[index+1] : 3000));
const hostname = process.env.SITES_MANAGED_LINUX_CONTAINER === '1' ? 'terminal.local' : 'localhost';
const origin = process.env.APP_ORIGIN || `http://${hostname}:${port}`;
const server = createApp({ origin, production: false });
server.listen(port, '0.0.0.0', () => console.log(`CuidaTI em desenvolvimento: ${origin}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
