import { prisma } from "@/lib/prisma";
import { getUserMomentum, fetchFxProfile, diffProfiles, suggestBetMarkets, loadHandles } from "@/lib/twitter";
import { ok } from "@/lib/api-utils";
import { redis } from "@/lib/redis";
import type { FxProfile } from "@/lib/twitter";

export async function POST() {
  const handles = await loadHandles();
  const allStocks = await prisma.stock.findMany({ select: { id: true, name: true, currentPrice: true } });
  const stocks = allStocks;
  const results = [];
  const newMarkets = [];

  // Batch fetch all momentum in ~20 requests instead of 1009
  const { getBatchMomentum } = await import("@/lib/twitter");
  const momentumMap = await getBatchMomentum(stocks.map(s => s.name));

  // Update stock prices based on momentum (parallel)
  const updateResults = await Promise.all(stocks.map(async (stock) => {
    const metrics = momentumMap.get(stock.name) ?? { momentum: 0, tweetCount: 0, totalLikes: 0, totalRts: 0, totalReplies: 0, totalQuotes: 0, sensitiveCount: 0, mediaCount: 0, videoCount: 0, gifCount: 0, hashtagCount: 0, mentionCount: 0, replyCount: 0, quoteCount: 0, blueVerifiedCount: 0, businessVerifiedCount: 0, nightTweetCount: 0, topTweets: [] };
    const prevKey = `stock:momentum:${stock.id}`;
    let prevMomentum = 0;
    try { const c = await redis.get(prevKey); if (c) prevMomentum = parseFloat(c); } catch {}

    const momentumDelta = prevMomentum > 0 ? (metrics.momentum - prevMomentum) / prevMomentum : 0;
    const randomFactor = (Math.random() - 0.45) * 0.02;

    let yahooImpact = momentumDelta * 0.5 + randomFactor;
    yahooImpact += metrics.videoCount * 0.005;
    yahooImpact += metrics.gifCount * 0.003;
    yahooImpact += metrics.blueVerifiedCount * 0.003;
    yahooImpact += metrics.businessVerifiedCount * 0.005;
    yahooImpact -= metrics.sensitiveCount * 0.01;
    yahooImpact -= metrics.nightTweetCount * 0.002;
    yahooImpact += Math.min(metrics.hashtagCount * 0.001, 0.02);
    yahooImpact += Math.min(metrics.mentionCount * 0.001, 0.02);
    yahooImpact += Math.min(metrics.quoteCount * 0.002, 0.03);

    const changeRate = Math.max(-0.10, Math.min(0.15, yahooImpact));
    const oldPrice = Number(stock.currentPrice);
    const newPrice = BigInt(Math.max(100, Math.round(oldPrice * (1 + changeRate))));

    await prisma.$transaction([
      prisma.stock.update({ where: { id: stock.id }, data: { currentPrice: newPrice } }),
      prisma.stockPrice.create({ data: { stockId: stock.id, price: newPrice } }),
    ]);
    try { await redis.setex(prevKey, 3600, metrics.momentum.toString()); } catch {}

    return { name: stock.name, oldPrice, newPrice: Number(newPrice), changeRate: `${(changeRate * 100).toFixed(2)}%`, momentum: metrics.momentum };
  }));
  results.push(...updateResults);

  // Profile change detection + auto bet market generation
  // Process in batches to avoid overwhelming FXTwitter
  const batchSize = 10;
  let deadCount = 0;
  const totalAlive = handles.length;

  for (let i = 0; i < handles.length; i += batchSize) {
    const batch = handles.slice(i, i + batchSize);
    const profiles = await Promise.all(batch.map((h) => fetchFxProfile(h)));

    for (let j = 0; j < batch.length; j++) {
      const handle = batch[j];
      const curr = profiles[j];
      if (!curr) continue;
      if (!curr.alive) deadCount++;

      // bot.py's 30% simultaneous death skip
      if (deadCount / totalAlive >= 0.3) {
        console.log(`⚠️ ${deadCount}件が同時消滅 - FXTwitterダウンの可能性、スキップ`);
        return ok({ results, newMarkets, skipped: true });
      }

      const prevKey = `profile:${handle}`;
      let prev: FxProfile | null = null;
      try {
        const cached = await redis.get(prevKey);
        if (cached) prev = JSON.parse(cached);
      } catch {}

      if (prev) {
        // bot.py's 2-strike dead detection
        if (prev.alive && !curr.alive) {
          const deadCountKey = `dead_pending:${handle}`;
          let strikes = 0;
          try { const c = await redis.get(deadCountKey); if (c) strikes = parseInt(c); } catch {}
          if (strikes < 1) {
            try { await redis.setex(deadCountKey, 1800, String(strikes + 1)); } catch {}
            continue; // Skip, don't update state yet
          }
        }

        const changes = diffProfiles(handle, prev, curr);
        if (changes.length > 0) {
          // Find or create stock for this user
          let stock = await prisma.stock.findUnique({ where: { name: handle } });
          if (!stock) {
            stock = await prisma.stock.create({
              data: { name: handle, description: `${curr.name} (@${handle})`, currentPrice: 1000n },
            });
          }

          // Auto-generate bet markets from profile changes
          const suggestions = suggestBetMarkets(handle, prev, curr);
          for (const s of suggestions) {
            const existing = await prisma.betMarket.findFirst({
              where: { question: s.question, resolved: false },
            });
            if (!existing) {
              const market = await prisma.betMarket.create({
                data: {
                  stockId: stock.id,
                  question: s.question,
                  category: s.category,
                  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
                },
              });
              newMarkets.push({ question: s.question, marketId: market.id });
            }
          }

          // Full price impact using all available columns
          let priceImpact = 0;
          for (const c of changes) {
            switch (c.type) {
              case "name_change":     priceImpact += 8; break;
              case "username_change": priceImpact += 12; break;
              case "icon_change":     priceImpact += 5; break;
              case "banner_change":   priceImpact += 3; break;
              case "bio_change":           priceImpact += 2; break;
              case "bio_url_change":       priceImpact += 3; break;  // bio内リンク変更（Discord追加等）
              case "website_display_change": priceImpact += 1; break;
              case "location_change": priceImpact += 1; break;
              case "website_change":  priceImpact += 2; break;
              case "based_in_change": priceImpact += 1; break;
              case "suspension":      priceImpact -= 50; break;
              case "revival":         priceImpact += 30; break;
              case "verified":        priceImpact += 20; break;
              case "unverified":      priceImpact -= 15; break;
              case "lock":            priceImpact -= 10; break;
              case "unlock":          priceImpact += 5; break;
            }
          }
          if (curr.alive && prev.alive) {
            const followerDelta = (curr.followers - prev.followers) / Math.max(prev.followers, 1);
            priceImpact += Math.round(followerDelta * 30);
            // following変化（急増=スパム疑い→下落、急減=整理→上昇）
            const followingDelta = curr.following - prev.following;
            if (followingDelta > 500) priceImpact -= 5; // 大量フォロー=スパム疑い
            if (followingDelta < -100) priceImpact += 3; // フォロー整理=活動的
            const tweetDelta = (curr.tweets - prev.tweets) / Math.max(prev.tweets, 1);
            priceImpact += Math.round(tweetDelta * 10);
            const likesDelta = (curr.likes - prev.likes) / Math.max(prev.likes, 1);
            priceImpact += Math.round(likesDelta * 5);
            const mediaDelta = curr.mediaCount - prev.mediaCount;
            if (mediaDelta > 0) priceImpact += Math.min(mediaDelta * 2, 10);
            if (curr.usernameChangesCount > prev.usernameChangesCount) priceImpact += 15;
            for (const m of [100, 365, 730, 1000, 2000]) {
              if (prev.ageDays < m && curr.ageDays >= m) priceImpact += 5;
            }
            if (curr.source && prev.source !== curr.source) priceImpact += 2;
            const followerDrop = prev.followers - curr.followers;
            if (followerDrop > 100 && followerDrop / prev.followers > 0.1) {
              priceImpact -= Math.min(Math.round(followerDrop / prev.followers * 50), 30);
            }
          }
          if (priceImpact !== 0) {
            const rate = priceImpact / 100;
            const newPrice = BigInt(Math.max(100, Math.round(Number(stock.currentPrice) * (1 + rate))));
            await prisma.stock.update({ where: { id: stock.id }, data: { currentPrice: newPrice } });
            await prisma.stockPrice.create({ data: { stockId: stock.id, price: newPrice } });
          }
        }
      }

      // Cache current profile
      try { await redis.setex(prevKey, 86400, JSON.stringify(curr)); } catch {}
    }

    // Rate limit between batches
    if (i + batchSize < handles.length) await new Promise((r) => setTimeout(r, 1000));
  }

  return ok({ results, newMarkets, profilesChecked: handles.length });
}
