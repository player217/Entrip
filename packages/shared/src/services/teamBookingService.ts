import { apiClient } from '../lib/apiClient';
import type {
  TeamBooking,
  CreateTeamBookingPayload,
  UpdateTeamBookingPayload,
  TeamBookingListResponse,
  TeamBookingDetailResponse,
  TeamBookingFilters,
  Transportation,
  Hotel,
  Participant,
  Cost,
  Payment,
  Manager,
  Customer,
  CustomerContact,
  Settlement
} from '../types/team-booking';

// Helper item types for optional array properties on Transportation
type FlightItem = NonNullable<Transportation['outbound']['flights']>[number];
type BusItem = NonNullable<Transportation['outbound']['buses']>[number];

type Mode = 'v1' | 'v2';

let forcedMode: Mode | null = null;

const resolveMode = (): Mode => {
  if (forcedMode) return forcedMode;

  const env = (
    process.env.NEXT_PUBLIC_TEAM_BOOKING_API_MODE
    || process.env.TEAM_BOOKING_API_MODE
    || process.env.NEXT_PUBLIC_BOOKING_API_MODE
    || process.env.BOOKING_API_MODE
    || process.env.NEXT_PUBLIC_BOOKING_API_TARGET
    || ''
  ).toLowerCase();

  return env.includes('v2') ? 'v2' : 'v1';
};

const getBasePath = (mode: Mode): string => (mode === 'v2' ? '/v2/team-bookings' : '/team-bookings');

const buildUrl = (suffix = '', mode?: Mode): string => {
  const resolvedMode = mode ?? resolveMode();
  const base = getBasePath(resolvedMode);
  return `${base}${suffix}`;
};


const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str === '' ? undefined : str;
};

const toRequiredString = (value: unknown, fallback = ''): string =>
  toOptionalString(value) ?? fallback;

const toNumberSafe = (value: unknown, fallback?: number): number | undefined => {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

const toPositiveInt = (value: unknown, fallback = 0): number => {
  const num = toNumberSafe(value, fallback);
  if (num === undefined) return fallback;
  return Math.max(0, Math.floor(num));
};

const toIsoDateTime = (value: unknown, fallback?: string): string => {
  const str = toOptionalString(value);
  if (!str) {
    return fallback ?? new Date().toISOString();
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) {
    return str;
  }
  return date.toISOString();
};

const toDateOnly = (value: unknown, fallback?: string): string => {
  const iso = toIsoDateTime(value, fallback ? `${fallback}T00:00:00.000Z` : undefined);
  return iso.slice(0, 10);
};

const ensureArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is T => item !== null && item !== undefined);
  }
  return [];
};

const TEAM_BOOKING_STATUSES: TeamBooking['status'][] = [
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
];

const TEAM_BOOKING_TYPES: TeamBooking['tourType'][] = [
  'package',
  'fit',
  'group',
  'incentive',
  'cruise'
];

const FLIGHT_CLASSES: FlightItem['class'][] = [
  'economy',
  'business',
  'first'
];

const MEAL_PLAN_VALUES: Hotel['mealPlan'][] = [
  'room_only',
  'breakfast',
  'half_board',
  'full_board',
  'all_inclusive'
];

const CURRENCY_VALUES: TeamBooking['pricing']['currency'][] = [
  'KRW',
  'USD',
  'EUR',
  'JPY',
  'CNY'
];

const COST_CATEGORIES: Cost['category'][] = [
  'transportation',
  'accommodation',
  'meal',
  'guide',
  'entrance',
  'insurance',
  'other'
];

const PAYMENT_METHODS: Payment['method'][] = [
  'cash',
  'card',
  'transfer',
  'check'
];

const PAYMENT_PURPOSES: Payment['purpose'][] = [
  'deposit',
  'balance',
  'refund',
  'additional'
];

const MANAGER_ROLES: Manager['role'][] = [
  'main',
  'sub',
  'guide',
  'driver'
];

const CUSTOMER_TYPES: Customer['organizationType'][] = [
  'company',
  'school',
  'association',
  'family',
  'other'
];

type TeamBookingAttachment = NonNullable<TeamBooking['attachments']>[number];
const ATTACHMENT_CATEGORIES: TeamBookingAttachment['category'][] = [
  'contract',
  'invoice',
  'itinerary',
  'passport',
  'other'
];

