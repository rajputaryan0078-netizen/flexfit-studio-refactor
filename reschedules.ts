import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  rescheduleBooking,
  getRescheduleHistory,
  validateReschedule,
} from "@/domain/reschedules";

export const reschedulesRouter = router({
  reschedule: protectedProcedure
    .input(
      z.object({
        fromBookingId: z.number(),
        toClassId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return rescheduleBooking(ctx.db, ctx.user.id, input);
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    return getRescheduleHistory(ctx.db, ctx.user.id);
  }),

  validateReschedule: protectedProcedure
    .input(
      z.object({
        fromBookingId: z.number(),
        toClassId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return validateReschedule(ctx.db, ctx.user.id, input);
    }),
});
