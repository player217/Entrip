#!/usr/bin/env ts-node

/**
 * D1-D3: DB/Mock 데이터 단일 소스화
 * 데이터 일관성 검증 스크립트
 * 
 * Purpose: seed.ts와 mock-users.json 간의 데이터 일관성을 검증하고
 * 불일치 발견 시 빌드를 실패시켜 품질 게이트 역할을 수행합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateUserData, generateCompanyData } from './sync-mock-data';

// 색상 출력을 위한 ANSI 코드
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

interface MockData {
  companies: any[];
  users: any[];
}

/**
 * mock-users.json 파일을 로드합니다.
 */
function loadMockData(): MockData {
  const mockDataPath = path.join(__dirname, '..', 'src', 'data', 'mock-users.json');
  
  if (!fs.existsSync(mockDataPath)) {
    throw new Error(`Mock data file not found: ${mockDataPath}`);
  }
  
  const rawData = fs.readFileSync(mockDataPath, 'utf8');
  return JSON.parse(rawData);
}

/**
 * 두 배열을 비교하여 차이점을 찾습니다.
 */
function findArrayDifferences<T>(
  expected: T[],
  actual: T[],
  keyExtractor: (item: T) => string,
  itemName: string
): string[] {
  const errors: string[] = [];
  
  const expectedKeys = new Set(expected.map(keyExtractor));
  const actualKeys = new Set(actual.map(keyExtractor));
  
  // 누락된 항목 확인
  for (const key of expectedKeys) {
    if (!actualKeys.has(key)) {
      errors.push(`Missing ${itemName}: ${key}`);
    }
  }
  
  // 추가된 항목 확인
  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      errors.push(`Extra ${itemName}: ${key}`);
    }
  }
  
  return errors;
}

/**
 * 회사 데이터 일관성을 검증합니다.
 */
function validateCompanies(expected: any[], actual: any[]): string[] {
  const errors: string[] = [];
  
  // 회사 수 검증
  if (expected.length !== actual.length) {
    errors.push(`Company count mismatch: expected ${expected.length}, got ${actual.length}`);
  }
  
  // 회사별 상세 검증
  const companyErrors = findArrayDifferences(
    expected,
    actual,
    (company) => company.code,
    'company'
  );
  errors.push(...companyErrors);
  
  // 각 회사의 속성 검증
  for (const expectedCompany of expected) {
    const actualCompany = actual.find(c => c.code === expectedCompany.code);
    if (actualCompany) {
      if (expectedCompany.name !== actualCompany.name) {
        errors.push(`Company name mismatch for ${expectedCompany.code}: expected "${expectedCompany.name}", got "${actualCompany.name}"`);
      }
      
      if (expectedCompany.isActive !== actualCompany.isActive) {
        errors.push(`Company active status mismatch for ${expectedCompany.code}`);
      }
    }
  }
  
  return errors;
}

/**
 * 사용자 데이터 일관성을 검증합니다.
 */
function validateUsers(expected: any[], actual: any[]): string[] {
  const errors: string[] = [];
  
  // 사용자 수 검증
  if (expected.length !== actual.length) {
    errors.push(`User count mismatch: expected ${expected.length}, got ${actual.length}`);
  }
  
  // 사용자별 상세 검증
  const userErrors = findArrayDifferences(
    expected,
    actual,
    (user) => user.email,
    'user'
  );
  errors.push(...userErrors);
  
  // 회사별 사용자 수 검증
  const companies = ['ENTRIP_MAIN', 'j1', 'star', 'happy'];
  for (const company of companies) {
    const expectedCompanyUsers = expected.filter(u => u.companyCode === company);
    const actualCompanyUsers = actual.filter(u => u.companyCode === company);
    
    if (expectedCompanyUsers.length !== actualCompanyUsers.length) {
      errors.push(
        `User count mismatch for ${company}: expected ${expectedCompanyUsers.length}, got ${actualCompanyUsers.length}`
      );
    }
    
    // 역할별 사용자 수 검증
    const roles = ['ADMIN', 'MANAGER', 'USER'];
    for (const role of roles) {
      const expectedRoleCount = expectedCompanyUsers.filter(u => u.role === role).length;
      const actualRoleCount = actualCompanyUsers.filter(u => u.role === role).length;
      
      if (expectedRoleCount !== actualRoleCount) {
        errors.push(
          `${role} count mismatch for ${company}: expected ${expectedRoleCount}, got ${actualRoleCount}`
        );
      }
    }
  }
  
  // 각 사용자의 속성 검증
  for (const expectedUser of expected) {
    const actualUser = actual.find(u => u.email === expectedUser.email);
    if (actualUser) {
      const fieldsToCheck = ['name', 'role', 'department', 'companyCode', 'isActive'];
      
      for (const field of fieldsToCheck) {
        if (expectedUser[field] !== actualUser[field]) {
          errors.push(
            `User ${field} mismatch for ${expectedUser.email}: expected "${expectedUser[field]}", got "${actualUser[field]}"`
          );
        }
      }
    }
  }
  
  return errors;
}

