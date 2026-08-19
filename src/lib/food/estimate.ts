/**
 * One Claude call shared by every estimate path. Callers supply the message
 * content blocks, so a photo or label path can reuse this without a second
 * parser: the returned shape is always the same.
 */

export type FoodEstimate = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_unit: string;
  default_serving: number;
};

export type EstimateResult = { estimate: FoodEstimate } | { error: string };

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5";

export const MISSING_KEY_MESSAGE =
  "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the server.";

export const TEXT_ESTIMATE_INSTRUCTION =
  "Estimate the nutrition of the food the user describes. Macros are per one serving. " +
  "serving_unit names what one serving is, such as \"plate\", \"cup\", or \"100 g\". " +
  "default_serving is how many of those servings the description covers. " +
  "Give a usable estimate for common foods rather than refusing.";

const FOOD_TOOL = {
  name: "record_food",
  description: "Record a single nutrition estimate.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Short name for the food or meal." },
      calories: { type: "number", description: "Calories in one serving." },
      protein_g: { type: "number", description: "Protein grams in one serving." },
      carbs_g: { type: "number", description: "Carbohydrate grams in one serving." },
      fat_g: { type: "number", description: "Fat grams in one serving." },
      serving_unit: { type: "string", description: "What one serving is." },
      default_serving: { type: "number", description: "Servings the input covers." },
    },
    required: [
      "name",
      "calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "serving_unit",
      "default_serving",
    ],
  },
};

type AnthropicResponse = {
  content?: Array<{ type?: string; name?: string; input?: Record<string, unknown> }>;
  error?: { message?: string };
};

export async function requestFoodEstimate(
  content: unknown[],
  instruction: string,
): Promise<EstimateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: MISSING_KEY_MESSAGE };

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 1024,
        system: instruction,
        tools: [FOOD_TOOL],
        tool_choice: { type: "tool", name: FOOD_TOOL.name },
        messages: [{ role: "user", content }],
      }),
    });
  } catch {
    return { error: "Could not reach the Claude API." };
  }

  let payload: AnthropicResponse;
  try {
    payload = (await response.json()) as AnthropicResponse;
  } catch {
    return { error: `Claude API returned an unreadable response (${response.status}).` };
  }

  if (!response.ok) {
    return { error: payload.error?.message ?? `Claude API error ${response.status}.` };
  }

  const block = (payload.content ?? []).find(
    (item) => item.type === "tool_use" && item.name === FOOD_TOOL.name,
  );

  if (!block?.input) return { error: "No estimate came back. Try describing it differently." };

  return { estimate: normalize(block.input) };
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalize(input: Record<string, unknown>): FoodEstimate {
  return {
    name: toText(input.name, "Meal"),
    calories: toNumber(input.calories, 0),
    protein_g: toNumber(input.protein_g, 0),
    carbs_g: toNumber(input.carbs_g, 0),
    fat_g: toNumber(input.fat_g, 0),
    serving_unit: toText(input.serving_unit, "serving"),
    default_serving: Math.max(0.25, toNumber(input.default_serving, 1)),
  };
}
