# FlexFit Studio — Discovered Behavior Specification

This specification documents the exact business rules, access controls, edge cases, and query patterns discovered in FlexFit Studio's server routers (`src/server/routers/`).

---

## 1. Domain Constants & Business Thresholds

### 1.1 Standard Bookings
- **`FREE_CANCELLATION_HOURS` = 12**
  - Members may cancel standard bookings free of charge up to **12 hours** before the class `startsAt`.
  - Cancelling $\ge 12$ hours before start refunds the credits used (if member has a non-unlimited plan).
  - Cancelling $< 12$ hours before start still cancels the booking and frees the spot, but **forfeits** the credit.
- **`UNLIMITED_CREDITS` = 999**
  - Memberships with `creditsRemaining >= 999` are treated as unlimited.
  - **Credit math for unlimited memberships:**
    - Booking: `creditsRemaining` is **never decremented**.
    - Refund on cancellation: `creditsRemaining` is **never incremented**.
    - Waitlist promotion: `creditsRemaining` is **never decremented**.

### 1.2 Corporate Bookings
- **`CORPORATE_FREE_CANCELLATION_HOURS` = 24**
  - Corporate members may cancel corporate bookings free of charge up to **24 hours** before the class `startsAt`.
  - Cancelling $\ge 24$ hours before start refunds `creditsUsed` back to the company's `creditPoolBalance`.
  - Cancelling $< 24$ hours before start frees the spot, but the company **forfeits** the credit.

### 1.3 Rescheduling
- **`FREE_RESCHEDULE_HOURS` = 4**
  - Members can reschedule standard bookings up to **4 hours** before the original class `startsAt`.
  - Rescheduling is allowed only to a class with the **exact same name** as the original class.
  - Rescheduling does not charge or refund credits — the new booking inherits the original booking's `creditsUsed`.

---

## 2. Authentication & Authorization Rules

- **User Roles:** `member`, `trainer`, `admin`.
- **Procedures:**
  - `publicProcedure`: accessible without authentication (`auth.me`, `auth.login`, `auth.register`, `classes.list`, `classes.byId`, `plans.list`).
  - `protectedProcedure`: requires an authenticated user session (`auth.logout`, `bookings.mine`, `bookings.book`, `bookings.cancel`, `bookings.waitlisted`, `reschedules.*`, `corporateBookings.mine`, `corporateBookings.book`, `corporateBookings.cancel`, `members.profile`, `members.updateProfile`, `payments.mine`, `plans.subscribe`, `trainers.*`).
  - `staffProcedure`: requires role to be `trainer` or `admin` (`bookings.markAttended`, `bookings.rosterFor`, `bookings.upcomingForMember`, `bookings.checkinCountFor`, `corporateBookings.markAttended`, `corporateBookings.rosterFor`, `classes.create`, `classes.update`, `members.search`, `members.byId`, `members.lookupByEmailOrPhone`).
  - `adminProcedure`: requires role to be `admin` (`admin.*`, `adminCompanies.*`, `classes.cancel`, `members.setActive`, `members.setRole`, `notifications.broadcast`, `payments.all`, `payments.markPaid`, `payments.refund`, `plans.create`, `plans.setActive`).
- **Session Management:**
  - Sessions last 30 days (`SESSION_DAYS = 30`). Token is stored in `flexfit_session` HTTP-only cookie.
  - Deactivated users (`active = false`) are rejected at login with error `"This account has been deactivated."`

---

## 3. Core Workflow Specifications

