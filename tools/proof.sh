#!/usr/bin/env bash
mkdir -p .proof
echo "=== Lint ==="   >  .proof/01-lint.log
pnpm lint           >> .proof/01-lint.log 2>&1

echo "=== Test ==="  >  .proof/02-test.log
pnpm test:coverage  >> .proof/02-test.log 2>&1

cp coverage/coverage-summary.json .proof/ 2>/dev/null || echo "Coverage file not generated" > .proof/coverage-summary.json