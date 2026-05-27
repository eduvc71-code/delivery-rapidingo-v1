import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Order, UserRole, OrderStatus, ChatMessage } from '../types';
import { MOCK_HISTORY } from '../constants';
import { SupabasePwaApi } from '../services/supabase';
import { supabase } from '../services/supabaseClient';

interface AppContextType {
  clientUser: User | null;
  deliveryUser: User | null;
  restaurantUser: User | null;
  adminUser: User | null;
  operatorUser: User | null;
  allOrders: Order[];
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
  updateCurrentUserLocation: (location: { lat: number; lng: number }) => void;
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
  playNotificationSound: () => void;
  dispatchMode: 'AUTOMATIC' | 'OPERATOR';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const hasValidGps = (location?: { lat: number; lng: number }) =>
  Boolean(location && (location.lat !== 0 || location.lng !== 0));

const isActiveDispatchOrder = (order: Order) =>
  order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED;

const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const radius = 6371e3;
  const phi1 = a.lat * Math.PI / 180;
  const phi2 = b.lat * Math.PI / 180;
  const deltaPhi = (b.lat - a.lat) * Math.PI / 180;
  const deltaLambda = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const getAvailableDeliveryCandidates = (
  destination: { lat: number; lng: number },
  deliveryUsers: User[],
  orders: Order[],
  rejectedBy: string[] = []
) => {
  const busyDeliveryIds = new Set(
    orders
      .filter(isActiveDispatchOrder)
      .flatMap((order) => [order.deliveryId, order.targetDeliveryId].filter(Boolean) as string[])
  );

  return deliveryUsers
    .filter((user) =>
      user.role === UserRole.DELIVERY &&
      user.isOnline &&
      hasValidGps(user.location) &&
      !busyDeliveryIds.has(user.id) &&
      !rejectedBy.includes(user.id)
    )
    .sort((a, b) => distanceMeters(destination, a.location!) - distanceMeters(destination, b.location!));
};

const selectTargetDelivery = (
  destination: { lat: number; lng: number },
  deliveryUsers: User[],
  orders: Order[],
  rejectedBy: string[] = []
) => {
  const nearestPool = getAvailableDeliveryCandidates(destination, deliveryUsers, orders, rejectedBy).slice(0, 3);
  return nearestPool.length > 0
    ? nearestPool[Math.floor(Math.random() * nearestPool.length)]
    : null;
};

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

