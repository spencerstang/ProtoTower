import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createStarterTower } from "@/app/towers/starter-actions";
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
    redirect("/sign-in");
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
          ProtoTower creates the tower immediately. A reviewed pair of protocols is added when one
          exists. Further questions stay optional.
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
              Examples: Sleep better, Work out 3x/week. A goal with no reviewed pair still creates a
              tower.
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
