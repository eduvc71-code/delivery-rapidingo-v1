import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderType, OrderStatus, Order, ChatMessage } from '../../types';
import { ORDER_TYPES } from '../../constants';
import { checkSpellingAndClarify } from '../../services/geminiService';
import MapPlaceholder from '../shared/MapPlaceholder';
import { 
  AlertCircle, Check, Loader2, Send, Image as ImageIcon, 
  LogOut, ShoppingBag, MapPin, MessageCircle, Clock, 
  User as UserIcon, Home, ChevronRight, X, Power, PhoneCall, Bike, Truck
} from 'lucide-react';

const CLIENT_CATEGORY_CONFIG: Record<OrderType, { img: string, bg: string, color: string }> = {
  [OrderType.RESTAURANT]: { img: 'assets/client/restaurant.png', bg: 'bg-[#FFF3E0]', color: 'text-[#F57C00]' },
  [OrderType.PHARMACY]: { img: 'assets/client/pharmacy.png', bg: 'bg-[#E3F2FD]', color: 'text-[#1976D2]' },
  [OrderType.OTHER]: { img: 'assets/client/other.png', bg: 'bg-[#F3E5F5]', color: 'text-[#7B1FA2]' },
  [OrderType.SUPERMARKET]: { img: 'assets/client/other.png', bg: 'bg-green-50', color: 'text-green-600' } // Fallback
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

declare const L: any;

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

  useEffect(() => {
    setPoint(initialPoint);
  }, [initialPoint.lat, initialPoint.lng]);

  useEffect(() => {
    if (!mapRef.current || !L) return;

    const map = L.map(mapRef.current).setView([initialPoint.lat, initialPoint.lng], 17);
    mapInstance.current = map;

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    }).addTo(map);

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
  }, [initialPoint.lat, initialPoint.lng, isAlternative]);

  return (
    <div className="absolute inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-red-600 uppercase tracking-wider">Destino de entrega</p>
            <h3 className="text-lg font-black text-gray-900">
              {isAlternative ? 'Escoge otra ubicacion' : 'Confirma tu ubicacion'}
            </h3>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full bg-gray-100 text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="h-80 bg-gray-200 relative">
          <div ref={mapRef} className="absolute inset-0" />
          <div className="absolute left-3 bottom-3 right-3 bg-white/95 rounded-xl px-3 py-2 shadow text-[11px] font-bold text-gray-700">
            Toca el mapa o mueve el marcador. Lat {point.lat.toFixed(5)}, Lng {point.lng.toFixed(5)}
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-black">
            Cancelar
          </button>
          <button onClick={() => onConfirm(point)} className="bg-red-600 text-white py-3 rounded-xl font-black">
            Confirmar
          </button>
        </div>
      </div>
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

  const handleOrderSubmit = () => {
    if (!clientUser || !selectedType) return;
    const normalizedOrderText = orderText.trim().toUpperCase();
    if (!isDestinationConfirmed || !destinationPoint) {
      openDestinationPicker(sendToOtherLocation);
      return;
    }

    // Attempt to get real GPS location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const newOrder: Order = {
          id: Date.now().toString(),
          clientId: clientUser.id,
          type: selectedType,
          description: normalizedOrderText,
          location: {
            lat: destinationPoint.lat,
            lng: destinationPoint.lng,
            address: destinationPoint.address || 'Destino de entrega'
          },
          clientLocation: { lat: position.coords.latitude, lng: position.coords.longitude },
          destinationLocation: {
            lat: destinationPoint.lat,
            lng: destinationPoint.lng,
            address: destinationPoint.address || 'Destino de entrega'
          },
          status: OrderStatus.PENDING_PRICE,
          createdAt: Date.now(),
          chatHistory: [],
          photos: []
        };
        createOrder(newOrder);
      }, (error) => {
        console.warn("GPS error, using mock:", error);
        // Fallback to mock
        const newOrder: Order = {
          id: Date.now().toString(),
          clientId: clientUser.id,
          type: selectedType,
          description: normalizedOrderText,
          location: {
            lat: destinationPoint.lat,
            lng: destinationPoint.lng,
            address: destinationPoint.address || 'Destino de entrega'
          },
          clientLocation: { lat: DEFAULT_DELIVERY_POINT.lat, lng: DEFAULT_DELIVERY_POINT.lng },
          destinationLocation: {
            lat: destinationPoint.lat,
            lng: destinationPoint.lng,
            address: destinationPoint.address || 'Destino de entrega'
          },
          status: OrderStatus.PENDING_PRICE,
          createdAt: Date.now(),
          chatHistory: [],
          photos: []
        };
        createOrder(newOrder);
      });
    } else {
      const newOrder: Order = {
        id: Date.now().toString(),
        clientId: clientUser.id,
        type: selectedType,
        description: normalizedOrderText,
        location: {
          lat: destinationPoint.lat,
          lng: destinationPoint.lng,
          address: destinationPoint.address || 'Destino de entrega'
        },
        clientLocation: { lat: DEFAULT_DELIVERY_POINT.lat, lng: DEFAULT_DELIVERY_POINT.lng },
        destinationLocation: {
          lat: destinationPoint.lat,
          lng: destinationPoint.lng,
          address: destinationPoint.address || 'Destino de entrega'
        },
        status: OrderStatus.PENDING_PRICE,
        createdAt: Date.now(),
        chatHistory: [],
        photos: []
      };
      createOrder(newOrder);
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

  const selectedTypeLabel = ORDER_TYPES.find((type) => type.type === selectedType)?.label || selectedType;
  const deliveryDisplayName = activeOrder?.deliveryName || assignedDelivery?.name;
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
              <p className="font-bold text-sm">Repartidor Asignado</p>
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
            placeholder="Escribe un mensaje..."
            className="min-w-0 flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-red-500"
          />
          <button onClick={handleSendMessage} className="bg-red-500 text-white p-2 rounded-full shadow-md"><Send size={18} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-[#fffbf8] pb-20 text-[#161616]">
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
              <p className="text-xs font-black text-yellow-700 uppercase tracking-wider">Propuesta de precio</p>
              <p className="text-3xl font-black text-gray-900 mt-1">Bs. {activeOrder.totalPrice?.toFixed(2)}</p>
            </div>
            <button onClick={acceptPriceOffer} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Aceptar y confirmar</button>
            <button onClick={() => setShowPriceOfferModal(false)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">Ver pedido</button>
          </div>
        </div>
      )}

      {showDeliveryConfirmation && activeOrder && (
        <div className="absolute inset-0 z-50 bg-black/45 flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-green-100 p-5 space-y-4">
            <div>
              <p className="text-xs font-black text-green-700 uppercase tracking-wider">Pedido entregado</p>
              <p className="text-lg font-bold text-gray-900 mt-2">El repartidor marco el pedido como entregado.</p>
              <p className="text-sm text-[#565656] font-bold mt-1">Confirma solo cuando ya tengas tu pedido en mano.</p>
            </div>
            <button onClick={confirmReceivedOrder} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase">¡Ya salgo, gracias!</button>
            <button onClick={() => setIsChatOpen(true)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">Abrir chat</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-orange-100 px-4 py-4 shadow-[0_8px_22px_rgba(211,47,47,0.08)] sticky top-0 z-10">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-orange-100 text-red-600 rounded-full flex items-center justify-center shrink-0 ring-2 ring-orange-200">
                    <UserIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[22px] leading-6 font-black text-[#161616] truncate">¡Hola, {clientUser.name}!</h2>
                    <p className="text-sm leading-5 font-black text-red-600">¿Qué te llevamos hoy?</p>
                  </div>
              </div>
              <button
                onClick={closeClientApp}
                title="Cerrar sesion"
                className="p-2.5 bg-orange-50 text-red-600 rounded-xl hover:bg-red-50 transition-colors border border-orange-100"
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
                <header>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${availableDeliveries.length > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                    <Bike size={14} />
                    <span className="text-xs font-black">{deliveryStatusLabel}</span>
                  </div>
                </header>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {ORDER_TYPES.map((t) => {
                    const config = CLIENT_CATEGORY_CONFIG[t.type as OrderType] || CLIENT_CATEGORY_CONFIG[OrderType.OTHER];
                    return (
                      <button
                        key={t.type}
                        onClick={() => { setSelectedType(t.type as OrderType); setOrderText(''); setView('FORM'); }}
                        className="group flex flex-col overflow-hidden rounded-[22px] border border-orange-100 bg-white shadow-[0_8px_18px_rgba(211,47,47,0.10)] active:scale-95 transition-all hover:shadow-xl"
                      >
                        <div className={`relative h-24 ${config.bg} flex items-center justify-center overflow-hidden p-2`}>
                          <img
                            src={config.img}
                            alt=""
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md"
                          />
                        </div>
                        <div className="h-11 flex items-center justify-center bg-white px-1">
                          <span className={`font-black text-xs tracking-normal ${config.color} leading-tight text-center`}>{t.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white rounded-[22px] p-4 border border-orange-100 shadow-[0_8px_18px_rgba(211,47,47,0.08)] flex items-center gap-3">
                   <div className="w-11 h-11 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                      <Clock size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-[#161616]">Servicio 24/7</p>
                      <p className="text-xs font-bold text-[#565656]">Enviamos tus pedidos a toda la ciudad de Trinidad.</p>
                   </div>
                </div>
              </div>
            )}

            {view === 'FORM' && (
              <div className="space-y-4">
                <button onClick={() => setView('MENU')} className="text-red-600 text-sm font-black flex items-center gap-1">&larr; Volver al menú</button>

                {selectedType && (
                  <div className="bg-white rounded-[22px] border border-orange-100 shadow-[0_8px_18px_rgba(211,47,47,0.08)] overflow-hidden flex items-center gap-3">
                    <div className={`w-24 h-20 flex items-center justify-center ${CLIENT_CATEGORY_CONFIG[selectedType].bg}`}>
                      <img src={CLIENT_CATEGORY_CONFIG[selectedType].img} alt="" className="w-16 h-16 object-contain drop-shadow-md" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#565656] font-black">Categoría</p>
                      <h2 className={`text-lg font-black ${CLIENT_CATEGORY_CONFIG[selectedType]?.color || 'text-gray-800'}`}>{selectedTypeLabel}</h2>
                    </div>
                  </div>
                )}

                <textarea
                  className="w-full h-40 p-4 border-2 border-orange-100 rounded-[22px] bg-white text-lg text-[#161616] font-black uppercase shadow-[0_8px_18px_rgba(211,47,47,0.08)] focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all placeholder:text-[#7a7a7a]"
                  placeholder="Ej: 2 Hamburguesas completas con papas"
                  value={orderText}
                  onChange={(e) => setOrderText(e.target.value)}
                  lang="es"
                  inputMode="text"
                  spellCheck
                  autoCapitalize="sentences"
                />

                <div className="bg-white rounded-[22px] border border-orange-100 shadow-[0_8px_18px_rgba(211,47,47,0.08)] p-4 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={sendToOtherLocation}
                      onChange={(e) => handleOtherLocationToggle(e.target.checked)}
                      className="mt-1 h-6 w-6 rounded-lg accent-red-600 transition-transform group-active:scale-90"
                    />
                    <span>
                      <span className="block text-base font-black text-[#161616]">Enviar a otra ubicación</span>
                      <span className="block text-xs text-[#565656] font-bold leading-tight mt-0.5">
                        {destinationPoint
                          ? "Ubicación fijada en el mapa satelital."
                          : "Por defecto usaremos tu posición actual."}
                      </span>
                    </span>
                  </label>

                  {destinationPoint && (
                    <button
                      onClick={() => openDestinationPicker(true)}
                      className="w-full bg-orange-50 text-[#161616] py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border border-orange-100 active:bg-orange-100"
                    >
                      <MapPin size={14} className="text-red-600" /> Cambiar ubicación en mapa
                    </button>
                  )}
                </div>

                <button
                  onClick={handleOrderSubmit}
                  disabled={!selectedType || orderText.trim().length < 3}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-[22px] font-black shadow-lg shadow-red-200 disabled:bg-red-200 disabled:text-red-900 disabled:opacity-100 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  ¡PEDIR AHORA! <ChevronRight size={20} />
                </button>
              </div>
            )}

            {view === 'TRACKING' && activeOrder && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-black text-gray-900 tracking-tight">Seguimiento Real</h2>
                  <span className="text-xs font-black bg-red-100 text-red-600 px-3 py-1 rounded-full uppercase">{activeOrder.status}</span>
                </div>
                
                <MapPlaceholder order={activeOrder} />

                <div className="bg-white p-5 rounded-[24px] shadow-[0_14px_28px_rgba(211,47,47,0.14)] border border-orange-100 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                  <div className="flex justify-between items-start gap-4">
                    <p className="font-black text-gray-900 text-lg leading-tight uppercase">{activeOrder.description}</p>
                    <p className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg shrink-0">Bs. {activeOrder.totalPrice || '---'}</p>
                  </div>

                  {activeOrder.status === OrderStatus.WAITING_CONFIRM && (
                    <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-200 space-y-3 animate-in fade-in zoom-in duration-300">
                       <p className="text-xs font-black text-green-800 uppercase tracking-widest text-center">Propuesta del repartidor</p>
                       <div className="flex justify-center items-baseline gap-2">
                          <span className="text-4xl font-black text-green-900">Bs. {activeOrder.totalPrice?.toFixed(2)}</span>
                       </div>
                       <button onClick={acceptPriceOffer} className="w-full bg-[#2E7D32] text-white py-3.5 rounded-xl font-black text-sm shadow-md active:translate-y-1 transition-all">Aceptar y confirmar</button>
                    </div>
                  )}

                  {activeOrder.status === OrderStatus.IN_DELIVERY && (
                    <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <Truck size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-blue-900">Pedido en ruta</p>
                        <p className="text-xs font-bold text-blue-700 leading-tight">El repartidor está cerca de tu domicilio.</p>
                      </div>
                    </div>
                  )}

                  {activeOrder.status === OrderStatus.DELIVERED_BY_REPARTIDOR && (
                    <button onClick={confirmReceivedOrder} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl animate-pulse">¡LO RECIBÍ - GRACIAS!</button>
                  )}

                  <div className={`grid gap-2 ${hasWhatsAppPhone(deliveryWhatsAppPhone) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="bg-gray-900 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <MessageCircle size={18} /> Chat Directo
                    </button>
                    {hasWhatsAppPhone(deliveryWhatsAppPhone) && (
                      <button
                        onClick={() => openWhatsAppMessage(deliveryWhatsAppPhone, `Hola Soy el cliente ${clientUser.name}`)}
                        className="bg-[#128C7E] text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                      >
                        <PhoneCall size={18} /> WhatsApp
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => updateOrder({...activeOrder, status: OrderStatus.CANCELLED})}
                    className="w-full text-red-600 text-xs font-black uppercase pt-2"
                  >
                    Cancelar pedido
                  </button>
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
      <div className="h-16 bg-white border-t border-orange-100 absolute bottom-0 left-0 right-0 flex justify-around items-center px-6 z-10 shadow-[0_-8px_22px_rgba(211,47,47,0.08)]">
        <button onClick={() => setActiveTab('HOME')} className={`flex flex-col items-center gap-1 ${activeTab === 'HOME' ? 'text-red-600' : 'text-[#565656]'}`}>
          <Home size={20} strokeWidth={activeTab === 'HOME' ? 3 : 2} />
          <span className="text-[11px] font-black">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('HISTORY')} className={`flex flex-col items-center gap-1 ${activeTab === 'HISTORY' ? 'text-red-600' : 'text-[#565656]'}`}>
          <Clock size={20} strokeWidth={activeTab === 'HISTORY' ? 3 : 2} />
          <span className="text-[11px] font-black">Pedidos</span>
        </button>
        <button onClick={() => setActiveTab('PROFILE')} className={`flex flex-col items-center gap-1 ${activeTab === 'PROFILE' ? 'text-red-600' : 'text-[#565656]'}`}>
          <UserIcon size={20} strokeWidth={activeTab === 'PROFILE' ? 3 : 2} />
          <span className="text-[11px] font-black">Perfil</span>
        </button>
      </div>
    </div>
  );
};
