import { z } from "zod";
import { router, protectedProcedure, staffProcedure } from "../trpc";
import {
  getUserBookings,
  bookClass,
  cancelBooking,
  markBookingAttended,
  getRosterForClass,
  getUpcomingForMember,
  getCheckinCountForClass,
  getWaitlistedBookings,
} from "@/domain/bookings";

export const bookingsRouter = router({
  mine: protectedProcedure
    .input(z.object({ includePast: z.boolean().default(false) }).default({}))
    .query(async ({ ctx, input }) => {
      return getUserBookings(ctx.db, ctx.user.id, input.includePast);
    }),

  book: protectedProcedure
    .input(z.object({ classId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return bookClass(ctx.db, ctx.user.id, input.classId);
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return cancelBooking(ctx.db, ctx.user.id, ctx.user.role, input.bookingId);
    }),

  markAttended: staffProcedure
    .input(
      z.object({
        bookingId: z.number(),
        source: z.enum(["front_desk", "kiosk", "app"]).default("front_desk"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return markBookingAttended(ctx.db, input.bookingId, input.source);
    }),

  rosterFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getRosterForClass(ctx.db, input.classId);
    }),

  upcomingForMember: staffProcedure
    .input(z.object({ userId: z.number(), hoursAhead: z.number().default(2) }))
    .query(async ({ ctx, input }) => {
      return getUpcomingForMember(ctx.db, input.userId, input.hoursAhead);
    }),

  checkinCountFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCheckinCountForClass(ctx.db, input.classId);
    }),

  waitlisted: protectedProcedure.query(async ({ ctx }) => {
    return getWaitlistedBookings(ctx.db, ctx.user.id);
  }),
});
