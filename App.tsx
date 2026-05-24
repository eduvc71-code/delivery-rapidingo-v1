import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ClientModule } from './components/client/ClientModule';
import { DeliveryModule } from './components/delivery/DeliveryModule';
import { Register } from './components/Register';
import { UserRole } from './types';
import { CheckCircle2 } from 'lucide-react';

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
    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
      <div className="w-full max-w-xs bg-white rounded-[2rem] shadow-2xl border border-orange-50 p-6 space-y-5 flex flex-col items-center text-center animate-scale-up">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 animate-bounce-subtle shrink-0">
          <CheckCircle2 size={42} strokeWidth={2.5} />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-xl font-black text-gray-900 tracking-wider">¡MUCHAS GRACIAS!</h3>
          <div className="text-[13px] leading-relaxed font-black text-gray-500 uppercase tracking-widest space-y-1">
            {messageLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setShowThankYouDialog(false)}
          className="w-full bg-[#d32f2f] hover:bg-[#b71c1c] active:scale-[0.97] text-white py-3.5 rounded-2xl font-black transition-all shadow-lg shadow-red-600/10 text-xs tracking-widest uppercase"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

const ResponsiveShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-dvh bg-[#f2f2f2] lg:flex lg:items-center lg:justify-center lg:p-6">
    <div className="h-dvh min-h-dvh bg-white overflow-hidden relative lg:h-[820px] lg:min-h-0 lg:w-[430px] lg:max-h-[calc(100vh-48px)] lg:rounded-[2rem] lg:shadow-2xl lg:ring-1 lg:ring-[#0d1321]/10">
      {children}
    </div>
  </div>
);

const PwaApp: React.FC = () => {
  const { appMode, clientUser, deliveryUser, registerUser, selectAppMode, isCheckingSession } = useApp();
  const forcedRole = getUrlRole();

  // Si tenemos un usuario guardado pero no tenemos modo seleccionado (root), auto-seleccionamos
  useEffect(() => {
    if (!forcedRole && !appMode) {
      if (clientUser) selectAppMode(UserRole.CLIENT);
      else if (deliveryUser) selectAppMode(UserRole.DELIVERY);
    }
  }, [forcedRole, appMode, clientUser, deliveryUser, selectAppMode]);

  const activeRole = forcedRole || appMode || UserRole.CLIENT;

  useEffect(() => {
    if (forcedRole && forcedRole !== appMode) selectAppMode(forcedRole);
  }, [forcedRole, appMode, selectAppMode]);

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
        <div className="h-full flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
          <p className="font-black text-orange-600 animate-pulse uppercase tracking-widest text-xs">Rapidingo...</p>
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
        <ClientModule onClose={goHome} />
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
        <DeliveryModule
          onClose={closeInstalledApp}
          onMinimize={goHome}
        />
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
