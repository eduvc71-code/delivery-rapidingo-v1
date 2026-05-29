import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { UserRole } from './types';
import { CheckCircle2, Loader2, MapPin } from 'lucide-react';

const ClientModuleV2 = lazy(() => import('./components/client/ClientModuleV2').then((module) => ({ default: module.ClientModuleV2 })));
const DeliveryModuleV2 = lazy(() => import('./components/delivery/DeliveryModuleV2').then((module) => ({ default: module.DeliveryModuleV2 })));
const RestaurantModule = lazy(() => import('./components/restaurant/RestaurantModule').then((module) => ({ default: module.RestaurantModule })));
const AdminModule = lazy(() => import('./components/admin/AdminModule').then((module) => ({ default: module.AdminModule })));
const RegisterV2 = lazy(() => import('./components/RegisterV2').then((module) => ({ default: module.RegisterV2 })));

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
  const { showThankYouDialog, thankYouDialogMessage, setShowThankYouDialog, appMode } = useApp();

  if (!showThankYouDialog) return null;

  const isClient = appMode === UserRole.CLIENT;
  const cardBg = isClient ? 'bg-white text-brand-black border-brand-surface-gray' : 'bg-brand-black text-white border-white/5';
  const mutedText = isClient ? 'text-brand-gray-medium' : 'text-gray-500';
  const titleColor = isClient ? 'text-brand-black' : 'text-white';
  const buttonClass = 'bg-brand-yellow hover:bg-brand-yellow/90 text-brand-black';

  const messageLines = thankYouDialogMessage.split('\n');

  return (
    <div className="absolute inset-0 z-[100] bg-brand-black/80 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
      <div className={`w-full max-w-xs ${cardBg} rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border p-8 space-y-6 flex flex-col items-center text-center animate-scale-up relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-yellow"></div>

        <div className="w-20 h-20 rounded-3xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow animate-bounce-subtle shrink-0 shadow-lg">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>
        
        <div className="space-y-3">
          <h3 className={`text-2xl font-black ${titleColor} font-poppins tracking-tighter uppercase italic`}>¡MUCHAS GRACIAS!</h3>
          <div className={`text-[11px] leading-relaxed font-bold ${mutedText} uppercase tracking-widest font-inter space-y-1`}>
            {messageLines.map((line, idx) => (
              <p key={idx} className="line-clamp-2">{line}</p>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setShowThankYouDialog(false)}
          className={`w-full ${buttonClass} active:scale-[0.97] py-4 rounded-2xl font-black transition-all text-sm tracking-[2px] font-poppins uppercase`}
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

const ModuleFallback: React.FC = () => (
  <div className="h-full flex items-center justify-center bg-brand-black">
    <Loader2 className="text-brand-yellow animate-spin" size={28} />
  </div>
);

const LazyModule: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<ModuleFallback />}>{children}</Suspense>
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
    <div className="bg-brand-black/95 border-b border-brand-yellow/30 p-4 shrink-0 animate-in slide-in-from-top duration-500 relative z-50 text-white shadow-2xl">
      <div className="flex gap-3 items-start">
        <div className="bg-brand-yellow/15 text-brand-yellow p-2 rounded-xl border border-brand-yellow/20 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-brand-yellow uppercase tracking-widest font-poppins">Instalar Aplicación</p>
          
          {platform === 'ANDROID_IN_APP' && (
            <p className="text-xs font-bold text-gray-300 leading-snug mt-1 uppercase font-poppins tracking-tight text-left">
              Estás en un navegador interno. Abre este enlace en <span className="text-brand-yellow font-extrabold">Google Chrome</span> para instalar la app y activar el GPS correctamente.
            </p>
          )}
          
          {platform === 'ANDROID_CHROME' && (
            <div className="mt-1 space-y-2">
              <p className="text-xs font-bold text-gray-300 leading-snug uppercase font-poppins tracking-tight text-left">
                Instala Beep Delivery en tu pantalla de inicio para un GPS más preciso y acceso instantáneo.
              </p>
              <button
                onClick={handleInstallClick}
                className="bg-brand-yellow hover:bg-brand-yellow/90 text-brand-black font-black text-[10px] uppercase font-poppins tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95"
              >
                Instalar Aplicación
              </button>
            </div>
          )}

          {platform === 'IOS_OTHER' && (
            <p className="text-xs font-bold text-gray-300 leading-snug mt-1 uppercase font-poppins tracking-tight text-left">
              Para instalar la app en tu iPhone/iPad, por favor abre este enlace utilizando el navegador <span className="text-brand-yellow font-extrabold">Apple Safari</span>.
            </p>
          )}

          {platform === 'IOS_SAFARI' && (
            <p className="text-xs font-bold text-gray-300 leading-snug mt-1 uppercase font-poppins tracking-tight text-left">
              Para instalar: Presiona el botón <span className="text-brand-yellow font-extrabold">Compartir</span> (caja con flecha arriba) y selecciona <span className="text-brand-yellow font-extrabold">"Agregar a la pantalla de inicio"</span>.
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

  const isClient = role === UserRole.CLIENT;
  const bgClass = isClient ? 'bg-brand-bg-light' : 'bg-brand-black';
  const cardBg = isClient ? 'bg-white text-brand-black border-brand-surface-gray' : 'bg-neutral-900 text-white border-neutral-800';
  const mutedText = isClient ? 'text-brand-gray-medium' : 'text-gray-400';
  const iconBg = 'bg-brand-yellow/10 border-brand-yellow/20 text-brand-yellow';

  return (
    <div className={`h-full flex items-center justify-center p-6 hexagon-pattern ${bgClass}`}>
      <div className={`w-full max-w-sm ${cardBg} rounded-[2rem] border shadow-2xl p-8 text-center space-y-6`}>
        <div className={`mx-auto w-20 h-20 rounded-3xl ${iconBg} flex items-center justify-center`}>
          <MapPin size={44} />
        </div>
        <div>
          <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[3px] font-poppins">ACTIVAR UBICACION</p>
          <h2 className="text-2xl font-black font-poppins uppercase tracking-tight mt-2">
            {isClient ? 'Ubicacion del cliente' : 'Ubicacion del delivery'}
          </h2>
          <p className={`text-xs ${mutedText} font-bold mt-3 uppercase tracking-widest font-inter`}>
            Ubicacion lista para compartir durante pedidos.
          </p>
        </div>
        <button
          onClick={requestGps}
          disabled={isRequesting}
          className="w-full bg-brand-yellow text-brand-black py-5 rounded-2xl font-black font-poppins uppercase tracking-[2px] disabled:opacity-60 flex items-center justify-center gap-3 active:scale-95 transition-all"
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
    const isClient = activeRole === UserRole.CLIENT;
    const bgClass = isClient ? 'bg-brand-bg-light' : 'bg-brand-black';
    const textClass = isClient ? 'text-brand-black' : 'text-white';
    const accentClass = 'text-brand-yellow';

    return (
      <ResponsiveShell>
        <div className={`h-full flex flex-col items-center justify-center space-y-5 ${bgClass} hexagon-pattern`}>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-brand-yellow blur-xl opacity-25 animate-pulse"></div>
            <img
              src="assets/brand/rapidingo-logo.png"
              alt="Beep Delivery"
              className={`relative h-20 w-20 rounded-[24px] object-cover border ${isClient ? 'border-brand-surface-gray' : 'border-white/10'} shadow-2xl animate-bounce-subtle`}
            />
          </div>
          <div className="text-center">
            <p className={`font-black ${accentClass} uppercase tracking-[3px] text-[10px] font-poppins`}>
              BEEP DELIVERY
            </p>
            <p className={`font-semibold ${textClass} text-xs mt-1 animate-pulse font-poppins`}>
              {checkingGpsSession ? 'VALIDANDO GPS REALTIME...' : 'INICIANDO SESIÓN...'}
            </p>
          </div>
        </div>
      </ResponsiveShell>
    );
  }

  if (activeRole === UserRole.CLIENT) {
    if (!clientUser) {
      return (
        <ResponsiveShell>
          <PwaInstallBanner />
          <LazyModule>
            <RegisterV2
              role={UserRole.CLIENT}
              onRegister={(user) => {
                registerUser(user);
                selectAppMode(UserRole.CLIENT);
              }}
            />
          </LazyModule>
        </ResponsiveShell>
      );
    }

    return (
      <ResponsiveShell>
        <PwaInstallBanner />
        {!gpsApprovedInSession ? (
          <GpsRequiredGate role={UserRole.CLIENT} onLocation={handleGpsSuccess} />
        ) : (
          <LazyModule>
            <ClientModuleV2 onClose={goHome} />
          </LazyModule>
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
          <LazyModule>
            <RegisterV2
              role={UserRole.DELIVERY}
              onRegister={(user) => {
                registerUser(user);
                selectAppMode(UserRole.DELIVERY);
              }}
            />
          </LazyModule>
        </ResponsiveShell>
      );
    }

    return (
      <ResponsiveShell>
        <PwaInstallBanner />
        {!gpsApprovedInSession ? (
          <GpsRequiredGate role={UserRole.DELIVERY} onLocation={handleGpsSuccess} />
        ) : (
          <LazyModule>
            <DeliveryModuleV2
              onClose={closeInstalledApp}
              onMinimize={goHome}
            />
          </LazyModule>
        )}
        <ThankYouDialog />
      </ResponsiveShell>
    );
  }

  if (activeRole === UserRole.RESTAURANT) {
    return (
      <ResponsiveShell>
        <LazyModule>
          <RestaurantModule />
        </LazyModule>
        <ThankYouDialog />
      </ResponsiveShell>
    );
  }

  if (activeRole === UserRole.ADMIN || activeRole === UserRole.OPERATOR) {
    return (
      <ResponsiveShell>
        <LazyModule>
          <AdminModule role={activeRole} />
        </LazyModule>
        <ThankYouDialog />
      </ResponsiveShell>
    );
  }

  return null;
};

export default function AppV2() {
  return (
    <AppProvider>
      <PwaApp />
    </AppProvider>
  );
}
