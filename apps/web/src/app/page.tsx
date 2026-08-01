import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import Link from "next/link";

const capabilities = [
  {
    title: "Versioned protocol catalog",
    status: "Available now · Synthetic and read-only",
  },
  {
    title: "Personal tower builder",
    status: "Available now · Private invite-only alpha",
  },
  {
    title: "Adherence and outcome learning",
    status: "Planned · Not active in Milestone 2",
  },
  {
    title: "Model-neutral interoperability",
    status: "Planned · Not active in Milestone 2",
  },
] as const;

export default function LandingPage() {
  return (
    <main id="main-content">
      <SiteHeader status="Milestone 3" />

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
          <p className="eyebrow">Milestone 3</p>
          <h2 id="foundation-heading">The first trustworthy building blocks.</h2>
          <p>
            Published protocol versions stay immutable, private towers are isolated by owner, and
            public catalog browsing continues independently. Tower titles are private goal labels;
            the catalog remains synthetic educational content.
          </p>
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
