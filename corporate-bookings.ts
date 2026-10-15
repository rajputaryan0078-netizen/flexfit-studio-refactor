import { z } from "zod";
import { router, protectedProcedure, staffProcedure } from "../trpc";
import {
  getCorporateBookingsForUser,
  bookCorporateClass,
  cancelCorporateBooking,
  markCorporateAttended,
  getCorporateRosterForClass,
} from "@/domain/corporate";

export const corporateBookingsRouter = router({
  mine: protectedProcedure
    .input(z.object({ includePast: z.boolean().default(false) }).default({}))
    .query(async ({ ctx, input }) => {
      return getCorporateBookingsForUser(ctx.db, ctx.user.id, input.includePast);
    }),

  book: protectedProcedure
    .input(z.object({ classId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return bookCorporateClass(ctx.db, ctx.user.id, input.classId);
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return cancelCorporateBooking(
        ctx.db,
        ctx.user.id,
        ctx.user.role,
        input.bookingId,
      );
    }),

  markAttended: staffProcedure
    .input(
      z.object({
        bookingId: z.number(),
        source: z.enum(["front_desk", "kiosk", "app"]).default("front_desk"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return markCorporateAttended(ctx.db, input.bookingId);
    }),

  rosterFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCorporateRosterForClass(ctx.db, input.classId);
    }),
});
