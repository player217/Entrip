#!/usr/bin/env node

/**
 * 항공편 크롤링 API 연동 테스트 스크립트
 * 웹 애플리케이션에서의 API 호출을 시뮬레이션
 */

const CRAWLER_API_URL = process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:8001';

async function testAPIConnection() {
    console.log('🔍 항공편 크롤링 API 연동 테스트 시작');
    console.log(`📡 API Base URL: ${CRAWLER_API_URL}`);
    
    try {
        // 1. Health Check
        console.log('\n1️⃣ Health Check 테스트...');
        const healthResponse = await fetch(`${CRAWLER_API_URL}/health`);
        if (!healthResponse.ok) {
            throw new Error(`Health check failed: ${healthResponse.status}`);
        }
        const healthData = await healthResponse.json();
        console.log('✅ Health Check 성공:', healthData.status);
        console.log('📊 크롤링 상태:', healthData.crawl_status.last_schedule_status);
        
        // 2. PUS 공항 스케줄 조회
        console.log('\n2️⃣ PUS(김해공항) 스케줄 조회 테스트...');
        const pusResponse = await fetch(`${CRAWLER_API_URL}/api/schedule/PUS`);
        if (!pusResponse.ok) {
            throw new Error(`PUS schedule failed: ${pusResponse.status}`);
        }
        const pusData = await pusResponse.json();
        console.log('✅ PUS 스케줄 조회 성공');
        console.log(`📅 크롤링 시간: ${new Date(pusData.crawledAt).toLocaleString('ko-KR')}`);
        console.log(`✈️ 총 항공편 수: ${pusData.totalFlights}개`);
        
        // 도착지별 항공편 수 집계
        const destinations = {};
        pusData.flights.forEach(flight => {
            const dest = flight.destination;
            destinations[dest] = (destinations[dest] || 0) + 1;
        });
        
        console.log('🎯 도착지별 항공편:');
        Object.entries(destinations).forEach(([dest, count]) => {
            console.log(`   ${dest}: ${count}편`);
        });
        
        // 3. ICN 공항 스케줄 조회
        console.log('\n3️⃣ ICN(인천공항) 스케줄 조회 테스트...');
        const icnResponse = await fetch(`${CRAWLER_API_URL}/api/schedule/ICN`);
        if (!icnResponse.ok) {
            throw new Error(`ICN schedule failed: ${icnResponse.status}`);
        }
        const icnData = await icnResponse.json();
        console.log('✅ ICN 스케줄 조회 성공');
        console.log(`✈️ 총 항공편 수: ${icnData.flights.length}개`);
        
        // 4. 지원 공항 목록 조회
        console.log('\n4️⃣ 지원 공항 목록 조회 테스트...');
        const airportsResponse = await fetch(`${CRAWLER_API_URL}/api/airports`);
        if (!airportsResponse.ok) {
            throw new Error(`Airports list failed: ${airportsResponse.status}`);
        }
        const airportsData = await airportsResponse.json();
        console.log('✅ 공항 목록 조회 성공');
        console.log(`🏢 지원 공항 수: ${airportsData.total}개`);
        console.log('🏢 지원 공항:', airportsData.airports.join(', '));
        
        console.log('\n🎉 모든 API 연동 테스트 완료! 웹 애플리케이션과 크롤링 API 연동이 정상적으로 작동합니다.');
        
        return {
            success: true,
            pusFlights: pusData.totalFlights,
            icnFlights: icnData.flights.length,
            totalAirports: airportsData.total
        };
        
    } catch (error) {
        console.error('❌ API 연동 테스트 실패:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 프론트엔드 시뮬레이션: 사용자가 PUS->NRT 노선을 선택했을 때의 동작
async function simulateFrontendFlow() {
    console.log('\n🖥️ 프론트엔드 사용자 시나리오 시뮬레이션');
    console.log('시나리오: 사용자가 PUS(김해공항)를 선택하고 NRT(나리타) 노선을 조회');
    
    try {
        // 1. 사용자가 출발지로 PUS 선택
        console.log('\n👤 사용자: 출발지로 PUS(김해공항) 선택');
        const scheduleResponse = await fetch(`${CRAWLER_API_URL}/api/schedule/PUS`);
        const scheduleData = await scheduleResponse.json();
        
        // 2. 시스템이 도착지 목록 추출
        const destinations = new Set();
        scheduleData.flights.forEach(flight => {
            const destCode = flight.destination.split(' ')[0].trim();
            if (destCode.length === 3) {
                destinations.add(destCode);
            }
        });
        
        console.log('🔍 시스템: 사용 가능한 도착지 추출 완료');
        console.log('📍 사용 가능한 도착지:', Array.from(destinations).sort().join(', '));
        
        // 3. 사용자가 NRT 선택
        if (destinations.has('NRT')) {
            console.log('\n👤 사용자: 도착지로 NRT(나리타) 선택');
            
            // 4. 시스템이 해당 노선 항공편 필터링
            const nrtFlights = scheduleData.flights.filter(flight => 
                flight.destination.startsWith('NRT')
            );
            
            console.log('✅ 시스템: NRT 노선 항공편 조회 완료');
            console.log(`✈️ PUS→NRT 노선 항공편: ${nrtFlights.length}편`);
            
            nrtFlights.forEach((flight, index) => {
                console.log(`   ${index + 1}. ${flight.airline} ${flight.flightNo} (${flight.departureTime}→${flight.arrivalTime})`);
            });
            
            console.log('\n🎯 프론트엔드 시뮬레이션 완료: 사용자에게 정확한 항공편 정보가 제공되었습니다!');
            
        } else {
            console.log('❌ NRT 노선을 찾을 수 없습니다.');
        }
        
    } catch (error) {
        console.error('❌ 프론트엔드 시뮬레이션 실패:', error.message);
    }
}

// 실행
async function main() {
    const result = await testAPIConnection();
    
    if (result.success) {
        await simulateFrontendFlow();
        
        console.log('\n📋 테스트 요약:');
        console.log(`✅ API 서버: 정상 작동`);
        console.log(`✅ PUS 공항: ${result.pusFlights}개 항공편 제공`);
        console.log(`✅ ICN 공항: ${result.icnFlights}개 항공편 제공`);
        console.log(`✅ 지원 공항: ${result.totalAirports}개`);
        console.log(`✅ 웹 애플리케이션 연동: 정상`);
        
        process.exit(0);
    } else {
        console.log('\n📋 테스트 실패 요약:');
        console.log(`❌ 오류: ${result.error}`);
        console.log('💡 확인 사항:');
        console.log('   1. 크롤링 API 서버가 http://localhost:8001 에서 실행 중인지 확인');
        console.log('   2. Docker 컨테이너가 정상 실행 중인지 확인');
        console.log('   3. 네트워크 연결 상태 확인');
        
        process.exit(1);
    }
}

main();