# Edge-Case Behavior Trace

Five scenarios traced end-to-end through the codebase with line-level citations and a verdict for each.

---

## 1. ZERO CREDITS BOOKING

**Scenario**: Member with `creditsRemaining = 0` (not unlimited) tries to book a class costing ≥1 credit.

### Call Path

1. **UI** — [schedule/page.tsx L59](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/app/schedule/page.tsx#L59): user clicks "Book" → calls `handleBook(c.id)`
2. **Hook** — [useSchedule.ts L21-23](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/hooks/useSchedule.ts#L21-L23): `book.mutate({ classId })` → calls `trpc.bookings.book`
3. **Router** — [bookings.ts router L25-29](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/server/routers/bookings.ts#L25-L29): calls `bookClass(ctx.db, ctx.user.id, input.classId)`
4. **Domain** — [bookings.ts L46-137](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/domain/bookings.ts#L46-L137): `bookClass()` executes:
   - Fetches class, checks cancelled, checks start time, checks duplicate booking, fetches active membership.
   - Guard at L101: `!unlimited && membership.creditsRemaining < cls.creditCost` throws `TRPCError("Not enough class credits remaining.")`.

### Verdict: ✅ CORRECT

---

## 2. REFUND FLOW (MONETARY)

**Scenario**: Admin refunds a `paid` payment that was created by a membership purchase.

### Call Path

1. **Router** — [payments.ts router L27-31](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/server/routers/payments.ts#L27-L31): `adminProcedure` → calls `refundPayment(ctx.db, input.id)`
2. **Domain** — [payments.ts L76-111](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/domain/payments.ts#L76-L111): `refundPayment()` flips payment status to `"refunded"` and updates membership status to `"cancelled"`.

### Verdict: ⚠️ CORRECT (with caveat)

Payment + membership updated correctly. Existing bookings under the cancelled membership remain valid.

---

## 3. REFUND FLOW (CREDIT-BASED)

**Scenario**: A member cancels a booking ≥12 hours before class starts.

### Call Path

1. **Router** — [bookings.ts router L31-35](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/server/routers/bookings.ts#L31-L35): `cancelBooking(ctx.db, ctx.user.id, ctx.user.role, input.bookingId)`
2. **Domain** — [bookings.ts L139-238](file:///c:/Users/Admin/Downloads/flexfit-studio-final/src/domain/bookings.ts#L139-L238): Calculates `refundable = hoursUntil(cls.startsAt) >= 12 && booking.creditsUsed > 0`. Restores exact `creditsUsed` to membership.

### Verdict: ✅ CORRECT

---

## 4. WAITLIST AUTO-PROMOTION

**Scenario**: Class is full → member joins waitlist → someone cancels → waitlisted member promoted.

### Behavior (Fixed & Verified)

- `cancelBooking()` and `cancelCorporateBooking()` query waitlisted queue ordered by `bookedAt ASC`.
- Validates active membership status and credit/pool sufficiency *before* promoting to `"booked"`.
- If invalid/insufficient, skips to the next waitlisted member in queue.

### Verdict: ✅ CORRECT (FIXED)

---

## 5. COMPANY CREDIT POOL ROUND-TRIP

**Scenario**: Top up pool → employee books corporate class → cancel corporate booking → credits restored to company pool.

### Behavior (Fixed & Verified)

- Deducts from and restores to `companies.creditPoolBalance`.
- Uses combined `getConfirmedSeatCount(db, classId)` to prevent cross-table overbooking between individual and corporate bookings.

### Verdict: ✅ CORRECT (FIXED)
