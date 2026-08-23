import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import Link from "next/link";

const capabilities = [
  {
    title: "Versioned protocol catalog",
    status: "Available now · Reviewed and read-only",
  },
  {
    title: "Personal tower builder",
    status: "Available now · Private account access",
  },
  {
    title: "Private practice check-ins",
    status: "Available now · Bounded and owner-only",
  },
  {
    title: "Outcomes and aggregate learning",
    status: "Planned · Not active in the beta",
  },
  {
    title: "Model-neutral interoperability",
    status: "Planned · Not active in the beta",
  },
] as const;

export default function LandingPage() {
  return (
    <main id="main-content">
      <SiteHeader status="Open beta" />

      <section className="hero tower-hero">
        <div>
          <p className="eyebrow">Small protocols. Stronger foundations.</p>
          <h1>Build a beautiful tower of great habits.</h1>
          <p className="hero-copy">
            ProtoTower pairs a careful catalog of versioned wellness routines with private,
            goal-specific towers. Keep a sleep routine separate from marathon preparation, while
            reusing the protocol blocks that fit each goal.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" href="/protocols">
              Browse protocols
            </Link>
            <Link className="secondary-action" href="/towers">
              Open my towers
            </Link>
            <a className="secondary-action" href="/api/health">
              Service health
            </a>
          </div>
        </div>

        <div
          className="tower-mark"
          role="img"
          aria-label="Five offset blocks forming a rising tower"
        >
          <span>Explore</span>
          <span>Understand</span>
          <span>Choose</span>
          <span>Practice</span>
          <span>Grow</span>
        </div>
      </section>

      <section className="foundation" id="foundation" aria-labelledby="foundation-heading">
        <div>
          <p className="eyebrow">Quiet-launch beta</p>
          <h2 id="foundation-heading">The first trustworthy building blocks.</h2>
          <p>
            Published protocol versions stay immutable, towers and practice history are isolated by
            owner, and public catalog browsing continues independently. A check-in means only what
            its owner chose to record; it is never an outcome or proof of adherence.
          </p>
          <p>We are still testing ProtoTower, and some features are not functional yet.</p>
        </div>
        <ul className="capability-grid">
          {capabilities.map((capability) => (
            <li key={capability.title}>
              {capability.title}
              <span>{capability.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter />
    </main>
  );
}