/**
 * 비즈니스 규칙을 검증합니다.
 */
function validateBusinessRules(mockData: MockData): string[] {
  const errors: string[] = [];
  
  // 각 회사는 최소 1명의 관리자가 있어야 함
  for (const company of mockData.companies) {
    const admins = mockData.users.filter(u => 
      u.companyCode === company.code && u.role === 'ADMIN'
    );
    
    if (admins.length === 0) {
      errors.push(`Company ${company.code} has no admin users`);
    } else if (admins.length > 1) {
      errors.push(`Company ${company.code} has multiple admin users (${admins.length})`);
    }
  }
  
  // 이메일 유니크 검증
  const emails = mockData.users.map(u => u.email);
  const uniqueEmails = new Set(emails);
  if (emails.length !== uniqueEmails.size) {
    errors.push(`Duplicate emails found: ${emails.length - uniqueEmails.size} duplicates`);
  }
  
  // 사용자 ID 유니크 검증
  const userIds = mockData.users.map(u => u.id);
  const uniqueUserIds = new Set(userIds);
  if (userIds.length !== uniqueUserIds.size) {
    errors.push(`Duplicate user IDs found: ${userIds.length - uniqueUserIds.size} duplicates`);
  }
  
  return errors;
}

/**
 * JSON 구조 유효성을 검증합니다.
 */
function validateJsonStructure(mockData: any): string[] {
  const errors: string[] = [];
  
  // 필수 최상위 키 확인
  if (!mockData.companies || !Array.isArray(mockData.companies)) {
    errors.push('Missing or invalid "companies" array');
  }
  
  if (!mockData.users || !Array.isArray(mockData.users)) {
    errors.push('Missing or invalid "users" array');
  }
  
  // 회사 객체 구조 검증
  if (mockData.companies) {
    mockData.companies.forEach((company: any, index: number) => {
      const requiredFields = ['code', 'name', 'logo', 'isActive', 'settings'];
      
      for (const field of requiredFields) {
        if (!(field in company)) {
          errors.push(`Company[${index}] missing required field: ${field}`);
        }
      }
      
      if (company.settings) {
        const requiredSettingsFields = ['maxUsers', 'features'];
        for (const field of requiredSettingsFields) {
          if (!(field in company.settings)) {
            errors.push(`Company[${index}].settings missing required field: ${field}`);
          }
        }
      }
    });
  }
  
  // 사용자 객체 구조 검증
  if (mockData.users) {
    mockData.users.forEach((user: any, index: number) => {
      const requiredFields = [
        'id', 'companyCode', 'username', 'email', 'name', 
        'role', 'department', 'isActive', 'createdAt', 'lastLoginAt', 'passwordHash'
      ];
      
      for (const field of requiredFields) {
        if (!(field in user)) {
          errors.push(`User[${index}] missing required field: ${field}`);
        }
      }
    });
  }
  
  return errors;
}

/**
 * 데이터 일관성을 종합적으로 검증합니다.
 */
