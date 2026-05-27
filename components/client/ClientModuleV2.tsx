import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderType, OrderStatus, Order, ChatMessage, getOrderStatusLabel } from '../../types';
import { ORDER_TYPES } from '../../constants';
import MapPlaceholder from '../shared/MapPlaceholder';
import { 
  Send, 
  LogOut, ShoppingBag, MapPin, MessageCircle, Clock, 
  User as UserIcon, Home, ChevronRight, X, PhoneCall, Bike, Truck,
  Star, Plus, Minus, Trash2, ReceiptText, Store, Maximize2, ZoomIn, ZoomOut,
  Search, Map as MapIcon, Satellite
} from 'lucide-react';

const CLIENT_CATEGORY_CONFIG: Record<OrderType, { img: string, bg: string, color: string }> = {
  [OrderType.RESTAURANT]: { img: 'assets/client/restaurant.png', bg: 'bg-brand-yellow/10', color: 'text-brand-black' },
  [OrderType.PHARMACY]: { img: 'assets/client/pharmacy.png', bg: 'bg-brand-yellow/10', color: 'text-brand-black' },
  [OrderType.OTHER]: { img: 'assets/client/other.png', bg: 'bg-brand-surface-gray/30', color: 'text-brand-black' },
  [OrderType.SUPERMARKET]: { img: 'assets/client/other.png', bg: 'bg-emerald-50', color: 'text-emerald-700' }
};

type RestaurantPartner = {
  id: string;
  name: string;
  category: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  phone: string;
  address: string;
  schedule: string;
  logoUrl: string;
  color: string;
};

type TempRestaurantItem = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  productName: string;
  quantity: number;
  menuImageUrl?: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantSchedule?: string;
  source?: 'menu' | 'manual';
};

type MenuDraftRow = {
  id: string;
  productName: string;
  quantity: number;
};

const createMenuDraftRow = (): MenuDraftRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  productName: '',
  quantity: 1
});

const RESTAURANT_PARTNERS: RestaurantPartner[] = [
  {
    id: 'wings_drinks',
    name: 'Wings & Drinks',
    category: 'COMIDA RAPIDA',
    rating: 4.6,
    deliveryTime: '25-35 min',
    deliveryFee: 5,
    minOrder: 20,
    phone: '74721716',
    address: 'Trinidad Centro',
    schedule: 'Lun-Dom: 12:00 - 22:00',
    logoUrl: 'assets/restaurants/wings_drinks.jpg',
    color: '#FFC107'
  },
  {
    id: 'el_brete',
    name: 'El Brete Churrasqueria',
    category: 'PARRILLA',
    rating: 4.8,
    deliveryTime: '35-45 min',
    deliveryFee: 7,
    minOrder: 50,
    phone: '69376937',
    address: 'C/ Macheteros #284',
    schedule: 'Lun-Dom: 12:00 - 23:00',
    logoUrl: 'assets/restaurants/el_brete.jpg',
    color: '#FFC107'
  },
  {
    id: 'la_toscana_1',
    name: 'La Toscana Centro',
    category: 'RESTAURANTE',
    rating: 4.7,
    deliveryTime: '30-40 min',
    deliveryFee: 6,
    minOrder: 20,
    phone: '73939626',
    address: 'Calle La Paz esq. 18 de Noviembre',
    schedule: 'Lun-Dom: 11:30 - 22:00',
    logoUrl: 'assets/restaurants/la_toscana.jpg',
    color: '#FFC107'
  },
  {
    id: 'la_toscana_2',
    name: 'La Toscana - Tablitas',
    category: 'PARRILLA',
    rating: 4.7,
    deliveryTime: '30-40 min',
    deliveryFee: 6,
    minOrder: 55,
    phone: '73939626',
    address: 'Calle La Paz esq. 18 de Noviembre',
    schedule: 'Lun-Dom: 11:30 - 22:00',
    logoUrl: 'assets/restaurants/la_toscana1.jpg',
    color: '#FFC107'
  },
  {
    id: 'la_toscana_rapido',
    name: 'La Toscana - Rapido',
    category: 'COMIDA RAPIDA',
    rating: 4.6,
    deliveryTime: '25-35 min',
    deliveryFee: 6,
    minOrder: 20,
    phone: '73939626',
    address: 'Calle La Paz esq. 18 de Noviembre',
    schedule: 'Lun-Dom: 11:30 - 22:00',
    logoUrl: 'assets/restaurants/la_toscana2.jpg',
    color: '#FFC107'
  },
  {
    id: 'la_plazuela',
    name: 'La Plazuela J&C',
    category: 'RESTAURANTE',
    rating: 4.5,
    deliveryTime: '30-40 min',
    deliveryFee: 6,
    minOrder: 18,
    phone: '73900041',
    address: 'Calle 9 de Abril, diagonal parroquia Fatima',
    schedule: 'Lun-Dom: 12:00 - 22:00',
    logoUrl: 'assets/restaurants/la_plazuela.jpg',
    color: '#FFC107'
  },
  {
    id: 'la_coqueta',
    name: 'La Coqueta',
    category: 'HAMBURGUESAS',
    rating: 4.5,
    deliveryTime: '25-35 min',
    deliveryFee: 5,
    minOrder: 15,
    phone: '72845195',
    address: 'Calle Sucre esquina 9 de Abril',
    schedule: 'Mar-Dom: 19:00 - 23:00',
    logoUrl: 'assets/restaurants/la_coqueta.jpg',
    color: '#FFC107'
  },
  {
    id: 'mr_grill',
    name: 'Mr. Grill',
    category: 'HAMBURGUESAS',
    rating: 4.8,
    deliveryTime: '20-30 min',
    deliveryFee: 0,
    minOrder: 20,
    phone: '77848655',
    address: 'Calle Santa Cruz esq. Av. del Mar',
    schedule: 'Lun-Dom: 12:00 - 23:00',
    logoUrl: 'assets/restaurants/mr_grill.jpg',
    color: '#FFC107'
  },
  {
    id: 'el_benianito',
    name: 'Restaurante El Benianito',
    category: 'RESTAURANTE',
    rating: 4.3,
    deliveryTime: '30-40 min',
    deliveryFee: 7,
    minOrder: 22,
    phone: '72815881',
    address: 'Av. del Mar frente a la Plaza Ganadera',
    schedule: '19:00 - 12:30',
    logoUrl: 'assets/restaurants/el_benianito.jpg',
    color: '#FFC107'
  },
  {
    id: 'toby',
    name: 'Toby - Cuarto de Libra',
    category: 'HAMBURGUESAS',
    rating: 4.4,
    deliveryTime: '20-30 min',
    deliveryFee: 5,
    minOrder: 27,
    phone: '67270686',
    address: 'Trinidad Centro',
    schedule: 'Lun-Dom: 12:00 - 22:00',
    logoUrl: 'assets/restaurants/toby.jpg',
    color: '#FFC107'
  }
];

const RESTAURANT_FILTERS = ['TODOS', 'HAMBURGUESAS', 'PARRILLA', 'COMIDA RAPIDA', 'RESTAURANTE'];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getDeviceRestaurantZoom = () => {
  if (typeof window === 'undefined') return 1;
  return 1;
};

const buildRestaurantOrderDescription = (items: TempRestaurantItem[], dispatchMode: string) => {
  const groups = items.reduce<Record<string, TempRestaurantItem[]>>((acc, item) => {
    acc[item.restaurantName] = [...(acc[item.restaurantName] || []), item];
    return acc;
  }, {});

  return [
    'PEDIDO DE COMIDA PARA COTIZAR',
    ...Object.entries(groups)
    .map(([restaurantName, restaurantItems]) => {
      const restaurantInfo = restaurantItems[0];
      const products = restaurantItems
        .map((item) => `- ${item.productName} x${item.quantity}`)
        .join('\n');
      return [
        `RESTAURANTE: ${restaurantName}`,
        products
      ].filter(Boolean).join('\n');
    }),
    `TOTAL PLATOS: ${items.reduce((sum, item) => sum + item.quantity, 0)}`,
    dispatchMode === 'OPERATOR'
      ? 'Cliente espera cotizacion de la operadora.'
      : 'Cliente espera cotizacion del delivery.'
  ].join('\n\n');
};

const groupRestaurantItems = (items: TempRestaurantItem[]) => items.reduce<Record<string, TempRestaurantItem[]>>((acc, item) => {
  acc[item.restaurantName] = [...(acc[item.restaurantName] || []), item];
  return acc;
}, {});

const hasWhatsAppPhone = (phone?: string) => /\d/.test(phone || '');

const openWhatsAppMessage = (phone: string | undefined, message: string) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    alert('No hay numero de WhatsApp registrado');
    return;
  }
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
};

const getRestaurantStatusMessages = (order: Order) => {
  const accepted: string[] = [];
  const ready: string[] = [];

  (order.chatHistory || []).forEach((msg) => {
    if (msg.text.startsWith('RESTAURANT_STATUS:')) {
      const parts = msg.text.split(':');
      if (parts[2] === 'ACCEPTED') accepted.push(`${parts[3] || '15'} min`);
      if (parts[2] === 'READY') ready.push('listo');
    }
  });

  return { accepted, ready };
};

