import { isDiagnosticsRequestAllowed } from "@/lib/diagnostics";
import { planWeeklyReminderJob } from "@/lib/weekly-reminder-job";
import { getServerEnvironment, logger, requestId } from "@/lib/runtime";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const id = requestId(request.headers);
  let environment;
  try {
    environment = getServerEnvironment();
  } catch (error: unknown) {
    logger.error("invalid_environment_configuration", { requestId: id, error });
    return NextResponse.json(
      { error: "service_unavailable", requestId: id },
      { status: 503, headers: { "cache-control": "no-store", "x-request-id": id } },
    );
  }

  if (
    !isDiagnosticsRequestAllowed({
      environment,
      authorizationHeader: request.headers.get("authorization"),
    })
  ) {
    return NextResponse.json(
      { error: "not_found", requestId: id },
      { status: 404, headers: { "cache-control": "no-store", "x-request-id": id } },
    );
  }

  const plan = planWeeklyReminderJob();
  logger.info("weekly_check_in_reminder_job", { requestId: id, reason: plan.reason });
  return NextResponse.json(
    { ...plan, requestId: id },
    { headers: { "cache-control": "no-store", "x-request-id": id } },
  );
}
