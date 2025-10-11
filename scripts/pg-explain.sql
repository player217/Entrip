-- Example EXPLAINs to validate new indexes are used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Booking"
WHERE "companyCode" = 'j1' AND "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Booking"
WHERE "companyCode" = 'j1' AND "deletedAt" IS NULL AND "status" = 'CONFIRMED'
ORDER BY "startDate" DESC
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Notification"
WHERE "companyCode" = 'j1' AND "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 20;