type HistoryEntry = NonNullable<TeamBookingDetailResponse['history']>[number];
const HISTORY_ACTIONS: HistoryEntry['action'][] = [
  'created',
  'updated',
  'status_changed',
  'payment_added'
];

const normalizeStatus = (value: unknown): TeamBooking['status'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  if (!normalized) return 'draft';
  if (normalized === 'inprogress' || normalized === 'in-progress') return 'in_progress';
  return (TEAM_BOOKING_STATUSES as string[]).includes(normalized)
    ? (normalized as TeamBooking['status'])
    : 'draft';
};

const normalizeTourType = (value: unknown): TeamBooking['tourType'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  if (!normalized) return 'package';
  return (TEAM_BOOKING_TYPES as string[]).includes(normalized)
    ? (normalized as TeamBooking['tourType'])
    : 'package';
};

const normalizeFlightClass = (value: unknown): FlightItem['class'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return (FLIGHT_CLASSES as string[]).includes(normalized ?? '')
    ? (normalized as FlightItem['class'])
    : 'economy';
};

const normalizeMealPlan = (value: unknown): Hotel['mealPlan'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return (MEAL_PLAN_VALUES as string[]).includes(normalized ?? '')
    ? (normalized as Hotel['mealPlan'])
    : 'room_only';
};

const normalizeCurrency = (
  value: unknown,
  fallback: TeamBooking['pricing']['currency'] = 'KRW'
): TeamBooking['pricing']['currency'] => {
  const normalized = toOptionalString(value)?.toUpperCase();
  return (CURRENCY_VALUES as string[]).includes(normalized ?? '')
    ? (normalized as TeamBooking['pricing']['currency'])
    : fallback;
};

const normalizeCostCategory = (value: unknown): Cost['category'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return (COST_CATEGORIES as string[]).includes(normalized ?? '')
    ? (normalized as Cost['category'])
    : 'other';
};

const normalizePaymentMethod = (value: unknown): Payment['method'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return (PAYMENT_METHODS as string[]).includes(normalized ?? '')
    ? (normalized as Payment['method'])
    : 'transfer';
};

const normalizePaymentPurpose = (value: unknown): Payment['purpose'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return (PAYMENT_PURPOSES as string[]).includes(normalized ?? '')
    ? (normalized as Payment['purpose'])
    : 'balance';
};

const normalizeManagerRole = (value: unknown): Manager['role'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return (MANAGER_ROLES as string[]).includes(normalized ?? '')
    ? (normalized as Manager['role'])
    : 'main';
};

const normalizeCustomerType = (value: unknown): Customer['organizationType'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return (CUSTOMER_TYPES as string[]).includes(normalized ?? '')
    ? (normalized as Customer['organizationType'])
    : 'other';
};

const normalizeAttachmentCategory = (value: unknown): TeamBookingAttachment['category'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  if (normalized === 'itineray') return 'itinerary';
  return (ATTACHMENT_CATEGORIES as string[]).includes(normalized ?? '')
    ? (normalized as TeamBookingAttachment['category'])
    : 'other';
};

const normalizeHistoryAction = (value: unknown): HistoryEntry['action'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  if (normalized === 'status-changed') return 'status_changed';
  return (HISTORY_ACTIONS as string[]).includes(normalized ?? '')
    ? (normalized as HistoryEntry['action'])
    : 'updated';
};

const normalizeGender = (value: unknown): Participant['gender'] => {
  const normalized = toOptionalString(value)?.toLowerCase();
  return normalized === 'female' ? 'female' : 'male';
};

