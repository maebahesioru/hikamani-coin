import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false;
      const discordId = profile.id as string;
      const existing = await prisma.user.findUnique({ where: { discordId } });
      if (!existing) {
        const user = await prisma.user.create({
          data: {
            discordId,
            username: profile.username as string,
            displayName: (profile.global_name as string) || (profile.username as string),
            avatar: profile.image_url as string | undefined,
            email: profile.email as string | undefined,
          },
        });
        // Create wallet + registration bonus
        await prisma.wallet.create({ data: { userId: user.id, balance: 500n } });
        await prisma.transaction.create({
          data: { type: "BONUS", amount: 500n, receiverId: user.id, memo: "初回登録ボーナス" },
        });
        await prisma.bonusClaim.create({
          data: { userId: user.id, type: "REGISTRATION", amount: 500n },
        });
        // Discord link bonus
        await prisma.linkedAccount.create({
          data: { userId: user.id, provider: "DISCORD", providerId: discordId, bonusPaid: true },
        });
        await prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: 300n } },
        });
        await prisma.transaction.create({
          data: { type: "BONUS", amount: 300n, receiverId: user.id, memo: "Discord連携ボーナス" },
        });
        await prisma.bonusClaim.create({
          data: { userId: user.id, type: "DISCORD_LINK", amount: 300n },
        });
      } else {
        await prisma.user.update({
          where: { discordId },
          data: {
            username: profile.username as string,
            displayName: (profile.global_name as string) || (profile.username as string),
            avatar: profile.image_url as string | undefined,
          },
        });
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const user = await prisma.user.findUnique({
          where: { discordId: profile.id as string },
        });
        if (user) {
          token.userId = user.id;
          token.discordId = user.discordId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        (session.user as unknown as Record<string, unknown>).discordId = token.discordId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
