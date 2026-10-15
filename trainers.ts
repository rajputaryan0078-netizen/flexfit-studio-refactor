import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  getUpcomingClassesForTrainer,
  getTrainerAvailability,
  setTrainerAvailability,
  removeTrainerAvailability,
  checkTrainerAvailability,
} from "@/domain/trainers";

export const trainersRouter = router({
  upcomingClasses: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "trainer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only trainers can access this.",
      });
    }

    return getUpcomingClassesForTrainer(ctx.db, ctx.user.id);
  }),

  availability: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "trainer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only trainers can access this.",
      });
    }

    return getTrainerAvailability(ctx.db, ctx.user.id);
  }),

  setAvailability: protectedProcedure
    .input(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "trainer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only trainers can access this.",
        });
      }

      return setTrainerAvailability(ctx.db, ctx.user.id, input);
    }),

  removeAvailability: protectedProcedure
    .input(z.object({ dayOfWeek: z.number().int().min(0).max(6) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "trainer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only trainers can access this.",
        });
      }

      return removeTrainerAvailability(ctx.db, ctx.user.id, input.dayOfWeek);
    }),

  checkAvailability: protectedProcedure
    .input(
      z.object({
        trainerId: z.number(),
        startsAt: z.string(),
        durationMin: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "trainer" && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Staff only.",
        });
      }

      return checkTrainerAvailability(ctx.db, input);
    }),
});
