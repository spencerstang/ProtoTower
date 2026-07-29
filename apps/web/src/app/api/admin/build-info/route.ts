import { NextResponse } from "next/server";
import type { ServerEnvironment } from "@protostack/configuration";
import { isDiagnosticsRequestAllowed } from "@/lib/diagnostics";
import { buildInfo, getServerEnvironment, logger, requestId } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const id = requestId(request.headers);
  let environment: ServerEnvironment;

  try {
    environment = getServerEnvironment();
  } catch (error: unknown) {
    logger.error("invalid_environment_configuration", {
      requestId: id,
      error,
    });
    return NextResponse.json(
      { error: "service_unavailable", requestId: id },
      {
        status: 503,
        headers: { "cache-control": "no-store", "x-request-id": id },
      },
    );
  }

  const allowed = isDiagnosticsRequestAllowed({
    environment,
    authorizationHeader: request.headers.get("authorization"),
  });
  if (!allowed) {
    logger.warn("diagnostics_access_denied", { requestId: id });
    return NextResponse.json(
      { error: "not_found", requestId: id },
      {
        status: 404,
        headers: { "cache-control": "no-store", "x-request-id": id },
      },
    );
  }

  logger.info("diagnostics_accessed", { requestId: id });
  return NextResponse.json(
    { ...buildInfo, requestId: id },
    { headers: { "cache-control": "no-store", "x-request-id": id } },
  );
}
