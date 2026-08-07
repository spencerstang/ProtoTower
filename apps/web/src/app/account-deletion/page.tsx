import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getServerEnvironment } from "@/lib/runtime";
import Link from "next/link";

export const metadata = {
  title: "Account deletion",
  description: "How invited ProtoTower users request deletion of their account and private data.",
};

export default function AccountDeletionPage() {
  const supportEmail = getServerEnvironment().PUBLIC_SUPPORT_EMAIL;

  return (
    <main id="main-content">
      <SiteHeader status="Invite-only beta" />
      <article className="legal-shell">
        <p className="eyebrow">Your account</p>
        <h1>Request complete account deletion.</h1>
        <p className="legal-lede">
          The invite-only beta uses a verified, operator-assisted deletion process. You do not need
          to include tower titles, practice dates, tokens, or other private content in your request.
        </p>

        <section>
          <h2>How to request deletion</h2>
          <ol>
            <li>
              {supportEmail ? (
                <>
                  Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> from the address used
                  for your invitation and ask to delete your ProtoTower account.
                </>
              ) : (
                <>Contact the person who invited you and ask to delete your ProtoTower account.</>
              )}
            </li>
            <li>Complete the private ownership-verification step sent by the operator.</li>
            <li>
              Receive confirmation after deletion is verified, no later than seven calendar days
              after a valid request.
            </li>
          </ol>
        </section>

        <section>
          <h2>What deletion covers</h2>
          <p>
            Deleting the authentication account cascades through owned towers, protocol membership,
            and practice history. ProtoTower does not retain a separate profile or advertising
            identity. Provider backups may retain copies temporarily until their normal backup
            lifecycle expires. Backup access is restricted to recovery and controlled restore
            verification.
          </p>
        </section>

        <p>
          Return to the <Link href="/privacy">privacy notice</Link>.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
