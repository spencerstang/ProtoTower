import { ProtocolDetailView } from "@/components/protocol-views";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";
import { parseProtocolSlug } from "@protostack/protocol-engine";
import { UnavailableState } from "@protostack/ui";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProtocolDetailPage(
  props: Readonly<{ params: Promise<{ slug: string }> }>,
) {
  const { slug: untrustedSlug } = await props.params;
  let slug;
  try {
    slug = parseProtocolSlug(untrustedSlug);
  } catch {
    notFound();
  }

  const result = await createServerProtocolCatalogRepository().findPublishedBySlug(slug);
  if (result.status === "unavailable") {
    return (
      <main id="main-content">
        <SiteHeader />
        <UnavailableState
          title="This protocol could not be loaded"
          description="The optional catalog service is temporarily unavailable. No data was changed."
          action={
            <Link className="secondary-action" href="/protocols">
              Return to the catalog
            </Link>
          }
        />
        <SiteFooter />
      </main>
    );
  }

  if (result.value === null) notFound();

  return (
    <main id="main-content">
      <SiteHeader />
      <ProtocolDetailView protocol={result.value} />
      <SiteFooter />
    </main>
  );
}
