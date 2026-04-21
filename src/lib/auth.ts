import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

async function getOrCreateUser(provider: string, providerId: string, profile: {
  username?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
}) {
  const accountProvider = provider.toUpperCase() as "DISCORD" | "TWITTER";

  // Check if linked account exists
  const linked = await prisma.linkedAccount.findUnique({
    where: { provider_providerId: { provider: accountProvider, providerId } },
    include: { user: true },
  });
  if (linked) {
    await prisma.user.update({
      where: { id: linked.userId },
      data: { displayName: profile.displayName, avatar: profile.avatar },
    });
    return linked.user;
  }

  // New user
  const user = await prisma.user.create({
    data: {
      discordId: provider === "discord" ? providerId : `${provider}_${providerId}`,
      username: profile.username || providerId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      email: profile.email,
    },
  });
  await prisma.wallet.create({ data: { userId: user.id, balance: 500n } });
  await prisma.transaction.create({
    data: { type: "BONUS", amount: 500n, receiverId: user.id, memo: "初回登録ボーナス" },
  });
  await prisma.bonusClaim.create({ data: { userId: user.id, type: "REGISTRATION", amount: 500n } });
  await prisma.linkedAccount.create({
    data: { userId: user.id, provider: accountProvider, providerId, bonusPaid: true },
  });
  if (provider === "discord") {
    await prisma.wallet.update({ where: { userId: user.id }, data: { balance: { increment: 300n } } });
    await prisma.transaction.create({
      data: { type: "BONUS", amount: 300n, receiverId: user.id, memo: "Discord連携ボーナス" },
    });
    await prisma.bonusClaim.create({ data: { userId: user.id, type: "DISCORD_LINK", amount: 300n } });
  }
  return user;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: { params: { scope: "identify email" } },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Twitter({
      clientId: process.env.AUTH_TWITTER_ID!,
      clientSecret: process.env.AUTH_TWITTER_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false;
      const provider = account.provider;
      const providerId = (profile.id || profile.sub) as string;

      await getOrCreateUser(provider, providerId, {
        username: (profile.username || profile.email || profile.name) as string,
        displayName: (profile.global_name || profile.name) as string,
        avatar: (profile.image_url || profile.picture) as string | undefined,
        email: profile.email as string | undefined,
      });
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const providerId = (profile.id || profile.sub) as string;
        const provider = account.provider.toUpperCase() as "DISCORD" | "TWITTER";
        const linked = await prisma.linkedAccount.findUnique({
          where: { provider_providerId: { provider, providerId } },
        });
        if (linked) token.userId = linked.userId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
