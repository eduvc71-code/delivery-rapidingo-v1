import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderStatus, Order, ChatMessage } from '../../types';
import { 
  Truck, DollarSign, Clock, CheckCircle, Camera, X, 
  Image as ImageIcon, MapPin, Power, Minus, LayoutList, 
  Bike, FileText, Navigation, MessageCircle, Send, PhoneCall,
  User as UserIcon
} from 'lucide-react';
import MapPlaceholder from '../shared/MapPlaceholder';

const hasWhatsAppPhone = (phone?: string) => /\d/.test(phone || '');

const openWhatsAppMessage = (phone: string | undefined, message: string) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    alert('No hay numero de WhatsApp registrado');
    return;
  }
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
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
  const [productCost, setProductCost] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  
  const [orderPhoto, setOrderPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const watchId = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientDisplayName = activeOrder?.clientName || clientUser?.name || 'Esperando...';
  const clientWhatsAppPhone = activeOrder?.clientPhone || clientUser?.phone;

  useEffect(() => {
    setProductCost('');
    setServiceCost('');
    setOrderPhoto(null);
  }, [activeOrder?.id]);

  useEffect(() => {
    if (activeOrder?.status !== OrderStatus.PENDING_PRICE) {
      setProductCost('');
      setServiceCost('');
    }
  }, [activeOrder?.status]);

  const closeDeliveryApp = () => {
    if (logout()) {
      onClose();
    }
  };

  const openNavigationToClient = () => {
    if (!activeOrder?.location?.lat || !activeOrder?.location?.lng) return;
    const { lat, lng } = activeOrder.location;
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  };

  // GPS Tracking Logic
  useEffect(() => {
    const isTrackingStatus = activeOrder?.status === OrderStatus.PICKING_UP || activeOrder?.status === OrderStatus.IN_DELIVERY;

    if (isTrackingStatus) {
      if ("geolocation" in navigator) {
        watchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const now = Date.now();

            const lastHistoryPoint = activeOrder.locationHistory?.[activeOrder.locationHistory.length - 1];
            const shouldAddPoint = !lastHistoryPoint ||
              Math.abs(lastHistoryPoint.lat - latitude) > 0.00002 ||
              Math.abs(lastHistoryPoint.lng - longitude) > 0.00002;

            updateOrder({
              ...activeOrder,
              deliveryLocation: { lat: latitude, lng: longitude },
              locationHistory: shouldAddPoint
                ? [...(activeOrder.locationHistory || []), { lat: latitude, lng: longitude }]
                : activeOrder.locationHistory
            });
          },
          (error) => console.error("Error tracking GPS:", error),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      }
    } else {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [activeOrder?.status, activeOrder?.locationHistory?.length]);

  useEffect(() => {
    if (deliveryUser) setMessage(`¡Hola ${deliveryUser.name}!`);
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [deliveryUser]);

  useEffect(() => {
    if (activeOrder) setView('ACTIVE_ORDER');
  }, [activeOrder]);

  useEffect(() => {
    if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeOrder?.chatHistory, isChatOpen]);

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

  const handleSetPrice = () => {
    if (!activeOrder) return;
    const pCost = parseFloat(productCost);
    const sCost = parseFloat(serviceCost);
    if (isNaN(pCost) || isNaN(sCost) || pCost < 0 || sCost < 0) {
      alert("Por favor ingrese costos válidos.");
      return;
    }
    const total = pCost + sCost;
    updateOrder({
      ...activeOrder,
      productPrice: pCost,
      servicePrice: sCost,
      totalPrice: total,
      status: OrderStatus.WAITING_CONFIRM,
      photos: orderPhoto ? [orderPhoto] : activeOrder.photos
    });
    setOrderPhoto(null);
    setProductCost('');
    setServiceCost('');
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) { alert("Cámara no disponible."); setIsCameraOpen(false); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setOrderPhoto(canvas.toDataURL('image/jpeg', 0.8));
      if (stream) stream.getTracks().forEach(t => t.stop());
      setIsCameraOpen(false);
    }
  };

  if (!deliveryUser) return null;

  // CHAT OVERLAY
  if (isChatOpen && activeOrder) {
    return (
      <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom overflow-hidden">
        <div className="bg-orange-600 px-4 py-3 text-white flex justify-between items-center shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">C</div>
            <div>
              <p className="font-bold text-sm">Cliente (Chat)</p>
              <p className="text-xs font-bold text-white/95">Negociando</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-50">
          {activeOrder.chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === deliveryUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] break-words whitespace-pre-wrap p-3 rounded-2xl shadow-sm text-sm leading-snug ${
                msg.senderId === deliveryUser.id 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
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
            placeholder="Responder al cliente..."
            className="min-w-0 flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          />
          <button onClick={handleSendMessage} className="bg-orange-500 text-white p-2 rounded-full shadow-md"><Send size={18} /></button>
        </div>
      </div>
    );
  }

  if (isCameraOpen) {
    return (
      <div className="absolute inset-0 z-50 bg-black flex flex-col">
        <video ref={videoRef} autoPlay playsInline className="flex-1 w-full object-cover" />
        <div className="p-10 flex justify-center"><button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-white/20" /></div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-[#fffbf8] text-[#161616]">
      {!deliveryUser.phone && (
        <div className="absolute inset-0 z-[70] bg-black/45 flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div>
              <p className="text-xs font-black text-green-700 uppercase tracking-wider">WhatsApp del delivery</p>
              <p className="text-sm text-[#565656] font-bold mt-1">Guardaremos este numero para que el cliente pueda escribir solo cuando sea necesario.</p>
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

      <div className="bg-white border-b border-orange-100 p-4 shadow-[0_8px_22px_rgba(211,47,47,0.08)] sticky top-0 z-10">
          <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3 text-[#161616] min-w-0">
                  <div className="w-11 h-11 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0 ring-2 ring-orange-200">
                    <Bike size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[21px] leading-6 font-black truncate">Soy Rapidingo</h2>
                    <p className="text-sm leading-5 font-black text-red-600 truncate">{deliveryUser.name}</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={onMinimize} className="p-2.5 bg-orange-50 text-[#565656] rounded-xl hover:bg-orange-100 transition-colors border border-orange-100"><Minus size={20} /></button>
                  <button
                    onClick={closeDeliveryApp}
                    title="Cerrar sesion"
                    className="p-2.5 bg-orange-50 text-red-600 rounded-xl hover:bg-red-50 transition-colors border border-orange-100"
                  >
                    <Power size={20} />
                  </button>
              </div>
          </div>

          <div className="flex bg-orange-50 p-1 rounded-xl border border-orange-100">
              <button onClick={() => setView('DASHBOARD')} className={`flex-1 text-xs font-black py-2 rounded-lg transition-all ${view !== 'HISTORY' ? 'bg-white text-red-600 shadow-sm' : 'text-[#565656]'}`}>ACTIVIDAD</button>
              <button onClick={() => setView('HISTORY')} className={`flex-1 text-xs font-black py-2 rounded-lg transition-all ${view === 'HISTORY' ? 'bg-white text-red-600 shadow-sm' : 'text-[#565656]'}`}>HISTORIAL</button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {view !== 'HISTORY' && (
          activeOrder ? (
            <div className="space-y-5">
              {/* MAPA SUPERIOR EN CUADRO */}
              <div className="w-full aspect-square max-h-[300px] rounded-[28px] overflow-hidden border-2 border-orange-100 shadow-xl relative z-0">
                <MapPlaceholder order={activeOrder} isDeliveryView />
              </div>

              <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-[#161616] tracking-tight">Pedido activo</h3>
                 <div className="px-3 py-1 bg-orange-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">{activeOrder.status}</div>
              </div>
              
              <div className="bg-white p-5 rounded-[24px] border border-orange-100 shadow-[0_12px_26px_rgba(211,47,47,0.12)] relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                 <p className="text-xs text-[#565656] font-black mb-2 uppercase">Lo que el cliente pidió</p>
                 <p className="text-xl font-black text-[#161616] leading-tight uppercase">{activeOrder.description}</p>
                 <div className="mt-4 pt-4 border-t border-orange-100 flex items-center gap-2">
                    <UserIcon size={14} className="text-red-600" />
                    <span className="text-sm font-black text-[#565656]">Cliente: {clientDisplayName}</span>
                 </div>
              </div>

              {/* GRUPO DE BOTONES ORGANIZADOS */}
              <div className="space-y-3 pt-2">
                {activeOrder.status === OrderStatus.PENDING_PRICE && (
                  <div className="bg-white p-5 rounded-[24px] border border-orange-100 shadow-[0_12px_26px_rgba(211,47,47,0.12)] space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                    <p className="text-xs font-black text-red-600 uppercase text-center">Enviar presupuesto</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-[#565656] ml-1 uppercase tracking-tighter">Productos</span>
                        <input type="number" placeholder="0.00" value={productCost} onChange={(e) => setProductCost(e.target.value)} className="w-full bg-orange-50 p-4 rounded-xl font-black text-center text-lg text-[#161616] border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-black text-[#565656] ml-1 uppercase tracking-tighter">Tarifa</span>
                        <input type="number" placeholder="0.00" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} className="w-full bg-orange-50 p-4 rounded-xl font-black text-center text-lg text-[#161616] border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                      </div>
                    </div>
                    <button onClick={handleSetPrice} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black shadow-lg transition-all active:scale-95">ENVIAR COTIZACIÓN</button>
                  </div>
                )}

                {activeOrder.status === OrderStatus.CONFIRMED_BY_CLIENT && (
                   <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.PICKING_UP})} className="w-full bg-red-600 text-white py-5 rounded-[22px] font-black shadow-xl shadow-red-200 flex items-center justify-center gap-3 animate-pulse">
                     <CheckCircle size={24} /> IR A COMPRAR
                   </button>
                )}

                {activeOrder.status === OrderStatus.PICKING_UP && (
                   <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.IN_DELIVERY})} className="w-full bg-orange-600 text-white py-5 rounded-[22px] font-black shadow-xl shadow-orange-200 flex items-center justify-center gap-3">
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
                    className="w-full bg-[#2E7D32] text-white py-5 rounded-[22px] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                   >
                     <CheckCircle size={24} /> ¡YA LLEGUÉ!
                   </button>
                )}

                {activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR && (
                   <div className="p-5 bg-green-50 rounded-[24px] border-2 border-green-200 text-center space-y-2 shadow-sm">
                     <p className="text-sm font-black text-green-900 uppercase">¡Pedido marcado como entregado!</p>
                     <p className="text-xs font-bold text-green-700 leading-tight">Espera a que el cliente confirme la recepción.</p>
                   </div>
                )}

                <div className={`grid gap-3 ${hasWhatsAppPhone(clientWhatsAppPhone) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="bg-[#161616] text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    <MessageCircle size={18} /> Chat Cliente
                  </button>
                  {hasWhatsAppPhone(clientWhatsAppPhone) && (
                    <button
                      onClick={() => openWhatsAppMessage(clientWhatsAppPhone, `Hola Soy el delivery ${deliveryUser.name}`)}
                      className="bg-[#128C7E] text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <PhoneCall size={18} /> WhatsApp
                    </button>
                  )}
                </div>

                {activeOrder.status !== OrderStatus.COMPLETED && activeOrder.status !== OrderStatus.CANCELLED && (
                  <button
                    onClick={() => updateOrder({...activeOrder, status: OrderStatus.CANCELLED})}
                    className="w-full text-red-600 text-[10px] font-black uppercase pt-4 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    Rechazar / Cancelar pedido
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
               <div className="flex flex-col items-center">
                 <div className="w-28 h-28 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 ring-4 ring-white shadow-[0_12px_26px_rgba(211,47,47,0.12)]">
                   <LayoutList size={52} />
                 </div>
                 <p className="font-black text-[#161616] uppercase tracking-wide">Sin actividad</p>
                 <p className="text-sm text-[#565656] mt-1 font-bold">Los pedidos aparecerán aquí automáticamente.</p>
               </div>
               <button
                 onClick={closeDeliveryApp}
                 className="mt-12 mx-auto bg-red-600 text-white px-8 py-4 rounded-[22px] font-black flex items-center justify-center gap-3 shadow-2xl shadow-red-200 active:scale-95 transition-all"
               >
                 <Power size={18} /> CERRAR SESIÓN
               </button>
            </div>
          )
        )}

        {view === 'HISTORY' && (
           <div className="space-y-4">
              <h2 className="font-black text-[#161616]">Historial de turno</h2>
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                 <table className="w-full text-xs">
                    <thead className="bg-orange-50 text-[#565656] font-black uppercase">
                       <tr><th className="p-3 text-left">Pedido</th><th className="p-3 text-right">Ganancia</th></tr>
                    </thead>
                    <tbody className="divide-y">
                       {pastOrders.map((o, i) => (
                         <tr key={i}><td className="p-3 font-medium text-gray-700">{o.description.toLowerCase()}</td><td className="p-3 text-right font-bold text-green-600">${o.servicePrice?.toFixed(2)}</td></tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </div>

      {/* Botón Flotante de WAZE */}
      {activeOrder && (activeOrder.status === OrderStatus.PICKING_UP || activeOrder.status === OrderStatus.IN_DELIVERY || activeOrder.status === OrderStatus.CONFIRMED_BY_CLIENT) && (
        <button
          onClick={openNavigationToClient}
          className="absolute bottom-10 right-6 bg-[#33ccff] text-white px-6 py-4 rounded-full shadow-2xl z-30 flex items-center gap-3 active:scale-95 transition-transform border-4 border-white animate-bounce"
        >
          <Navigation size={24} fill="white" />
          <span className="font-black italic text-sm tracking-tighter">USAR WAZE</span>
        </button>
      )}
    </div>
  );
};
