import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export const dynamic = "force-dynamic";

export default async function ReminderOptOutPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams["token"] === "string" ? searchParams["token"] : "";
  let turnedOff = false;
  if (tokenPattern.test(token)) {
    const client = await createSupabaseServerClient();
    if (client) {
      const { data } = await client.rpc("opt_out_check_in_reminder", { candidate_token: token });
      turnedOff = data === true;
    }
  }

  return (
    <main id="main-content">
      <SiteHeader status="Reminders" />
      <section className="auth-shell" aria-labelledby="opt-out-heading">
        <h1 id="opt-out-heading">
          {turnedOff ? "Check-in reminders are off." : "This opt-out link is not valid."}
        </h1>
        <p>
          {turnedOff
            ? "ProtoTower will not email a weekly check-in reminder for this link."
            : "The link may be incomplete. Your towers are unchanged."}
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
