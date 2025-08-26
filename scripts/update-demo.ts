#!/usr/bin/env ts-node
/**
 * 문서 및 데모 페이지 자동 업데이트 스크립트
 * PROJECT_PLAN.md, CHANGELOG.md, Entrip_demo.html 동기화
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface StageInfo {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress: number;
  description: string;
}

// 현재 프로젝트 상태
const STAGES: StageInfo[] = [
  { id: 'STAGE-01', name: 'API 타입 오류 전원 제거', status: 'completed', progress: 100, description: 'Prisma JSON 필드 타입 문제 해결' },
  { id: 'STAGE-02', name: 'OpenAPI 스펙 파이프라인 완전 복구', status: 'completed', progress: 100, description: 'API 문서 자동 생성 및 타입 동기화' },
  { id: 'STAGE-03', name: '모노레포 TypeScript Project References', status: 'completed', progress: 100, description: 'TS 빌드 성능 최적화' },
  { id: 'STAGE-04', name: '타입 빌드 100% 통과', status: 'completed', progress: 100, description: 'TanStack Table v8 마이그레이션' },
  { id: 'STAGE-05', name: 'UI 테스트 안정화', status: 'completed', progress: 100, description: 'Jest 통합 및 기본 테스트 작성' },
  { id: 'STAGE-06', name: 'Quality Gate 재정비', status: 'completed', progress: 100, description: '품질 도구 통합 및 CI/CD 최적화' },
  { id: 'STAGE-07', name: '배포 준비 및 문서화', status: 'in_progress', progress: 30, description: 'CI 실증, 문서 자동화, 배포 파이프라인' },
];

const PROJECT_VERSION = '0.8.0-rc.0';
const OVERALL_PROGRESS = Math.round(STAGES.reduce((sum, s) => sum + s.progress, 0) / STAGES.length);

function updateProjectPlan() {
  const planPath = path.join(__dirname, '..', 'PROJECT_PLAN.md');
  let content = fs.readFileSync(planPath, 'utf-8');
  
  // Update timestamp
  const dateRegex = /최종 업데이트: \d{4}-\d{2}-\d{2}/;
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(dateRegex, `최종 업데이트: ${today}`);
  
  // Update stage progress section
  const stageSection = STAGES.map(stage => {
    const icon = stage.status === 'completed' ? '✅' : stage.status === 'in_progress' ? '🔄' : '📋';
    return `- ${icon} **${stage.id}**: ${stage.name} (${stage.progress}%)`;
  }).join('\n');
  
  const stageRegex = /## STAGE 진행 상황[\s\S]*?(?=##|$)/;
  content = content.replace(stageRegex, `## STAGE 진행 상황\n\n${stageSection}\n\n**전체 진행률: ${OVERALL_PROGRESS}%**\n\n`);
  
  fs.writeFileSync(planPath, content);
  console.log('✅ PROJECT_PLAN.md updated');
}

function updateChangelog() {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  let content = fs.readFileSync(changelogPath, 'utf-8');
  
  // Add new version section if not exists
  if (!content.includes(`[${PROJECT_VERSION}]`)) {
    const today = new Date().toISOString().split('T')[0];
    const newSection = `
## [${PROJECT_VERSION}] - ${today}

### Added
- CI/CD quality gates with coverage enforcement
- Automated documentation updates
- Storybook build optimization
- ESLint strict mode (0 errors, 0 warnings)

### Changed
- Test coverage threshold increased to 40%
- CI pipeline parallelization for faster builds
- Turbo cache strategy optimization

### Fixed
- All TypeScript build errors
- React import issues across components
- Test execution timeouts

`;
    
    // Insert after the header
    const headerEnd = content.indexOf('\n## ');
    content = content.slice(0, headerEnd) + newSection + content.slice(headerEnd);
  }
  
  fs.writeFileSync(changelogPath, content);
  console.log('✅ CHANGELOG.md updated');
}

function generateDemoHtml() {
  const demoPath = path.join(__dirname, '..', 'Entrip_demo.html');
  
  const stageCards = STAGES.map(stage => {
    const statusClass = stage.status === 'completed' ? 'completed' : 
                       stage.status === 'in_progress' ? 'in-progress' : 'pending';
    const statusText = stage.status === 'completed' ? '완료' : 
                      stage.status === 'in_progress' ? '진행중' : '대기';
    
    return `
        <div class="stage" data-stage="${stage.id}">
          <div class="stage-header">
            <h2 class="stage-title">${stage.id}: ${stage.name}</h2>
            <span class="stage-status ${statusClass}">${statusText}</span>
          </div>
          <div class="stage-description">${stage.description}</div>
          <div class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${stage.progress}%;"></div>
            </div>
            <span class="progress-text">${stage.progress}% 완료</span>
          </div>
        </div>`;
  }).join('\n');
  
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entrip 프로젝트 진행 현황</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .title { font-size: 2.5rem; font-weight: 700; color: #1a1a1a; }
    .subtitle { font-size: 1.2rem; color: #666; margin-top: 0.5rem; }
    .version { 
      display: inline-block;
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.9rem;
      margin-top: 1rem;
    }
    .overall-progress {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .overall-progress h2 { margin-bottom: 1rem; }
    .progress-bar {
      background: #e0e0e0;
      height: 30px;
      border-radius: 15px;
      overflow: hidden;
      position: relative;
    }
    .progress-fill {
      background: linear-gradient(90deg, #4caf50, #66bb6a);
      height: 100%;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 1rem;
      color: white;
      font-weight: 600;
    }
    .stages { display: grid; gap: 1.5rem; }
    .stage {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .stage:hover { transform: translateY(-2px); }
    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .stage-title { font-size: 1.3rem; font-weight: 600; }
    .stage-status {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .stage-status.completed { background: #e8f5e9; color: #2e7d32; }
    .stage-status.in-progress { background: #fff3e0; color: #f57c00; }
    .stage-status.pending { background: #f3e5f5; color: #7b1fa2; }
    .stage-description { color: #666; margin-bottom: 1rem; }
    .progress-section { margin-top: 1rem; }
    .progress-section .progress-bar { height: 20px; }
    .progress-text { 
      display: block;
      text-align: right;
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #666;
    }
    .timestamp {
      text-align: center;
      color: #999;
      font-size: 0.9rem;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">🚀 Entrip 프로젝트 진행 현황</h1>
      <p class="subtitle">여행사 통합 관리 시스템 개발</p>
      <span class="version">v${PROJECT_VERSION}</span>
    </div>
    
    <div class="overall-progress">
      <h2>전체 진행률</h2>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${OVERALL_PROGRESS}%;">
          ${OVERALL_PROGRESS}%
        </div>
      </div>
    </div>
    
    <div class="stages">
${stageCards}
    </div>
    
    <div class="timestamp">
      최종 업데이트: ${new Date().toLocaleString('ko-KR')}
    </div>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(demoPath, html);
  console.log('✅ Entrip_demo.html generated');
}

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commit = execSync('git rev-parse --short HEAD').toString().trim();
    const author = execSync('git log -1 --pretty=format:"%an"').toString().trim();
    return { branch, commit, author };
  } catch {
    return { branch: 'unknown', commit: 'unknown', author: 'unknown' };
  }
}

// Main execution
function main() {
  console.log('🔄 문서 자동 업데이트 시작...\n');
  
  const gitInfo = getGitInfo();
  console.log(`📍 Git 정보: ${gitInfo.branch}@${gitInfo.commit} by ${gitInfo.author}\n`);
  
  updateProjectPlan();
  updateChangelog();
  generateDemoHtml();
  
  console.log('\n✨ 모든 문서가 업데이트되었습니다!');
}

// Run if called directly
if (require.main === module) {
  main();
}

export { updateProjectPlan, updateChangelog, generateDemoHtml };