async function validateDataConsistency(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: false,
    errors: [],
    warnings: [],
    summary: {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0
    }
  };
  
  console.log(`${colors.cyan}🔍 Starting data consistency validation...${colors.reset}\n`);
  
  try {
    // 1. Mock 데이터 로드
    console.log('📁 Loading mock data...');
    const mockData = loadMockData();
    result.summary.totalChecks++;
    result.summary.passedChecks++;
    console.log(`${colors.green}✅ Mock data loaded successfully${colors.reset}`);
    
    // 2. 기대 데이터 생성
    console.log('🏭 Generating expected data from seed definitions...');
    const expectedCompanies = generateCompanyData();
    const expectedUsers = await generateUserData();
    result.summary.totalChecks++;
    result.summary.passedChecks++;
    console.log(`${colors.green}✅ Expected data generated successfully${colors.reset}`);
    
    // 3. JSON 구조 검증
    console.log('📋 Validating JSON structure...');
    const structureErrors = validateJsonStructure(mockData);
    result.errors.push(...structureErrors);
    result.summary.totalChecks++;
    if (structureErrors.length === 0) {
      result.summary.passedChecks++;
      console.log(`${colors.green}✅ JSON structure validation passed${colors.reset}`);
    } else {
      result.summary.failedChecks++;
      console.log(`${colors.red}❌ JSON structure validation failed${colors.reset}`);
    }
    
    // 4. 회사 데이터 검증
    console.log('🏢 Validating company data...');
    const companyErrors = validateCompanies(expectedCompanies, mockData.companies);
    result.errors.push(...companyErrors);
    result.summary.totalChecks++;
    if (companyErrors.length === 0) {
      result.summary.passedChecks++;
      console.log(`${colors.green}✅ Company data validation passed${colors.reset}`);
    } else {
      result.summary.failedChecks++;
      console.log(`${colors.red}❌ Company data validation failed${colors.reset}`);
    }
    
    // 5. 사용자 데이터 검증
    console.log('👥 Validating user data...');
    const userErrors = validateUsers(expectedUsers, mockData.users);
    result.errors.push(...userErrors);
    result.summary.totalChecks++;
    if (userErrors.length === 0) {
      result.summary.passedChecks++;
      console.log(`${colors.green}✅ User data validation passed${colors.reset}`);
    } else {
      result.summary.failedChecks++;
      console.log(`${colors.red}❌ User data validation failed${colors.reset}`);
    }
    
    // 6. 비즈니스 규칙 검증
    console.log('📐 Validating business rules...');
    const businessErrors = validateBusinessRules(mockData);
    result.errors.push(...businessErrors);
    result.summary.totalChecks++;
    if (businessErrors.length === 0) {
      result.summary.passedChecks++;
      console.log(`${colors.green}✅ Business rules validation passed${colors.reset}`);
    } else {
      result.summary.failedChecks++;
      console.log(`${colors.red}❌ Business rules validation failed${colors.reset}`);
    }
    
    // 결과 계산
    result.passed = result.errors.length === 0;
    
  } catch (error) {
    result.errors.push(`Validation process failed: ${error instanceof Error ? error.message : String(error)}`);
    result.summary.failedChecks = result.summary.totalChecks;
  }
  
  return result;
}

/**
 * 검증 결과를 출력합니다.
 */
function printValidationResult(result: ValidationResult): void {
  console.log(`\n${colors.cyan}📊 Validation Summary${colors.reset}`);
  console.log(`${colors.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  console.log(`Total Checks: ${result.summary.totalChecks}`);
  console.log(`${colors.green}Passed: ${result.summary.passedChecks}${colors.reset}`);
  console.log(`${colors.red}Failed: ${result.summary.failedChecks}${colors.reset}`);
  
  if (result.errors.length > 0) {
    console.log(`\n${colors.red}❌ Validation Errors (${result.errors.length}):${colors.reset}`);
    result.errors.forEach((error, index) => {
      console.log(`${colors.red}  ${index + 1}. ${error}${colors.reset}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Warnings (${result.warnings.length}):${colors.reset}`);
    result.warnings.forEach((warning, index) => {
      console.log(`${colors.yellow}  ${index + 1}. ${warning}${colors.reset}`);
    });
  }
  
  console.log(`\n${colors.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  if (result.passed) {
    console.log(`${colors.green}🎉 All validation checks passed! Data consistency verified.${colors.reset}`);
  } else {
    console.log(`${colors.red}💥 Validation failed! Please fix the errors above before proceeding.${colors.reset}`);
  }
}

/**
 * 메인 검증 함수
 */
async function main(): Promise<void> {
  try {
    const result = await validateDataConsistency();
    printValidationResult(result);
    
    // 검증 실패 시 프로세스 종료
    if (!result.passed) {
      console.log(`\n${colors.red}🚫 Build should be blocked due to data inconsistency!${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`\n${colors.green}✅ Data consistency validation completed successfully!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Validation process failed:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * 스크립트가 직접 실행될 때만 검증 수행
 */
if (require.main === module) {
  main();
}

export { validateDataConsistency, ValidationResult };