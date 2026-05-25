import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ClientModule } from './components/client/ClientModule';
import { DeliveryModule } from './components/delivery/DeliveryModule';
import { Register } from './components/Register';
import { UserRole } from './types';
import { CheckCircle2, Loader2, MapPin } from 'lucide-react';

const getUrlRole = (): UserRole | null => {
  const injectedRole = (window as Window & { __RAPIDINGO_ROLE?: string }).__RAPIDINGO_ROLE;
  if (injectedRole === 'client') return UserRole.CLIENT;
  if (injectedRole === 'delivery') return UserRole.DELIVERY;

  const role = new URLSearchParams(window.location.search).get('role');
  if (role === 'client' || role === 'cliente') return UserRole.CLIENT;
  if (role === 'delivery') return UserRole.DELIVERY;

  const path = window.location.pathname.toLowerCase();
  if (path.includes('/cliente/')) return UserRole.CLIENT;
  if (path.includes('/client/')) return UserRole.CLIENT;
  if (path.includes('/delivery/')) return UserRole.DELIVERY;

  return null;
};

const ThankYouDialog: React.FC = () => {
  const { showThankYouDialog, thankYouDialogMessage, setShowThankYouDialog } = useApp();

  if (!showThankYouDialog) return null;

  const messageLines = thankYouDialogMessage.split('\n');

  return (
    <div className="absolute inset-0 z-[100] bg-brand-black/80 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
      <div className="w-full max-w-xs bg-brand-black rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,1)] border border-white/5 p-8 space-y-6 flex flex-col items-center text-center animate-scale-up relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-yellow"></div>

        <div className="w-20 h-20 rounded-3xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange animate-bounce-subtle shrink-0 shadow-lg shadow-brand-orange/5">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-white font-montserrat tracking-tighter uppercase italic">¡MUCHAS GRACIAS!</h3>
          <div className="text-[11px] leading-relaxed font-bold text-gray-500 uppercase tracking-widest font-teko space-y-1 italic">
            {messageLines.map((line, idx) => (
              <p key={idx} className="line-clamp-2">{line}</p>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setShowThankYouDialog(false)}
          className="w-full bg-brand-orange hover:bg-brand-orange/90 active:scale-[0.97] text-white py-4 rounded-2xl font-black transition-all shadow-[0_8px_20px_rgba(255,106,0,0.3)] text-sm tracking-[3px] font-teko uppercase italic"
        >
          CERRAR
        </button>
      </div>
    </div>
  );
};

const ResponsiveShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-dvh bg-brand-black lg:flex lg:items-center lg:justify-center lg:p-6">
    <div className="h-dvh min-h-dvh bg-brand-black overflow-hidden relative lg:h-[820px] lg:min-h-0 lg:w-[430px] lg:max-h-[calc(100vh-48px)] lg:rounded-[2rem] lg:shadow-[0_0_50px_rgba(0,0,0,0.8)] lg:border lg:border-white/5">
      {children}
    </div>
  </div>
);

const hasValidLocation = (location?: { lat: number; lng: number }) =>
  Boolean(location && (location.lat !== 0 || location.lng !== 0));

const GpsRequiredGate: React.FC<{ role: UserRole; onLocation: (location: { lat: number; lng: number }) => void }> = ({ role, onLocation }) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestGps = () => {
    if (!('geolocation' in navigator)) {
      alert('Este dispositivo no tiene GPS disponible.');
      return;
    }

    setIsRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsRequesting(false);
        onLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setIsRequesting(false);
        console.error('GPS requerido:', error);
        alert('Activa el GPS y permite la ubicacion para continuar.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  return (
    <div className="h-full flex items-center justify-center p-6 hexagon-pattern text-white">
      <div className="w-full max-w-sm bg-brand-black rounded-[2rem] border border-white/5 shadow-2xl p-8 text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange">
          <MapPin size={44} />
        </div>
        <div>
          <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[4px] font-teko italic">ACTIVAR UBICACION</p>
          <h2 className="text-2xl font-black font-montserrat uppercase tracking-tight mt-2">
            {role === UserRole.CLIENT ? 'Ubicacion del cliente' : 'Ubicacion del delivery'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-3 uppercase tracking-widest font-teko italic">
            Ubicacion lista para compartir durante pedidos.
          </p>
        </div>
        <button
          onClick={requestGps}
          disabled={isRequesting}
          className="w-full bg-brand-orange text-white py-5 rounded-2xl font-black font-teko italic uppercase tracking-[4px] disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {isRequesting ? <Loader2 className="animate-spin" /> : <MapPin size={20} />}
          ACTIVAR UBICACION
        </button>
      </div>
    </div>
  );
};

const PwaApp: React.FC = () => {
  const { appMode, clientUser, deliveryUser, registerUser, selectAppMode, isCheckingSession, updateCurrentUserLocation } = useApp();
  const forcedRole = getUrlRole();
  const activeRole = forcedRole || UserRole.CLIENT;

  useEffect(() => {
    if (activeRole !== appMode) selectAppMode(activeRole);
  }, [activeRole, appMode, selectAppMode]);

  const goHome = () => {
    selectAppMode(null);
    if (forcedRole) {
      window.location.href = window.location.pathname;
    }
  };

  const closeInstalledApp = () => {
    selectAppMode(null);
    window.close();
    window.setTimeout(() => {
      window.location.href = 'about:blank';
    }, 150);
  };

  if (isCheckingSession) {
    return (
      <ResponsiveShell>
        <div className="h-full flex flex-col items-center justify-center space-y-4 hexagon-pattern">
          <div className="w-16 h-16 border-4 border-white/5 border-t-brand-orange rounded-full animate-spin shadow-[0_0_15px_rgba(255,106,0,0.3)]"></div>
          <p className="font-black text-brand-orange animate-pulse uppercase tracking-[4px] text-[10px] font-teko italic">Iniciando...</p>
        </div>
      </ResponsiveShell>
    );
  }

  if (activeRole === UserRole.CLIENT) {
    if (!clientUser) {
      return (
        <ResponsiveShell>
          <Register
            role={UserRole.CLIENT}
            onRegister={(user) => {
              registerUser(user);
              selectAppMode(UserRole.CLIENT);
            }}
          />
        </ResponsiveShell>
      );
    }

    return (
      <ResponsiveShell>
        {!hasValidLocation(clientUser.location) ? (
          <GpsRequiredGate role={UserRole.CLIENT} onLocation={updateCurrentUserLocation} />
        ) : (
        <ClientModule onClose={goHome} />
        )}
        <ThankYouDialog />
      </ResponsiveShell>
    );
  }

  if (activeRole === UserRole.DELIVERY) {
    if (!deliveryUser) {
      return (
        <ResponsiveShell>
          <Register
            role={UserRole.DELIVERY}
            onRegister={(user) => {
              registerUser(user);
              selectAppMode(UserRole.DELIVERY);
            }}
          />
        </ResponsiveShell>
      );
    }

    return (
      <ResponsiveShell>
        {!hasValidLocation(deliveryUser.location) ? (
          <GpsRequiredGate role={UserRole.DELIVERY} onLocation={updateCurrentUserLocation} />
        ) : (
        <DeliveryModule
          onClose={closeInstalledApp}
          onMinimize={goHome}
        />
        )}
        <ThankYouDialog />
      </ResponsiveShell>
    );
  }

  return null;
};

export default function App() {
  return (
    <AppProvider>
      <PwaApp />
    </AppProvider>
  );
}
