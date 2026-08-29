import { savePseudonym } from "@/app/account/actions";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createServerAccountProfileRepository } from "@/lib/account-profile";
import { getVerifiedPrincipal } from "@/lib/auth";
import { DEFAULT_PSEUDONYM_SUGGESTIONS } from "@protostack/authorization";
import { redirect } from "next/navigation";
import { PseudonymField } from "./pseudonym-field";

export default async function AccountPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const searchParams = await props.searchParams;
  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous") {
    redirect("/sign-in");
  }
  const result =
    principal.status === "available"
      ? await (await createServerAccountProfileRepository()).get()
      : { status: "unavailable" as const };

  return (
    <main id="main-content">
      <SiteHeader status="Private account" />
      <section className="auth-shell account-shell" aria-labelledby="account-heading">
        <p className="eyebrow">Your private identity</p>
        <h1 id="account-heading">Choose how ProtoTower addresses you.</h1>
        <p>
          Use a pseudonym instead of your legal name. It stays private for now and is not a public
          handle, search key, or proof of identity.
        </p>
        {searchParams["error"] === "invalid" ? (
          <p className="notice notice-error" role="alert">
            Use 3–40 letters or numbers. Spaces, apostrophes, and hyphens are welcome.
          </p>
        ) : null}
        {searchParams["error"] === "stale" ? (
          <p className="notice notice-error" role="alert">
            Your account changed in another tab. Refresh and try again.
          </p>
        ) : null}
        {result.status === "unavailable" ? (
          <div className="state-card" role="status">
            <h2>Account settings are temporarily unavailable</h2>
            <p>Try again shortly. Your sign-in and towers are unaffected.</p>
          </div>
        ) : (
          <form className="stacked-form" action={savePseudonym}>
            <PseudonymField
              initialValue={result.value?.pseudonym ?? DEFAULT_PSEUDONYM_SUGGESTIONS[0]}
              suggestions={DEFAULT_PSEUDONYM_SUGGESTIONS}
            />
            <input name="revision" type="hidden" value={result.value?.revision ?? ""} />
            <p className="form-help">Choose a suggestion or make your own.</p>
            <button className="primary-action" type="submit">
              {result.value ? "Save pseudonym" : "Use this pseudonym"}
            </button>
            {searchParams["status"] === "saved" ? (
              <p className="notice notice-success" role="status">
                ✓ Pseudonym saved. ProtoTower will address you as {result.value?.pseudonym}.
              </p>
            ) : null}
          </form>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
