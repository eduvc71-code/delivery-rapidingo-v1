import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const apps = [
  {
    folder: 'cliente',
    role: 'client',
    name: 'Beep Cliente',
    cachePrefix: 'rapidingo-cliente-'
  },
  {
    folder: 'delivery',
    role: 'delivery',
    name: 'Beep Delivery',
    cachePrefix: 'rapidingo-delivery-'
  },
  {
    folder: 'restaurante',
    role: 'restaurant',
    name: 'Beep Restaurante',
    cachePrefix: 'rapidingo-restaurante-'
  },
  {
    folder: 'admin',
    role: 'admin',
    name: 'Beep Administracion/Operadora',
    cachePrefix: 'rapidingo-admin-'
  }
];

const failures = [];

const readRequired = (filePath) => {
  if (!existsSync(filePath)) {
    failures.push(`Falta archivo requerido: ${filePath}`);
    return '';
  }

  return readFileSync(filePath, 'utf8');
};

for (const app of apps) {
  const folder = path.join(dist, app.folder);
  const index = readRequired(path.join(folder, 'index.html'));
  const manifestRaw = readRequired(path.join(folder, 'manifest.json'));
  const sw = readRequired(path.join(folder, 'sw.js'));

  if (index && !index.includes(`<title>${app.name}</title>`)) {
    failures.push(`${app.folder}: index.html no tiene el titulo esperado "${app.name}".`);
  }

  if (index && !index.includes(`window.__RAPIDINGO_ROLE = '${app.role}';`)) {
    failures.push(`${app.folder}: index.html no fija el rol esperado "${app.role}".`);
  }

  if (manifestRaw) {
    try {
      const manifest = JSON.parse(manifestRaw);
      if (manifest.name !== app.name || manifest.short_name !== app.name) {
        failures.push(`${app.folder}: manifest.json no coincide con el nombre "${app.name}".`);
      }
      if (manifest.start_url !== './' || manifest.scope !== './') {
        failures.push(`${app.folder}: manifest.json debe usar start_url/scope relativos.`);
      }
    } catch (error) {
      failures.push(`${app.folder}: manifest.json invalido: ${error.message}`);
    }
  }

  if (sw && !sw.includes(`const CACHE_NAME = '${app.cachePrefix}`)) {
    failures.push(`${app.folder}: sw.js no usa cache dedicado "${app.cachePrefix}...".`);
  }
}

if (failures.length > 0) {
  console.error('Validacion de PWAs fallo:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`OK: ${apps.length} PWAs empaquetadas tienen rol, manifest y cache coherentes.`);
