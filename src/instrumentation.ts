export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const CRON_SECRET = process.env.CRON_SECRET || "";
    const BASE = "http://localhost:3000";

    const callCron = async (type: string) => {
      try {
        await fetch(`${BASE}/api/cron?type=${type}`, {
          headers: { "x-cron-secret": CRON_SECRET },
        });
      } catch {}
    };

    // 5分ごとに株価更新
    setInterval(() => callCron("prices"), 5 * 60 * 1000);
    // 15分ごとにプロフィール更新
    setInterval(() => callCron("profiles"), 15 * 60 * 1000);
    // 1時間ごとに周年ボーナス+期限切れ賭け処理
    setInterval(() => callCron("all"), 60 * 60 * 1000);
  }
}
