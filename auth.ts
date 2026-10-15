import { z } from "zod";
import { cookies } from "next/headers";
import { router, publicProcedure, protectedProcedure, SESSION_COOKIE } from "../trpc";
import { loginUser, registerUser, logoutUser } from "@/domain/auth";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await loginUser(ctx.db, input);

      const store = await cookies();
      store.set(SESSION_COOKIE, result.session.token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        expires: result.session.expiresAt,
      });

      return result.user;
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return registerUser(ctx.db, input);
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await logoutUser(ctx.db, ctx.token);
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return result;
  }),
});
