export type BuildInfo = Readonly<{
  version: string;
  gitSha: string;
  builtAt: string | null;
  environment: string;
}>;

export function createBuildInfo(input: Record<string, string | undefined>): BuildInfo {
  return {
    version: input["APP_VERSION"] ?? "0.1.0-dev",
    gitSha: input["GIT_SHA"] ?? "unknown",
    builtAt: input["BUILD_TIME"] ?? null,
    environment: input["APP_ENV"] ?? "local",
  };
}
