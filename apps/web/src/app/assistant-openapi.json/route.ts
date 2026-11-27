import { getServerEnvironment } from "@/lib/runtime";
import definition from "./definition.json";

export const dynamic = "force-dynamic";

export function GET() {
  const publicUrl = getServerEnvironment().PUBLIC_APP_URL;
  return Response.json({
    ...definition,
    servers: [{ url: publicUrl ? new URL(publicUrl).origin : "/" }],
  });
}
