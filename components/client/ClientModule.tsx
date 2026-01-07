import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderType, OrderStatus, Order, ChatMessage } from '../../types';
import { ORDER_TYPES, MOCK_ADDRESS } from '../../constants';
import { checkSpellingAndClarify } from '../../services/geminiService';
import MapPlaceholder from '../shared/MapPlaceholder';
import { 
  AlertCircle, Check, Loader2, Send, Image as ImageIcon, 
  LogOut, ShoppingBag, MapPin, MessageCircle, Clock, 
  User as UserIcon, Home, ChevronRight, X
} from 'lucide-react';

interface ClientModuleProps {
    onClose: () => void;
}

export const ClientModule: React.FC<ClientModuleProps> = ({ onClose }) => {
  const { clientUser, activeOrder, createOrder, updateOrder, logout, pastOrders, addChatMessage } = useApp();
  const [activeTab, setActiveTab] = useState<'HOME' | 'HISTORY' | 'PROFILE'>('HOME');
  const [view, setView] = useState<'MENU' | 'FORM' | 'TRACKING'>('MENU');
  const [selectedType, setSelectedType] = useState<OrderType | null>(null);
  const [orderText, setOrderText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTypingWarning, setShowTypingWarning] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeOrder) setView('TRACKING');
    else setView('MENU');
  }, [activeOrder]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeOrder?.chatHistory, isChatOpen]);

  const handleOrderSubmit = () => {
    if (!clientUser || !selectedType) return;
    const newOrder: Order = {
      id: Date.now().toString(),
      clientId: clientUser.id,
      type: selectedType,
      description: orderText,
      location: { lat: 0, lng: 0, address: MOCK_ADDRESS },
      status: OrderStatus.PENDING_PRICE,
      createdAt: Date.now(),
      chatHistory: [],
      photos: []
    };
    createOrder(newOrder);
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

  // CHAT OVERLAY
  if (isChatOpen && activeOrder) {
    return (
      <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom">
        <div className="bg-red-600 p-4 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">R</div>
            <div>
              <p className="font-bold text-sm">Repartidor Asignado</p>
              <p className="text-[10px] opacity-80">En línea</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {activeOrder.chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === clientUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${
                msg.senderId === clientUser.id 
                  ? 'bg-red-500 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                {msg.text}
                <p className={`text-[9px] mt-1 text-right opacity-70`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white border-t flex gap-2">
          <input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-red-500"
          />
          <button onClick={handleSendMessage} className="bg-red-500 text-white p-2 rounded-full shadow-md"><Send size={18} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 p-4 flex justify-between items-center shadow-md sticky top-0 z-10 text-white">
          <div className="flex items-center gap-2">
              <ShoppingBag size={20} />
              <span className="font-bold tracking-tight">RAPIDINGO</span>
          </div>
          <button onClick={() => logout()} className="p-1 opacity-80 hover:opacity-100"><LogOut size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'HOME' && (
          <>
            {view === 'MENU' && (
              <div className="space-y-6">
                <header><h1 className="text-2xl font-bold text-gray-800">¿Qué necesitas?</h1></header>
                <div className="grid grid-cols-2 gap-4">
                  {ORDER_TYPES.map((t) => (
                    <button key={t.type} onClick={() => { setSelectedType(t.type); setView('FORM'); }} className={`${t.color} p-6 rounded-2xl flex flex-col items-center gap-2 shadow-sm h-32 active:scale-95 transition-all`}>
                      <t.icon size={28} />
                      <span className="font-bold text-xs">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === 'FORM' && (
              <div className="space-y-4">
                <button onClick={() => setView('MENU')} className="text-gray-500 text-sm font-bold">&larr; Volver</button>
                <textarea 
                  className="w-full h-48 p-4 border rounded-2xl bg-white text-lg font-bold uppercase shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ej: 2 Hamburguesas con extra queso"
                  value={orderText}
                  onChange={(e) => setOrderText(e.target.value.toUpperCase())}
                />
                <button onClick={handleOrderSubmit} disabled={orderText.length < 5} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">Solicitar Pedido</button>
              </div>
            )}

            {view === 'TRACKING' && activeOrder && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-700">Seguimiento</h2>
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full uppercase">{activeOrder.status}</span>
                </div>
                
                <MapPlaceholder showDelivery={activeOrder.status === OrderStatus.IN_DELIVERY} status="Estado del envío" />

                <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3 relative">
                  <p className="font-bold text-gray-800">{activeOrder.description}</p>
                  
                  {/* Floating Chat Button */}
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="absolute -top-3 -right-3 bg-red-600 text-white p-3 rounded-full shadow-lg animate-bounce z-20"
                  >
                    <MessageCircle size={24} />
                    {activeOrder.chatHistory.length > 0 && <span className="absolute top-0 right-0 bg-white text-red-600 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-red-600">!</span>}
                  </button>

                  {activeOrder.status === OrderStatus.WAITING_CONFIRM && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 space-y-2">
                       <p className="text-xs font-bold text-yellow-700 uppercase">Propuesta de Precio</p>
                       <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span className="text-red-600">${activeOrder.totalPrice?.toFixed(2)}</span>
                       </div>
                       <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.CONFIRMED_BY_CLIENT})} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm">Aceptar y Confirmar</button>
                    </div>
                  )}

                  {activeOrder.status === OrderStatus.IN_DELIVERY && (
                    <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.COMPLETED, completedAt: Date.now()})} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Ya recibí mi pedido</button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Mis Pedidos</h2>
            {pastOrders.length === 0 ? (
              <p className="text-gray-400 text-center py-10 italic">Aún no tienes pedidos.</p>
            ) : (
              <div className="space-y-3">
                {pastOrders.map((order) => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-gray-50 rounded-lg"><Clock size={18} className="text-gray-400" /></div>
                       <div>
                          <p className="font-bold text-sm text-gray-800 line-clamp-1">{order.description}</p>
                          <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
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
                 <h3 className="font-bold text-xl text-gray-800">{clientUser.name}</h3>
                 <p className="text-sm text-gray-500">{clientUser.phone}</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                 <button className="w-full p-4 flex justify-between items-center border-b hover:bg-gray-50">
                    <span className="text-sm font-medium">Mi Ubicación Guardada</span>
                    <MapPin size={16} className="text-gray-400" />
                 </button>
                 <button onClick={onClose} className="w-full p-4 flex justify-between items-center text-red-600 hover:bg-red-50">
                    <span className="text-sm font-bold">Cerrar Sesión</span>
                    <LogOut size={16} />
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="h-16 bg-white border-t fixed bottom-0 left-0 right-0 flex justify-around items-center px-6 z-10">
        <button onClick={() => setActiveTab('HOME')} className={`flex flex-col items-center gap-1 ${activeTab === 'HOME' ? 'text-red-600' : 'text-gray-400'}`}>
          <Home size={20} strokeWidth={activeTab === 'HOME' ? 3 : 2} />
          <span className="text-[9px] font-bold">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('HISTORY')} className={`flex flex-col items-center gap-1 ${activeTab === 'HISTORY' ? 'text-red-600' : 'text-gray-400'}`}>
          <Clock size={20} strokeWidth={activeTab === 'HISTORY' ? 3 : 2} />
          <span className="text-[9px] font-bold">Pedidos</span>
        </button>
        <button onClick={() => setActiveTab('PROFILE')} className={`flex flex-col items-center gap-1 ${activeTab === 'PROFILE' ? 'text-red-600' : 'text-gray-400'}`}>
          <UserIcon size={20} strokeWidth={activeTab === 'PROFILE' ? 3 : 2} />
          <span className="text-[9px] font-bold">Perfil</span>
        </button>
      </div>
    </div>
  );
};