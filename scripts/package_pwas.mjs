import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, process.argv[2] || 'dist');

if (!existsSync(dist)) {
  throw new Error(`Missing ${dist}. Run npm run build first.`);
}

const apps = [
  {
    folder: 'cliente',
    role: 'client',
    name: 'Rapidingo Cliente',
    theme: '#FFC107',
    manifestSource: 'manifest-client.json',
    icon192: 'client-192.png',
    icon512: 'client-512.png'
  },
  {
    folder: 'delivery',
    role: 'delivery',
    name: 'Rapidingo Delivery',
    theme: '#FFC107',
    manifestSource: 'manifest-delivery.json',
    icon192: 'delivery-192.png',
    icon512: 'delivery-512.png'
  },
  {
    folder: 'restaurante',
    role: 'restaurant',
    name: 'Rapidingo Restaurante',
    theme: '#FFC107',
    manifestSource: 'manifest-client.json',
    icon192: 'client-192.png',
    icon512: 'client-512.png'
  },
  {
    folder: 'admin',
    role: 'admin',
    name: 'Rapidingo Administracion/Operadora',
    theme: '#FF6A00',
    manifestSource: 'manifest-client.json',
    icon192: 'client-192.png',
    icon512: 'client-512.png'
  }
];
const cacheSuffix = Date.now().toString(36);

const mustExist = (filePath) => {
  if (!existsSync(filePath)) {
    throw new Error(`Required file or directory not found: ${filePath}`);
  }
  return filePath;
};

writeFileSync(path.join(dist, '.nojekyll'), '');

for (const app of apps) {
  const target = path.join(dist, app.folder);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  copyFileSync(mustExist(path.join(dist, 'index.html')), path.join(target, 'index.html'));
  copyFileSync(mustExist(path.join(dist, 'sw.js')), path.join(target, 'sw.js'));
  cpSync(mustExist(path.join(dist, 'assets')), path.join(target, 'assets'), { recursive: true });
  cpSync(mustExist(path.join(dist, 'icons')), path.join(target, 'icons'), { recursive: true });
  copyFileSync(
    mustExist(path.join(dist, app.manifestSource)),
    path.join(target, 'manifest.json')
  );

  const indexPath = path.join(target, 'index.html');
  let index = readFileSync(indexPath, 'utf8');
  index = index
    .replaceAll('/Delivery_Rapidingo/', './')
    .replaceAll('/delivery-rapidingo/', './')
    .replaceAll('/delivery-rapidingo-v1/', './')
    .replace(
      /var role = new URLSearchParams\(window\.location\.search\)\.get\('role'\);/,
      `var role = '${app.role}';`
    )
    .replace(
      /window\.__RAPIDINGO_ROLE = role \|\| '';/,
      `window.__RAPIDINGO_ROLE = '${app.role}';`
    )
    .replaceAll("manifest = './manifest-client.json';", "manifest = './manifest.json';")
    .replaceAll("manifest = './manifest-delivery.json';", "manifest = './manifest.json';")
    .replace(/<title>.*?<\/title>/, `<title>${app.name}</title>`);
  writeFileSync(indexPath, index, 'utf8');

  const manifestPath = path.join(target, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.id = './';
  manifest.start_url = './';
  manifest.scope = './';
  manifest.name = app.name;
  manifest.short_name = app.name;
  manifest.theme_color = app.theme;
  manifest.icons[0].src = `icons/${app.icon192}`;
  manifest.icons[1].src = `icons/${app.icon512}`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const swPath = path.join(target, 'sw.js');
  let sw = readFileSync(swPath, 'utf8');
  sw = sw
    .replace(/const CACHE_NAME = 'rapidingo-[^']+';/, `const CACHE_NAME = 'rapidingo-${app.folder}-${cacheSuffix}';`)
    .replace(/\s*'\.\/manifest-client\.json',\r?\n/g, '')
    .replace(/\s*'\.\/manifest-delivery\.json',\r?\n/g, '')
    .replace(/\s*'\.\/icons\/icon-192\.png',\r?\n/g, '')
    .replace(/\s*'\.\/icons\/icon-512\.png',\r?\n/g, '');
  writeFileSync(swPath, sw, 'utf8');
}

console.log('Separate PWAs created:');
for (const app of apps) {
  console.log(` - ${path.join(dist, app.folder)}`);
}
