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
  [OrderType.RESTAURANT]: { img: 'assets/client/restaurant.png', bg: 'bg-[#FF6A00]/10', color: 'text-[#FF6A00]' },
  [OrderType.PHARMACY]: { img: 'assets/client/pharmacy.png', bg: 'bg-[#FFC107]/10', color: 'text-[#FFC107]' },
  [OrderType.OTHER]: { img: 'assets/client/other.png', bg: 'bg-white/10', color: 'text-white' },
  [OrderType.SUPERMARKET]: { img: 'assets/client/other.png', bg: 'bg-green-50', color: 'text-green-600' }
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/wings_drinks.png',
    color: '#FF6A00'
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/el_brete.png',
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/la_toscana.png',
    color: '#FF6A00'
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/la_toscana1.png',
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/la_plazuela.png',
    color: '#FF6A00'
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/la_coqueta.png',
    color: '#FF6A00'
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/mr_grill.png',
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/el_benianito.png',
    color: '#FF6A00'
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/toby.png',
    color: '#FF6A00'
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
    logoUrl: 'https://pwxqjyrpjqxutpjqumhw.supabase.co/storage/v1/object/public/imagenes_restaurant/la_toscana2.png',
    color: '#FFC107'
  }
];

const RESTAURANT_FILTERS = ['TODOS', 'HAMBURGUESAS', 'PARRILLA', 'COMIDA RAPIDA', 'RESTAURANTE'];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getDeviceRestaurantZoom = () => {
  if (typeof window === 'undefined') return 1;
  return 1;
};

