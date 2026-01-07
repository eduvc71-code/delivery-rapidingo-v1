import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderStatus, Order, ChatMessage } from '../../types';
import { 
  Truck, DollarSign, Clock, CheckCircle, Camera, X, 
  Image as ImageIcon, MapPin, Power, Minus, LayoutList, 
  Bike, FileText, Navigation, MessageCircle, Send 
} from 'lucide-react';
import MapPlaceholder from '../shared/MapPlaceholder';

interface DeliveryModuleProps {
    onClose: () => void;
    onMinimize: () => void;
}

export const DeliveryModule: React.FC<DeliveryModuleProps> = ({ onClose, onMinimize }) => {
  const { activeOrder, updateOrder, pastOrders, deliveryUser, logout, addChatMessage } = useApp();
  const [view, setView] = useState<'DASHBOARD' | 'ACTIVE_ORDER' | 'HISTORY'>('DASHBOARD');
  const [reportMode, setReportMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  // Pricing state
  const [productCost, setProductCost] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  
  const [orderPhoto, setOrderPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom">
        <div className="bg-orange-600 p-4 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">C</div>
            <div>
              <p className="font-bold text-sm">Cliente (Chat)</p>
              <p className="text-[10px] opacity-80">Negociando</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {activeOrder.chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === deliveryUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${
                msg.senderId === deliveryUser.id 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                {msg.text}
                <p className="text-[9px] mt-1 text-right opacity-70">
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
            placeholder="Responder al cliente..."
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500"
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
    <div className="h-full flex flex-col relative bg-gray-50">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 shadow-md text-white sticky top-0 z-10">
          <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-lg">Soy Rápido</span>
              <div className="flex gap-2">
                  <button onClick={onMinimize} className="p-2 bg-white/10 rounded-lg"><Minus size={18} /></button>
                  <button onClick={logout} className="p-2 bg-white/10 rounded-lg"><Power size={18} /></button>
              </div>
          </div>
          <div className="flex bg-black/10 p-1 rounded-xl">
              <button onClick={() => setView('DASHBOARD')} className={`flex-1 text-[10px] font-bold py-2 rounded-lg ${view !== 'HISTORY' ? 'bg-white text-orange-600' : 'text-white'}`}>ACTIVIDAD</button>
              <button onClick={() => setView('HISTORY')} className={`flex-1 text-[10px] font-bold py-2 rounded-lg ${view === 'HISTORY' ? 'bg-white text-orange-600' : 'text-white'}`}>GANANCIAS</button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {view !== 'HISTORY' && (
          activeOrder ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="font-bold text-gray-700">Pedido Entrante</h3>
                 <button 
                  onClick={() => setIsChatOpen(true)}
                  className="bg-orange-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-md animate-pulse"
                 >
                   <MessageCircle size={14} /> CHATEAR
                 </button>
              </div>
              
              <div className="bg-yellow-50 p-4 border-l-4 border-orange-500 rounded-r-xl">
                 <p className="text-xs text-orange-700 font-bold mb-1 uppercase tracking-tighter">Descripción:</p>
                 <p className="text-lg font-bold text-gray-900 leading-tight">{activeOrder.description}</p>
              </div>

              {activeOrder.status === OrderStatus.PENDING_PRICE && (
                <div className="bg-white p-4 rounded-2xl border shadow-lg space-y-4">
                  <div onClick={startCamera} className={`h-40 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 ${orderPhoto ? 'border-green-500' : 'border-gray-300'}`}>
                    {orderPhoto ? <img src={orderPhoto} className="w-full h-full object-cover" /> : <div className="text-center text-gray-400"><Camera size={32} className="mx-auto" /><p className="text-[10px] mt-1 font-bold">FOTO DEL PRODUCTO</p></div>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Costo Prod." value={productCost} onChange={(e) => setProductCost(e.target.value)} className="bg-gray-100 p-3 rounded-xl font-bold text-center" />
                    <input type="number" placeholder="Tu Tarifa" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} className="bg-gray-100 p-3 rounded-xl font-bold text-center" />
                  </div>
                  <button onClick={handleSetPrice} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold">Enviar Cotización</button>
                </div>
              )}

              {activeOrder.status === OrderStatus.CONFIRMED_BY_CLIENT && (
                 <button onClick={() => updateOrder({...activeOrder, status: OrderStatus.IN_DELIVERY})} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                   <Navigation size={20} /> INICIAR RUTA
                 </button>
              )}

              <MapPlaceholder showDelivery={activeOrder.status === OrderStatus.IN_DELIVERY} status="Destino del pedido" />
            </div>
          ) : (
            <div className="text-center py-20 opacity-30">
               <LayoutList size={64} className="mx-auto mb-4" />
               <p className="font-bold">Esperando pedidos...</p>
            </div>
          )
        )}

        {view === 'HISTORY' && (
           <div className="space-y-4">
              <h2 className="font-bold text-gray-800">Historial de Turno</h2>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                 <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-400 font-bold uppercase">
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
    </div>
  );
};