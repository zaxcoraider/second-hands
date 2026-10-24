import "server-only";

/** Server-side config. Mock mode turns on automatically when there's no Token Factory key. */
export const env = {
  tokenFactoryKey: process.env.TOKEN_FACTORY_API_KEY ?? "",
  tokenFactoryBaseUrl: process.env.TOKEN_FACTORY_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1",
  tavilyKey: process.env.TAVILY_API_KEY ?? "",
  redisUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  dailyBudgetUsd: Number(process.env.DAILY_BUDGET_USD ?? "1.5"),
};

export const isMockAI = () => process.env.MOCK_AI === "1" || !env.tokenFactoryKey;
export const isMockTavily = () => process.env.MOCK_AI === "1" || !env.tavilyKey;
export const hasRedis = () => Boolean(env.redisUrl && env.redisToken);
