import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { signOut } from "@/app/account/actions";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerPersonalTowerRepository } from "@/lib/personal-towers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TowersPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const searchParams = await props.searchParams;
  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous") {
    redirect("/sign-in");
  }
  const result =
    principal.status === "available"
      ? await (await createServerPersonalTowerRepository()).list()
      : { status: "unavailable" as const };

  return (
    <main id="main-content">
      <SiteHeader status="Private towers" />
      <section className="tower-shell" aria-labelledby="towers-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your goals, separated clearly</p>
            <h1 id="towers-heading">Personal towers.</h1>
          </div>
          <div className="hero-actions">
            <Link className="primary-action" href="/towers/new">
              Create a tower
            </Link>
            <form action={signOut}>
              <button className="secondary-action" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        {searchParams["status"] === "deleted" ? (
          <p className="notice" role="status">
            Tower deleted.
          </p>
        ) : null}
        {searchParams["error"] === "not-found" ? (
          <p className="notice notice-error" role="alert">
            That tower was not found.
          </p>
        ) : null}
        {result.status === "unavailable" ? (
          <div className="state-card" role="status">
            <h2>Your towers are temporarily unavailable</h2>
            <p>Your public protocol catalog remains available. Try again shortly.</p>
          </div>
        ) : result.value.length === 0 ? (
          <div className="state-card tower-empty">
            <h2>Start with one goal.</h2>
            <p>
              A sleep routine and marathon preparation belong in different towers. Create the goal
              context first, then choose its protocol blocks.
            </p>
            <Link className="primary-action" href="/towers/new">
              Create your first tower
            </Link>
          </div>
        ) : (
          <ul className="tower-grid">
            {result.value.map((tower) => (
              <li key={tower.id}>
                <Link href={`/towers/${tower.id}`}>
                  <span>{tower.title}</span>
                  <small>
                    {tower.items.length} {tower.items.length === 1 ? "protocol" : "protocols"}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
