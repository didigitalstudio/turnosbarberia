// Aplica supabase/migrations/0001_init.sql + supabase/seed.sql al proyecto Supabase.
// Uso: node scripts/apply-schema.mjs <DATABASE_URL>
// Donde DATABASE_URL es la "Connection string (URI)" de Settings → Database (con tu password).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url) {
  console.error('❌ Falta DATABASE_URL como argumento o variable de entorno.');
  console.error('   Conseguila en: Supabase → Settings → Database → Connection string (URI)');
  console.error('   Ej: node scripts/apply-schema.mjs "postgresql://postgres:TU_PASS@db.xxxx.supabase.co:5432/postgres"');
  process.exit(1);
}

let pg;
try {
  const require = createRequire(import.meta.url);
  pg = require('pg');
} catch {
  console.error('❌ Falta la dependencia `pg`. Instalala con: npm install pg');
  process.exit(1);
}

const { Client } = pg;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const migrationPath = path.join(root, 'supabase', 'migrations', '0001_init.sql');
const seedPath      = path.join(root, 'supabase', 'seed.sql');

const sql1 = fs.readFileSync(migrationPath, 'utf8');
const sql2 = fs.readFileSync(seedPath, 'utf8');

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

console.log('▶ Conectando a Supabase…');
await client.connect();
console.log('▶ Aplicando migrations…');
await client.query(sql1);
console.log('  ✓ schema OK');
console.log('▶ Aplicando seed…');
await client.query(sql2);
console.log('  ✓ seed OK');
await client.end();
console.log('✅ Listo. Tu base está lista para usar.');
