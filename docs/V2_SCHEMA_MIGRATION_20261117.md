# V2 schema restoration — 2026-11-17

The four existing migrations do not create the schema used by the current v2 client. The missing pieces include booking fields/history, banking accounts, attachments, notifications, settlements and integration records. The two added migrations complete all 35 current Prisma models while retaining legacy data.

## Migration order

1. `202611170001_extend_v2_enums` adds canonical labels without removing old enum labels. PostgreSQL commits this migration before the next migration uses the new labels.
2. `202611170002_complete_v2_schema` locks the existing application tables in a stable order, copies every original row into `entrip_legacy_20261117`, then applies all schema/data changes within one transaction. A failure rolls back this second migration, including its snapshot. No application table, column or row is deleted.

The snapshot contains original IDs, password hashes, dates, amounts, messages, attachments, roles and company codes. It is in a separate schema, outside the v2 API models. Existing legacy columns and enum labels remain available as well.

## Explicit value mappings

| Original | Active v2 representation | Original retained in |
|---|---|---|
| `ENTRIP_MAIN`, `entrip-main` | `entrip` | Snapshot company code |
| `star` | `startour` | Snapshot company code |
| `happy` | `happytravel` | Snapshot company code |
| Lowercase status/role labels | Matching uppercase labels | Snapshot and old enum labels |
| Booking `done` | `COMPLETED` | Snapshot |
| Booking `incentive` | `INCENTIVE` | `legacyType`, `teamType`, snapshot |
| Booking `airtel` | `FIT` | `legacyType`, `teamType`, snapshot |
| Booking `golf`, `honeymoon`, `etc` | `PACKAGE` with original subtype retained | `legacyType`, `teamType`, snapshot |
| User `GUIDE` | `USER` | Snapshot role and retained enum label |
| Approval `finance`, `custom` | `PAYMENT`, `MISC` | `legacyTargetType`, snapshot |

Legacy booking subtypes have no exact equivalent in the current top-level booking enum. The subtype fields are retained for review; the conversion does not invent a new original booking classification.

Company normalization fails before conversion if two User records would collide on the same email/canonical company. It does not merge or delete those accounts. Unknown enum values outside these mappings likewise fail instead of silently discarding data.

## Field restoration

- Legacy bookings receive stable unique numbers `LEGACY-<original id>`, original passenger/revenue values, date-derived nights/days and original creator/manager references.
- History retains `changes`, `performedAt` and `performedById`; v2 fields copy the original author/date and retain the raw legacy changes in JSON. Old `performedById` becomes nullable so new v2 history inserts work.
- Calendar and finance creator references copy the legacy ID fields when needed. Calendar free-text author/updater values remain in legacy columns and the snapshot.
- Message attachments remain unchanged in the legacy column and are also retained in metadata; they are not represented as newly uploaded files.
- Legacy employee `Account` rows are preserved. The new `BankAccount` table has a separate purpose and starts empty.
- The obsolete global Account email uniqueness index is replaced by uniqueness per company. Four messaging foreign keys change deletion behavior from cascade to restrict. Every new/replaced foreign key is validated.

## Conversation company assignment

Legacy rooms had no company field. Assignment considers every participant, message author and recorded creator. A room is assigned only when all known identities agree on one company. Mixed companies, missing identities and rooms with no identifiable owner are retained under `__quarantine__:<room id>` and soft-deleted. Their participants and messages are kept. Review and correct those rooms before restoring access; never assign all old rooms to the default company.

## Applying and checking

Use the reviewed migration files, with a normal database backup and application maintenance window. Table locks last through the snapshot and conversion, so migration duration depends on existing data size.

```sh
pnpm exec prisma migrate deploy --schema packages/api/prisma/schema.prisma
pnpm exec prisma generate --schema packages/api/prisma/schema.prisma
```

Do not apply an automatic `db push --accept-data-loss` or generated schema-diff cleanup. A post-migration diff intentionally proposes deleting retained legacy enum labels, columns, indexes and foreign keys; these are preserved for compatibility and audit. There are no remaining missing target tables, columns or foreign keys.

For an already migrated dedicated test database:

```sh
DATABASE_URL=postgresql://.../entrip_test node scripts/verification/verify-v2-schema.mjs
```

The retained legacy fixture is `scripts/verification/fixtures/legacy-v2-migration.sql`; apply it only to a disposable database with the original four migrations, before applying the two new migrations.

## Executed validation

Native PostgreSQL 18.6 validation completed on separate disposable databases:

- Fresh database: all six migrations applied; all 35 Prisma model reads passed.
- Legacy upgrade: 14 tables and 24 rows; the snapshot matched the entire original fixture row-for-row, including password hashes, GUIDEs, original company codes, message attachment JSON and history dates.
- Canonical status/company/role mappings, same-company room assignment and mixed/unknown-room quarantine passed.
- New v2 history and presence inserts passed with retained legacy columns.
- Unvalidated foreign keys: zero.
- Remaining schema diff: only intentionally retained legacy objects.

Machine-readable evidence: `docs/verification/2026-11-17/migration-verification.json`. These checks cover the supplied migration history and fixture; they do not establish compatibility with every independently modified production database.
