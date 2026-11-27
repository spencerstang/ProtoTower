import { createClient } from "@supabase/supabase-js";
import type { Database } from "@protostack/database";
import {
  measurementProposalSchema,
  assistantProposalReceipt,
  assistantTowerList,
  assistantTowerSnapshot,
} from "@protostack/outcomes-engine";
import { getSupabaseConnection } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
function reply(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization" },
  });
}

async function handle(request: Request, propose: boolean) {
  const token = /^Bearer (pta_[0-9a-f]{64})$/i.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) return reply({ error: "invalid_connection" }, 401);
  const connection = getSupabaseConnection();
  if (!connection) return reply({ error: "service_unavailable" }, 503);
  const client = createClient<Database>(connection.url, connection.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tid = new URL(request.url).searchParams.get("towerId");
  if (
    (propose && !tid) ||
    (tid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tid))
  )
    return reply({ error: "invalid_tower_id" }, 400);
  let payload;
  if (propose) {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply({ error: "expected_json" }, 415);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "missing_proposal" }, 400);
    const chunks: number[] = [];
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        if (chunks.length + item.value.length > 2048) {
          await reader.cancel();
          return reply({ error: "proposal_too_large" }, 413);
        }
        chunks.push(...item.value);
      }
      const parsed = measurementProposalSchema.safeParse(
        JSON.parse(new TextDecoder().decode(new Uint8Array(chunks))),
      );
      if (!parsed.success)
        return reply(
          {
            error: "invalid_measurement",
            fields: parsed.error.issues.map((i) => i.path.join(".")),
          },
          400,
        );
      payload = parsed.data;
    } catch {
      return reply({ error: "invalid_json" }, 400);
    }
  }
  const { data, error } = await client.rpc("use_tower_assistant", {
    credential: token,
    ...(tid ? { tid } : {}),
    ...(payload ? { payload } : {}),
  });
  if (error) {
    if (error.code === "P0002") return reply({ error: "unknown_tower" }, 404);
    if (error.code === "42501") return reply({ error: "invalid_connection" }, 401);
    if (error.code === "40001") return reply({ error: "revision_or_request_conflict" }, 409);
    if (error.code === "54000") return reply({ error: "connection_proposal_limit" }, 429);
    if (["23514", "22P02"].includes(error.code))
      return reply({ error: "invalid_measurement" }, 400);
    return reply({ error: "service_unavailable" }, 503);
  }
  const result = propose
    ? assistantProposalReceipt.safeParse(data)
    : tid
      ? assistantTowerSnapshot.safeParse(data)
      : assistantTowerList.safeParse(data);
  if (!result.success) return reply({ error: "invalid_service_response" }, 502);
  return reply(result.data, 200);
}
export function GET(request: Request) {
  return handle(request, false);
}
export function POST(request: Request) {
  return handle(request, true);
}
