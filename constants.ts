import { OrderType, User, UserRole, Order, OrderStatus } from './types';
import { Utensils, ShoppingCart, Pill, Package } from 'lucide-react';

export const APP_NAME = "Delivery RAPIDINGO";

export const ORDER_TYPES = [
  { type: OrderType.RESTAURANT, icon: Utensils, label: 'Restaurante', color: 'bg-orange-100 text-orange-600' },
  { type: OrderType.SUPERMARKET, icon: ShoppingCart, label: 'Super', color: 'bg-green-100 text-green-600' },
  { type: OrderType.PHARMACY, icon: Pill, label: 'Farmacia', color: 'bg-blue-100 text-blue-600' },
  { type: OrderType.OTHER, icon: Package, label: 'Otros', color: 'bg-purple-100 text-purple-600' },
];

export const MOCK_ADDRESS = "Av. Principal 123, Ciudad Central";

// Datos simulados por defecto (para primera carga)
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

// Historial simulado para rellenar estadísticas
export const MOCK_HISTORY: Order[] = [
  {
    id: '1', clientId: 'c1', type: OrderType.RESTAURANT, description: 'Pizza',
    location: { lat: 0, lng: 0, address: '' }, status: OrderStatus.COMPLETED,
    createdAt: Date.now() - 86400000, completedAt: Date.now() - 86398000, servicePrice: 15, productPrice: 50, chatHistory: [], photos: []
  },
  {
    id: '2', clientId: 'c1', type: OrderType.PHARMACY, description: 'Pastillas',
    location: { lat: 0, lng: 0, address: '' }, status: OrderStatus.COMPLETED,
    createdAt: Date.now() - 172800000, completedAt: Date.now() - 172790000, servicePrice: 10, productPrice: 20, chatHistory: [], photos: []
  },
  {
    id: '3', clientId: 'c1', type: OrderType.SUPERMARKET, description: 'Refrescos',
    location: { lat: 0, lng: 0, address: '' }, status: OrderStatus.COMPLETED,
    createdAt: Date.now() - 259200000, completedAt: Date.now() - 259195000, servicePrice: 20, productPrice: 100, chatHistory: [], photos: []
  }
];