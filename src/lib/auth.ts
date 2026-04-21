import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";
import { BONUS } from "@/lib/constants";

const LINK_BONUS: Record<string, { type: "DISCORD_LINK" | "TWITTER_LINK" | "GOOGLE_LINK"; amount: bigint; label: string }> = {
  discord: { type: "DISCORD_LINK", amount: BONUS.DISCORD_LINK, label: "Discord連携ボーナス" },
  twitter: { type: "TWITTER_LINK", amount: BONUS.TWITTER_LINK, label: "Twitter連携ボーナス" },
  google: { type: "GOOGLE_LINK", amount: BONUS.GOOGLE_LINK, label: "Google連携ボーナス" },
};

async function payLinkBonus(userId: string, provider: string) {
  const bonus = LINK_BONUS[provider];
  if (!bonus) return;
  await prisma.wallet.update({ where: { userId }, data: { balance: { increment: bonus.amount } } });
  await prisma.transaction.create({
    data: { type: "BONUS", amount: bonus.amount, receiverId: userId, memo: bonus.label },
  });
  await prisma.bonusClaim.create({ data: { userId, type: bonus.type, amount: bonus.amount } });
}

async function getOrCreateUser(provider: string, providerId: string, profile: {
  username?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
}) {
  const accountProvider = provider.toUpperCase() as "DISCORD" | "TWITTER" | "GOOGLE";

  // Existing linked account → update profile
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

  // Check if user exists with same email (link accounts)
  if (profile.email) {
    const existingUser = await prisma.user.findFirst({ where: { email: profile.email } });
    if (existingUser) {
      await prisma.linkedAccount.create({
        data: { userId: existingUser.id, provider: accountProvider, providerId, bonusPaid: true },
      });
      await payLinkBonus(existingUser.id, provider);
      return existingUser;
    }
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
  await prisma.wallet.create({ data: { userId: user.id, balance: BONUS.REGISTRATION } });
  await prisma.transaction.create({
    data: { type: "BONUS", amount: BONUS.REGISTRATION, receiverId: user.id, memo: "初回登録ボーナス" },
  });
  await prisma.bonusClaim.create({ data: { userId: user.id, type: "REGISTRATION", amount: BONUS.REGISTRATION } });
  await prisma.linkedAccount.create({
    data: { userId: user.id, provider: accountProvider, providerId, bonusPaid: true },
  });
  await payLinkBonus(user.id, provider);
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
      try {
        const provider = account.provider;
        const providerId = (profile.id || profile.sub) as string;
        await getOrCreateUser(provider, providerId, {
          username: (profile.username || profile.email || profile.name) as string,
          displayName: (profile.global_name || profile.name) as string,
          avatar: (profile.image_url || profile.picture) as string | undefined,
          email: profile.email as string | undefined,
        });
        return true;
      } catch (e) {
        console.error("[AUTH] signIn error:", e);
        return false;
      }
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const providerId = (profile.id || profile.sub) as string;
        const provider = account.provider.toUpperCase() as "DISCORD" | "TWITTER" | "GOOGLE";
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