const normalizeFlight = (flight: unknown): FlightItem => {
  const record = isRecord(flight) ? flight : {};
  const departure = isRecord(record.departure) ? record.departure : {};
  const arrival = isRecord(record.arrival) ? record.arrival : {};

  return {
    flightNumber: toRequiredString(record.flightNumber ?? record.number ?? record.code ?? ''),
    airline: toRequiredString(record.airline ?? record.carrier ?? ''),
    departureAirport: toRequiredString(
      record.departureAirport
      ?? departure.airport
      ?? record.origin
      ?? ''
    ),
    arrivalAirport: toRequiredString(
      record.arrivalAirport
      ?? arrival.airport
      ?? record.destination
      ?? ''
    ),
    departureTime: toIsoDateTime(
      record.departureTime
      ?? departure.time
      ?? record.departureDateTime
      ?? record.departureDate
      ?? new Date().toISOString()
    ),
    arrivalTime: toIsoDateTime(
      record.arrivalTime
      ?? arrival.time
      ?? record.arrivalDateTime
      ?? record.arrivalDate
      ?? new Date().toISOString()
    ),
    class: normalizeFlightClass(record.class ?? record.cabin),
    seats: ensureArray(record.seats).map((seat) => toRequiredString(seat))
  };
};

const normalizeBus = (bus: unknown): BusItem => {
  const record = isRecord(bus) ? bus : {};
  const departure = isRecord(record.departure) ? record.departure : {};
  const arrival = isRecord(record.arrival) ? record.arrival : {};

  return {
    busCompany: toRequiredString(record.busCompany ?? record.company ?? ''),
    busNumber: toRequiredString(record.busNumber ?? record.number ?? ''),
    departureLocation: toRequiredString(
      record.departureLocation
      ?? departure.location
      ?? record.origin
      ?? ''
    ),
    arrivalLocation: toRequiredString(
      record.arrivalLocation
      ?? arrival.location
      ?? record.destination
      ?? ''
    ),
    departureTime: toIsoDateTime(
      record.departureTime
      ?? departure.time
      ?? record.departureDateTime
      ?? record.departureDate
      ?? new Date().toISOString()
    ),
    arrivalTime: toIsoDateTime(
      record.arrivalTime
      ?? arrival.time
      ?? record.arrivalDateTime
      ?? record.arrivalDate
      ?? new Date().toISOString()
    ),
    seats: ensureArray(record.seats).map((seat) => toRequiredString(seat))
  };
};

const normalizeRoomAllocation = (room: unknown): Hotel['roomAllocations'][number] => {
  const record = isRecord(room) ? room : {};
  return {
    roomNumber: toOptionalString(record.roomNumber ?? record.number),
    roomType: ((): Hotel['roomAllocations'][number]['roomType'] => {
      const normalized = toOptionalString(record.roomType)?.toLowerCase();
      const allowed: Hotel['roomAllocations'][number]['roomType'][] = [
        'single',
        'double',
        'twin',
        'triple',
        'suite'
      ];
      return (allowed as string[]).includes(normalized ?? '')
        ? (normalized as Hotel['roomAllocations'][number]['roomType'])
        : 'double';
    })(),
    guestNames: ensureArray(record.guestNames ?? record.guests).map((guest) => toRequiredString(guest)),
    checkInDate: toDateOnly(record.checkInDate ?? record.startDate ?? new Date()),
    checkOutDate: toDateOnly(record.checkOutDate ?? record.endDate ?? new Date()),
    specialRequests: toOptionalString(record.specialRequests ?? record.requests)
  };
};

const normalizeHotel = (hotel: unknown): Hotel => {
  const record = isRecord(hotel) ? hotel : {};
  return {
    hotelName: toRequiredString(record.hotelName ?? record.name ?? ''),
    hotelAddress: toRequiredString(record.hotelAddress ?? record.address ?? ''),
    hotelPhone: toOptionalString(record.hotelPhone ?? record.phone),
    checkInDate: toDateOnly(record.checkInDate ?? record.startDate ?? new Date()),
    checkOutDate: toDateOnly(record.checkOutDate ?? record.endDate ?? new Date()),
    roomAllocations: ensureArray(record.roomAllocations ?? record.rooms).map(normalizeRoomAllocation),
    mealPlan: normalizeMealPlan(record.mealPlan ?? record.plan),
    totalRooms: toPositiveInt(record.totalRooms ?? record.roomCount, 0),
    confirmationNumber: toOptionalString(record.confirmationNumber ?? record.confirmation)
  };
};

