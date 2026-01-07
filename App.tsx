import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ClientModule } from './components/client/ClientModule';
import { DeliveryModule } from './components/delivery/DeliveryModule';
import { Register } from './components/Register';
import { Signal, Wifi, Battery, ShoppingBag, Bike, RotateCcw, Download } from 'lucide-react';
import { OrderStatus, UserRole } from './types';

// Sonido de notificación corto
const NOTIFICATION_SOUND = "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAFRTU0UAAAAPAAADTGF2ZjU3LjU2LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYaW5nAAAARAAAAAsAAADkAABSnQECAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwP/7kGQAAfAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7kGQAAfAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7kGQAAfAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7kGQAAfAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7kGQAAfAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7kGQAAfAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7kGQAAfAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7kGQAA/AAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAOAAAAABaAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD";

const PhoneFrame: React.FC<{ children: React.ReactNode, title: string, color: 'blue' | 'black' }> = ({ children, title, color }) => {
    const borderColor = color === 'blue' ? 'border-gray-800' : 'border-gray-900';
    
    return (
        <div className="flex flex-col items-center gap-4">
            <h2 className="text-gray-500 font-bold uppercase tracking-wider text-sm">{title}</h2>
            <div className={`w-[320px] h-[650px] bg-white rounded-[3rem] border-[8px] ${borderColor} shadow-2xl overflow-hidden relative flex flex-col ring-4 ring-gray-300`}>
                {/* Status Bar */}
                <div className="h-7 w-full bg-white z-50 shrink-0 flex items-center justify-between px-5 text-[10px] font-medium text-black border-b border-gray-50">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                        <Signal size={10} strokeWidth={3} />
                        <Wifi size={10} strokeWidth={3} />
                        <Battery size={12} strokeWidth={3} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-gray-50 scrollbar-hide">
                    {children}
                </div>

                {/* Home Indicator */}
                <div className="h-5 w-full bg-white shrink-0 flex justify-center items-center">
                    <div className="w-24 h-1 rounded-full bg-gray-300"></div>
                </div>
            </div>
        </div>
    );
};

const PhoneHomeScreen: React.FC<{ type: 'CLIENT' | 'DELIVERY', onOpen: () => void, notificationCount?: number }> = ({ type, onOpen, notificationCount = 0 }) => {
    const isClient = type === 'CLIENT';
    const bgImage = isClient 
        ? "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop"
        : "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop";

    return (
        <div className="h-full w-full relative flex flex-col items-center pt-12">
            {/* Wallpaper */}
            <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url("${bgImage}")` }} />
            <div className="absolute inset-0 z-0 bg-black/20" />

            {/* Time */}
            <div className="z-10 text-white text-center drop-shadow-md mb-8">
                <h1 className="text-6xl font-thin">09:41</h1>
                <p className="text-lg">Domingo, 12 Enero</p>
            </div>

            {/* App Grid */}
            <div className="z-10 grid grid-cols-4 gap-4 px-4 w-full">
                <button 
                    onClick={onOpen}
                    className="flex flex-col items-center gap-1 group relative"
                >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg border border-white/20 transition-transform group-active:scale-95 bg-gradient-to-br ${
                        isClient ? 'from-red-500 to-orange-500' : 'from-orange-600 to-red-600'
                    }`}>
                        {isClient ? <ShoppingBag className="text-white" size={24} /> : <Bike className="text-white" size={28} />}
                    </div>
                    
                    {/* Notification Badge */}
                    {notificationCount > 0 && (
                        <div className="absolute -top-1 right-2 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white/50 animate-bounce">
                            {notificationCount}
                        </div>
                    )}
                    
                    <span className="text-white text-[10px] font-medium drop-shadow">{isClient ? 'Rapidingo' : 'Soy Rápido'}</span>
                </button>
                
                {/* Dummy Icons */}
                {[...Array(3)].map((_, i) => (
                     <div key={i} className="flex flex-col items-center gap-1 opacity-80">
                        <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"></div>
                     </div>
                ))}
            </div>

            {/* Dock */}
            <div className="mt-auto mb-4 mx-2 z-10 w-[90%] h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-around px-2 border border-white/10">
                <div className="w-12 h-12 bg-green-500 rounded-xl"></div>
                <div className="w-12 h-12 bg-gray-400 rounded-xl"></div>
                <div className="w-12 h-12 bg-blue-400 rounded-xl"></div>
                <div className="w-12 h-12 bg-pink-500 rounded-xl"></div>
            </div>
        </div>
    );
}

