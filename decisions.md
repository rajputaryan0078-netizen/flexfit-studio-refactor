# FlexFit Studio — Architectural & Bug Fix Decisions

## Runtime QA Discovery & Bug Fix: Infinite Refetch in `classes.list`

### 1. Discovery Context
During initial runtime QA and dev server observation, continuous high-frequency HTTP requests to `/api/trpc/classes.list` (approx. 100 requests/sec) were observed, leading to elevated CPU utilization.

### 2. Exact Cause
In `src/app/schedule/page.tsx` and `src/components/reschedule-modal.tsx`, the `classes.list` tRPC query was invoked with:
```tsx
trpc.classes.list.useQuery({
  from: new Date().toISOString(),
});
```
`new Date().toISOString()` executed directly inside the component render body, producing a distinct millisecond-precision ISO timestamp string on every render pass.

### 3. Mechanism of Continuous Refetching
TanStack Query / tRPC serializes the query input object as part of the query key. Because the `from` property changed value on every render:
1. React Query evaluated each render as a query key parameter change.
2. It immediately triggered a new network fetch to `/api/trpc/classes.list`.
3. Completion of the request updated React Query state, causing a re-render.
4. The re-render generated a new timestamp, triggering another query immediately in an infinite render/fetch loop.

### 4. Behavior-Preserving Fix
The `from` timestamp is stabilized per component lifecycle using `useState`:
```tsx
const [fromDate] = useState(() => new Date().toISOString());
trpc.classes.list.useQuery({ from: fromDate });
```
This ensures the query input remain constant throughout the component lifecycle unless explicitly updated, eliminating the infinite render/fetch loop while preserving 100% of the existing query functionality and behavior.

### 5. Architectural Refactor Status
> [!NOTE]
> The domain layer extraction (`src/domain/`) and thin tRPC router refactoring have been completed across all domain modules.

---

## Post-Refactor Bug Fixes

### 1. Waitlist Promotion Bug (Bypassed Credit & Membership Validation)

#### What Was Found
When a confirmed booking was cancelled, `cancelBooking()` in `src/domain/bookings.ts` and `cancelCorporateBooking()` in `src/domain/corporate.ts` promoted the oldest waitlisted member to `"booked"` without verifying if that member had an active, non-expired membership or sufficient credits/credit pool balance.

#### Root Cause
In both promotion routines, `bookings.status` (or `corporateBookings.status`) was updated to `"booked"` *first* before attempting to inspect and deduct credits. For standard memberships, `creditsRemaining` was clamped via `Math.max(0, ...)`, which allowed members with 0 credits or expired memberships to be promoted for free. For corporate bookings, if `company.creditPoolBalance < creditCost`, the deduction was skipped while the status update to `"booked"` remained, allowing free corporate promotions.

#### What Was Changed
- **`src/domain/bookings.ts` (`cancelBooking()`)**: Updated the promotion block (L197–235) to query waitlisted members ordered by `bookedAt ASC` and iterate through the queue. Before promoting, it invokes `activeMembershipFor(db, userId)` to verify active status and checks `!unlimited && creditsRemaining < creditCost`. If invalid, it skips to the next waitlisted member. Only valid members have their booking status updated to `"booked"` and credits deducted.
- **`src/domain/corporate.ts` (`cancelCorporateBooking()`)**: Updated the promotion block (L227–263) to verify `company.creditPoolBalance >= creditCost` *before* updating `corporateBookings.status` to `"booked"`.

#### Verification
Empirically verified with automated integration test `scripts/verify_promotion.ts`. Confirmed that Member B (0 credits) remains waitlisted, Member C (valid credits) is promoted with exact 2-credit deduction, Company X (0 credits) remains waitlisted, and Company Y (valid pool) is promoted with exact pool deduction.

---

### 2. Overbooking Bug (Isolated Capacity Accounting)

#### What Was Found
Classes with a set capacity (e.g. 10 spots) could accept up to double their capacity (e.g. 10 individual bookings + 10 corporate bookings = 20 total confirmed spots) because capacity was evaluated independently per booking type.

#### Root Cause
- `bookClass()` in `src/domain/bookings.ts` evaluated `isFull` by executing `SELECT count(*) FROM bookings WHERE class_id = ? AND status = 'booked'`.
- `bookCorporateClass()` in `src/domain/corporate.ts` evaluated `isFull` by executing `SELECT count(*) FROM corporateBookings WHERE class_id = ? AND status = 'booked'`.
- Neither function queried the opposing table, making individual and corporate capacity checks blind to each other.
- `reschedules.ts` (L146–153 & L350–357) also duplicated the single-table query pattern.

#### What Was Changed
- Created a single shared helper function `getConfirmedSeatCount(db, classId)` in `src/domain/classes.ts` that sums confirmed (`"booked"`) seats from both `bookings` and `corporateBookings` tables.
- Replaced the single-table capacity queries in `src/domain/bookings.ts` (`bookClass()`), `src/domain/corporate.ts` (`bookCorporateClass()`), and `src/server/routers/reschedules.ts` (`reschedule` & `validateReschedule`) with calls to `getConfirmedSeatCount()`.

#### Verification
Empirically verified with automated integration test `scripts/verify_capacity.ts`. Confirmed that after a 10-capacity class is booked by 10 individual members, subsequent corporate AND individual booking attempts are correctly assigned `status = "waitlisted"`.
