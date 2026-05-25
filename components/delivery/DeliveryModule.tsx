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
  restaurant: string;
  item: string;
  quantity: number;
  unitPrice: string;
};

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
        restaurant: currentRestaurant,
        item: itemMatch[1].trim(),
        quantity: Math.max(1, Number(itemMatch[2] || 1)),
        unitPrice: ''
      });
    }
  });

  if (rows.length === 0 && description?.trim()) {
    rows.push({
      restaurant: 'Pedido',
      item: description.trim(),
      quantity: 1,
      unitPrice: ''
    });
  }

  return rows;
};

interface DeliveryModuleProps {
    onClose: () => void;
    onMinimize: () => void;
}

export const DeliveryModule: React.FC<DeliveryModuleProps> = ({ onClose, onMinimize }) => {
  const { activeOrder, updateOrder, pastOrders, deliveryUser, logout, addChatMessage, clientUser, updateCurrentUserPhone } = useApp();
  const [view, setView] = useState<'DASHBOARD' | 'ACTIVE_ORDER' | 'HISTORY'>('DASHBOARD');
  const [reportMode, setReportMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Pricing state
  const [serviceCost, setServiceCost] = useState('');
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  
  const [orderPhoto, setOrderPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const watchId = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientDisplayName = activeOrder?.clientName || clientUser?.name || 'Protocolo...';
  const clientWhatsAppPhone = activeOrder?.clientPhone || clientUser?.phone;
  const quotedProductTotal = quoteRows.reduce((sum, row) => {
    const unitPrice = parseFloat(row.unitPrice);
    return sum + (isNaN(unitPrice) ? 0 : unitPrice * row.quantity);
  }, 0);
  const quotedServiceCost = parseFloat(serviceCost);
  const quotedGrandTotal = quotedProductTotal + (isNaN(quotedServiceCost) ? 0 : quotedServiceCost);

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
    if (![OrderStatus.BIDDING, OrderStatus.CONFIRMED_BY_CLIENT, OrderStatus.PICKING_UP, OrderStatus.IN_DELIVERY].includes(activeOrder.status)) return;

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

  const openNavigationToClient = () => {
    if (!activeOrder) return;
    const destination = activeOrder.destinationLocation || activeOrder.location;
    if (!destination?.lat || !destination?.lng) {
      alert('No hay ubicacion de destino disponible');
      return;
    }

    window.open(`https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`, '_blank');
  };

  if (!deliveryUser) return null;

  return (
    <div className="h-full flex flex-col relative hexagon-pattern text-white font-montserrat">
      {!deliveryUser.phone && (
        <div className="absolute inset-0 z-[70] bg-brand-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-brand-black rounded-[2.5rem] shadow-2xl border border-white/5 p-8 space-y-5 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-2">
               <PhoneCall size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[3px] font-teko italic">WhatsApp del delivery</p>
              <p className="text-xs text-gray-500 font-bold mt-1 leading-relaxed">Ingresa tu numero de WhatsApp.</p>
            </div>
            <input
              type="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-black text-white text-center focus:border-brand-orange outline-none"
              placeholder="Ej: 5917XXXXXXX"
            />
            <button
              onClick={() => updateCurrentUserPhone(phoneDraft)}
              disabled={!phoneDraft.trim()}
              className="w-full bg-brand-orange text-white py-4 rounded-2xl font-black font-teko italic text-sm uppercase tracking-[3px] shadow-lg shadow-brand-orange/20"
            >
              GUARDAR
            </button>
          </div>
        </div>
      )}

      <div className="bg-brand-black/90 backdrop-blur-md border-b border-brand-orange/20 p-4 sticky top-0 z-10">
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3 text-white min-w-0">
                  <div className="w-12 h-12 bg-brand-orange text-white rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,106,0,0.4)] border border-white/10">
                    <img src="assets/brand/rapidingo-logo.png" alt="Rapidingo" className="w-12 h-12 rounded-xl object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[20px] leading-6 font-black font-montserrat uppercase tracking-tight truncate">RAPIDINGO</h2>
                    <p className="text-xs leading-5 font-bold text-brand-yellow uppercase tracking-[2px] font-teko italic truncate">{deliveryUser.name}</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={onMinimize} className="p-2.5 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition-colors border border-white/10"><Minus size={20} /></button>
                  <button
                    onClick={closeDeliveryApp}
                    className="p-2.5 bg-white/5 text-brand-orange rounded-xl hover:bg-white/10 transition-colors border border-brand-orange/20 shadow-inner"
                  >
                    <Power size={20} />
                  </button>
              </div>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button onClick={() => setView('DASHBOARD')} className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest ${view !== 'HISTORY' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}>PEDIDOS</button>
              <button onClick={() => setView('HISTORY')} className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all font-teko uppercase tracking-widest ${view === 'HISTORY' ? 'bg-brand-orange text-white shadow-[0_0_10px_rgba(255,106,0,0.3)]' : 'text-gray-500'}`}>HISTORIAL</button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {view !== 'HISTORY' && (
          activeOrder ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* MAPA SUPERIOR EN CUADRO */}
              <div className="w-full aspect-square max-h-[300px] rounded-[32px] overflow-hidden border-2 border-white/5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] relative z-0">
                <MapPlaceholder order={activeOrder} isDeliveryView />
                <div className="absolute top-4 right-4 bg-brand-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse shadow-[0_0_8px_#FF6A00]"></div>
                   <span className="text-[9px] font-black text-white font-teko uppercase tracking-widest italic">GPS ACTIVO</span>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-white tracking-tighter font-montserrat uppercase italic">Pedido activo</h3>
                 <div className="px-3 py-1 bg-brand-orange/20 border border-brand-orange/40 text-brand-orange rounded-md text-[10px] font-black uppercase tracking-widest font-teko italic">{getOrderStatusLabel(activeOrder.status)}</div>
              </div>
              
              <div className="bg-brand-black/90 p-5 rounded-[28px] border border-white/5 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-2 h-full bg-brand-orange group-active:w-3 transition-all shadow-[0_0_15px_#FF6A00]"></div>
                 <p className="text-[9px] text-gray-500 font-bold mb-2 uppercase tracking-[3px] font-teko italic">Detalle del pedido</p>
                 <p className="text-xl font-black text-white leading-tight uppercase font-montserrat tracking-tight">{activeOrder.description}</p>
                 <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                          <UserIcon size={14} className="text-brand-orange" />
                       </div>
                       <span className="text-xs font-bold text-gray-400 font-teko uppercase tracking-widest italic">CLIENTE: {clientDisplayName.toUpperCase()}</span>
                    </div>
                 </div>
              </div>

              {/* GRUPO DE BOTONES ORGANIZADOS */}
              <div className="space-y-4 pt-2">
                {activeOrder.status === OrderStatus.PENDING_PRICE && (
                  <div className="bg-brand-black/95 p-6 rounded-[32px] border border-white/5 shadow-3xl space-y-5 animate-in slide-in-from-bottom-6 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full -mr-16 -mt-16"></div>
                    <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[5px] text-center font-teko italic">COTIZACIÓN DESGLOSADA</p>

                    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
                      <div className="grid grid-cols-[1.3fr_42px_76px_76px] bg-brand-black/60 text-[8px] font-black text-gray-500 uppercase tracking-widest font-teko p-1 italic border-b border-white/5">
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
                                <p className="text-[9px] font-black text-brand-orange truncate font-teko italic tracking-wider uppercase">{row.restaurant}</p>
                                <p className="text-xs font-black text-white leading-tight font-montserrat uppercase truncate">{row.item}</p>
                              </div>
                              <div className="p-2 text-center text-sm font-black text-white font-teko italic">{row.quantity}</div>
                              <div className="p-1">
                                <input
                                  type="number"
                                  value={row.unitPrice}
                                  onChange={(event) => setQuoteRows((current) => current.map((quoteRow, quoteIndex) => (
                                    quoteIndex === index ? { ...quoteRow, unitPrice: event.target.value } : quoteRow
                                  )))}
                                  placeholder="0"
                                  className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-center text-sm font-black text-white outline-none focus:border-brand-orange font-montserrat"
                                />
                              </div>
                              <div className="p-2 text-right text-xs font-black text-brand-yellow font-montserrat">Bs. {lineTotal.toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-center">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-teko italic">TOTAL PRODUCTOS</span>
                        <div className="w-full bg-white/5 p-4 rounded-2xl font-black text-xl text-white border border-white/5 font-montserrat tracking-tighter">Bs. {quotedProductTotal.toFixed(2)}</div>
                      </div>
                      <div className="space-y-1.5 text-center">
                        <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest font-teko italic">TARIFA</span>
                        <input type="number" placeholder="0.00" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} className="w-full bg-brand-orange/10 p-4 rounded-2xl font-black text-xl text-brand-orange border border-brand-orange/30 text-center outline-none focus:bg-brand-orange/20 transition-all font-montserrat tracking-tighter shadow-inner" />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-brand-orange text-white p-4 flex items-center justify-between shadow-[0_0_25px_rgba(255,106,0,0.3)]">
                      <span className="text-[10px] font-black uppercase tracking-[3px] font-teko italic">TOTAL GENERAL</span>
                      <span className="text-3xl font-black font-montserrat tracking-tighter">Bs. {quotedGrandTotal.toFixed(2)}</span>
                    </div>

                    <button onClick={handleSetPrice} className="w-full bg-white text-brand-black py-4 rounded-2xl font-black font-teko italic text-lg uppercase tracking-[4px] shadow-[0_10px_20px_rgba(255,255,255,0.1)] transition-all active:scale-95">ENVIAR COTIZACIÓN</button>
                  </div>
                )}

                {activeOrder.status === OrderStatus.CONFIRMED_BY_CLIENT && (
                   <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.PICKING_UP})} className="w-full bg-brand-orange text-white py-5 rounded-[22px] font-black font-teko italic text-xl uppercase tracking-[4px] shadow-[0_0_20px_rgba(255,106,0,0.4)] flex items-center justify-center gap-3 animate-pulse">
                     <CheckCircle size={24} /> IR A COMPRAR
                   </button>
                )}

                {activeOrder.status === OrderStatus.PICKING_UP && (
                   <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.IN_DELIVERY})} className="w-full bg-brand-orange text-white py-5 rounded-[22px] font-black font-teko italic text-xl uppercase tracking-[4px] shadow-[0_0_20px_rgba(255,106,0,0.4)] flex items-center justify-center gap-3">
                     <Truck size={24} /> COMPRADO, EN RUTA
                   </button>
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
                    className="w-full bg-[#2E7D32] text-white py-5 rounded-[22px] font-black font-teko italic text-xl uppercase tracking-[4px] shadow-[0_0_20px_rgba(46,125,50,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all"
                   >
                     <CheckCircle size={24} /> ¡YA LLEGUÉ!
                   </button>
                )}

                {activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR && (
                   <div className="p-6 bg-brand-yellow/5 rounded-[28px] border border-brand-yellow/20 text-center space-y-3 shadow-inner">
                     <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[4px] font-teko italic">ESPERANDO CONFIRMACIÓN DEL CLIENTE</p>
                     <p className="text-sm font-bold text-white font-montserrat tracking-tight leading-snug">Esperando confirmación final del cliente.</p>
                   </div>
                )}

                <div className={`grid gap-3 ${hasWhatsAppPhone(clientWhatsAppPhone) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="bg-white/5 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest font-teko italic flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10 transition-all shadow-lg"
                  >
                    <MessageCircle size={18} className="text-brand-orange" /> CHAT
                  </button>
                  {hasWhatsAppPhone(clientWhatsAppPhone) && (
                    <button
                      onClick={() => openWhatsAppMessage(clientWhatsAppPhone, `Hola Soy el delivery ${deliveryUser.name}`)}
                      className="bg-[#25D366]/10 text-[#25D366] py-4 rounded-xl font-black text-[11px] uppercase tracking-widest font-teko italic flex items-center justify-center gap-2 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all shadow-lg"
                    >
                      <PhoneCall size={18} /> WhatsApp
                    </button>
                  )}
                </div>

                {activeOrder.status !== OrderStatus.COMPLETED && activeOrder.status !== OrderStatus.CANCELLED && (
                  <button
                    onClick={() => updateOrder({...activeOrder, status: OrderStatus.CANCELLED})}
                    className="w-full text-gray-600 text-[10px] font-black uppercase tracking-widest pt-4 hover:text-brand-orange transition-colors font-teko"
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
                    <div className="absolute inset-0 bg-brand-orange blur-3xl opacity-10 rounded-full animate-pulse"></div>
                    <div className="relative w-full h-full bg-white/5 text-brand-orange rounded-[40px] flex items-center justify-center border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
                      <LayoutList size={56} className="opacity-80" />
                    </div>
                 </div>
                 <p className="font-black text-white text-xl uppercase tracking-tighter font-montserrat">ESTÁS ONLINE</p>
                 <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[4px] font-teko italic">Los pedidos llegarán pronto a Trinidad.</p>
               </div>
               <button
                 onClick={closeDeliveryApp}
                 className="mt-16 mx-auto bg-white/5 text-gray-400 px-10 py-4 rounded-2xl font-black font-teko italic text-sm uppercase tracking-[4px] border border-white/10 hover:bg-white/10 transition-all active:scale-95"
               >
                 <Power size={18} className="inline mr-2" /> CERRAR SESION
               </button>
            </div>
          )
        )}

        {view === 'HISTORY' && (
           <div className="space-y-5 animate-in slide-in-from-right duration-500">
              <h2 className="text-xl font-black text-white font-montserrat uppercase tracking-tight italic">Resumen de Ganancias</h2>
              <div className="bg-brand-black/90 rounded-3xl shadow-2xl border border-white/5 overflow-hidden">
                 <table className="w-full text-xs">
                    <thead className="bg-white/5 text-gray-500 font-black uppercase font-teko tracking-[2px] italic">
                       <tr><th className="p-4 text-left">PEDIDO</th><th className="p-4 text-right">GANANCIA</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {pastOrders.map((o, i) => (
                         <tr key={i} className="hover:bg-white/5 transition-colors group">
                           <td className="p-4 font-bold text-gray-300 font-montserrat uppercase text-[10px] leading-relaxed group-hover:text-white">{o.description.toLowerCase()}</td>
                           <td className="p-4 text-right font-black text-brand-yellow font-montserrat tracking-tighter text-sm">Bs. {o.servicePrice?.toFixed(2)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
                 {pastOrders.length === 0 && (
                   <div className="p-10 text-center text-gray-600 font-teko uppercase tracking-[3px] italic">No hay pedidos</div>
                 )}
              </div>
           </div>
        )}
      </div>

      {/* Botón Flotante de WAZE */}
      {activeOrder && (activeOrder.status === OrderStatus.PICKING_UP || activeOrder.status === OrderStatus.IN_DELIVERY || activeOrder.status === OrderStatus.CONFIRMED_BY_CLIENT) && (
        <button
          onClick={openNavigationToClient}
          className="absolute bottom-10 right-6 bg-brand-orange text-white px-7 py-4 rounded-full shadow-[0_10px_30px_rgba(255,106,0,0.5)] z-30 flex items-center gap-3 active:scale-95 transition-all border-2 border-white/20 animate-bounce group"
        >
          <Navigation size={22} fill="white" className="group-hover:rotate-12 transition-transform" />
          <span className="font-black italic text-xs tracking-widest font-teko uppercase">NAVEGAR CON WAZE</span>
        </button>
      )}
    </div>
  );
};
