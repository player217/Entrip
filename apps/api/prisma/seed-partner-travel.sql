-- Generate bookings for PARTNER_TRAVEL (days 21-28 to avoid day 29+ issues)
-- Creating 500 records distributed across 2025

-- Create helper functions if not exists
CREATE OR REPLACE FUNCTION random_korean_name() RETURNS text AS $$
DECLARE
    surnames text[] := ARRAY['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
    given_names text[] := ARRAY['민수', '지영', '준혁', '서연', '태호', '수진', '현우', '미나', '준서', '하늘', '지훈', '예진', '성민', '유진', '건우'];
BEGIN
    RETURN surnames[1 + floor(random() * array_length(surnames, 1))] || given_names[1 + floor(random() * array_length(given_names, 1))];
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION random_team_name() RETURNS text AS $$
DECLARE
    prefixes text[] := ARRAY['행복한', '즐거운', '신나는', '활기찬', '멋진', '특별한', '아름다운', '환상적인', '최고의', '완벽한'];
    suffixes text[] := ARRAY['여행단', '관광팀', '투어팀', '탐험대', '모험단', '나들이팀', '휴가단', '드림팀', '베스트팀', '프렌즈'];
BEGIN
    RETURN prefixes[1 + floor(random() * array_length(prefixes, 1))] || ' ' || suffixes[1 + floor(random() * array_length(suffixes, 1))];
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION random_destination() RETURNS text AS $$
DECLARE
    destinations text[] := ARRAY['제주도', '부산', '강릉', '경주', '전주', '여수', '속초', '통영', '거제도', '남해', '서울', '대구', '광주', '대전', '울산'];
BEGIN
    RETURN destinations[1 + floor(random() * array_length(destinations, 1))];
END;
$$ LANGUAGE plpgsql;

-- Generate 500 bookings for PARTNER_TRAVEL (days 21-28 only)
INSERT INTO "Booking" (
    id,
    "bookingNumber",
    "companyCode",
    "customerName",
    "teamName",
    "teamType",
    "bookingType",
    origin,
    destination,
    "startDate",
    "endDate",
    "paxCount",
    nights,
    days,
    status,
    manager,
    representative,
    contact,
    email,
    "totalPrice",
    "depositAmount",
    currency,
    notes,
    memo,
    "createdAt",
    "updatedAt",
    "createdBy",
    version
)
SELECT
    'partner_' || row_number() OVER ()::text as id,
    'PTR-2025' || LPAD((row_number() OVER ())::text, 4, '0') as "bookingNumber",
    'PARTNER_TRAVEL' as "companyCode",
    random_korean_name() as "customerName",
    random_team_name() as "teamName",
    CASE (random() * 2)::int WHEN 0 THEN '일반' WHEN 1 THEN '학생' ELSE 'VIP' END as "teamType",
    CASE (random() * 3)::int WHEN 0 THEN 'PACKAGE' WHEN 1 THEN 'FIT' WHEN 2 THEN 'GROUP' ELSE 'BUSINESS' END::"BookingType" as "bookingType",
    '서울' as origin,
    random_destination() as destination,
    -- Using only days 21-28 to avoid month-end issues
    ('2025-' || LPAD(((((row_number() OVER () - 1) / 40) % 12) + 1)::text, 2, '0') || '-' || LPAD(((((row_number() OVER () - 1) % 40) % 8) + 21)::text, 2, '0'))::date as "startDate",
    (('2025-' || LPAD(((((row_number() OVER () - 1) / 40) % 12) + 1)::text, 2, '0') || '-' || LPAD(((((row_number() OVER () - 1) % 40) % 8) + 21)::text, 2, '0'))::date + interval '2 days')::date as "endDate",
    10 + (random() * 40)::int as "paxCount",
    2 as nights,
    3 as days,
    CASE (random() * 2)::int WHEN 0 THEN 'PENDING' WHEN 1 THEN 'CONFIRMED' ELSE 'CONFIRMED' END::"BookingStatus" as status,
    CASE (random() * 2)::int WHEN 0 THEN '최매니저' ELSE '강매니저' END as manager,
    random_korean_name() as representative,
    '010-' || LPAD(((random() * 8999 + 1000)::int)::text, 4, '0') || '-' || LPAD(((random() * 8999 + 1000)::int)::text, 4, '0') as contact,
    'partner' || row_number() OVER () || '@example.com' as email,
    1000000 + (random() * 4000000)::numeric as "totalPrice",
    (100000 + (random() * 400000))::numeric as "depositAmount",
    'KRW' as currency,
    '파트너 여행사 예약 #' || row_number() OVER () as notes,
    '테스트 데이터 - 파트너 여행사' as memo,
    NOW() - interval '10 days' + (random() * 20)::int * interval '1 day' as "createdAt",
    NOW() as "updatedAt",
    'partner_admin' as "createdBy", -- PARTNER_TRAVEL admin user
    1 as version
FROM generate_series(1, 500);

-- Clean up temporary functions
DROP FUNCTION IF EXISTS random_korean_name();
DROP FUNCTION IF EXISTS random_team_name();
DROP FUNCTION IF EXISTS random_destination();

-- Verify final distribution
SELECT 
    "companyCode",
    COUNT(*) as total_bookings,
    MIN(EXTRACT(DAY FROM "startDate")) as min_day,
    MAX(EXTRACT(DAY FROM "startDate")) as max_day,
    MIN(EXTRACT(MONTH FROM "startDate")) as min_month,
    MAX(EXTRACT(MONTH FROM "startDate")) as max_month
FROM "Booking"
WHERE "startDate" >= '2025-01-01'
GROUP BY "companyCode"
ORDER BY "companyCode";