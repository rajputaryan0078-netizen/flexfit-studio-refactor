# Code Structure & Organization Audit

## 1. FILE RESPONSIBILITY

Every file under `src/domain/`, `src/server/routers/`, and major UI pages evaluated against four architectural classifications:
- **route-handler**: Enforces HTTP/tRPC input schemas, session/auth context, and delegates execution.
- **business-logic**: Implements domain rules, calculations, status transitions, and orchestration.
- **data-access**: Reads/writes database entities (Drizzle schema/queries).
- **mixed**: Combines two or more of the above responsibilities.

### Domain Layer (`src/domain/`)

| File | Classification | Details & Rationale |
|------|----------------|---------------------|
| `admin.ts` | ⚠️ **mixed** | Combines analytics aggregations (data-access) with revenue calculation & metrics compilation (business-logic). |
| `auth.ts` | **business-logic** | Pure domain logic: authentication, credential validation, password hashing, and session token generation. (Cookies handled in router). |
| `bookings.ts` | ⚠️ **mixed** | Implements core booking business logic, executes raw Drizzle DB operations, and handles waitlist promotion. |
| `classes.ts` | ⚠️ **mixed** | Formats class view representations (business-logic) and executes direct Drizzle queries (data-access). |
| `companies.ts` | ⚠️ **mixed** | Company credit top-up domain logic combined with direct Drizzle inserts/updates. |
| `corporate.ts` | ⚠️ **mixed** | Corporate booking logic, pool deduction logic, and raw DB queries. |
| `members.ts` | ⚠️ **mixed** | Member profile updates + raw SQL aggregation queries for attendance counts (`sql<number>count(*)`). |
| `memberships.ts` | **business-logic** | Pure helper logic: `UNLIMITED_CREDITS` definition, `isUnlimitedCredits()`, and active membership querying. |
| `notifications.ts` | ⚠️ **mixed** | Announcement broadcasting logic combined with direct DB inserts. |
| `payments.ts` | ⚠️ **mixed** | Payment status state machine combined with direct DB queries and updates. |
| `plans.ts` | ⚠️ **mixed** | Plan subscription logic combined with direct DB operations. |
| `reschedules.ts` | ⚠️ **mixed** | Reschedule business logic, validation rules, and Drizzle DB operations. |
| `trainers.ts` | ⚠️ **mixed** | Availability validation math combined with direct Drizzle CRUD operations. |

### Router Layer (`src/server/routers/`)

| File | Classification | Details & Rationale |
|------|----------------|---------------------|
| `_app.ts` | **route-handler** | App router composition only. |
| `admin-companies.ts` | **route-handler** | Pure delegation to `domain/companies.ts`. |
| `admin.ts` | **route-handler** | Pure delegation to `domain/admin.ts`. |
| `auth.ts` | **route-handler** | Pure delegation to `domain/auth.ts` + HTTP cookie management. |
| `bookings.ts` | **route-handler** | Pure delegation to `domain/bookings.ts`. |
| `classes.ts` | **route-handler** | Pure delegation to `domain/classes.ts`. |
| `corporate-bookings.ts` | **route-handler** | Pure delegation to `domain/corporate.ts`. |
| `members.ts` | **route-handler** | Pure delegation to `domain/members.ts`. |
| `notifications.ts` | **route-handler** | Pure delegation to `domain/notifications.ts`. |
| `payments.ts` | **route-handler** | Pure delegation to `domain/payments.ts`. |
| `plans.ts` | **route-handler** | Pure delegation to `domain/plans.ts`. |
| `reschedules.ts` | **route-handler** | Pure delegation to `domain/reschedules.ts`. |
| `trainers.ts` | **route-handler** | Pure delegation to `domain/trainers.ts`. |

---

## 2. DUPLICATE LOGIC

### A. Credit / Balance Sufficiency Checks

1. **Individual Booking Path**: `src/domain/bookings.ts` [L100-106](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/domain/bookings.ts#L100-L106)
2. **Individual Waitlist Promotion Path**: `src/domain/bookings.ts` [L215-220](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/domain/bookings.ts#L215-L220)
3. **Corporate Booking Path**: `src/domain/corporate.ts` [L123-127](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/domain/corporate.ts#L123-L127)
4. **Corporate Waitlist Promotion Path**: `src/domain/corporate.ts` [L246-248](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/domain/corporate.ts#L246-L248)

### B. Class Capacity Checks

Centralized via shared `getConfirmedSeatCount(db, classId)` helper in `src/domain/classes.ts` and called across:
- `src/domain/bookings.ts`
- `src/domain/corporate.ts`
- `src/domain/reschedules.ts`

---

## 3. CHANGE-IMPACT TEST

**Hypothetical Feature Request**: *"Add a new class type (e.g. Peak / VIP Classes) with custom pricing rules (e.g., multiplier costs or non-refundable credit rules)."*

To implement this change, developer must edit **8 different files**:
1. `src/db/schema.ts` — Add `classType` column to `classes` table.
2. `src/domain/classes.ts` — Update class creation/updating payload.
3. `src/domain/bookings.ts` — Modify `bookClass()` and `cancelBooking()`.
4. `src/domain/corporate.ts` — Update `bookCorporateClass()` and `cancelCorporateBooking()`.
5. `src/domain/reschedules.ts` — Update reschedule credit rules.
6. `src/server/routers/classes.ts` — Update Zod validation input schema.
7. `src/app/schedule/page.tsx` — Render new class pricing tags.
8. `src/hooks/useKiosk.ts` — Update kiosk check-in logic.
