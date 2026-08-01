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
    "A versioned catalog of wellness protocol building blocks for creating a durable tower of great habits.",
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
