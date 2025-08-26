#!/usr/bin/env ts-node
/**
 * 환경 변수 검증 스크립트
 * .env.schema를 기반으로 필수 환경 변수 확인
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

interface EnvVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  default?: string;
  min?: number;
}

function parseSchema(schemaPath: string): EnvVariable[] {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const lines = content.split('\n');
  const variables: EnvVariable[] = [];
  
  lines.forEach(line => {
    // Parse lines like: DATABASE_URL=string,required
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      const [, name, definition] = match;
      const parts = definition.split(',');
      
      const variable: EnvVariable = {
        name,
        type: parts[0] as 'string' | 'number' | 'boolean' | 'url',
        required: parts.includes('required'),
      };
      
      parts.forEach(part => {
        if (part.startsWith('default=')) {
          variable.default = part.replace('default=', '');
        }
        if (part.startsWith('min=')) {
          variable.min = parseInt(part.replace('min=', ''));
        }
      });
      
      variables.push(variable);
    }
  });
  
  return variables;
}

function validateEnv(variables: EnvVariable[], env: Record<string, string | undefined>) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  variables.forEach(variable => {
    const value = env[variable.name];
    
    // Check required
    if (variable.required && !value) {
      errors.push(`❌ ${variable.name} is required but not set`);
      return;
    }
    
    // Skip validation if not set and not required
    if (!value) {
      if (!variable.default) {
        warnings.push(`⚠️  ${variable.name} is not set (optional)`);
      }
      return;
    }
    
    // Type validation
    switch (variable.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`❌ ${variable.name} must be a number, got: ${value}`);
        }
        break;
      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          errors.push(`❌ ${variable.name} must be a boolean, got: ${value}`);
        }
        break;
      case 'string':
        if (variable.min && value.length < variable.min) {
          errors.push(`❌ ${variable.name} must be at least ${variable.min} characters long`);
        }
        break;
    }
  });
  
  return { errors, warnings };
}

function main() {
  console.log('🔍 환경 변수 검증 시작...\n');
  
  // Load .env files
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const schemaPath = path.join(__dirname, '..', '.env.schema');
  
  // Load environment variables
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  }
  
  // Parse schema
  const variables = parseSchema(schemaPath);
  console.log(`📋 총 ${variables.length}개의 환경 변수 정의됨\n`);
  
  // Validate
  const { errors, warnings } = validateEnv(variables, process.env);
  
  // Report warnings
  if (warnings.length > 0) {
    console.log('⚠️  경고:\n');
    warnings.forEach(warning => console.log(warning));
    console.log();
  }
  
  // Report errors
  if (errors.length > 0) {
    console.log('❌ 오류:\n');
    errors.forEach(error => console.log(error));
    console.log(`\n❌ ${errors.length}개의 환경 변수 오류가 발견되었습니다.`);
    process.exit(1);
  }
  
  console.log('✅ 모든 필수 환경 변수가 올바르게 설정되었습니다.');
  
  // Show summary
  const requiredVars = variables.filter(v => v.required);
  const optionalVars = variables.filter(v => !v.required);
  console.log(`\n📊 요약:`);
  console.log(`   - 필수: ${requiredVars.length}개`);
  console.log(`   - 선택: ${optionalVars.length}개`);
}

if (require.main === module) {
  main();
}

export { parseSchema, validateEnv };