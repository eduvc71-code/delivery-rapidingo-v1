import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Order, UserRole, OrderStatus, ChatMessage } from '../types';
import { MOCK_HISTORY } from '../constants';
import { SupabasePwaApi } from '../services/supabase';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AppContextType {
  clientUser: User | null;
  deliveryUser: User | null;
  assignedDelivery: User | null;
  availableDeliveries: User[];
  currentUser: User | null;
  appMode: UserRole | null;
  activeOrder: Order | null;
  pastOrders: Order[];
  isCheckingSession: boolean;
  login: (user: User) => void;
  registerUser: (user: User) => void;
  updateCurrentUserPhone: (phone: string) => void;
  logout: () => boolean;
  resetSimulation: () => void;
  selectAppMode: (role: UserRole | null) => void;
  createOrder: (order: Order) => Promise<void>;
  updateOrder: (order: Order) => void;
  addChatMessage: (msg: ChatMessage) => void;
  switchRole: (role: UserRole) => void;
  showThankYouDialog: boolean;
  thankYouDialogMessage: string;
  setShowThankYouDialog: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [clientUser, setClientUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_clientUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [deliveryUser, setDeliveryUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_deliveryUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appMode, setAppMode] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_appMode');
    return saved === UserRole.CLIENT || saved === UserRole.DELIVERY ? saved : null;
  });
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<User[]>([]);
  const [assignedDelivery, setAssignedDelivery] = useState<User | null>(null);

  const [showThankYouDialog, setShowThankYouDialog] = useState(false);
  const [thankYouDialogMessage, setThankYouDialogMessage] = useState('');
  const [prevActiveOrder, setPrevActiveOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (prevActiveOrder && !activeOrder) {
      const user = appMode === UserRole.DELIVERY ? deliveryUser : clientUser;
      if (user) {
        const wasCancelled = prevActiveOrder.status === OrderStatus.CANCELLED ||
                            prevActiveOrder.status === OrderStatus.PENDING_PRICE ||
                            prevActiveOrder.status === OrderStatus.BIDDING;

        let msg = '';
        if (wasCancelled) {
          msg = appMode === UserRole.CLIENT
            ? "LO SENTIMOS NO HUBO REPARTIDORES DISPONIBLES"
            : "LO SENTIMOS EL PEDIDO FUE CANCELADO";
        } else {
          msg = appMode === UserRole.CLIENT
            ? "ENTREGA EXITOSA GRACIAS POR TU CONFIANZA"
            : "PEDIDO COMPLETADO GRACIAS POR EL SERVICIO";
        }
        setThankYouDialogMessage(msg);
        setShowThankYouDialog(true);
      }
    }
    setPrevActiveOrder(activeOrder);
  }, [activeOrder, appMode, clientUser, deliveryUser]);

  useEffect(() => {
    // Si ya tenemos datos locales, dejamos de mostrar el cargando rapido
    if (clientUser || deliveryUser) {
      setIsCheckingSession(false);
    }

    return onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setIsCheckingSession(false);
        return;
      }

      SupabasePwaApi.getUser(firebaseUser.uid)
        .then(async (savedUser) => {
          if (!savedUser && firebaseUser.email) {
            savedUser = await SupabasePwaApi.getUserByEmail(firebaseUser.email);
          }
          if (savedUser) {
            if (savedUser.role === UserRole.CLIENT) setClientUser(savedUser);
            if (savedUser.role === UserRole.DELIVERY) setDeliveryUser(savedUser);
            setAppMode(savedUser.role);
          }
          setIsCheckingSession(false);
        })
        .catch((error) => {
          console.error('No se pudo restaurar sesion Gmail desde Supabase:', error);
          setIsCheckingSession(false);
        });
    });
  }, []);

  // Supabase es la base comun para PWA y APK. Firebase queda solo para Gmail.
  useEffect(() => {
    const user = appMode === UserRole.DELIVERY ? deliveryUser : clientUser;
    if (!appMode || !user) return;

    let cancelled = false;

    const loadOrders = async () => {
      try {
        const [orders, deliveryUsers] = await Promise.all([
          SupabasePwaApi.getOrders(),
          SupabasePwaApi.getDeliveryUsers(),
        ]);
        if (cancelled) return;

        const onlineDeliveries = deliveryUsers.filter((delivery) => delivery.isOnline);
        setAvailableDeliveries(onlineDeliveries);

        const nextOrder = appMode === UserRole.CLIENT
          ? orders.find((order) =>
              order.clientId === user.id &&
              order.status !== OrderStatus.COMPLETED &&
              order.status !== OrderStatus.CANCELLED
            )
          : orders.find((order) =>
              order.deliveryId === user.id &&
              order.status !== OrderStatus.COMPLETED &&
              order.status !== OrderStatus.CANCELLED
            ) || orders.find((order) =>
              order.status === OrderStatus.PENDING_PRICE &&
              (!order.targetDeliveryId || order.targetDeliveryId === user.id) &&
              !order.rejectedBy?.includes(user.id)
            );

        setActiveOrder(nextOrder || null);

        if (nextOrder) {
          const deliveryId = nextOrder.deliveryId || nextOrder.targetDeliveryId;
          setAssignedDelivery(onlineDeliveries.find((delivery) => delivery.id === deliveryId) || null);
        } else {
          setAssignedDelivery(onlineDeliveries[0] || null);
        }
      } catch (error) {
        console.error('Error escuchando pedidos en Supabase:', error);
      }
    };

    loadOrders();
    const intervalId = window.setInterval(loadOrders, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [appMode, clientUser?.id, deliveryUser?.id]);

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
      setPastOrders(parsed);
    } else {
      setPastOrders([]);
    }
  }, []);

  useEffect(() => {
    if (activeOrder) localStorage.setItem('rapidEnvios_activeOrder', JSON.stringify(activeOrder));
    else localStorage.removeItem('rapidEnvios_activeOrder');
  }, [activeOrder]);

  useEffect(() => {
    localStorage.setItem('rapidEnvios_history', JSON.stringify(pastOrders));
  }, [pastOrders]);

  useEffect(() => {
    if (appMode) localStorage.setItem('rapidEnvios_appMode', appMode);
    else localStorage.removeItem('rapidEnvios_appMode');
  }, [appMode]);

  const selectAppMode = (role: UserRole | null) => setAppMode(role);
  const login = (user: User) => setCurrentUser(user);

  const registerUser = (user: User) => {
    const cleanUser = { ...user, email: user.email?.trim().toLowerCase() || '' };

    SupabasePwaApi.getUserByEmail(cleanUser.email || '')
      .then(async (existingUser) => {
        const userToSave = existingUser
          ? {
              ...existingUser,
              name: cleanUser.name || existingUser.name,
              phone: cleanUser.phone || existingUser.phone,
              isOnline: cleanUser.role === UserRole.DELIVERY,
              location: cleanUser.location || existingUser.location,
            }
          : cleanUser;

        if (userToSave.role !== cleanUser.role) {
          const roleName = userToSave.role === UserRole.CLIENT ? 'CLIENTE' : 'DELIVERY';
          alert(`Este correo ya esta registrado como ${roleName}.`);
          return;
        }

        if (!existingUser && !cleanUser.phone) {
          alert('Ingresa tu numero de WhatsApp para registrarte por primera vez.');
          return;
        }

        if (userToSave.role === UserRole.CLIENT) setClientUser(userToSave);
        else {
          setDeliveryUser(userToSave);
          await SupabasePwaApi.setUserOnline(userToSave.id, true);
        }
        setAppMode(userToSave.role);

        await SupabasePwaApi.upsertUser(userToSave);
      })
      .catch((error) => {
        console.error('No se pudo registrar el usuario en Supabase:', error);
        alert('No se pudo guardar o recuperar el usuario en Supabase. Revisa la conexion y las llaves de Supabase.');
      });
  };

  const updateCurrentUserPhone = (phone: string) => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || !appMode) return;

    const current = appMode === UserRole.CLIENT ? clientUser : deliveryUser;
    if (!current) return;

    const updatedUser = { ...current, phone: cleanPhone };
    if (appMode === UserRole.CLIENT) setClientUser(updatedUser);
    else setDeliveryUser(updatedUser);

    SupabasePwaApi.upsertUser(updatedUser).catch((error) => {
      console.error('No se pudo actualizar WhatsApp en Supabase:', error);
      alert('No se pudo guardar el WhatsApp. Revisa internet o permisos de Supabase.');
    });

    if (activeOrder) {
      const updatedOrder = appMode === UserRole.CLIENT
        ? { ...activeOrder, clientPhone: cleanPhone }
        : { ...activeOrder, deliveryPhone: cleanPhone };

      setActiveOrder(updatedOrder);
      SupabasePwaApi.updateOrder(updatedOrder, appMode === UserRole.CLIENT ? updatedUser : clientUser, appMode === UserRole.DELIVERY ? updatedUser : deliveryUser)
        .catch((error) => {
          console.error('No se pudo actualizar WhatsApp en el pedido:', error);
        });
    }
  };

  const logout = () => {
    if (activeOrder && activeOrder.status !== OrderStatus.COMPLETED && activeOrder.status !== OrderStatus.CANCELLED) {
      alert("No puedes cerrar sesión con un pedido en curso.");
      return false;
    }
    const roleToLogout = appMode;
    const currentUserId = roleToLogout === UserRole.CLIENT ? clientUser?.id : deliveryUser?.id;

    if (currentUserId) {
      SupabasePwaApi.setUserOnline(currentUserId, false).catch((error) => {
        console.error('No se pudo marcar usuario offline:', error);
      });
    }

    if (roleToLogout === UserRole.CLIENT) setClientUser(null);
    if (roleToLogout === UserRole.DELIVERY) setDeliveryUser(null);

    setCurrentUser(null);
    setAppMode(null);
    setActiveOrder(null);
    setAssignedDelivery(null);
    return true;
  };

  const resetSimulation = () => {
    localStorage.clear();
    window.location.reload();
  };

  const createOrder = async (order: Order) => {
    if (!clientUser) return;

    try {
      const deliveryUsers = await SupabasePwaApi.getDeliveryUsers();
      const onlineDeliveries = deliveryUsers.filter((user) => user.role === UserRole.DELIVERY && user.isOnline);
      setAvailableDeliveries(onlineDeliveries);
      const targetDelivery = onlineDeliveries[0] || null;
      const targetDeliveryId = targetDelivery?.id || null;

      const assignedOrder = {
        ...order,
        clientName: clientUser.name,
        clientPhone: clientUser.phone,
        targetDeliveryId: targetDeliveryId || undefined,
        deliveryName: targetDelivery?.name,
        deliveryPhone: targetDelivery?.phone,
      };
      await SupabasePwaApi.createOrder(assignedOrder, targetDeliveryId, clientUser);
      setAssignedDelivery(targetDelivery);
      setActiveOrder(assignedOrder);
    } catch (error) {
      console.error('No se pudo enviar el pedido a Supabase:', error);
      alert('No se pudo enviar el pedido. Revisa internet o permisos de Supabase.');
      throw error;
    }
  };

  const updateOrder = async (updatedOrder: Order) => {
    const isCompleted = updatedOrder.status === OrderStatus.COMPLETED;
    const isCancelled = updatedOrder.status === OrderStatus.CANCELLED;

    try {
      if (isCompleted || isCancelled) {
        // 1. Si está completado, guardar un resumen en el historial local
        if (isCompleted) {
          const summary = {
            id: updatedOrder.id,
            fecha: new Date().toLocaleString(),
            repartidor: updatedOrder.deliveryName || 'N/A',
            detalle: updatedOrder.description,
            total: updatedOrder.totalPrice || 0,
            servicio: updatedOrder.servicePrice || 0
          };
          const history = JSON.parse(localStorage.getItem('rapidEnvios_local_history') || '[]');
          history.push(summary);
          localStorage.setItem('rapidEnvios_local_history', JSON.stringify(history));
          setPastOrders(history);
        }

        // 2. Borrar físicamente de Supabase
        await SupabasePwaApi.request(`/rest/v1/orders?id=eq.${updatedOrder.id}`, { method: 'DELETE' });
        setActiveOrder(null);
      } else {
        // Actualización normal de estado (Picking up, etc)
        await SupabasePwaApi.updateOrder(updatedOrder, clientUser, deliveryUser);
        setActiveOrder(updatedOrder);
      }
    } catch (error) {
      console.error('Error al procesar estado final en PWA:', error);
      throw error;
    }
  };

  const addChatMessage = async (msg: ChatMessage) => {
    if (!activeOrder) return;

    const updatedOrder = {
      ...activeOrder,
      chatHistory: [...activeOrder.chatHistory, msg],
    };

    try {
      await SupabasePwaApi.updateOrder(updatedOrder, clientUser, deliveryUser);
      setActiveOrder(updatedOrder);
    } catch (error) {
      console.error('No se pudo enviar el mensaje en Supabase:', error);
      alert('No se pudo enviar el mensaje. Revisa internet o permisos de Supabase.');
      throw error;
    }
  };

  const switchRole = (role: UserRole) => {};

  return (
    <AppContext.Provider value={{
      clientUser, deliveryUser, currentUser, appMode, activeOrder, pastOrders,
      assignedDelivery, availableDeliveries, isCheckingSession,
      login, registerUser, logout, resetSimulation, selectAppMode, createOrder,
      updateOrder, addChatMessage, switchRole, updateCurrentUserPhone,
      showThankYouDialog, thankYouDialogMessage, setShowThankYouDialog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
