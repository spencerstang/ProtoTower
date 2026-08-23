import { cookies } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { authIntakeCookieName, parseAuthIntakeCookie } from "@/lib/auth-intake";
import { confirmMagicLink } from "./actions";

export default async function ConfirmPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const canConfirm = Boolean(parseAuthIntakeCookie(cookieStore.get(authIntakeCookieName)?.value));
  const failed = searchParams["error"] === "invalid" || !canConfirm;

  return (
    <main id="main-content">
      <SiteHeader status="Secure confirmation" />
      <section className="auth-shell" aria-labelledby="confirm-heading">
        <p className="eyebrow">One deliberate step</p>
        <h1 id="confirm-heading">Confirm sign-in.</h1>
        {failed ? (
          <div className="state-card" role="alert">
            <h2>This sign-in link cannot be confirmed</h2>
            <p>It may be expired, already used, or incomplete. Request a fresh link to continue.</p>
            <a className="secondary-action" href="/sign-in">
              Request another link
            </a>
          </div>
        ) : (
          <>
            <p>
              Continue only if you requested this link. Opening the email alone did not sign you in.
            </p>
            <form action={confirmMagicLink}>
              <button className="primary-action" type="submit">
                Confirm and open my towers
              </button>
            </form>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
