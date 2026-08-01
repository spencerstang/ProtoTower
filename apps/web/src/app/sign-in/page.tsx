import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getSupabaseConnection } from "@/lib/supabase/server";
import { requestMagicLink } from "./actions";

export default async function SignInPage(props: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const searchParams = await props.searchParams;
  const invalid = searchParams["error"] === "invalid";
  const available = Boolean(getSupabaseConnection());

  return (
    <main id="main-content">
      <SiteHeader status="Invite-only alpha" />
      <section className="auth-shell" aria-labelledby="sign-in-heading">
        <p className="eyebrow">Private goal towers</p>
        <h1 id="sign-in-heading">Sign in with your invitation.</h1>
        {available ? (
          <>
            <p>
              Enter the email address that was invited. We will send a one-time link if it is
              eligible; the response here is always the same.
            </p>
            <form action={requestMagicLink} className="stacked-form">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                aria-describedby="email-privacy"
              />
              {invalid ? <p className="form-error">Enter a valid email address.</p> : null}
              <p id="email-privacy" className="form-help">
                Your email is handled by the authentication provider and is not copied into a tower.
              </p>
              <button className="primary-action" type="submit">
                Email me a sign-in link
              </button>
            </form>
          </>
        ) : (
          <div className="state-card" role="status">
            <h2>Sign-in is temporarily unavailable</h2>
            <p>The public catalog and service health remain available.</p>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
