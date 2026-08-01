import { z } from "zod";

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(blankToUndefined, z.url().optional());
const optionalString = z.preprocess(blankToUndefined, z.string().min(1).optional());
const optionalIsoDateTime = z.preprocess(
  blankToUndefined,
  z.iso.datetime({ offset: true }).optional(),
);

export const appEnvironmentSchema = z.enum(["local", "preview", "staging", "production"]);
export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;

const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: appEnvironmentSchema.default("local"),
    APP_VERSION: z.string().min(1).default("0.1.0-dev"),
    GIT_SHA: z.string().min(1).default("unknown"),
    BUILD_TIME: optionalIsoDateTime,
    PUBLIC_APP_URL: optionalUrl,
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    SUPABASE_URL: optionalUrl,
    SUPABASE_ANON_KEY: optionalString,
    PROTOCOL_CATALOG_URL: optionalUrl,
    PROTOCOL_CATALOG_ANON_KEY: optionalString,
    ADMIN_DIAGNOSTICS_TOKEN: optionalString,
  })
  .superRefine((environment, context) => {
    const isProtectedEnvironment = ["staging", "production"].includes(environment.APP_ENV);

    if (isProtectedEnvironment) {
      if (!environment.PUBLIC_APP_URL) {
        context.addIssue({
          code: "custom",
          path: ["PUBLIC_APP_URL"],
          message: "PUBLIC_APP_URL is required in staging and production environments.",
        });
      } else if (new URL(environment.PUBLIC_APP_URL).protocol !== "https:") {
        context.addIssue({
          code: "custom",
          path: ["PUBLIC_APP_URL"],
          message: "PUBLIC_APP_URL must use HTTPS outside local development.",
        });
      }

      if (!environment.ADMIN_DIAGNOSTICS_TOKEN) {
        context.addIssue({
          code: "custom",
          path: ["ADMIN_DIAGNOSTICS_TOKEN"],
          message: "ADMIN_DIAGNOSTICS_TOKEN is required in staging and production.",
        });
      } else if (environment.ADMIN_DIAGNOSTICS_TOKEN.length < 32) {
        context.addIssue({
          code: "custom",
          path: ["ADMIN_DIAGNOSTICS_TOKEN"],
          message: "ADMIN_DIAGNOSTICS_TOKEN must contain at least 32 characters.",
        });
      }
    }

    const hasSupabaseUrl = Boolean(environment.SUPABASE_URL);
    const hasSupabaseKey = Boolean(environment.SUPABASE_ANON_KEY);
    if (hasSupabaseUrl !== hasSupabaseKey) {
      context.addIssue({
        code: "custom",
        path: [hasSupabaseUrl ? "SUPABASE_ANON_KEY" : "SUPABASE_URL"],
        message: "SUPABASE_URL and SUPABASE_ANON_KEY must be configured together.",
      });
    }

    if (environment.PROTOCOL_CATALOG_ANON_KEY && !environment.PROTOCOL_CATALOG_URL) {
      context.addIssue({
        code: "custom",
        path: ["PROTOCOL_CATALOG_URL"],
        message: "PROTOCOL_CATALOG_URL is required with a catalog-specific key.",
      });
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  input: Record<string, string | undefined>,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(input);
}

export const clientEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_ENV: appEnvironmentSchema.default("local"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("ProtoTower"),
});

export type ClientEnvironment = z.infer<typeof clientEnvironmentSchema>;

export function parseClientEnvironment(
  input: Record<string, string | undefined>,
): ClientEnvironment {
  return clientEnvironmentSchema.parse(input);
}
