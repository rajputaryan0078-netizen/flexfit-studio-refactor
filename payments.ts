import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  getPaymentsForUser,
  getAllPayments,
  markPaymentPaid,
  refundPayment,
} from "@/domain/payments";

export const paymentsRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    return getPaymentsForUser(ctx.db, ctx.user.id);
  }),

  all: adminProcedure
    .input(z.object({ limit: z.number().default(100) }).default({}))
    .query(async ({ ctx, input }) => {
      return getAllPayments(ctx.db, input.limit);
    }),

  markPaid: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return markPaymentPaid(ctx.db, input.id);
    }),

  refund: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return refundPayment(ctx.db, input.id);
    }),
});
