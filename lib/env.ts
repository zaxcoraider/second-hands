import "server-only";

/** Server-side config. Mock mode turns on automatically when there's no Token Factory key. */
export const env = {
  tokenFactoryKey: process.env.TOKEN_FACTORY_API_KEY ?? "",
  tokenFactoryBaseUrl: process.env.TOKEN_FACTORY_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1",
  tavilyKey: process.env.TAVILY_API_KEY ?? "",
  // Vercel's Upstash integration sets the KV_* names; a manual Upstash setup uses UPSTASH_*.
  redisUrl: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "",
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "",
  // Secret for the owner bypass (see lib/ratelimit.ts). Empty disables it.
  ownerKey: process.env.OWNER_KEY ?? "",
  dailyBudgetUsd: Number(process.env.DAILY_BUDGET_USD ?? "1.5"),
};

export const isMockAI = () => process.env.MOCK_AI === "1" || !env.tokenFactoryKey;
export const isMockTavily = () => process.env.MOCK_AI === "1" || !env.tavilyKey;
export const hasRedis = () => Boolean(env.redisUrl && env.redisToken);
