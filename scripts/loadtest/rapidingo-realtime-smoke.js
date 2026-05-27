#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function env(name) {
  return process.env[name]?.trim();
}

async function main() {
  const url = env('VITE_SUPABASE_URL') || env('SUPABASE_URL');
  const key = env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
  if (!url || !key) {
    throw new Error('Faltan VITE_SUPABASE_URL/SUPABASE_URL o VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY');
  }

  const runId = `rt_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const clientId = `${runId}_client`;
  const orderId = `${runId}_order`;
  const supabase = createClient(url, key, {
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  });

  const events = [];
  const channel = supabase
    .channel(`rapidingo-smoke-${runId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        events.push(payload.eventType);
        console.log(`Realtime event: ${payload.eventType}`);
      }
    );

  try {
    console.log(`Subscribing to Realtime for ${orderId}...`);
    const subscribed = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout esperando SUBSCRIBED')), 10000);
      channel.subscribe((status) => {
        console.log(`Realtime status: ${status}`);
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve(true);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Realtime status: ${status}`));
        }
      });
    });

    if (!subscribed) throw new Error('No se pudo suscribir a Realtime');

    console.log('Creating temporary user/order...');
    const { error: userError } = await supabase.from('users').upsert({
      id: clientId,
      name: 'Realtime Smoke Client',
      phone: '59170000000',
      email: `${clientId}@load.rapidingo.test`,
      role: 'CLIENT',
      online: false,
      device_id: clientId,
      location: { latitude: -14.8336, longitude: -64.9, selfie: null, isVerified: true },
    });
    if (userError) throw userError;

    const { error: insertError } = await supabase.from('orders').insert({
      id: orderId,
      client_id: clientId,
      client_name: 'Realtime Smoke Client',
      client_phone: '59170000000',
      category: 'OTROS',
      description: 'REALTIME SMOKE TEST',
      status: 'PENDING_PRICE',
      chat_history: [],
      client_location: { latitude: -14.8336, longitude: -64.9 },
      destination_location: { latitude: -14.834, longitude: -64.901 },
      delivery_path: [],
      rejected_by: [],
      created_at: Date.now(),
    });
    if (insertError) throw insertError;

    await wait(1000);

    console.log('Updating temporary order...');
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED' })
      .eq('id', orderId);
    if (updateError) throw updateError;

    await wait(1500);

    const required = ['INSERT', 'UPDATE'];
    const missing = required.filter((event) => !events.includes(event));
    if (missing.length > 0) {
      throw new Error(`Faltaron eventos Realtime: ${missing.join(', ')}. Eventos recibidos: ${events.join(', ') || 'ninguno'}`);
    }

    console.log(JSON.stringify({
      ok: true,
      runId,
      events,
    }, null, 2));
  } finally {
    await supabase.from('orders').delete().eq('id', orderId);
    await supabase.from('users').delete().eq('id', clientId);
    await supabase.removeChannel(channel);
    supabase.realtime.disconnect();
  }
}

const hardTimeout = setTimeout(() => {
  console.error('Timeout general del smoke test Realtime');
  process.exit(1);
}, 30000);

main()
  .then(() => {
    clearTimeout(hardTimeout);
    process.exit(0);
  })
  .catch((error) => {
    clearTimeout(hardTimeout);
    console.error(error);
    process.exit(1);
  });
