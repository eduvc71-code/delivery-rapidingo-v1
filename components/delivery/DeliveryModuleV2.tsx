import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderStatus, Order, ChatMessage, getOrderStatusLabel } from '../../types';
import { 
  Truck, DollarSign, Clock, CheckCircle, Camera, X, 
  Image as ImageIcon, MapPin, Power, Minus, LayoutList, 
  Bike, FileText, Navigation, MessageCircle, Send, PhoneCall,
  User as UserIcon
} from 'lucide-react';
import MapPlaceholder from '../shared/MapPlaceholder';

type QuoteRow = {
  restaurantId: string;
  restaurant: string;
  item: string;
  quantity: number;
  unitPrice: string;
};

type RestaurantProgress = {
  restaurantId: string;
  restaurant: string;
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'DELIVERED';
  prepTime: number;
  timestamp: number;
};

const RESTAURANT_ID_BY_NAME: Record<string, string> = {
  'wings & drinks': 'wings_drinks',
  'el brete churrasqueria': 'el_brete',
  'la toscana centro': 'la_toscana',
  'la toscana - tablitas': 'la_toscana',
  'la plazuela j&c': 'la_plazuela',
  'la coqueta': 'la_coqueta',
  'mr. grill': 'mr_grill',
  'restaurante el benianito': 'el_benianito',
  'toby - cuarto de libra': 'toby',
  'la toscana - rapido': 'la_toscana'
};

const resolveRestaurantId = (restaurantName: string) =>
  RESTAURANT_ID_BY_NAME[restaurantName.trim().toLowerCase()] || restaurantName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');

const hasWhatsAppPhone = (phone?: string) => /\d/.test(phone || '');

const openWhatsAppMessage = (phone: string | undefined, message: string) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    alert('No hay numero de WhatsApp registrado');
    return;
  }
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
};

const parseQuoteRows = (description?: string): QuoteRow[] => {
  const rows: QuoteRow[] = [];
  let currentRestaurant = 'Pedido';

  (description || '').split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const restaurantMatch = line.match(/^RESTAURANTE:\s*(.+)$/i);
    if (restaurantMatch) {
      currentRestaurant = restaurantMatch[1].trim();
      return;
    }

    const itemMatch = line.match(/^-\s*(.+?)\s+x(\d+)\s*$/i);
    if (itemMatch) {
      rows.push({
        restaurantId: resolveRestaurantId(currentRestaurant),
        restaurant: currentRestaurant,
        item: itemMatch[1].trim(),
        quantity: Math.max(1, Number(itemMatch[2] || 1)),
        unitPrice: ''
      });
    }
  });

  if (rows.length === 0 && description?.trim()) {
    rows.push({
      restaurantId: 'pedido',
      restaurant: 'Pedido',
      item: description.trim(),
      quantity: 1,
      unitPrice: ''
    });
  }

  return rows;
};

const getRestaurantStatus = (order: Order, restaurantId: string) => {
  let status: 'PENDING' | 'ACCEPTED' | 'READY' | 'DELIVERED' = 'PENDING';
  let prepTime = 0;
  let timestamp = 0;

  if (order.chatHistory) {
    for (const msg of order.chatHistory) {
      if (msg.isSystem || msg.text.startsWith('RESTAURANT_STATUS:')) {
        const parts = msg.text.split(':');
        const isScopedStatus = parts[0] === 'RESTAURANT_STATUS' && parts[1] === restaurantId;
        if (isScopedStatus && parts[2] === 'ACCEPTED') {
          status = 'ACCEPTED';
          prepTime = parseInt(parts[3]) || 0;
          timestamp = msg.timestamp;
        } else if (isScopedStatus && parts[2] === 'READY') {
          status = 'READY';
          timestamp = msg.timestamp;
        } else if (isScopedStatus && parts[2] === 'DELIVERED') {
          status = 'DELIVERED';
          timestamp = msg.timestamp;
        }
      }
    }
  }

  return { status, prepTime, timestamp };
};

