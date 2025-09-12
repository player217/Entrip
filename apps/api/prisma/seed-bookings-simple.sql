-- Direct SQL seed for September 2025 bookings
-- Bypassing Prisma client to avoid schema mismatches

-- Function to generate random booking data
DO $$
DECLARE
    company_codes TEXT[] := ARRAY['J1', 'HAPPY', 'STAR', 'ENTRIP_MAIN'];
    company_code TEXT;
    i INTEGER;
    j INTEGER;
    start_date DATE;
    end_date DATE;
    nights INTEGER;
    days INTEGER;
    team_size INTEGER;
    total_cost DECIMAL;
    booking_status TEXT;
    user_id TEXT;
    team_names TEXT[];
    customer_names TEXT[];
    destinations TEXT[];
    managers TEXT[];
    user_ids TEXT[];
BEGIN
    -- Loop through each company
    FOREACH company_code IN ARRAY company_codes
    LOOP
        -- Set company-specific data
        CASE company_code
            WHEN 'J1' THEN
                team_names := ARRAY['영업팀', '개발팀', '마케팅팀', '인사팀', '재무팀'];
                customer_names := ARRAY['삼성전자', 'LG전자', '현대자동차', 'SK하이닉스', '네이버', '카카오'];
                destinations := ARRAY['서울', '부산', '제주', '강릉', '경주', '전주', '여수'];
                managers := ARRAY['J1 관리자', 'J1 매니저1', 'J1 일반사용자'];
                user_ids := ARRAY['j1_admin_001', 'j1_manager_001', 'j1_user_001'];
            WHEN 'HAPPY' THEN
                team_names := ARRAY['고객지원팀', '영업팀', '기획팀', '디자인팀', '운영팀'];
                customer_names := ARRAY['현대백화점', '롯데백화점', '신세계', 'CJ그룹', '포스코'];
                destinations := ARRAY['서울', '제주', '부산', '경주', '속초', '가평'];
                managers := ARRAY['HAPPY 관리자', 'HAPPY 매니저'];
                user_ids := ARRAY['happy_admin_001', 'happy_manager_001'];
            WHEN 'STAR' THEN
                team_names := ARRAY['제작팀', '연출팀', '마케팅팀', '홍보팀', 'A&R팀'];
                customer_names := ARRAY['YG엔터', 'SM엔터', 'JYP엔터', 'HYBE', '안테나'];
                destinations := ARRAY['서울', '제주', '부산', '강릉', '파주', '남양주'];
                managers := ARRAY['STAR 관리자', 'STAR 매니저'];
                user_ids := ARRAY['star_admin_001', 'star_manager_001'];
            WHEN 'ENTRIP_MAIN' THEN
                team_names := ARRAY['플랫폼개발팀', '비즈니스팀', '운영팀', '고객성공팀', '데이터팀'];
                customer_names := ARRAY['내부행사', '파트너사', '협력업체', 'B2B고객사', '투자사'];
                destinations := ARRAY['서울', '판교', '강남', '을지로', '성수', '한남', '제주'];
                managers := ARRAY['ENTRIP 관리자', 'ENTRIP 매니저1', 'ENTRIP 운영자'];
                user_ids := ARRAY['entrip_admin_001', 'entrip_manager_001', 'entrip_operator_001'];
        END CASE;
        
        -- Create 300 bookings for each company
        FOR i IN 1..300 LOOP
            -- Generate random dates in September 2025
            start_date := DATE '2025-09-01' + INTERVAL '1 day' * (RANDOM() * 29)::INTEGER;
            nights := (ARRAY[0, 1, 2, 3, 4])[1 + (RANDOM() * 4)::INTEGER]; -- 0-4 nights
            days := nights + 1;
            end_date := start_date + INTERVAL '1 day' * nights;
            
            -- Generate random team size and cost
            team_size := 5 + (RANDOM() * 45)::INTEGER; -- 5-50 people
            total_cost := (100000 + RANDOM() * 400000) * team_size * days; -- 100k-500k per person per day
            
            -- Random status (70% CONFIRMED, 20% PENDING, 10% CANCELLED)
            booking_status := CASE 
                WHEN RANDOM() < 0.7 THEN 'CONFIRMED'
                WHEN RANDOM() < 0.9 THEN 'PENDING'
                ELSE 'CANCELLED'
            END;
            
            -- Random user assignment
            user_id := user_ids[1 + (RANDOM() * (ARRAY_LENGTH(user_ids, 1) - 1))::INTEGER];
            
            -- Insert booking
            INSERT INTO "Booking" (
                id, "bookingNumber", "companyCode", "customerName", "teamName", 
                "teamType", type, origin, destination, "startDate", "endDate",
                "paxCount", nights, days, status, manager, coordinator,
                representative, contact, email, "totalPrice", "depositAmount",
                currency, notes, memo, "createdAt", "updatedAt", version,
                "userId", "createdBy"
            ) VALUES (
                company_code || '_booking_' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '_' || i,
                company_code || '-2025-09-' || LPAD(i::TEXT, 4, '0'),
                company_code,
                customer_names[1 + (RANDOM() * (ARRAY_LENGTH(customer_names, 1) - 1))::INTEGER],
                team_names[1 + (RANDOM() * (ARRAY_LENGTH(team_names, 1) - 1))::INTEGER],
                'GROUP',
                'PACKAGE',
                '서울',
                destinations[1 + (RANDOM() * (ARRAY_LENGTH(destinations, 1) - 1))::INTEGER],
                start_date + TIME '14:00:00', -- 2PM start
                end_date + TIME '11:00:00',   -- 11AM end
                team_size,
                nights,
                days,
                booking_status::text,
                managers[1 + (RANDOM() * (ARRAY_LENGTH(managers, 1) - 1))::INTEGER],
                managers[1 + (RANDOM() * (ARRAY_LENGTH(managers, 1) - 1))::INTEGER],
                'Representative ' || i,
                '010-' || LPAD((1000 + RANDOM() * 8999)::INTEGER::TEXT, 4, '0') || '-' || LPAD((1000 + RANDOM() * 8999)::INTEGER::TEXT, 4, '0'),
                'customer' || i || '@' || LOWER(company_code) || '.com',
                ROUND(total_cost, 0),
                CASE WHEN booking_status = 'CONFIRMED' THEN ROUND(total_cost * 0.3, 0) ELSE NULL END,
                'KRW',
                CASE WHEN RANDOM() < 0.3 THEN 'Special requirements noted' ELSE NULL END,
                CASE WHEN RANDOM() < 0.2 THEN 'Internal memo: ' || 'Memo for booking ' || i ELSE NULL END,
                NOW() - INTERVAL '1 month' * RANDOM(), -- Created in the past month
                NOW(),
                1,
                user_id,
                user_id
            );
            
            -- Progress indicator every 50 bookings
            IF i % 50 = 0 THEN
                RAISE NOTICE 'Created % bookings for %', i, company_code;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Completed 300 bookings for %', company_code;
    END LOOP;
    
    -- Final summary
    RAISE NOTICE 'Total bookings created: %', 
        (SELECT COUNT(*) FROM "Booking" WHERE "startDate" >= '2025-09-01' AND "startDate" < '2025-10-01');
END $$;