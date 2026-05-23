import { OrderType, User, UserRole, Order, OrderStatus } from './types';
import { Utensils, Pill, Package } from 'lucide-react';

export const APP_NAME = "DELIVERY RAPIDINGO";

export const ORDER_TYPES = [
  { type: OrderType.RESTAURANT, icon: Utensils, label: 'COMIDA', color: 'bg-orange-100 text-orange-600' },
  { type: OrderType.PHARMACY, icon: Pill, label: 'FARMACIA', color: 'bg-blue-100 text-blue-600' },
  { type: OrderType.OTHER, icon: Package, label: 'OTROS', color: 'bg-purple-100 text-purple-600' },
];

export const MOCK_ADDRESS = "Av. Principal 123, Ciudad Central";

// Datos simulados desactivados
/*
export const MOCK_CLIENT_USER: User = {
  id: 'client-123',
  role: UserRole.CLIENT,
  name: 'JUAN PÉREZ',
  phone: '+591 60000001',
  isVerified: true
};

export const MOCK_DELIVERY_USER: User = {
  id: 'delivery-123',
  role: UserRole.DELIVERY,
  name: 'MARIO VELOZ',
  phone: '+591 70000001',
  selfie: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Pixel blanco dummy
  isVerified: true
};
*/

// Historial simulado vacio por defecto
export const MOCK_HISTORY: Order[] = [];