### 3.1 Standard Booking Flow (`bookings.book`)
1. Validate class exists, is not cancelled, and `hoursUntil(class.startsAt) > 0`.
2. Check if user already has an active booking or waitlist entry (`status IN ('booked', 'waitlisted')`) for this class. If found, throw `CONFLICT` (`"You are already on the list for this class."`).
3. Fetch user's active membership where `status = 'active'` and `endDate >= today` (ordered by `endDate DESC`). If none, throw `FORBIDDEN` (`"An active membership is required to book classes."`).
4. If `creditsRemaining < 999` and `creditsRemaining < class.creditCost`, throw `FORBIDDEN` (`"Not enough class credits remaining."`).
5. Calculate combined confirmed seat count (`getConfirmedSeatCount(db, classId)`), summing `status = 'booked'` rows across both `bookings` and `corporateBookings` tables.
6. If `confirmedSeats >= capacity`:
   - Insert booking with `status = 'waitlisted'` and `creditsUsed = 0`.
   - Do **not** deduct membership credits.
7. If `confirmedSeats < capacity`:
   - Insert booking with `status = 'booked'` and `creditsUsed = class.creditCost`.
   - If `creditsRemaining < 999`, update membership `creditsRemaining = creditsRemaining - class.creditCost`.

### 3.2 Standard Cancellation Flow (`bookings.cancel`)
1. Fetch booking and class. Verify user is booking owner or staff (`admin` / `trainer`).
2. Verify booking status is `'booked'` or `'waitlisted'`.
3. Calculate refundability: `hoursUntil(startsAt) >= 12` AND `creditsUsed > 0`.
4. Update booking `status = 'cancelled'`, `cancelledAt = NOW()`.
5. If `refundable` AND `membership.creditsRemaining < 999`, increment membership `creditsRemaining` by `booking.creditsUsed`.
6. **Waitlist Promotion:** If cancelled booking status was `'booked'`:
   - Query all waitlisted bookings for the class ordered by `bookedAt ASC`.
   - Iterate through the queue and find the first eligible member who has an active, non-expired membership AND sufficient credits (or unlimited credits).
   - If found:
     - Update waitlisted booking to `status = 'booked'`, `creditsUsed = class.creditCost`.
     - If waitlisted member's membership has `creditsRemaining < 999`, decrement `creditsRemaining` by `class.creditCost`.
     - Stop queue processing (`break`).

### 3.3 Corporate Booking Flow (`corporateBookings.book`)
1. Validate class exists, not cancelled, `startsAt > NOW()`.
2. Verify member is not already booked/waitlisted (`corporateBookings.status IN ('booked', 'waitlisted')`).
3. Verify member is linked to an active company (`companyMembers` joined with `companies` where `active = true`).
4. Verify `company.creditPoolBalance >= class.creditCost`.
5. Calculate combined confirmed seat count (`getConfirmedSeatCount(db, classId)`), summing `status = 'booked'` rows across both `bookings` and `corporateBookings` tables.
6. If full (`confirmedSeats >= capacity`): insert corporate booking with `status = 'waitlisted'`, `creditsUsed = 0`.
7. If not full: insert corporate booking with `status = 'booked'`, `creditsUsed = class.creditCost`, decrement `company.creditPoolBalance` by `class.creditCost`.

### 3.4 Corporate Cancellation Flow (`corporateBookings.cancel`)
1. Verify ownership or staff permissions. Verify status is `'booked'` or `'waitlisted'`.
2. Refundable if `hoursUntil(startsAt) >= 24` AND `creditsUsed > 0`.
3. Set booking `status = 'cancelled'`, `cancelledAt = NOW()`.
4. If refundable, add `creditsUsed` back to `company.creditPoolBalance`.
5. **Corporate Waitlist Promotion:** If cancelled booking was `'booked'`:
   - Query all waitlisted corporate bookings for the class ordered by `bookedAt ASC`.
   - Iterate through the queue and find the first waitlisted booking whose company has `creditPoolBalance >= class.creditCost`.
   - If found:
     - Update booking `status = 'booked'`, `creditsUsed = class.creditCost`.
     - Decrement target company `creditPoolBalance` by `class.creditCost`.
     - Stop queue processing (`break`).

