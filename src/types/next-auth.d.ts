import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "MEMBER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
