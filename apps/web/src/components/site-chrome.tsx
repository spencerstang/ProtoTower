import { StatusPill } from "@protostack/ui";
import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader(props: Readonly<{ status?: ReactNode }>): ReactNode {
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
        <Link className="nav-link" href="/sign-in">
          Sign in
        </Link>
        <StatusPill>{props.status ?? "Read-only catalog"}</StatusPill>
      </div>
    </nav>
  );
}

export function SiteFooter(): ReactNode {
  return (
    <footer>
      <span>ProtoTower</span>
      <span>Private goal towers · Synthetic educational protocols</span>
    </footer>
  );
}
