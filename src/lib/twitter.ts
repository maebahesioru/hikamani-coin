const YAHOO_API = "https://search.yahoo.co.jp/realtime/api/v1/pagination";
const FXTWITTER_API = "https://api.fxtwitter.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface TweetMetrics {
  tweetCount: number;
  totalLikes: number;
  totalRts: number;
  totalReplies: number;
  momentum: number; // weighted engagement score
}

export interface TwitterProfile {
  name: string;
  screenName: string;
  avatar: string;
  banner?: string;
}

// Yahoo Realtime APIでツイートの勢いを取得
export async function getTweetMomentum(query: string, hours = 24): Promise<TweetMetrics> {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const params = new URLSearchParams({
    p: query,
    md: "h",
    results: "40",
    since: String(since),
  });

  const res = await fetch(`${YAHOO_API}?${params}`, {
    headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://search.yahoo.co.jp/realtime/search" },
  });

  if (!res.ok) return { tweetCount: 0, totalLikes: 0, totalRts: 0, totalReplies: 0, momentum: 0 };

  const data = await res.json();
  const entries = data.timeline?.entry ?? [];
  const total = data.timeline?.head?.totalResultsAvailable ?? entries.length;

  let totalLikes = 0, totalRts = 0, totalReplies = 0;
  for (const e of entries) {
    totalLikes += e.likesCount ?? 0;
    totalRts += e.rtCount ?? 0;
    totalReplies += e.replyCount ?? 0;
  }

  // Momentum = weighted engagement + tweet volume
  const momentum = total * 10 + totalLikes + totalRts * 3 + totalReplies * 2;
  return { tweetCount: total, totalLikes, totalRts, totalReplies, momentum };
}

// FXTwitter APIでユーザープロフィール取得
export async function getTwitterProfile(screenName: string): Promise<TwitterProfile | null> {
  try {
    // FXTwitter doesn't have a direct profile endpoint, use a recent tweet
    const yahooParams = new URLSearchParams({ p: `ID:${screenName}`, results: "1" });
    const yahooRes = await fetch(`${YAHOO_API}?${yahooParams}`, {
      headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://search.yahoo.co.jp/realtime/search" },
    });
    if (!yahooRes.ok) return null;
    const data = await yahooRes.json();
    const entry = data.timeline?.entry?.[0];
    if (!entry) return null;
    return {
      name: entry.name,
      screenName: entry.screenName,
      avatar: entry.profileImage,
    };
  } catch {
    return null;
  }
}

// 特定ユーザーのツイート勢いを取得
export async function getUserMomentum(screenName: string, hours = 24): Promise<TweetMetrics> {
  return getTweetMomentum(`ID:${screenName}`, hours);
}
