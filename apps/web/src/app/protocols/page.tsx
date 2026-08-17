import { ProtocolCatalogView } from "@/components/protocol-views";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerPersonalTowerRepository } from "@/lib/personal-towers";

export const dynamic = "force-dynamic";

export default async function ProtocolCatalogPage() {
  const result = await createServerProtocolCatalogRepository().listPublished();
  const principal = await getVerifiedPrincipal();
  const towerResult =
    principal.status === "available" && principal.principal.kind === "authenticated"
      ? await (await createServerPersonalTowerRepository()).list()
      : null;
  const towers = towerResult?.status === "available" ? towerResult.value : [];

  return (
    <main id="main-content">
      <SiteHeader />
      <header className="catalog-hero">
        <p className="eyebrow">The protocol catalog</p>
        <h1>Choose the first blocks for a better habit tower.</h1>
        <p>
          Explore reviewed, versioned wellness routines. Every published version is read-only, so
          the steps you see cannot silently change beneath you.
        </p>
      </header>
      <section className="catalog-content" aria-label="Catalog results">
        <ProtocolCatalogView result={result} towers={towers} />
      </section>
      <SiteFooter />
    </main>
  );
}
