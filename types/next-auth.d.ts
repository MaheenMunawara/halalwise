import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: "user" | "finance_reviewer";
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "user" | "finance_reviewer";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "user" | "finance_reviewer";
  }
}