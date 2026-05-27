import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, Order, OrderStatus, ChatMessage, User } from '../../types';
import {
  Clock, CheckCircle, CookingPot, Utensils, LogOut, PhoneCall,
  History, ChefHat, AlertCircle, ShoppingBag, ShieldAlert,
  Eye, EyeOff, MapPin, Check, Settings, Users, BarChart3,
  MessageSquare, ShieldCheck, Map, Coins, ArrowRight, CheckCircle2,
  Trash2, Send
} from 'lucide-react';
import { SupabasePwaApi } from '../../services/supabase';
import MapPlaceholder from '../shared/MapPlaceholder';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';

const ADMIN_PASSWORDS: Record<string, { email: string; name: string }> = {
  admin747: { email: 'admin@rapidingo.com', name: 'ADMINISTRADOR RAPIDINGO' },
  operador747: { email: 'operador@rapidingo.com', name: 'OPERADORA RAPIDINGO' }
};

const getPasswordProgress = (typed: string, correct: string): number => {
  if (!correct || !typed) return 0;
  if (typed.length > correct.length) return 0;
  if (correct.toLowerCase().startsWith(typed.toLowerCase())) {
    return typed.length / correct.length;
  }
  return 0;
};

type RestaurantCoordination = {
  restaurantId: string;
  restaurant: string;
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'DELIVERED';
  prepTime: number;
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
  RESTAURANT_ID_BY_NAME[restaurantName.trim().toLowerCase()] ||
  restaurantName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');

const getRestaurantNamesFromOrder = (description: string) => {
  const names: string[] = [];
  description.split(/\r?\n/).forEach((line) => {
    const match = line.trim().match(/^RESTAURANTE:\s*(.+)$/i);
    if (match && !names.includes(match[1].trim())) names.push(match[1].trim());
  });
  return names;
};

const getRestaurantCoordination = (order: Order): RestaurantCoordination[] => {
  return getRestaurantNamesFromOrder(order.description).map((restaurant) => {
    const restaurantId = resolveRestaurantId(restaurant);
    let status: RestaurantCoordination['status'] = 'PENDING';
    let prepTime = 0;

    (order.chatHistory || []).forEach((msg) => {
      const parts = msg.text.split(':');
      if (parts[0] === 'RESTAURANT_STATUS' && parts[1] === restaurantId) {
        if (parts[2] === 'ACCEPTED' || parts[2] === 'READY' || parts[2] === 'DELIVERED') {
          status = parts[2];
          if (parts[2] === 'ACCEPTED') prepTime = parseInt(parts[3] || '0') || 0;
        }
      }
    });

    return { restaurantId, restaurant, status, prepTime };
  });
};

const hasOperatorRestaurantRequest = (order: Order) =>
  (order.chatHistory || []).some((msg) => msg.text === 'OPERATOR_RESTAURANT_REQUEST');

// Mapa general para mostrar la ubicación de todos los repartidores
const DriversMap: React.FC<{ drivers: User[] }> = ({ drivers }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapLibreMap = useRef<any>(null);
  const markers = useRef<any[]>([]);

  useEffect(() => {
    const maplibregl = (window as Window & { maplibregl?: any }).maplibregl;
    if (!mapRef.current || !maplibregl) return;

    if (!mapLibreMap.current) {
      mapLibreMap.current = new maplibregl.Map({
        container: mapRef.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=3cP8iNk1Zj2ghLvTv5eB`,
        center: [-64.9000, -14.8336], // Trinidad, Bolivia
        zoom: 13.5,
        attributionControl: false
      });
      mapLibreMap.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    }

    const map = mapLibreMap.current;

    const renderMarkers = () => {
      // Remover marcadores viejos
      markers.current.forEach((m) => m.remove());
      markers.current = [];

      drivers.forEach((driver) => {
        if (driver.location?.lat && driver.location?.lng) {
          const el = document.createElement('div');
          el.className = `h-8 w-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
            driver.isOnline ? 'bg-[#FF6A00] animate-pulse shadow-[0_0_10px_#FF6A00]' : 'bg-gray-600'
          }`;
          el.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="18.5" r="2.5"></circle><circle cx="5.5" cy="18.5" r="2.5"></circle><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon></svg>';

          const popupContent = document.createElement('div');
          popupContent.className = 'p-2 text-brand-black font-montserrat text-xs';
          popupContent.innerHTML = `
            <p class="font-black font-montserrat uppercase">${driver.name}</p>
            <p class="text-[10px] text-gray-500 font-bold mt-0.5">TEL: ${driver.phone}</p>
            <span class="mt-1 inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white ${
              driver.isOnline ? 'bg-green-600' : 'bg-gray-500'
            }">${driver.isOnline ? 'EN LINEA' : 'DESCONECTADO'}</span>
          `;

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([driver.location.lng, driver.location.lat])
            .setPopup(new maplibregl.Popup().setDOMContent(popupContent))
            .addTo(map);

          markers.current.push(marker);
        }
      });
    };

    if (map.loaded()) {
      renderMarkers();
    } else {
      map.once('load', renderMarkers);
    }
  }, [drivers]);

  return (
    <div className="relative w-full h-80 bg-slate-900 rounded-3xl overflow-hidden border border-white/5 shadow-2xl z-0">
      <div ref={mapRef} className="w-full h-full" style={{ zIndex: 0 }} />
      <div className="absolute top-3 right-3 bg-brand-black/90 backdrop-blur border border-white/10 px-3 py-1 rounded-xl text-[9px] font-black shadow-lg text-brand-yellow font-teko tracking-widest italic uppercase z-10">
        Conductores en Vivo
      </div>
    </div>
  );
};

export const AdminModule: React.FC<{ role?: UserRole }> = ({ role = UserRole.ADMIN }) => {
  const { allOrders, adminUser, operatorUser, registerUser, logout, updateOrder, playNotificationSound } = useApp();
  
  // Si cualquiera de las dos sesiones de gestión está activa, la usamos.
  // Esto permite iniciar sesión como operadora desde la página de administración y viceversa.
  const currentUser = adminUser || operatorUser;
  const isAdmin = adminUser !== null;
  
  const [activeTab, setActiveTab] = useState<'MONITOREO' | 'MAPA' | 'CONDUCTORES' | 'METRICAS'>('MONITOREO');
  
  // Modos de despacho global
  const [dispatchMode, setDispatchMode] = useState<'AUTOMATIC' | 'OPERATOR'>('AUTOMATIC');
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  
  // Login states
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Todos los usuarios
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Pedido seleccionado para inspección
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Cotizaciones de operadora
  const [productQuotePrice, setProductQuotePrice] = useState('');
  const [serviceQuotePrice, setServiceQuotePrice] = useState('');
  
  // Conductor seleccionado para asignar
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Mensaje manual del chat del operador
  const [operatorMsg, setOperatorMsg] = useState('');

  // Cargar modo de despacho de Supabase al montar
  useEffect(() => {
    if (currentUser) {
      SupabasePwaApi.getDispatchMode().then((mode) => {
        setDispatchMode(mode as 'AUTOMATIC' | 'OPERATOR');
      });
      loadSystemUsers();
    }
  }, [currentUser]);

  const loadSystemUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await SupabasePwaApi.getAllUsers();
      setSystemUsers(users);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleDispatchMode = async () => {
    setIsUpdatingMode(true);
    const nextMode = dispatchMode === 'AUTOMATIC' ? 'OPERATOR' : 'AUTOMATIC';
    try {
      await SupabasePwaApi.setDispatchMode(nextMode);
      setDispatchMode(nextMode);
      playNotificationSound();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleConfirmAuth = () => {
    const matchedKey = Object.keys(ADMIN_PASSWORDS).find(
      (key) => key.toLowerCase() === authPassword.toLowerCase()
    );

    if (matchedKey) {
      const data = ADMIN_PASSWORDS[matchedKey];
      const targetRole = matchedKey === 'admin747' ? UserRole.ADMIN : UserRole.OPERATOR;

      registerUser({
        id: matchedKey,
        name: data.name,
        phone: '59170000000',
        role: targetRole,
        email: data.email
      });
      setAuthPassword('');
      setAuthError('');
      setShowPassword(false);
    } else {
      setAuthError('CONTRASEÑA INVALIDA');
    }
  };

  // Listar pedidos filtrados
  const ordersList = useMemo(() => {
    return allOrders.filter(o => o.status !== OrderStatus.DRAFT);
  }, [allOrders]);

  const activeOrders = useMemo(() => {
    return ordersList.filter(
      (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED
    );
  }, [ordersList]);

  const completedCount = useMemo(() => {
    return ordersList.filter((o) => o.status === OrderStatus.COMPLETED).length;
  }, [ordersList]);

  const totalEarnings = useMemo(() => {
    return ordersList
      .filter((o) => o.status === OrderStatus.COMPLETED)
      .reduce((acc, curr) => acc + (curr.servicePrice || 0), 0);
  }, [ordersList]);

  const selectedOrder = useMemo(() => {
    return ordersList.find((o) => o.id === selectedOrderId) || null;
  }, [ordersList, selectedOrderId]);

  // Lista de conductores en línea
  const onlineDrivers = useMemo(() => {
    return systemUsers.filter((u) => u.role === UserRole.DELIVERY && u.isOnline);
  }, [systemUsers]);

  // Enviar cotización desde la operadora
  const handleSendQuote = async (order: Order) => {
    const prod = parseFloat(productQuotePrice) || 0;
    const serv = parseFloat(serviceQuotePrice) || 0;
    if (serv <= 0) {
      alert('Debes ingresar un costo de envío válido.');
      return;
    }

    const systemMsg: ChatMessage = {
      id: `sys-quote-${Date.now()}`,
      senderId: 'system',
      text: `OPERATOR_QUOTE:PRODUCT:${prod}:SERVICE:${serv}`,
      timestamp: Date.now(),
      isSystem: true
    };

    const notifMsg: ChatMessage = {
      id: `sys-notif-${Date.now()}`,
      senderId: 'system',
      text: `Operación cotizó tu pedido. Costo de productos: Bs. ${prod}, Costo de envío: Bs. ${serv}. Por favor, confirma.`,
      timestamp: Date.now(),
      isSystem: true
    };

    const updated: Order = {
      ...order,
      productPrice: prod,
      servicePrice: serv,
      totalPrice: prod + serv,
      status: OrderStatus.WAITING_CONFIRM,
      chatHistory: [...(order.chatHistory || []), systemMsg, notifMsg]
    };

    try {
      await updateOrder(updated);
      setProductQuotePrice('');
      setServiceQuotePrice('');
      playNotificationSound();
    } catch (e) {
      alert('Error enviando cotización.');
    }
  };

  const handleRequestRestaurantPreparation = async (order: Order) => {
    const now = Date.now();
    const systemMsg: ChatMessage = {
      id: `sys-restaurant-request-${now}`,
      senderId: 'system',
      text: 'OPERATOR_RESTAURANT_REQUEST',
      timestamp: now,
      isSystem: true
    };
    const notifMsg: ChatMessage = {
      id: `sys-restaurant-request-note-${now}`,
      senderId: 'system',
      text: 'Operadora envio el pedido al restaurante. Esperando tiempo de preparacion.',
      timestamp: now,
      isSystem: true
    };

    try {
      await updateOrder({
        ...order,
        status: OrderStatus.PICKING_UP,
        chatHistory: [...(order.chatHistory || []), systemMsg, notifMsg]
      });
      playNotificationSound();
    } catch (e) {
      alert('Error enviando el pedido al restaurante.');
    }
  };

  // Asignar conductor manualmente
  const handleAssignDriver = async (order: Order) => {
    if (!selectedDriverId) {
      alert('Selecciona un repartidor.');
      return;
    }

    const driver = onlineDrivers.find((d) => d.id === selectedDriverId);
    if (!driver) return;

    const systemMsg: ChatMessage = {
      id: `sys-assign-${Date.now()}`,
      senderId: 'system',
      text: `OPERATOR_ASSIGN:${driver.id}`,
      timestamp: Date.now(),
      isSystem: true
    };

    const coordination = getRestaurantCoordination(order);
    const acceptedPrepTimes = coordination
      .filter((restaurant) => restaurant.status === 'ACCEPTED' || restaurant.status === 'READY')
      .map((restaurant) => `${restaurant.restaurant}: ${restaurant.prepTime || 0} min`)
      .join(' | ');

    const notifMsg: ChatMessage = {
      id: `sys-notif-assign-${Date.now()}`,
      senderId: 'system',
      text: `Repartidor asignado: ${driver.name} (Tel: ${driver.phone}). ${acceptedPrepTimes ? `Tiempo restaurante: ${acceptedPrepTimes}. ` : ''}Destino final: ubicacion del cliente.`,
      timestamp: Date.now(),
      isSystem: true
    };

    const updated: Order = {
      ...order,
      deliveryId: driver.id,
      deliveryName: driver.name,
      deliveryPhone: driver.phone,
      targetDeliveryId: driver.id,
      status: OrderStatus.PICKING_UP,
      chatHistory: [...(order.chatHistory || []), systemMsg, notifMsg]
    };

    try {
      await updateOrder(updated);
      setSelectedDriverId('');
      playNotificationSound();
    } catch (e) {
      alert('Error asignando conductor.');
    }
  };

  // Enviar mensaje en chat de la orden (como operadora)
  const handleSendOperatorChat = async (order: Order) => {
    if (!operatorMsg.trim()) return;

    const chatMsg: ChatMessage = {
      id: `op-msg-${Date.now()}`,
      senderId: currentUser?.id || 'admin',
      text: `[SOPORTE OPERADORA]: ${operatorMsg.trim()}`,
      timestamp: Date.now()
    };

    const updated: Order = {
      ...order,
      chatHistory: [...(order.chatHistory || []), chatMsg]
    };

    try {
      await updateOrder(updated);
      setOperatorMsg('');
    } catch (e) {
      alert('Error al enviar el mensaje.');
    }
  };

  // Toggle verificación conductor
  const handleToggleVerification = async (user: User) => {
    const updatedUser = {
      ...user,
      isVerified: !user.isVerified
    };

    try {
      await SupabasePwaApi.upsertUser(updatedUser);
      setSystemUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updatedUser : u))
      );
      playNotificationSound();
    } catch (e) {
      alert('Error actualizando estado.');
    }
  };

  // Forzar completar o cancelar
  const handleForceStatus = async (order: Order, nextStatus: OrderStatus.COMPLETED | OrderStatus.CANCELLED) => {
    if (!confirm(`¿Está seguro de forzar el pedido a ${nextStatus === OrderStatus.COMPLETED ? 'COMPLETADO' : 'CANCELADO'}?`)) {
      return;
    }

    const updated: Order = {
      ...order,
      status: nextStatus
    };

    try {
      await updateOrder(updated);
      setSelectedOrderId(null);
      playNotificationSound();
    } catch (e) {
      alert('Error actualizando pedido.');
    }
  };

  // Datos para Recharts
  const statsByCategory = useMemo(() => {
    const comida = allOrders.filter(o => o.status === OrderStatus.COMPLETED && (o.category === 'COMIDA' || o.description.includes('RESTAURANTE:'))).length;
    const farmacia = allOrders.filter(o => o.status === OrderStatus.COMPLETED && o.category === 'FARMACIA').length;
    const otros = allOrders.filter(o => o.status === OrderStatus.COMPLETED && o.category !== 'COMIDA' && o.category !== 'FARMACIA' && !o.description.includes('RESTAURANTE:')).length;

    return [
      { name: 'Comida', cantidad: comida, color: '#FF6A00' },
      { name: 'Farmacia', cantidad: farmacia, color: '#FFC107' },
      { name: 'Otros', cantidad: otros, color: '#00F0FF' }
    ];
  }, [allOrders]);

  // Si no está logueado el Admin/Operador, mostrar pantalla de login
  if (!currentUser) {
    const isRoleAdmin = role === UserRole.ADMIN;
    return (
      <div className="h-full flex flex-col bg-brand-black overflow-hidden text-white font-montserrat">
        <div className="relative shrink-0 overflow-hidden bg-brand-black px-6 pb-6 pt-10 border-b border-white/5 hexagon-pattern text-center">
          <div className="absolute right-7 top-7 h-3 w-3 rounded-full bg-brand-yellow shadow-[0_0_15px_#FFC107]"></div>
          <div className="relative flex flex-col items-center">
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-brand-orange blur-lg opacity-30 rounded-full animate-pulse"></div>
              <img
                src="assets/brand/rapidingo-logo.png"
                alt="Rapidingo"
                className="relative h-20 w-20 rounded-[24px] object-cover border border-white/10 shadow-2xl"
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-orange font-teko italic">CENTRO CONTROL</p>
            <h1 className="text-[26px] leading-8 font-black tracking-tighter text-white font-montserrat">
              {isRoleAdmin ? 'ADMINISTRACION' : 'OPERADORA'}
            </h1>
            <p className="mt-1 text-[11px] font-bold text-gray-400 font-teko uppercase tracking-widest italic">
              {isRoleAdmin ? 'DIRECCION GENERAL' : 'MONITOREO DE DESPACHOS'}
            </p>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto no-scrollbar flex items-center justify-center">
          {(() => {
            let bestMatchProgress = 0;
            let bestMatchLabel = isRoleAdmin ? 'ACCESO ADMINISTRADOR' : 'ACCESO OPERATIVO';

            if (authPassword) {
              // Buscar coincidencia parcial con cualquiera de las contraseñas para efectos visuales
              const matchedKey = Object.keys(ADMIN_PASSWORDS).find(
                (key) => key.toLowerCase().startsWith(authPassword.toLowerCase())
              );
              if (matchedKey) {
                const progress = getPasswordProgress(authPassword, matchedKey);
                bestMatchProgress = progress;
                bestMatchLabel = ADMIN_PASSWORDS[matchedKey].name;
              }
            }

            return (
              <div className="w-full max-w-sm bg-brand-black/95 border border-brand-orange/30 p-6 rounded-[2rem] space-y-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative overflow-hidden animate-scale-up">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-orange via-brand-yellow to-brand-orange"></div>

                <div className="flex flex-col items-center text-center space-y-3">
                  <div>
                    <h2 className="text-2xl font-black text-brand-orange font-montserrat tracking-tight italic">¡INGRESO!</h2>
                    <h3 className="text-sm font-black uppercase text-white font-montserrat tracking-tight mt-1 h-7">
                      {bestMatchLabel}
                    </h3>
                    <p className="text-[10px] text-brand-yellow font-black uppercase tracking-[3px] font-teko italic mt-1">INGRESE PIN / CONTRASEÑA</p>
                  </div>

                  <div className="w-64 h-48 flex items-center justify-center relative my-4">
                    <div className="relative w-44 h-44 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-2xl transition-all duration-300">
                      <div className="absolute inset-0 bg-brand-orange/10 blur-xl rounded-full"></div>
                      <Settings
                        size={64}
                        className={`text-brand-orange ${bestMatchProgress > 0 ? 'animate-spin' : ''}`}
                        style={{ animationDuration: `${3 - bestMatchProgress * 2.5}s` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={authPassword}
                      onChange={(e) => {
                        setAuthPassword(e.target.value);
                        setAuthError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmAuth();
                      }}
                      placeholder="••••••••"
                      className="w-full text-center pl-12 pr-12 py-4 bg-brand-black/80 border-2 border-white/5 focus:border-brand-orange rounded-2xl font-bold text-lg text-white outline-none transition-all font-montserrat tracking-[0.2em] placeholder:tracking-normal placeholder:text-gray-800 shadow-inner"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-orange active:scale-95 transition-all p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {authError && (
                    <p className="text-red-500 font-bold text-[10px] text-center uppercase tracking-widest font-teko italic animate-bounce">
                      {authError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleConfirmAuth}
                  disabled={!authPassword}
                  className="w-full bg-brand-orange text-white py-4 rounded-2xl font-teko italic uppercase tracking-[3px] text-sm font-black shadow-[0_8px_20px_rgba(255,106,0,0.3)] hover:bg-brand-orange/90 active:scale-95 transition-all disabled:opacity-30"
                >
                  INGRESAR AL PANEL
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative hexagon-pattern text-white font-montserrat">
      {/* Header */}
      <div className="bg-brand-black/90 backdrop-blur-md border-b border-brand-orange/20 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-[17px] leading-5 font-black font-montserrat uppercase tracking-tight text-white">{currentUser.name}</h2>
            <p className="text-xs leading-5 font-bold text-brand-yellow uppercase tracking-[2px] font-teko italic">
              {isAdmin ? 'CENTRO GENERAL DE CONTROL' : 'MONITOREO DE DESPACHOS'}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="p-3 bg-white/5 text-brand-orange rounded-xl hover:bg-brand-orange/10 hover:text-white border border-brand-orange/20 shadow-inner active:scale-95 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Global Dispatch Switch */}
        <div className="bg-brand-black/70 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-brand-orange animate-spin-slow" />
            <div>
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-teko italic leading-tight">MODO DE DESPACHO</p>
              <p className="text-xs font-black text-white font-montserrat uppercase tracking-tight mt-0.5">
                {dispatchMode === 'AUTOMATIC' ? 'Flujo A: Automático' : 'Flujo B: Operadora'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleToggleDispatchMode}
              disabled={isUpdatingMode}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest font-teko italic transition-all ${
                dispatchMode === 'AUTOMATIC'
                  ? 'bg-brand-yellow text-brand-black shadow-[0_0_12px_rgba(255,193,7,0.3)]'
                  : 'bg-brand-orange text-white shadow-[0_0_12px_rgba(255,106,0,0.3)]'
              }`}
            >
              {isUpdatingMode ? 'CAMBIANDO...' : 'INTERRUMPIR'}
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 text-center">
          <button
            onClick={() => { setActiveTab('MONITOREO'); setSelectedOrderId(null); }}
            className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest relative ${activeTab === 'MONITOREO' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
          >
            MONITOREO
            {activeOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('MAPA')}
            className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest relative ${activeTab === 'MAPA' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
          >
            MAPA GPS
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => { setActiveTab('CONDUCTORES'); loadSystemUsers(); }}
                className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest relative ${activeTab === 'CONDUCTORES' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
              >
                MOTORIZADOS
              </button>
              <button
                onClick={() => setActiveTab('METRICAS')}
                className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest ${activeTab === 'METRICAS' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}
              >
                METRICAS
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        
        {/* MONITOREO TAB */}
        {activeTab === 'MONITOREO' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Resumen KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-black/90 border border-white/5 p-3 rounded-2xl text-center">
                <ShoppingBag size={18} className="mx-auto text-brand-orange mb-1" />
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-teko italic">PEDIDOS HOY</p>
                <p className="text-lg font-black text-white font-montserrat mt-0.5">{ordersList.length}</p>
              </div>
              <div className="bg-brand-black/90 border border-white/5 p-3 rounded-2xl text-center">
                <Users size={18} className="mx-auto text-brand-yellow mb-1" />
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-teko italic">EN LINEA</p>
                <p className="text-lg font-black text-white font-montserrat mt-0.5">{onlineDrivers.length}</p>
              </div>
              <div className="bg-brand-black/90 border border-white/5 p-3 rounded-2xl text-center">
                <Coins size={18} className="mx-auto text-[#00F0FF] mb-1" />
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-teko italic">RECAUDADO</p>
                <p className="text-lg font-black text-white font-montserrat mt-0.5">Bs.{totalEarnings}</p>
              </div>
            </div>

            {/* Listado / Visor de Pedido */}
            {!selectedOrderId ? (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-brand-yellow font-teko tracking-[3px] italic">Pedidos Activos</h3>
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setProductQuotePrice(order.productPrice?.toString() || '');
                      setServiceQuotePrice(order.servicePrice?.toString() || '');
                    }}
                    className="bg-brand-black/90 border border-white/5 rounded-3xl p-4 shadow-2xl space-y-3 relative overflow-hidden group cursor-pointer hover:border-brand-orange/30 transition-all"
                  >
                    <div className={`absolute top-0 left-0 w-2 h-full ${
                      order.status === OrderStatus.PENDING_PRICE ? 'bg-red-500' :
                      order.status === OrderStatus.WAITING_CONFIRM ? 'bg-brand-yellow' : 'bg-green-500'
                    }`}></div>
                    
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-white/5 rounded-md text-[8px] font-black text-brand-orange font-teko tracking-widest italic uppercase">
                            ID: {order.id.slice(-4)}
                          </span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">{order.type}</span>
                        </div>
                        <h4 className="text-xs font-black text-white font-montserrat uppercase mt-1 truncate max-w-[200px]">
                          {order.description}
                        </h4>
                      </div>
                      <span className="px-2 py-1 bg-white/5 border border-white/5 text-[8px] font-black text-brand-yellow rounded-md uppercase tracking-wider font-teko italic">
                        {order.status === OrderStatus.PENDING_PRICE ? 'POR COTIZAR' :
                         order.status === OrderStatus.WAITING_CONFIRM ? 'COTIZADO' : 'EN PROCESO'}
                      </span>
                    </div>

                    <div className="pl-2 flex justify-between items-center text-[10px] font-bold text-gray-400 font-teko uppercase tracking-widest italic">
                      <p>Cliente: {order.clientName || 'Cliente Trinidad'}</p>
                      {order.deliveryName && <p>Asignado: {order.deliveryName}</p>}
                    </div>
                  </div>
                ))}

                {activeOrders.length === 0 && (
                  <div className="text-center py-20 text-gray-600">
                    <CookingPot size={48} className="mx-auto text-gray-700 mb-3" />
                    <p className="font-black font-teko uppercase tracking-widest text-sm">No hay pedidos activos</p>
                  </div>
                )}
              </div>
            ) : (
              // Detalle del pedido seleccionado
              selectedOrder && (
                <div className="bg-brand-black/95 border border-white/5 rounded-[2.5rem] p-5 shadow-3xl space-y-4 animate-scale-up">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <button
                      onClick={() => setSelectedOrderId(null)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black font-teko uppercase tracking-widest italic text-brand-orange"
                    >
                      Atrás
                    </button>
                    <span className="text-xs font-black text-brand-yellow font-teko tracking-widest italic uppercase">
                      PEDIDO {selectedOrder.id.slice(-4)}
                    </span>
                  </div>

                  {/* Info básica */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[2px] font-teko italic">Detalles</p>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-xs font-bold text-white uppercase">{selectedOrder.description}</p>
                      <div className="flex justify-between text-[11px] font-bold text-brand-yellow font-teko uppercase tracking-widest italic pt-2 border-t border-white/5">
                        <span>Costo Productos: Bs.{selectedOrder.productPrice || 0}</span>
                        <span>Costo Envío: Bs.{selectedOrder.servicePrice || 0}</span>
                        <span className="text-white">Total: Bs.{selectedOrder.totalPrice || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Participantes */}
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-gray-300 font-teko uppercase tracking-widest italic">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                      <p className="text-brand-orange text-[9px] font-black">Cliente:</p>
                      <p className="text-white truncate">{selectedOrder.clientName || 'Cliente Trinidad'}</p>
                      {selectedOrder.clientPhone && (
                        <a href={`https://wa.me/${selectedOrder.clientPhone}`} target="_blank" rel="noreferrer" className="text-brand-yellow hover:underline block truncate">
                          WA: {selectedOrder.clientPhone}
                        </a>
                      )}
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                      <p className="text-[#00F0FF] text-[9px] font-black">Repartidor:</p>
                      <p className="text-white truncate">{selectedOrder.deliveryName || 'NO ASIGNADO'}</p>
                      {selectedOrder.deliveryPhone && (
                        <a href={`https://wa.me/${selectedOrder.deliveryPhone}`} target="_blank" rel="noreferrer" className="text-brand-yellow hover:underline block truncate">
                          WA: {selectedOrder.deliveryPhone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Operadora para Flujo B */}
                  {dispatchMode === 'OPERATOR' && (
                    <div className="bg-white/5 p-4 rounded-3xl border border-brand-orange/20 space-y-3">
                      <p className="text-[10px] text-brand-orange font-black uppercase tracking-[2px] font-teko italic">Acciones Operadora</p>
                      {(() => {
                        const coordination = getRestaurantCoordination(selectedOrder);
                        const isRestaurantOrder = coordination.length > 0;
                        const restaurantRequested = hasOperatorRestaurantRequest(selectedOrder);
                        const restaurantsAccepted = coordination.length > 0 && coordination.every((restaurant) =>
                          restaurant.status === 'ACCEPTED' || restaurant.status === 'READY' || restaurant.status === 'DELIVERED'
                        );
                        const canAssignDriver = selectedOrder.status === OrderStatus.CONFIRMED_BY_CLIENT
                          ? !isRestaurantOrder
                          : selectedOrder.status === OrderStatus.PICKING_UP && (!isRestaurantOrder || restaurantsAccepted);

                        return (
                          <div className="space-y-3">
                            {selectedOrder.status === OrderStatus.PENDING_PRICE && (
                              <div className="space-y-3">
                                <p className="text-[9px] font-bold text-gray-400 uppercase font-teko italic">1. Cotizar Pedido al Cliente</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {[5, 7, 10].map((fee) => (
                                    <button
                                      key={fee}
                                      onClick={() => setServiceQuotePrice(String(fee))}
                                      className="py-2 rounded-xl bg-brand-orange/15 border border-brand-orange/30 text-brand-orange text-[10px] font-black font-teko uppercase tracking-widest italic"
                                    >
                                      Bs. {fee}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    placeholder="Precio Platos Bs."
                                    value={productQuotePrice}
                                    onChange={(e) => setProductQuotePrice(e.target.value)}
                                    className="flex-1 bg-brand-black/60 border border-white/10 rounded-xl px-3 py-2 text-center text-xs font-bold text-white outline-none focus:border-brand-orange"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Costo Envio Bs."
                                    value={serviceQuotePrice}
                                    onChange={(e) => setServiceQuotePrice(e.target.value)}
                                    className="flex-1 bg-brand-black/60 border border-white/10 rounded-xl px-3 py-2 text-center text-xs font-bold text-white outline-none focus:border-brand-orange"
                                  />
                                </div>
                                <button
                                  onClick={() => handleSendQuote(selectedOrder)}
                                  className="w-full py-3 bg-brand-orange text-white rounded-2xl font-teko uppercase tracking-widest italic text-xs font-black"
                                >
                                  ENVIAR COTIZACION
                                </button>
                              </div>
                            )}

                            {selectedOrder.status === OrderStatus.CONFIRMED_BY_CLIENT && isRestaurantOrder && !restaurantRequested && (
                              <div className="space-y-3 animate-in fade-in">
                                <p className="text-[9px] font-bold text-gray-400 uppercase font-teko italic">2. Enviar pedido al restaurante</p>
                                <button
                                  onClick={() => handleRequestRestaurantPreparation(selectedOrder)}
                                  className="w-full py-3 bg-brand-yellow text-brand-black rounded-2xl font-teko uppercase tracking-widest italic text-xs font-black"
                                >
                                  PEDIR A RESTAURANTE
                                </button>
                              </div>
                            )}

                            {isRestaurantOrder && restaurantRequested && (
                              <div className="space-y-2">
                                <p className="text-[9px] font-bold text-gray-400 uppercase font-teko italic">Estado restaurante</p>
                                {coordination.map((restaurant) => (
                                  <div key={restaurant.restaurantId} className="bg-brand-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-black text-white uppercase font-montserrat truncate">{restaurant.restaurant}</span>
                                    <span className="text-[9px] font-black text-brand-yellow uppercase tracking-widest font-teko italic">
                                      {restaurant.status === 'ACCEPTED' ? `ACEPTADO ${restaurant.prepTime} MIN` :
                                       restaurant.status === 'READY' ? 'LISTO' :
                                       restaurant.status === 'DELIVERED' ? 'RECOGIDO' : 'ESPERANDO'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {canAssignDriver && !selectedOrder.deliveryId && (
                              <div className="space-y-3 animate-in fade-in">
                                <p className="text-[9px] font-bold text-gray-400 uppercase font-teko italic">3. Asignar Conductor Libre</p>
                                <select
                                  value={selectedDriverId}
                                  onChange={(e) => setSelectedDriverId(e.target.value)}
                                  className="w-full bg-brand-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-orange"
                                >
                                  <option value="">-- SELECCIONAR REPARTIDOR --</option>
                                  {onlineDrivers.map((driver) => (
                                    <option key={driver.id} value={driver.id}>
                                      {driver.name.toUpperCase()} (Online)
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleAssignDriver(selectedOrder!)}
                                  disabled={!selectedDriverId}
                                  className="w-full py-3 bg-[#2E7D32] disabled:opacity-30 text-white rounded-2xl font-teko uppercase tracking-widest italic text-xs font-black"
                                >
                                  ASIGNAR CONDUCTOR
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* Caso 1: Ingresar precios de Cotización (Pendiente de precio) */}
                      {false && selectedOrder!.status === OrderStatus.PENDING_PRICE && (
                        <div className="space-y-3">
                          <p className="text-[9px] font-bold text-gray-400 uppercase font-teko italic">1. Cotizar Pedido al Cliente</p>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="Precio Platos Bs."
                              value={productQuotePrice}
                              onChange={(e) => setProductQuotePrice(e.target.value)}
                              className="flex-1 bg-brand-black/60 border border-white/10 rounded-xl px-3 py-2 text-center text-xs font-bold text-white outline-none focus:border-brand-orange"
                            />
                            <input
                              type="number"
                              placeholder="Costo Envío Bs."
                              value={serviceQuotePrice}
                              onChange={(e) => setServiceQuotePrice(e.target.value)}
                              className="flex-1 bg-brand-black/60 border border-white/10 rounded-xl px-3 py-2 text-center text-xs font-bold text-white outline-none focus:border-brand-orange"
                            />
                          </div>
                          <button
                            onClick={() => handleSendQuote(selectedOrder!)}
                            className="w-full py-3 bg-brand-orange text-white rounded-2xl font-teko uppercase tracking-widest italic text-xs font-black"
                          >
                            ENVIAR COTIZACION
                          </button>
                        </div>
                      )}

                      {/* Caso 2: Asignar Repartidor (Cuando el cliente ya aceptó) */}
                      {false && selectedOrder!.status === OrderStatus.CONFIRMED_BY_CLIENT && (
                        <div className="space-y-3 animate-in fade-in">
                          <p className="text-[9px] font-bold text-gray-400 uppercase font-teko italic">2. Asignar Conductor Libre</p>
                          <select
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="w-full bg-brand-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-orange"
                          >
                            <option value="">-- SELECCIONAR REPARTIDOR --</option>
                            {onlineDrivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name.toUpperCase()} (Online)
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignDriver(selectedOrder!)}
                            disabled={!selectedDriverId}
                            className="w-full py-3 bg-[#2E7D32] disabled:opacity-30 text-white rounded-2xl font-teko uppercase tracking-widest italic text-xs font-black"
                          >
                            ASIGNAR CONDUCTOR
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mapa de ruta y tracking */}
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[2px] font-teko italic">GPS En Vivo</p>
                    <MapPlaceholder order={selectedOrder} />
                  </div>

                  {/* Chat Auditable */}
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-3">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[2px] font-teko italic flex items-center gap-1.5">
                      <MessageSquare size={12} />
                      Auditoría de Chat en Vivo
                    </p>
                    <div className="h-44 overflow-y-auto no-scrollbar space-y-2 border border-white/5 p-3 rounded-2xl bg-brand-black/40">
                      {selectedOrder.chatHistory && selectedOrder.chatHistory.map((msg) => (
                        <div key={msg.id} className={`p-2 rounded-xl text-[10px] font-bold ${
                          msg.isSystem ? 'bg-white/5 text-gray-500 text-center uppercase tracking-wider font-teko' :
                          msg.senderId === selectedOrder.clientId ? 'bg-brand-orange/10 text-brand-orange border border-brand-orange/20 mr-10' :
                          msg.senderId === selectedOrder.deliveryId ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 ml-10' :
                          'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 text-center font-bold'
                        }`}>
                          {!msg.isSystem && (
                            <span className="block text-[8px] text-gray-500 font-black mb-0.5">
                              {msg.senderId === selectedOrder.clientId ? 'CLIENTE' :
                               msg.senderId === selectedOrder.deliveryId ? 'REPARTIDOR' : 'OPERADORA'}
                            </span>
                          )}
                          {msg.text}
                        </div>
                      ))}
                      {(!selectedOrder.chatHistory || selectedOrder.chatHistory.length === 0) && (
                        <p className="text-center text-gray-700 text-[10px] font-black uppercase font-teko tracking-widest pt-10">Sin conversación</p>
                      )}
                    </div>

                    {/* Envío de Mensaje de Soporte */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Mensaje de soporte..."
                        value={operatorMsg}
                        onChange={(e) => setOperatorMsg(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendOperatorChat(selectedOrder); }}
                        className="flex-1 bg-brand-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-brand-orange"
                      />
                      <button
                        onClick={() => handleSendOperatorChat(selectedOrder)}
                        className="p-2 bg-brand-orange text-white rounded-xl active:scale-95 transition-all"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Botones de fuerza operativa */}
                  {isAdmin && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleForceStatus(selectedOrder, OrderStatus.COMPLETED)}
                        className="flex-1 py-3 bg-[#2E7D32] hover:bg-[#2E7D32]/95 text-white rounded-2xl font-teko uppercase tracking-widest italic text-xs font-black shadow-lg"
                      >
                        FORZAR ENTRADO / COMPLETAR
                      </button>
                      <button
                        onClick={() => handleForceStatus(selectedOrder, OrderStatus.CANCELLED)}
                        className="px-3 py-3 bg-red-800/80 hover:bg-red-800 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* MAPA TAB */}
        {activeTab === 'MAPA' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="text-xs font-black uppercase text-brand-yellow font-teko tracking-[3px] italic">Mapa Trinidad</h3>
            <DriversMap drivers={onlineDrivers} />
            <div className="bg-brand-black/90 border border-white/5 rounded-3xl p-4 space-y-3">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[2px] font-teko italic">Leyenda</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-300 font-teko uppercase tracking-widest italic">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#FF6A00] animate-pulse"></span>
                  <span>Repartidor En Línea</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-gray-600"></span>
                  <span>Desconectado</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONDUCTORES TAB */}
        {activeTab === 'CONDUCTORES' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-brand-yellow font-teko tracking-[3px] italic">Directorio de Motorizados</h3>
              <button
                onClick={loadSystemUsers}
                className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-black font-teko uppercase tracking-widest italic text-brand-orange"
              >
                Actualizar
              </button>
            </div>

            <div className="space-y-3">
              {systemUsers
                .filter((u) => u.role === UserRole.DELIVERY)
                .map((user) => (
                  <div
                    key={user.id}
                    className="bg-brand-black/90 border border-white/5 rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4 relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Selfie */}
                      <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {user.selfie ? (
                          <img src={user.selfie} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <ChefHat size={20} className="text-gray-600 animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0 font-teko uppercase tracking-wider italic">
                        <p className="text-sm font-black text-white truncate leading-tight">{user.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold truncate">Telf: {user.phone}</p>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[7px] font-black ${
                          user.isOnline ? 'bg-green-950/20 text-green-500 border border-green-500/20' : 'bg-gray-800 text-gray-500'
                        }`}>
                          {user.isOnline ? 'EN LINEA' : 'DESCONECTADO'}
                        </span>
                      </div>
                    </div>

                    {/* Switch de Verificación */}
                    <button
                      onClick={() => handleToggleVerification(user)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest font-teko italic transition-all ${
                        user.isVerified
                          ? 'bg-[#2E7D32] text-white border border-[#2E7D32]'
                          : 'bg-white/5 text-brand-orange border border-brand-orange/20'
                      }`}
                    >
                      {user.isVerified ? 'VERIFICADO' : 'NO VERIFICADO'}
                    </button>
                  </div>
                ))}

              {systemUsers.filter((u) => u.role === UserRole.DELIVERY).length === 0 && (
                <div className="text-center py-20 text-gray-600">
                  {isLoadingUsers ? (
                    <Clock size={48} className="mx-auto text-gray-700 mb-3 animate-spin" />
                  ) : (
                    <Users size={48} className="mx-auto text-gray-700 mb-3" />
                  )}
                  <p className="font-black font-teko uppercase tracking-widest text-sm">
                    {isLoadingUsers ? 'Cargando directorio...' : 'No hay repartidores'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* METRICAS TAB */}
        {activeTab === 'METRICAS' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <h3 className="text-xs font-black uppercase text-brand-yellow font-teko tracking-[3px] italic">Rendimiento Operativo</h3>
            
            {/* Gráfico 1: Categorías */}
            <div className="bg-brand-black/90 border border-white/5 p-4 rounded-3xl shadow-2xl space-y-3">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[2px] font-teko italic">Volumen por Categoría</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsByCategory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis dataKey="name" stroke="#666666" fontSize={10} tickLine={false} />
                    <YAxis stroke="#666666" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: 10, fontFamily: 'Montserrat' }} />
                    <Bar dataKey="cantidad" fill="#FF6A00" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Ganancias */}
            <div className="bg-brand-black/90 border border-white/5 p-4 rounded-3xl shadow-2xl space-y-3">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[2px] font-teko italic">Ingresos de Empresa (Bs.)</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: 'Lun', Bs: totalEarnings * 0.15 },
                    { name: 'Mar', Bs: totalEarnings * 0.25 },
                    { name: 'Mie', Bs: totalEarnings * 0.35 },
                    { name: 'Jue', Bs: totalEarnings * 0.50 },
                    { name: 'Vie', Bs: totalEarnings * 0.70 },
                    { name: 'Sab', Bs: totalEarnings * 0.90 },
                    { name: 'Dom', Bs: totalEarnings }
                  ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis dataKey="name" stroke="#666666" fontSize={10} tickLine={false} />
                    <YAxis stroke="#666666" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: 10, fontFamily: 'Montserrat' }} />
                    <Line type="monotone" dataKey="Bs" stroke="#FFC107" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
