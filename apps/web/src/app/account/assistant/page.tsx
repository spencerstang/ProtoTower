import Link from "next/link";
import { getVerifiedPrincipal } from "@/lib/auth";
import { signInPath } from "@/lib/auth-return";
import { redirect, notFound } from "next/navigation";
import { assistantReviewSchema, metricScale } from "@protostack/outcomes-engine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Connect } from "./connect";
import { manage } from "./actions";
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; confirm?: string }>;
}) {
  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous")
    redirect(signInPath("/account/assistant"));
  const client = await createSupabaseServerClient();
  const response = await client?.rpc("manage_tower_assistant", { operation: "list" });
  if (response?.error?.code === "42501") notFound();
  const view = assistantReviewSchema.safeParse(response?.data);
  const action = manage;
  const { result, confirm } = await searchParams;
  const messages: Readonly<Record<string, string>> = {
    approve: "Review saved.",
    decline: "Proposal declined.",
    revoke: "Connection revoked.",
    error: "Could not apply this change. Review the latest Tower and proposal.",
  };
  return (
    <main id="main-content" className="tower-shell">
      <Link href="/towers">My towers</Link>
      <h1>Connect my assistant</h1>
      {view.success ? (
        <>
          <p>
            This connection covers all your current and future Towers. Your assistant can read
            goals, protocols, personal notes and measurement definitions, and can add measurements
            directly or submit them for review.
          </p>
          <p>
            For a tool-enabled assistant, import the{" "}
            <a href="/assistant-openapi.json">API definition</a> and configure Bearer
            authentication.
          </p>
          {result && messages[result] && <p role="status">{messages[result]}</p>}
          <Connect active={view.data.active} />
          {view.data.expires && (
            <section aria-label="Connection details">
              <p>
                Connection expires {view.data.expires.slice(0, 10)} UTC. Last used{" "}
                {view.data.lastUsed?.slice(0, 10) ?? "never"}.
              </p>
              {confirm === "revoke" ? (
                <form action={action}>
                  <h2>Revoke this connection?</h2>
                  <p>Your assistant will immediately lose access to every Tower in your account.</p>
                  <Link href="/account/assistant">Cancel</Link>{" "}
                  <button name="operation" value="revoke">
                    Confirm revocation
                  </button>
                </form>
              ) : (
                <Link href="/account/assistant?confirm=revoke">Revoke connection</Link>
              )}
            </section>
          )}
          <h2>Proposed measurements</h2>
          {!view.data.pending.length && <p>No pending proposals.</p>}
          {view.data.pending.map((p) => (
            <form key={p.id} action={action}>
              <input type="hidden" name="proposal" value={p.id} />
              <input type="hidden" name="tid" value={p.towerId} />
              <p>
                {p.goal} · {p.label} · {metricScale(p.shape, p.unit) ?? p.shape} · optional
              </p>
              {p.stale ? (
                <p>The Tower has changed. Ask your assistant for an updated proposal.</p>
              ) : (
                <button name="operation" value="approve">
                  Approve {p.label}
                </button>
              )}{" "}
              <button name="operation" value="decline">
                Decline {p.label}
              </button>
            </form>
          ))}
        </>
      ) : (
        <p role="status">Assistant connections are temporarily unavailable.</p>
      )}
    </main>
  );
}
