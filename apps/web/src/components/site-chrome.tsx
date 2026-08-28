import { signOut } from "@/app/account/actions";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerAccountProfileRepository } from "@/lib/account-profile";
import { StatusPill } from "@protostack/ui";
import Link from "next/link";
import type { ReactNode } from "react";

async function AccountNavigation(): Promise<ReactNode> {
  const result = await getVerifiedPrincipal();
  if (result.status === "available" && result.principal.kind === "authenticated") {
    const profile = await (await createServerAccountProfileRepository()).get();
    const label =
      profile.status === "available" ? (profile.value?.pseudonym ?? "Account") : "Account";
    return (
      <details className="account-menu">
        <summary>{label}</summary>
        <div className="account-menu-panel">
          <Link className="nav-link" href="/account">
            Account settings
          </Link>
          <form action={signOut}>
            <button className="nav-link account-menu-action" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </details>
    );
  }
  if (result.status === "unavailable") {
    return <span className="account-unavailable">Account unavailable</span>;
  }
  return (
    <Link className="nav-link" href="/sign-in">
      Sign in
    </Link>
  );
}

export async function SiteHeader(props: Readonly<{ status?: ReactNode }>): Promise<ReactNode> {
  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <Link className="wordmark" href="/">
        ProtoTower
      </Link>
      <div className="nav-actions">
        <Link className="nav-link" href="/protocols">
          Protocols
        </Link>
        <Link className="nav-link" href="/towers">
          My towers
        </Link>
        <AccountNavigation />
        <StatusPill>{props.status ?? "Read-only catalog"}</StatusPill>
      </div>
    </nav>
  );
}

export function SiteFooter(): ReactNode {
  return (
    <footer>
      <div>
        <span>ProtoTower</span>
        <span>Private goal towers · Versioned educational protocols</span>
      </div>
      <nav className="footer-links" aria-label="Privacy and account information">
        <Link href="/privacy">Privacy</Link>
        <Link href="/account-deletion">Delete my account</Link>
      </nav>
    </footer>
  );
}
