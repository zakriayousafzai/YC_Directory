import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { authCallbacks } from "./lib/auth-callbacks";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: authCallbacks,
});
