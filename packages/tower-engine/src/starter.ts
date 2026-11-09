import { assertPlainLine } from "./plain-line";

export const starterMatchKeys = ["sleep", "training", "training-heat", "unmatched"] as const;
export type StarterMatchKey = (typeof starterMatchKeys)[number];

export const adherenceStatuses = ["done", "not_this_period", "skipped"] as const;
export type AdherenceStatus = (typeof adherenceStatuses)[number];

const maximumIntentLength = 160;

const sleepTokens = new Set([
  "sleep",
  "wake",
  "waking",
  "circadian",
  "caffeine",
  "bedtime",
  "insomnia",
  "screen",
  "screens",
]);

const trainingTokens = new Set([
  "workout",
  "workouts",
  "train",
  "training",
  "strength",
  "exercise",
  "gym",
  "lift",
  "lifting",
  "zone2",
]);

function tokensOf(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase("en-US")
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length > 0),
  );
}

function hasAny(tokens: Set<string>, expected: Set<string>): boolean {
  for (const token of expected) {
    if (tokens.has(token)) return true;
  }
  return false;
}

function mentionsSleep(value: string, tokens: Set<string>): boolean {
  return hasAny(tokens, sleepTokens);
}

function mentionsTraining(value: string, tokens: Set<string>): boolean {
  return hasAny(tokens, trainingTokens) || value.includes("work out") || value.includes("zone 2");
}

function mentionsHeat(value: string, tokens: Set<string>): boolean {
  return (
    tokens.has("heat") ||
    tokens.has("sauna") ||
    tokens.has("saunas") ||
    value.includes("heat exposure")
  );
}

export type StarterMatch =
  Readonly<{ ok: true; intent: string; matchKey: StarterMatchKey }> | Readonly<{ ok: false }>;

export function matchStarterIntent(input: unknown): StarterMatch {
  if (typeof input !== "string" || /[\p{Cc}\p{Cf}]/u.test(input)) return { ok: false };
  let intent: string;
  try {
    intent = assertPlainLine(input, maximumIntentLength);
  } catch {
    return { ok: false };
  }
  const folded = intent.toLocaleLowerCase("en-US");
  const tokens = tokensOf(folded);
  const sleep = mentionsSleep(folded, tokens);
  const training = mentionsTraining(folded, tokens);
  const heat = mentionsHeat(folded, tokens);

  let matchKey: StarterMatchKey = "unmatched";
  if (training && heat) matchKey = "training-heat";
  else if (training && !sleep) matchKey = "training";
  else if (sleep) matchKey = "sleep";

  return { ok: true, intent, matchKey };
}

export function parseAdherenceStatus(input: unknown): AdherenceStatus | null {
  return adherenceStatuses.find((status) => status === input) ?? null;
}

export function parseStarterOutcomeNote(
  input: unknown,
): Readonly<{ skipped: true; text: null } | { skipped: false; text: string }> | null {
  if (typeof input !== "string") return null;
  const normalized = input.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (normalized.length === 0) return { skipped: true, text: null };
  try {
    return { skipped: false, text: assertPlainLine(normalized, 280) };
  } catch {
    return null;
  }
}