const hasSystemMessage = (order: Order, marker: string) =>
  (order.chatHistory || []).some((msg) => msg.text === marker || msg.text.startsWith(marker));

const getClientPersistentStatus = (order: Order, dispatchMode: string) => {
  const isRestaurantOrder = order.type === OrderType.RESTAURANT ||
    order.category === 'COMIDA' ||
    order.description.toUpperCase().includes('RESTAURANTE:');
  const restaurant = getRestaurantStatusMessages(order);

  if (order.status === OrderStatus.PENDING_PRICE) {
    return dispatchMode === 'OPERATOR'
      ? 'Pedido recibido por Operadora. En breve enviara la cotizacion.'
      : 'Pedido recibido. Buscando delivery para cotizar.';
  }
  if (order.status === OrderStatus.WAITING_CONFIRM) return 'Cotizacion lista. Confirma para continuar.';
  if (order.status === OrderStatus.CONFIRMED_BY_CLIENT) {
    return isRestaurantOrder
      ? 'Pedido confirmado. Operadora coordinara con el restaurante.'
      : 'Pedido confirmado. Coordinando delivery.';
  }
  if (order.status === OrderStatus.PICKING_UP) {
    if (isRestaurantOrder) {
      if (restaurant.ready.length > 0) return 'Restaurante marco tu pedido listo para recojo.';
      if (order.deliveryName && restaurant.accepted.length > 0) return `Delivery asignado. Restaurante preparando: ${restaurant.accepted.join(' / ')}.`;
      if (restaurant.accepted.length > 0) return `Restaurante preparando. Tiempo estimado: ${restaurant.accepted.join(' / ')}.`;
      if (hasSystemMessage(order, 'OPERATOR_RESTAURANT_REQUEST')) return 'Pedido enviado al restaurante. Esperando tiempo de preparacion.';
      return order.deliveryName ? 'Delivery asignado. Recogera tu pedido en restaurante.' : 'Coordinando restaurante.';
    }
    return 'Delivery gestionando tu pedido.';
  }
  if (order.status === OrderStatus.IN_DELIVERY) return 'Delivery recogio tu pedido. Seguimiento activado hacia tu destino.';
  if (order.status === OrderStatus.DELIVERED_BY_REPARTIDOR) return 'Delivery llego a tu destino.';
  if (order.status === OrderStatus.COMPLETED) return 'Pedido completado. Gracias por tu confianza.';
  if (order.status === OrderStatus.CANCELLED) return 'Pedido cancelado.';
  return getOrderStatusLabel(order.status);
};

type DeliveryPoint = {
  lat: number;
  lng: number;
  address?: string;
};

const DEFAULT_DELIVERY_POINT: DeliveryPoint = {
  lat: -14.8336,
  lng: -64.9000,
  address: 'Destino de entrega'
};

const getCurrentDeliveryPoint = (): Promise<DeliveryPoint> => new Promise((resolve) => {
  if (!('geolocation' in navigator)) {
    resolve(DEFAULT_DELIVERY_POINT);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      address: 'Mi ubicacion actual'
    }),
    () => resolve(DEFAULT_DELIVERY_POINT),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
});

const MAPTILER_KEY = '3cP8iNk1Zj2ghLvTv5eB';