const normalizeParticipant = (participant: unknown): Participant => {
  const record = isRecord(participant) ? participant : {};
  const emergency = isRecord(record.emergencyContact) ? record.emergencyContact : {};
  return {
    id: toRequiredString(record.id ?? record.participantId ?? ''),
    name: toRequiredString(record.name ?? record.fullName ?? ''),
    nameEng: toOptionalString(record.nameEng ?? record.nameEn ?? record.englishName),
    gender: normalizeGender(record.gender),
    birthDate: toOptionalString(record.birthDate ?? record.dob),
    passportNumber: toOptionalString(record.passportNumber ?? record.passportNo),
    passportExpiry: toOptionalString(record.passportExpiry ?? record.passportExp),
    nationality: toOptionalString(record.nationality),
    phone: toOptionalString(record.phone ?? record.contact),
    email: toOptionalString(record.email),
    roomAssignment: toOptionalString(record.roomAssignment ?? record.room),
    dietaryRestrictions: toOptionalString(record.dietaryRestrictions ?? record.dietaryNeeds),
    medicalNotes: toOptionalString(record.medicalNotes ?? record.medical),
    emergencyContact: ((): Participant['emergencyContact'] | undefined => {
      if (!isRecord(record.emergencyContact) && !record.emergencyContactName) return undefined;
      return {
        name: toRequiredString(emergency.name ?? record.emergencyContactName ?? ''),
        phone: toRequiredString(emergency.phone ?? record.emergencyContactPhone ?? ''),
        relationship: toRequiredString(emergency.relationship ?? record.emergencyContactRelation ?? '')
      };
    })()
  };
};

const normalizeCost = (cost: unknown): Cost => {
  const record = isRecord(cost) ? cost : {};
  return {
    category: normalizeCostCategory(record.category ?? record.type),
    description: toRequiredString(record.description ?? record.label ?? ''),
    amount: toNumberSafe(record.amount, 0) ?? 0,
    currency: normalizeCurrency(record.currency ?? record.unit),
    quantity: toPositiveInt(record.quantity ?? record.count, 1) || 1,
    total: toNumberSafe(record.total ?? record.amount, 0) ?? 0,
    notes: toOptionalString(record.notes ?? record.memo)
  };
};

const normalizePayment = (payment: unknown): Payment => {
  const record = isRecord(payment) ? payment : {};
  return {
    id: toRequiredString(record.id ?? record.paymentId ?? ''),
    date: toDateOnly(record.date ?? record.paidAt ?? new Date()),
    amount: toNumberSafe(record.amount, 0) ?? 0,
    currency: normalizeCurrency(record.currency),
    method: normalizePaymentMethod(record.method),
    payer: toRequiredString(record.payer ?? record.from ?? ''),
    receiver: toRequiredString(record.receiver ?? record.to ?? ''),
    purpose: normalizePaymentPurpose(record.purpose),
    notes: toOptionalString(record.notes ?? record.memo)
  };
};

const normalizeSettlement = (value: unknown): Settlement => {
  const record = isRecord(value) ? value : {};
  return {
    totalRevenue: toNumberSafe(record.totalRevenue ?? record.revenue, 0) ?? 0,
    totalCost: toNumberSafe(record.totalCost ?? record.cost, 0) ?? 0,
    profit: toNumberSafe(record.profit, 0) ?? 0,
    profitMargin: toNumberSafe(record.profitMargin, 0) ?? 0,
    payments: ensureArray(record.payments).map(normalizePayment),
    outstandingBalance: toNumberSafe(record.outstandingBalance ?? record.balance, 0) ?? 0
  };
};

const normalizeCustomerContact = (value: unknown): CustomerContact => {
  const record = isRecord(value) ? value : {};
  return {
    name: toRequiredString(record.name ?? record.fullName ?? ''),
    phone: toRequiredString(record.phone ?? record.contact ?? ''),
    email: toOptionalString(record.email),
    relationship: ((): CustomerContact['relationship'] => {
      const normalized = toOptionalString(record.relationship)?.toLowerCase();
      const allowed: CustomerContact['relationship'][] = ['primary', 'emergency', 'representative'];
      return (allowed as string[]).includes(normalized ?? '')
        ? (normalized as CustomerContact['relationship'])
        : 'primary';
    })()
  };
};

