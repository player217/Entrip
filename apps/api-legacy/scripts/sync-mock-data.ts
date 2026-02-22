#!/usr/bin/env ts-node

/**
 * D1-D3: DB/Mock 데이터 단일 소스화
 * 데이터 동기화 스크립트 - seed.ts를 마스터로 mock-users.json 자동 생성
 * 
 * Purpose: seed.ts의 데이터 정의를 기반으로 mock-users.json을 자동 생성하여
 * 단일 소스 진실(SSOT)을 구현하고 데이터 일관성을 보장합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

// Constants from seed.ts
const DEMO_PASSWORD = 'pass1234';
const COMPANIES = [
  { code: 'ENTRIP_MAIN', name: '엔트립 본사' },
  { code: 'j1', name: 'J1 여행사' },
  { code: 'star', name: '스타투어' },
  { code: 'happy', name: '해피트래블' }
];

interface CompanyData {
  code: string;
  name: string;
  logo: string;
  isActive: boolean;
  settings: {
    maxUsers: number;
    features: string[];
  };
}

interface UserData {
  id: string;
  companyCode: string;
  username: string;
  email: string;
  name: string;
  role: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
  passwordHash: string;
}

interface MockData {
  companies: CompanyData[];
  users: UserData[];
}

/**
 * 회사별 기본 설정을 생성합니다.
 */
function generateCompanySettings(companyCode: string): CompanyData['settings'] {
  const baseFeatures = ['booking', 'calendar'];
  const extendedFeatures = [...baseFeatures, 'reports'];
  const premiumFeatures = [...extendedFeatures, 'messenger'];

  switch (companyCode) {
    case 'ENTRIP_MAIN':
      return {
        maxUsers: 100,
        features: premiumFeatures
      };
    case 'j1':
      return {
        maxUsers: 50,
        features: premiumFeatures
      };
    case 'star':
      return {
        maxUsers: 50,
        features: extendedFeatures
      };
    case 'happy':
      return {
        maxUsers: 30,
        features: baseFeatures
      };
    default:
      return {
        maxUsers: 30,
        features: baseFeatures
      };
  }
}

/**
 * seed.ts와 동일한 로직으로 사용자를 생성합니다.
 */
async function generateUserData(): Promise<UserData[]> {
  const users: UserData[] = [];
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  
  let globalUserCounter = 1;

  for (const company of COMPANIES) {
    console.log(`  Generating users for ${company.name} (${company.code})...`);
    
    // Admin account for each company
    const adminId = `${company.code.toLowerCase()}-admin`;
    const adminEmail = `admin@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`;
    
    users.push({
      id: adminId,
      companyCode: company.code,
      username: adminEmail,
      email: adminEmail,
      name: `${company.name} 관리자`,
      role: 'ADMIN',
      department: '경영지원팀',
      isActive: true,
      createdAt: '2025-01-01T09:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      passwordHash: hashedPassword
    });
    
    // Manager accounts for each company
    const managers = [
      { name: '김민수', department: '영업1팀' },
      { name: '이지영', department: '영업2팀' }
    ];
    
    managers.forEach((manager, index) => {
      const managerId = `${company.code.toLowerCase()}-manager${index + 1}`;
      const managerEmail = `manager${index + 1}@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`;
      
      users.push({
        id: managerId,
        companyCode: company.code,
        username: managerEmail,
        email: managerEmail,
        name: `${company.name} ${manager.name}`,
        role: 'MANAGER',
        department: manager.department,
        isActive: true,
        createdAt: '2025-01-01T09:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        passwordHash: hashedPassword
      });
    });
    
    // Regular users for each company
    const regularUsers = [
      { name: '박준혁', department: '영업1팀' },
      { name: '최서연', department: '영업2팀' },
      { name: '정태호', department: '마케팅팀' }
    ];
    
    regularUsers.forEach((user, index) => {
      const userId = `${company.code.toLowerCase()}-user${index + 1}`;
      const userEmail = `user${index + 1}@${company.code === 'ENTRIP_MAIN' ? 'entrip' : company.code}.com`;
      
      users.push({
        id: userId,
        companyCode: company.code,
        username: userEmail,
        email: userEmail,
        name: `${company.name} ${user.name}`,
        role: 'USER',
        department: user.department,
        isActive: true,
        createdAt: '2025-01-01T09:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        passwordHash: hashedPassword
      });
    });
  }

  return users;
}

