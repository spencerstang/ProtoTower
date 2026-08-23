import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main id="main-content">
      <SiteHeader status="Open beta" />
      <section className="auth-shell" aria-labelledby="check-email-heading">
        <p className="eyebrow">Request received</p>
        <h1 id="check-email-heading">Check your email.</h1>
        <p>
          A one-time link is on its way. It will create your account on first use or sign you back
          in. The email also explains the current beta limitations.
        </p>
        <Link className="secondary-action" href="/sign-in">
          Try another address
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
