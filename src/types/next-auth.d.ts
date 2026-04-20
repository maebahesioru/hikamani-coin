import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    discordId?: string;
  }
}
