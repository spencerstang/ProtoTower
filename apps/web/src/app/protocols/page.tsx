import { ProtocolCatalogView } from "@/components/protocol-views";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";

export const dynamic = "force-dynamic";

export default async function ProtocolCatalogPage() {
  const result = await createServerProtocolCatalogRepository().listPublished();

  return (
    <main id="main-content">
      <SiteHeader />
      <header className="catalog-hero">
        <p className="eyebrow">The protocol catalog</p>
        <h1>Choose the first blocks for a better habit tower.</h1>
        <p>
          Explore synthetic, versioned wellness routines. Every published version is read-only, so
          the steps you see cannot silently change beneath you.
        </p>
      </header>
      <section className="catalog-content" aria-label="Catalog results">
        <ProtocolCatalogView result={result} />
      </section>
      <SiteFooter />
    </main>
  );
}
