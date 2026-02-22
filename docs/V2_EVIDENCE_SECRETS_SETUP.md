# V2 Evidence Secrets Setup

## Goal
- Enable `.github/workflows/v2-cutover-daily-evidence.yml` to run against staging/production daily.

## Required Repository Secrets
- `STAGING_URL`
- `STAGING_DATABASE_URL`
- `PRODUCTION_URL`
- `PRODUCTION_DATABASE_URL`

## Quick Check
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v2-evidence-secrets.ps1
```

Exit code:
- `0`: all required secrets exist
- `2`: one or more required secrets are missing

## Set Secrets (GitHub CLI)
```powershell
gh secret set STAGING_URL --repo <owner/repo> --body "https://staging-api-v2.example.com"
gh secret set STAGING_DATABASE_URL --repo <owner/repo> --body "postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
gh secret set PRODUCTION_URL --repo <owner/repo> --body "https://api-v2.example.com"
gh secret set PRODUCTION_DATABASE_URL --repo <owner/repo> --body "postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
```

## Validation Run
1. Trigger workflow manually:
   - Actions -> `V2 Cutover Daily Evidence` -> `Run workflow`
2. Confirm:
   - job `collect-evidence` succeeds
   - artifact `v2-cutover-daily-evidence` exists
3. Keep artifacts for 7 consecutive days as decommission evidence.
