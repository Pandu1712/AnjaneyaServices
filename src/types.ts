export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'provider' | 'admin';
  phone?: string;
  address?: string;
  createdAt: any;
  isApproved?: boolean; // For providers
}

export interface Service {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  extraCost?: number;
  category: string;
  imageUrl: string;
  locationIds: string[];
}

export interface Location {
  id: string;
  name: string;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  address: string;
  city: string;
  pincode: string;
  locationId: string; // Selected from admin locations
  serviceId: string;
  serviceName: string;
  serviceDate: string;
  serviceTime: string;
  notes?: string;
  status: 'pending' | 'assigned' | 'reached' | 'in-progress' | 'provider-finished' | 'completed' | 'cancelled';
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  totalCost: number;
  advancePaid: number;
  remainingPaid: boolean;
  createdAt: any;
  paymentId?: string;
}
