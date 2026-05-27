#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const DEFAULT_TRINIDAD = { latitude: -14.8336, longitude: -64.9 };

const SCENARIOS = {
  small: { users: 100, deliveries: 10, orders: 100, concurrency: 12 },
  large: { users: 500, deliveries: 50, orders: 500, concurrency: 35 },
};

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

function parseArgs(argv) {
  const args = {
    scenario: 'small',
    mode: 'both',
    live: false,
    cleanup: false,
    cleanupOnly: false,
    concurrency: undefined,
    users: undefined,
    deliveries: undefined,
    orders: undefined,
    runId: `lt_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
  };

  for (const token of argv) {
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--live') args.live = true;
    else if (token === '--cleanup') args.cleanup = true;
    else if (token === '--cleanup-only') args.cleanupOnly = true;
    else if (token.startsWith('--scenario=')) args.scenario = token.split('=')[1];
    else if (token.startsWith('--mode=')) args.mode = token.split('=')[1];
    else if (token.startsWith('--users=')) args.users = Number(token.split('=')[1]);
    else if (token.startsWith('--deliveries=')) args.deliveries = Number(token.split('=')[1]);
    else if (token.startsWith('--orders=')) args.orders = Number(token.split('=')[1]);
    else if (token.startsWith('--concurrency=')) args.concurrency = Number(token.split('=')[1]);
    else if (token.startsWith('--run-id=')) args.runId = token.split('=')[1].replace(/[^a-zA-Z0-9_-]/g, '_');
    else if (token.startsWith('--url=')) args.url = token.slice('--url='.length);
    else if (token.startsWith('--key=')) args.key = token.slice('--key='.length);
    else throw new Error(`Argumento desconocido: ${token}`);
  }

  if (!['small', 'large', 'custom'].includes(args.scenario)) {
    throw new Error('--scenario debe ser small, large o custom');
  }
  if (!['automatic', 'operator', 'both'].includes(args.mode)) {
    throw new Error('--mode debe ser automatic, operator o both');
  }

  const base = args.scenario === 'custom' ? SCENARIOS.small : SCENARIOS[args.scenario];
  return {
    ...args,
    users: args.users || base.users,
    deliveries: args.deliveries || base.deliveries,
    orders: args.orders || base.orders,
    concurrency: args.concurrency || base.concurrency,
  };
}

function printHelp() {
  console.log(`
Rapidingo load test: trafico real contra Supabase REST.

Uso:
  npm run loadtest -- --scenario=small --mode=both
  npm run loadtest -- --scenario=small --mode=automatic --live --cleanup
  npm run loadtest -- --scenario=large --mode=operator --live --concurrency=50

Variables:
  VITE_SUPABASE_URL o SUPABASE_URL
  VITE_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY

Opciones:
  --scenario=small|large|custom   small=10 repartidores/100 usuarios, large=50/500
  --mode=automatic|operator|both  Ejecuta despacho automatico, operadora o ambos
  --users=N                       Clientes registrados de prueba
  --deliveries=N                  Repartidores online de prueba
  --orders=N                      Pedidos de hora pico
  --concurrency=N                 Flujos de pedido simultaneos
  --run-id=ID                     Prefijo aislado para datos de la corrida
  --live                          Obligatorio para escribir en Supabase
  --cleanup                       Borra usuarios/pedidos/reports generados al final
  --cleanup-only                  Solo limpia datos de --run-id y no genera trafico
`);
}

function jitterLocation(index, spread = 0.035) {
  const angle = (index * 137.508) * Math.PI / 180;
  const radius = ((index % 17) / 17) * spread + 0.002;
  return {
    latitude: Number((DEFAULT_TRINIDAD.latitude + Math.sin(angle) * radius).toFixed(6)),
    longitude: Number((DEFAULT_TRINIDAD.longitude + Math.cos(angle) * radius).toFixed(6)),
  };
}

function distanceMeters(a, b) {
  const r = 6371e3;
  const p1 = a.latitude * Math.PI / 180;
  const p2 = b.latitude * Math.PI / 180;
  const dp = (b.latitude - a.latitude) * Math.PI / 180;
  const dl = (b.longitude - a.longitude) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

class SupabaseLoadClient {
  constructor(url, key) {
    this.url = url.replace(/\\:/g, ':').replace(/\/$/, '');
    this.key = key.trim();
    this.metrics = [];
  }

  async request(label, pathName, options = {}) {
    const maxAttempts = options.retry === false ? 1 : 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const start = performance.now();
      try {
        const response = await fetch(`${this.url}${pathName}`, {
          ...options,
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(options.headers || {}),
          },
        });
        const text = await response.text();
        const ms = performance.now() - start;
        if (!response.ok) {
          const retryableStatus = response.status === 429 || response.status >= 500;
          this.metrics.push({
            label,
            method: options.method || 'GET',
            status: response.status,
            ok: false,
            ms,
            attempt,
            finalFailure: !(attempt < maxAttempts && retryableStatus),
          });
          lastError = new Error(`${label} Supabase ${response.status}: ${text || response.statusText}`);
          lastError.httpHandled = true;
          if (attempt < maxAttempts && retryableStatus) {
            await wait(200 * attempt);
            continue;
          }
          throw lastError;
        }
        this.metrics.push({ label, method: options.method || 'GET', status: response.status, ok: true, ms, attempt, finalFailure: false });
        return text ? JSON.parse(text) : [];
      } catch (error) {
        if (error?.httpHandled) throw error;
        lastError = error;
        const ms = performance.now() - start;
        this.metrics.push({
          label,
          method: options.method || 'GET',
          status: 0,
          ok: false,
          ms,
          attempt,
          finalFailure: attempt === maxAttempts,
        });
        if (attempt < maxAttempts) {
          await wait(200 * attempt);
          continue;
        }
      }
    }

    throw lastError;
  }
}

function buildUsers(runId, userCount, deliveryCount) {
  const clients = Array.from({ length: userCount }, (_, i) => ({
    id: `${runId}_client_${String(i + 1).padStart(4, '0')}`,
    name: `LT Cliente ${i + 1}`,
    phone: `591700${String(i + 1).padStart(5, '0')}`,
    email: `${runId}_client_${i + 1}@load.rapidingo.test`,
    role: 'CLIENT',
    online: false,
    device_id: `${runId}_client_${i + 1}`,
    location: { ...jitterLocation(i), selfie: null, isVerified: true },
  }));

  const deliveries = Array.from({ length: deliveryCount }, (_, i) => ({
    id: `${runId}_delivery_${String(i + 1).padStart(3, '0')}`,
    name: `LT Repartidor ${i + 1}`,
    phone: `591710${String(i + 1).padStart(5, '0')}`,
    email: `${runId}_delivery_${i + 1}@load.rapidingo.test`,
    role: 'DELIVERY',
    online: true,
    device_id: `${runId}_delivery_${i + 1}`,
    location: { ...jitterLocation(i + 900, 0.045), selfie: null, isVerified: true },
  }));

  return { clients, deliveries };
}

function selectDelivery(destination, deliveries, busy, rejected = new Set()) {
  const candidates = deliveries
    .filter((driver) => driver.online && !busy.has(driver.id) && !rejected.has(driver.id))
    .sort((a, b) => distanceMeters(destination, a.location) - distanceMeters(destination, b.location))
    .slice(0, 3);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireDelivery(destination, deliveries, busy, options = {}) {
  const {
    preferredDriver = null,
    preferredOnly = false,
    timeoutMs = 20_000,
    intervalMs = 150,
  } = options;
  const start = performance.now();

  while (performance.now() - start < timeoutMs) {
    if (preferredDriver && !busy.has(preferredDriver.id)) {
      busy.add(preferredDriver.id);
      return {
        driver: preferredDriver,
        waitMs: performance.now() - start,
      };
    }

    if (preferredOnly) {
      await wait(intervalMs);
      continue;
    }

    const driver = selectDelivery(destination, deliveries, busy);
    if (driver) {
      busy.add(driver.id);
      return {
        driver,
        waitMs: performance.now() - start,
      };
    }

    await wait(intervalMs);
  }

  return {
    driver: null,
    waitMs: performance.now() - start,
  };
}

function buildOrder(runId, mode, index, client, targetDelivery) {
  const isRestaurant = index % 3 === 0;
  const destination = jitterLocation(index + 1800, 0.04);
  const description = isRestaurant
    ? [
        'PEDIDO DE COMIDA PARA COTIZAR',
        'RESTAURANTE: Wings & Drinks',
        `- Hamburguesa pico ${index + 1} x1`,
        index % 2 === 0 ? '- Papas grandes x1' : '- Refresco x2',
        'TOTAL PLATOS: 2',
        mode === 'operator' ? 'Cliente espera cotizacion de la operadora.' : 'Cliente espera cotizacion del delivery.',
      ].join('\n')
    : `PEDIDO HORA PICO ${index + 1}: compra rapida y entrega en Trinidad`;

  return {
    id: `${runId}_${mode}_order_${String(index + 1).padStart(5, '0')}`,
    client_id: client.id,
    client_name: client.name,
    client_phone: client.phone,
    delivery_id: null,
    delivery_name: targetDelivery?.name || null,
    delivery_phone: targetDelivery?.phone || null,
    category: isRestaurant ? 'COMIDA' : (index % 5 === 0 ? 'FARMACIA' : 'OTROS'),
    description,
    status: 'PENDING_PRICE',
    product_price: null,
    service_price: null,
    total_price: null,
    chat_history: [],
    client_location: {
      latitude: client.location.latitude,
      longitude: client.location.longitude,
    },
    destination_location: destination,
    delivery_location: null,
    delivery_path: [],
    target_delivery_id: targetDelivery?.id || null,
    rejected_by: [],
    created_at: Date.now() + index,
  };
}

async function seedUsers(api, clients, deliveries) {
  for (const part of chunks([...clients, ...deliveries], 100)) {
    await api.request('seed users', '/rest/v1/users?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(part),
    });
  }
}

async function setDispatchMode(api, mode) {
  await api.request('set dispatch mode', '/rest/v1/settings?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ key: 'dispatch_mode', value: mode === 'operator' ? 'OPERATOR' : 'AUTOMATIC' }),
  });
}

async function createOrder(api, order) {
  await api.request('create order', '/rest/v1/orders?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(order),
  });
}

async function patchOrder(api, id, label, values, filters = '') {
  const query = `/rest/v1/orders?id=eq.${encodeURIComponent(id)}${filters}`;
  return api.request(label, query, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(values),
  });
}

async function deleteGenerated(api, runId) {
  const safeDelete = async (label, pathName) => {
    try {
      await api.request(label, pathName, { method: 'DELETE' });
    } catch (error) {
      console.warn(`${label} fallo, se continuara con el cleanup:`, error.message);
    }
  };

  await safeDelete('cleanup reports by id', `/rest/v1/delivery_reports?id=like.${runId}*`);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await safeDelete(`cleanup orders by id attempt ${attempt}`, `/rest/v1/orders?id=like.${runId}*`);
    await safeDelete(`cleanup orders by client attempt ${attempt}`, `/rest/v1/orders?client_id=like.${runId}*`);
    await safeDelete(`cleanup orders by delivery attempt ${attempt}`, `/rest/v1/orders?delivery_id=like.${runId}*`);
    await safeDelete(`cleanup orders by target attempt ${attempt}`, `/rest/v1/orders?target_delivery_id=like.${runId}*`);
    await wait(250);
  }

  await api.request('cleanup users', `/rest/v1/users?id=like.${runId}*`, { method: 'DELETE' });
}

async function runOrderFlow(api, mode, order, deliveries, busy) {
  const result = { id: order.id, mode, assigned: Boolean(order.target_delivery_id), completed: false, queueWaitMs: 0, notes: [] };
  await createOrder(api, order);

  let driver = order.target_delivery_id
    ? deliveries.find((item) => item.id === order.target_delivery_id)
    : null;

  if (mode === 'operator') {
    const productPrice = 25 + (Number(order.id.replace(/\D/g, '').slice(-2)) % 35);
    const servicePrice = 5 + (productPrice % 8);
    await patchOrder(api, order.id, 'operator quote', {
      product_price: productPrice,
      service_price: servicePrice,
      total_price: productPrice + servicePrice,
      status: 'WAITING_CONFIRM',
      chat_history: [
        {
          id: `sys_quote_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          senderId: 'system',
          text: `OPERATOR_QUOTE:PRODUCT:${productPrice}:SERVICE:${servicePrice}`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
    });
    await patchOrder(api, order.id, 'client confirms quote', { status: 'CONFIRMED_BY_CLIENT' });
    const acquired = await acquireDelivery(order.destination_location, deliveries, busy);
    driver = acquired.driver;
    result.queueWaitMs = acquired.waitMs;
    if (!driver) {
      result.notes.push('sin repartidor disponible para asignacion de operadora despues de esperar cola');
      return result;
    }
    result.assigned = true;
    await patchOrder(api, order.id, 'operator assigns driver', {
      delivery_id: driver.id,
      delivery_name: driver.name,
      delivery_phone: driver.phone,
      target_delivery_id: driver.id,
      status: 'PICKING_UP',
    });
  } else {
    const acquired = await acquireDelivery(order.destination_location, deliveries, busy, {
      preferredDriver: driver,
      preferredOnly: Boolean(driver),
    });
    driver = acquired.driver;
    result.queueWaitMs = acquired.waitMs;
    if (!driver) {
      result.notes.push('pedido automatico no consiguio repartidor despues de esperar cola');
      return result;
    }
    result.assigned = true;
    const claimed = await patchOrder(
      api,
      order.id,
      'delivery claim',
      {
        delivery_id: driver.id,
        delivery_name: driver.name,
        delivery_phone: driver.phone,
        delivery_location: {
          latitude: driver.location.latitude,
          longitude: driver.location.longitude,
        },
        delivery_path: [{ latitude: driver.location.latitude, longitude: driver.location.longitude }],
      },
      `&status=eq.PENDING_PRICE&delivery_id=is.null&or=(target_delivery_id.is.null,target_delivery_id.eq.${encodeURIComponent(driver.id)})`
    );
    if (!Array.isArray(claimed) || claimed.length === 0) {
      result.notes.push('colision: otro actor tomo el pedido antes');
      busy.delete(driver.id);
      return result;
    }
    const productPrice = 20 + (Number(order.id.replace(/\D/g, '').slice(-2)) % 40);
    const servicePrice = 6 + (productPrice % 7);
    await patchOrder(api, order.id, 'delivery quote', {
      product_price: productPrice,
      service_price: servicePrice,
      total_price: productPrice + servicePrice,
      status: 'WAITING_CONFIRM',
    });
    await patchOrder(api, order.id, 'client confirms quote', { status: 'CONFIRMED_BY_CLIENT' });
    await patchOrder(api, order.id, 'delivery picking up', { status: 'PICKING_UP' });
  }

  const routePoints = [
    driver.location,
    jitterLocation(Number(order.id.replace(/\D/g, '').slice(-2)) + 2100, 0.025),
    order.destination_location,
  ].map((point) => ({ latitude: point.latitude, longitude: point.longitude }));

  await patchOrder(api, order.id, 'delivery en route', {
    status: 'IN_DELIVERY',
    delivery_location: routePoints[1],
    delivery_path: routePoints,
  });
  await patchOrder(api, order.id, 'delivery arrived', {
    status: 'DELIVERED_BY_REPARTIDOR',
    delivery_location: order.destination_location,
    delivery_path: routePoints,
    chat_history: [
      ...(order.chat_history || []),
      {
        id: `msg_arrived_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        senderId: driver.id,
        text: 'Su pedido esta en la puerta',
        timestamp: Date.now(),
      },
    ],
  });
  await patchOrder(api, order.id, 'client completes', {
    status: 'COMPLETED',
    chat_history: [],
  });

  busy.delete(driver.id);
  result.completed = true;
  return result;
}

function summarize(api, results, startedAt) {
  const elapsed = (performance.now() - startedAt) / 1000;
  const latencies = api.metrics.map((m) => m.ms).sort((a, b) => a - b);
  const percentile = (p) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] : 0;
  const failedHttp = api.metrics.filter((m) => m.finalFailure);
  const retriedRequests = api.metrics.filter((m) => m.attempt && m.attempt > 1).length;
  const completed = results.filter((r) => r.completed).length;
  const assigned = results.filter((r) => r.assigned).length;
  const unassigned = results.filter((r) => r.notes.length > 0).length;
  const waits = results.map((r) => r.queueWaitMs || 0).filter((ms) => ms > 0).sort((a, b) => a - b);
  const waitPercentile = (p) => waits.length ? waits[Math.min(waits.length - 1, Math.floor(waits.length * p))] : 0;

  return {
    elapsedSeconds: Number(elapsed.toFixed(2)),
    totalHttpRequests: api.metrics.length,
    requestsPerSecond: Number((api.metrics.length / Math.max(elapsed, 0.001)).toFixed(2)),
    completedOrders: completed,
    assignedOrders: assigned,
    unassignedOrBlockedOrders: unassigned,
    failedHttpRequests: failedHttp.length,
    retriedRequests,
    latencyMs: {
      p50: Number(percentile(0.5).toFixed(1)),
      p95: Number(percentile(0.95).toFixed(1)),
      p99: Number(percentile(0.99).toFixed(1)),
      max: Number((latencies.at(-1) || 0).toFixed(1)),
    },
    queueWaitMs: {
      p50: Number(waitPercentile(0.5).toFixed(1)),
      p95: Number(waitPercentile(0.95).toFixed(1)),
      max: Number((waits.at(-1) || 0).toFixed(1)),
    },
    notes: results.flatMap((r) => r.notes).reduce((acc, note) => {
      acc[note] = (acc[note] || 0) + 1;
      return acc;
    }, {}),
  };
}

async function main() {
  loadDotEnv(path.resolve(process.cwd(), '.env'));
  loadDotEnv(path.resolve(process.cwd(), '.env.local'));

  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const url = args.url || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = args.key || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  const modes = args.mode === 'both' ? ['automatic', 'operator'] : [args.mode];
  console.log(JSON.stringify({
    runId: args.runId,
    live: args.live,
    cleanup: args.cleanup,
    cleanupOnly: args.cleanupOnly,
    scenario: args.scenario,
    users: args.users,
    deliveries: args.deliveries,
    ordersPerMode: args.orders,
    concurrency: args.concurrency,
    modes,
  }, null, 2));

  if (!args.live) {
    console.log('\nDRY RUN: no se escribio en Supabase. Agrega --live para ejecutar trafico real.');
    return;
  }
  if (!url || !key) {
    throw new Error('Faltan VITE_SUPABASE_URL/SUPABASE_URL o VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY');
  }

  const api = new SupabaseLoadClient(url, key);
  const startedAt = performance.now();

  if (args.cleanupOnly) {
    console.log(`\nLimpiando datos generados para runId=${args.runId}...`);
    await deleteGenerated(api, args.runId);
    console.log('Cleanup finalizado.');
    return;
  }

  const { clients, deliveries } = buildUsers(args.runId, args.users, args.deliveries);

  await seedUsers(api, clients, deliveries);

  const allResults = [];
  try {
    for (const mode of modes) {
      console.log(`\nEjecutando modo ${mode.toUpperCase()}...`);
      await setDispatchMode(api, mode);
      const busy = new Set();
      const orders = Array.from({ length: args.orders }, (_, index) => {
        const client = clients[index % clients.length];
        const target = mode === 'automatic'
          ? selectDelivery(jitterLocation(index + 1800, 0.04), deliveries, busy)
          : null;
        if (target) busy.add(target.id);
        return buildOrder(args.runId, mode, index, client, target);
      });
      busy.clear();

      const results = await runPool(orders, args.concurrency, async (order) => {
        try {
          return await runOrderFlow(api, mode, order, deliveries, busy);
        } catch (error) {
          return {
            id: order.id,
            mode,
            assigned: false,
            completed: false,
            queueWaitMs: 0,
            notes: [`error flujo pedido: ${String(error.message || error).slice(0, 160)}`],
          };
        }
      });
      allResults.push(...results);
      console.log(JSON.stringify(summarize(api, allResults, startedAt), null, 2));
    }
  } finally {
    if (args.cleanup) {
      console.log('\nLimpiando datos generados...');
      await deleteGenerated(api, args.runId);
    }
  }

  console.log('\nResumen final');
  console.log(JSON.stringify(summarize(api, allResults, startedAt), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
