#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public', 'assets', 'restaurants');
const ANDROID_DIR = path.join(ROOT, 'app', 'src', 'main', 'assets', 'restaurants');

const RESTAURANT_ASSETS = [
  'wings_drinks.jpg',
  'el_brete.jpg',
  'la_toscana.jpg',
  'la_toscana1.jpg',
  'la_toscana2.jpg',
  'la_plazuela.jpg',
  'la_coqueta.jpg',
  'mr_grill.jpg',
  'el_benianito.jpg',
  'toby.jpg',
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

let hasError = false;

for (const asset of RESTAURANT_ASSETS) {
  const publicPath = path.join(PUBLIC_DIR, asset);
  const androidPath = path.join(ANDROID_DIR, asset);

  if (!fs.existsSync(publicPath)) {
    console.error(`Falta asset PWA: ${publicPath}`);
    hasError = true;
    continue;
  }

  if (!fs.existsSync(androidPath)) {
    console.error(`Falta asset Android: ${androidPath}`);
    hasError = true;
    continue;
  }

  const publicHash = sha256(publicPath);
  const androidHash = sha256(androidPath);

  if (publicHash !== androidHash) {
    console.error(`Asset distinto entre PWA y Android: ${asset}`);
    console.error(`  PWA:     ${publicHash}`);
    console.error(`  Android: ${androidHash}`);
    hasError = true;
  }
}

if (hasError) {
  process.exitCode = 1;
} else {
  console.log(`OK: ${RESTAURANT_ASSETS.length} assets de restaurantes coinciden entre PWA y Android.`);
}
