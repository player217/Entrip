/**
 * API 계약 테스트
 * v1과 v2 API가 동일한 인터페이스를 제공하는지 검증
 */

describe('Auth API Contract Tests', () => {
  const testCases = [
    { name: 'v1 API', baseUrl: 'http://localhost:4001' },
    { name: 'v2 API', baseUrl: 'http://localhost:4002' }
  ];

  // 테스트 사용자 정보
  const testUser = {
    companyCode: 'J1',
    username: 'admin@j1.com',
    password: 'pass1234'
  };

  testCases.forEach(({ name, baseUrl }) => {
    describe(`${name} - Login Contract`, () => {
      test('POST /api/auth/login - Success Response Structure', async () => {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testUser)
        });

        // 응답 상태 확인
        expect(response.status).toBe(200);

        // 응답 본문 파싱
        const data = await response.json();

        // 응답 구조 검증
        expect(data).toMatchObject({
          success: true,
          message: expect.stringContaining('로그인'),
          user: {
            id: expect.any(String),
            companyCode: testUser.companyCode,
            username: testUser.username,
            email: testUser.username,
            name: expect.any(String),
            role: expect.stringMatching(/^(ADMIN|MANAGER|USER)$/),
            isActive: true,
            createdAt: expect.any(String)
          }
        });

        // 쿠키 검증
        const setCookie = response.headers.get('set-cookie');
        expect(setCookie).toContain('auth-token');
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('SameSite=Lax');
      });

      test('POST /api/auth/login - Error Response Structure', async () => {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            companyCode: 'J1',
            username: 'nonexistent@j1.com',
            password: 'wrongpassword'
          })
        });

        // 응답 상태 확인 (401 Unauthorized)
        expect(response.status).toBe(401);

        // 응답 본문 파싱
        const data = await response.json();

        // 에러 응답 구조 검증
        expect(data).toMatchObject({
          success: false,
          message: expect.any(String)
        });
      });

      test('POST /api/auth/login - Missing Fields Response', async () => {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'admin@j1.com'
            // companyCode와 password 누락
          })
        });

        // 응답 상태 확인 (400 Bad Request)
        expect(response.status).toBe(400);

        // 응답 본문 파싱
        const data = await response.json();

        // 에러 응답 구조 검증
        expect(data).toMatchObject({
          success: false,
          message: expect.stringContaining('모두 입력')
        });
      });
    });

    describe(`${name} - Health Check Contract`, () => {
      test('GET /api/health - Response Structure', async () => {
        const response = await fetch(`${baseUrl}/api/health`);

        expect(response.status).toBe(200);

        const data = await response.json();

        expect(data).toMatchObject({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        });
      });
    });

    describe(`${name} - Metrics Contract`, () => {
      test('GET /api/metrics - Response Structure', async () => {
        const response = await fetch(`${baseUrl}/api/v2/metrics`);

        // v1은 메트릭이 없을 수 있음
        if (response.status === 404 && name === 'v1 API') {
          expect(true).toBe(true);
          return;
        }

        expect(response.status).toBe(200);

        const data = await response.json();

        expect(data).toMatchObject({
          success: true,
          data: {
            timestamp: expect.any(String),
            uptime: expect.any(Object),
            memory: expect.any(Object)
          }
        });
      });

      test('GET /api/metrics/prometheus - Response Format', async () => {
        const response = await fetch(`${baseUrl}/api/v2/metrics/prometheus`);

        // v1은 Prometheus 메트릭이 없을 수 있음
        if (response.status === 404 && name === 'v1 API') {
          expect(true).toBe(true);
          return;
        }

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/plain');

        const text = await response.text();
        expect(text).toContain('# HELP');
        expect(text).toContain('# TYPE');
      });
    });
  });

  describe('Contract Comparison', () => {
    test('v1 and v2 produce identical login responses', async () => {
      // v1 로그인
      const v1Response = await fetch(`http://localhost:4001/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      const v1Data = await v1Response.json();

      // v2 로그인
      const v2Response = await fetch(`http://localhost:4002/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      const v2Data = await v2Response.json();

      // 구조 비교 (ID와 타임스탬프는 제외)
      expect(v1Data.success).toBe(v2Data.success);
      expect(v1Data.message).toBe(v2Data.message);
      expect(v1Data.user.companyCode).toBe(v2Data.user.companyCode);
      expect(v1Data.user.username).toBe(v2Data.user.username);
      expect(v1Data.user.role).toBe(v2Data.user.role);
    });
  });
});