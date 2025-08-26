const { danger, warn, fail } = require('danger');

// PR 크기 체크
const bigPRThreshold = 500;
const changedLines = danger.github.pr.additions + danger.github.pr.deletions;
if (changedLines > bigPRThreshold) {
  warn(`이 PR은 ${changedLines}줄을 변경합니다. ${bigPRThreshold}줄 이하로 유지하는 것이 권장됩니다.`);
}

// 테스트 없는 UI 컴포넌트 경고
const hasUIChanges = danger.git.modified_files.some(f => 
  f.includes('packages/ui/') && f.endsWith('.tsx') && !f.includes('.test.')
);
const hasUITests = danger.git.modified_files.some(f => 
  f.includes('packages/ui/') && (f.includes('.test.') || f.includes('.spec.'))
);

if (hasUIChanges && !hasUITests) {
  warn('UI 컴포넌트가 변경되었지만 테스트가 추가/수정되지 않았습니다.');
}

// PR 설명 체크
if (danger.github.pr.body.length < 50) {
  fail('PR 설명이 너무 짧습니다. 변경사항에 대한 충분한 설명을 추가해주세요.');
}

// 커밋 메시지 컨벤션 체크
const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
const invalidCommits = danger.git.commits.filter(commit => 
  !conventionalCommitRegex.test(commit.message)
);

if (invalidCommits.length > 0) {
  warn(`다음 커밋이 Conventional Commits 형식을 따르지 않습니다:\n${
    invalidCommits.map(c => `- ${c.message}`).join('\n')
  }`);
}

// 타입 정의 체크
const hasTypeChanges = danger.git.modified_files.some(f => 
  f.endsWith('.ts') || f.endsWith('.tsx')
);
const hasAnyType = danger.git.diffForFile.some(async (file) => {
  const diff = await file;
  return diff.added.includes(': any') || diff.added.includes('<any>');
});

if (hasTypeChanges && hasAnyType) {
  warn('새로운 `any` 타입이 추가되었습니다. 구체적인 타입을 사용하는 것이 권장됩니다.');
}

// 민감한 정보 체크
const sensitivePatterns = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /private[_-]?key/i
];

danger.git.modified_files.forEach(async (file) => {
  const diff = await danger.git.diffForFile(file);
  if (diff) {
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(diff.added)) {
        fail(`파일 ${file}에 민감한 정보가 포함되어 있을 수 있습니다.`);
      }
    });
  }
});

// 성능 최적화 제안
const largeFiles = danger.git.modified_files.filter(async (file) => {
  const diff = await danger.git.diffForFile(file);
  return diff && diff.added.split('\n').length > 300;
});

if (largeFiles.length > 0) {
  warn(`다음 파일들이 너무 큽니다. 분할을 고려해보세요:\n${largeFiles.join('\n')}`);
}