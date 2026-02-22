#!/usr/bin/env node

import { SchemaGuardian } from '../services/schema-guardian.service';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

/**
 * 스키마 상태를 확인하고 문제를 자동 수정합니다.
 */
async function runSchemaCheck() {
  const guardian = new SchemaGuardian();
  
  console.log('========================================');
  console.log('🔍 Schema Guardian - Health Check');
  console.log('========================================\n');
  
  try {
    // 1. 현재 상태 확인
    console.log('📊 Checking schema health...');
    const result = await guardian.checkHealth();
    
    if (result.healthy) {
      console.log('✅ Schema is healthy - No issues found!\n');
      process.exit(0);
    }
    
    // 2. 문제 보고
    console.log(`\n⚠️ Found ${result.issues.length} issue(s):\n`);
    
    result.issues.forEach((issue, index) => {
      const severityEmoji = {
        HIGH: '🔴',
        MEDIUM: '🟡',
        LOW: '🟢'
      }[issue.severity];
      
      console.log(`${index + 1}. ${severityEmoji} [${issue.severity}] ${issue.description}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Table: ${issue.table}, Field: ${issue.field}`);
      console.log(`   Expected: ${issue.expected}, Actual: ${issue.actual}`);
      console.log(`   Auto-fixable: ${issue.autoFixable ? 'Yes' : 'No'}\n`);
    });
    
    // 3. 자동 수정 가능한 문제 확인
    const autoFixable = result.issues.filter(i => i.autoFixable);
    
    if (autoFixable.length > 0) {
      console.log('========================================');
      console.log(`🔧 Attempting to fix ${autoFixable.length} auto-fixable issue(s)...`);
      console.log('========================================\n');
      
      const fixResult = await guardian.autoFix(autoFixable);
      
      if (fixResult.fixed.length > 0) {
        console.log(`✅ Successfully fixed ${fixResult.fixed.length} issue(s):`);
        fixResult.fixed.forEach(issue => {
          console.log(`   - ${issue.description}`);
        });
        console.log();
      }
      
      if (fixResult.failed.length > 0) {
        console.log(`❌ Failed to fix ${fixResult.failed.length} issue(s):`);
        fixResult.failed.forEach(issue => {
          console.log(`   - ${issue.description}`);
        });
        console.log();
      }
    }
    
    // 4. 권장사항 출력
    if (result.recommendations.length > 0) {
      console.log('========================================');
      console.log('💡 Recommendations:');
      console.log('========================================\n');
      
      result.recommendations.forEach(rec => {
        console.log(`• ${rec}`);
      });
      console.log();
    }
    
    // 5. 최종 상태 재확인
    console.log('🔄 Re-checking schema health...');
    const finalResult = await guardian.checkHealth();
    
    if (finalResult.healthy) {
      console.log('✅ All issues resolved - Schema is now healthy!\n');
      process.exit(0);
    } else {
      console.log(`⚠️ ${finalResult.issues.length} issue(s) remain unresolved.\n`);
      console.log('Please review the remaining issues and fix them manually.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error during schema check:', error);
    process.exit(1);
  } finally {
    await guardian.cleanup();
  }
}

// 실행
runSchemaCheck().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});