const buildRestaurantOrderDescription = (items: TempRestaurantItem[]) => {
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
    'Cliente espera cotizacion del delivery.'
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
      mapInstance.current.setView([lat, lng], 17);
    }
    if (markerInstance.current) {
      markerInstance.current.setLatLng([lat, lng]);
    }
    setSuggestions([]);
    setSearchQuery('');
  };

  useEffect(() => {
    const L = (window as Window & { L?: any }).L;
    if (!mapRef.current || !L) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      rotate: false
    }).setView([initialPoint.lat, initialPoint.lng], 17);
    mapInstance.current = map;

    if (typeof map.setBearing === 'function') {
      map.setBearing(0);
    }

    const baseLayer = L.tileLayer(
      isSatellite
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: isSatellite ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors'
      }
    ).addTo(map);

    const marker = L.marker([initialPoint.lat, initialPoint.lng], { draggable: true }).addTo(map);
    markerInstance.current = marker;

    const updatePoint = (lat: number, lng: number) => {
      const nextPoint = {
        lat,
        lng,
        address: isAlternative ? 'Otra ubicacion de entrega' : 'Mi ubicacion actual'
      };
      setPoint(nextPoint);
      marker.setLatLng([lat, lng]);
    };

    marker.on('dragend', () => {
      const next = marker.getLatLng();
      updatePoint(next.lat, next.lng);
    });

    map.on('click', (event: any) => {
      updatePoint(event.latlng.lat, event.latlng.lng);
    });

    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, [initialPoint.lat, initialPoint.lng, isAlternative, isSatellite]);

  return (
    <div className="absolute inset-0 z-[80] bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-black rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] border border-white/5 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-brand-yellow to-brand-orange opacity-50"></div>

        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-brand-orange uppercase tracking-[3px] font-teko italic">Destino de entrega</p>
            <h3 className="text-xl font-black text-white font-montserrat">
              Mueve el mapa
            </h3>
          </div>
          <button onClick={onCancel} className="p-2.5 rounded-xl bg-white/5 text-gray-400 active:scale-90 transition-transform border border-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Buscador MapTiler */}
        <div className="px-5 py-4 bg-brand-black border-b border-white/5 relative z-[90] shrink-0">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange">
              {isSearching ? <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" /> : <Search size={16} />}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ej: Hospital Obrero, Plaza Principal..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border-2 border-white/5 rounded-2xl text-sm font-bold text-white focus:border-brand-orange outline-none transition-all font-montserrat placeholder:text-gray-700 shadow-inner"
            />
          </div>

          {suggestions.length > 0 && (
            <div className="absolute left-5 right-5 mt-2 bg-brand-black border border-white/10 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto max-h-48 z-[100]">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-5 py-4 text-[11px] font-bold text-gray-300 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-start gap-3 transition-colors group"
                >
                  <MapPin size={14} className="text-brand-orange shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="font-montserrat uppercase tracking-tight">{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[300px] bg-gray-900 relative">
          <div ref={mapRef} className="absolute inset-0" />

          {/* Botón Vista Satelital */}
          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className="absolute top-4 right-4 z-[10] p-3 bg-brand-black/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 text-brand-orange active:scale-90 transition-all hover:bg-brand-black"
            title="Cambiar vista"
          >
            {isSatellite ? <MapIcon size={22} /> : <Satellite size={22} />}
          </button>

          <div className="absolute left-4 bottom-4 right-4 bg-brand-black/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl text-[9px] font-black text-brand-yellow border border-white/5 z-[10] font-teko uppercase tracking-[2px] italic">
            Coordenadas: {point.lat.toFixed(5)} / {point.lng.toFixed(5)}
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4 shrink-0 bg-brand-black border-t border-white/5">
          <button onClick={onCancel} className="bg-white/5 text-gray-500 py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] font-teko italic border border-white/5 active:bg-white/10 transition-all">
            CANCELAR
          </button>
          <button onClick={() => onConfirm(point)} className="bg-brand-orange text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] font-teko italic shadow-[0_0_20px_rgba(255,106,0,0.3)] active:scale-95 transition-all">
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
      <div className="bg-brand-black/80 rounded-[22px] border border-brand-orange/20 shadow-[0_8px_18px_rgba(0,0,0,0.5)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[3px] text-brand-yellow font-teko italic">COMIDA</p>
            <h3 className="text-xl font-black text-white font-montserrat">Doble clic en la tarjeta para pedir</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-brand-orange text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,106,0,0.4)]">
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
              className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black border transition-all font-teko uppercase tracking-wider ${
                activeFilter === filter
                  ? 'bg-brand-orange text-white border-brand-orange shadow-[0_0_12px_rgba(255,106,0,0.4)]'
                  : 'bg-white/5 text-gray-400 border-white/10'
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
              className={`shrink-0 w-72 overflow-hidden rounded-[24px] border bg-brand-black/60 text-left shadow-2xl active:scale-[0.98] transition-all relative group ${
                selected ? 'border-brand-orange ring-2 ring-brand-orange/30' : 'border-white/10'
              }`}
            >
              <div
                className="relative h-36 bg-gray-900"
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveRestaurantId(restaurant.id);
                  onOpenRestaurantMenu(restaurant);
                }}
              >
                <img src={restaurant.logoUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/20 to-transparent" />

                <div className="absolute right-3 top-3 px-2 py-1 rounded-lg bg-brand-black/80 backdrop-blur-sm text-brand-yellow flex items-center gap-1 border border-white/10 shadow-lg">
                  <Clock size={12} />
                  <span className="text-[10px] font-black font-teko italic tracking-wider uppercase">{restaurant.deliveryTime}</span>
                </div>

                <div className="absolute left-3 right-3 bottom-3">
                  <p className="text-white text-xl font-black leading-tight line-clamp-1 font-montserrat uppercase">{restaurant.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-brand-yellow/90 text-[10px] font-black font-teko uppercase tracking-widest italic">
                    <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md border border-white/5"><Star size={11} fill="currentColor" /> {restaurant.rating}</span>
                    <span className="bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded-md border border-brand-orange/20">TARIF. Bs. {restaurant.deliveryFee}</span>
                  </div>
                </div>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black px-2 py-1 rounded-md bg-white/5 text-gray-300 border border-white/10 font-teko uppercase tracking-wider">{restaurant.category}</span>
                  <span className="text-[10px] font-black text-brand-yellow font-teko uppercase tracking-wider italic">Min. Bs. {restaurant.minOrder}</span>
                </div>
                <p className="text-[11px] text-gray-400 font-bold leading-tight line-clamp-1 border-t border-white/5 pt-2 italic">{restaurant.address.toUpperCase()}</p>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div className="bg-brand-orange text-white px-4 py-2 rounded-full font-black font-teko text-xs uppercase shadow-2xl flex items-center gap-2">
                    <Maximize2 size={14} /> DOBLE CLIC PARA PEDIR
                 </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeRestaurant && activeRestaurantItems.length > 0 && (
        <div className="bg-brand-black/80 rounded-[22px] border border-brand-orange/20 shadow-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-orange/10 rounded-full -mr-8 -mt-8"></div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg border border-white/10" style={{ backgroundColor: activeRestaurant.color }}>
              <ShoppingBag size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[2px] text-brand-yellow font-teko italic">RESERVA DE MENU</p>
              <h3 className="text-lg font-black text-white font-montserrat truncate uppercase">{activeRestaurant.name}</h3>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value.toUpperCase())}
              onKeyDown={(event) => event.key === 'Enter' && addCurrentItem()}
              placeholder="¿QUÉ VAS A PEDIR?"
              className="min-w-0 rounded-2xl border-2 border-brand-orange/20 bg-white px-4 py-3.5 font-black text-sm text-brand-black placeholder:text-gray-500 outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 font-montserrat"
            />
            <div className="flex items-center rounded-2xl border-2 border-white/10 bg-brand-black/60 overflow-hidden">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 text-gray-400 active:text-brand-orange">
                <Minus size={18} />
              </button>
              <span className="w-8 text-center font-black text-white font-montserrat">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-3 text-gray-400 active:text-brand-orange">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={addCurrentItem}
            disabled={!productName.trim()}
            className="w-full bg-white/5 border border-white/10 text-brand-orange py-4 rounded-2xl font-black font-teko text-sm uppercase tracking-[2px] disabled:bg-transparent disabled:text-gray-700 disabled:border-white/5 disabled:opacity-100 flex items-center justify-center gap-2 active:bg-white/10 transition-all"
          >
            <Plus size={18} /> AÑADIR OTRA FILA
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-brand-black/90 rounded-[22px] border border-brand-yellow/20 shadow-[0_15px_40px_rgba(255,193,7,0.1)] p-5 space-y-4 relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[3px] text-brand-yellow font-teko italic">RESUMEN DE PEDIDO</p>
              <h3 className="text-xl font-black text-white font-montserrat uppercase tracking-tight">{items.reduce((sum, item) => sum + item.quantity, 0)} productos en tu lista</h3>
            </div>
            <ReceiptText className="text-brand-yellow drop-shadow-[0_0_8px_#FFC107]" size={28} />
          </div>

          <div className="space-y-4">
            {Object.entries(groupedItems).map(([restaurantName, restaurantItems]) => {
              return (
              <div key={restaurantName} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <p className="font-black text-xs text-brand-yellow font-teko uppercase tracking-widest italic">{restaurantName.toUpperCase()}</p>
                </div>
                <div className="space-y-2">
                  {restaurantItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-brand-black/40 rounded-xl p-3 border border-white/5 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white font-montserrat truncate uppercase tracking-tight">{item.productName}</p>
                        <p className="text-[10px] font-bold text-gray-500 font-teko uppercase tracking-wider italic">Cantidad: {item.quantity} Unidad{item.quantity === 1 ? '' : 'es'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-brand-orange hover:bg-white/10 transition-colors">
                          <Minus size={14} />
                        </button>
                        <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-brand-orange hover:bg-white/10 transition-colors">
                          <Plus size={14} />
                        </button>
                        <button type="button" onClick={() => onRemoveItem(item.id)} className="p-2 rounded-lg bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20 transition-colors">
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

export const ClientModule: React.FC<ClientModuleProps> = ({ onClose }) => {
  const { clientUser, activeOrder, createOrder, updateOrder, logout, pastOrders, addChatMessage, assignedDelivery, availableDeliveries, updateCurrentUserPhone } = useApp();
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastMenuPinchDistanceRef = useRef<number | null>(null);
  
  const [message, setMessage] = useState<string | null>(null);

  const openDestinationPicker = async (isAlternative: boolean) => {
    const point = destinationPoint || await getCurrentDeliveryPoint();
    setPickerInitialPoint({
      ...point,
      address: isAlternative ? 'Otra ubicacion de entrega' : 'Mi ubicacion actual'
    });
    setShowDestinationPicker(true);
  };

  const handleOtherLocationToggle = (checked: boolean) => {
    setSendToOtherLocation(checked);
    setIsDestinationConfirmed(false);
    setDestinationPoint(null);
    if (checked) openDestinationPicker(true);
  };

  const handleDestinationConfirmationToggle = (checked: boolean) => {
    if (!checked) {
      setIsDestinationConfirmed(false);
      return;
    }
    openDestinationPicker(sendToOtherLocation);
  };

  useEffect(() => {
    if (activeOrder) setView('TRACKING');
    else {
      setView('MENU');
      setSendToOtherLocation(false);
      setIsDestinationConfirmed(false);
      setDestinationPoint(null);
      setRestaurantItems([]);
    }
  }, [activeOrder]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeOrder?.chatHistory, isChatOpen]);

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

  const handleOrderSubmit = () => {
    if (!clientUser || !selectedType) return;
    const normalizedOrderText = selectedType === OrderType.RESTAURANT
      ? buildRestaurantOrderDescription(restaurantItems)
      : orderText.trim().toUpperCase();
    if (!normalizedOrderText.trim()) return;
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
    };

    // Attempt to get real GPS location
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
  const isEnRoute = activeOrder?.status === OrderStatus.PICKING_UP || activeOrder?.status === OrderStatus.IN_DELIVERY || activeOrder?.status === OrderStatus.DELIVERED_BY_REPARTIDOR;
  const deliveryStatusLabel = deliveryDisplayName
    ? deliveryDisplayName
    : availableDeliveries.length > 0
      ? `${availableDeliveries.length} disponible${availableDeliveries.length === 1 ? '' : 's'}`
      : 'Buscando...';
  const showDeliveryConfirmation = activeOrder?.status === OrderStatus.DELIVERED_BY_REPARTIDOR;
  const deliveryWhatsAppPhone = activeOrder?.deliveryPhone || assignedDelivery?.phone;

  const confirmReceivedOrder = () => {
    if (!activeOrder) return;
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
      <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom overflow-hidden">
        <div className="bg-red-600 px-4 py-3 text-white flex justify-between items-center shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">R</div>
            <div>
              <p className="font-bold text-sm">Repartidor</p>
              <p className="text-xs font-bold text-white/95">En línea</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-50">
          {activeOrder.chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === clientUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] break-words whitespace-pre-wrap p-3 rounded-2xl shadow-sm text-sm leading-snug ${
                msg.senderId === clientUser.id 
                  ? 'bg-red-500 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                {msg.text}
                <p className="text-[10px] mt-1 text-right opacity-90">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 bg-white border-t flex gap-2 shrink-0">
          <input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Mensaje..."
            className="min-w-0 flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-red-500"
          />
          <button onClick={handleSendMessage} className="bg-red-500 text-white p-2 rounded-full shadow-md"><Send size={18} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative hexagon-pattern pb-20 text-white font-montserrat">
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
        <div className="absolute inset-0 z-[100] bg-[#111] flex flex-col overflow-hidden">
          <div className="shrink-0 bg-[#111]/95 text-white px-3 py-3 flex items-center gap-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => setExpandedRestaurant(null)}
              title="Cerrar"
              className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95"
            >
              <X size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black truncate">{expandedRestaurant.name}</p>
              <p className="text-[11px] font-bold text-white/70 truncate">{expandedRestaurant.schedule}</p>
            </div>
            <button
              type="button"
              onClick={() => updateMenuZoom(menuZoom - 0.2)}
              title="Reducir zoom"
              className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95"
            >
              <ZoomOut size={19} />
            </button>
            <button
              type="button"
              onClick={() => updateMenuZoom(menuZoom + 0.2)}
              title="Aumentar zoom"
              className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95"
            >
              <ZoomIn size={19} />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-auto overscroll-contain bg-[#111]"
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

          <div className="shrink-0 max-h-[42%] bg-white shadow-2xl border-t border-orange-100 p-3 space-y-3 flex flex-col">
            <div className="shrink-0">
              <p className="text-xs font-black text-red-600 uppercase tracking-wider">RESERVA DE MENU</p>
              <p className="text-sm font-black text-[#161616] truncate">{expandedRestaurant.name}</p>
            </div>

            <div className="min-h-0 overflow-y-auto space-y-2 pr-1">
              {menuDraftRows.map((row, rowIndex) => (
                  <div key={row.id} className="rounded-2xl border border-orange-100 bg-white p-2 space-y-2">
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
                        className="min-w-0 rounded-xl border-2 border-orange-100 bg-white px-3 py-2.5 font-black text-sm text-[#161616] placeholder:text-gray-500 outline-none focus:border-orange-500"
                      />
                      <div className="flex items-center rounded-xl border border-orange-100 bg-orange-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setMenuDraftRows((current) => current.map((draft) => (
                            draft.id === row.id ? { ...draft, quantity: Math.max(1, draft.quantity - 1) } : draft
                          )))}
                          className="p-2 text-[#565656]"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-black text-[#161616]">{row.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setMenuDraftRows((current) => current.map((draft) => (
                            draft.id === row.id ? { ...draft, quantity: draft.quantity + 1 } : draft
                          )))}
                          className="p-2 text-[#565656]"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    {menuDraftRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMenuDraftRows((current) => current.filter((draft) => draft.id !== row.id))}
                        className="text-xs font-black text-red-600 px-1"
                      >
                        QUITAR FILA
                      </button>
                    )}
                  </div>
              ))}

              <button
                type="button"
                onClick={() => setMenuDraftRows((current) => [...current, createMenuDraftRow()])}
                className="w-full rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/60 py-2.5 text-sm font-black text-orange-700 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> AÑADIR OTRA FILA
              </button>
            </div>

            <button
              type="button"
              onClick={reserveExpandedRestaurantMenu}
              disabled={menuDraftRows.every((row) => row.productName.trim().length < 2)}
              className="w-full bg-red-600 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-red-200 disabled:bg-red-100 disabled:text-red-900 disabled:shadow-none disabled:opacity-100 flex items-center justify-center gap-2"
            >
              <ReceiptText size={18} /> RESERVAR PEDIDO
            </button>
          </div>
        </div>
      )}

      {!clientUser.phone && (
        <div className="absolute inset-0 z-[70] bg-black/45 flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div>
              <p className="text-xs font-black text-green-700 uppercase tracking-wider">WhatsApp del cliente</p>
              <p className="text-sm text-[#565656] font-bold mt-1">Guardaremos este numero para abrir mensajes solo cuando sea necesario.</p>
            </div>
            <input
              type="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              className="w-full bg-gray-100 p-3 rounded-xl font-bold"
              placeholder="Ej: 5917XXXXXXX"
            />
            <button
              onClick={() => updateCurrentUserPhone(phoneDraft)}
              disabled={!phoneDraft.trim()}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-black disabled:bg-green-100 disabled:text-green-900 disabled:opacity-100"
            >
              Guardar WhatsApp
            </button>
          </div>
        </div>
      )}

      {showPriceOfferModal && activeOrder?.status === OrderStatus.WAITING_CONFIRM && (
        <div className="absolute inset-0 z-50 bg-black/45 flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-yellow-100 p-5 space-y-4">
            <div>
              <p className="text-xs font-black text-yellow-700 uppercase tracking-wider">A pagar</p>
              <p className="text-3xl font-black text-gray-900 mt-1">Bs. {activeOrder.totalPrice?.toFixed(2)}</p>
            </div>
            <button onClick={acceptPriceOffer} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">ACEPTAR Y CONFIRMAR PEDIDO</button>
            <button onClick={() => setShowPriceOfferModal(false)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">Ver pedido</button>
          </div>
        </div>
      )}

      {showDeliveryConfirmation && activeOrder && (
        <div className="absolute inset-0 z-50 bg-black/45 flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-green-100 p-5 space-y-4">
            <div>
              <p className="text-xs font-black text-green-700 uppercase tracking-wider">¡REPARTIDOR LLEGÓ!</p>
              <p className="text-lg font-bold text-gray-900 mt-2">El repartidor marco el pedido como entregado.</p>
              <p className="text-sm text-[#565656] font-bold mt-1">Confirma solo cuando ya tengas tu pedido en mano.</p>
            </div>
            <button onClick={confirmReceivedOrder} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase">YA SALGO, GRACIAS</button>
            <button onClick={() => setIsChatOpen(true)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">CHAT</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-brand-black/90 backdrop-blur-md border-b border-brand-orange/20 px-4 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-orange text-white rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,106,0,0.4)]">
                    <UserIcon size={24} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[20px] leading-6 font-black text-white truncate">HOLA, {clientUser.name.toUpperCase()}!</h2>
                    <p className="text-xs font-bold text-brand-yellow uppercase tracking-[2px] font-teko italic">¿Qué te llevamos hoy?</p>
                  </div>
              </div>
              <button
                onClick={closeClientApp}
                className="p-2.5 bg-white/5 text-brand-orange rounded-xl hover:bg-white/10 transition-colors border border-white/10 active:scale-90"
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
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${availableDeliveries.length > 0 ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-brand-orange/10 border-brand-orange text-brand-orange shadow-[0_0_10px_rgba(255,106,0,0.2)]'}`}>
                    <Bike size={14} className="animate-bounce-subtle" />
                    <span className="text-[10px] font-black uppercase tracking-widest font-teko italic">{deliveryStatusLabel.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse shadow-[0_0_8px_#FFC107]"></span>
                     <span className="text-[9px] font-bold text-brand-yellow font-teko uppercase tracking-widest italic">ONLINE</span>
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
                        className="group flex flex-col overflow-hidden rounded-[22px] border border-brand-orange/20 bg-brand-black/40 backdrop-blur-sm shadow-[0_8px_18px_rgba(0,0,0,0.4)] active:scale-95 transition-all hover:border-brand-orange/50 hover:bg-brand-black/60"
                      >
                        <div className={`relative h-24 ${config.bg} flex items-center justify-center overflow-hidden p-2`}>
                          <img
                            src={config.img}
                            alt=""
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,106,0,0.5)]"
                          />
                        </div>
                        <div className="h-11 flex items-center justify-center bg-transparent px-1">
                          <span className={`font-black text-[10px] uppercase tracking-wider font-teko italic ${config.color.includes('white') ? 'text-white' : config.color} leading-tight text-center`}>{t.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-brand-black/80 rounded-[22px] p-4 border border-brand-orange/20 shadow-2xl flex items-center gap-4 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-brand-orange/10"></div>
                   <div className="w-12 h-12 bg-white/5 border border-white/10 text-brand-yellow rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                      <Clock size={24} className="animate-pulse" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white font-montserrat uppercase tracking-tight">Tu pedido llega rapido.</p>
                      <p className="text-[10px] font-bold text-gray-400 font-teko uppercase tracking-widest italic leading-tight">Enviamos tus pedidos a toda la ciudad de Trinidad.</p>
                   </div>
                </div>
              </div>
            )}

            {view === 'FORM' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                <button onClick={() => setView('MENU')} className="text-brand-orange text-xs font-black flex items-center gap-1 uppercase tracking-widest font-teko italic group">
                   <ChevronRight size={16} className="rotate-180 group-active:-translate-x-1 transition-transform" />
                   Volver al menú
                </button>

                {selectedType && (
                  <div className="bg-brand-black/80 rounded-[22px] border border-brand-orange/20 shadow-2xl overflow-hidden flex items-center gap-4 p-1">
                    <div className={`w-24 h-20 flex items-center justify-center rounded-2xl ${CLIENT_CATEGORY_CONFIG[selectedType].bg}`}>
                      <img src={CLIENT_CATEGORY_CONFIG[selectedType].img} alt="" className="w-16 h-16 object-contain drop-shadow-[0_0_8px_rgba(255,106,0,0.3)]" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <p className="text-[10px] uppercase tracking-[2px] text-gray-500 font-teko italic">Detalle del pedido y referencia</p>
                      <h2 className={`text-xl font-black font-montserrat truncate ${CLIENT_CATEGORY_CONFIG[selectedType]?.color.includes('white') ? 'text-white' : CLIENT_CATEGORY_CONFIG[selectedType]?.color}`}>{selectedTypeLabel.toUpperCase()}</h2>
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
                    className="w-full h-40 p-5 border-2 border-brand-orange/20 rounded-[24px] bg-white text-brand-black text-lg font-black uppercase shadow-2xl focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange outline-none transition-all placeholder:text-gray-500 font-montserrat"
                    placeholder={orderTextPlaceholder}
                    value={orderText}
                    onChange={(e) => setOrderText(e.target.value)}
                    lang="es"
                    inputMode="text"
                    spellCheck
                    autoCapitalize="sentences"
                  />
                )}

                <div className="bg-brand-black/80 rounded-[22px] border border-brand-orange/20 shadow-2xl p-5 space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange group-active:w-2 transition-all"></div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToOtherLocation}
                      onChange={(e) => handleOtherLocationToggle(e.target.checked)}
                      className="mt-1 h-6 w-6 rounded-lg accent-brand-orange transition-transform active:scale-90 ring-2 ring-white/10"
                    />
                    <span>
                      <span className="block text-base font-black text-white font-montserrat uppercase tracking-tight">Enviar a otra ubicación</span>
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest font-teko italic leading-tight mt-1">
                        {destinationPoint
                          ? "Punto marcado en el mapa"
                          : "Se enviará a tu posición actual"}
                      </span>
                    </span>
                  </label>

                  {destinationPoint && (
                    <button
                      onClick={() => openDestinationPicker(true)}
                      className="w-full bg-white/5 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[2px] font-teko italic flex items-center justify-center gap-2 border border-white/10 active:bg-white/10 transition-colors shadow-lg"
                    >
                      <MapPin size={14} className="text-brand-orange" /> Cambiar ubicacion
                    </button>
                  )}
                </div>

                <button
                  onClick={handleOrderSubmit}
                  disabled={!canSubmitOrder}
                  className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white py-5 rounded-[24px] font-black text-lg font-teko italic uppercase tracking-[3px] shadow-[0_10px_30px_rgba(255,106,0,0.3)] disabled:bg-gray-800 disabled:text-gray-600 disabled:shadow-none disabled:opacity-100 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  ¡PEDIR AHORA! <ChevronRight size={22} className="animate-pulse" />
                </button>
              </div>
            )}

            {view === 'TRACKING' && activeOrder && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-white tracking-tighter font-montserrat uppercase italic">Seguimiento</h2>
                  <div className="flex items-center gap-2 bg-brand-orange/20 border border-brand-orange/40 px-3 py-1 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
                    <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest font-teko italic">{getOrderStatusLabel(activeOrder.status)}</span>
                  </div>
                </div>
                
                <div className="rounded-[28px] overflow-hidden border-2 border-white/5 shadow-2xl relative">
                  <MapPlaceholder order={activeOrder} />
                  <div className="absolute top-4 left-4 bg-brand-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                     <Bike size={16} className="text-brand-yellow" />
                     <span className="text-[10px] font-black text-white font-teko uppercase tracking-widest italic">{deliveryDisplayName?.toUpperCase() || 'BUSCANDO REPARTIDOR...'}</span>
                  </div>
                </div>

                <div className="bg-brand-black/90 p-5 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/5 space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-brand-orange shadow-[0_0_15px_#FF6A00]"></div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                       <p className="text-[9px] font-bold text-gray-500 font-teko uppercase tracking-[3px] italic mb-1">Detalle del pedido</p>
                       <p className="font-black text-white text-lg leading-tight uppercase font-montserrat">{activeOrder.description}</p>
                    </div>
                    {activeOrder.totalPrice && (
                      <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-2xl text-center shrink-0 shadow-inner">
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-teko mb-0.5">A PAGAR</p>
                        <p className="text-xl font-black text-brand-yellow font-montserrat leading-none">Bs. {activeOrder.totalPrice.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {activeOrder.status === OrderStatus.WAITING_CONFIRM && (
                    <div className="p-5 bg-brand-yellow/5 rounded-2xl border border-brand-yellow/20 space-y-4 animate-in zoom-in duration-500 relative">
                       <div className="absolute top-2 right-2">
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-yellow opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-yellow"></span>
                          </span>
                       </div>
                       <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[4px] text-center font-teko italic">A PAGAR</p>
                       <div className="flex justify-center items-baseline gap-2">
                          <span className="text-4xl font-black text-white font-montserrat tracking-tighter">Bs. {activeOrder.totalPrice?.toFixed(2)}</span>
                       </div>
                       <button onClick={acceptPriceOffer} className="w-full bg-brand-yellow text-brand-black py-4 rounded-xl font-black text-sm uppercase tracking-widest font-teko italic shadow-[0_0_20px_rgba(255,193,7,0.3)] active:scale-[0.98] transition-all">ACEPTAR Y CONFIRMAR PEDIDO</button>
                    </div>
                  )}

                  {activeOrder.status === OrderStatus.IN_DELIVERY && (
                    <div className="p-4 bg-brand-orange/5 rounded-2xl border border-brand-orange/20 flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-orange text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-orange/20">
                        <Truck size={24} className="animate-bounce-subtle" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-brand-orange uppercase tracking-widest font-teko italic">EN RUTA DE ENTREGA</p>
                        <p className="text-sm font-bold text-white leading-tight font-montserrat">El repartidor está en camino.</p>
                      </div>
                    </div>
                  )}

                  {activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR && (
                    <div className="space-y-3">
                       <button onClick={confirmReceivedOrder} className="w-full bg-brand-orange text-white py-4 rounded-2xl font-black font-teko italic text-lg uppercase tracking-[2px] shadow-[0_10px_30px_rgba(255,106,0,0.4)] animate-pulse">YA SALGO, GRACIAS</button>
                       <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest">Confirma solo si tienes el pedido</p>
                    </div>
                  )}

                  <div className={`grid gap-3 ${hasWhatsAppPhone(deliveryWhatsAppPhone) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="bg-white/5 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest font-teko italic flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <MessageCircle size={18} className="text-brand-yellow" /> CHAT
                    </button>
                    {hasWhatsAppPhone(deliveryWhatsAppPhone) && (
                      <button
                        onClick={() => openWhatsAppMessage(deliveryWhatsAppPhone, `Hola Soy el cliente ${clientUser.name}`)}
                        className="bg-[#25D366]/10 text-[#25D366] py-4 rounded-xl font-black text-[11px] uppercase tracking-widest font-teko italic flex items-center justify-center gap-2 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all"
                      >
                        <PhoneCall size={18} /> WhatsApp
                      </button>
                    )}
                  </div>

                  {!isEnRoute && (
                    <button
                      onClick={() => updateOrder({...activeOrder, status: OrderStatus.CANCELLED})}
                      className="w-full text-gray-600 text-[10px] font-black uppercase tracking-widest pt-2 hover:text-red-500 transition-colors"
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
            <h2 className="text-xl font-black text-[#161616]">Mis pedidos</h2>
            {pastOrders.length === 0 ? (
              <p className="text-[#565656] text-center py-10 font-bold">Aún no tienes pedidos.</p>
            ) : (
              <div className="space-y-3">
                {pastOrders.map((order) => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-orange-50 rounded-lg"><Clock size={18} className="text-red-600" /></div>
                       <div>
                          <p className="font-black text-sm text-[#161616] line-clamp-1">{order.description}</p>
                          <p className="text-xs text-[#565656] font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-red-600 text-sm">${order.totalPrice?.toFixed(2)}</p>
                       <ChevronRight size={16} className="text-gray-300 ml-auto" />
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
                 <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-3">
                    <UserIcon size={48} className="text-red-600" />
                 </div>
                 <h3 className="font-black text-xl text-[#161616]">{clientUser.name}</h3>
                  <p className="text-sm text-[#565656] font-bold">{clientUser.email || clientUser.phone}</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                 <button className="w-full p-4 flex justify-between items-center border-b hover:bg-gray-50">
                    <span className="text-sm font-medium">Mi Ubicación Guardada</span>
                    <MapPin size={16} className="text-red-600" />
                 </button>
                 <button onClick={closeClientApp} className="w-full p-4 flex justify-between items-center text-red-600 hover:bg-red-50">
                    <span className="text-sm font-bold">Cerrar sesion</span>
                    <LogOut size={16} />
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="h-16 bg-brand-black/95 backdrop-blur-xl border-t border-brand-orange/20 absolute bottom-0 left-0 right-0 flex justify-around items-center px-6 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <button onClick={() => setActiveTab('HOME')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'HOME' ? 'text-brand-orange scale-110' : 'text-gray-500'}`}>
          <Home size={20} strokeWidth={activeTab === 'HOME' ? 3 : 2} className={activeTab === 'HOME' ? 'drop-shadow-[0_0_8px_#FF6A00]' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest font-teko italic">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('HISTORY')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'HISTORY' ? 'text-brand-orange scale-110' : 'text-gray-500'}`}>
          <Clock size={20} strokeWidth={activeTab === 'HISTORY' ? 3 : 2} className={activeTab === 'HISTORY' ? 'drop-shadow-[0_0_8px_#FF6A00]' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest font-teko italic">Pedidos</span>
        </button>
        <button onClick={() => setActiveTab('PROFILE')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'PROFILE' ? 'text-brand-orange scale-110' : 'text-gray-500'}`}>
          <UserIcon size={20} strokeWidth={activeTab === 'PROFILE' ? 3 : 2} className={activeTab === 'PROFILE' ? 'drop-shadow-[0_0_8px_#FF6A00]' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest font-teko italic">Perfil</span>
        </button>
      </div>
    </div>
  );
};
