import { NextResponse } from "next/server";
import { logger, requestId } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const id = requestId(request.headers);
  logger.debug("health_check", { requestId: id, path: "/api/health" });
  return NextResponse.json(
    { status: "ok", checkedAt: new Date().toISOString(), requestId: id },
    { status: 200, headers: { "cache-control": "no-store", "x-request-id": id } },
  );
}
