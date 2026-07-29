import { StatusPill } from "@protostack/ui";

const futureCapabilities = [
  "Versioned protocol library",
  "Adherence and outcome tracking",
  "AI-ready exports and prompts",
  "Aggregate evidence intelligence",
];

export default function LandingPage() {
  return (
    <main id="main-content">
      <nav className="site-nav" aria-label="Primary navigation">
        <span className="wordmark">ProtoStack</span>
        <StatusPill>Foundation online</StatusPill>
      </nav>

      <section className="hero">
        <p className="eyebrow">Health protocols, evaluated with discipline</p>
        <h1>Build a clearer picture of what you try—and what actually helps.</h1>
        <p className="hero-copy">
          ProtoStack is being built as a model-neutral workspace for
          self-directed adults to discover, combine, track, and evaluate health
          and wellness protocols without locking the core product to any AI,
          analytics, email, hosting, or database provider.
        </p>
        <div className="hero-actions">
          <a className="primary-action" href="#foundation">
            See the foundation
          </a>
          <a className="secondary-action" href="/api/health">
            Service health
          </a>
        </div>
      </section>

      <section
        className="foundation"
        id="foundation"
        aria-labelledby="foundation-heading"
      >
        <div>
          <p className="eyebrow">Milestone 1</p>
          <h2 id="foundation-heading">
            A production-ready base, before product complexity.
          </h2>
          <p>
            The initial repository focuses on deployment portability, strict
            validation, version-controlled migrations, protected diagnostics,
            structured logging, automated checks, and disabled-by-default
            feature boundaries.
          </p>
        </div>
        <ul className="capability-grid">
          {futureCapabilities.map((capability) => (
            <li key={capability}>
              {capability}
              <span>Planned—disabled in Milestone 1</span>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <span>ProtoStack</span>
        <span>Production foundation · No real user data</span>
      </footer>
    </main>
  );
}
