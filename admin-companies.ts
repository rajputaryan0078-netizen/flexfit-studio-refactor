import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  listCompanies,
  getCompanyDetailsById,
  createCompany,
  updateCompanyActiveStatus,
  topUpCompanyCreditPool,
  linkMemberToCompany,
  unlinkMemberFromCompany,
} from "@/domain/companies";

export const adminCompaniesRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return listCompanies(ctx.db);
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCompanyDetailsById(ctx.db, input.id);
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        contactEmail: z.string().email(),
        creditPoolBalance: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createCompany(ctx.db, input);
    }),

  updateActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return updateCompanyActiveStatus(ctx.db, input.id, input.active);
    }),

  topUp: adminProcedure
    .input(z.object({ id: z.number(), amount: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return topUpCompanyCreditPool(ctx.db, input.id, input.amount);
    }),

  linkMember: adminProcedure
    .input(z.object({ companyId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return linkMemberToCompany(ctx.db, input);
    }),

  unlinkMember: adminProcedure
    .input(z.object({ companyMemberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return unlinkMemberFromCompany(ctx.db, input.companyMemberId);
    }),
});
