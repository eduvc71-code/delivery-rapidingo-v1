import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ClientModule } from './components/client/ClientModule';
import { DeliveryModule } from './components/delivery/DeliveryModule';
import { RestaurantModule } from './components/restaurant/RestaurantModule';
import { AdminModule } from './components/admin/AdminModule';
import { Register } from './components/Register';
import { UserRole } from './types';
import { CheckCircle2, Loader2, MapPin } from 'lucide-react';

const getUrlRole = (): UserRole | null => {
  const injectedRole = (window as Window & { __RAPIDINGO_ROLE?: string }).__RAPIDINGO_ROLE;
  if (injectedRole === 'client') return UserRole.CLIENT;
  if (injectedRole === 'delivery') return UserRole.DELIVERY;
  if (injectedRole === 'restaurant') return UserRole.RESTAURANT;
  if (injectedRole === 'admin') return UserRole.ADMIN;
  if (injectedRole === 'operador' || injectedRole === 'operator') return UserRole.OPERATOR;

  const role = new URLSearchParams(window.location.search).get('role');
  if (role === 'client' || role === 'cliente') return UserRole.CLIENT;
  if (role === 'delivery') return UserRole.DELIVERY;
  if (role === 'restaurant' || role === 'restaurante') return UserRole.RESTAURANT;
  if (role === 'admin') return UserRole.ADMIN;
  if (role === 'operador' || role === 'operator') return UserRole.OPERATOR;

  const path = window.location.pathname.toLowerCase();
  if (path.includes('/cliente/')) return UserRole.CLIENT;
  if (path.includes('/client/')) return UserRole.CLIENT;
  if (path.includes('/delivery/')) return UserRole.DELIVERY;
  if (path.includes('/restaurant/')) return UserRole.RESTAURANT;
  if (path.includes('/restaurante/')) return UserRole.RESTAURANT;
  if (path.includes('/admin/')) return UserRole.ADMIN;
  if (path.includes('/operador/')) return UserRole.OPERATOR;
  if (path.includes('/operator/')) return UserRole.OPERATOR;

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

const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

const isInAppBrowser = () => {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|WhatsApp|Pinterest|GSA/i.test(ua) || 
         (isAndroid && !/Chrome/i.test(ua));
};

const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<'ANDROID_IN_APP' | 'ANDROID_CHROME' | 'IOS_OTHER' | 'IOS_SAFARI' | null>(null);

  useEffect(() => {
    if (isStandalone()) {
      setShowBanner(false);
      return;
    }

    const inApp = isInAppBrowser();

    if (isAndroid) {
      if (inApp) {
        setPlatform('ANDROID_IN_APP');
        setShowBanner(true);
      } else {
        setPlatform('ANDROID_CHROME');
        setShowBanner(true);
      }
    } else if (isIOS) {
      const ua = navigator.userAgent;
      const isSafari = /Safari/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua) && !inApp;
      if (isSafari) {
        setPlatform('IOS_SAFARI');
        setShowBanner(true);
      } else {
        setPlatform('IOS_OTHER');
        setShowBanner(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Por favor, presiona los tres puntos (⋮) en la esquina superior derecha y selecciona 'Instalar aplicación' o 'Agregar a la pantalla de inicio'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="bg-brand-black/95 border-b border-brand-orange/30 p-4 shrink-0 animate-in slide-in-from-top duration-500 relative z-50 text-white shadow-2xl">
      <div className="flex gap-3 items-start">
        <div className="bg-brand-orange/15 text-brand-orange p-2 rounded-xl border border-brand-orange/20 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-brand-yellow uppercase tracking-widest font-teko italic">Instalar Aplicación</p>
          
          {platform === 'ANDROID_IN_APP' && (
            <p className="text-xs font-bold text-gray-300 leading-snug mt-1 uppercase font-montserrat tracking-tight text-left">
              Estás en un navegador interno. Abre este enlace en <span className="text-brand-orange font-extrabold">Google Chrome</span> para instalar la app y activar el GPS correctamente.
            </p>
          )}
          
          {platform === 'ANDROID_CHROME' && (
            <div className="mt-1 space-y-2">
              <p className="text-xs font-bold text-gray-300 leading-snug uppercase font-montserrat tracking-tight text-left">
                Instala Rapidingo en tu pantalla de inicio para un GPS más preciso y acceso instantáneo.
              </p>
              <button
                onClick={handleInstallClick}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-[10px] uppercase font-teko tracking-wider px-4 py-2 rounded-xl italic transition-all active:scale-95"
              >
                Instalar Aplicación
              </button>
            </div>
          )}

          {platform === 'IOS_OTHER' && (
            <p className="text-xs font-bold text-gray-300 leading-snug mt-1 uppercase font-montserrat tracking-tight text-left">
              Para instalar la app en tu iPhone/iPad, por favor abre este enlace utilizando el navegador <span className="text-brand-orange font-extrabold">Apple Safari</span>.
            </p>
          )}

          {platform === 'IOS_SAFARI' && (
            <p className="text-xs font-bold text-gray-300 leading-snug mt-1 uppercase font-montserrat tracking-tight text-left">
              Para instalar: Presiona el botón <span className="text-brand-yellow">Compartir</span> (caja con flecha arriba) y selecciona <span className="text-brand-orange font-extrabold">"Agregar a la pantalla de inicio"</span>.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

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
  const { appMode, clientUser, deliveryUser, restaurantUser, registerUser, selectAppMode, isCheckingSession, updateCurrentUserLocation } = useApp();
  const forcedRole = getUrlRole();
  const activeRole = forcedRole || UserRole.CLIENT;
  const [gpsApprovedInSession, setGpsApprovedInSession] = useState(false);
  const [checkingGpsSession, setCheckingGpsSession] = useState(true);

  useEffect(() => {
    if (activeRole !== appMode) selectAppMode(activeRole);
  }, [activeRole, appMode, selectAppMode]);

  // Validar GPS al inicio de la sesión para Cliente y Delivery
  useEffect(() => {
    const checkSessionGps = () => {
      const user = activeRole === UserRole.CLIENT ? clientUser : (activeRole === UserRole.DELIVERY ? deliveryUser : null);
      if (!user) {
        setCheckingGpsSession(false);
        return;
      }

      setCheckingGpsSession(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateCurrentUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGpsApprovedInSession(true);
          setCheckingGpsSession(false);
        },
        (error) => {
          console.warn("GPS Realtime no disponible al inicio:", error);
          setGpsApprovedInSession(false);
          setCheckingGpsSession(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    };

    checkSessionGps();
  }, [activeRole, clientUser?.id, deliveryUser?.id]);

  const handleGpsSuccess = (location: { lat: number; lng: number }) => {
    updateCurrentUserLocation(location);
    setGpsApprovedInSession(true);
  };

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

  if (isCheckingSession || checkingGpsSession) {
    return (
      <ResponsiveShell>
        <div className="h-full flex flex-col items-center justify-center space-y-4 hexagon-pattern animate-pulse">
          <div className="w-16 h-16 border-4 border-white/5 border-t-brand-orange rounded-full animate-spin shadow-[0_0_15px_rgba(255,106,0,0.3)]"></div>
          <p className="font-black text-brand-orange uppercase tracking-[4px] text-[10px] font-teko italic">
            {checkingGpsSession ? 'VALIDANDO GPS REALTIME...' : 'Iniciando...'}
          </p>
        </div>
      </ResponsiveShell>
    );
  }

  if (activeRole === UserRole.CLIENT) {
    if (!clientUser) {
      return (
        <ResponsiveShell>
          <PwaInstallBanner />
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
        <PwaInstallBanner />
        {!gpsApprovedInSession ? (
          <GpsRequiredGate role={UserRole.CLIENT} onLocation={handleGpsSuccess} />
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
          <PwaInstallBanner />
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
        <PwaInstallBanner />
        {!gpsApprovedInSession ? (
          <GpsRequiredGate role={UserRole.DELIVERY} onLocation={handleGpsSuccess} />
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

  if (activeRole === UserRole.RESTAURANT) {
    return (
      <ResponsiveShell>
        <RestaurantModule />
        <ThankYouDialog />
      </ResponsiveShell>
    );
  }

  if (activeRole === UserRole.ADMIN || activeRole === UserRole.OPERATOR) {
    return (
      <ResponsiveShell>
        <AdminModule role={activeRole} />
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
