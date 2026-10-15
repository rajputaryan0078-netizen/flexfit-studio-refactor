import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  getAdminDashboardStats,
  getClassUtilisation,
  getRevenueByMonth,
  getRevenueByMethod,
  getExpiringMemberships,
  getRefundCount,
  getCheckinsPerDay,
  getTopTrainers,
  getNoShowList,
} from "@/domain/admin";

export const adminRouter = router({
  stats: adminProcedure.query(async ({ ctx }) => {
    return getAdminDashboardStats(ctx.db);
  }),

  classUtilisation: adminProcedure
    .input(z.object({ limit: z.number().default(10) }).default({}))
    .query(async ({ ctx, input }) => {
      return getClassUtilisation(ctx.db, input.limit);
    }),

  revenueByMonth: adminProcedure.query(async ({ ctx }) => {
    return getRevenueByMonth(ctx.db);
  }),

  revenueByMethod: adminProcedure.query(async ({ ctx }) => {
    return getRevenueByMethod(ctx.db);
  }),

  expiringMemberships: adminProcedure.query(async ({ ctx }) => {
    return getExpiringMemberships(ctx.db);
  }),

  refundCount: adminProcedure.query(async ({ ctx }) => {
    return getRefundCount(ctx.db);
  }),

  checkinsPerDay: adminProcedure.query(async ({ ctx }) => {
    return getCheckinsPerDay(ctx.db);
  }),

  topTrainers: adminProcedure.query(async ({ ctx }) => {
    return getTopTrainers(ctx.db);
  }),

  noShowList: adminProcedure.query(async ({ ctx }) => {
    return getNoShowList(ctx.db);
  }),
});
