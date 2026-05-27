import { Order, OrderStatus, OrderType, User, UserRole } from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\\:/g, ':').replace(/\/$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

type SupabaseLatLng = {
  latitude: number;
  longitude: number;
};

type SupabaseOrderRow = {
  id: string;
  client_id: string;
  client_name?: string;
  client_phone?: string | null;
  delivery_id?: string | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  category?: string;
  description?: string;
  status?: OrderStatus;
  product_price?: number | null;
  service_price?: number | null;
  total_price?: number | null;
  photo_url?: string | null;
  payment_photo_url?: string | null;
  chat_history?: unknown[];
  client_location?: SupabaseLatLng | null;
  destination_location?: SupabaseLatLng | null;
  delivery_location?: SupabaseLatLng | null;
  delivery_path?: SupabaseLatLng[];
  target_delivery_id?: string | null;
  rejected_by?: string[];
  created_at: number;
};

type SupabaseUserRow = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  location?: unknown | null;
  online?: boolean;
  device_id?: string;
};

type SupabaseDeliveryReportRow = {
  id: string;
  delivery_id: string;
  delivery_name?: string | null;
  client_name?: string | null;
  category: string;
  description: string;
  status: OrderStatus;
  product_price?: number | null;
  service_price?: number | null;
  total_price?: number | null;
  created_at: number;
};

let cachedDispatchMode: { value: string; fetchedAt: number } | null = null;
const DISPATCH_MODE_CACHE_MS = 60_000;
let cachedOnlineDeliveryUsers: { value: User[]; fetchedAt: number } | null = null;
const ONLINE_DELIVERY_USERS_CACHE_MS = 10_000;

