import { TowerSetupForm } from "@/components/tower-setup-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerPersonalTowerRepository } from "@/lib/personal-towers";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";
import { clipPlainLine } from "@/lib/tower-setup-form";
import { isFeatureEnabled } from "@protostack/configuration";
import { towerIdSchema } from "@protostack/tower-engine";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveFinishedSetup } from "../../product-actions";

export default async function FinishTowerSetupPage(props: {
  params: Promise<{ towerId: string }>;
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const { towerId: rawTowerId } = await props.params;
  const parsedId = towerIdSchema.safeParse(rawTowerId);
  if (!parsedId.success) notFound();

  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous") {
    redirect("/sign-in");
  }
  const searchParams = await props.searchParams;
  const error = typeof searchParams["error"] === "string" ? searchParams["error"] : null;
  const repository = await createServerPersonalTowerRepository();
  const towerResult =
    principal.status === "available" && isFeatureEnabled("outcomes")
      ? await repository.findById(parsedId.data)
      : { status: "unavailable" as const };
  if (towerResult.status === "unavailable") {
    return (
      <main id="main-content">
        <SiteHeader status="Private towers" />
        <section className="tower-shell">
          <div className="state-card" role="status">
            <h1>Tower setup is temporarily unavailable</h1>
            <p>Try again shortly.</p>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }
  const tower = towerResult.value;
  if (!tower) notFound();
  if (tower.protocols.length > 0 || tower.metrics.length > 0) {
    redirect(`/towers/${tower.id}`);
  }

  const catalog = await createServerProtocolCatalogRepository().listPublished();
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
      <SiteHeader status="Private tower" />
      <section className="auth-shell" aria-labelledby="finish-setup-heading">
        <Link className="back-link" href={`/towers/${tower.id}`}>
          ← {tower.title}
        </Link>
        <p className="eyebrow">Finish this tower</p>
        <h1 id="finish-setup-heading">Add protocols and one final.</h1>
        <TowerSetupForm
          action={saveFinishedSetup}
          starters={starters}
          catalogUnavailable={catalog.status === "unavailable"}
          error={error}
          submitLabel="Save tower setup"
          defaultTitle={tower.title}
          towerId={tower.id}
          revision={tower.revision}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
