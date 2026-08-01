import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main id="main-content">
      <SiteHeader status="Invite-only alpha" />
      <section className="auth-shell" aria-labelledby="check-email-heading">
        <p className="eyebrow">Request received</p>
        <h1 id="check-email-heading">Check your email.</h1>
        <p>
          If that address has an active invitation, a one-time sign-in link is on its way. The same
          message appears for every address to protect account privacy.
        </p>
        <Link className="secondary-action" href="/sign-in">
          Try another address
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
