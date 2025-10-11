# Composite Uniqueness Plan – User(email, companyCode)

Generated: 2025-10-01

## Current State
- v2 datamodel expects multi-tenancy isolation, but the database may still enforce a global unique on `email`.
- v1/v2 both gate by `companyCode` at the app layer; login currently finds by `email` only (needs tightening).

## Risks
- Enforcing composite uniqueness without data audit can fail if duplicate emails exist in different companies.

## Plan (Two-Phase)

### Phase A – Non-enforcing Preparation (Zero-downtime)
1) Data audit (report only)
   ```sql
   SELECT email, COUNT(*) AS cnt, array_agg(DISTINCT companyCode)
   FROM "User"
   GROUP BY email
   HAVING COUNT(*) > 1;
   ```
   - Save results under `docs/user_email_company_unique_audit.json`.
2) Add partial unique (optional guardrail) – not applied yet in 1.1
   ```sql
   CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS user_email_company_unique
   ON "User" ("email", "companyCode")
   WHERE "isActive" = true;
   ```
3) App safeguards (land immediately)
   - Require `companyCode` on login lookup and all user writes.

### Phase B – Enforcing Change (Maintenance window)
1) Ensure no duplicates remain; coordinate rename or suffixing policy where needed.
2) Drop legacy unique on `email` (if present) and add Prisma `@@unique([email, companyCode])`.
3) Regenerate Prisma Client; run integration tests; monitor errors.

## Rollback
- If constraint causes issues, drop only the newly created partial index; app‑layer checks remain.

## Next Actions
- Implement login companyCode check in `packages/api/src/routes/auth/auth.service.ts`.
- Prepare SQL for partial unique creation, but do not apply automatically.
