import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// A per-response CSP nonce requires every document to be rendered for that request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "ProtoTower",
    template: "%s · ProtoTower",
  },
  description:
    "Explore sourced protocols, build a private tower around a goal and track your outcomes.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