const DestinationPickerModal: React.FC<{
  initialPoint: DeliveryPoint;
  isAlternative: boolean;
  onCancel: () => void;
  onConfirm: (point: DeliveryPoint) => void;
}> = ({ initialPoint, isAlternative, onCancel, onConfirm }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [point, setPoint] = useState<DeliveryPoint>(initialPoint);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    setPoint(initialPoint);
  }, [initialPoint.lat, initialPoint.lng]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // Proximity centrado en Trinidad, Bolivia (-14.83, -64.90)
      const resp = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&proximity=-64.90,-14.83&language=es&bbox=-64.95,-14.87,-64.85,-14.79`
      );
      if (!resp.ok) {
        setSuggestions([]);
        return;
      }
      const data = await resp.json();
      setSuggestions(data.features || []);
    } catch (err) {
      console.error('Error buscando direccion:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (feature: any) => {
    const [lng, lat] = feature.center;
    const nextPoint = {
      lat,
      lng,
      address: feature.place_name
    };
    setPoint(nextPoint);
    if (mapInstance.current) {
      mapInstance.current.easeTo({ center: [lng, lat], zoom: 17, pitch: 58, bearing: -18 });
    }
    if (markerInstance.current) {
      markerInstance.current.setLngLat([lng, lat]);
    }
    setSuggestions([]);
    setSearchQuery('');
  };

  useEffect(() => {
    const maplibregl = (window as Window & { maplibregl?: any }).maplibregl;
    if (!mapRef.current || !maplibregl) return;

    // Salvaguarda de coordenadas iniciales en Trinidad si el GPS devolvió 0 o valores nulos
    const startLng = initialPoint.lng && initialPoint.lng !== 0 ? initialPoint.lng : DEFAULT_DELIVERY_POINT.lng;
    const startLat = initialPoint.lat && initialPoint.lat !== 0 ? initialPoint.lat : DEFAULT_DELIVERY_POINT.lat;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: isSatellite 
        ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
        : 'https://tiles.openfreemap.org/styles/bright',
      center: [startLng, startLat],
      zoom: 17,
      pitch: 58,
      bearing: -18,
      attributionControl: false
    });
    mapInstance.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    const markerEl = document.createElement('div');
    markerEl.className = 'h-10 w-10 rounded-full bg-brand-yellow border-2 border-white shadow-2xl flex items-center justify-center';
    markerEl.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
    const marker = new maplibregl.Marker({ element: markerEl, draggable: true, anchor: 'bottom' })
      .setLngLat([startLng, startLat])
      .addTo(map);
    markerInstance.current = marker;

    const updatePoint = (lat: number, lng: number) => {
      const nextPoint = {
        lat,
        lng,
        address: isAlternative ? 'Otra ubicacion de entrega' : 'Mi ubicacion actual'
      };
      setPoint(nextPoint);
      marker.setLngLat([lng, lat]);
    };

    marker.on('dragend', () => {
      const next = marker.getLngLat();
      updatePoint(next.lat, next.lng);
    });

    map.on('click', (event: any) => {
      updatePoint(event.lngLat.lat, event.lngLat.lng);
    });

    // ResizeObserver para redimensionar el mapa a medida que se anima el modal
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, [initialPoint.lat, initialPoint.lng, isAlternative, isSatellite]);

  return (
    <div className="absolute inset-0 z-[80] bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[90vh] border border-brand-surface-gray relative text-brand-black">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-yellow"></div>

        <div className="p-5 border-b border-brand-surface-gray flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[2px] font-poppins">Destino de entrega</p>
            <h3 className="text-xl font-black text-brand-black font-poppins tracking-tight uppercase">
              Mueve el mapa
            </h3>
          </div>
          <button onClick={onCancel} className="p-2.5 rounded-xl bg-brand-bg-light text-brand-black active:scale-90 transition-transform border border-brand-surface-gray">
            <X size={18} />
          </button>
        </div>

        {/* Buscador MapTiler */}
        <div className="px-5 py-4 bg-brand-bg-light border-b border-brand-surface-gray relative z-[90] shrink-0">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-yellow">
              {isSearching ? <div className="w-4 h-4 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" /> : <Search size={16} />}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ej: Hospital Obrero, Plaza Principal..."
              className="w-full pl-11 pr-4 py-3 bg-brand-white border-2 border-brand-surface-gray rounded-2xl text-sm font-bold text-brand-black focus:border-brand-yellow outline-none transition-all font-inter placeholder:text-brand-gray-medium shadow-sm"
            />
          </div>

          {suggestions.length > 0 && (
            <div className="absolute left-5 right-5 mt-2 bg-brand-white border border-brand-surface-gray rounded-2xl shadow-xl overflow-hidden overflow-y-auto max-h-48 z-[100]">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-5 py-4 text-[11px] font-bold text-brand-black hover:bg-brand-bg-light border-b border-brand-surface-gray last:border-0 flex items-start gap-3 transition-colors group"
                >
                  <MapPin size={14} className="text-brand-yellow shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="font-inter uppercase tracking-tight leading-snug">{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[300px] bg-brand-bg-light relative">
          <div ref={mapRef} className="absolute inset-0" />

          {/* Botón Vista Satelital */}
          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className="absolute top-4 right-4 z-[10] p-3 bg-brand-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-brand-surface-gray text-brand-black active:scale-90 transition-all hover:bg-brand-white"
            title="Cambiar vista"
          >
            {isSatellite ? <MapIcon size={22} /> : <Satellite size={22} />}
          </button>

          <div className="absolute left-4 bottom-4 right-4 bg-brand-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg text-[9px] font-bold text-brand-black border border-brand-surface-gray z-[10] font-inter uppercase tracking-[1px]">
            Coordenadas: {point.lat.toFixed(5)} / {point.lng.toFixed(5)}
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4 shrink-0 bg-brand-white border-t border-brand-surface-gray">
          <button onClick={onCancel} className="bg-brand-bg-light hover:bg-brand-surface-gray/50 text-brand-black py-4 rounded-2xl font-bold text-xs uppercase tracking-[1px] font-poppins border border-brand-surface-gray active:scale-95 transition-all">
            CANCELAR
          </button>
          <button onClick={() => onConfirm(point)} className="bg-brand-yellow hover:bg-brand-yellow/90 text-brand-black py-4 rounded-2xl font-bold text-xs uppercase tracking-[1px] font-poppins shadow-md active:scale-95 transition-all">
            CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
};

const RestaurantOrderBuilder: React.FC<{
  items: TempRestaurantItem[];
  onAddItem: (restaurant: RestaurantPartner, productName: string, quantity: number) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenRestaurantMenu: (restaurant: RestaurantPartner) => void;
}> = ({ items, onAddItem, onUpdateQuantity, onRemoveItem, onOpenRestaurantMenu }) => {
  const [activeFilter, setActiveFilter] = useState('TODOS');
  const [activeRestaurantId, setActiveRestaurantId] = useState(RESTAURANT_PARTNERS[0]?.id || '');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const lastTapRef = useRef(0);

  const filteredRestaurants = activeFilter === 'TODOS'
    ? RESTAURANT_PARTNERS
    : RESTAURANT_PARTNERS.filter((restaurant) => restaurant.category === activeFilter);
  const activeRestaurant =
    RESTAURANT_PARTNERS.find((restaurant) => restaurant.id === activeRestaurantId) ||
    filteredRestaurants[0] ||
    RESTAURANT_PARTNERS[0];
  const activeRestaurantItems = activeRestaurant
    ? items.filter((item) => item.restaurantId === activeRestaurant.id)
    : [];
  const groupedItems = groupRestaurantItems(items);

  const addCurrentItem = () => {
    if (!activeRestaurant || !productName.trim()) return;
    onAddItem(activeRestaurant, productName, quantity);
    setProductName('');
    setQuantity(1);
  };

  const handleRestaurantPointerUp = (restaurant: RestaurantPartner, event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch') return;
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      setActiveRestaurantId(restaurant.id);
      onOpenRestaurantMenu(restaurant);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <div className="space-y-4">
      <div className="bg-brand-white rounded-[22px] border border-brand-surface-gray shadow-sm p-4 space-y-3 text-brand-black">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[2px] text-brand-yellow font-poppins font-bold">COMIDA</p>
            <h3 className="text-xl font-black text-brand-black font-poppins tracking-tight uppercase">Doble clic en la tarjeta para pedir</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-brand-yellow text-brand-black flex items-center justify-center shrink-0 shadow-sm border border-brand-surface-gray">
            <Store size={20} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {RESTAURANT_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setActiveFilter(filter);
                const firstMatch = filter === 'TODOS'
                  ? RESTAURANT_PARTNERS[0]
                  : RESTAURANT_PARTNERS.find((restaurant) => restaurant.category === filter);
                if (firstMatch) setActiveRestaurantId(firstMatch.id);
              }}
              className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold border transition-all font-poppins uppercase tracking-wider ${
                activeFilter === filter
                  ? 'bg-brand-yellow text-brand-black border-brand-yellow shadow-sm'
                  : 'bg-brand-bg-light text-brand-gray-medium border-brand-surface-gray'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        {filteredRestaurants.map((restaurant) => {
          const selected = restaurant.id === activeRestaurant?.id;
          return (
            <button
              key={restaurant.id}
              type="button"
              onClick={() => setActiveRestaurantId(restaurant.id)}
              onDoubleClick={(event) => {
                event.preventDefault();
                setActiveRestaurantId(restaurant.id);
                onOpenRestaurantMenu(restaurant);
              }}
              onPointerUp={(event) => handleRestaurantPointerUp(restaurant, event)}
              className={`shrink-0 w-72 overflow-hidden rounded-[24px] border bg-brand-white text-left shadow-md active:scale-[0.98] transition-all relative group ${
                selected ? 'border-brand-yellow ring-2 ring-brand-yellow/30' : 'border-brand-surface-gray'
              }`}
            >
              <div
                className="relative h-36 bg-brand-bg-light"
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveRestaurantId(restaurant.id);
                  onOpenRestaurantMenu(restaurant);
                }}
              >
                <img src={restaurant.logoUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/70 via-brand-black/10 to-transparent" />

                <div className="absolute right-3 top-3 px-2 py-1 rounded-lg bg-brand-black/60 backdrop-blur-sm text-brand-yellow flex items-center gap-1 border border-white/10 shadow-lg">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold font-poppins tracking-wider uppercase">{restaurant.deliveryTime}</span>
                </div>

                <div className="absolute left-3 right-3 bottom-3">
                  <p className="text-white text-xl font-bold leading-tight line-clamp-1 font-poppins uppercase">{restaurant.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-brand-yellow/95 text-[10px] font-bold font-poppins uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md border border-white/5"><Star size={11} fill="currentColor" /> {restaurant.rating}</span>
                    <span className="bg-brand-yellow text-brand-black px-2 py-0.5 rounded-md border border-brand-yellow/20">Bs. {restaurant.deliveryFee} ENVÍO</span>
                  </div>
                </div>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-brand-bg-light text-brand-black border border-brand-surface-gray font-poppins uppercase tracking-wider">{restaurant.category}</span>
                  <span className="text-[10px] font-bold text-amber-600 font-poppins uppercase tracking-wider">Min. Bs. {restaurant.minOrder}</span>
                </div>
                <p className="text-[11px] text-brand-gray-medium font-medium leading-tight line-clamp-1 border-t border-brand-surface-gray pt-2">{restaurant.address.toUpperCase()}</p>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div className="bg-brand-yellow text-brand-black px-4 py-2 rounded-full font-bold font-poppins text-xs uppercase shadow-lg flex items-center gap-2">
                    <Maximize2 size={14} /> PEDIR MENÚ
                 </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeRestaurant && activeRestaurantItems.length > 0 && (
        <div className="bg-brand-white rounded-[22px] border border-brand-surface-gray shadow-md p-5 space-y-4 relative overflow-hidden text-brand-black">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-yellow/10 rounded-full -mr-8 -mt-8"></div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm border border-brand-surface-gray" style={{ backgroundColor: activeRestaurant.color }}>
              <ShoppingBag size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[2px] text-brand-yellow font-poppins font-bold">RESERVA DE MENU</p>
              <h3 className="text-lg font-black text-brand-black font-poppins truncate uppercase tracking-tight">{activeRestaurant.name}</h3>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value.toUpperCase())}
              onKeyDown={(event) => event.key === 'Enter' && addCurrentItem()}
              placeholder="¿QUÉ VAS A PEDIR?"
              className="min-w-0 rounded-2xl border-2 border-brand-surface-gray bg-brand-bg-light px-4 py-3.5 font-bold text-sm text-brand-black placeholder:text-brand-gray-medium outline-none focus:border-brand-yellow focus:ring-4 focus:ring-brand-yellow/10 font-inter"
            />
            <div className="flex items-center rounded-2xl border-2 border-brand-surface-gray bg-brand-bg-light overflow-hidden">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 text-brand-black hover:text-brand-yellow">
                <Minus size={18} />
              </button>
              <span className="w-8 text-center font-bold text-brand-black font-poppins">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-3 text-brand-black hover:text-brand-yellow">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={addCurrentItem}
            disabled={!productName.trim()}
            className="w-full bg-brand-bg-light border border-brand-surface-gray text-brand-black py-4 rounded-2xl font-bold font-poppins text-sm uppercase tracking-[1px] disabled:opacity-30 disabled:border-brand-surface-gray/55 flex items-center justify-center gap-2 active:bg-brand-surface-gray/50 transition-all cursor-pointer"
          >
            <Plus size={18} /> AÑADIR OTRA FILA
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-brand-white rounded-[22px] border border-brand-surface-gray shadow-md p-5 space-y-4 relative text-brand-black">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[2px] text-brand-yellow font-poppins font-bold">RESUMEN DE PEDIDO</p>
              <h3 className="text-xl font-black text-brand-black font-poppins uppercase tracking-tight">{items.reduce((sum, item) => sum + item.quantity, 0)} productos en tu lista</h3>
            </div>
            <ReceiptText className="text-brand-black" size={28} />
          </div>

          <div className="space-y-4">
            {Object.entries(groupedItems).map(([restaurantName, restaurantItems]) => {
              return (
              <div key={restaurantName} className="rounded-2xl bg-brand-bg-light border border-brand-surface-gray p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-brand-surface-gray pb-2">
                  <p className="font-bold text-xs text-brand-black font-poppins uppercase tracking-wider">{restaurantName.toUpperCase()}</p>
                </div>
                <div className="space-y-2">
                  {restaurantItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-brand-white rounded-xl p-3 border border-brand-surface-gray group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-brand-black font-poppins truncate uppercase tracking-tight">{item.productName}</p>
                        <p className="text-[10px] font-medium text-brand-gray-medium font-inter uppercase tracking-wider">Cantidad: {item.quantity} Unidad{item.quantity === 1 ? '' : 'es'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-2 rounded-lg bg-brand-bg-light text-brand-black hover:bg-brand-surface-gray transition-colors">
                          <Minus size={14} />
                        </button>
                        <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-2 rounded-lg bg-brand-bg-light text-brand-black hover:bg-brand-surface-gray transition-colors">
                          <Plus size={14} />
                        </button>
                        <button type="button" onClick={() => onRemoveItem(item.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );})}
          </div>
        </div>
      )}
    </div>
  );
};

interface ClientModuleProps {
    onClose: () => void;
}

export const ClientModuleV2: React.FC<ClientModuleProps> = ({ onClose }) => {
  const { clientUser, activeOrder, createOrder, updateOrder, logout, pastOrders, addChatMessage, assignedDelivery, availableDeliveries, updateCurrentUserPhone, dispatchMode } = useApp();
  const [activeTab, setActiveTab] = useState<'HOME' | 'HISTORY' | 'PROFILE'>('HOME');
  const [view, setView] = useState<'MENU' | 'FORM' | 'TRACKING'>('MENU');
  const [selectedType, setSelectedType] = useState<OrderType | null>(null);
  const [orderText, setOrderText] = useState('');
  const [restaurantItems, setRestaurantItems] = useState<TempRestaurantItem[]>([]);
  const [expandedRestaurant, setExpandedRestaurant] = useState<RestaurantPartner | null>(null);
  const [menuZoom, setMenuZoom] = useState(1);
  const [menuZoomByRestaurant, setMenuZoomByRestaurant] = useState<Record<string, number>>({});
  const [menuDraftRows, setMenuDraftRows] = useState<MenuDraftRow[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showTypingWarning, setShowTypingWarning] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showPriceOfferModal, setShowPriceOfferModal] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [sendToOtherLocation, setSendToOtherLocation] = useState(false);
  const [isDestinationConfirmed, setIsDestinationConfirmed] = useState(false);
  const [destinationPoint, setDestinationPoint] = useState<DeliveryPoint | null>(null);
  const [pickerInitialPoint, setPickerInitialPoint] = useState<DeliveryPoint>(DEFAULT_DELIVERY_POINT);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [showLocationConfirmModal, setShowLocationConfirmModal] = useState(false);
  const [isLocationConfirmedByUser, setIsLocationConfirmedByUser] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastMenuPinchDistanceRef = useRef<number | null>(null);
  
  const [message, setMessage] = useState<string | null>(null);
  const [completedTimerActive, setCompletedTimerActive] = useState(false);
  const persistentStatus = activeOrder ? getClientPersistentStatus(activeOrder, dispatchMode) : '';
  const [statusFlashKey, setStatusFlashKey] = useState(0);

  const openDestinationPicker = async (isAlternative: boolean) => {
    const point = destinationPoint || await getCurrentDeliveryPoint();
    setPickerInitialPoint({
      ...point,
      address: isAlternative ? 'Otra ubicacion de entrega' : 'Mi ubicacion actual'
    });
    setShowDestinationPicker(true);
  };

  useEffect(() => {
    if (activeOrder) setView('TRACKING');
    else {
      setView('MENU');
      setSendToOtherLocation(false);
      setIsDestinationConfirmed(false);
      setDestinationPoint(null);
      setRestaurantItems([]);
      setIsLocationConfirmedByUser(false);
    }
  }, [activeOrder]);

  // Cierre de sesión automático tras 3 minutos de completar el pedido
  useEffect(() => {
    if (activeOrder) {
      setCompletedTimerActive(false);
    } else if (!activeOrder && completedTimerActive) {
      const timer = setTimeout(() => {
        closeClientApp();
      }, 3 * 60 * 1000); // 3 minutos
      
      return () => clearTimeout(timer);
    }
  }, [activeOrder, completedTimerActive]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeOrder?.chatHistory, isChatOpen]);

  useEffect(() => {
    if (persistentStatus) setStatusFlashKey((current) => current + 1);
  }, [persistentStatus]);

  useEffect(() => {
    if (!activeOrder || activeOrder.status !== OrderStatus.WAITING_CONFIRM) {
      setShowPriceOfferModal(false);
      return;
    }

    const offerKey = `rapidEnvios_seenOffer_${activeOrder.id}`;
    if (!localStorage.getItem(offerKey)) {
      localStorage.setItem(offerKey, '1');
      setShowPriceOfferModal(true);
    }
  }, [activeOrder?.id, activeOrder?.status]);

  const addRestaurantItem = (restaurant: RestaurantPartner, productName: string, quantity: number) => {
    const normalizedProductName = productName.trim().toUpperCase();
    if (!normalizedProductName || quantity < 1) return;
    setRestaurantItems((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        productName: normalizedProductName,
        quantity,
        restaurantPhone: restaurant.phone,
        restaurantAddress: restaurant.address,
        restaurantSchedule: restaurant.schedule,
        source: 'manual'
      }
    ]);
  };

  const updateRestaurantItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      setRestaurantItems((current) => current.filter((item) => item.id !== itemId));
      return;
    }
    setRestaurantItems((current) => current.map((item) => (
      item.id === itemId ? { ...item, quantity } : item
    )));
  };

  const removeRestaurantItem = (itemId: string) => {
    setRestaurantItems((current) => current.filter((item) => item.id !== itemId));
  };

  const openRestaurantMenu = (restaurant: RestaurantPartner) => {
    const currentMenuItems = restaurantItems.filter((item) => (
      item.restaurantId === restaurant.id && item.source === 'menu'
    ));
    setExpandedRestaurant(restaurant);
    setMenuZoom(menuZoomByRestaurant[restaurant.id] || getDeviceRestaurantZoom());
    setMenuDraftRows(currentMenuItems.length > 0
      ? currentMenuItems.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity
      }))
      : [createMenuDraftRow()]
    );
    lastMenuPinchDistanceRef.current = null;
  };

  const updateMenuZoom = (nextZoom: number | ((currentZoom: number) => number)) => {
    setMenuZoom((currentZoom) => clamp(
      typeof nextZoom === 'function' ? nextZoom(currentZoom) : nextZoom,
      1,
      3
    ));
  };

  useEffect(() => {
    if (!expandedRestaurant) return;
    setMenuZoomByRestaurant((current) => ({
      ...current,
      [expandedRestaurant.id]: menuZoom
    }));
  }, [expandedRestaurant?.id, menuZoom]);

  const reserveExpandedRestaurantMenu = () => {
    if (!expandedRestaurant) return;
    const selectedItems = menuDraftRows
      .map((item) => ({
        ...item,
        productName: item.productName.trim().toUpperCase(),
        quantity: Math.max(1, item.quantity)
      }))
      .filter((item) => item.productName.length > 1);

    if (selectedItems.length > 0) {
      setRestaurantItems((current) => [
        ...current,
        ...selectedItems.map((item) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          restaurantId: expandedRestaurant.id,
          restaurantName: expandedRestaurant.name,
          productName: item.productName,
          quantity: item.quantity,
          menuImageUrl: expandedRestaurant.logoUrl,
          restaurantPhone: expandedRestaurant.phone,
          restaurantAddress: expandedRestaurant.address,
          restaurantSchedule: expandedRestaurant.schedule,
          source: 'menu' as const
        }))
      ]);
      setExpandedRestaurant(null);
      return;
    }
  };

  const handleExpandedRestaurantTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const [firstTouch, secondTouch] = [event.touches[0], event.touches[1]];
    const distance = Math.hypot(
      firstTouch.clientX - secondTouch.clientX,
      firstTouch.clientY - secondTouch.clientY
    );
    if (lastMenuPinchDistanceRef.current) {
      updateMenuZoom((currentZoom) => currentZoom + (distance - lastMenuPinchDistanceRef.current!) / 180);
    }
    lastMenuPinchDistanceRef.current = distance;
  };

  const resetExpandedRestaurantTouch = () => {
    lastMenuPinchDistanceRef.current = null;
  };

  const confirmLocationAsCurrent = () => {
    setShowLocationConfirmModal(false);
    setIsLocationConfirmedByUser(true);
    setSendToOtherLocation(false);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const currentLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDestinationPoint({ ...currentLoc, address: 'Mi ubicacion actual' });
        setIsDestinationConfirmed(true);
      }, (error) => {
        console.warn("GPS error, using mock:", error);
        const mockLoc = { lat: DEFAULT_DELIVERY_POINT.lat, lng: DEFAULT_DELIVERY_POINT.lng };
        setDestinationPoint({ ...mockLoc, address: 'Mi ubicacion actual' });
        setIsDestinationConfirmed(true);
      });
    } else {
      const mockLoc = { lat: DEFAULT_DELIVERY_POINT.lat, lng: DEFAULT_DELIVERY_POINT.lng };
      setDestinationPoint({ ...mockLoc, address: 'Mi ubicacion actual' });
      setIsDestinationConfirmed(true);
    }
  };

  const confirmLocationAsAlternative = () => {
    setShowLocationConfirmModal(false);
    setIsLocationConfirmedByUser(true);
    setSendToOtherLocation(true);
    setIsDestinationConfirmed(false);
    openDestinationPicker(true);
  };

  const handleOrderSubmit = () => {
    if (!clientUser || !selectedType) return;
    const normalizedOrderText = selectedType === OrderType.RESTAURANT
      ? buildRestaurantOrderDescription(restaurantItems, dispatchMode)
      : orderText.trim().toUpperCase();
    if (!normalizedOrderText.trim()) return;

    if (!isLocationConfirmedByUser) {
      setShowLocationConfirmModal(true);
      return;
    }

    if (!isDestinationConfirmed || !destinationPoint) {
      openDestinationPicker(sendToOtherLocation);
      return;
    }

    const submitOrderRecord = async (clientLocation: { lat: number; lng: number }) => {
      await createOrder({
        id: Date.now().toString(),
        clientId: clientUser.id,
        type: selectedType,
        description: normalizedOrderText,
        location: {
          lat: destinationPoint.lat,
          lng: destinationPoint.lng,
          address: destinationPoint.address || 'Destino de entrega'
        },
        clientLocation,
        destinationLocation: {
          lat: destinationPoint.lat,
          lng: destinationPoint.lng,
          address: destinationPoint.address || 'Destino de entrega'
        },
        status: OrderStatus.PENDING_PRICE,
        createdAt: Date.now(),
        chatHistory: [],
        photos: []
      });
      setRestaurantItems([]);
      setOrderText('');
      setSelectedType(null);
      setIsLocationConfirmedByUser(false);
      setSendToOtherLocation(false);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        void submitOrderRecord({ lat: position.coords.latitude, lng: position.coords.longitude });
      }, (error) => {
        console.warn("GPS error, using mock:", error);
        void submitOrderRecord({ lat: DEFAULT_DELIVERY_POINT.lat, lng: DEFAULT_DELIVERY_POINT.lng });
      });
    } else {
      void submitOrderRecord({ lat: DEFAULT_DELIVERY_POINT.lat, lng: DEFAULT_DELIVERY_POINT.lng });
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !clientUser) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: clientUser.id,
      text: chatInput,
      timestamp: Date.now()
    };
    addChatMessage(msg);
    setChatInput('');
  };

  if (!clientUser) return null;

  const selectedTypeLabel = ORDER_TYPES.find((type) => type.type === selectedType)?.label || selectedType || '';
  const orderTextPlaceholder = selectedType === OrderType.PHARMACY
    ? 'Escribe aquí lo que necesitas'
    : selectedType === OrderType.OTHER
      ? 'Escribe aquí lo que necesitas'
      : 'Escribe aquí lo que necesitas';
  const canSubmitOrder = selectedType === OrderType.RESTAURANT
    ? restaurantItems.length > 0
    : !!selectedType && orderText.trim().length >= 3;
  const deliveryDisplayName = activeOrder?.deliveryName || assignedDelivery?.name;
  const activeOrderIsRestaurant = activeOrder?.type === OrderType.RESTAURANT ||
    activeOrder?.category === 'COMIDA' ||
    activeOrder?.description.toUpperCase().includes('RESTAURANTE:');
  const canShowLiveTracking = !!activeOrder && (
    activeOrder.status === OrderStatus.IN_DELIVERY ||
    activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR ||
    (!activeOrderIsRestaurant && activeOrder.status === OrderStatus.PICKING_UP)
  );
  const isEnRoute = canShowLiveTracking;
  const deliveryStatusLabel = deliveryDisplayName
    ? deliveryDisplayName
    : availableDeliveries.length > 0
      ? `${availableDeliveries.length} disponible${availableDeliveries.length === 1 ? '' : 's'}`
      : 'Buscando...';
  const showDeliveryConfirmation = activeOrder?.status === OrderStatus.DELIVERED_BY_REPARTIDOR;
  const deliveryWhatsAppPhone = activeOrder?.deliveryPhone || assignedDelivery?.phone;

  const confirmReceivedOrder = () => {
    if (!activeOrder) return;
    setCompletedTimerActive(true);
    updateOrder({ ...activeOrder, status: OrderStatus.COMPLETED, completedAt: Date.now(), chatHistory: [] });
  };

  const acceptPriceOffer = () => {
    if (!activeOrder) return;
    setShowPriceOfferModal(false);
    updateOrder({ ...activeOrder, status: OrderStatus.CONFIRMED_BY_CLIENT });
  };

  const closeClientApp = () => {
    if (logout()) {
      onClose();
    }
  };

  // CHAT OVERLAY
  if (isChatOpen && activeOrder) {
    return (
      <div className="absolute inset-0 z-[60] bg-brand-white flex flex-col animate-in slide-in-from-bottom overflow-hidden text-brand-black font-inter">
        <div className="bg-brand-black px-4 py-3 text-brand-white flex justify-between items-center shadow-md shrink-0 font-poppins">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-yellow text-brand-black rounded-full flex items-center justify-center font-bold">R</div>
            <div>
              <p className="font-bold text-sm">Repartidor</p>
              <p className="text-xs font-bold text-brand-yellow">En línea</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-brand-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-brand-bg-light">
          {activeOrder.chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === clientUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] break-words whitespace-pre-wrap p-3 rounded-2xl shadow-sm text-sm leading-snug ${
                msg.senderId === clientUser.id 
                  ? 'bg-brand-yellow text-brand-black rounded-tr-none' 
                  : 'bg-brand-white text-brand-black rounded-tl-none border border-brand-surface-gray'
              }`}>
                {msg.text}
                <p className="text-[10px] mt-1 text-right opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 bg-brand-white border-t border-brand-surface-gray flex gap-2 shrink-0">
          <input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Mensaje..."
            className="min-w-0 flex-1 bg-brand-bg-light border border-brand-surface-gray rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-brand-yellow/20 outline-none text-brand-black font-inter"
          />
          <button onClick={handleSendMessage} className="bg-brand-yellow text-brand-black p-2.5 rounded-full shadow-md active:scale-95 transition-transform">
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-brand-bg-light pb-20 text-brand-black font-inter">
      {showDestinationPicker && (
        <DestinationPickerModal
          initialPoint={pickerInitialPoint}
          isAlternative={sendToOtherLocation}
          onCancel={() => setShowDestinationPicker(false)}
          onConfirm={(point) => {
            setDestinationPoint(point);
            setIsDestinationConfirmed(true);
            setShowDestinationPicker(false);
          }}
        />
      )}

      {expandedRestaurant && (
        <div className="absolute inset-0 z-[100] bg-brand-bg-light flex flex-col overflow-hidden text-brand-black">
          <div className="shrink-0 bg-brand-white text-brand-black px-3 py-3 flex items-center gap-2 border-b border-brand-surface-gray font-poppins">
            <button
              type="button"
              onClick={() => setExpandedRestaurant(null)}
              title="Cerrar"
              className="h-10 w-10 rounded-full bg-brand-bg-light text-brand-black flex items-center justify-center active:scale-95 border border-brand-surface-gray"
            >
              <X size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black truncate uppercase tracking-tight">{expandedRestaurant.name}</p>
              <p className="text-[11px] font-bold text-brand-gray-medium truncate uppercase tracking-wider">{expandedRestaurant.schedule}</p>
            </div>
            <button
              type="button"
              onClick={() => updateMenuZoom(menuZoom - 0.2)}
              title="Reducir zoom"
              className="h-10 w-10 rounded-full bg-brand-bg-light text-brand-black flex items-center justify-center active:scale-95 border border-brand-surface-gray"
            >
              <ZoomOut size={19} />
            </button>
            <button
              type="button"
              onClick={() => updateMenuZoom(menuZoom + 0.2)}
              title="Aumentar zoom"
              className="h-10 w-10 rounded-full bg-brand-bg-light text-brand-black flex items-center justify-center active:scale-95 border border-brand-surface-gray"
            >
              <ZoomIn size={19} />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-auto overscroll-contain bg-brand-bg-light"
            onWheel={(event) => {
              if (!event.ctrlKey && Math.abs(event.deltaY) < 12) return;
              updateMenuZoom((currentZoom) => currentZoom + (event.deltaY < 0 ? 0.12 : -0.12));
            }}
            onTouchMove={handleExpandedRestaurantTouchMove}
            onTouchEnd={resetExpandedRestaurantTouch}
            onTouchCancel={resetExpandedRestaurantTouch}
          >
            <div className="min-h-full w-full flex items-center justify-center p-2">
              <img
                src={expandedRestaurant.logoUrl}
                alt={expandedRestaurant.name}
                onDoubleClick={() => updateMenuZoom(menuZoom > 1.35 ? getDeviceRestaurantZoom() : 2)}
                className="block select-none object-contain"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '100%',
                  transform: `scale(${menuZoom})`,
                  transformOrigin: 'center top',
                  maxWidth: 'none',
                  touchAction: 'none'
                }}
              />
            </div>
          </div>

          <div className="shrink-0 max-h-[42%] bg-brand-white shadow-xl border-t border-brand-surface-gray p-3 space-y-3 flex flex-col font-inter">
            <div className="shrink-0">
              <p className="text-xs font-bold text-brand-yellow uppercase tracking-wider font-poppins">RESERVA DE MENU</p>
              <p className="text-sm font-black text-brand-black truncate uppercase font-poppins">{expandedRestaurant.name}</p>
            </div>

            <div className="min-h-0 overflow-y-auto space-y-2 pr-1">
              {menuDraftRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-brand-surface-gray bg-brand-white p-2 space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                      <input
                        value={row.productName}
                        onChange={(event) => {
                          const value = event.target.value.toUpperCase();
                          setMenuDraftRows((current) => current.map((draft) => (
                            draft.id === row.id
                              ? { ...draft, productName: value }
                              : draft
                          )));
                        }}
                        placeholder="¿QUÉ VAS A PEDIR?"
                        className="min-w-0 rounded-xl border-2 border-brand-surface-gray bg-brand-bg-light px-3 py-2.5 font-bold text-sm text-brand-black placeholder:text-brand-gray-medium outline-none focus:border-brand-yellow transition-all font-inter"
                      />
                      <div className="flex items-center rounded-xl border border-brand-surface-gray bg-brand-bg-light overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setMenuDraftRows((current) => current.map((draft) => (
                            draft.id === row.id ? { ...draft, quantity: Math.max(1, draft.quantity - 1) } : draft
                          )))}
                          className="p-2 text-brand-black hover:text-brand-yellow"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-brand-black font-poppins">{row.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setMenuDraftRows((current) => current.map((draft) => (
                            draft.id === row.id ? { ...draft, quantity: draft.quantity + 1 } : draft
                          )))}
                          className="p-2 text-brand-black hover:text-brand-yellow"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    {menuDraftRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMenuDraftRows((current) => current.filter((draft) => draft.id !== row.id))}
                        className="text-xs font-bold text-op-red px-1 font-poppins uppercase tracking-wider"
                      >
                        QUITAR FILA
                      </button>
                    )}
                  </div>
              ))}

              <button
                type="button"
                onClick={() => setMenuDraftRows((current) => [...current, createMenuDraftRow()])}
                className="w-full rounded-2xl border-2 border-dashed border-brand-yellow/50 bg-brand-bg-light py-2.5 text-sm font-bold text-brand-black flex items-center justify-center gap-2 font-poppins uppercase tracking-wider active:scale-[0.98] transition-transform"
              >
                <Plus size={16} /> AÑADIR OTRA FILA
              </button>
            </div>

            <button
              type="button"
              onClick={reserveExpandedRestaurantMenu}
              disabled={menuDraftRows.every((row) => row.productName.trim().length < 2)}
              className="w-full bg-brand-yellow text-brand-black py-3.5 rounded-2xl font-bold shadow-md disabled:bg-brand-surface-gray disabled:text-brand-gray-medium disabled:shadow-none disabled:opacity-100 flex items-center justify-center gap-2 font-poppins uppercase tracking-wider active:scale-[0.98] transition-transform"
            >
              <ReceiptText size={18} /> RESERVAR PEDIDO
            </button>
          </div>
        </div>
      )}

      {!clientUser.phone && (
        <div className="absolute inset-0 z-[70] bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-5 font-inter text-brand-black">
          <div className="w-full max-w-sm bg-brand-white rounded-2xl shadow-xl p-5 space-y-4 border border-brand-surface-gray">
            <div>
              <p className="text-xs font-bold text-op-green uppercase tracking-wider font-poppins">WhatsApp del cliente</p>
              <p className="text-sm text-brand-gray-medium font-bold mt-1 font-inter uppercase tracking-tight">Guardaremos este numero para abrir mensajes solo cuando sea necesario.</p>
            </div>
            <input
              type="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              className="w-full bg-brand-bg-light border border-brand-surface-gray p-3 rounded-xl font-bold text-brand-black outline-none focus:border-brand-yellow transition-all font-inter"
              placeholder="Ej: 5917XXXXXXX"
            />
            <button
              onClick={() => updateCurrentUserPhone(phoneDraft)}
              disabled={!phoneDraft.trim()}
              className="w-full bg-brand-yellow text-brand-black py-3 rounded-xl font-bold uppercase tracking-wider font-poppins disabled:bg-brand-surface-gray disabled:text-brand-gray-medium disabled:opacity-100"
            >
              Guardar WhatsApp
            </button>
          </div>
        </div>
      )}

      {showPriceOfferModal && activeOrder?.status === OrderStatus.WAITING_CONFIRM && (
        <div className="absolute inset-0 z-50 bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-5 text-brand-black font-inter">
          <div className="w-full max-w-sm bg-brand-white rounded-2xl shadow-xl border border-brand-surface-gray p-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-brand-yellow uppercase tracking-wider font-poppins">A pagar</p>
              <p className="text-3xl font-black text-brand-black mt-1 font-poppins">Bs. {activeOrder.totalPrice?.toFixed(2)}</p>
            </div>
            <button onClick={acceptPriceOffer} className="w-full bg-brand-yellow text-brand-black py-3 rounded-xl font-bold font-poppins uppercase tracking-wider shadow-sm active:scale-95 transition-transform">ACEPTAR Y CONFIRMAR PEDIDO</button>
            <button onClick={() => setShowPriceOfferModal(false)} className="w-full bg-brand-bg-light text-brand-black py-3 rounded-xl font-bold font-poppins uppercase tracking-wider border border-brand-surface-gray active:bg-brand-surface-gray/50 transition-colors">Ver pedido</button>
          </div>
        </div>
      )}

      {showDeliveryConfirmation && activeOrder && (
        <div className="absolute inset-0 z-50 bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-5 text-brand-black font-inter">
          <div className="w-full max-w-sm bg-brand-white rounded-2xl shadow-xl border border-brand-surface-gray p-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-op-green uppercase tracking-wider font-poppins">¡REPARTIDOR LLEGÓ!</p>
              <p className="text-lg font-bold text-brand-black mt-2 font-poppins uppercase tracking-tight">El repartidor marco el pedido como entregado.</p>
              <p className="text-sm text-brand-gray-medium font-bold mt-1 font-inter uppercase tracking-tight">Confirma solo cuando ya tengas tu pedido en mano.</p>
            </div>
            <button onClick={confirmReceivedOrder} className="w-full bg-op-green text-white py-4 rounded-xl font-bold uppercase tracking-wider font-poppins shadow-sm active:scale-95 transition-transform">YA SALGO, GRACIAS</button>
            <button onClick={() => setIsChatOpen(true)} className="w-full bg-brand-bg-light text-brand-black py-3 rounded-xl font-bold uppercase tracking-wider font-poppins border border-brand-surface-gray active:scale-95 transition-all">CHAT</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-brand-white border-b border-brand-surface-gray px-4 py-4 sticky top-0 z-10 shadow-sm font-poppins">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                    <img src="assets/brand/rapidingo-logo.png" alt="Beep Delivery" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-brand-surface-gray" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-brand-black truncate">HOLA, {clientUser.name.toUpperCase()}!</h2>
                    <p className="text-[10px] font-bold text-brand-gray-medium uppercase tracking-[2px]">¿Qué te llevamos hoy?</p>
                  </div>
              </div>
              <button
                onClick={closeClientApp}
                className="p-2.5 bg-brand-bg-light text-brand-black rounded-xl hover:bg-brand-surface-gray transition-colors border border-brand-surface-gray active:scale-90"
              >
                <LogOut size={20} />
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'HOME' && (
          <>
            {view === 'MENU' && (
              <div className="space-y-6">
                <header className="flex items-center justify-between">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${availableDeliveries.length > 0 ? 'bg-green-500/10 border-green-500 text-green-700 font-inter' : 'bg-brand-yellow/15 border-brand-yellow text-brand-black font-inter'}`}>
                    <img src="assets/client/scooter.png" alt="" className="w-5 h-5 object-contain" />
                    <span className="text-[10px] font-bold font-inter">{availableDeliveries.length}</span>
                  </div>

                  <div className="flex items-center gap-2 font-poppins">
                     <span className="w-2 h-2 rounded-full bg-op-green animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                     <span className="text-[10px] font-bold text-op-green uppercase tracking-wider">ONLINE</span>
                  </div>
                </header>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {ORDER_TYPES.map((t) => {
                    const config = CLIENT_CATEGORY_CONFIG[t.type as OrderType] || CLIENT_CATEGORY_CONFIG[OrderType.OTHER];
                    return (
                      <button
                        key={t.type}
                        onClick={() => {
                          const nextType = t.type as OrderType;
                          setSelectedType(nextType);
                          setOrderText('');
                          if (nextType !== OrderType.RESTAURANT) setRestaurantItems([]);
                          setView('FORM');
                        }}
                        className="group flex flex-col overflow-hidden rounded-[22px] border border-brand-surface-gray bg-brand-white shadow-sm active:scale-95 transition-all hover:border-brand-yellow hover:shadow-md"
                      >
                        <div className={`relative h-24 ${config.bg} flex items-center justify-center overflow-hidden p-2`}>
                          <img
                            src={config.img}
                            alt=""
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div className="h-11 flex items-center justify-center bg-transparent px-1">
                          <span className="font-bold text-xs uppercase tracking-wider font-poppins text-brand-black leading-tight text-center">{t.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-brand-white rounded-[22px] p-4 border border-brand-surface-gray shadow-sm flex items-center gap-4 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-brand-yellow/10 rounded-full -mr-12 -mt-12 transition-all"></div>
                   <div className="w-12 h-12 bg-brand-bg-light border border-brand-surface-gray text-brand-yellow rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Clock size={24} className="animate-pulse text-brand-black" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-brand-black font-poppins uppercase tracking-tight">Tu pedido llega rapido.</p>
                      <p className="text-[10px] font-bold text-brand-gray-medium font-inter uppercase tracking-wider leading-tight">Enviamos tus pedidos a toda la ciudad de Trinidad.</p>
                   </div>
                </div>
              </div>
            )}

            {view === 'FORM' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                <button onClick={() => setView('MENU')} className="text-brand-black hover:text-brand-yellow text-xs font-bold flex items-center gap-1 uppercase tracking-wider font-poppins group">
                   <ChevronRight size={16} className="rotate-180 group-active:-translate-x-1 transition-transform" />
                   Volver al menú
                </button>

                {selectedType && (
                  <div className="bg-brand-white rounded-[22px] border border-brand-surface-gray shadow-sm overflow-hidden flex items-center gap-4 p-1">
                    <div className={`w-24 h-20 flex items-center justify-center rounded-2xl ${CLIENT_CATEGORY_CONFIG[selectedType].bg}`}>
                      <img src={CLIENT_CATEGORY_CONFIG[selectedType].img} alt="" className="w-16 h-16 object-contain" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <p className="text-[10px] uppercase tracking-[2px] text-brand-gray-medium font-poppins">Detalle del pedido y referencia</p>
                      <h2 className="text-xl font-black font-poppins truncate text-brand-black">{selectedTypeLabel.toUpperCase()}</h2>
                    </div>
                  </div>
                )}

                {selectedType === OrderType.RESTAURANT ? (
                  <RestaurantOrderBuilder
                    items={restaurantItems}
                    onAddItem={addRestaurantItem}
                    onUpdateQuantity={updateRestaurantItemQuantity}
                    onRemoveItem={removeRestaurantItem}
                    onOpenRestaurantMenu={openRestaurantMenu}
                  />
                ) : (
                  <textarea
                    className="w-full h-40 p-5 border-2 border-brand-surface-gray rounded-[24px] bg-brand-white text-brand-black text-sm font-bold uppercase shadow-sm focus:ring-4 focus:ring-brand-yellow/15 focus:border-brand-yellow outline-none transition-all placeholder:text-brand-gray-medium font-inter"
                    placeholder={orderTextPlaceholder}
                    value={orderText}
                    onChange={(e) => setOrderText(e.target.value)}
                    lang="es"
                    inputMode="text"
                    spellCheck
                    autoCapitalize="sentences"
                  />
                )}

                <div className="bg-brand-white rounded-[22px] border border-brand-surface-gray shadow-sm p-5 space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-yellow"></div>
                  <div>
                    <p className="text-base font-bold text-brand-black font-poppins uppercase tracking-tight">Destino de entrega</p>
                    <p className="text-[10px] text-brand-yellow font-bold uppercase tracking-wider font-poppins leading-tight mt-1">
                      {!isLocationConfirmedByUser
                        ? "Elige antes de confirmar el pedido"
                        : sendToOtherLocation
                          ? "Enviar a otra ubicación"
                          : "Enviar a mi ubicación actual"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={confirmLocationAsCurrent}
                      className={`py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider font-poppins border active:scale-95 transition-all ${isLocationConfirmedByUser && !sendToOtherLocation ? 'bg-brand-yellow text-brand-black border-brand-yellow shadow-sm' : 'bg-brand-bg-light text-brand-black border-brand-surface-gray hover:bg-brand-surface-gray/50'}`}
                    >
                      Mi ubicación
                    </button>
                    <button
                      type="button"
                      onClick={confirmLocationAsAlternative}
                      className={`py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider font-poppins border active:scale-95 transition-all ${sendToOtherLocation ? 'bg-brand-yellow text-brand-black border-brand-yellow shadow-sm' : 'bg-brand-bg-light text-brand-black border-brand-surface-gray hover:bg-brand-surface-gray/50'}`}
                    >
                      Otra ubicación
                    </button>
                  </div>

                  {destinationPoint && (
                    <button
                      onClick={() => openDestinationPicker(sendToOtherLocation)}
                      className="w-full bg-brand-bg-light text-brand-black py-3 rounded-xl font-bold text-xs uppercase tracking-wider font-poppins flex items-center justify-center gap-2 border border-brand-surface-gray active:bg-brand-surface-gray transition-colors shadow-sm"
                    >
                      <MapPin size={14} className="text-brand-yellow" /> Cambiar ubicación
                    </button>
                  )}
                </div>

                <button
                  onClick={handleOrderSubmit}
                  disabled={!canSubmitOrder}
                  className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-brand-black py-5 rounded-[24px] font-bold text-sm font-poppins uppercase tracking-[2px] shadow-md disabled:bg-brand-surface-gray disabled:text-brand-gray-medium disabled:shadow-none disabled:opacity-100 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  ¡PEDIR AHORA! <ChevronRight size={22} className="animate-pulse" />
                </button>
              </div>
            )}

            {view === 'TRACKING' && activeOrder && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex justify-between items-center font-poppins">
                  <h2 className="text-xl font-black text-brand-black tracking-tight uppercase">Seguimiento</h2>
                  
                  {(() => {
                    const isStatusCompleted = activeOrder.status === OrderStatus.COMPLETED;
                    const isStatusInRoute = activeOrder.status === OrderStatus.IN_DELIVERY || activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR;
                    const isStatusCancelled = activeOrder.status === OrderStatus.CANCELLED;
                    
                    const statusColorClass = isStatusCompleted 
                      ? 'bg-op-green/10 border-op-green text-op-green' 
                      : isStatusInRoute 
                        ? 'bg-op-blue/10 border-op-blue text-op-blue' 
                        : isStatusCancelled 
                          ? 'bg-op-red/10 border-op-red text-op-red' 
                          : 'bg-brand-yellow/15 border-brand-yellow text-brand-black';
                          
                    return (
                      <div className={`flex items-center gap-2 border px-3 py-1 rounded-md ${statusColorClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isStatusCompleted ? 'bg-op-green' : isStatusInRoute ? 'bg-op-blue' : isStatusCancelled ? 'bg-op-red' : 'bg-brand-yellow'}`}></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {activeOrder.status === OrderStatus.PENDING_PRICE
                            ? (dispatchMode === 'OPERATOR' ? 'ESPERANDO COTIZACION OPERADORA' : 'ESPERANDO REPARTIDOR')
                            : getOrderStatusLabel(activeOrder.status)}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-brand-white border border-brand-surface-gray rounded-[24px] p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-1.5 bg-brand-yellow"></div>
                  <p className="text-[10px] font-bold text-brand-gray-medium uppercase tracking-[2px] font-poppins mb-1">Estado de tu pedido</p>
                  <p
                    key={statusFlashKey}
                    className="text-sm font-bold text-brand-black uppercase font-inter leading-snug animate-status-flash"
                  >
                    {persistentStatus}
                  </p>
                </div>
                
                {canShowLiveTracking ? (
                  <div className="rounded-[28px] overflow-hidden border border-brand-surface-gray shadow-sm relative">
                    <MapPlaceholder order={activeOrder} />
                    <div className="absolute top-4 left-4 bg-brand-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-brand-surface-gray flex items-center gap-2 shadow-sm text-brand-black">
                       <Bike size={16} className="text-brand-yellow" />
                       <span className="text-[10px] font-bold font-poppins uppercase tracking-wider">{deliveryDisplayName?.toUpperCase() || 'BUSCANDO REPARTIDOR...'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-brand-white p-5 rounded-[28px] shadow-sm border border-brand-surface-gray text-center space-y-2 text-brand-black">
                    <Clock size={34} className="mx-auto text-brand-yellow" />
                    <p className="text-[10px] font-bold text-brand-yellow uppercase tracking-[2px] font-poppins">Pedido en coordinación</p>
                    <p className="text-sm font-bold leading-snug font-inter">El seguimiento se activará cuando el pedido salga con el delivery.</p>
                  </div>
                )}

                <div className="bg-brand-white p-5 rounded-[28px] shadow-sm border border-brand-surface-gray space-y-5 relative overflow-hidden text-brand-black">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-yellow"></div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                       <p className="text-[10px] font-bold text-brand-gray-medium font-poppins uppercase tracking-[2px] mb-1">Detalle del pedido</p>
                       <p className="font-bold text-brand-black text-lg leading-tight uppercase font-poppins">{activeOrder.description}</p>
                    </div>
                    {activeOrder.totalPrice && (
                      <div className="bg-brand-bg-light border border-brand-surface-gray px-3 py-2 rounded-2xl text-center shrink-0 shadow-sm font-poppins">
                        <p className="text-[8px] font-bold text-brand-gray-medium uppercase tracking-wider mb-0.5">A PAGAR</p>
                        <p className="text-xl font-black text-brand-yellow leading-none">Bs. {activeOrder.totalPrice.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {activeOrder.status === OrderStatus.WAITING_CONFIRM && (
                    <div className="p-5 bg-brand-yellow/10 rounded-2xl border border-brand-yellow space-y-4 animate-in zoom-in duration-500 relative">
                       <div className="absolute top-2 right-2">
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-yellow opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-yellow"></span>
                          </span>
                       </div>
                       <p className="text-[10px] font-bold text-brand-black uppercase tracking-wider text-center font-poppins">A PAGAR</p>
                       <div className="flex justify-center items-baseline gap-2">
                          <span className="text-4xl font-black text-brand-black font-poppins tracking-tighter">Bs. {activeOrder.totalPrice?.toFixed(2)}</span>
                       </div>
                       <button onClick={acceptPriceOffer} className="w-full bg-brand-yellow text-brand-black py-4 rounded-xl font-bold text-sm uppercase tracking-wider font-poppins shadow-md active:scale-[0.98] transition-all">ACEPTAR Y CONFIRMAR PEDIDO</button>
                    </div>
                  )}

                  {activeOrder.status === OrderStatus.IN_DELIVERY && (
                    <div className="p-4 bg-op-blue/10 rounded-2xl border border-op-blue/20 flex items-center gap-4">
                      <div className="w-12 h-12 bg-op-blue text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <Truck size={24} className="animate-bounce-subtle" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-op-blue uppercase tracking-wider font-poppins">EN RUTA DE ENTREGA</p>
                        <p className="text-sm font-bold text-brand-black leading-tight font-inter">El repartidor está en camino.</p>
                      </div>
                    </div>
                  )}

                  {activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR && (
                    <div className="space-y-3">
                       <button onClick={confirmReceivedOrder} className="w-full bg-op-green text-white py-4 rounded-2xl font-bold font-poppins text-sm uppercase tracking-[1px] shadow-md animate-pulse">YA SALGO, GRACIAS</button>
                       <p className="text-[10px] text-center text-brand-gray-medium font-bold uppercase tracking-wider font-inter">Confirma solo si tienes el pedido en mano</p>
                    </div>
                  )}

                  <div className={`grid gap-3 ${hasWhatsAppPhone(deliveryWhatsAppPhone) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="bg-brand-bg-light text-brand-black hover:bg-brand-surface-gray py-4 rounded-xl font-bold text-xs uppercase tracking-wider font-poppins flex items-center justify-center gap-2 border border-brand-surface-gray transition-all"
                    >
                      <MessageCircle size={18} className="text-brand-yellow" /> CHAT
                    </button>
                    {hasWhatsAppPhone(deliveryWhatsAppPhone) && (
                      <button
                        onClick={() => openWhatsAppMessage(deliveryWhatsAppPhone, `Hola Soy el cliente ${clientUser.name}`)}
                        className="bg-[#25D366]/10 text-[#25D366] py-4 rounded-xl font-bold text-xs uppercase tracking-wider font-poppins flex items-center justify-center gap-2 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all"
                      >
                        <PhoneCall size={18} /> WhatsApp
                      </button>
                    )}
                  </div>

                  {!isEnRoute && (
                    <button
                      onClick={() => updateOrder({...activeOrder, status: OrderStatus.CANCELLED})}
                      className="w-full text-brand-gray-medium text-[10px] font-bold uppercase tracking-wider pt-2 hover:text-op-red transition-colors font-poppins"
                    >
                      CANCELAR PEDIDO
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-brand-black font-poppins uppercase">Mis pedidos</h2>
            {pastOrders.length === 0 ? (
              <p className="text-brand-gray-medium text-center py-10 font-bold font-inter">Aún no tienes pedidos.</p>
            ) : (
              <div className="space-y-3">
                {pastOrders.map((order) => (
                  <div key={order.id} className="bg-brand-white p-4 rounded-xl shadow-sm border border-brand-surface-gray flex justify-between items-center group transition-all hover:border-brand-yellow">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-brand-yellow/10 rounded-lg">
                         <Clock size={18} className="text-brand-black" />
                       </div>
                       <div>
                          <p className="font-bold text-sm text-brand-black line-clamp-1 font-poppins uppercase">{order.description}</p>
                          <p className="text-xs text-brand-gray-medium font-bold font-inter">{new Date(order.createdAt).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="text-right font-poppins">
                       <p className="font-bold text-brand-yellow text-sm">Bs. {order.totalPrice?.toFixed(2)}</p>
                       <ChevronRight size={16} className="text-brand-gray-medium ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'PROFILE' && (
           <div className="space-y-6">
              <div className="flex flex-col items-center py-6">
                 <div className="w-24 h-24 bg-brand-yellow/10 rounded-full flex items-center justify-center mb-3 border border-brand-yellow/20">
                    <UserIcon size={48} className="text-brand-black" />
                 </div>
                 <h3 className="font-black text-xl text-brand-black font-poppins">{clientUser.name}</h3>
                  <p className="text-xs text-brand-gray-medium font-bold font-inter">{clientUser.email || clientUser.phone}</p>
              </div>
              
              <div className="bg-brand-white rounded-xl shadow-sm border border-brand-surface-gray overflow-hidden">
                 <button className="w-full p-4 flex justify-between items-center border-b border-brand-surface-gray hover:bg-brand-bg-light transition-colors text-brand-black font-poppins text-sm">
                    <span className="text-sm font-medium">Mi Ubicación Guardada</span>
                    <MapPin size={16} className="text-brand-yellow" />
                 </button>
                 <button onClick={closeClientApp} className="w-full p-4 flex justify-between items-center text-op-red hover:bg-op-red/10 transition-colors font-poppins text-sm font-bold">
                    <span className="text-sm font-bold">Cerrar sesión</span>
                    <LogOut size={16} />
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="h-16 bg-brand-white/95 backdrop-blur-xl border-t border-brand-surface-gray absolute bottom-0 left-0 right-0 flex justify-around items-center px-6 z-10 shadow-sm">
        <button onClick={() => setActiveTab('HOME')} className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'HOME' ? 'text-brand-yellow scale-105 font-bold' : 'text-brand-gray-medium hover:text-brand-black'}`}>
          <Home size={20} strokeWidth={activeTab === 'HOME' ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-wider font-poppins">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('HISTORY')} className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'HISTORY' ? 'text-brand-yellow scale-105 font-bold' : 'text-brand-gray-medium hover:text-brand-black'}`}>
          <Clock size={20} strokeWidth={activeTab === 'HISTORY' ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-wider font-poppins">Pedidos</span>
        </button>
        <button onClick={() => setActiveTab('PROFILE')} className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'PROFILE' ? 'text-brand-yellow scale-105 font-bold' : 'text-brand-gray-medium hover:text-brand-black'}`}>
          <UserIcon size={20} strokeWidth={activeTab === 'PROFILE' ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-wider font-poppins">Perfil</span>
        </button>
      </div>

      {showLocationConfirmModal && (
        <div className="absolute inset-0 z-[100] bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-brand-white rounded-[2rem] border border-brand-surface-gray p-6 text-center space-y-6 shadow-xl relative text-brand-black">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-yellow"></div>
            
            <div className="h-16 w-16 mx-auto rounded-full bg-brand-yellow/10 flex items-center justify-center text-brand-yellow border border-brand-yellow/20 shadow-sm animate-pulse">
              <MapPin size={32} />
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-brand-yellow uppercase tracking-[2px] font-poppins">Confirmación de entrega</p>
              <h3 className="text-xl font-black text-brand-black font-poppins uppercase leading-tight">
                ¿El pedido llegará a tu ubicación actual?
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={confirmLocationAsCurrent}
                className="bg-brand-yellow text-brand-black py-4 rounded-2xl font-bold text-xs uppercase tracking-wider font-poppins shadow-sm active:scale-95 transition-all"
              >
                SÍ
              </button>
              <button
                onClick={confirmLocationAsAlternative}
                className="bg-brand-bg-light text-brand-black py-4 rounded-2xl font-bold text-xs uppercase tracking-wider font-poppins border border-brand-surface-gray active:bg-brand-surface-gray/55 transition-all"
              >
                NO, OTRA UBICACIÓN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
