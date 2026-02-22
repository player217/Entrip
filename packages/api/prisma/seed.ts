import { PrismaClient, BookingStatus, BookingType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'pass1234';

const seedCompanies = [
  {
    code: 'entrip',
    domain: 'entrip.com',
    users: [
      { email: 'admin@entrip.com', role: UserRole.ADMIN, name: 'Entrip Admin' },
      { email: 'manager@entrip.com', role: UserRole.MANAGER, name: 'Entrip Manager' },
      { email: 'manager1@entrip.com', role: UserRole.MANAGER, name: 'Entrip Manager1' },
      { email: 'user@entrip.com', role: UserRole.USER, name: 'Entrip User' },
      { email: 'demo@entrip.com', role: UserRole.USER, name: 'Entrip Demo' },
    ],
  },
  {
    code: 'j1',
    domain: 'j1.com',
    users: [
      { email: 'admin@j1.com', role: UserRole.ADMIN, name: 'J1 Admin' },
      { email: 'manager@j1.com', role: UserRole.MANAGER, name: 'J1 Manager' },
      { email: 'user@j1.com', role: UserRole.USER, name: 'J1 User' },
    ],
  },
  {
    code: 'startour',
    domain: 'startour.com',
    users: [
      { email: 'admin@startour.com', role: UserRole.ADMIN, name: 'Startour Admin' },
      { email: 'manager@startour.com', role: UserRole.MANAGER, name: 'Startour Manager' },
      { email: 'user@startour.com', role: UserRole.USER, name: 'Startour User' },
    ],
  },
  {
    code: 'happytravel',
    domain: 'happytravel.com',
    users: [
      { email: 'admin@happytravel.com', role: UserRole.ADMIN, name: 'Happytravel Admin' },
      { email: 'manager@happytravel.com', role: UserRole.MANAGER, name: 'Happytravel Manager' },
      { email: 'user@happytravel.com', role: UserRole.USER, name: 'Happytravel User' },
    ],
  },
] as const;

const cityPool = ['Seoul', 'Tokyo', 'Osaka', 'Busan', 'Singapore', 'Hanoi', 'NewYork', 'Paris', 'Bangkok', 'DaNang'];
const bookingStatuses: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.PENDING,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];
const bookingTypes: BookingType[] = [
  BookingType.FIT,
  BookingType.GROUP,
  BookingType.INCENTIVE,
  BookingType.BUSINESS,
  BookingType.PACKAGE,
];

async function truncateAll() {
  const tables = [
    '"Booking"',
    '"User"',
    '"Flight"',
    '"Hotel"',
    '"Vehicle"',
    '"Settlement"',
    '"SystemMessage"',
    '"Conversation"',
    '"Outbox"',
    '"IntegrationProvider"',
    '"ExternalCallLog"',
    '"AuditLog"',
    '"FxRateCache"',
    '"IntegrationInbox"',
    '"FlightStatusCache"',
    '"ExchangeRate"',
    '"Notification"',
    '"NotificationPreference"',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
  }
}

async function main() {
  console.log('?? Seeding v2 database...');

  await truncateAll();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIdByEmail = new Map<string, string>();

  for (const company of seedCompanies) {
    for (const user of company.users) {
      const created = await prisma.user.create({
        data: {
          email: user.email,
          name: user.name,
          password: passwordHash,
          role: user.role,
          companyCode: company.code,
          isActive: true,
        },
      });
      userIdByEmail.set(user.email, created.id);
    }
  }

  console.log(`?? Users created: ${userIdByEmail.size}`);

  let bookingCounter = 1;
  const bookingCreates = [];

  for (const company of seedCompanies) {
    const ownerEmail = company.users.find((u) => u.role === UserRole.ADMIN)?.email;
    const userId = ownerEmail ? userIdByEmail.get(ownerEmail) : undefined;

    for (let i = 0; i < 24; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (i % 20));
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 2 + (i % 4));

      const origin = cityPool[i % cityPool.length];
      const destination = cityPool[(i + 3) % cityPool.length];
      const pax = (i % 10) + 2;

      bookingCreates.push(
        prisma.booking.create({
          data: {
            bookingNumber: `BK${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(bookingCounter++).padStart(4, '0')}`,
            companyCode: company.code,
            createdBy: userId,
            teamName: `${company.code.toUpperCase()} Team ${i + 1}`,
            teamType: i % 2 === 0 ? 'Incentive' : 'Leisure',
            type: bookingTypes[i % bookingTypes.length],
            origin,
            destination,
            startDate,
            endDate,
            nights: Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)),
            days: Math.max(2, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1),
            customerName: `Customer-${company.code}-${i + 1}`,
            representative: `Rep-${company.code}-${i + 1}`,
            contact: `010-${String(1000 + i).padStart(4, '0')}-${String(3000 + i).padStart(4, '0')}`,
            email: `customer${i + 1}@${company.domain}`,
            totalPax: pax,
            paxCount: pax,
            coordinator: `Coordinator-${i + 1}`,
            manager: `Manager-${i + 1}`,
            revenue: 4_500_000 + i * 120_000,
            totalPrice: 4_500_000 + i * 120_000,
            depositAmount: 1_200_000 + i * 50_000,
            currency: 'KRW',
            status: bookingStatuses[i % bookingStatuses.length],
            notes: `Seed data for ${company.code}`,
            memo: 'Demo booking',
            flightInfo: { airline: 'Entrip Air', flightNo: `EN${200 + i}` },
            hotelInfo: { name: `Hotel-${company.code}-${i + 1}`, address: `${destination}-center` },
          },
        })
      );
    }
  }

  const createdBookings = await prisma.$transaction(bookingCreates);
  console.log(`?? Bookings created: ${createdBookings.length}`);

  const anchor = createdBookings.find((b) => b.companyCode === 'entrip');
  if (anchor) {
    await prisma.flight.create({
      data: {
        bookingId: anchor.id,
        flightNumber: 'EN123',
        airline: 'Entrip Air',
        origin: 'ICN',
        destination: 'HND',
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        status: 'SCHEDULED',
        terminal: 'T1',
        gate: 'A12',
        paxCount: anchor.totalPax,
        confirmationNo: 'EN-DEMO-123',
        companyCode: anchor.companyCode,
      },
    });

    await prisma.hotel.create({
      data: {
        bookingId: anchor.id,
        hotelName: 'Entrip Demo Hotel',
        address: 'Shinjuku, Tokyo',
        city: 'Tokyo',
        country: 'Japan',
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        roomType: 'Twin',
        roomCount: 10,
        guestCount: anchor.totalPax,
        confirmationNo: 'HOTEL-DEMO-1',
        status: 'CONFIRMED',
        ratePerNight: 200_000,
        totalAmount: 600_000,
        currency: 'KRW',
        breakfast: 'true',
        companyCode: anchor.companyCode,
      },
    });
  }

  console.log('? Seed completed');
  console.log('?? Demo password:', DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error('? Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
