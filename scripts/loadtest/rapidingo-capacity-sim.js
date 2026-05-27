#!/usr/bin/env node

function parseArgs(argv) {
  const args = {
    orders: 500,
    deliveries: 50,
    arrivalWindowMinutes: 60,
    serviceMinMinutes: 20,
    serviceMaxMinutes: 30,
    targetP95WaitMinutes: 10,
    maxDeliveriesToSearch: 400,
    seed: 747,
  };

  for (const token of argv) {
    if (token === '--help' || token === '-h') args.help = true;
    else if (token.startsWith('--orders=')) args.orders = Number(token.split('=')[1]);
    else if (token.startsWith('--deliveries=')) args.deliveries = Number(token.split('=')[1]);
    else if (token.startsWith('--arrival-window=')) args.arrivalWindowMinutes = Number(token.split('=')[1]);
    else if (token.startsWith('--service-min=')) args.serviceMinMinutes = Number(token.split('=')[1]);
    else if (token.startsWith('--service-max=')) args.serviceMaxMinutes = Number(token.split('=')[1]);
    else if (token.startsWith('--target-p95-wait=')) args.targetP95WaitMinutes = Number(token.split('=')[1]);
    else if (token.startsWith('--max-deliveries=')) args.maxDeliveriesToSearch = Number(token.split('=')[1]);
    else if (token.startsWith('--seed=')) args.seed = Number(token.split('=')[1]);
    else throw new Error(`Argumento desconocido: ${token}`);
  }

  return args;
}

function printHelp() {
  console.log(`
Rapidingo capacity simulator: calcula cola operacional con tiempos reales.

Uso:
  npm run capacity:sim
  npm run capacity:sim -- --orders=500 --deliveries=50 --arrival-window=60 --service-min=20 --service-max=30
  npm run capacity:sim -- --orders=500 --target-p95-wait=10

Opciones:
  --orders=N             Pedidos pico a simular. Default: 500
  --deliveries=N         Repartidores disponibles. Default: 50
  --arrival-window=N     Ventana de llegada en minutos. Default: 60
  --service-min=N        Minutos minimos por entrega. Default: 20
  --service-max=N        Minutos maximos por entrega. Default: 30
  --target-p95-wait=N    Espera maxima objetivo p95. Default: 10
  --max-deliveries=N     Maximo para buscar capacidad. Default: 400
`);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function nextAvailableDriver(drivers) {
  let bestIndex = 0;
  let bestFreeAt = drivers[0];
  for (let i = 1; i < drivers.length; i += 1) {
    if (drivers[i] < bestFreeAt) {
      bestFreeAt = drivers[i];
      bestIndex = i;
    }
  }
  return bestIndex;
}

function simulate(args, overrideDeliveries = args.deliveries) {
  const random = seededRandom(args.seed);
  const arrivals = Array.from({ length: args.orders }, (_, index) => {
    const evenArrival = args.orders === 1 ? 0 : (index / (args.orders - 1)) * args.arrivalWindowMinutes;
    const jitter = (random() - 0.5) * Math.min(2, args.arrivalWindowMinutes / Math.max(args.orders, 1));
    return Math.max(0, evenArrival + jitter);
  }).sort((a, b) => a - b);

  const drivers = Array.from({ length: overrideDeliveries }, () => 0);
  const waits = [];
  const serviceTimes = [];
  const finishTimes = [];

  for (const arrival of arrivals) {
    const driverIndex = nextAvailableDriver(drivers);
    const startsAt = Math.max(arrival, drivers[driverIndex]);
    const wait = startsAt - arrival;
    const service = args.serviceMinMinutes + random() * (args.serviceMaxMinutes - args.serviceMinMinutes);
    const finishesAt = startsAt + service;

    drivers[driverIndex] = finishesAt;
    waits.push(wait);
    serviceTimes.push(service);
    finishTimes.push(finishesAt);
  }

  const finalCompletion = Math.max(...finishTimes, 0);
  const avgService = serviceTimes.reduce((sum, value) => sum + value, 0) / Math.max(serviceTimes.length, 1);
  const ordersPerDriverHour = 60 / avgService;

  return {
    orders: args.orders,
    deliveries: overrideDeliveries,
    arrivalWindowMinutes: args.arrivalWindowMinutes,
    serviceMinutes: {
      min: args.serviceMinMinutes,
      max: args.serviceMaxMinutes,
      avg: Number(avgService.toFixed(1)),
    },
    theoreticalCapacityPerHour: Number((overrideDeliveries * ordersPerDriverHour).toFixed(1)),
    demandPerHour: Number((args.orders / (args.arrivalWindowMinutes / 60)).toFixed(1)),
    waitMinutes: {
      avg: Number((waits.reduce((sum, value) => sum + value, 0) / Math.max(waits.length, 1)).toFixed(1)),
      p50: Number(percentile(waits, 0.5).toFixed(1)),
      p90: Number(percentile(waits, 0.9).toFixed(1)),
      p95: Number(percentile(waits, 0.95).toFixed(1)),
      max: Number(Math.max(...waits, 0).toFixed(1)),
    },
    finalCompletionMinutes: Number(finalCompletion.toFixed(1)),
    extraMinutesAfterArrivalWindow: Number(Math.max(0, finalCompletion - args.arrivalWindowMinutes).toFixed(1)),
  };
}

function findRequiredDeliveries(args) {
  for (let deliveries = 1; deliveries <= args.maxDeliveriesToSearch; deliveries += 1) {
    const result = simulate(args, deliveries);
    if (result.waitMinutes.p95 <= args.targetP95WaitMinutes) {
      return result;
    }
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const current = simulate(args);
  const required = findRequiredDeliveries(args);

  console.log('Escenario actual');
  console.log(JSON.stringify(current, null, 2));
  console.log('\nCapacidad requerida para objetivo');
  console.log(JSON.stringify({
    targetP95WaitMinutes: args.targetP95WaitMinutes,
    requiredDeliveries: required?.deliveries || null,
    result: required,
  }, null, 2));
}

main();
