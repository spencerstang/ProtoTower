import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getVerifiedPrincipal } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTower } from "../actions";

export default async function NewTowerPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous") {
    redirect("/sign-in");
  }
  const searchParams = await props.searchParams;
  const error = typeof searchParams["error"] === "string" ? searchParams["error"] : null;

  return (
    <main id="main-content">
      <SiteHeader status="Private towers" />
      <section className="auth-shell" aria-labelledby="new-tower-heading">
        <Link className="back-link" href="/towers">
          ← All towers
        </Link>
        <p className="eyebrow">One tower, one goal context</p>
        <h1 id="new-tower-heading">Name your tower.</h1>
        {principal.status === "unavailable" ? (
          <div className="state-card" role="status">
            <h2>Tower creation is temporarily unavailable</h2>
            <p>Try again shortly.</p>
          </div>
        ) : (
          <form action={createTower} className="stacked-form">
            <label htmlFor="title">Goal or context</label>
            <input id="title" name="title" maxLength={80} required autoFocus />
            <p className="form-help">Examples: Sleep better, Run a marathon, Calm workdays.</p>
            {error === "invalid" ? (
              <p className="form-error" role="alert">
                Use 1–80 plain-text characters.
              </p>
            ) : null}
            {error === "limit" ? (
              <p className="form-error" role="alert">
                The twelve-tower limit has been reached.
              </p>
            ) : null}
            {error === "unavailable" ? (
              <p className="form-error" role="alert">
                Tower creation is temporarily unavailable.
              </p>
            ) : null}
            <button className="primary-action" type="submit">
              Create tower
            </button>
          </form>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
