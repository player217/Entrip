// Transportation types
export interface Flight {
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string; // ISO datetime
  arrivalTime: string; // ISO datetime
  class: 'economy' | 'business' | 'first';
  seats?: string[];
}

export interface Bus {
  busCompany: string;
  busNumber: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string; // ISO datetime
  arrivalTime: string; // ISO datetime
  seats?: string[];
}

export interface Transportation {
  outbound: {
    flights?: Flight[];
    buses?: Bus[];
  };
  inbound: {
    flights?: Flight[];
    buses?: Bus[];
  };
}

// Accommodation types
export interface RoomAllocation {
  roomNumber?: string;
  roomType: 'single' | 'double' | 'twin' | 'triple' | 'suite';
  guestNames: string[];
  checkInDate: string;
  checkOutDate: string;
  specialRequests?: string;
}

export interface Hotel {
  hotelName: string;
  hotelAddress: string;
  hotelPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  roomAllocations: RoomAllocation[];
  mealPlan: 'room_only' | 'breakfast' | 'half_board' | 'full_board' | 'all_inclusive';
  totalRooms: number;
  confirmationNumber?: string;
}

// Financial types
export interface Cost {
  category: 'transportation' | 'accommodation' | 'meal' | 'guide' | 'entrance' | 'insurance' | 'other';
  description: string;
  amount: number;
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
  quantity: number;
  total: number;
  notes?: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
  method: 'cash' | 'card' | 'transfer' | 'check';
  payer: string;
  receiver: string;
  purpose: 'deposit' | 'balance' | 'refund' | 'additional';
  notes?: string;
}

export interface Settlement {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  payments: Payment[];
  outstandingBalance: number;
}

// Customer types
export interface CustomerContact {
  name: string;
  phone: string;
  email?: string;
  relationship: 'primary' | 'emergency' | 'representative';
}

export interface Customer {
  organizationName: string;
  organizationType: 'company' | 'school' | 'association' | 'family' | 'other';
  contacts: CustomerContact[];
  address?: string;
  taxId?: string;
  notes?: string;
}

// Participant types
export interface Participant {
  id: string;
  name: string;
  nameEng?: string;
  gender: 'male' | 'female';
  birthDate?: string;
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  roomAssignment?: string;
  dietaryRestrictions?: string;
  medicalNotes?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

// Manager types
export interface Manager {
  id: string;
  name: string;
  role: 'main' | 'sub' | 'guide' | 'driver';
  phone: string;
  email?: string;
  assignedTasks?: string[];
}

// Complete TeamBooking interface
export interface TeamBooking {
  // Basic information
  id: string;
  bookingNumber: string;
  teamCode: string;
  tourName: string;
  destination: string;
  tourType: 'package' | 'fit' | 'group' | 'incentive' | 'cruise';
  
  // Schedule
  departureDate: string;
  returnDate: string;
  nights: number;
  days: number;
  
  // Transportation
  transportation: Transportation;
  
  // Accommodation
  accommodations: Hotel[];
  
  // Participants
  participants: Participant[];
  adultCount: number;
  childCount: number;
  infantCount: number;
  totalCount: number;
  
  // Financial
  costs: Cost[];
  pricing: {
    adultPrice: number;
    childPrice: number;
    infantPrice: number;
    currency: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';
  };
  settlement: Settlement;
  
  // Customer
  customer: Customer;
  
  // Management
  managers: Manager[];
  mainManagerId: string;
  
  // Status and metadata
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  cancellationReason?: string;
  memo?: string;
  attachments?: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    category: 'contract' | 'invoice' | 'itinerary' | 'passport' | 'other';
  }[];
  
  // System fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// Create/Update payload types
export interface CreateTeamBookingPayload {
  teamCode: string;
  tourName: string;
  destination: string;
  tourType: TeamBooking['tourType'];
  departureDate: string;
  returnDate: string;
  customer: Partial<Customer>;
  mainManagerId: string;
  memo?: string;
  // Initial basic info, other fields will be added via updates
}

export interface UpdateTeamBookingPayload {
  transportation?: Partial<Transportation>;
  accommodations?: Hotel[];
  participants?: Participant[];
  costs?: Cost[];
  pricing?: TeamBooking['pricing'];
  settlement?: Partial<Settlement>;
  customer?: Partial<Customer>;
  managers?: Manager[];
  status?: TeamBooking['status'];
  memo?: string;
}

// Response types
export interface TeamBookingListResponse {
  bookings: TeamBooking[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TeamBookingDetailResponse {
  booking: TeamBooking;
  history?: {
    id: string;
    action: 'created' | 'updated' | 'status_changed' | 'payment_added';
    description: string;
    changedBy: string;
    changedAt: string;
    changes?: Record<string, unknown>;
  }[];
}

// Filter types for queries
export interface TeamBookingFilters {
  startDate?: string;
  endDate?: string;
  status?: TeamBooking['status'][];
  destination?: string;
  managerId?: string;
  customerName?: string;
  teamCode?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'departureDate' | 'createdAt' | 'teamCode' | 'status';
  sortOrder?: 'asc' | 'desc';
}