### 3.5 Rescheduling Flow (`reschedules.reschedule` & `reschedules.validateReschedule`)
1. Verify booking exists and belongs to current user.
2. Status must be `'booked'` or `'waitlisted'`.
3. Must be $\ge 4$ hours before original class `startsAt`.
4. Target class must exist, not be cancelled, `startsAt > NOW()`, and have the **exact same name** (`targetClass.name === originalClass.name`).
5. Target class must not be the same class ID. User must not already have an active booking for target class.
6. Check target class capacity: if full, new booking status is `'waitlisted'`; otherwise `'booked'`.
7. Insert new booking with `creditsUsed = originalBooking.creditsUsed` (no extra credit deduction or refund).
8. Update original booking `status = 'cancelled'`, `cancelledAt = NOW()`.
9. Insert audit log record in `reschedules` table (`userId`, `fromBookingId`, `toBookingId`, `fromClassId`, `toClassId`).

### 3.6 Check-in / Attendance Flow (`bookings.markAttended` & `corporateBookings.markAttended`)
1. Standard check-in: Booking status must be `'booked'`. Update status to `'attended'`, insert row into `checkins` with `userId`, `bookingId`, and `source` (`front_desk`, `kiosk`, or `app`).
2. Corporate check-in: Corporate booking status must be `'booked'`. Update status to `'attended'`, insert row into `checkins` with `userId`, `bookingId: null`.

### 3.7 Plan Subscription Flow (`plans.subscribe`)
1. Fetch plan by `planId`. Verify plan exists and `active = true`.
2. Insert new membership: `startDate = today`, `endDate = today + plan.durationDays`, `creditsRemaining = plan.classCredits`, `status = 'active'`.
3. Insert payment record: `amountCents = plan.priceCents`, `status = 'paid'`, `method = input.method`, `reference = PAY-{Date.now()}`.

### 3.8 Payment Refund Flow (`payments.refund`)
1. Payment must have `status = 'paid'`.
2. Update payment status to `'refunded'`.
3. If payment is associated with a `membershipId`, update membership `status = 'cancelled'`.

### 3.9 Trainer Schedule & Availability (`trainers.*`)
1. `upcomingClasses`: Returns trainer's non-cancelled classes starting $\ge$ current ISO time.
2. `setAvailability`: Upserts trainer's recurring availability for `dayOfWeek` (0-6) with `startTime` and `endTime` ("HH:MM").
3. `checkAvailability`:
   - Checks if UTC day of week has set availability.
   - Checks if UTC class time `[startTimeStr, endTimeStr]` falls entirely within `[availStart, availEnd]`.
   - Checks for non-cancelled overlapping classes for the same trainer (`classStart < existEnd && classEnd > existStart`).

### 3.10 Admin Reporting & Analytics (`admin.*`)
- `stats`: Counts members, active memberships, upcoming classes, total paid revenue (cents), total checkins, pending payments.
- `classUtilisation`: Calculates booked count (`status IN ('booked', 'attended')`) and utilisation ratio (`booked / capacity`).
- `revenueByMonth` & `revenueByMethod`: Grouped aggregates from `payments` where `status = 'paid'`.
- `expiringMemberships`: Active memberships expiring within next 14 days.
- `checkinsPerDay`, `topTrainers`, `noShowList`: 14-day trailing metrics.

---

## 4. Discovered Edge Cases & Peculiarities

1. **Check-in Source for Corporate Bookings:**
   - Standard check-ins record `bookingId`. Corporate check-ins insert `bookingId: null` in `checkins`.
2. **Cancelled Class Handling:**
   - `classes.cancel` updates confirmed bookings (`status = 'booked'`) for that class to `status = 'cancelled'`. It does **not** automatically execute refund logic or trigger waitlist clearing on class cancellation.
3. **Waitlist Position Calculation:**
   - `bookings.waitlisted` returns position as `count(bookings where bookedAt < my_bookedAt) + 1` for the same `classId` and `status = 'waitlisted'`.
4. **Reschedule Credit Accounting:**
   - Rescheduling maintains the exact `creditsUsed` from the original booking. If a user waitlisted on a class (0 credits used) reschedules, the new booking will also have 0 credits used even if placed directly into a confirmed spot on the target class.
