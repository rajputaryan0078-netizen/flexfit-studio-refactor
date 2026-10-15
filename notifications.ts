import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsAsRead,
  broadcastNotification,
} from "@/domain/notifications";

export const notificationsRouter = router({
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadNotificationCount(ctx.db, ctx.user.id);
  }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).default({}))
    .query(async ({ ctx, input }) => {
      return getUserNotifications(ctx.db, ctx.user.id, input.limit);
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return markAllNotificationsAsRead(ctx.db, ctx.user.id);
  }),

  broadcast: adminProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return broadcastNotification(ctx.db, input);
    }),
});
