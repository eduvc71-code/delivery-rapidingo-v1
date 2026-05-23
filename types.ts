export enum UserRole {
  CLIENT = 'CLIENT',
  DELIVERY = 'DELIVERY'
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PRICE = 'PENDING_PRICE', // Client sent, waiting for Delivery to set price
  BIDDING = 'BIDDING',
  WAITING_CONFIRM = 'WAITING_CONFIRM', // Delivery set price, waiting for Client to confirm
  CONFIRMED_BY_CLIENT = 'CONFIRMED_BY_CLIENT', // Client agreed, waiting for Delivery to start
  PICKING_UP = 'PICKING_UP',
  IN_DELIVERY = 'IN_DELIVERY', // Delivery started, on the way
  DELIVERED_BY_REPARTIDOR = 'DELIVERED_BY_REPARTIDOR',
  COMPLETED = 'COMPLETED', // Delivered and paid
  CANCELLED = 'CANCELLED'
}

export enum OrderType {
  RESTAURANT = 'Restaurant',
  SUPERMARKET = 'Supermercado',
  PHARMACY = 'Farmacia',
  OTHER = 'Otros'
}

export interface User {
  id: string;
  role: UserRole;
  phone: string;
  email?: string;
  name: string;
  location?: {
    lat: number;
    lng: number;
  };
  isOnline?: boolean;
  dniFront?: string; // Base64 or URL (Legacy)
  dniBack?: string;  // Base64 or URL (Legacy)
  selfie?: string;   // New field for Delivery selfie
  isVerified?: boolean;
}

export interface Order {
  id: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  deliveryId?: string;
  deliveryName?: string;
  deliveryPhone?: string;
  targetDeliveryId?: string;
  rejectedBy?: string[];
  type: OrderType;
  category?: string; // Para compatibilidad con PocketBase
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  clientLocation?: {
    lat: number;
    lng: number;
  };
  destinationLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  deliveryLocation?: {
    lat: number;
    lng: number;
  };
  locationHistory?: { lat: number, lng: number }[];
  status: OrderStatus;
  createdAt: number;
  completedAt?: number; // Timestamp when order is finished
  productPrice?: number;
  servicePrice?: number;
  totalPrice?: number;
  deliveryDuration?: number; // in minutes
  chatHistory: ChatMessage[];
  photos: string[]; // URLs or Base64
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface DeliveryReport {
  date: string;
  totalOrders: number;
  totalEarnings: number;
  avgDuration: number;
}
