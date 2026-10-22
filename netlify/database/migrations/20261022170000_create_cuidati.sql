CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  credential_revision TEXT NOT NULL,
  expires BIGINT NOT NULL
);
CREATE TABLE limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires BIGINT NOT NULL
);
CREATE TABLE challenges (
  token TEXT PRIMARY KEY,
  answer TEXT NOT NULL,
  created BIGINT NOT NULL
);
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  computers INTEGER NOT NULL CHECK(computers > 0),
  difficulty TEXT NOT NULL,
  interest TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Novo' CHECK(status IN ('Novo','Em contato','Proposta enviada','Convertido','Encerrado')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  lead_id TEXT UNIQUE REFERENCES leads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  computers INTEGER NOT NULL CHECK(computers > 0),
  service TEXT NOT NULL DEFAULT '',
  monthly_cents INTEGER CHECK(monthly_cents IS NULL OR monthly_cents >= 0),
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK(status IN ('Ativo','Inativo')),
  created_at TEXT NOT NULL
);
CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  scheduled_at TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Agendada','Realizada','Cancelada')),
  notes TEXT NOT NULL DEFAULT '',
  next_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT ''
);
CREATE INDEX sessions_expiry_idx ON sessions(expires);
CREATE INDEX limits_expiry_idx ON limits(expires);
CREATE INDEX challenges_created_idx ON challenges(created);
CREATE INDEX visits_client_idx ON visits(client_id,scheduled_at);
