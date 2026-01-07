export enum UserRole {
  CLIENT = 'CLIENT',
  DELIVERY = 'DELIVERY'
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PRICE = 'PENDING_PRICE', // Client sent, waiting for Delivery to set price
  WAITING_CONFIRM = 'WAITING_CONFIRM', // Delivery set price, waiting for Client to confirm
  CONFIRMED_BY_CLIENT = 'CONFIRMED_BY_CLIENT', // Client agreed, waiting for Delivery to start
  IN_DELIVERY = 'IN_DELIVERY', // Delivery started, on the way
  COMPLETED = 'COMPLETED' // Delivered and paid
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
  name: string; // Replaces email
  dniFront?: string; // Base64 or URL (Legacy)
  dniBack?: string;  // Base64 or URL (Legacy)
  selfie?: string;   // New field for Delivery selfie
  isVerified?: boolean;
}

export interface Order {
  id: string;
  clientId: string;
  deliveryId?: string;
  type: OrderType;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
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