const DualLayout: React.FC = () => {
  const { activeOrder, clientUser, deliveryUser, resetSimulation, registerUser } = useApp();
  
  const [clientAppOpen, setClientAppOpen] = useState(false);
  
  // Delivery App State
  const [deliveryAppState, setDeliveryAppState] = useState<'CLOSED' | 'OPEN' | 'BACKGROUND'>('BACKGROUND');
  const [deliveryNotification, setDeliveryNotification] = useState(0);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Capture PWA Install Event
  useEffect(() => {
    const handler = (e: any) => {
        // Prevent default browser banner to show our custom button
        e.preventDefault();
        setInstallPrompt(e);
        console.log("PWA Install Prompt Captured");
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Usuario aceptó instalar la app');
        }
        setInstallPrompt(null);
    });
  };

  // Sound Logic
  useEffect(() => {
    // Si la app está en BACKGROUND y llega un nuevo pedido
    if (deliveryAppState === 'BACKGROUND' && activeOrder?.status === OrderStatus.PENDING_PRICE) {
        setDeliveryNotification(1);
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.play().catch(e => console.log("Audio play failed (interaction needed)", e));
    } else if (deliveryAppState === 'OPEN') {
        setDeliveryNotification(0);
    }
  }, [activeOrder, deliveryAppState]);

  // Content for Client Phone
  const renderClientContent = () => {
    // Si la app no está "abierta", mostrar Home Screen
    if (!clientAppOpen) return <PhoneHomeScreen type="CLIENT" onOpen={() => setClientAppOpen(true)} />;
    
    // Si está abierta pero no hay usuario logueado, mostrar Registro
    if (!clientUser) return <Register role={UserRole.CLIENT} onRegister={registerUser} />;
    
    // Si hay usuario, mostrar Módulo Cliente
    return <ClientModule onClose={() => setClientAppOpen(false)} />;
  };

  // Content for Delivery Phone
  const renderDeliveryContent = () => {
    // Si la app está CERRADA o EN BACKGROUND, mostrar Home Screen
    if (deliveryAppState !== 'OPEN') return (
        <PhoneHomeScreen 
            type="DELIVERY" 
            onOpen={() => setDeliveryAppState('OPEN')} 
            notificationCount={deliveryNotification}
        />
    );

    // Si está abierta pero no hay usuario, mostrar Registro
    if (!deliveryUser) return <Register role={UserRole.DELIVERY} onRegister={registerUser} />;

    // Si hay usuario, mostrar Módulo Repartidor
    return (
        <DeliveryModule 
            onClose={() => setDeliveryAppState('CLOSED')} 
            onMinimize={() => setDeliveryAppState('BACKGROUND')}
        />
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans p-8">
      <div className="flex flex-wrap gap-16 justify-center items-center">
        {/* Dispositivo Cliente */}
        <PhoneFrame title="Dispositivo Cliente" color="blue">
            {renderClientContent()}
        </PhoneFrame>

        {/* Flecha indicadora */}
        <div className="hidden md:flex flex-col items-center gap-2 text-gray-400">
             <div className="text-xs font-medium uppercase tracking-widest">Sincronización</div>
             <div className="w-16 h-[2px] bg-gray-300"></div>
        </div>

        {/* Dispositivo Repartidor */}
        <PhoneFrame title="Dispositivo Repartidor" color="black">
            {renderDeliveryContent()}
        </PhoneFrame>
      </div>
      
      <div className="mt-12 flex flex-col items-center gap-4">
          <p className="text-gray-500 text-sm font-medium">
            Simulación de Entorno Real • Rapidingo Delivery
          </p>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={resetSimulation}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
                <RotateCcw size={14} />
                Reiniciar Simulación
            </button>

            {installPrompt && (
                <button 
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-700 rounded-lg shadow-lg text-sm text-white font-bold hover:bg-blue-700 transition-transform active:scale-95 animate-pulse"
                >
                    <Download size={16} />
                    Instalar App en Dispositivo
                </button>
            )}
          </div>
          
          {installPrompt ? (
             <p className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                ¡App lista para instalar! Presiona el botón azul.
             </p>
          ) : (
             <p className="text-[10px] text-gray-400">
                Para instalar, usa el menú "Agregar a Inicio" de tu navegador o espera a que aparezca el botón azul aquí.
             </p>
          )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DualLayout />
    </AppProvider>
  );
}