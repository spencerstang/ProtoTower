import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getServerEnvironment } from "@/lib/runtime";
import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: "How the ProtoTower open beta handles account and tower data.",
};

export default function PrivacyPage() {
  const supportEmail = getServerEnvironment().PUBLIC_SUPPORT_EMAIL;

  return (
    <main id="main-content">
      <SiteHeader status="Open beta" />
      <article className="legal-shell">
        <p className="eyebrow">Plain-language data notice</p>
        <h1>Privacy in the open beta.</h1>
        <p className="legal-lede">
          ProtoTower stores only the information needed to deliver private goal towers and bounded
          practice check-ins. It does not sell personal data or use advertising, behavioral
          analytics, outcomes scoring, or AI profiling.
        </p>

        <section>
          <h2>What is handled</h2>
          <ul>
            <li>Your account email address is held by the authentication provider.</li>
            <li>
              ProtoTower stores private tower titles, selected protocol versions, and dates you
              deliberately record as practiced.
            </li>
            <li>
              Short-lived authentication cookies keep you signed in. Operational logs are designed
              to exclude email addresses, tower content, tokens, and practice details.
            </li>
          </ul>
        </section>

        <section>
          <h2>Why and where</h2>
          <p>
            This information is used only to provide the service, secure your account, and operate
            the open beta. Cloudflare hosts the application, Supabase provides authentication and
            database storage, and Resend delivers authentication email. Email link and open tracking
            remain disabled.
          </p>
        </section>

        <section>
          <h2>Retention and deletion</h2>
          <p>
            Account data is retained while your account remains active. You may request deletion at
            any time. A verified request will be completed within seven calendar days, including the
            authentication record, towers, tower membership, and practice history, subject only to a
            temporary provider backup lifecycle.
          </p>
          <p>
            Read the <Link href="/account-deletion">account deletion process</Link> for the exact
            steps.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          {supportEmail ? (
            <p>
              Privacy and deletion requests: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
          ) : (
            <p>Use the published ProtoTower support channel for privacy or deletion requests.</p>
          )}
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