function assertConfigured() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY para la PWA.');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  assertConfigured();

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text || response.statusText}`);
  }

  return (text ? JSON.parse(text) : []) as T;
}

function typeToCategory(type: OrderType): string {
  switch (type) {
    case OrderType.RESTAURANT:
      return 'COMIDA';
    case OrderType.PHARMACY:
      return 'FARMACIA';
    default:
      return 'OTROS';
  }
}

function categoryToType(category?: string): OrderType {
  switch ((category || '').toUpperCase()) {
    case 'COMIDA':
    case 'RESTAURANT':
      return OrderType.RESTAURANT;
    case 'FARMACIA':
    case 'PHARMACY':
      return OrderType.PHARMACY;
    default:
      return OrderType.OTHER;
  }
}

function toSupabaseLocation(location?: { lat: number; lng: number } | null): SupabaseLatLng | null {
  if (!location) return null;
  return {
    latitude: location.lat,
    longitude: location.lng,
  };
}

function fromSupabaseLocation(location?: SupabaseLatLng | null): { lat: number; lng: number } | undefined {
  if (!location) return undefined;
  return {
    lat: Number(location.latitude || 0),
    lng: Number(location.longitude || 0),
  };
}

function orderToRow(order: Order, clientUser?: User | null, deliveryUser?: User | null): SupabaseOrderRow {
  const deliveryId = order.deliveryId || deliveryUser?.id || null;
  const destinationLocation = order.destinationLocation || order.location;
  const clientLocation = order.clientLocation || clientUser?.location || null;

  return {
    id: order.id,
    client_id: order.clientId,
    client_name: clientUser?.name || order.clientName,
    client_phone: clientUser?.phone || order.clientPhone || '',
    delivery_id: deliveryId,
    delivery_name: deliveryId ? deliveryUser?.name || order.deliveryName : order.deliveryName,
    delivery_phone: deliveryId ? deliveryUser?.phone || order.deliveryPhone || null : order.deliveryPhone || null,
    category: typeToCategory(order.type),
    description: order.description,
    status: order.status,
    product_price: order.productPrice ?? null,
    service_price: order.servicePrice ?? null,
    total_price: order.totalPrice ?? null,
    photo_url: order.photos?.[0] || null,
    chat_history: order.chatHistory || [],
    client_location: toSupabaseLocation(clientLocation),
    destination_location: toSupabaseLocation(destinationLocation),
    delivery_location: toSupabaseLocation(order.deliveryLocation),
    delivery_path: (order.locationHistory || []).map(toSupabaseLocation).filter(Boolean) as SupabaseLatLng[],
    target_delivery_id: order.targetDeliveryId,
    rejected_by: order.rejectedBy,
    created_at: order.createdAt,
  };
}

function rowToOrder(row: SupabaseOrderRow): Order {
  const clientLocation = fromSupabaseLocation(row.client_location);
  const destinationLocation = fromSupabaseLocation(row.destination_location) || clientLocation;
  const deliveryLocation = fromSupabaseLocation(row.delivery_location);
  const deliveryPath = (row.delivery_path || []).map(fromSupabaseLocation).filter(Boolean) as { lat: number; lng: number }[];
  const photos = [row.photo_url, row.payment_photo_url].filter(Boolean) as string[];

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name || undefined,
    clientPhone: row.client_phone || undefined,
    deliveryId: row.delivery_id || undefined,
    deliveryName: row.delivery_name || undefined,
    deliveryPhone: row.delivery_phone || undefined,
    type: categoryToType(row.category),
    description: row.description || '',
    location: {
      lat: destinationLocation?.lat || 0,
      lng: destinationLocation?.lng || 0,
      address: 'Destino de entrega',
    },
    clientLocation,
    destinationLocation: destinationLocation ? { ...destinationLocation, address: 'Destino de entrega' } : undefined,
    deliveryLocation,
    locationHistory: deliveryPath,
    status: row.status || OrderStatus.PENDING_PRICE,
    createdAt: row.created_at,
    productPrice: row.product_price ?? undefined,
    servicePrice: row.service_price ?? undefined,
    totalPrice: row.total_price ?? undefined,
    chatHistory: (row.chat_history || []) as Order['chatHistory'],
    photos,
    targetDeliveryId: row.target_delivery_id || undefined,
    rejectedBy: row.rejected_by || [],
  };
}

function userToRow(user: User): SupabaseUserRow {
  const dbRole = (user.role === UserRole.RESTAURANT || user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR) 
    ? UserRole.CLIENT 
    : user.role;

  // Almacenamos selfie e isVerified de forma segura dentro del objeto jsonb de location
  // para no requerir alterar la estructura de columnas de Supabase ni causar errores 400.
  const locationPayload = user.location ? {
    latitude: user.location.lat,
    longitude: user.location.lng,
    selfie: user.selfie || null,
    isVerified: user.isVerified ?? true
  } : {
    latitude: 0,
    longitude: 0,
    selfie: user.selfie || null,
    isVerified: user.isVerified ?? true
  };

  return {
    id: user.id,
    name: user.name,
    phone: user.phone || '',
    email: user.email || '',
    role: dbRole,
    location: locationPayload,
    online: user.role === UserRole.DELIVERY ? user.isOnline !== false : false,
    device_id: user.id,
  };
}

function rowToUser(row: SupabaseUserRow): User {
  let role = row.role;
  if (role === UserRole.CLIENT && row.email && row.email.endsWith('@rapidingo.com')) {
    const cleanEmail = row.email.trim().toLowerCase();
    if (cleanEmail.startsWith('admin')) {
      role = UserRole.ADMIN;
    } else if (cleanEmail.startsWith('operador') || cleanEmail.startsWith('operator')) {
      role = UserRole.OPERATOR;
    } else {
      role = UserRole.RESTAURANT;
    }
  }

  const locObj = row.location as any;
  const selfie = locObj?.selfie || undefined;
  const isVerified = locObj?.isVerified !== undefined ? Boolean(locObj.isVerified) : true;

  // Filtrar lat/lng 0 falsos creados para guardar metadata
  const location = (locObj?.latitude === 0 && locObj?.longitude === 0) 
    ? undefined 
    : fromSupabaseLocation(row.location as any);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    role: role,
    location: location,
    isOnline: Boolean(row.online),
    selfie: selfie,
    isVerified: isVerified,
  };
}

function orderToDeliveryReportRow(order: Order): SupabaseDeliveryReportRow | null {
  if (!order.deliveryId) return null;

  return {
    id: order.id,
    delivery_id: order.deliveryId,
    delivery_name: order.deliveryName || null,
    client_name: order.clientName || null,
    category: typeToCategory(order.type),
    description: order.description,
    status: OrderStatus.COMPLETED,
    product_price: order.productPrice ?? null,
    service_price: order.servicePrice ?? null,
    total_price: order.totalPrice ?? null,
    created_at: order.createdAt,
  };
}

export const SupabasePwaApi = {
  request,

  async upsertUser(user: User) {
    await request('/rest/v1/users?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(userToRow(user)),
    });
  },

  async getDeliveryUsers(): Promise<User[]> {
    const rows = await request<SupabaseUserRow[]>('/rest/v1/users?role=eq.DELIVERY&order=name.asc');
    return rows.map(rowToUser);
  },

  async getOnlineDeliveryUsers(): Promise<User[]> {
    if (cachedOnlineDeliveryUsers && Date.now() - cachedOnlineDeliveryUsers.fetchedAt < ONLINE_DELIVERY_USERS_CACHE_MS) {
      return cachedOnlineDeliveryUsers.value;
    }
    const rows = await request<SupabaseUserRow[]>('/rest/v1/users?role=eq.DELIVERY&online=eq.true&order=name.asc');
    const users = rows.map(rowToUser).filter((user) => user.location && (user.location.lat !== 0 || user.location.lng !== 0));
    cachedOnlineDeliveryUsers = { value: users, fetchedAt: Date.now() };
    return users;
  },

  async getUser(id: string): Promise<User | null> {
    const rows = await request<SupabaseUserRow[]>(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? rowToUser(rows[0]) : null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;
    const rows = await request<SupabaseUserRow[]>(`/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&limit=1`);
    return rows[0] ? rowToUser(rows[0]) : null;
  },

  async getOrders(): Promise<Order[]> {
    const rows = await request<SupabaseOrderRow[]>('/rest/v1/orders?order=created_at.desc');
    return rows.map(rowToOrder);
  },

  async getActiveDispatchOrders(limit = 300): Promise<Order[]> {
    const rows = await request<SupabaseOrderRow[]>(
      `/rest/v1/orders?status=not.in.(${OrderStatus.COMPLETED},${OrderStatus.CANCELLED})&order=created_at.desc&limit=${limit}`
    );
    return rows.map(rowToOrder);
  },

  async getActiveClientOrder(clientId: string): Promise<Order | null> {
    const rows = await request<SupabaseOrderRow[]>(
      `/rest/v1/orders?client_id=eq.${encodeURIComponent(clientId)}&status=not.in.(${OrderStatus.COMPLETED},${OrderStatus.CANCELLED})&order=created_at.desc&limit=1`
    );
    return rows[0] ? rowToOrder(rows[0]) : null;
  },

  async getActiveDeliveryOrder(deliveryId: string): Promise<Order | null> {
    const rows = await request<SupabaseOrderRow[]>(
      `/rest/v1/orders?delivery_id=eq.${encodeURIComponent(deliveryId)}&status=not.in.(${OrderStatus.COMPLETED},${OrderStatus.CANCELLED})&order=created_at.desc&limit=1`
    );
    return rows[0] ? rowToOrder(rows[0]) : null;
  },

  async getDeliveryQueue(deliveryId: string, dispatchMode: string, limit = 10): Promise<Order[]> {
    const targetFilter = dispatchMode === 'OPERATOR'
      ? `target_delivery_id=eq.${encodeURIComponent(deliveryId)}`
      : `or=(target_delivery_id.eq.${encodeURIComponent(deliveryId)},target_delivery_id.is.null)`;
    const rejectedFilter = `rejected_by=not.cs.${encodeURIComponent(JSON.stringify([deliveryId]))}`;
    try {
      const rows = await request<SupabaseOrderRow[]>(
        `/rest/v1/orders?status=eq.${OrderStatus.PENDING_PRICE}&${targetFilter}&${rejectedFilter}&order=created_at.asc&limit=${limit}`
      );
      return rows.map(rowToOrder);
    } catch (error) {
      console.warn('No se pudo filtrar rejected_by en Supabase. Filtrando cola localmente:', error);
      const rows = await request<SupabaseOrderRow[]>(
        `/rest/v1/orders?status=eq.${OrderStatus.PENDING_PRICE}&${targetFilter}&order=created_at.asc&limit=${limit * 3}`
      );
      return rows.map(rowToOrder).filter((order) => !order.rejectedBy?.includes(deliveryId)).slice(0, limit);
    }
  },

  async getActiveOrdersPage(limit = 100, offset = 0): Promise<Order[]> {
    const rows = await request<SupabaseOrderRow[]>(
      `/rest/v1/orders?status=not.in.(${OrderStatus.COMPLETED},${OrderStatus.CANCELLED})&order=created_at.asc&limit=${limit}&offset=${offset}`
    );
    return rows.map(rowToOrder);
  },

  async createOrder(order: Order, targetDeliveryId: string | null, clientUser: User) {
    await request('/rest/v1/orders?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        ...orderToRow(order, clientUser),
        target_delivery_id: targetDeliveryId,
      }),
    });
  },

  async setUserOnline(userId: string, isOnline: boolean) {
    await request(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ online: isOnline }),
    });
  },

  async updateOrder(order: Order, clientUser?: User | null, deliveryUser?: User | null) {
    await request(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(orderToRow(order, clientUser, deliveryUser)),
    });
  },

  async claimOrderForPricing(order: Order, deliveryUser: User): Promise<Order | null> {
    const rows = await request<SupabaseOrderRow[]>(
      `/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}&status=eq.${OrderStatus.PENDING_PRICE}&delivery_id=is.null&or=(target_delivery_id.is.null,target_delivery_id.eq.${encodeURIComponent(deliveryUser.id)})`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(orderToRow({
          ...order,
          deliveryId: deliveryUser.id,
          deliveryName: deliveryUser.name,
          deliveryPhone: deliveryUser.phone,
        }, null, deliveryUser)),
      }
    );

    return rows[0] ? rowToOrder(rows[0]) : null;
  },

  async reassignOrderAfterRejection(order: Order, rejectedDeliveryId: string, nextDelivery: User | null) {
    const rejectedBy = Array.from(new Set([...(order.rejectedBy || []), rejectedDeliveryId]));
    await request(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        rejected_by: rejectedBy,
        target_delivery_id: nextDelivery?.id || null,
        delivery_id: null,
        delivery_name: nextDelivery?.name || null,
        delivery_phone: nextDelivery?.phone || null,
        delivery_location: null,
        delivery_path: [],
        status: OrderStatus.PENDING_PRICE,
      }),
    });
  },

  async finalizeCompletedOrder(order: Order, clientUser?: User | null, deliveryUser?: User | null) {
    const cleanOrder = { ...order, status: OrderStatus.COMPLETED, chatHistory: [] };

    await request(`/rest/v1/orders?id=eq.${encodeURIComponent(cleanOrder.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(orderToRow(cleanOrder, clientUser, deliveryUser)),
    });

    const report = orderToDeliveryReportRow(cleanOrder);
    if (report) {
      await request('/rest/v1/delivery_reports?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(report),
      });
    }

    await request(`/rest/v1/orders?id=eq.${encodeURIComponent(cleanOrder.id)}`, {
      method: 'DELETE',
    });
  },

  async getDispatchMode(): Promise<string> {
    try {
      const rows = await request<{ key: string; value: string }[]>('/rest/v1/settings?key=eq.dispatch_mode&limit=1');
      const value = rows[0]?.value || 'AUTOMATIC';
      cachedDispatchMode = { value, fetchedAt: Date.now() };
      return value;
    } catch (error) {
      console.warn('No se pudo leer settings de Supabase. Usando local:', error);
      return localStorage.getItem('rapidEnvios_fallback_dispatch_mode') || 'AUTOMATIC';
    }
  },

  async getDispatchModeCached(): Promise<string> {
    if (cachedDispatchMode && Date.now() - cachedDispatchMode.fetchedAt < DISPATCH_MODE_CACHE_MS) {
      return cachedDispatchMode.value;
    }
    return this.getDispatchMode();
  },

  async setDispatchMode(mode: string): Promise<void> {
    try {
      await request('/rest/v1/settings?key=eq.dispatch_mode', {
        method: 'PATCH',
        body: JSON.stringify({ value: mode }),
      });
      cachedDispatchMode = { value: mode, fetchedAt: Date.now() };
    } catch (error) {
      console.error('No se pudo guardar settings en Supabase:', error);
      localStorage.setItem('rapidEnvios_fallback_dispatch_mode', mode);
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const rows = await request<SupabaseUserRow[]>('/rest/v1/users?order=name.asc');
      return rows.map(rowToUser);
    } catch (error) {
      console.error('Error al obtener todos los usuarios:', error);
      return [];
    }
  },
};
