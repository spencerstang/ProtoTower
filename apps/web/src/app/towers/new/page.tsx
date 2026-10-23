import { TowerSetupForm } from "@/components/tower-setup-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";
import { clipPlainLine } from "@/lib/tower-setup-form";
import { isFeatureEnabled } from "@protostack/configuration";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createConfiguredTower } from "../product-actions";

export default async function NewTowerPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous") {
    redirect("/sign-in");
  }
  const searchParams = await props.searchParams;
  const error = typeof searchParams["error"] === "string" ? searchParams["error"] : null;
  const outcomesEnabled = isFeatureEnabled("outcomes");
  const catalog =
    principal.status === "available" && outcomesEnabled
      ? await createServerProtocolCatalogRepository().listPublished()
      : { status: "unavailable" as const };
  const starters =
    catalog.status === "available"
      ? catalog.value.map((protocol) => ({
          id: protocol.id,
          version: protocol.version,
          title: protocol.title,
          howTo: clipPlainLine(protocol.summary),
        }))
      : [];

  return (
    <main id="main-content">
      <SiteHeader status="Private towers" />
      <section className="auth-shell" aria-labelledby="new-tower-heading">
        <Link className="back-link" href="/towers">
          ← All towers
        </Link>
        <p className="eyebrow">About two minutes</p>
        <h1 id="new-tower-heading">Build your tower.</h1>
        <p>
          Name it, choose 1–3 protocols, add one final outcome, then keep the weekly private rhythm.
        </p>
        {principal.status === "unavailable" || !outcomesEnabled ? (
          <div className="state-card" role="status">
            <h2>Tower creation is temporarily unavailable</h2>
            <p>Try again shortly.</p>
          </div>
        ) : (
          <TowerSetupForm
            action={createConfiguredTower}
            starters={starters}
            catalogUnavailable={catalog.status === "unavailable"}
            error={error}
            submitLabel="Create tower"
          />
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
