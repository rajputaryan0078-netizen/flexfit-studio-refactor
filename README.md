# FlexFit Studio — Refactor

Gym management app restructured for clean separation of concerns, with behavior fully preserved.

## Setup Instructions

### Prerequisites
- Node 20 or newer
- `pnpm` (install via `npm install -g pnpm` if needed)

### Quick Start
```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts
- `pnpm dev`: Start development server on port 3000
- `pnpm build`: Build production bundle
- `pnpm db:push`: Apply schema in `src/db/schema.ts` to SQLite database
- `pnpm db:seed`: Reseed database with sample data
- `pnpm db:reset`: Delete database file, re-apply schema, and reseed

## Structure Overview

The codebase separates web transport from domain logic. `src/domain/` contains all business rules, database queries, and status transition logic. `src/server/routers/` acts strictly as a thin tRPC transport layer that validates inputs via Zod and delegates execution to domain functions.

## What Changed and Why

The codebase was refactored to eliminate business logic duplication, remove inline database queries from tRPC routers, and enforce a defensible domain layer. Transport concerns (such as Next.js HTTP session cookies) were moved out of domain code into the router layer. For detailed architectural rationale, see [`documents/decisions.md`](documents/decisions.md).

## Bugs Found and Fixed

- **Waitlist Promotion Bug**: Fixed bypass where `cancelBooking()` and `cancelCorporateBooking()` promoted waitlisted members without validating credit sufficiency or active membership status. See [`documents/decisions.md`](documents/decisions.md#1-waitlist-promotion-bug-bypassed-credit--membership-validation) for root cause and test verification.
- **Overbooking Bug**: Fixed flaw where `bookClass()` and `bookCorporateClass()` checked capacity against single tables independently, allowing combined bookings to exceed class capacity. See [`documents/decisions.md`](documents/decisions.md#2-overbooking-bug-isolated-capacity-accounting) for root cause and test verification.

## AI Tool Usage

AI tool disclosures (Claude, Antigravity) and manual review process are documented in [`documents/ai-disclosure.md`](documents/ai-disclosure.md).
