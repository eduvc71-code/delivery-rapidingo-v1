import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, Order, OrderStatus, ChatMessage } from '../../types';
import { 
  Clock, CheckCircle, CookingPot, Utensils, LogOut, PhoneCall, 
  History, ChefHat, AlertCircle, ShoppingBag, ShieldAlert
} from 'lucide-react';

const RESTAURANT_PARTNERS = [
  { id: 'wings_drinks', name: 'Wings & Drinks', logoUrl: 'assets/restaurants/wings_drinks.jpg', phone: '74721716' },
  { id: 'el_brete', name: 'El Brete Churrasqueria', logoUrl: 'assets/restaurants/el_brete.jpg', phone: '69376937' },
  { id: 'la_toscana_1', name: 'La Toscana Centro', logoUrl: 'assets/restaurants/la_toscana.jpg', phone: '73939626' },
  { id: 'la_toscana_2', name: 'La Toscana - Tablitas', logoUrl: 'assets/restaurants/la_toscana1.jpg', phone: '73939626' },
  { id: 'la_plazuela', name: 'La Plazuela J&C', logoUrl: 'assets/restaurants/la_plazuela.jpg', phone: '73900041' },
  { id: 'la_coqueta', name: 'La Coqueta', logoUrl: 'assets/restaurants/la_coqueta.jpg', phone: '72845195' },
  { id: 'mr_grill', name: 'Mr. Grill', logoUrl: 'assets/restaurants/mr_grill.jpg', phone: '77848655' },
  { id: 'el_benianito', name: 'Restaurante El Benianito', logoUrl: 'assets/restaurants/el_benianito.jpg', phone: '72815881' },
  { id: 'toby', name: 'Toby - Cuarto de Libra', logoUrl: 'assets/restaurants/toby.jpg', phone: '67270686' },
  { id: 'la_toscana_rapido', name: 'La Toscana - Rapido', logoUrl: 'assets/restaurants/la_toscana2.jpg', phone: '73939626' }
];

const parseRestaurantItems = (description: string, restaurantName: string): string[] => {
  const lines = description.split('\n');
  const items: string[] = [];
  let isSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toUpperCase().startsWith('RESTAURANTE:')) {
      const name = trimmed.replace(/^RESTAURANTE:\s*/i, '').trim();
      isSection = name.toLowerCase() === restaurantName.toLowerCase();
      continue;
    }

    if (isSection) {
      if (trimmed.startsWith('-')) {
        items.push(trimmed.substring(1).trim());
      } else if (trimmed.toUpperCase().startsWith('TOTAL') || trimmed.toUpperCase().startsWith('CLIENTE')) {
        isSection = false;
      }
    }
  }

  return items;
};

const getRestaurantStatus = (order: Order) => {
  let status: 'PENDING' | 'ACCEPTED' | 'READY' | 'DELIVERED' = 'PENDING';
  let prepTime = 0;
  let timestamp = 0;

  if (order.chatHistory) {
    for (const msg of order.chatHistory) {
      if (msg.isSystem) {
        if (msg.text.startsWith('RESTAURANT_STATUS:ACCEPTED:')) {
          status = 'ACCEPTED';
          prepTime = parseInt(msg.text.split(':')[2]) || 0;
          timestamp = msg.timestamp;
        } else if (msg.text === 'RESTAURANT_STATUS:READY') {
          status = 'READY';
          timestamp = msg.timestamp;
        } else if (msg.text === 'RESTAURANT_STATUS:DELIVERED') {
          status = 'DELIVERED';
          timestamp = msg.timestamp;
        }
      }
    }
  }

  return { status, prepTime, timestamp };
};