const normalizeCustomer = (value: unknown): Customer => {
  const record = isRecord(value) ? value : {};
  const contacts = ensureArray(record.contacts).map(normalizeCustomerContact);
  const fallbackContact: CustomerContact[] = contacts.length > 0 ? contacts : [
    {
      name: toRequiredString(record.contactName ?? '담당자 미정'),
      phone: toRequiredString(record.contactPhone ?? '000-0000-0000'),
      relationship: 'primary' as const
    }
  ];

  return {
    organizationName: toRequiredString(record.organizationName ?? record.companyName ?? ''),
    organizationType: normalizeCustomerType(record.organizationType ?? record.type),
    contacts: fallbackContact,
    address: toOptionalString(record.address),
    taxId: toOptionalString(record.taxId ?? record.businessNumber),
    notes: toOptionalString(record.notes ?? record.memo)
  };
};

const normalizeManager = (value: unknown): Manager => {
  const record = isRecord(value) ? value : {};
  return {
    id: toRequiredString(record.id ?? record.managerId ?? ''),
    name: toRequiredString(record.name ?? record.fullName ?? ''),
    role: normalizeManagerRole(record.role),
    phone: toRequiredString(record.phone ?? record.contact ?? ''),
    email: toOptionalString(record.email),
    assignedTasks: ensureArray(record.assignedTasks ?? record.tasks).map((task) => toRequiredString(task))
  };
};

const normalizeAttachment = (value: unknown): TeamBookingAttachment => {
  const record = isRecord(value) ? value : {};
  return {
    id: toRequiredString(record.id ?? record.attachmentId ?? ''),
    fileName: toRequiredString(record.fileName ?? record.filename ?? record.name ?? 'attachment'),
    fileType: toRequiredString(record.fileType ?? record.mimeType ?? 'application/octet-stream'),
    fileSize: toPositiveInt(record.fileSize ?? record.size, 0),
    uploadDate: toIsoDateTime(record.uploadDate ?? record.createdAt ?? record.timestamp ?? new Date().toISOString()),
    category: normalizeAttachmentCategory(record.category ?? record.type)
  };
};

const normalizeAttachments = (value: unknown): TeamBooking['attachments'] => {
  const attachments = ensureArray(value).map(normalizeAttachment);
  return attachments.length > 0 ? attachments : undefined;
};

const normalizeTransportation = (value: unknown): Transportation => {
  const record = isRecord(value) ? value : {};
  const outbound = isRecord(record.outbound) ? record.outbound : {};
  const inbound = isRecord(record.inbound) ? record.inbound : {};

  const outboundFlights = Array.isArray(outbound.flights)
    ? outbound.flights
    : Array.isArray(record.outboundFlights)
      ? record.outboundFlights
      : Array.isArray(record.flightsOutbound)
        ? record.flightsOutbound
        : [];

  const inboundFlights = Array.isArray(inbound.flights)
    ? inbound.flights
    : Array.isArray(record.inboundFlights)
      ? record.inboundFlights
      : Array.isArray(record.flightsInbound)
        ? record.flightsInbound
        : [];

  const outboundBuses = Array.isArray(outbound.buses)
    ? outbound.buses
    : Array.isArray(record.outboundBuses)
      ? record.outboundBuses
      : [];

  const inboundBuses = Array.isArray(inbound.buses)
    ? inbound.buses
    : Array.isArray(record.inboundBuses)
      ? record.inboundBuses
      : [];

  return {
    outbound: {
      flights: ensureArray(outboundFlights).map(normalizeFlight),
      buses: ensureArray(outboundBuses).map(normalizeBus)
    },
    inbound: {
      flights: ensureArray(inboundFlights).map(normalizeFlight),
      buses: ensureArray(inboundBuses).map(normalizeBus)
    }
  };
};

const normalizeHistoryEntry = (entry: unknown): HistoryEntry => {
  const record = isRecord(entry) ? entry : {};
  return {
    id: toRequiredString(record.id ?? record.eventId ?? ''),
    action: normalizeHistoryAction(record.action ?? record.type),
    description: toRequiredString(record.description ?? record.message ?? ''),
    changedBy: toRequiredString(record.changedBy ?? record.user ?? 'system'),
    changedAt: toIsoDateTime(record.changedAt ?? record.timestamp ?? new Date().toISOString()),
    changes: isRecord(record.changes) ? record.changes : undefined
  };
};