/**
 * 회사 데이터를 생성합니다.
 */
function generateCompanyData(): CompanyData[] {
  return COMPANIES.map(company => ({
    code: company.code,
    name: company.name,
    logo: `/images/companies/${company.code.toLowerCase()}-logo.png`,
    isActive: true,
    settings: generateCompanySettings(company.code)
  }));
}

/**
 * 생성된 데이터를 검증합니다.
 */
function validateGeneratedData(mockData: MockData): void {
  console.log('\n🔍 Validating generated data...');
  
  // 회사 수 검증
  if (mockData.companies.length !== COMPANIES.length) {
    throw new Error(`Company count mismatch: expected ${COMPANIES.length}, got ${mockData.companies.length}`);
  }
  
  // 각 회사별 사용자 수 검증 (관리자 1 + 매니저 2 + 사용자 3 = 6명)
  const expectedUsersPerCompany = 6;
  for (const company of COMPANIES) {
    const companyUsers = mockData.users.filter(u => u.companyCode === company.code);
    if (companyUsers.length !== expectedUsersPerCompany) {
      throw new Error(
        `User count mismatch for ${company.code}: expected ${expectedUsersPerCompany}, got ${companyUsers.length}`
      );
    }
    
    // 역할별 사용자 수 검증
    const adminCount = companyUsers.filter(u => u.role === 'ADMIN').length;
    const managerCount = companyUsers.filter(u => u.role === 'MANAGER').length;
    const userCount = companyUsers.filter(u => u.role === 'USER').length;
    
    if (adminCount !== 1 || managerCount !== 2 || userCount !== 3) {
      throw new Error(
        `Role distribution error for ${company.code}: ` +
        `ADMIN=${adminCount} (expected 1), MANAGER=${managerCount} (expected 2), USER=${userCount} (expected 3)`
      );
    }
  }
  
  // 이메일 유니크 검증
  const emails = mockData.users.map(u => u.email);
  const uniqueEmails = new Set(emails);
  if (emails.length !== uniqueEmails.size) {
    throw new Error('Duplicate emails found in generated data');
  }
  
  console.log('✅ Data validation passed');
  console.log(`  - Companies: ${mockData.companies.length}`);
  console.log(`  - Users: ${mockData.users.length} (${mockData.users.length / mockData.companies.length} per company)`);
}

/**
 * 메인 동기화 함수
 */
async function syncMockData(): Promise<void> {
  console.log('🔄 Starting DB/Mock data synchronization...\n');
  
  try {
    // 1. 데이터 생성
    console.log('📊 Generating mock data from seed definitions...');
    const companies = generateCompanyData();
    const users = await generateUserData();
    
    const mockData: MockData = {
      companies,
      users
    };
    
    // 2. 데이터 검증
    validateGeneratedData(mockData);
    
    // 3. JSON 파일 생성
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'mock-users.json');
    const formattedJson = JSON.stringify(mockData, null, 2);
    
    fs.writeFileSync(outputPath, formattedJson, 'utf8');
    
    console.log(`\n✅ Mock data synchronization completed successfully!`);
    console.log(`📁 Generated file: ${outputPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Companies: ${mockData.companies.length}`);
    console.log(`   - Total Users: ${mockData.users.length}`);
    
    // 회사별 사용자 수 출력
    for (const company of COMPANIES) {
      const companyUsers = mockData.users.filter(u => u.companyCode === company.code);
      console.log(`   - ${company.name} (${company.code}): ${companyUsers.length} users`);
    }
    
  } catch (error) {
    console.error('❌ Mock data synchronization failed:', error);
    process.exit(1);
  }
}

/**
 * 스크립트가 직접 실행될 때만 동기화 수행
 */
if (require.main === module) {
  syncMockData();
}

export { syncMockData, generateUserData, generateCompanyData, validateGeneratedData };