// Sub-component for individual countdown timer
const CountdownTimer: React.FC<{ acceptedAt: number; prepDurationMinutes: number }> = ({ acceptedAt, prepDurationMinutes }) => {
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
      <span className="text-brand-yellow font-black animate-pulse">
        ¡TIEMPO LIMITE EXCEDIDO!
      </span>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return (
    <span className="text-white font-mono font-black">
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
};

export const RestaurantModule: React.FC = () => {
  const { allOrders, restaurantUser, registerUser, logout, updateOrder } = useApp();
  const [activeTab, setActiveTab] = useState<'INCOMING' | 'KITCHEN' | 'DISPATCH' | 'HISTORY'>('INCOMING');
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  // Prep Time selector per orderId state
  const [selectedPrepTimes, setSelectedPrepTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const savedHistory = localStorage.getItem(`rapidEnvios_restHistory_${restaurantUser?.id || ''}`);
    if (savedHistory) {
      setLocalHistory(JSON.parse(savedHistory));
    }
  }, [restaurantUser?.id]);

  const saveToHistory = (order: Order, prepMinutes: number) => {
    const newEntry = {
      id: order.id,
      date: new Date().toLocaleString(),
      items: parseRestaurantItems(order.description, restaurantUser?.name || ''),
      driverName: order.deliveryName || 'Repartidor Trinidad',
      prepTime: prepMinutes,
    };
    const updated = [newEntry, ...localHistory].slice(0, 50); // limit 50
    setLocalHistory(updated);
    localStorage.setItem(`rapidEnvios_restHistory_${restaurantUser?.id || ''}`, JSON.stringify(updated));
  };

  // Filter orders matching this restaurant
  const restaurantOrders = useMemo(() => {
    if (!restaurantUser) return [];
    return allOrders.filter(order => {
      const items = parseRestaurantItems(order.description, restaurantUser.name);
      return items.length > 0;
    });
  }, [allOrders, restaurantUser]);

  // Tab filtering
  const incomingOrders = useMemo(() => {
    return restaurantOrders.filter(order => {
      const { status } = getRestaurantStatus(order);
      return order.status === OrderStatus.PICKING_UP && status === 'PENDING';
    });
  }, [restaurantOrders]);

  const kitchenOrders = useMemo(() => {
    return restaurantOrders.filter(order => {
      const { status } = getRestaurantStatus(order);
      return order.status === OrderStatus.PICKING_UP && status === 'ACCEPTED';
    });
  }, [restaurantOrders]);

  const dispatchOrders = useMemo(() => {
    return restaurantOrders.filter(order => {
      const { status } = getRestaurantStatus(order);
      return order.status === OrderStatus.PICKING_UP && status === 'READY';
    });
  }, [restaurantOrders]);

  // Login handler
  const handleLogin = (partner: typeof RESTAURANT_PARTNERS[number]) => {
    registerUser({
      id: partner.id,
      name: partner.name,
      phone: partner.phone,
      role: UserRole.RESTAURANT,
      email: `${partner.id}@rapidingo.com`
    });
  };

  // Accept Order
  const handleAcceptOrder = (order: Order) => {
    const prepMinutes = selectedPrepTimes[order.id] || 15;
    const systemMsg: ChatMessage = {
      id: `sys-accept-${Date.now()}`,
      senderId: 'system',
      text: `RESTAURANT_STATUS:ACCEPTED:${prepMinutes}`,
      timestamp: Date.now(),
      isSystem: true
    };
    const notificationMsg: ChatMessage = {
      id: `sys-notif-${Date.now()}`,
      senderId: 'system',
      text: `El restaurante ${restaurantUser?.name} aceptó el pedido. Listo en ${prepMinutes} minutos.`,
      timestamp: Date.now(),
      isSystem: true
    };

    updateOrder({
      ...order,
      chatHistory: [...(order.chatHistory || []), systemMsg, notificationMsg]
    });
  };

  // Mark Ready (¡PEDIDO LISTO!)
  const handleMarkReady = (order: Order) => {
    const systemMsg: ChatMessage = {
      id: `sys-ready-${Date.now()}`,
      senderId: 'system',
      text: `RESTAURANT_STATUS:READY`,
      timestamp: Date.now(),
      isSystem: true
    };
    const notificationMsg: ChatMessage = {
      id: `sys-notif-ready-${Date.now()}`,
      senderId: 'system',
      text: `¡PEDIDO LISTO! Ya puedes pasar a recogerlo en ${restaurantUser?.name}.`,
      timestamp: Date.now(),
      isSystem: true
    };

    updateOrder({
      ...order,
      chatHistory: [...(order.chatHistory || []), systemMsg, notificationMsg]
    });
  };

  // Mark Delivered to Driver (Entregado)
  const handleMarkDelivered = (order: Order) => {
    const { prepTime } = getRestaurantStatus(order);
    saveToHistory(order, prepTime);

    const systemMsg: ChatMessage = {
      id: `sys-delivered-${Date.now()}`,
      senderId: 'system',
      text: `RESTAURANT_STATUS:DELIVERED`,
      timestamp: Date.now(),
      isSystem: true
    };
    const notificationMsg: ChatMessage = {
      id: `sys-notif-deliv-${Date.now()}`,
      senderId: 'system',
      text: `Pedido retirado de ${restaurantUser?.name} por el repartidor.`,
      timestamp: Date.now(),
      isSystem: true
    };

    updateOrder({
      ...order,
      status: OrderStatus.IN_DELIVERY, // transition delivery driver to routing!
      chatHistory: [...(order.chatHistory || []), systemMsg, notificationMsg]
    });
  };

  // Login Screen if no restaurantUser
  if (!restaurantUser) {
    return (
      <div className="h-full flex flex-col bg-brand-black overflow-hidden text-white font-montserrat">
        <div className="relative shrink-0 overflow-hidden bg-brand-black px-6 pb-6 pt-10 border-b border-white/5 hexagon-pattern text-center">
          <div className="absolute right-7 top-7 h-3 w-3 rounded-full bg-brand-orange shadow-[0_0_15px_#FF6A00]"></div>
          <div className="relative flex flex-col items-center">
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-brand-orange blur-lg opacity-30 rounded-full"></div>
              <img
                src="assets/brand/rapidingo-logo.png"
                alt="Rapidingo"
                className="relative h-20 w-20 rounded-[24px] object-cover border border-white/10 shadow-2xl"
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-orange font-teko italic">PANEL INTERNO</p>
            <h1 className="text-[34px] leading-8 font-black tracking-tighter text-white font-montserrat">
              RESTAURANTES
            </h1>
            <p className="mt-1 text-[11px] font-bold text-gray-400 font-teko uppercase tracking-widest italic">INGRESO OPERATIVO</p>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
          <div className="border-l-4 border-brand-orange pl-3">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Selecciona tu Restaurante</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest font-teko italic">Trinidad - Panel de Control</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {RESTAURANT_PARTNERS.map(partner => (
              <button
                key={partner.id}
                onClick={() => handleLogin(partner)}
                className="flex items-center gap-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/5 hover:border-brand-orange/30 p-4 rounded-2xl transition-all text-left shadow-lg"
              >
                <div className="w-14 h-14 bg-white/5 rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase text-white truncate font-montserrat tracking-tight">{partner.name}</h4>
                  <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase font-teko italic mt-1">TEL: {partner.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative hexagon-pattern text-white font-montserrat">
      {/* Header */}
      <div className="bg-brand-black/90 backdrop-blur-md border-b border-brand-orange/20 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3 text-white min-w-0">
            <div className="w-12 h-12 bg-white/5 text-white rounded-xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
              <img 
                src={RESTAURANT_PARTNERS.find(p => p.id === restaurantUser.id)?.logoUrl || 'assets/brand/rapidingo-logo.png'} 
                alt="Logo" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] leading-5 font-black font-montserrat uppercase tracking-tight truncate">{restaurantUser.name}</h2>
              <p className="text-xs leading-5 font-bold text-brand-yellow uppercase tracking-[2px] font-teko italic truncate">PANEL RESTAURANTE</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-3 bg-white/5 text-brand-orange rounded-xl hover:bg-brand-orange/10 hover:text-white border border-brand-orange/20 shadow-inner active:scale-95 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 text-center">
          <button 
            onClick={() => setActiveTab('INCOMING')} 
            className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest relative ${activeTab === 'INCOMING' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
          >
            ENTRANTES
            {incomingOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white animate-bounce">
                {incomingOrders.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('KITCHEN')} 
            className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest relative ${activeTab === 'KITCHEN' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
          >
            EN COCINA
            {kitchenOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-yellow text-brand-black rounded-full flex items-center justify-center text-[8px] font-black">
                {kitchenOrders.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('DISPATCH')} 
            className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest relative ${activeTab === 'DISPATCH' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
          >
            DESPACHOS
            {dispatchOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                {dispatchOrders.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')} 
            className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest ${activeTab === 'HISTORY' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
          >
            HISTORIAL
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeTab === 'INCOMING' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {incomingOrders.map(order => {
              const items = parseRestaurantItems(order.description, restaurantUser.name);
              const prepVal = selectedPrepTimes[order.id] || 15;

              return (
                <div key={order.id} className="bg-brand-black/90 border border-white/5 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-brand-orange"></div>
                  
                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] font-teko italic">PEDIDO RECIBIDO</p>
                      <h4 className="text-xs font-black text-white font-montserrat uppercase tracking-tight mt-1">Repartidor: {order.deliveryName || 'Trinidad Repartidor'}</h4>
                    </div>
                    {order.deliveryPhone && (
                      <a 
                        href={`tel:${order.deliveryPhone}`} 
                        className="p-2 bg-white/5 border border-white/10 text-brand-orange rounded-xl hover:bg-brand-orange/20 active:scale-95 transition-all"
                      >
                        <PhoneCall size={14} />
                      </a>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 ml-2">
                    <p className="text-[9px] text-brand-yellow font-black uppercase tracking-widest font-teko italic">Platos a preparar:</p>
                    <ul className="divide-y divide-white/5 text-sm font-bold text-gray-200 font-montserrat">
                      {items.map((item, idx) => (
                        <li key={idx} className="py-1.5 first:pt-0 last:pb-0 uppercase">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Prep Time Selector */}
                  <div className="space-y-2 ml-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest font-teko italic text-gray-400">
                      <span>Tiempo estimado:</span>
                      <span className="text-brand-orange">{prepVal} minutos</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="45" 
                      step="5" 
                      value={prepVal} 
                      onChange={(e) => setSelectedPrepTimes({ ...selectedPrepTimes, [order.id]: parseInt(e.target.value) })}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-orange" 
                    />
                  </div>

                  <button
                    onClick={() => handleAcceptOrder(order)}
                    className="w-full bg-brand-orange hover:bg-brand-orange/90 active:scale-[0.98] text-white py-4 rounded-2xl font-black transition-all shadow-[0_8px_20px_rgba(255,106,0,0.2)] text-sm tracking-[3px] font-teko uppercase italic"
                  >
                    ACEPTAR Y EMPEZAR COCINA
                  </button>
                </div>
              );
            })}

            {incomingOrders.length === 0 && (
              <div className="text-center py-20 text-gray-600">
                <CookingPot size={48} className="mx-auto text-gray-700 mb-3 animate-pulse" />
                <p className="font-black font-teko uppercase tracking-widest text-sm">Esperando nuevos pedidos</p>
                <p className="text-[10px] font-bold uppercase tracking-wider font-teko italic mt-1 text-gray-500">Se mostrarán aquí cuando el repartidor esté comprando.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'KITCHEN' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {kitchenOrders.map(order => {
              const items = parseRestaurantItems(order.description, restaurantUser.name);
              const { prepTime, timestamp } = getRestaurantStatus(order);

              return (
                <div key={order.id} className="bg-brand-black/90 border border-white/5 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-brand-yellow"></div>

                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] font-teko italic">EN PREPARACIÓN</p>
                      <h4 className="text-xs font-black text-white font-montserrat uppercase tracking-tight mt-1">Repartidor: {order.deliveryName || 'Trinidad Repartidor'}</h4>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
                      <Clock size={12} className="text-brand-yellow animate-spin" />
                      <CountdownTimer acceptedAt={timestamp} prepDurationMinutes={prepTime} />
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 ml-2">
                    <p className="text-[9px] text-brand-yellow font-black uppercase tracking-widest font-teko italic">Platos en cocina:</p>
                    <ul className="divide-y divide-white/5 text-sm font-bold text-gray-200 font-montserrat">
                      {items.map((item, idx) => (
                        <li key={idx} className="py-1.5 first:pt-0 last:pb-0 uppercase">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleMarkReady(order)}
                    className="w-full bg-[#2E7D32] hover:bg-[#2E7D32]/90 active:scale-[0.98] text-white py-5 rounded-2xl font-black transition-all shadow-[0_8px_20px_rgba(46,125,50,0.3)] text-base tracking-[3px] font-teko uppercase italic animate-pulse"
                  >
                    ¡PEDIDO LISTO!
                  </button>
                </div>
              );
            })}

            {kitchenOrders.length === 0 && (
              <div className="text-center py-20 text-gray-600">
                <ChefHat size={48} className="mx-auto text-gray-700 mb-3" />
                <p className="font-black font-teko uppercase tracking-widest text-sm">No hay platos en cocina</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'DISPATCH' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {dispatchOrders.map(order => {
              const items = parseRestaurantItems(order.description, restaurantUser.name);

              return (
                <div key={order.id} className="bg-brand-black/90 border border-white/5 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#2E7D32]"></div>

                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] font-teko italic">LISTO PARA RETIRO</p>
                      <h4 className="text-xs font-black text-white font-montserrat uppercase tracking-tight mt-1">Repartidor: {order.deliveryName || 'Trinidad Repartidor'}</h4>
                    </div>
                    <div className="px-3 py-1 bg-green-900/20 border border-green-800 text-green-500 rounded-md text-[9px] font-black uppercase tracking-widest font-teko italic">
                      LISTO
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 ml-2">
                    <ul className="divide-y divide-white/5 text-sm font-bold text-gray-200 font-montserrat">
                      {items.map((item, idx) => (
                        <li key={idx} className="py-1.5 first:pt-0 last:pb-0 uppercase">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleMarkDelivered(order)}
                    className="w-full bg-brand-orange hover:bg-brand-orange/90 active:scale-[0.98] text-white py-4 rounded-2xl font-black transition-all shadow-[0_8px_20px_rgba(255,106,0,0.2)] text-sm tracking-[3px] font-teko uppercase italic"
                  >
                    ENTREGADO A DELIVERY
                  </button>
                </div>
              );
            })}

            {dispatchOrders.length === 0 && (
              <div className="text-center py-20 text-gray-600">
                <CheckCircle size={48} className="mx-auto text-gray-700 mb-3" />
                <p className="font-black font-teko uppercase tracking-widest text-sm">No hay despachos pendientes</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <h2 className="text-lg font-black text-white font-montserrat uppercase tracking-tight italic">Últimas Ventas Locales</h2>
            <div className="bg-brand-black/90 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-xs">
                <thead className="bg-white/5 text-gray-500 font-black uppercase font-teko tracking-[2px] italic border-b border-white/5">
                  <tr>
                    <th className="p-4 text-left">DETALLES</th>
                    <th className="p-4 text-right">TIEMPO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {localHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-white uppercase text-[10px] leading-tight font-montserrat">
                          {item.items.join(', ')}
                        </div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase font-teko tracking-wider mt-1">
                          {item.date} | REPARTIDOR: {item.driverName}
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-brand-yellow font-teko text-sm">
                        {item.prepTime} MIN
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {localHistory.length === 0 && (
                <div className="p-10 text-center text-gray-600 font-teko uppercase tracking-[3px] italic">
                  No hay ventas registradas
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
