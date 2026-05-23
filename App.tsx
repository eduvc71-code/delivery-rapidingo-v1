import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ClientModule } from './components/client/ClientModule';
import { DeliveryModule } from './components/delivery/DeliveryModule';
import { Register } from './components/Register';
import { UserRole } from './types';

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