const DriverCountdownTimer: React.FC<{ acceptedAt: number; prepDurationMinutes: number }> = ({ acceptedAt, prepDurationMinutes }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const totalMs = prepDurationMinutes * 60 * 1000;
      const elapsedMs = Date.now() - acceptedAt;
      return Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));
    };

    setTimeLeft(calculateTime());

    const timer = setInterval(() => {
      const remaining = calculateTime();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [acceptedAt, prepDurationMinutes]);

  if (timeLeft <= 0) {
    return (
      <span className="text-brand-yellow font-black animate-pulse uppercase tracking-widest text-[11px] block text-center mt-2 font-poppins">
        ¡TIEMPO LÍMITE EXCEDIDO!
      </span>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return (
    <span className="text-white font-mono font-black text-xl tracking-wider block text-center mt-1">
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
};

interface DeliveryModuleProps {
    onClose: () => void;
    onMinimize: () => void;
}

export const DeliveryModuleV2: React.FC<DeliveryModuleProps> = ({ onClose, onMinimize }) => {
  const { activeOrder, updateOrder, pastOrders, deliveryUser, logout, addChatMessage, clientUser, updateCurrentUserPhone } = useApp();
  const [view, setView] = useState<'DASHBOARD' | 'ACTIVE_ORDER' | 'HISTORY'>('DASHBOARD');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Pricing state
  const [serviceCost, setServiceCost] = useState('');
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  
  const watchId = useRef<number | null>(null);
  const clientDisplayName = activeOrder?.clientName || clientUser?.name || 'Protocolo...';
  const clientWhatsAppPhone = activeOrder?.clientPhone || clientUser?.phone;
  const quotedProductTotal = quoteRows.reduce((sum, row) => {
    const unitPrice = parseFloat(row.unitPrice);
    return sum + (isNaN(unitPrice) ? 0 : unitPrice * row.quantity);
  }, 0);
  const quotedServiceCost = parseFloat(serviceCost);
  const quotedGrandTotal = quotedProductTotal + (isNaN(quotedServiceCost) ? 0 : quotedServiceCost);

  const activeRestaurantRows = useMemo(() => {
    if (!activeOrder) return null;
    const rows = parseQuoteRows(activeOrder.description);
    return rows.filter((row) => row.restaurantId !== 'pedido');
  }, [activeOrder]);

  const restaurantProgress = useMemo<RestaurantProgress[]>(() => {
    if (!activeOrder || !activeRestaurantRows?.length) return [];
    const groups = new Map<string, string>();
    activeRestaurantRows.forEach((row) => groups.set(row.restaurantId, row.restaurant));
    return Array.from(groups.entries()).map(([restaurantId, restaurant]) => ({
      restaurantId,
      restaurant,
      ...getRestaurantStatus(activeOrder, restaurantId)
    }));
  }, [activeOrder, activeRestaurantRows]);

  const activeOrderIsRestaurant = restaurantProgress.length > 0;

  useEffect(() => {
    if (!activeOrder) {
      setQuoteRows([]);
      setServiceCost('');
      return;
    }

    if (activeOrder.status === OrderStatus.PENDING_PRICE) {
      setQuoteRows(parseQuoteRows(activeOrder.description));
      setServiceCost('');
    }
  }, [activeOrder?.id, activeOrder?.description, activeOrder?.status]);

  useEffect(() => {
    if (!activeOrder || !deliveryUser || !('geolocation' in navigator)) return;
    const shouldTrack = activeOrder.description.toUpperCase().includes('RESTAURANTE:')
      ? activeOrder.status === OrderStatus.IN_DELIVERY
      : [OrderStatus.BIDDING, OrderStatus.CONFIRMED_BY_CLIENT, OrderStatus.PICKING_UP, OrderStatus.IN_DELIVERY].includes(activeOrder.status);
    if (!shouldTrack) return;

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const previousLocation = activeOrder.deliveryLocation;
        if (
          previousLocation &&
          Math.abs(previousLocation.lat - nextLocation.lat) < 0.00001 &&
          Math.abs(previousLocation.lng - nextLocation.lng) < 0.00001
        ) {
          return;
        }

        updateOrder({
          ...activeOrder,
          deliveryId: activeOrder.deliveryId || deliveryUser.id,
          deliveryName: activeOrder.deliveryName || deliveryUser.name,
          deliveryPhone: activeOrder.deliveryPhone || deliveryUser.phone,
          deliveryLocation: nextLocation,
          locationHistory: [...(activeOrder.locationHistory || []), nextLocation]
        });
      },
      (error) => console.error('Error actualizando GPS delivery:', error),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [activeOrder?.id, activeOrder?.status, deliveryUser?.id]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeOrder?.chatHistory, isChatOpen]);

  const closeDeliveryApp = () => {
    if (logout()) {
      onClose();
    }
  };

  const handleSetPrice = () => {
    if (!activeOrder || !deliveryUser) return;
    const servicePrice = parseFloat(serviceCost);
    if (isNaN(servicePrice) || servicePrice < 0) {
      alert('Ingresa una tarifa valida');
      return;
    }

    updateOrder({
      ...activeOrder,
      deliveryId: activeOrder.deliveryId || deliveryUser.id,
      deliveryName: activeOrder.deliveryName || deliveryUser.name,
      deliveryPhone: activeOrder.deliveryPhone || deliveryUser.phone,
      productPrice: quotedProductTotal,
      servicePrice,
      totalPrice: quotedProductTotal + servicePrice,
      status: OrderStatus.WAITING_CONFIRM
    });
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !deliveryUser) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: deliveryUser.id,
      text: chatInput,
      timestamp: Date.now()
    };
    addChatMessage(msg);
    setChatInput('');
  };

  const openNavigationToClient = () => {
    if (!activeOrder) return;
    const destination = activeOrder.destinationLocation || activeOrder.location;
    if (!destination?.lat || !destination?.lng) {
      alert('No hay ubicacion de destino disponible');
      return;
    }

    window.open(`https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`, '_blank');
  };

  const handleConfirmRestaurantPickup = (restaurant: RestaurantProgress) => {
    if (!activeOrder) return;
    const now = Date.now();
    const systemMsg: ChatMessage = {
      id: `sys-pickup-${restaurant.restaurantId}-${now}`,
      senderId: 'system',
      text: `RESTAURANT_STATUS:${restaurant.restaurantId}:DELIVERED`,
      timestamp: now,
      isSystem: true
    };
    const notificationMsg: ChatMessage = {
      id: `sys-notif-pickup-${restaurant.restaurantId}-${now}`,
      senderId: 'system',
      text: `Delivery recibio el pedido de ${restaurant.restaurant}.`,
      timestamp: now,
      isSystem: true
    };
    const allPickedUp = restaurantProgress.every((progress) => (
      progress.restaurantId === restaurant.restaurantId || progress.status === 'DELIVERED'
    ));

    updateOrder({
      ...activeOrder,
      status: allPickedUp ? OrderStatus.IN_DELIVERY : OrderStatus.PICKING_UP,
      chatHistory: [...(activeOrder.chatHistory || []), systemMsg, notificationMsg]
    });
  };

  if (!deliveryUser) return null;

  // CHAT OVERLAY V2 (Styled in Dark Theme matching the delivery skin)
  if (isChatOpen && activeOrder) {
    return (
      <div className="absolute inset-0 z-[60] bg-brand-black flex flex-col animate-in slide-in-from-bottom overflow-hidden text-white font-inter">
        <div className="bg-[#1C1C1C] border-b border-white/5 px-4 py-3 text-white flex justify-between items-center shadow-md shrink-0 font-poppins">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-yellow text-brand-black rounded-full flex items-center justify-center font-bold">C</div>
            <div>
              <p className="font-bold text-sm">{clientDisplayName}</p>
              <p className="text-xs font-bold text-brand-yellow">Cliente</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#111111] hexagon-pattern">
          {activeOrder.chatHistory?.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === deliveryUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] break-words whitespace-pre-wrap p-3 rounded-2xl shadow-md text-sm leading-snug ${
                msg.senderId === deliveryUser.id 
                  ? 'bg-brand-yellow text-brand-black rounded-tr-none font-bold' 
                  : 'bg-[#1C1C1C] text-white rounded-tl-none border border-white/5'
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

        <div className="p-3 bg-[#1C1C1C] border-t border-white/5 flex gap-2 shrink-0">
          <input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Mensaje..."
            className="min-w-0 flex-1 bg-[#111111] border border-white/10 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-brand-yellow/20 outline-none text-white font-inter"
          />
          <button onClick={handleSendMessage} className="bg-brand-yellow text-brand-black p-2.5 rounded-full shadow-md active:scale-95 transition-transform">
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative hexagon-pattern text-white font-inter">
      {!deliveryUser.phone && (
        <div className="absolute inset-0 z-[70] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#1C1C1C] rounded-[2.5rem] shadow-2xl border border-white/5 p-8 space-y-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow mb-2 shadow-lg">
               <PhoneCall size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[3px] font-poppins">WhatsApp del delivery</p>
              <p className="text-xs text-gray-400 font-bold mt-2 leading-relaxed">Ingresa tu número de WhatsApp para coordinar con el cliente.</p>
            </div>
            <input
              type="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 p-4 rounded-2xl font-bold text-white text-center focus:border-brand-yellow outline-none text-lg"
              placeholder="Ej: 5917XXXXXXX"
            />
            <button
              onClick={() => updateCurrentUserPhone(phoneDraft)}
              disabled={!phoneDraft.trim()}
              className="w-full bg-brand-yellow text-brand-black py-4 rounded-2xl font-black font-poppins text-sm uppercase tracking-[2px] shadow-lg shadow-brand-yellow/15 active:scale-95 transition-transform"
            >
              GUARDAR
            </button>
          </div>
        </div>
      )}

      <div className="bg-brand-black/90 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-10">
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3 text-white min-w-0">
                  <div className="w-12 h-12 bg-[#1C1C1C] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/5 overflow-hidden">
                    <img src="assets/brand/rapidingo-logo.png" alt="Beep Delivery" className="w-12 h-12 rounded-2xl object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[20px] leading-6 font-black font-poppins uppercase tracking-tight truncate">BEEP DELIVERY</h2>
                    <p className="text-xs leading-5 font-bold text-brand-yellow uppercase tracking-[2px] font-poppins truncate">{deliveryUser.name}</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={onMinimize} className="p-2.5 bg-[#1C1C1C] text-gray-400 rounded-xl hover:bg-white/5 transition-colors border border-white/5"><Minus size={20} /></button>
                  <button
                    onClick={closeDeliveryApp}
                    className="p-2.5 bg-[#1C1C1C] text-brand-yellow rounded-xl hover:bg-white/5 transition-colors border border-brand-yellow/20 shadow-inner"
                  >
                    <Power size={20} />
                  </button>
              </div>
          </div>

          <div className="flex bg-[#1C1C1C] p-1 rounded-xl border border-white/5">
              <button onClick={() => setView('DASHBOARD')} className={`flex-1 text-[10px] font-black py-2.5 rounded-lg transition-all font-poppins uppercase tracking-widest ${view !== 'HISTORY' ? 'bg-brand-yellow text-brand-black shadow-md' : 'text-gray-500'}`}>PEDIDOS</button>
              <button onClick={() => setView('HISTORY')} className={`flex-1 text-[10px] font-black py-2.5 rounded-lg transition-all font-poppins uppercase tracking-widest ${view === 'HISTORY' ? 'bg-brand-yellow text-brand-black shadow-md' : 'text-gray-500'}`}>HISTORIAL</button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {view !== 'HISTORY' && (
          activeOrder ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* MAPA SUPERIOR EN CUADRO */}
              <div className="w-full aspect-square max-h-[300px] rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative z-0">
                <MapPlaceholder order={activeOrder} isDeliveryView />
                <div className="absolute top-4 right-4 bg-brand-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse shadow-[0_0_8px_#FFC107]"></div>
                   <span className="text-[9px] font-black text-white font-poppins uppercase tracking-widest">GPS ACTIVO</span>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-white tracking-tighter font-poppins uppercase">PEDIDO ACTIVO</h3>
                 <div className="px-3 py-1.5 bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow rounded-xl text-[10px] font-black uppercase tracking-widest font-poppins">{getOrderStatusLabel(activeOrder.status)}</div>
              </div>
              
              <div className="bg-[#1C1C1C] p-5 rounded-[28px] border border-white/5 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-yellow transition-all"></div>
                 <p className="text-[9px] text-brand-yellow font-bold mb-2 uppercase tracking-[3px] font-poppins">Detalle del pedido</p>
                 <p className="text-lg font-black text-white leading-tight uppercase font-poppins tracking-tight">{activeOrder.description}</p>
                 <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-[#111111] rounded-full flex items-center justify-center border border-white/10">
                          <UserIcon size={14} className="text-brand-yellow" />
                       </div>
                       <span className="text-xs font-bold text-gray-400 font-poppins uppercase tracking-widest">CLIENTE: {clientDisplayName.toUpperCase()}</span>
                    </div>
                 </div>
              </div>

              {/* GRUPO DE BOTONES ORGANIZADOS */}
              <div className="space-y-4 pt-2">
                {activeOrder.status === OrderStatus.PENDING_PRICE && (
                  <div className="bg-[#1C1C1C] p-6 rounded-[32px] border border-white/5 shadow-3xl space-y-5 animate-in slide-in-from-bottom-6 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/5 rounded-full -mr-16 -mt-16"></div>
                    <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[4px] text-center font-poppins">COTIZACIÓN DESGLOSADA</p>

                    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#111111]">
                      <div className="grid grid-cols-[1.3fr_42px_76px_76px] bg-black/40 text-[8px] font-black text-gray-500 uppercase tracking-widest font-poppins p-1 border-b border-white/5">
                        <div className="p-2">PRODUCTO</div>
                        <div className="p-2 text-center">CANT.</div>
                        <div className="p-2 text-center">UNIT.</div>
                        <div className="p-2 text-right">TOTAL</div>
                      </div>
                      <div className="divide-y divide-white/5">
                        {quoteRows.map((row, index) => {
                          const unitPrice = parseFloat(row.unitPrice);
                          const lineTotal = isNaN(unitPrice) ? 0 : unitPrice * row.quantity;
                          return (
                            <div key={`${row.restaurant}-${row.item}-${index}`} className="grid grid-cols-[1.3fr_42px_76px_76px] items-center bg-transparent">
                              <div className="p-2 min-w-0">
                                <p className="text-[9px] font-black text-brand-yellow truncate font-poppins tracking-wider uppercase">{row.restaurant}</p>
                                <p className="text-xs font-black text-white leading-tight font-inter uppercase truncate">{row.item}</p>
                              </div>
                              <div className="p-2 text-center text-sm font-black text-white font-poppins">{row.quantity}</div>
                              <div className="p-1">
                                <input
                                  type="number"
                                  value={row.unitPrice}
                                  onChange={(event) => setQuoteRows((current) => current.map((quoteRow, quoteIndex) => (
                                    quoteIndex === index ? { ...quoteRow, unitPrice: event.target.value } : quoteRow
                                  )))}
                                  placeholder="0"
                                  className="w-full rounded-lg bg-[#111111] border border-white/10 px-2 py-2 text-center text-sm font-black text-white outline-none focus:border-brand-yellow font-inter"
                                />
                              </div>
                              <div className="p-2 text-right text-xs font-black text-brand-yellow font-inter">Bs. {lineTotal.toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-center">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-poppins">TOTAL PRODUCTOS</span>
                        <div className="w-full bg-[#111111] p-4 rounded-2xl font-black text-xl text-white border border-white/5 font-inter tracking-tighter">Bs. {quotedProductTotal.toFixed(2)}</div>
                      </div>
                      <div className="space-y-1.5 text-center">
                        <span className="text-[9px] font-black text-brand-yellow uppercase tracking-widest font-poppins">TARIFA</span>
                        <input type="number" placeholder="0.00" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} className="w-full bg-brand-yellow/10 p-4 rounded-2xl font-black text-xl text-brand-yellow border border-brand-yellow/30 text-center outline-none focus:bg-brand-yellow/20 transition-all font-inter tracking-tighter shadow-inner" />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-brand-yellow text-brand-black p-4 flex items-center justify-between shadow-lg font-poppins">
                      <span className="text-[10px] font-black uppercase tracking-[3px]">TOTAL GENERAL</span>
                      <span className="text-3xl font-black tracking-tighter">Bs. {quotedGrandTotal.toFixed(2)}</span>
                    </div>

                    <button onClick={handleSetPrice} className="w-full bg-white text-brand-black py-4 rounded-2xl font-black font-poppins text-lg uppercase tracking-[2px] shadow-lg transition-all active:scale-95">ENVIAR COTIZACIÓN</button>
                  </div>
                )}

                {activeOrder.status === OrderStatus.CONFIRMED_BY_CLIENT && (
                   <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.PICKING_UP})} className="w-full bg-brand-yellow text-brand-black py-5 rounded-[22px] font-black font-poppins text-xl uppercase tracking-[2px] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                     <CheckCircle size={24} /> {activeOrderIsRestaurant ? 'AVISAR AL RESTAURANTE' : 'IR A COMPRAR'}
                   </button>
                )}

                {activeOrder.status === OrderStatus.PICKING_UP && (
                   <div className="space-y-4 w-full">
                     {activeOrderIsRestaurant && restaurantProgress.map((restaurant) => (
                       <div key={restaurant.restaurantId} className="bg-[#1C1C1C] p-5 rounded-[24px] border border-white/5 text-center space-y-3 shadow-2xl relative overflow-hidden">
                         <div className={`absolute top-0 left-0 w-full h-1 ${restaurant.status === 'READY' ? 'bg-brand-yellow' : restaurant.status === 'DELIVERED' ? 'bg-green-600' : 'bg-brand-yellow/40'}`}></div>
                         <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[3px] font-poppins">{restaurant.restaurant}</p>

                         {restaurant.status === 'PENDING' && (
                           <p className="text-xs font-bold text-gray-400 leading-relaxed font-inter">Esperando que este restaurante acepte su parte del pedido.</p>
                         )}
                         {restaurant.status === 'ACCEPTED' && (
                           <div>
                             <p className="text-xs font-bold text-gray-400 font-inter">TIEMPO ESTIMADO RESTANTE:</p>
                             <DriverCountdownTimer acceptedAt={restaurant.timestamp} prepDurationMinutes={restaurant.prepTime} />
                           </div>
                         )}
                         {restaurant.status === 'READY' && (
                           <div className="space-y-3">
                             <p className="text-xl font-black text-brand-yellow uppercase tracking-[4px] font-poppins">PEDIDO LISTO</p>
                             <button
                               onClick={() => handleConfirmRestaurantPickup(restaurant)}
                               className="w-full bg-brand-yellow text-brand-black py-4 rounded-2xl font-black font-poppins text-sm uppercase tracking-[3px] shadow-lg active:scale-95 transition-all"
                             >
                               RECIBÍ ESTE PEDIDO
                             </button>
                           </div>
                         )}
                         {restaurant.status === 'DELIVERED' && (
                           <div className="bg-green-600/10 border border-green-600/30 p-4 rounded-[18px] text-center space-y-1">
                             <p className="text-[10px] font-black text-green-500 uppercase tracking-[3px] font-poppins">RECOJO CONFIRMADO</p>
                           </div>
                         )}
                       </div>
                     ))}

                     {!activeOrderIsRestaurant && (
                       <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.IN_DELIVERY})} className="w-full bg-brand-yellow text-brand-black py-5 rounded-[22px] font-black font-poppins text-xl uppercase tracking-[2px] shadow-lg flex items-center justify-center gap-3">
                         <Truck size={24} /> COMPRADO, EN RUTA
                       </button>
                     )}
                   </div>
                )}

                {activeOrder.status === OrderStatus.IN_DELIVERY && (
                   <button
                    onClick={() => {
                      addChatMessage({
                        id: Date.now().toString(),
                        senderId: deliveryUser.id,
                        text: "Su pedido está en la puerta",
                        timestamp: Date.now()
                      });
                      updateOrder({...activeOrder, status: OrderStatus.DELIVERED_BY_REPARTIDOR});
                    }}
                    className="w-full bg-green-600 text-white py-5 rounded-[22px] font-black font-poppins text-xl uppercase tracking-[2px] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
                   >
                     <CheckCircle size={24} /> ¡YA LLEGUÉ!
                   </button>
                )}

                {activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR && (
                   <div className="p-6 bg-brand-yellow/5 rounded-[28px] border border-brand-yellow/20 text-center space-y-3 shadow-inner">
                     <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[4px] font-poppins">ESPERANDO CONFIRMACIÓN DEL CLIENTE</p>
                     <p className="text-sm font-bold text-white font-inter tracking-tight leading-snug">Esperando confirmación final del cliente.</p>
                   </div>
                )}

                <div className={`grid gap-3 ${hasWhatsAppPhone(clientWhatsAppPhone) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="bg-[#1C1C1C] text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest font-poppins flex items-center justify-center gap-2 border border-white/5 hover:bg-white/10 transition-all shadow-lg"
                  >
                    <MessageCircle size={18} className="text-brand-yellow" /> CHAT
                  </button>
                  {hasWhatsAppPhone(clientWhatsAppPhone) && (
                    <button
                      onClick={() => openWhatsAppMessage(clientWhatsAppPhone, `Hola Soy el delivery ${deliveryUser.name}`)}
                      className="bg-[#25D366]/10 text-[#25D366] py-4 rounded-xl font-black text-[11px] uppercase tracking-widest font-poppins flex items-center justify-center gap-2 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all shadow-lg"
                    >
                      <PhoneCall size={18} /> WhatsApp
                    </button>
                  )}
                </div>

                {activeOrder.status !== OrderStatus.COMPLETED && activeOrder.status !== OrderStatus.CANCELLED && (
                  <button
                    onClick={() => updateOrder({...activeOrder, status: OrderStatus.CANCELLED})}
                    className="w-full text-gray-600 text-[10px] font-black uppercase tracking-widest pt-4 hover:text-brand-yellow transition-colors font-poppins"
                  >
                    CANCELAR / RECHAZAR
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 animate-in fade-in duration-700">
               <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 mb-8">
                     <div className="absolute inset-0 bg-brand-yellow blur-3xl opacity-10 rounded-full animate-pulse"></div>
                     <div className="relative w-full h-full bg-[#1C1C1C] text-brand-yellow rounded-[40px] flex items-center justify-center border border-white/5 shadow-2xl">
                       <LayoutList size={56} className="opacity-80" />
                     </div>
                  </div>
                  <p className="font-black text-white text-xl uppercase tracking-tighter font-poppins">ESTÁS ONLINE</p>
                  <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[4px] font-poppins">Los pedidos llegarán pronto a Trinidad.</p>
               </div>
               <button
                 onClick={closeDeliveryApp}
                 className="mt-16 mx-auto bg-[#1C1C1C] text-gray-400 px-10 py-4 rounded-2xl font-black font-poppins text-sm uppercase tracking-[2px] border border-white/5 hover:bg-white/10 transition-all active:scale-95"
               >
                 <Power size={18} className="inline mr-2 text-brand-yellow" /> CERRAR SESION
               </button>
            </div>
          )
        )}

        {view === 'HISTORY' && (
           <div className="space-y-5 animate-in slide-in-from-right duration-500">
              <h2 className="text-xl font-black text-white font-poppins uppercase tracking-tight">Resumen de Ganancias</h2>
              <div className="bg-[#1C1C1C] rounded-3xl shadow-2xl border border-white/5 overflow-hidden">
                 <table className="w-full text-xs">
                    <thead className="bg-black/40 text-gray-500 font-black uppercase font-poppins tracking-[2px]">
                       <tr><th className="p-4 text-left">PEDIDO</th><th className="p-4 text-right">GANANCIA</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {pastOrders.map((o, i) => (
                         <tr key={i} className="hover:bg-white/5 transition-colors group">
                           <td className="p-4 font-bold text-gray-300 font-inter uppercase text-[10px] leading-relaxed group-hover:text-white">{o.description.toLowerCase()}</td>
                           <td className="p-4 text-right font-black text-brand-yellow font-inter tracking-tighter text-sm">Bs. {o.servicePrice?.toFixed(2)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
                 {pastOrders.length === 0 && (
                   <div className="p-10 text-center text-gray-600 font-poppins uppercase tracking-[3px]">No hay pedidos</div>
                 )}
              </div>
           </div>
        )}
      </div>

      {/* Botón Flotante de WAZE */}
      {activeOrder && (
        activeOrder.status === OrderStatus.IN_DELIVERY ||
        (!activeOrderIsRestaurant && (activeOrder.status === OrderStatus.PICKING_UP || activeOrder.status === OrderStatus.CONFIRMED_BY_CLIENT))
      ) && (
        <button
          onClick={openNavigationToClient}
          className="absolute bottom-10 right-6 bg-brand-yellow text-brand-black px-7 py-4 rounded-full shadow-lg z-30 flex items-center gap-3 active:scale-95 transition-all border border-white/10 animate-bounce group"
        >
          <Navigation size={22} fill="black" className="group-hover:rotate-12 transition-transform" />
          <span className="font-black text-xs tracking-widest font-poppins uppercase">NAVEGAR CON WAZE</span>
        </button>
      )}
    </div>
  );
};