const normalizePricing = (value: unknown): TeamBooking['pricing'] => {
  const record = isRecord(value) ? value : {};
  return {
    adultPrice: toNumberSafe(record.adultPrice ?? record.adult, 0) ?? 0,
    childPrice: toNumberSafe(record.childPrice ?? record.child, 0) ?? 0,
    infantPrice: toNumberSafe(record.infantPrice ?? record.infant, 0) ?? 0,
    currency: normalizeCurrency(record.currency)
  };
};

const normalizeTeamBookingV2 = (raw: unknown): TeamBooking => {
  const source = isRecord(raw) && isRecord(raw.booking) ? raw.booking : raw;
  const record = isRecord(source) ? source : {};

  const transportation = normalizeTransportation(record.transportation ?? record.travelPlan);
  const accommodations = ensureArray(record.accommodations ?? record.hotels).map(normalizeHotel);
  const participants = ensureArray(record.participants).map(normalizeParticipant);
  const managers = ensureArray(record.managers ?? record.coordinators).map(normalizeManager);
  const attachments = normalizeAttachments(record.attachments ?? record.files);
  const pricing = normalizePricing(record.pricing ?? record.price);
  const settlement = normalizeSettlement(record.settlement ?? record.financials);
  const customer = normalizeCustomer(record.customer ?? record.client);

  // Safely access nested participantCounts object
  const participantCounts = isRecord((record as Record<string, unknown>).participantCounts)
    ? (record as Record<string, unknown>).participantCounts as Record<string, unknown>
    : {};
  const adultCount = toPositiveInt(
    (record as Record<string, unknown>).adultCount
      ?? participantCounts['adults']
      ?? (record as Record<string, unknown>).adults,
    participants.length
  );
  const childCount = toPositiveInt(
    (record as Record<string, unknown>).childCount
      ?? participantCounts['children']
      ?? (record as Record<string, unknown>).children,
    0
  );
  const infantCount = toPositiveInt(
    (record as Record<string, unknown>).infantCount
      ?? participantCounts['infants']
      ?? (record as Record<string, unknown>).infants,
    0
  );
  const totalCount = toPositiveInt(
    record.totalCount
      ?? participantCounts['total']
      ?? record.totalParticipants
      ?? participants.length,
    participants.length
  );

  const createdAt = toIsoDateTime(record.createdAt, new Date().toISOString());
  const updatedAt = toIsoDateTime(record.updatedAt, createdAt);

  // Safely access nested objects with records
  const teamObj = isRecord((record as Record<string, unknown>).team)
    ? (record as Record<string, unknown>).team as Record<string, unknown>
    : {};
  const duration = isRecord((record as Record<string, unknown>).duration)
    ? (record as Record<string, unknown>).duration as Record<string, unknown>
    : {};

  return {
    id: toRequiredString(record.id ?? record.bookingId ?? record.uuid ?? ''),
    bookingNumber: toRequiredString(
      record.bookingNumber
      ?? record.bookingNo
      ?? record.reference
      ?? record.code
      ?? record.id
      ?? ''
    ),
    teamCode: toRequiredString(record.teamCode ?? teamObj['code'] ?? (record as Record<string, unknown>).code ?? ''),
    tourName: toRequiredString(
      record.tourName
      ?? record.programName
      ?? record.productName
      ?? record.title
      ?? record.teamName
      ?? 'Team Booking'
    ),
    destination: toRequiredString(
      record.destination
      ?? record.destinationName
      ?? record.destinationCity
      ?? record.city
      ?? ''
    ),
    tourType: normalizeTourType(record.tourType ?? record.type),
    departureDate: toDateOnly(record.departureDate ?? record.startDate ?? record.tripStart ?? new Date()),
    returnDate: toDateOnly(record.returnDate ?? record.endDate ?? record.tripEnd ?? record.departureDate ?? new Date()),
    nights: toPositiveInt(record.nights ?? duration['nights'], 0),
    days: toPositiveInt(record.days ?? duration['days'], 0),
    transportation,
    accommodations,
    participants,
    adultCount,
    childCount,
    infantCount,
    totalCount,
    costs: ensureArray(record.costs ?? record.expenses).map(normalizeCost),
    pricing,
    settlement,
    customer,
    managers,
    mainManagerId: toRequiredString(record.mainManagerId ?? (record as Record<string, unknown>).primaryManagerId ?? managers[0]?.id ?? ''),
    status: normalizeStatus(record.status),
    cancellationReason: toOptionalString(record.cancellationReason ?? record.cancelReason),
    memo: toOptionalString(record.memo ?? record.notes ?? record.internalNotes),
    attachments,
    createdAt,
    createdBy: toRequiredString(record.createdBy ?? record.createdById ?? 'system'),
    updatedAt,
    updatedBy: toRequiredString(record.updatedBy ?? record.updatedById ?? record.createdBy ?? 'system')
  };
};