  const [restaurantUser, setRestaurantUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_restaurantUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminUser, setAdminUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_adminUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [operatorUser, setOperatorUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_operatorUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [dispatchMode, setDispatchMode] = useState<'AUTOMATIC' | 'OPERATOR'>('AUTOMATIC');

  const [allOrders, setAllOrders] = useState<Order[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appMode, setAppMode] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('rapidEnvios_appMode');
    return saved === UserRole.CLIENT || saved === UserRole.DELIVERY || saved === UserRole.RESTAURANT || saved === UserRole.ADMIN || saved === UserRole.OPERATOR ? (saved as UserRole) : null;
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
            ? "ENTREGA EXITOSA\nGRACIAS POR TU CONFIANZA"
            : "PEDIDO COMPLETADO\nGRACIAS POR EL SERVICIO";
        }
        setThankYouDialogMessage(msg);
        setShowThankYouDialog(true);
      }
    }
    setPrevActiveOrder(activeOrder);
  }, [activeOrder, appMode, clientUser, deliveryUser]);

  useEffect(() => {
    // Si ya tenemos datos locales, dejamos de mostrar el cargando rapido
    if (clientUser || deliveryUser || restaurantUser || adminUser) {
      setIsCheckingSession(false);
    }

    // Escuchar el estado de autenticación de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (!user) {
        setIsCheckingSession(false);
        return;
      }

      SupabasePwaApi.getUser(user.id)
        .then(async (savedUser) => {
          if (!savedUser && user.email) {
            savedUser = await SupabasePwaApi.getUserByEmail(user.email);
          }
          if (savedUser) {
            if (savedUser.role === UserRole.CLIENT) setClientUser(savedUser);
            if (savedUser.role === UserRole.DELIVERY) setDeliveryUser(savedUser);
            if (savedUser.role === UserRole.RESTAURANT) setRestaurantUser(savedUser);
            if (savedUser.role === UserRole.ADMIN) setAdminUser(savedUser);
            if (savedUser.role === UserRole.OPERATOR) setOperatorUser(savedUser);
            setAppMode(savedUser.role);
          }
          setIsCheckingSession(false);
        })
        .catch((error) => {
          console.error('No se pudo restaurar sesion Gmail desde Supabase:', error);
          setIsCheckingSession(false);
        });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (appMode !== UserRole.DELIVERY || !deliveryUser) return;
    if (deliveryUser.isOnline) {
      SupabasePwaApi.upsertUser(deliveryUser).catch((error) => {
        console.error('No se pudo sincronizar delivery online:', error);
      });
      return;
    }

    const onlineUser = { ...deliveryUser, isOnline: true };
    setDeliveryUser(onlineUser);
    SupabasePwaApi.upsertUser(onlineUser)
      .then(() => SupabasePwaApi.setUserOnline(onlineUser.id, true))
      .catch((error) => {
        console.error('No se pudo marcar delivery online:', error);
      });
  }, [appMode, deliveryUser?.id]);

  // Supabase es la base comun para PWA y APK.
  useEffect(() => {
    const user = appMode === UserRole.DELIVERY 
      ? deliveryUser 
      : (appMode === UserRole.RESTAURANT 
          ? restaurantUser 
          : (appMode === UserRole.ADMIN 
              ? adminUser 
              : (appMode === UserRole.OPERATOR ? operatorUser : clientUser)));
    if (!appMode || !user) return;

    let cancelled = false;

    const loadOrders = async () => {
      try {
        const mode = await SupabasePwaApi.getDispatchModeCached();
        if (cancelled) return;

        setDispatchMode(mode as 'AUTOMATIC' | 'OPERATOR');

        if (appMode === UserRole.ADMIN || appMode === UserRole.OPERATOR) {
          const [orders, deliveryUsers] = await Promise.all([
            SupabasePwaApi.getActiveOrdersPage(100, 0),
            SupabasePwaApi.getOnlineDeliveryUsers(),
          ]);
          if (cancelled) return;
          setAllOrders(orders);
          setAvailableDeliveries(deliveryUsers);
          setActiveOrder(null);
          setAssignedDelivery(null);
          return;
        }

        if (appMode === UserRole.RESTAURANT) {
          const orders = await SupabasePwaApi.getActiveOrdersPage(200, 0);
          if (cancelled) return;
          setAllOrders(orders);
          setAvailableDeliveries([]);
          setActiveOrder(null);
          setAssignedDelivery(null);
          return;
        }

        if (appMode === UserRole.CLIENT) {
          const [nextOrder, deliveryUsers] = await Promise.all([
            SupabasePwaApi.getActiveClientOrder(user.id),
            SupabasePwaApi.getOnlineDeliveryUsers(),
          ]);
          if (cancelled) return;
          const visibleOrders = nextOrder ? [nextOrder] : [];
          setAllOrders(visibleOrders);
          setActiveOrder(nextOrder || null);
          setAvailableDeliveries(deliveryUsers);
          const deliveryId = nextOrder?.deliveryId || nextOrder?.targetDeliveryId;
          setAssignedDelivery(deliveryId ? deliveryUsers.find((delivery) => delivery.id === deliveryId) || null : null);
          return;
        }

        if (appMode === UserRole.DELIVERY) {
          const [assignedOrder, queueOrders] = await Promise.all([
            SupabasePwaApi.getActiveDeliveryOrder(user.id),
            SupabasePwaApi.getDeliveryQueue(user.id, mode),
          ]);
          if (cancelled) return;
          const nextOrder = assignedOrder || queueOrders[0] || null;
          const visibleOrders = [
            ...(assignedOrder ? [assignedOrder] : []),
            ...queueOrders.filter((order) => order.id !== assignedOrder?.id),
          ];
          setAllOrders(visibleOrders);
          setActiveOrder(nextOrder);
          setAvailableDeliveries([]);
          setAssignedDelivery(null);
        }
      } catch (error) {
        console.error('Error escuchando pedidos en Supabase:', error);
      }
    };

    loadOrders();
    const intervalId = window.setInterval(loadOrders, 30000);
    let refreshTimeoutId: number | null = null;

    const scheduleRealtimeRefresh = () => {
      if (cancelled) return;
      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }
      refreshTimeoutId = window.setTimeout(loadOrders, 250);
    };

    const channel = supabase.channel(`rapidingo-${appMode}-${user.id}-${Date.now()}`);
    const addOrderSubscription = (filter?: string) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(filter ? { filter } : {}),
        },
        scheduleRealtimeRefresh
      );
    };

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'settings',
        filter: 'key=eq.dispatch_mode',
      },
      scheduleRealtimeRefresh
    );

    if (appMode === UserRole.CLIENT) {
      addOrderSubscription(`client_id=eq.${user.id}`);
    } else if (appMode === UserRole.DELIVERY) {
      addOrderSubscription(`delivery_id=eq.${user.id}`);
      addOrderSubscription(`target_delivery_id=eq.${user.id}`);
      addOrderSubscription(`status=eq.${OrderStatus.PENDING_PRICE}`);
    } else {
      addOrderSubscription();
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        scheduleRealtimeRefresh();
      }
    });

    return () => {
      cancelled = true;
      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [appMode, clientUser?.id, deliveryUser?.id, restaurantUser?.id, adminUser?.id]);

  useEffect(() => {
    if (clientUser) localStorage.setItem('rapidEnvios_clientUser', JSON.stringify(clientUser));
    else localStorage.removeItem('rapidEnvios_clientUser');
  }, [clientUser]);

  useEffect(() => {
    if (deliveryUser) localStorage.setItem('rapidEnvios_deliveryUser', JSON.stringify(deliveryUser));
    else localStorage.removeItem('rapidEnvios_deliveryUser');
  }, [deliveryUser]);

  useEffect(() => {
    if (adminUser) localStorage.setItem('rapidEnvios_adminUser', JSON.stringify(adminUser));
    else localStorage.removeItem('rapidEnvios_adminUser');
  }, [adminUser]);

  useEffect(() => {
    if (operatorUser) localStorage.setItem('rapidEnvios_operatorUser', JSON.stringify(operatorUser));
    else localStorage.removeItem('rapidEnvios_operatorUser');
  }, [operatorUser]);

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
          const roleName = userToSave.role === UserRole.CLIENT 
            ? 'CLIENTE' 
            : (userToSave.role === UserRole.RESTAURANT 
                ? 'RESTAURANTE' 
                : (userToSave.role === UserRole.ADMIN ? 'ADMINISTRADOR' : 'DELIVERY'));
          alert(`Este correo ya esta registrado como ${roleName}.`);
          return;
        }

        if (!existingUser && !cleanUser.phone && cleanUser.role !== UserRole.RESTAURANT && cleanUser.role !== UserRole.ADMIN) {
          alert('Ingresa tu numero de WhatsApp para registrarte por primera vez.');
          return;
        }

        await SupabasePwaApi.upsertUser(userToSave);
        if (userToSave.role === UserRole.DELIVERY) {
          await SupabasePwaApi.setUserOnline(userToSave.id, true);
        }

        if (userToSave.role === UserRole.CLIENT) setClientUser(userToSave);
        else if (userToSave.role === UserRole.RESTAURANT) setRestaurantUser(userToSave);
        else if (userToSave.role === UserRole.ADMIN) setAdminUser(userToSave);
        else if (userToSave.role === UserRole.OPERATOR) setOperatorUser(userToSave);
        else setDeliveryUser({ ...userToSave, isOnline: true });
        setAppMode(userToSave.role);
      })
      .catch((error) => {
        console.error('No se pudo registrar el usuario en Supabase:', error);
        alert('No se pudo guardar o recuperar el usuario en Supabase. Revisa la conexion y las llaves de Supabase.');
      });
  };

  const updateCurrentUserLocation = (location: { lat: number; lng: number }) => {
    if (!appMode) return;
    const current = appMode === UserRole.CLIENT ? clientUser : deliveryUser;
    if (!current) return;

    const updatedUser = {
      ...current,
      location,
      isOnline: appMode === UserRole.DELIVERY ? true : current.isOnline,
    };

    if (appMode === UserRole.CLIENT) setClientUser(updatedUser);
    else setDeliveryUser(updatedUser);

    SupabasePwaApi.upsertUser(updatedUser)
      .then(() => {
        if (appMode === UserRole.DELIVERY) {
          return SupabasePwaApi.setUserOnline(updatedUser.id, true);
        }
        return undefined;
      })
      .catch((error) => {
        console.error('No se pudo guardar la ubicacion GPS:', error);
        alert('No se pudo guardar tu ubicacion. Revisa internet y permisos de GPS.');
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
    const currentUserId = roleToLogout === UserRole.CLIENT 
      ? clientUser?.id 
      : (roleToLogout === UserRole.RESTAURANT 
          ? restaurantUser?.id 
          : (roleToLogout === UserRole.ADMIN 
              ? adminUser?.id 
              : (roleToLogout === UserRole.OPERATOR ? operatorUser?.id : deliveryUser?.id)));

    if (currentUserId && roleToLogout === UserRole.DELIVERY) {
      SupabasePwaApi.setUserOnline(currentUserId, false).catch((error) => {
        console.error('No se pudo marcar usuario offline:', error);
      });
    }

    // Cerrar sesión en el proveedor de autenticación de Supabase
    supabase.auth.signOut().catch((error) => {
      console.error('Error al cerrar sesión de Supabase Auth:', error);
    });

    if (roleToLogout === UserRole.CLIENT) setClientUser(null);
    if (roleToLogout === UserRole.DELIVERY) setDeliveryUser(null);
    if (roleToLogout === UserRole.RESTAURANT) setRestaurantUser(null);
    if (roleToLogout === UserRole.ADMIN) setAdminUser(null);
    if (roleToLogout === UserRole.OPERATOR) setOperatorUser(null);

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
      const mode = await SupabasePwaApi.getDispatchMode();
      
      let targetDeliveryId: string | null = null;
      let deliveryName: string | undefined = undefined;
      let deliveryPhone: string | undefined = undefined;
      let targetDelivery: User | null = null;

      if (mode === 'AUTOMATIC') {
        const [deliveryUsers, orders] = await Promise.all([
          SupabasePwaApi.getOnlineDeliveryUsers(),
          SupabasePwaApi.getActiveDispatchOrders(),
        ]);
        const destination = order.destinationLocation || order.location;
        const onlineDeliveries = getAvailableDeliveryCandidates(destination, deliveryUsers, orders);
        setAvailableDeliveries(onlineDeliveries);
        targetDelivery = selectTargetDelivery(destination, deliveryUsers, orders);
        targetDeliveryId = targetDelivery?.id || null;
        deliveryName = targetDelivery?.name;
        deliveryPhone = targetDelivery?.phone;
      }

      const assignedOrder = {
        ...order,
        clientName: clientUser.name,
        clientPhone: clientUser.phone,
        targetDeliveryId: targetDeliveryId || undefined,
        deliveryName,
        deliveryPhone,
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
      if (
        appMode === UserRole.DELIVERY &&
        deliveryUser &&
        activeOrder?.id === updatedOrder.id &&
        activeOrder.status === OrderStatus.PENDING_PRICE &&
        updatedOrder.status === OrderStatus.WAITING_CONFIRM
      ) {
        const claimedOrder = await SupabasePwaApi.claimOrderForPricing(updatedOrder, deliveryUser);
        if (!claimedOrder) {
          alert('Este pedido ya fue tomado por otro repartidor.');
          setActiveOrder(null);
          return;
        }
        setActiveOrder(claimedOrder);
        return;
      }

      if (
        isCancelled &&
        appMode === UserRole.DELIVERY &&
        deliveryUser &&
        activeOrder?.id === updatedOrder.id &&
        activeOrder.status === OrderStatus.PENDING_PRICE
      ) {
        const [deliveryUsers, orders] = await Promise.all([
          SupabasePwaApi.getOnlineDeliveryUsers(),
          SupabasePwaApi.getActiveDispatchOrders(),
        ]);
        const rejectedBy = Array.from(new Set([...(activeOrder.rejectedBy || []), deliveryUser.id]));
        const destination = activeOrder.destinationLocation || activeOrder.location;
        const nextDelivery = selectTargetDelivery(destination, deliveryUsers, orders, rejectedBy);
        await SupabasePwaApi.reassignOrderAfterRejection(activeOrder, deliveryUser.id, nextDelivery);
        setActiveOrder(null);
        return;
      }

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
          await SupabasePwaApi.updateOrder(updatedOrder, clientUser, deliveryUser);
          setActiveOrder(null);
          return;
        }

        // En pruebas solo se borran cancelados; los completados quedan como COMPLETED.
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

  const switchRole = (role: UserRole) => {
    setAppMode(role);
    localStorage.setItem('rapidEnvios_appMode', role);
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(587.33, now, 0.15); // D5
      playTone(880.00, now + 0.1, 0.25); // A5
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  const isFirstLoadStatus = useRef(true);
  const isFirstLoadChat = useRef(true);

  // Sound on Order Status Change
  useEffect(() => {
    if (isFirstLoadStatus.current) {
      isFirstLoadStatus.current = false;
      return;
    }
    if (activeOrder?.status) {
      playNotificationSound();
    }
  }, [activeOrder?.status]);

  // Sound on New Chat Message
  useEffect(() => {
    if (isFirstLoadChat.current) {
      isFirstLoadChat.current = false;
      return;
    }
    if (activeOrder?.chatHistory && activeOrder.chatHistory.length > 0) {
      const lastMsg = activeOrder.chatHistory[activeOrder.chatHistory.length - 1];
      const currentUserId = appMode === UserRole.CLIENT ? clientUser?.id : (appMode === UserRole.RESTAURANT ? restaurantUser?.id : deliveryUser?.id);
      if (lastMsg && lastMsg.senderId !== currentUserId) {
        playNotificationSound();
      }
    }
  }, [activeOrder?.chatHistory?.length]);

  return (
    <AppContext.Provider value={{
      clientUser, deliveryUser, restaurantUser, adminUser, operatorUser, allOrders, currentUser, appMode, activeOrder, pastOrders,
      assignedDelivery, availableDeliveries, isCheckingSession, dispatchMode,
      login, registerUser, logout, resetSimulation, selectAppMode, createOrder,
      updateOrder, addChatMessage, switchRole, updateCurrentUserPhone, updateCurrentUserLocation,
      showThankYouDialog, thankYouDialogMessage, setShowThankYouDialog, playNotificationSound
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
