const YAHOO_API = "https://search.yahoo.co.jp/realtime/api/v1/pagination";
const FXTWITTER_API = "https://api.fxtwitter.com";

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
];
const YAHOO_HEADERS = {
  "User-Agent": UA_POOL[0],
  Accept: "application/json, text/plain, */*",
  Referer: "https://search.yahoo.co.jp/realtime/search",
};
const FX_RETRIES = 5;
const FX_RETRY_BASE_MS = 500;

function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// FXTwitter full profile (matching bot.py's fetch_account)
export interface FxProfile {
  id: string;
  name: string;
  screenName: string;
  alive: boolean;
  protected: boolean;
  verified: boolean;
  verificationType: string | null;
  source: string;
  followers: number;
  following: number;
  tweets: number;
  likes: number;
  mediaCount: number;
  description: string;
  location: string;
  websiteUrl: string | null;
  websiteDisplayUrl: string | null;
  bannerUrl: string | null;
  avatarUrl: string | null;
  joined: string;
  verifiedAt: string | null;
  bioFacets: { type: string; original?: string; replacement?: string }[];
  usernameChangesCount: number;
  usernameChangesLast: string;
  ageDays: number;
  basedIn: string;
}

export async function fetchFxProfile(username: string): Promise<FxProfile | null> {
  for (let attempt = 0; attempt < FX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${FXTWITTER_API}/${username}`, {
        headers: { "User-Agent": randomUA() },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 200) {
        const j = await res.json();
        if (j.code !== 200 || !j.user) return deadProfile(username);
        const u = j.user;
        const joined = u.joined || "";
        const v = u.verification || {};
        const about = u.about_account || {};
        const uc = about.username_changes || {};
        return {
          id: u.id || "",
          name: u.name || username,
          screenName: u.screen_name || username,
          alive: true,
          protected: u.protected || false,
          verified: v.verified || false,
          verificationType: v.type || null,
          source: about.source || "",
          followers: u.followers || 0,
          following: u.following || 0,
          tweets: u.tweets || 0,
          likes: u.likes || 0,
          mediaCount: u.media_count || 0,
          description: normalizeDesc(u.description || "", u.website?.url),
          location: u.location || "",
          websiteUrl: u.website?.url?.replace(/\/$/, "") || null,
          websiteDisplayUrl: u.website?.display_url || null,
          bannerUrl: u.banner_url || null,
          avatarUrl: (u.avatar_url || "").replace("_normal", "") || null,
          joined,
          verifiedAt: v.verified_at || null,
          bioFacets: (u.raw_description?.facets || []) as { type: string; original?: string; replacement?: string }[],
          usernameChangesCount: uc.count || 0,
          usernameChangesLast: uc.last_changed_at || "",
          ageDays: ageDays(joined),
          basedIn: about.based_in || "",
        };
      }
      // Retryable errors
      if ((res.status === 429 || res.status >= 500) && attempt < FX_RETRIES - 1) {
        const ra = res.headers.get("Retry-After");
        const backoff = ra ? Math.min(parseInt(ra) || 1, 120) * 1000 : FX_RETRY_BASE_MS * 2 ** attempt;
        await sleep(backoff + Math.random() * 300);
        continue;
      }
      return deadProfile(username); // 403, 404 etc
    } catch {
      if (attempt >= FX_RETRIES - 1) return null;
      await sleep(FX_RETRY_BASE_MS * 2 ** attempt);
    }
  }
  return null;
}

function deadProfile(username: string): FxProfile {
  return {
    id: "", name: username, screenName: username, alive: false, protected: false,
    verified: false, verificationType: null, source: "", followers: 0, following: 0,
    tweets: 0, likes: 0, mediaCount: 0, description: "", location: "",
    websiteUrl: null, websiteDisplayUrl: null, bannerUrl: null, avatarUrl: null, joined: "",
    verifiedAt: null, bioFacets: [],
    usernameChangesCount: 0, usernameChangesLast: "", ageDays: 0, basedIn: "",
  };
}

function normalizeDesc(desc: string, websiteUrl?: string): string {
  if (!websiteUrl) return desc;
  return desc.replace(websiteUrl.replace(/\/$/, ""), "").replace(/\/$/, "").trim();
}

function ageDays(joined: string): number {
  if (!joined) return 0;
  try {
    return Math.floor((Date.now() - new Date(joined).getTime()) / 86400000);
  } catch { return 0; }
}

// Diff detection (matching bot.py's diff function)
export interface ProfileChange {
  type: string; // name_change, icon_change, bio_change, etc.
  text: string;
  username: string;
  imageUrl?: string;
}

export function diffProfiles(username: string, prev: FxProfile, curr: FxProfile): ProfileChange[] {
  const changes: ProfileChange[] = [];
  const tag = `${curr.name}(@${username})`;

  if (prev.alive && !curr.alive) {
    changes.push({ type: "suspension", text: `${tag}が凍結または垢消し`, username });
    return changes;
  }
  if (!prev.alive && curr.alive) {
    changes.push({ type: "revival", text: `${tag}が復活`, username });
    return changes;
  }
  if (!curr.alive) return changes;

  if (prev.name !== curr.name)
    changes.push({ type: "name_change", text: `${tag}が表示名変更: ${prev.name} → ${curr.name}`, username });
  if (prev.screenName !== curr.screenName)
    changes.push({ type: "username_change", text: `${tag}がユーザー名変更: @${prev.screenName} → @${curr.screenName}`, username });
  if (!prev.protected && curr.protected)
    changes.push({ type: "lock", text: `${tag}が鍵垢に`, username });
  if (prev.protected && !curr.protected)
    changes.push({ type: "unlock", text: `${tag}が鍵垢解除`, username });
  if (!prev.verified && curr.verified)
    changes.push({ type: "verified", text: `${tag}が認証バッジ取得 (${curr.verificationType || "不明"})`, username });
  if (prev.verified && !curr.verified)
    changes.push({ type: "unverified", text: `${tag}が認証バッジ喪失`, username });
  if (prev.description !== curr.description)
    changes.push({ type: "bio_change", text: `${tag}のbioが変更`, username });
  // bio内リンク変化
  const prevUrls = prev.bioFacets.filter(f => f.type === "url").map(f => f.replacement || f.original || "").sort().join(",");
  const currUrls = curr.bioFacets.filter(f => f.type === "url").map(f => f.replacement || f.original || "").sort().join(",");
  if (prevUrls !== currUrls)
    changes.push({ type: "bio_url_change", text: `${tag}のbio内リンクが変更`, username });
  if (prev.websiteDisplayUrl !== curr.websiteDisplayUrl && curr.websiteDisplayUrl)
    changes.push({ type: "website_display_change", text: `${tag}のプロフィールURL表示名が変更`, username });
  if (prev.location !== curr.location)
    changes.push({ type: "location_change", text: `${tag}の場所が変更: "${prev.location || "なし"}" → "${curr.location || "なし"}"`, username });
  if (prev.websiteUrl !== curr.websiteUrl)
    changes.push({ type: "website_change", text: `${tag}のURLが変更`, username });
  if (prev.bannerUrl !== curr.bannerUrl)
    changes.push({ type: "banner_change", text: `${tag}のヘッダーが変更`, username, imageUrl: curr.bannerUrl || undefined });
  if (prev.avatarUrl !== curr.avatarUrl && curr.avatarUrl)
    changes.push({ type: "icon_change", text: `${tag}のアイコンが変更`, username, imageUrl: curr.avatarUrl });
  if (curr.basedIn && prev.basedIn !== curr.basedIn)
    changes.push({ type: "based_in_change", text: `${tag}の居住国が変更: ${prev.basedIn || "不明"} → ${curr.basedIn}`, username });

  return changes;
}

// Yahoo Realtime API - tweet momentum
export interface TweetMetrics {
  tweetCount: number;
  totalLikes: number;
  totalRts: number;
  totalReplies: number;
  totalQuotes: number;
  momentum: number;
  sensitiveCount: number;       // possiblySensitive=trueの数
  mediaCount: number;           // メディア付きツイート数
  videoCount: number;           // 動画ツイート数
  gifCount: number;             // GIFツイート数
  hashtagCount: number;         // ハッシュタグ使用数
  mentionCount: number;         // メンション数
  replyCount: number;           // リプライ数（inReplyTo != ""）
  quoteCount: number;           // 引用ツイート数
  blueVerifiedCount: number;    // 認証済みユーザーのツイート数
  businessVerifiedCount: number;// 企業認証ユーザーのツイート数
  nightTweetCount: number;      // 深夜(0-5時)ツイート数
  topTweets: { text: string; likes: number; rts: number; replies: number; quotes: number; mediaType: string[]; url: string }[];
}

export async function getTweetMomentum(query: string, hours = 24): Promise<TweetMetrics> {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const params = new URLSearchParams({ p: query, md: "h", results: "40", since: String(since) });

  try {
    const res = await fetch(`${YAHOO_API}?${params}`, {
      headers: { ...YAHOO_HEADERS, "User-Agent": randomUA() },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return emptyMetrics();
    const data = await res.json();
    const entries: Record<string, unknown>[] = data.timeline?.entry ?? [];
    const total = data.timeline?.head?.totalResultsAvailable ?? entries.length;

    let totalLikes = 0, totalRts = 0, totalReplies = 0, totalQuotes = 0;
    let sensitiveCount = 0, mediaCount = 0, videoCount = 0, gifCount = 0;
    let hashtagCount = 0, mentionCount = 0, replyCount = 0, quoteCount = 0;
    let blueVerifiedCount = 0, businessVerifiedCount = 0, nightTweetCount = 0;

    const topTweets = entries.slice(0, 10).map((e) => {
      const likes = (e.likesCount as number) ?? 0;
      const rts = (e.rtCount as number) ?? 0;
      const replies = (e.replyCount as number) ?? 0;
      const quotes = (e.qtCount as number) ?? 0;
      totalLikes += likes; totalRts += rts; totalReplies += replies; totalQuotes += quotes;

      if (e.possiblySensitive) sensitiveCount++;
      const mt = (e.mediaType as string[]) ?? [];
      if (mt.length > 0) mediaCount++;
      if (mt.includes("video")) videoCount++;
      if (mt.includes("animated_gif")) gifCount++;
      if (((e.hashtags as unknown[]) ?? []).length > 0) hashtagCount++;
      if (((e.mentions as unknown[]) ?? []).length > 0) mentionCount++;
      if (e.inReplyTo) replyCount++;
      if (e.quotedTweet) quoteCount++;
      const badge = (e.badge as Record<string, string>) ?? {};
      if (badge.type === "blue") blueVerifiedCount++;
      if (badge.type === "business") businessVerifiedCount++;
      const createdAt = (e.createdAt as number) ?? 0;
      const hour = new Date(createdAt * 1000).getHours();
      if (hour >= 0 && hour < 5) nightTweetCount++;

      return {
        text: ((e.displayText as string) || "").slice(0, 100),
        likes, rts, replies, quotes,
        mediaType: mt,
        url: (e.url as string) || "",
      };
    });

    for (let i = 10; i < entries.length; i++) {
      const e = entries[i];
      totalLikes += (e.likesCount as number) ?? 0;
      totalRts += (e.rtCount as number) ?? 0;
      totalReplies += (e.replyCount as number) ?? 0;
      totalQuotes += (e.qtCount as number) ?? 0;
      if (e.possiblySensitive) sensitiveCount++;
      const mt = (e.mediaType as string[]) ?? [];
      if (mt.length > 0) mediaCount++;
      if (mt.includes("video")) videoCount++;
      if (mt.includes("animated_gif")) gifCount++;
      if (((e.hashtags as unknown[]) ?? []).length > 0) hashtagCount++;
      if (((e.mentions as unknown[]) ?? []).length > 0) mentionCount++;
      if (e.inReplyTo) replyCount++;
      if (e.quotedTweet) quoteCount++;
      const badge = (e.badge as Record<string, string>) ?? {};
      if (badge.type === "blue") blueVerifiedCount++;
      if (badge.type === "business") businessVerifiedCount++;
      const createdAt = (e.createdAt as number) ?? 0;
      const hour = new Date(createdAt * 1000).getHours();
      if (hour >= 0 && hour < 5) nightTweetCount++;
    }

    const momentum = total * 10 + totalLikes + totalRts * 3 + totalReplies * 2 + totalQuotes * 2
      + videoCount * 5 + gifCount * 3 + blueVerifiedCount * 2 + businessVerifiedCount * 3
      - sensitiveCount * 5;

    return {
      tweetCount: total, totalLikes, totalRts, totalReplies, totalQuotes, momentum,
      sensitiveCount, mediaCount, videoCount, gifCount, hashtagCount, mentionCount,
      replyCount, quoteCount, blueVerifiedCount, businessVerifiedCount, nightTweetCount,
      topTweets,
    };
  } catch {
    return emptyMetrics();
  }
}

function emptyMetrics(): TweetMetrics {
  return {
    tweetCount: 0, totalLikes: 0, totalRts: 0, totalReplies: 0, totalQuotes: 0, momentum: 0,
    sensitiveCount: 0, mediaCount: 0, videoCount: 0, gifCount: 0, hashtagCount: 0,
    mentionCount: 0, replyCount: 0, quoteCount: 0, blueVerifiedCount: 0,
    businessVerifiedCount: 0, nightTweetCount: 0, topTweets: [],
  };
}

export async function getUserMomentum(screenName: string, hours = 24): Promise<TweetMetrics> {
  return getTweetMomentum(`ID:${screenName}`, hours);
}

// Auto bet market suggestions based on profile changes
export function suggestBetMarkets(username: string, prev: FxProfile, curr: FxProfile): { question: string; category: string }[] {
  const suggestions: { question: string; category: string }[] = [];
  const name = curr.name || prev.name;

  // If name changed recently, bet on whether they'll change again
  if (prev.name !== curr.name) {
    suggestions.push({ question: `${name}(@${username})は1週間以内にまた名前を変更するか？`, category: "name_change" });
  }
  // If icon changed, bet on revert
  if (prev.avatarUrl !== curr.avatarUrl) {
    suggestions.push({ question: `${name}(@${username})は1週間以内にアイコンを元に戻すか？`, category: "icon_change" });
  }
  // If bio changed
  if (prev.description !== curr.description) {
    suggestions.push({ question: `${name}(@${username})は1週間以内にbioをまた変更するか？`, category: "profile_change" });
  }
  // If locked
  if (!prev.protected && curr.protected) {
    suggestions.push({ question: `${name}(@${username})は1週間以内に鍵を外すか？`, category: "lock_change" });
  }
  // Follower milestones
  const nextMilestone = [1000, 2000, 5000, 10000, 50000].find((m) => curr.followers < m && curr.followers >= m * 0.8);
  if (nextMilestone) {
    suggestions.push({ question: `${name}(@${username})は1ヶ月以内にフォロワー${nextMilestone.toLocaleString()}を突破するか？`, category: "tweet_momentum" });
  }

  return suggestions;
}

// Load handles from handle.txt
export async function loadHandles(): Promise<string[]> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const txt = await fs.readFile(path.join(process.cwd(), "public", "handle.txt"), "utf-8");
    return txt.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
