import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createStarterTower } from "@/app/towers/starter-actions";
import { signInPath } from "@/lib/auth-return";
import { getVerifiedPrincipal } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const startErrors = {
  invalid: "Use one line of plain text, up to 160 characters.",
  limit: "The twelve-tower limit has been reached.",
  unavailable: "Tower creation is temporarily unavailable.",
} as const;

export default async function NewTowerPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous") {
    redirect(signInPath("/towers/new"));
  }
  const searchParams = await props.searchParams;
  const errorCode = typeof searchParams["error"] === "string" ? searchParams["error"] : null;
  const error =
    errorCode && errorCode in startErrors
      ? startErrors[errorCode as keyof typeof startErrors]
      : null;

  return (
    <main id="main-content">
      <SiteHeader status="Private towers" />
      <section className="auth-shell" aria-labelledby="new-tower-heading">
        <Link className="back-link" href="/towers">
          ← All towers
        </Link>
        <p className="eyebrow">One question</p>
        <h1 id="new-tower-heading">What would you like to accomplish?</h1>
        <p>
          ProtoTower saves your goal as a private tower. Automatic starter matches currently cover
          sleep, training, and training with heat exposure. Other goals need you to add a plan
          yourself; ProtoTower does not generate a treatment plan.
        </p>
        {principal.status === "unavailable" ? (
          <div className="state-card" role="status">
            <h2>Tower creation is temporarily unavailable</h2>
            <p>Try again shortly.</p>
          </div>
        ) : (
          <form action={createStarterTower} className="stacked-form">
            <label htmlFor="intent">What would you like to accomplish?</label>
            <input id="intent" name="intent" maxLength={160} required autoFocus />
            <p className="form-help">
              Examples: Sleep better, Work out 3x/week. If there is no match, you can set up the
              saved tower yourself.
            </p>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="primary-action" type="submit">
              Start
            </button>
          </form>
        )}
        <p>
          <Link href="/towers/new/detailed">Choose protocols yourself instead</Link>
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
