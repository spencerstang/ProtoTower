import {
  createBuildInfo,
  createStructuredLogger,
  parseServerEnvironment,
  type LogLevel,
  type ServerEnvironment,
} from "@protostack/configuration";

export const buildInfo = createBuildInfo(process.env);

export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment(process.env);
}

function configuredLogLevel(value: string | undefined): LogLevel {
  return value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
    ? value
    : "info";
}

export const logger = createStructuredLogger({
  minimumLevel: configuredLogLevel(process.env.LOG_LEVEL),
  context: {
    service: "protostack-web",
    environment: process.env.APP_ENV ?? "local",
  },
});

export function requestId(headers: Headers): string {
  return (
    headers.get("cf-ray") ??
    headers.get("x-request-id") ??
    crypto.randomUUID()
  );
}
