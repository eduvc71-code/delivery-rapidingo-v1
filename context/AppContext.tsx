import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Order, UserRole, OrderStatus, ChatMessage } from '../types';
import { MOCK_CLIENT_USER, MOCK_DELIVERY_USER, MOCK_HISTORY } from '../constants';

interface AppContextType {
  clientUser: User | null;
  deliveryUser: User | null;
  currentUser: User | null;
  appMode: UserRole | null;
  activeOrder: Order | null;
  pastOrders: Order[];
  login: (user: User) => void;
  registerUser: (user: User) => void;
  logout: () => void;
  resetSimulation: () => void;
  selectAppMode: (role: UserRole | null) => void;
  createOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  addChatMessage: (msg: ChatMessage) => void;
  switchRole: (role: UserRole) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientUser, setClientUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_clientUser');
    return saved ? JSON.parse(saved) : null; 
  });
  
  const [deliveryUser, setDeliveryUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_deliveryUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appMode, setAppMode] = useState<UserRole | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (clientUser) localStorage.setItem('rapidEnvios_clientUser', JSON.stringify(clientUser));
    else localStorage.removeItem('rapidEnvios_clientUser');
  }, [clientUser]);

  useEffect(() => {
    if (deliveryUser) localStorage.setItem('rapidEnvios_deliveryUser', JSON.stringify(deliveryUser));
    else localStorage.removeItem('rapidEnvios_deliveryUser');
  }, [deliveryUser]);

  useEffect(() => {
    const storedOrder = localStorage.getItem('rapidEnvios_activeOrder');
    if (storedOrder) setActiveOrder(JSON.parse(storedOrder));

    const storedHistory = localStorage.getItem('rapidEnvios_history');
    if (storedHistory) {
      const parsed = JSON.parse(storedHistory);
      setPastOrders(parsed.length > 0 ? parsed : MOCK_HISTORY);
    } else {
      setPastOrders(MOCK_HISTORY);
    }
  }, []);

  useEffect(() => {
    if (activeOrder) localStorage.setItem('rapidEnvios_activeOrder', JSON.stringify(activeOrder));
    else localStorage.removeItem('rapidEnvios_activeOrder');
  }, [activeOrder]);

  useEffect(() => {
    localStorage.setItem('rapidEnvios_history', JSON.stringify(pastOrders));
  }, [pastOrders]);

  const selectAppMode = (role: UserRole | null) => setAppMode(role);
  const login = (user: User) => setCurrentUser(user);
  
  const registerUser = (user: User) => {
    if (user.role === UserRole.CLIENT) setClientUser(user);
    else setDeliveryUser(user);
  };

  const logout = () => {
    setActiveOrder(null);
  };

  const resetSimulation = () => {
    localStorage.clear();
    window.location.reload();
  };

  const createOrder = (order: Order) => setActiveOrder(order);

  const updateOrder = (updatedOrder: Order) => {
    setActiveOrder(updatedOrder);
    if (updatedOrder.status === OrderStatus.COMPLETED) {
      setPastOrders(prev => [updatedOrder, ...prev]);
      setActiveOrder(null);
    }
  };

  const addChatMessage = (msg: ChatMessage) => {
    if (!activeOrder) return;
    const updatedOrder = {
      ...activeOrder,
      chatHistory: [...activeOrder.chatHistory, msg]
    };
    setActiveOrder(updatedOrder);
  };

  const switchRole = (role: UserRole) => {};

  return (
    <AppContext.Provider value={{ 
      clientUser, deliveryUser, currentUser, appMode, activeOrder, pastOrders,
      login, registerUser, logout, resetSimulation, selectAppMode, createOrder, 
      updateOrder, addChatMessage, switchRole
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};