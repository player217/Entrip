import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SchemaIssue {
  type: 'ENUM_MISMATCH' | 'COLUMN_MISSING' | 'TYPE_MISMATCH' | 'CONSTRAINT_MISSING';
  table: string;
  field: string;
  expected: any;
  actual: any;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  autoFixable: boolean;
  description: string;
}

export interface SchemaHealthResult {
  healthy: boolean;
  issues: SchemaIssue[];
  recommendations: string[];
  timestamp: Date;
}

/**
 * Schema Guardian Service
 * 데이터베이스 스키마와 Prisma 스키마 간의 일치성을 검증하고 자동 수정합니다.
 */
export class SchemaGuardian {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  /**
   * 스키마 건강 상태를 확인합니다.
   */
  async checkHealth(): Promise<SchemaHealthResult> {
    const issues: SchemaIssue[] = [];
    const startTime = Date.now();
    
    try {
      // 1. Enum 검증
      const enumIssues = await this.checkEnums();
      issues.push(...enumIssues);
      
      // 2. 컬럼 검증
      const columnIssues = await this.checkColumns();
      issues.push(...columnIssues);
      
      // 3. 제약조건 검증
      const constraintIssues = await this.checkConstraints();
      issues.push(...constraintIssues);
      
      console.log(`[Schema Guardian] Check completed in ${Date.now() - startTime}ms`);
      console.log(`[Schema Guardian] Found ${issues.length} issues`);
      
      return {
        healthy: issues.length === 0,
        issues,
        recommendations: this.generateRecommendations(issues),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[Schema Guardian] Error during health check:', error);
      throw error;
    }
  }
  
  /**
   * Enum 타입 불일치를 확인합니다.
   */
  private async checkEnums(): Promise<SchemaIssue[]> {
    const issues: SchemaIssue[] = [];
    
    try {
      // BookingStatus enum 체크
      const dbStatuses = await this.prisma.$queryRaw<{enumlabel: string}[]>`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingStatus')
      `;
      
      const schemaStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
      
      // 대소문자 구분 설정 확인
      const caseInsensitive = process.env.SCHEMA_CASE_INSENSITIVE === 'true';
      const dbStatusList = caseInsensitive 
        ? dbStatuses.map(s => s.enumlabel.toUpperCase())
        : dbStatuses.map(s => s.enumlabel);
      
      // 누락된 값 찾기
      for (const expected of schemaStatuses) {
        if (!dbStatusList.includes(expected)) {
          issues.push({
            type: 'ENUM_MISMATCH',
            table: 'BookingStatus',
            field: 'enum_value',
            expected,
            actual: null,
            severity: 'HIGH',
            autoFixable: true,
            description: `Enum value '${expected}' is missing in database`
          });
        }
      }
      
      // 추가된 값 찾기 (DB에만 있고 스키마에 없는 값)
      for (const actual of dbStatusList) {
        if (!schemaStatuses.includes(actual)) {
          issues.push({
            type: 'ENUM_MISMATCH',
            table: 'BookingStatus',
            field: 'enum_value',
            expected: null,
            actual,
            severity: 'MEDIUM',
            autoFixable: false,
            description: `Unexpected enum value '${actual}' in database`
          });
        }
      }
      
      // BookingType enum 체크
      const dbTypes = await this.prisma.$queryRaw<{enumlabel: string}[]>`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingType')
      `;
      
      const schemaTypes = ['PACKAGE', 'FIT', 'GROUP', 'BUSINESS'];
      const dbTypeList = dbTypes.map(t => t.enumlabel.toUpperCase());
      
      for (const expected of schemaTypes) {
        if (!dbTypeList.includes(expected)) {
          issues.push({
            type: 'ENUM_MISMATCH',
            table: 'BookingType',
            field: 'enum_value',
            expected,
            actual: null,
            severity: 'HIGH',
            autoFixable: true,
            description: `Enum value '${expected}' is missing in database`
          });
        }
      }
      
    } catch (error) {
      console.error('[Schema Guardian] Error checking enums:', error);
    }
    
    return issues;
  }
  
  /**
   * 테이블 컬럼 불일치를 확인합니다.
   */
  private async checkColumns(): Promise<SchemaIssue[]> {
    const issues: SchemaIssue[] = [];
    
    try {
      // Booking 테이블 컬럼 체크
      const columns = await this.prisma.$queryRaw<{column_name: string, data_type: string, is_nullable: string}[]>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Booking' AND table_schema = 'public'
      `;
      
      const requiredColumns = [
        { name: 'id', type: 'text', nullable: false },
        { name: 'companyCode', type: 'text', nullable: false },
        { name: 'bookingNumber', type: 'text', nullable: false },
        { name: 'customerName', type: 'text', nullable: false },
        { name: 'teamName', type: 'text', nullable: false },
        { name: 'bookingType', type: 'USER-DEFINED', nullable: false },
        { name: 'status', type: 'USER-DEFINED', nullable: false },
        { name: 'startDate', type: 'timestamp', nullable: false },
        { name: 'endDate', type: 'timestamp', nullable: false }
      ];
      
      const existingColumns = columns.map(c => c.column_name);
      
      for (const required of requiredColumns) {
        if (!existingColumns.includes(required.name)) {
          issues.push({
            type: 'COLUMN_MISSING',
            table: 'Booking',
            field: required.name,
            expected: 'exists',
            actual: 'missing',
            severity: 'HIGH',
            autoFixable: false,
            description: `Required column '${required.name}' is missing in Booking table`
          });
        }
      }
      
      // User 테이블 체크
      const userColumns = await this.prisma.$queryRaw<{column_name: string}[]>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'User' AND table_schema = 'public'
      `;
      
      if (userColumns.length === 0) {
        issues.push({
          type: 'COLUMN_MISSING',
          table: 'User',
          field: 'ALL',
          expected: 'table exists',
          actual: 'table missing or empty',
          severity: 'HIGH',
          autoFixable: false,
          description: 'User table is missing or has no columns'
        });
      }
      
    } catch (error) {
      console.error('[Schema Guardian] Error checking columns:', error);
    }
    
    return issues;
  }
  
  /**
   * 제약조건 불일치를 확인합니다.
   */
  private async checkConstraints(): Promise<SchemaIssue[]> {
    const issues: SchemaIssue[] = [];
    
    try {
      // 인덱스 확인
      const indexes = await this.prisma.$queryRaw<{indexname: string}[]>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'Booking' AND schemaname = 'public'
      `;
      
      const requiredIndexes = [
        'Booking_pkey',
        'Booking_companyCode_idx',
        'Booking_status_idx'
      ];
      
      const existingIndexes = indexes.map(i => i.indexname);
      
      for (const required of requiredIndexes) {
        if (!existingIndexes.includes(required)) {
          issues.push({
            type: 'CONSTRAINT_MISSING',
            table: 'Booking',
            field: 'index',
            expected: required,
            actual: 'missing',
            severity: 'LOW',
            autoFixable: true,
            description: `Index '${required}' is missing`
          });
        }
      }
      
    } catch (error) {
      console.error('[Schema Guardian] Error checking constraints:', error);
    }
    
    return issues;
  }
  
  /**
   * 발견된 문제들을 자동으로 수정합니다.
   */
  async autoFix(issues: SchemaIssue[]): Promise<{
    fixed: SchemaIssue[];
    failed: SchemaIssue[];
  }> {
    const fixed: SchemaIssue[] = [];
    const failed: SchemaIssue[] = [];
    
    for (const issue of issues) {
      if (!issue.autoFixable) {
        console.log(`[Schema Guardian] Issue not auto-fixable: ${issue.description}`);
        failed.push(issue);
        continue;
      }
      
      try {
        await this.fixIssue(issue);
        console.log(`[Schema Guardian] Fixed: ${issue.description}`);
        fixed.push(issue);
      } catch (error) {
        console.error(`[Schema Guardian] Failed to fix issue: ${issue.description}`, error);
        failed.push(issue);
      }
    }
    
    return { fixed, failed };
  }
  
  /**
   * 개별 문제를 수정합니다.
   */
  private async fixIssue(issue: SchemaIssue): Promise<void> {
    switch (issue.type) {
      case 'ENUM_MISMATCH':
        if (issue.expected && !issue.actual) {
          // Enum 값 추가 (PostgreSQL에서는 ALTER TYPE ADD VALUE가 트랜잭션 내에서 작동하지 않음)
          try {
            await this.prisma.$executeRawUnsafe(`
              ALTER TYPE "${issue.table}" ADD VALUE IF NOT EXISTS '${issue.expected}'
            `);
          } catch (error) {
            // 이미 존재하는 경우 무시
            console.log(`[Schema Guardian] Enum value might already exist: ${issue.expected}`);
          }
        }
        break;
        
      case 'CONSTRAINT_MISSING':
        if (issue.field === 'index' && issue.expected) {
          // 인덱스 생성
          const indexName = issue.expected;
          const tableName = issue.table;
          
          if (indexName.includes('companyCode')) {
            await this.prisma.$executeRawUnsafe(`
              CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("companyCode")
            `);
          } else if (indexName.includes('status')) {
            await this.prisma.$executeRawUnsafe(`
              CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("status")
            `);
          }
        }
        break;
        
      case 'COLUMN_MISSING':
        // 컬럼 추가는 위험하므로 수동 처리 필요
        throw new Error('Column addition requires manual intervention');
        
      default:
        throw new Error(`Unknown issue type: ${issue.type}`);
    }
  }
  
  /**
   * 문제에 대한 권장사항을 생성합니다.
   */
  private generateRecommendations(issues: SchemaIssue[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.type === 'ENUM_MISMATCH')) {
      recommendations.push('Run: npx prisma db push to sync enum types');
    }
    
    if (issues.some(i => i.type === 'COLUMN_MISSING')) {
      recommendations.push('Review Prisma schema and run migrations to add missing columns');
    }
    
    if (issues.some(i => i.type === 'CONSTRAINT_MISSING')) {
      recommendations.push('Create missing indexes for better performance');
    }
    
    if (issues.some(i => i.severity === 'HIGH')) {
      recommendations.push('⚠️ High severity issues detected - immediate action required');
    }
    
    if (issues.length === 0) {
      recommendations.push('✅ Schema is in sync - no action required');
    }
    
    return recommendations;
  }
  
  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}