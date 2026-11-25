// Revisión de la base de datos sin exponer contenido personal: esquema, filas por
// tabla y totales por cuenta (sin correos ni textos). Uso: npm run bd:resumen
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { leerConfig } from './config.ts';

const { rutaBd } = leerConfig();
if (!existsSync(rutaBd)) {
  console.log(`No hay base de datos en ${rutaBd} (se crea al iniciar el API).`);
  process.exit(0);
}
const db = new DatabaseSync(rutaBd, { readOnly: true });
const version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
console.log(`Base: ${rutaBd}\nVersión del esquema: ${version}\n`);

const tablas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>;
console.log('Tabla'.padEnd(26) + 'Filas   Columnas');
for (const { name } of tablas) {
  const filas = (db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get() as { n: number }).n;
  const columnas = (db.prepare(`PRAGMA table_info("${name}")`).all() as Array<{ name: string }>).map((c) => c.name).join(', ');
  console.log(name.padEnd(26) + String(filas).padStart(5) + '   ' + columnas);
}

const cuentas = db.prepare('SELECT * FROM resumen_cuentas ORDER BY creado').all() as Array<Record<string, unknown>>;
console.log(`\nCuentas: ${cuentas.length} (por id interno, sin correo)`);
for (const c of cuentas) {
  const { id, creado, ...conteos } = c;
  console.log(`  #${String(id).padEnd(5)} creada ${String(creado).slice(0, 10)}  ` + Object.entries(conteos).map(([k, v]) => `${k}=${v}`).join(' '));
}
db.close();