const normalizeTeamBooking = (raw: unknown, mode: Mode): TeamBooking => {
  if (mode === 'v1') {
    const payload = isRecord(raw) && isRecord(raw.booking) ? raw.booking : raw;
    return payload as TeamBooking;
  }
  return normalizeTeamBookingV2(raw);
};

const normalizeTeamBookingListResponse = (
  raw: unknown,
  mode: Mode
): TeamBookingListResponse => {
  if (mode === 'v1') {
    return (raw as TeamBookingListResponse) ?? {
      bookings: [],
      total: 0,
      page: 1,
      pageSize: 0
    };
  }

  const record = isRecord(raw) ? raw : {};
  const data = Array.isArray(record.bookings)
    ? record.bookings
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(raw)
        ? raw
        : [];

  const pagination = isRecord(record.pagination) ? record.pagination : {};

  const pageSize = toPositiveInt(
    record.pageSize
      ?? record.limit
      ?? pagination.limit
      ?? data.length,
    data.length
  );

  return {
    bookings: ensureArray(data).map((item) => normalizeTeamBookingV2(item)),
    total: toPositiveInt(record.total ?? pagination.total ?? data.length, data.length),
    page: toPositiveInt(record.page ?? pagination.page ?? 1, 1) || 1,
    pageSize
  };
};

const normalizeTeamBookingDetailResponse = (
  raw: unknown,
  mode: Mode
): TeamBookingDetailResponse => {
  if (mode === 'v1') {
    if (isRecord(raw) && raw.booking) {
      return {
        booking: raw.booking as TeamBooking,
        history: Array.isArray(raw.history) ? raw.history as HistoryEntry[] : undefined
      };
    }
    return {
      booking: raw as TeamBooking,
      history: undefined
    };
  }

  const record = isRecord(raw) ? raw : {};
  const booking = record.booking ?? record;
  const history = Array.isArray(record.history)
    ? record.history.map(normalizeHistoryEntry)
    : undefined;

  return {
    booking: normalizeTeamBookingV2(booking),
    history
  };
};
export const __setTeamBookingServiceModeForTests = (mode: Mode | null) => {
  forcedMode = mode;
};

