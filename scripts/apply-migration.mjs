// Aplica una sola migration.
// Uso (cualquiera de los dos órdenes):
//   node scripts/apply-migration.mjs <DATABASE_URL> <migration-file>
//   node scripts/apply-migration.mjs <migration-file> <DATABASE_URL>
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

dns.setDefaultResultOrder('ipv4first');

const a = process.argv[2];
const b = process.argv[3];
if (!a || !b) {
  console.error('Uso: node scripts/apply-migration.mjs <DATABASE_URL> <migration-file>');
  console.error('   o: node scripts/apply-migration.mjs <migration-file> <DATABASE_URL>');
  process.exit(1);
}

// Detectamos qué arg es qué para aceptar ambos órdenes.
const isUrl = (s) => /^postgres(ql)?:\/\//i.test(s);
const url  = isUrl(a) ? a : b;
const fileArg = isUrl(a) ? b : a;

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Soportar tanto "0006_multi_shop.sql" como "supabase/migrations/0006_multi_shop.sql".
const sqlPath = path.isAbsolute(fileArg)
  ? fileArg
  : fileArg.includes('/')
    ? path.resolve(root, fileArg)
    : path.join(root, 'supabase', 'migrations', fileArg);

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
console.log('▶ Conectando…');
await client.connect();

const base = path.basename(sqlPath);
console.log(`▶ Aplicando ${base}…`);
const sql = fs.readFileSync(sqlPath, 'utf8');
await client.query(sql);
console.log(`  ✓ ${base} OK`);

await client.end();
console.log('✅ Listo.');
