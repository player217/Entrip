import { PrismaClient, BookingType, BookingStatus, UserRole, FlightStatus, HotelStatus, ConversationType, MessageType, ParticipantRole, MessageStatus, NotificationType, NotificationPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  // Clear existing data (optional - be careful in production)
  console.log('🧹 Cleaning existing data...');
  await prisma.$executeRaw`TRUNCATE TABLE "Booking" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Flight" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Hotel" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Vehicle" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Settlement" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "SystemMessage" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Conversation" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Outbox" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "IntegrationProvider" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "ExternalCallLog" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "AuditLog" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "FxRateCache" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "IntegrationInbox" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "FlightStatusCache" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "ExchangeRate" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Notification" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "NotificationPreference" CASCADE`;

  // Create users for multiple companies
  console.log('👥 Creating users for multiple companies...');

  const defaultPassword = await bcrypt.hash('pass1234', 10);

  const users = [
    // J1 여행사
    {
      email: 'admin@j1.com',
      name: 'J1 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'j1',
      department: '경영지원팀',
      isActive: true,
    },
    {
      email: 'manager@j1.com',
      name: 'J1 매니저',
      password: defaultPassword,
      role: UserRole.MANAGER,
      companyCode: 'j1',
      department: '영업팀',
      isActive: true,
    },
    {
      email: 'user1@j1.com',
      name: 'J1 직원1',
      password: defaultPassword,
      role: UserRole.USER,
      companyCode: 'j1',
      department: '영업팀',
      isActive: true,
    },

    // 스타투어
    {
      email: 'admin@star.com',
      name: '스타 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'star',
      department: '경영지원팀',
      isActive: true,
    },
    {
      email: 'user@star.com',
      name: '스타 직원',
      password: defaultPassword,
      role: UserRole.USER,
      companyCode: 'star',
      department: '기획팀',
      isActive: true,
    },

    // 해피트래블
    {
      email: 'admin@happy.com',
      name: '해피 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'happy',
      department: '경영지원팀',
      isActive: true,
    },
    {
      email: 'manager@happy.com',
      name: '해피 매니저',
      password: defaultPassword,
      role: UserRole.MANAGER,
      companyCode: 'happy',
      department: '마케팅팀',
      isActive: true,
    },

    // Entrip 메인
    {
      email: 'admin@entrip.com',
      name: 'Entrip 관리자',
      password: defaultPassword,
      role: UserRole.ADMIN,
      companyCode: 'entrip',
      department: '시스템팀',
      isActive: true,
    },
    {
      email: 'demo@entrip.com',
      name: '데모 사용자',
      password: defaultPassword,
      role: UserRole.USER,
      companyCode: 'entrip',
      department: '데모팀',
      isActive: true,
    },
  ];

  const createdUsers = await Promise.all(
    users.map(user => prisma.user.create({ data: user }))
  );

  console.log(`✅ Created ${createdUsers.length} users`);

  // Get user IDs for booking assignment
  const j1Admin = createdUsers.find(u => u.email === 'admin@j1.com');
  const starAdmin = createdUsers.find(u => u.email === 'admin@star.com');
  const happyAdmin = createdUsers.find(u => u.email === 'admin@happy.com');
  const entripAdmin = createdUsers.find(u => u.email === 'admin@entrip.com');

  // Create demo bookings with company assignments
  console.log('📝 Creating demo bookings...');

  // Generate booking number helper
  let bookingCounter = 1;
  const generateBookingNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const number = String(bookingCounter++).padStart(4, '0');
    return `BK${year}${month}${number}`;
  };

  const bookings = [
    // J1 여행사 예약
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'j1',
      userId: j1Admin?.id,
      teamName: 'J1 기업 인센티브 - 삼성전자',
      teamType: '기업연수',
      type: BookingType.INCENTIVE,
      origin: '서울',
      destination: '도쿄',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-09-05'),
      nights: 4,
      days: 5,
      customerName: '김철수',
      representative: '김철수',
      contact: '010-1234-5678',
      email: 'kim@samsung.com',
      totalPax: 30,
      paxCount: 30,
      coordinator: '홍길동',
      manager: '박영희',
      revenue: 12000000,
      totalPrice: 12000000,
      depositAmount: 3600000,
      currency: 'KRW',
      status: BookingStatus.CONFIRMED,
      notes: '도쿄 인센티브 여행 - 4박 5일',
      memo: '중요 고객',
      flightInfo: { airline: 'Korean Air', flightNo: 'KE001' },
      hotelInfo: { name: 'Tokyo Hilton', address: 'Shinjuku, Tokyo' },
    },
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'j1',
      userId: j1Admin?.id,
      teamName: 'J1 골프 패키지 - LG전자',
      teamType: '골프여행',
      type: BookingType.GROUP,
      origin: '서울',
      destination: '부산',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-09-17'),
      nights: 2,
      days: 3,
      customerName: '이영수',
      representative: '이영수',
      contact: '010-2345-6789',
      email: 'lee@lg.com',
      totalPax: 16,
      paxCount: 16,
      coordinator: '김영희',
      manager: '최민수',
      revenue: 8500000,
      totalPrice: 8500000,
      depositAmount: 2550000,
      currency: 'KRW',
      status: BookingStatus.PENDING,
      notes: '부산 골프 여행 - 2박 3일',
      memo: '골프장 예약 확인 필요',
    },
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'j1',
      userId: j1Admin?.id,
      teamName: 'J1 신혼여행 - 김철수&이영희',
      teamType: '신혼여행',
      type: BookingType.FIT,
      origin: '서울',
      destination: '파리',
      startDate: new Date('2025-10-10'),
      endDate: new Date('2025-10-20'),
      nights: 10,
      days: 11,
      customerName: '김철수',
      representative: '김철수',
      contact: '010-3456-7890',
      email: 'kim@example.com',
      totalPax: 2,
      paxCount: 2,
      coordinator: '박민수',
      manager: '정수진',
      revenue: 15000000,
      totalPrice: 15000000,
      depositAmount: 4500000,
      currency: 'KRW',
      status: BookingStatus.CONFIRMED,
      notes: '파리 신혼여행 - 10박 11일',
      memo: 'VIP 고객',
    },

    // 스타투어 예약
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'star',
      userId: starAdmin?.id,
      teamName: '스타 비즈니스 출장 - 현대자동차',
      teamType: '비즈니스',
      type: BookingType.BUSINESS,
      origin: '서울',
      destination: '도쿄',
      startDate: new Date('2025-09-25'),
      endDate: new Date('2025-09-27'),
      nights: 2,
      days: 3,
      customerName: '박지훈',
      representative: '박지훈',
      contact: '010-4567-8901',
      email: 'park@hyundai.com',
      totalPax: 5,
      paxCount: 5,
      coordinator: '이철수',
      manager: '김상민',
      revenue: 3500000,
      totalPrice: 3500000,
      depositAmount: 1050000,
      currency: 'KRW',
      status: BookingStatus.COMPLETED,
      notes: '도쿄 비즈니스 출장',
      memo: '업무 출장',
    },
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'star',
      userId: starAdmin?.id,
      teamName: '스타 가족 여행 - 정상훈 가족',
      teamType: '가족여행',
      type: BookingType.BUSINESS,
      origin: '서울',
      destination: '방콕',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-09-22'),
      nights: 7,
      days: 8,
      customerName: '정상훈',
      representative: '정상훈',
      contact: '010-5678-9012',
      email: 'jung@example.com',
      totalPax: 8,
      paxCount: 8,
      coordinator: '최지영',
      manager: '이태호',
      revenue: 6800000,
      totalPrice: 6800000,
      depositAmount: 2040000,
      currency: 'KRW',
      status: BookingStatus.PENDING,
      notes: '방콕 가족 휴가 - 7박 8일',
      memo: '가족 단위 여행',
    },

    // 해피트래블 예약
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'happy',
      userId: happyAdmin?.id,
      teamName: '해피 기업 워크샵 - SK텔레콤',
      teamType: '워크샵',
      type: BookingType.INCENTIVE,
      origin: '서울',
      destination: '싱가포르',
      startDate: new Date('2025-10-05'),
      endDate: new Date('2025-10-08'),
      nights: 3,
      days: 4,
      customerName: '최현우',
      representative: '최현우',
      contact: '010-6789-0123',
      email: 'choi@skt.com',
      totalPax: 45,
      paxCount: 45,
      coordinator: '정우진',
      manager: '김지훈',
      revenue: 18000000,
      totalPrice: 18000000,
      depositAmount: 5400000,
      currency: 'KRW',
      status: BookingStatus.CONFIRMED,
      notes: '싱가포르 기업 워크샵',
      memo: '대규모 단체',
    },
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'happy',
      userId: happyAdmin?.id,
      teamName: '해피 골프 여행 - KT 임원진',
      teamType: '골프여행',
      type: BookingType.GROUP,
      origin: '서울',
      destination: '제주',
      startDate: new Date('2025-09-05'),
      endDate: new Date('2025-09-07'),
      nights: 2,
      days: 3,
      customerName: '강민호',
      representative: '강민호',
      contact: '010-7890-1234',
      email: 'kang@kt.com',
      totalPax: 12,
      paxCount: 12,
      coordinator: '강동현',
      manager: '박서준',
      revenue: 4200000,
      totalPrice: 4200000,
      depositAmount: 1260000,
      currency: 'KRW',
      status: BookingStatus.CANCELLED,
      notes: '제주도 골프 - 취소된 예약',
      memo: '일정 변경으로 취소',
    },

    // Entrip 데모 예약
    {
      bookingNumber: generateBookingNumber(),
      companyCode: 'entrip',
      userId: entripAdmin?.id,
      teamName: '데모 인센티브 - 데모 회사',
      teamType: '인센티브',
      type: BookingType.INCENTIVE,
      origin: '서울',
      destination: '로스앤젤레스',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-11-08'),
      nights: 7,
      days: 8,
      customerName: '홍길동',
      representative: '홍길동',
      contact: '010-8901-2345',
      email: 'demo@demo.com',
      totalPax: 20,
      paxCount: 20,
      coordinator: '데모 담당자',
      manager: '시스템',
      revenue: 25000000,
      totalPrice: 25000000,
      depositAmount: 7500000,
      currency: 'KRW',
      status: BookingStatus.PENDING,
      notes: '데모 인센티브 여행',
      memo: '시스템 테스트용 예약',
    },
  ];

  const createdBookings = await Promise.all(
    bookings.map(booking => prisma.booking.create({ data: booking }))
  );

  console.log(`✅ Created ${createdBookings.length} bookings`);

  // Create sample flights for some bookings
  console.log('✈️ Creating sample flights...');

  const flights = [
    {
      bookingId: createdBookings[0].id,
      flightNumber: 'KE001',
      airline: 'Korean Air',
      origin: 'ICN',
      destination: 'NRT',
      departureTime: new Date('2025-09-01T10:00:00'),
      arrivalTime: new Date('2025-09-01T14:30:00'),
      status: FlightStatus.SCHEDULED,
      terminal: 'T2',
      gate: 'A12',
      seatNumbers: ['12A', '12B', '12C'],
      paxCount: 30,
      confirmationNo: 'KE123456',
      companyCode: 'j1',
    },
    {
      bookingId: createdBookings[0].id,
      flightNumber: 'KE002',
      airline: 'Korean Air',
      origin: 'NRT',
      destination: 'ICN',
      departureTime: new Date('2025-09-05T16:00:00'),
      arrivalTime: new Date('2025-09-05T18:30:00'),
      status: FlightStatus.SCHEDULED,
      terminal: 'T1',
      gate: 'B24',
      seatNumbers: ['14A', '14B', '14C'],
      paxCount: 30,
      confirmationNo: 'KE789012',
      companyCode: 'j1',
    },
  ];

  await Promise.all(
    flights.map(flight => prisma.flight.create({ data: flight }))
  );

  console.log(`✅ Created ${flights.length} flights`);

  // Create sample hotels for some bookings
  console.log('🏨 Creating sample hotels...');

  const hotels = [
    {
      bookingId: createdBookings[0].id,
      hotelName: 'Tokyo Hilton',
      address: 'Shinjuku, Tokyo',
      city: 'Tokyo',
      country: 'Japan',
      checkInDate: new Date('2025-09-01'),
      checkOutDate: new Date('2025-09-05'),
      roomType: 'Twin',
      roomCount: 15,
      guestCount: 30,
      confirmationNo: 'HTL123456',
      status: HotelStatus.CONFIRMED,
      ratePerNight: 250000,
      totalAmount: 15000000,
      currency: 'KRW',
      breakfast: true,
      companyCode: 'j1',
    },
    {
      bookingId: createdBookings[2].id,
      hotelName: 'Hotel de Louvre',
      address: '172 Rue de Rivoli, 75001 Paris',
      city: 'Paris',
      country: 'France',
      checkInDate: new Date('2025-10-10'),
      checkOutDate: new Date('2025-10-20'),
      roomType: 'Suite',
      roomCount: 1,
      guestCount: 2,
      confirmationNo: 'PAR789012',
      status: HotelStatus.RESERVED,
      ratePerNight: 500000,
      totalAmount: 5000000,
      currency: 'KRW',
      breakfast: true,
      companyCode: 'j1',
    },
  ];

  await Promise.all(
    hotels.map(hotel => prisma.hotel.create({ data: hotel }))
  );

  console.log(`✅ Created ${hotels.length} hotels`);

  // Create sample conversations for messaging
  console.log('💬 Creating sample conversations...');

  const conversation1 = await prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      companyCode: 'j1',
      createdBy: j1Admin?.id,
      participants: {
        create: [
          { userId: j1Admin!.id, role: 'OWNER' },
          { userId: createdUsers.find(u => u.email === 'manager@j1.com')!.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      name: 'J1 여행사 팀 채널',
      type: ConversationType.GROUP,
      companyCode: 'j1',
      createdBy: j1Admin?.id,
      participants: {
        create: [
          { userId: j1Admin!.id, role: 'OWNER' },
          { userId: createdUsers.find(u => u.email === 'manager@j1.com')!.id, role: 'MEMBER' },
          { userId: createdUsers.find(u => u.email === 'user1@j1.com')!.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('✅ Created 2 conversations');

  // Create sample messages
  console.log('📨 Creating sample messages...');

  const messages = [
    {
      conversationId: conversation1.id,
      senderId: j1Admin!.id,
      type: MessageType.TEXT,
      content: '안녕하세요! 삼성전자 인센티브 건 준비 잘 되고 있나요?',
      status: 'SENT' as const,
    },
    {
      conversationId: conversation1.id,
      senderId: createdUsers.find(u => u.email === 'manager@j1.com')!.id,
      type: MessageType.TEXT,
      content: '네, 항공편과 호텔 모두 확정되었습니다. 내일 최종 확인서 보내드리겠습니다.',
      status: 'SENT' as const,
    },
    {
      conversationId: conversation2.id,
      senderId: j1Admin!.id,
      type: MessageType.TEXT,
      content: '팀 여러분, 이번 달 실적 정말 좋습니다! 수고하셨습니다.',
      status: 'SENT' as const,
    },
  ];

  await Promise.all(
    messages.map(message => prisma.message.create({ data: message }))
  );

  console.log(`✅ Created ${messages.length} messages`);

  // ==========================================
  // Create notification preferences
  // ==========================================
  console.log('🔔 Creating notification preferences...');

  const notificationPreferences = createdUsers.map(user => ({
    userId: user.id,
    companyCode: user.companyCode,
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    bookingNotifications: true,
    messageNotifications: true,
    approvalNotifications: true,
    paymentNotifications: true,
    systemNotifications: true,
  }));

  await Promise.all(
    notificationPreferences.map(pref =>
      prisma.notificationPreference.create({ data: pref })
    )
  );

  console.log(`✅ Created ${notificationPreferences.length} notification preferences`);

  // ==========================================
  // Create sample notifications
  // ==========================================
  console.log('📬 Creating sample notifications...');

  const notifications = [
    // J1 Admin 알림들
    {
      companyCode: 'j1',
      userId: j1Admin!.id,
      type: NotificationType.BOOKING_CREATED,
      priority: NotificationPriority.NORMAL,
      title: '새 예약 생성',
      message: '삼성전자 인센티브 예약이 생성되었습니다.',
      data: { bookingId: createdBookings[0]?.id },
      isRead: false,
    },
    {
      companyCode: 'j1',
      userId: j1Admin!.id,
      type: NotificationType.MESSAGE_RECEIVED,
      priority: NotificationPriority.NORMAL,
      title: '새 메시지',
      message: 'J1 매니저님이 메시지를 보냈습니다.',
      data: { conversationId: conversation1.id },
      isRead: false,
    },
    {
      companyCode: 'j1',
      userId: j1Admin!.id,
      type: NotificationType.SYSTEM_ALERT,
      priority: NotificationPriority.HIGH,
      title: '시스템 점검 안내',
      message: '오늘 밤 12시부터 새벽 2시까지 시스템 점검이 있습니다.',
      isRead: true,
      readAt: new Date(),
    },
    // Star 여행사 Admin 알림
    {
      companyCode: 'star',
      userId: createdUsers.find(u => u.email === 'admin@star.com')!.id,
      type: NotificationType.BOOKING_UPDATED,
      priority: NotificationPriority.HIGH,
      title: '예약 상태 변경',
      message: 'LG전자 FIT 예약이 확정 상태로 변경되었습니다.',
      data: { bookingId: createdBookings[1]?.id },
      isRead: false,
    },
    // Happy 여행사 Manager 알림
    {
      companyCode: 'happy',
      userId: createdUsers.find(u => u.email === 'manager@happy.com')!.id,
      type: NotificationType.APPROVAL_REQUESTED,
      priority: NotificationPriority.URGENT,
      title: '승인 요청',
      message: '현대자동차 PACKAGE 예약에 대한 승인이 필요합니다.',
      data: { bookingId: createdBookings[2]?.id },
      isRead: false,
      linkUrl: '/approvals',
    },
  ];

  const createdNotifications = await Promise.all(
    notifications.map(notification =>
      prisma.notification.create({ data: notification })
    )
  );

  console.log(`✅ Created ${createdNotifications.length} notifications`);

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });