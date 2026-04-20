export const BONUS = {
  REGISTRATION: 500n,
  DAILY_LOGIN: 100n,
  STREAK_7: 300n,
  STREAK_30: 2000n,
  ANNIVERSARY: 1000n,
  DISCORD_LINK: 300n,
  TWITTER_LINK: 200n,
  REFERRAL_INVITER: 500n,
  REFERRAL_INVITEE: 200n,
  VC_PER_HOUR: 10n,
} as const;

export const TRANSFER_FEE_RATE = 0.01; // 1% fee on transfers
export const STOCK_FEE_RATE = 0.02; // 2% fee on stock trades
export const STOCK_FEE_RATE_DISCOUNTED = 0.01;
export const HKM_PER_JPY = BigInt(process.env.HKM_PER_JPY || "100");
