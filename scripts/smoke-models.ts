/**
 * Phase 0: real-model reality check against Nebius Token Factory (+ Tavily).
 * Run: pnpm tsx scripts/smoke-models.ts [path/to/photo.jpg]
 * Never prints API keys.
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";

config({ path: ".env.local" });

const KEY = process.env.TOKEN_FACTORY_API_KEY ?? "";
const BASE = process.env.TOKEN_FACTORY_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1";
const TAVILY = process.env.TAVILY_API_KEY ?? "";

const MODELS = {
  vision: process.env.MODEL_VISION ?? "nvidia/Nemotron-3.5-Super-VL",
  fast: process.env.MODEL_FAST ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  planner: process.env.MODEL_PLANNER ?? "nvidia/nemotron-3-super-120b-a12b",
  judge: process.env.MODEL_JUDGE ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
};
const PRICES: Record<string, [number, number]> = {
  [MODELS.vision]: [0.3, 0.9],
  [MODELS.fast]: [0.06, 0.24],
  [MODELS.planner]: [0.3, 0.9],
  [MODELS.judge]: [1, 3],
};

let total = 0;

async function call(model: string, body: Record<string, unknown>) {
  const t = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 300, temperature: 0.2, ...body }),
    signal: AbortSignal.timeout(90_000),
  });
  const ms = Date.now() - t;
  if (!res.ok) return { ok: false as const, ms, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  const data = await res.json();
  const inT = data.usage?.prompt_tokens ?? 0;
  const outT = data.usage?.completion_tokens ?? 0;
  const [pi, po] = PRICES[model] ?? [1, 3];
  const cost = (inT * pi + outT * po) / 1e6;
  total += cost;
  const msg = data.choices?.[0]?.message ?? {};
  const text: string = msg.content ?? "";
  const reasoning: string = msg.reasoning_content ?? "";
  return { ok: true as const, ms, inT, outT, cost, text, reasoning };
}

function line(label: string, r: Awaited<ReturnType<typeof call>>, showText = true) {
  if (!r.ok) return console.log(`  ✗ ${label}: ${r.ms} ms · ${r.error}`);
  const thinks = /<think>/.test(r.text) || r.reasoning ? " · thinking" : "";
  console.log(`  ✓ ${label}: ${r.ms} ms · ${r.inT} in / ${r.outT} out · $${r.cost.toFixed(5)}${thinks}`);
  if (showText) console.log(`    → ${r.text.replace(/<think>[\s\S]*?<\/think>/g, "").trim().slice(0, 220).replace(/\n/g, " ")}`);
}

async function main() {
  if (!KEY) {
    console.error("TOKEN_FACTORY_API_KEY is empty in .env.local");
    process.exit(1);
  }

  console.log("\n1. Models available to this account");
  const res = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!res.ok) {
    console.error(`  GET /models failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    process.exit(1);
  }
  const ids: string[] = ((await res.json()).data ?? []).map((m: { id: string }) => m.id);
  for (const [role, id] of Object.entries(MODELS)) {
    console.log(`  ${ids.includes(id) ? "✓" : "✗"} ${role.padEnd(8)} ${id}`);
  }
  const nvidia = ids.filter((i) => /nvidia|nemotron/i.test(i));
  console.log(`  NVIDIA models listed (${nvidia.length}): ${nvidia.join(", ")}`);

  console.log("\n2. Text models, tiny prompt");
  for (const [role, id] of Object.entries(MODELS)) {
    if (role === "vision") continue;
    line(role, await call(id, { messages: [{ role: "user", content: "Say 'ready' and nothing else." }], max_tokens: 50 }));
  }

  console.log("\n3. Super VL on a photo at 512 / 768 / 1024 px");
  const photo = process.argv[2] ?? "eval/dataset/sample.jpg";
  if (!existsSync(photo)) {
    console.log(`  (skipped: no photo at ${photo}; pass a path as the first argument)`);
  } else {
    for (const px of [512, 768, 1024]) {
      const jpg = await sharp(readFileSync(photo)).resize(px, px, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
      line(
        `${px}px (${Math.round(jpg.length / 1024)} KB)`,
        await call(MODELS.vision, {
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Describe what the hands are doing and which tools/parts are visible, in one sentence." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpg.toString("base64")}` } },
              ],
            },
          ],
        }),
      );
    }
  }

  console.log("\n4. JSON output");
  const jsonPrompt = [{ role: "user", content: 'Return {"step": 3, "ok": true} as JSON.' }];
  line("json_object", await call(MODELS.fast, { messages: jsonPrompt, response_format: { type: "json_object" } }));
  line(
    "json_schema",
    await call(MODELS.fast, {
      messages: jsonPrompt,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "t",
          schema: { type: "object", properties: { step: { type: "integer" }, ok: { type: "boolean" } }, required: ["step", "ok"] },
        },
      },
    }),
  );

  console.log("\n5. Ultra reasoning on vs off");
  const q = [{ role: "user", content: "A phone battery is still connected. Is it safe to unplug the display flex? Answer yes/no + one reason." }];
  line("enable_thinking: true ", await call(MODELS.judge, { messages: q, max_tokens: 1500, chat_template_kwargs: { enable_thinking: true } }));
  line("enable_thinking: false", await call(MODELS.judge, { messages: q, max_tokens: 300, chat_template_kwargs: { enable_thinking: false } }));
  line("/no_think system", await call(MODELS.judge, { messages: [{ role: "system", content: "/no_think" }, ...q], max_tokens: 300 }));

  console.log("\n6. Tavily search");
  if (!TAVILY) console.log("  (skipped: TAVILY_API_KEY is empty)");
  else {
    const t = Date.now();
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${TAVILY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Redmi Note 8 battery replacement guide", max_results: 3 }),
    });
    if (!r.ok) console.log(`  ✗ ${r.status} ${(await r.text()).slice(0, 200)}`);
    else {
      const d = await r.json();
      console.log(`  ✓ ${Date.now() - t} ms`);
      for (const x of d.results ?? []) console.log(`    ${x.url}`);
    }
  }

  console.log(`\nTotal spend this run: $${total.toFixed(4)}\n`);
}

main();
