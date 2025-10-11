# Phase 1 – Schema Gap Report (v1 ↔ v2)

Generated: 2025-10-01

This document inventories Prisma models/enums in v1 (apps/api) and v2 (packages/api), highlights deltas, and proposes actions. Phase 1 goal is additive-only changes with zero impact on v1.

## Inventory Summary

- v1 models (apps/api/prisma/schema.prisma):
  - Account, Approval, AuditLog, Booking, BookingEvent, BookingHistory, Conversation, ConversationParticipant,
    Document, ExchangeRate, ExternalCallLog, Flight, FlightStatusCache, FxRateCache, Hotel, IdempotencyKey,
    IntegrationInbox, IntegrationProvider, Message, MessageAttachment, MessageReaction, MessageRead, Outbox,
    Settlement, Transaction, User, UserPresence, Vehicle

- v2 models (packages/api/prisma/schema.prisma):
  - Account, Approval, ApprovalStep, AuditLog, Booking, BookingHistory, CalendarEvent, Conversation,
    ConversationParticipant, ConversationSettings, Document, ExchangeRate, ExternalCallLog, FinanceRecord,
    Flight, FlightStatusCache, FxRateCache, Hotel, IdempotencyKey, IntegrationInbox, IntegrationProvider,
    Message, MessageAttachment, MessageReaction, MessageRead, Notification, NotificationPreference, Outbox,
    Settlement, SystemMessage, Transaction, User, UserPresence, Vehicle

- Notable v2 superset additions: ApprovalStep, CalendarEvent, ConversationSettings, FinanceRecord,
  Notification, NotificationPreference, SystemMessage.

## Multi‑Tenancy & Soft‑Delete

- companyCode fields exist and are indexed on key entities in v2: User, Booking, Account, Approval, CalendarEvent,
  FinanceRecord, Notification, NotificationPreference, SystemMessage, Vehicle, Hotel, Flight.
- Soft‑delete (deletedAt) present on Booking, Account, Vehicle, Notification and others.

## Optimistic Locking

- v2 includes `version` on User and Booking.
- v1 also uses version on Booking; parity appears sufficient for Phase 1.

## Gaps Requiring Changes (None Additive in Phase 1)

- No additive schema changes are required for v2 to cover Notification, Messaging, Finance, Settlement domains.
- Some index name differences exist between dev DB and v2 datamodel. Preview SQL suggests non‑additive operations
  (e.g., index drop), which we will not execute in Phase 1.

## Rehearsal & Diff Results

- Rehearsal DB: created `entrip_tmp`, applied existing v2 migrations successfully; Prisma Client generated and validated.
- Preview on shared dev DB: `prisma migrate diff` produced non‑additive SQL (e.g., `DROP INDEX Booking_companyCode_idx`).
  Action: Do not apply; schedule index reconciliation in a later controlled maintenance window.

## Phase 1 Outcome

- Proceed without new migrations. v2 datamodel already covers required domains.
- Keep Phase 1 limited to: rehearsal verification, preview SQL capture, and documentation.

## Next Steps

- Phase 1.1: Design an index‑reconciliation plan (rename vs recreate concurrently) that guarantees zero downtime.
- Phase 2: Continue business‑logic parity (booking filters/ETag/locking), security hardening, and WebSocket alignment.
