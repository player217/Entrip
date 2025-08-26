#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

interface CoverageSummary {
  total: {
    lines: {
      pct: number;
    };
    statements: {
      pct: number;
    };
    functions: {
      pct: number;
    };
    branches: {
      pct: number;
    };
  };
}

// 커버리지 색상 결정
function getColor(percentage: number): string {
  if (percentage >= 85) return '#4c1'; // 녹색
  if (percentage >= 70) return '#dfb317'; // 노란색
  if (percentage >= 50) return '#fe7d37'; // 주황색
  return '#e05d44'; // 빨간색
}

// SVG 뱃지 생성
function generateBadge(percentage: number): string {
  const color = getColor(percentage);
  const text = `${percentage.toFixed(1)}%`;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="114" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="a">
      <rect width="114" height="20" rx="3" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#a)">
      <path fill="#555" d="M0 0h63v20H0z"/>
      <path fill="${color}" d="M63 0h51v20H63z"/>
      <path fill="url(#b)" d="M0 0h114v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
      <text x="325" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">coverage</text>
      <text x="325" y="140" transform="scale(.1)" textLength="530">coverage</text>
      <text x="875" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="410">${text}</text>
      <text x="875" y="140" transform="scale(.1)" textLength="410">${text}</text>
    </g>
  </svg>`;
}

// 메인 함수
async function main() {
  try {
    // coverage-summary.json 파일 읽기
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    if (!fs.existsSync(coveragePath)) {
      console.error('❌ coverage-summary.json 파일을 찾을 수 없습니다.');
      console.error('먼저 "pnpm test --coverage"를 실행하세요.');
      process.exit(1);
    }
    
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8')) as CoverageSummary;
    const linesCoverage = coverageData.total.lines.pct;
    
    // SVG 뱃지 생성
    const badge = generateBadge(linesCoverage);
    
    // 뱃지 파일 저장
    const badgePath = path.join(process.cwd(), 'coverage', 'coverage-badge.svg');
    fs.writeFileSync(badgePath, badge);
    
    // 성공 메시지는 stdout으로 출력
    process.stdout.write(`✅ 커버리지 뱃지 생성 완료: ${linesCoverage.toFixed(1)}%\n`);
    process.stdout.write(`📍 위치: ${badgePath}\n`);
    
  } catch (error) {
    console.error('❌ 뱃지 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}