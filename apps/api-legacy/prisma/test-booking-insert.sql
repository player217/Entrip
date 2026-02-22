-- Test insert one booking to understand the schema
INSERT INTO "Booking" (
    id, "bookingNumber", "companyCode", "customerName", "teamName", 
    "teamType", type, origin, destination, "startDate", "endDate",
    "paxCount", nights, days, status, manager, coordinator,
    "totalPrice", currency, "createdAt", "updatedAt", version
) VALUES (
    'test_booking_001',
    'TEST-2025-09-0001',
    'J1',
    '테스트 고객',
    '테스트팀',
    'GROUP',
    'PACKAGE',
    '서울',
    '부산',
    '2025-09-15 14:00:00'::TIMESTAMP,
    '2025-09-16 11:00:00'::TIMESTAMP,
    20,
    1,
    2,
    'CONFIRMED',
    'J1 관리자',
    'J1 관리자',
    5000000,
    'KRW',
    NOW(),
    NOW(),
    1
);

-- Check if it was inserted
SELECT id, "bookingNumber", "companyCode", "customerName", status FROM "Booking" WHERE id = 'test_booking_001';