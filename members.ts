import { z } from "zod";
import { router, protectedProcedure, staffProcedure, adminProcedure } from "../trpc";
import {
  getMemberProfile,
  updateMemberProfile,
  searchMembers,
  getMemberById,
  setMemberActiveStatus,
  setMemberRole,
  lookupMemberByEmailOrPhone,
} from "@/domain/members";

export const membersRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    return getMemberProfile(ctx.db, ctx.user);
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return updateMemberProfile(ctx.db, ctx.user.id, input);
    }),

  search: staffProcedure
    .input(z.object({ q: z.string().default(""), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return searchMembers(ctx.db, input.q, input.limit);
    }),

  byId: staffProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return getMemberById(ctx.db, input.id);
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return setMemberActiveStatus(ctx.db, input.id, input.active);
    }),

  setRole: adminProcedure
    .input(z.object({ id: z.number(), role: z.enum(["member", "trainer", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      return setMemberRole(ctx.db, input.id, input.role);
    }),

  lookupByEmailOrPhone: staffProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      return lookupMemberByEmailOrPhone(ctx.db, input.query);
    }),
});
