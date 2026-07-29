export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogValue =
  | string
  | number
  | boolean
  | null
  | readonly LogValue[]
  | { readonly [key: string]: LogValue };
export type LogFields = Readonly<Record<string, unknown>>;

const sensitiveKey = new RegExp(
  [
    "authorization",
    "cookie",
    "password",
    "secret",
    "token",
    "api[-_]?key",
    "session",
    "email",
    "phone",
    "address",
    "medical",
    "health",
  ].join("|"),
  "i",
);
const maxDepth = 5;
const maxCollectionEntries = 50;

function sanitize(value: unknown, depth = 0): LogValue {
  if (depth > maxDepth) return "[MAX_DEPTH]";
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) {
    return { name: value.name };
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, maxCollectionEntries)
      .map((item) => sanitize(item, depth + 1));
  }
  if (typeof value === "object") {
    return sanitizeRecord(value as Readonly<Record<string, unknown>>, depth + 1);
  }
  return String(value);
}

function sanitizeRecord(
  value: Readonly<Record<string, unknown>>,
  depth = 0,
): Record<string, LogValue> {
  const output: Record<string, LogValue> = {};
  for (const [key, nestedValue] of Object.entries(value).slice(
    0,
    maxCollectionEntries,
  )) {
    output[key] = sensitiveKey.test(key)
      ? "[REDACTED]"
      : sanitize(nestedValue, depth);
  }
  return output;
}

export type StructuredLogger = Readonly<{
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
}>;

export function createStructuredLogger(
  options?: Readonly<{
    minimumLevel?: LogLevel;
    context?: LogFields;
    write?: (line: string) => void;
  }>,
): StructuredLogger {
  const ranking: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };
  const minimum = options?.minimumLevel ?? "info";
  const write = options?.write ?? ((line: string) => console.log(line));
  const context = options?.context ?? {};

  const emit = (
    level: LogLevel,
    message: string,
    fields: LogFields = {},
  ): void => {
    if (ranking[level] < ranking[minimum]) return;
    write(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...sanitizeRecord(context),
        ...sanitizeRecord(fields),
      }),
    );
  };

  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
  };
}
