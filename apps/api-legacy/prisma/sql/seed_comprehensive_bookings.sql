-- Comprehensive booking data generation with rich details
-- 50+ bookings per month for each company with flights, hotels, vehicles, and settlements

-- Function to generate random flight info
CREATE OR REPLACE FUNCTION generate_flight_info(departure_date DATE)
RETURNS JSONB AS $$
DECLARE
    airlines TEXT[] := ARRAY['KE', 'OZ', 'BX', '7C', 'LJ', 'TW', 'ZE'];
    airline_names TEXT[] := ARRAY['대한항공', '아시아나', '에어부산', '제주항공', '진에어', '티웨이', '이스타'];
    airports TEXT[] := ARRAY['ICN', 'GMP', 'PUS', 'CJU', 'NRT', 'KIX', 'PEK', 'PVG', 'HKG', 'SIN', 'BKK'];
    cities TEXT[] := ARRAY['서울', '부산', '제주', '도쿄', '오사카', '베이징', '상하이', '홍콩', '싱가포르', '방콕'];
    classes TEXT[] := ARRAY['이코노미', '비즈니스', '퍼스트'];
    airline_idx INT;
BEGIN
    airline_idx := floor(random() * array_length(airlines, 1) + 1)::int;
    
    RETURN jsonb_build_object(
        'airline', airlines[airline_idx],
        'airlineName', airline_names[airline_idx],
        'flightNumber', airlines[airline_idx] || lpad(floor(random() * 9999 + 1)::text, 4, '0'),
        'departure', jsonb_build_object(
            'airport', airports[floor(random() * 4 + 1)::int],
            'city', cities[floor(random() * 4 + 1)::int],
            'date', to_char(departure_date, 'YYYY-MM-DD'),
            'time', lpad(floor(random() * 24)::text, 2, '0') || ':' || lpad(floor(random() * 60)::text, 2, '0')
        ),
        'arrival', jsonb_build_object(
            'airport', airports[floor(random() * 7 + 5)::int],
            'city', cities[floor(random() * 7 + 5)::int],
            'date', to_char(departure_date + interval '1 day' * floor(random() * 2), 'YYYY-MM-DD'),
            'time', lpad(floor(random() * 24)::text, 2, '0') || ':' || lpad(floor(random() * 60)::text, 2, '0')
        ),
        'class', classes[floor(random() * 3 + 1)::int],
        'seatNumber', chr(65 + floor(random() * 6)::int) || floor(random() * 50 + 1)::text,
        'bookingReference', upper(substring(md5(random()::text) from 1 for 6)),
        'price', floor(random() * 2000000 + 200000),
        'baggage', jsonb_build_object(
            'checkedIn', floor(random() * 3)::text || '개',
            'weight', floor(random() * 30 + 10)::text || 'kg',
            'cabin', '1개 (10kg)'
        ),
        'meal', CASE WHEN random() > 0.5 THEN '포함' ELSE '미포함' END,
        'status', '확정'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate random hotel info
CREATE OR REPLACE FUNCTION generate_hotel_info(checkin_date DATE, nights INT)
RETURNS JSONB AS $$
DECLARE
    hotel_names TEXT[] := ARRAY['힐튼', '메리어트', '하얏트', '인터컨티넨탈', '쉐라톤', '웨스틴', '롯데호텔', '신라호텔', '파라다이스'];
    room_types TEXT[] := ARRAY['스탠다드', '디럭스', '스위트', '주니어 스위트', '이그제큐티브', '프레지덴셜'];
    bed_types TEXT[] := ARRAY['싱글', '더블', '트윈', '킹', '퀸'];
    cities TEXT[] := ARRAY['서울', '부산', '제주', '도쿄', '오사카', '베이징', '상하이', '홍콩', '싱가포르', '방콕'];
BEGIN
    RETURN jsonb_build_object(
        'hotelName', hotel_names[floor(random() * array_length(hotel_names, 1) + 1)::int] || ' ' || cities[floor(random() * array_length(cities, 1) + 1)::int],
        'address', cities[floor(random() * array_length(cities, 1) + 1)::int] || ' ' || floor(random() * 999 + 1)::text || '번지',
        'checkIn', to_char(checkin_date, 'YYYY-MM-DD'),
        'checkOut', to_char(checkin_date + interval '1 day' * nights, 'YYYY-MM-DD'),
        'nights', nights,
        'roomType', room_types[floor(random() * array_length(room_types, 1) + 1)::int],
        'bedType', bed_types[floor(random() * array_length(bed_types, 1) + 1)::int],
        'roomNumber', floor(random() * 3000 + 100)::text,
        'guests', jsonb_build_object(
            'adults', floor(random() * 3 + 1),
            'children', floor(random() * 2)
        ),
        'amenities', jsonb_build_array('WiFi', '조식', '피트니스', '수영장', '스파', '비즈니스센터'),
        'pricePerNight', floor(random() * 300000 + 100000),
        'totalPrice', floor(random() * 300000 + 100000) * nights,
        'bookingReference', upper(substring(md5(random()::text) from 1 for 8)),
        'status', '확정',
        'breakfast', CASE WHEN random() > 0.3 THEN '포함' ELSE '미포함' END,
        'cancellationPolicy', CASE WHEN random() > 0.5 THEN '무료 취소 가능' ELSE '취소 수수료 발생' END
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate random vehicle info
CREATE OR REPLACE FUNCTION generate_vehicle_info(rental_date DATE, days INT)
RETURNS JSONB AS $$
DECLARE
    car_types TEXT[] := ARRAY['소형', '중형', '대형', 'SUV', '럭셔리', '미니밴', '전기차'];
    car_models TEXT[] := ARRAY['아반떼', '소나타', '그랜저', '산타페', '팰리세이드', 'K3', 'K5', 'K8', '카니발', '테슬라 모델3'];
    rental_companies TEXT[] := ARRAY['롯데렌터카', 'SK렌터카', 'AJ렌터카', '쏘카', '그린카'];
    insurance_types TEXT[] := ARRAY['기본', '일반', '완전'];
BEGIN
    RETURN jsonb_build_object(
        'rentalCompany', rental_companies[floor(random() * array_length(rental_companies, 1) + 1)::int],
        'vehicleType', car_types[floor(random() * array_length(car_types, 1) + 1)::int],
        'model', car_models[floor(random() * array_length(car_models, 1) + 1)::int],
        'pickupLocation', '공항 렌터카 센터',
        'pickupDate', to_char(rental_date, 'YYYY-MM-DD'),
        'pickupTime', lpad(floor(random() * 24)::text, 2, '0') || ':' || lpad(floor(random() * 60)::text, 2, '0'),
        'returnLocation', '공항 렌터카 센터',
        'returnDate', to_char(rental_date + interval '1 day' * days, 'YYYY-MM-DD'),
        'returnTime', lpad(floor(random() * 24)::text, 2, '0') || ':' || lpad(floor(random() * 60)::text, 2, '0'),
        'rentalDays', days,
        'pricePerDay', floor(random() * 100000 + 50000),
        'totalPrice', floor(random() * 100000 + 50000) * days,
        'insurance', insurance_types[floor(random() * array_length(insurance_types, 1) + 1)::int],
        'additionalDriver', CASE WHEN random() > 0.7 THEN true ELSE false END,
        'gps', CASE WHEN random() > 0.5 THEN true ELSE false END,
        'childSeat', CASE WHEN random() > 0.8 THEN true ELSE false END,
        'fuel', '만땅 반납',
        'mileage', '무제한',
        'bookingReference', upper(substring(md5(random()::text) from 1 for 7)),
        'status', '확정'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate random insurance info
CREATE OR REPLACE FUNCTION generate_insurance_info(start_date DATE, days INT, traveler_count INT)
RETURNS JSONB AS $$
DECLARE
    insurance_companies TEXT[] := ARRAY['삼성화재', 'DB손해보험', '현대해상', 'KB손해보험', '메리츠화재'];
    coverage_types TEXT[] := ARRAY['기본형', '표준형', '고급형'];
BEGIN
    RETURN jsonb_build_object(
        'company', insurance_companies[floor(random() * array_length(insurance_companies, 1) + 1)::int],
        'policyNumber', 'POL-' || lpad(floor(random() * 999999 + 1)::text, 6, '0'),
        'coverageType', coverage_types[floor(random() * array_length(coverage_types, 1) + 1)::int],
        'startDate', to_char(start_date, 'YYYY-MM-DD'),
        'endDate', to_char(start_date + interval '1 day' * days, 'YYYY-MM-DD'),
        'travelers', traveler_count,
        'coverage', jsonb_build_object(
            'medical', floor(random() * 5000000 + 1000000),
            'baggage', floor(random() * 2000000 + 500000),
            'tripCancellation', floor(random() * 3000000 + 1000000),
            'personalLiability', floor(random() * 10000000 + 5000000)
        ),
        'premium', floor(random() * 50000 + 10000) * traveler_count,
        'status', '유효'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate comprehensive bookings for each company
CREATE OR REPLACE FUNCTION generate_comprehensive_bookings_for_company(
    p_company_code TEXT,
    p_day_start INT,
    p_day_end INT,
    p_year INT
)
RETURNS VOID AS $$
DECLARE
    v_month INT;
    v_day INT;
    v_booking_date DATE;
    v_booking_count INT;
    v_booking_id UUID;
    v_trip_type TEXT;
    v_destinations TEXT[] := ARRAY['도쿄', '오사카', '베이징', '상하이', '홍콩', '싱가포르', '방콕', '하노이', '자카르타', '쿠알라룸푸르', '타이베이', '마닐라'];
    v_purposes TEXT[] := ARRAY['미팅', '컨퍼런스', '전시회', '시장조사', '계약체결', '기술지원', '교육', '워크샵', '세미나', '고객방문'];
    v_departments TEXT[] := ARRAY['영업팀', '마케팅팀', '개발팀', '기획팀', '재무팀', '인사팀', '전략팀', '해외사업팀'];
    v_trip_duration INT;
    v_traveler_count INT;
    v_has_flight BOOLEAN;
    v_has_hotel BOOLEAN;
    v_has_vehicle BOOLEAN;
    v_has_insurance BOOLEAN;
    v_total_cost NUMERIC;
    v_flight_cost NUMERIC := 0;
    v_hotel_cost NUMERIC := 0;
    v_vehicle_cost NUMERIC := 0;
    v_insurance_cost NUMERIC := 0;
BEGIN
    -- Generate bookings for each month
    FOR v_month IN 1..12 LOOP
        -- Generate 50-70 bookings per month
        v_booking_count := floor(random() * 21 + 50)::int;
        
        FOR i IN 1..v_booking_count LOOP
            -- Select a random day within the company's range
            v_day := floor(random() * (p_day_end - p_day_start + 1) + p_day_start)::int;
            
            -- Handle month-end edge cases
            IF v_month IN (2) AND v_day > 28 THEN
                v_day := 28;
            ELSIF v_month IN (4, 6, 9, 11) AND v_day > 30 THEN
                v_day := 30;
            END IF;
            
            v_booking_date := make_date(p_year, v_month, v_day);
            v_booking_id := gen_random_uuid();
            
            -- Determine trip details
            v_trip_duration := floor(random() * 7 + 1)::int;
            v_traveler_count := floor(random() * 5 + 1)::int;
            
            -- Randomly determine what components this booking has
            v_has_flight := random() > 0.2;  -- 80% have flights
            v_has_hotel := random() > 0.3;   -- 70% have hotels
            v_has_vehicle := random() > 0.6; -- 40% have vehicles
            v_has_insurance := random() > 0.5; -- 50% have insurance
            
            -- Determine trip type
            IF v_has_flight AND v_has_hotel THEN
                v_trip_type := '해외출장';
            ELSIF v_has_flight THEN
                v_trip_type := '국내출장';
            ELSIF v_has_hotel THEN
                v_trip_type := '국내숙박';
            ELSE
                v_trip_type := '당일출장';
            END IF;
            
            -- Calculate costs
            IF v_has_flight THEN
                v_flight_cost := floor(random() * 2000000 + 200000) * v_traveler_count;
            END IF;
            IF v_has_hotel THEN
                v_hotel_cost := floor(random() * 300000 + 100000) * v_trip_duration;
            END IF;
            IF v_has_vehicle THEN
                v_vehicle_cost := floor(random() * 100000 + 50000) * v_trip_duration;
            END IF;
            IF v_has_insurance THEN
                v_insurance_cost := floor(random() * 50000 + 10000) * v_traveler_count;
            END IF;
            
            v_total_cost := v_flight_cost + v_hotel_cost + v_vehicle_cost + v_insurance_cost;
            
            -- Insert booking record with rich details
            INSERT INTO "Booking" (
                id,
                "companyCode",
                "bookingNumber",
                "customerName",
                "teamName",
                "bookingType",
                destination,
                "startDate",
                "endDate",
                "paxCount",
                nights,
                days,
                status,
                "totalPrice",
                "depositAmount",
                currency,
                "flightInfo",
                "hotelInfo",
                "insuranceInfo",
                notes,
                "createdAt",
                "updatedAt",
                "createdBy",
                "teamType",
                origin,
                manager,
                representative,
                contact,
                email,
                memo
            ) VALUES (
                v_booking_id,
                p_company_code,
                p_company_code || '-' || to_char(v_booking_date, 'YYYYMMDD') || '-' || lpad(i::text, 4, '0'),
                '홍길동' || floor(random() * 100 + 1)::text,
                v_departments[floor(random() * array_length(v_departments, 1) + 1)::int],
                CASE 
                    WHEN v_has_flight AND v_has_hotel THEN 'AIR_HOTEL'
                    WHEN v_has_flight THEN 'AIR'
                    WHEN v_has_hotel THEN 'HOTEL'
                    ELSE 'OTHER'
                END,
                v_destinations[floor(random() * array_length(v_destinations, 1) + 1)::int],
                v_booking_date,
                v_booking_date + interval '1 day' * v_trip_duration,
                v_traveler_count,
                v_trip_duration,
                v_trip_duration + 1,
                CASE 
                    WHEN v_booking_date < CURRENT_DATE THEN 'COMPLETED'
                    WHEN v_booking_date > CURRENT_DATE + interval '7 days' THEN 'CONFIRMED'
                    ELSE 'PENDING'
                END,
                v_total_cost,
                v_total_cost * 0.3,
                'KRW',
                CASE WHEN v_has_flight THEN generate_flight_info(v_booking_date) ELSE NULL END,
                CASE WHEN v_has_hotel THEN generate_hotel_info(v_booking_date, v_trip_duration) ELSE NULL END,
                CASE WHEN v_has_insurance THEN generate_insurance_info(v_booking_date, v_trip_duration, v_traveler_count) ELSE NULL END,
                v_purposes[floor(random() * array_length(v_purposes, 1) + 1)::int] || ' - ' ||
                CASE 
                    WHEN random() > 0.5 THEN '고객사 요청에 따른 일정 조정'
                    ELSE '정상 진행 예정'
                END,
                v_booking_date - interval '1 day' * floor(random() * 30 + 1),
                v_booking_date - interval '1 day' * floor(random() * 30 + 1),
                'system',
                'CORPORATE',
                '서울',
                CASE 
                    WHEN p_company_code = 'j1' THEN '김매니저'
                    WHEN p_company_code = 'ENTRIP_MAIN' THEN '이매니저'
                    ELSE '박매니저'
                END,
                '담당자' || floor(random() * 10 + 1)::text,
                '010-' || lpad(floor(random() * 10000)::text, 4, '0') || '-' || lpad(floor(random() * 10000)::text, 4, '0'),
                'user' || floor(random() * 100 + 1)::text || '@company.com',
                CASE 
                    WHEN random() > 0.7 THEN '특별 요청사항: VIP 고객'
                    WHEN random() > 0.5 THEN '비자 발급 진행 중'
                    ELSE NULL
                END
            );
            
            -- Transaction records require userId and accountId which we don't have, skipping
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clear existing test data
TRUNCATE TABLE "Transaction" CASCADE;
TRUNCATE TABLE "Booking" CASCADE;

-- Generate comprehensive bookings for each company
-- J1: days 1-10, 50+ bookings per month
SELECT generate_comprehensive_bookings_for_company('j1', 1, 10, 2024);
SELECT generate_comprehensive_bookings_for_company('j1', 1, 10, 2025);

-- ENTRIP_MAIN: days 11-20, 50+ bookings per month
SELECT generate_comprehensive_bookings_for_company('ENTRIP_MAIN', 11, 20, 2024);
SELECT generate_comprehensive_bookings_for_company('ENTRIP_MAIN', 11, 20, 2025);

-- PARTNER_TRAVEL: days 21-28, 50+ bookings per month
SELECT generate_comprehensive_bookings_for_company('PARTNER_TRAVEL', 21, 28, 2024);
SELECT generate_comprehensive_bookings_for_company('PARTNER_TRAVEL', 21, 28, 2025);

-- Accounts table has different structure, skipping account insertion

-- Verify the data generation
SELECT 
    "companyCode",
    EXTRACT(YEAR FROM "startDate") as year,
    EXTRACT(MONTH FROM "startDate") as month,
    COUNT(*) as booking_count,
    COUNT("flightInfo") as with_flight,
    COUNT("hotelInfo") as with_hotel,
    COUNT("insuranceInfo") as with_insurance,
    SUM("totalPrice") as total_price
FROM "Booking"
GROUP BY "companyCode", EXTRACT(YEAR FROM "startDate"), EXTRACT(MONTH FROM "startDate")
ORDER BY "companyCode", year, month;

-- Show sample of rich data
SELECT 
    "bookingNumber",
    "companyCode",
    destination,
    "customerName",
    "startDate",
    "paxCount",
    "totalPrice",
    "flightInfo"->>'airline' as airline,
    "hotelInfo"->>'hotelName' as hotel,
    "insuranceInfo"->>'company' as insurance
FROM "Booking"
WHERE "flightInfo" IS NOT NULL 
   OR "hotelInfo" IS NOT NULL 
   OR "insuranceInfo" IS NOT NULL
LIMIT 10;