export const teamBookingService = {
  // Create new team booking
  async createTeamBooking(payload: CreateTeamBookingPayload): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.post<TeamBooking | Record<string, unknown>>(
      buildUrl('', mode),
      payload
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Get team bookings with filters
  async getTeamBookings(filters?: TeamBookingFilters): Promise<TeamBookingListResponse> {
    const mode = resolveMode();
    const response = await apiClient.get<TeamBookingListResponse | Record<string, unknown>>(
      buildUrl('', mode),
      { params: filters }
    );
    return normalizeTeamBookingListResponse(response?.data, mode);
  },

  // Get single team booking detail
  async getTeamBookingDetail(bookingId: string): Promise<TeamBookingDetailResponse> {
    const mode = resolveMode();
    const response = await apiClient.get<TeamBookingDetailResponse | Record<string, unknown>>(
      buildUrl(`/${bookingId}`, mode)
    );
    return normalizeTeamBookingDetailResponse(response?.data, mode);
  },

  // Update team booking
  async updateTeamBooking(
    bookingId: string,
    payload: UpdateTeamBookingPayload
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.patch<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}`, mode),
      payload
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Delete team booking
  async deleteTeamBooking(bookingId: string): Promise<void> {
    const mode = resolveMode();
    await apiClient.delete(buildUrl(`/${bookingId}`, mode));
  },

  // Transportation management
  async updateTransportation(
    bookingId: string,
    transportation: Transportation
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.put<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/transportation`, mode),
      transportation
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Accommodation management
  async updateAccommodations(
    bookingId: string,
    accommodations: Hotel[]
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.put<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/accommodations`, mode),
      { accommodations }
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Participant management
  async addParticipants(
    bookingId: string,
    participants: Participant[]
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.post<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/participants`, mode),
      { participants }
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  async updateParticipant(
    bookingId: string,
    participantId: string,
    data: Partial<Participant>
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.patch<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/participants/${participantId}`, mode),
      data
    );
    const responseData = response?.data;
    if (!responseData) {
      return responseData as TeamBooking;
    }
    return normalizeTeamBooking(responseData, mode);
  },

  async removeParticipant(
    bookingId: string,
    participantId: string
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.delete<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/participants/${participantId}`, mode)
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Financial management
  async updateCosts(bookingId: string, costs: Cost[]): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.put<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/costs`, mode),
      { costs }
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  async addPayment(bookingId: string, payment: Omit<Payment, 'id'>): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.post<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/payments`, mode),
      payment
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  async updatePayment(
    bookingId: string,
    paymentId: string,
    data: Partial<Payment>
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.patch<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/payments/${paymentId}`, mode),
      data
    );
    const responseData = response?.data;
    if (!responseData) {
      return responseData as TeamBooking;
    }
    return normalizeTeamBooking(responseData, mode);
  },

  async deletePayment(bookingId: string, paymentId: string): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.delete<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/payments/${paymentId}`, mode)
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Manager assignment
  async assignManagers(bookingId: string, managers: Manager[]): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.put<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/managers`, mode),
      { managers }
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Status management
  async updateStatus(
    bookingId: string,
    status: TeamBooking['status'],
    reason?: string
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.patch<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/status`, mode),
      { status, reason }
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // File attachment management
  async uploadAttachment(
    bookingId: string,
    file: File,
    category: string
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await apiClient.post<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/attachments`, mode),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  async deleteAttachment(
    bookingId: string,
    attachmentId: string
  ): Promise<TeamBooking> {
    const mode = resolveMode();
    const response = await apiClient.delete<TeamBooking | Record<string, unknown>>(
      buildUrl(`/${bookingId}/attachments/${attachmentId}`, mode)
    );
    const data = response?.data;
    if (!data) {
      return data as TeamBooking;
    }
    return normalizeTeamBooking(data, mode);
  },

  // Bulk operations
  async bulkUpdateStatus(
    bookingIds: string[],
    status: TeamBooking['status']
  ): Promise<{ updated: number; failed: string[] }> {
    const mode = resolveMode();
    const response = await apiClient.post<{ updated: number; failed: string[] }>(
      buildUrl('/bulk/status', mode),
      { bookingIds, status }
    );
    return response?.data ?? { updated: 0, failed: bookingIds };
  },

  // Export operations
  async exportBookings(filters?: TeamBookingFilters): Promise<Blob> {
    const mode = resolveMode();
    const response = await apiClient.get(buildUrl('/export', mode), {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },

  // Calendar view helpers
  async getMonthlyBookings(year: number, month: number): Promise<TeamBooking[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const response = await this.getTeamBookings({
      startDate,
      endDate,
      pageSize: 100
    });

    return response.bookings;
  },

  // Statistics
  async getBookingStatistics(filters?: {
    startDate?: string;
    endDate?: string;
    managerId?: string;
  }): Promise<{
    totalBookings: number;
    totalRevenue: number;
    totalParticipants: number;
    byStatus: Record<string, number>;
    byDestination: Record<string, number>;
    byMonth: Array<{ month: string; count: number; revenue: number }>;
  }> {
    const mode = resolveMode();
    const response = await apiClient.get(
      buildUrl('/statistics', mode),
      { params: filters }
    );
    return (response?.data as {
      totalBookings: number;
      totalRevenue: number;
      totalParticipants: number;
      byStatus: Record<string, number>;
      byDestination: Record<string, number>;
      byMonth: Array<{ month: string; count: number; revenue: number }>;
    }) ?? {
      totalBookings: 0,
      totalRevenue: 0,
      totalParticipants: 0,
      byStatus: {},
      byDestination: {},
      byMonth: []
    };
  }
};
