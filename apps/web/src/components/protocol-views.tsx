import type { CatalogQueryResult, PublishedProtocol } from "@protostack/protocol-engine";
import { UnavailableState } from "@protostack/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PersonalTower } from "@protostack/tower-engine";
import { addProtocolToSelectedTower } from "@/app/towers/actions";

export function ProtocolCatalogView(
  props: Readonly<{
    result: CatalogQueryResult<readonly PublishedProtocol[]>;
    towers?: readonly PersonalTower[];
  }>,
): ReactNode {
  if (props.result.status === "unavailable") {
    return (
      <UnavailableState
        title="The protocol catalog is resting"
        description="The optional catalog service could not be reached. ProtoTower’s home page and health endpoint remain available, and no data was changed."
        action={
          <Link className="secondary-action" href="/">
            Return home
          </Link>
        }
      />
    );
  }

  if (props.result.value.length === 0) {
    return (
      <section className="catalog-empty" role="status">
        <p className="eyebrow">Read-only catalog</p>
        <h2>No published protocols yet</h2>
        <p>Reviewed building blocks will appear here when they are ready for publication.</p>
      </section>
    );
  }

  return (
    <ul className="protocol-grid" aria-label="Published protocols">
      {props.result.value.map((protocol) => (
        <li key={protocol.id}>
          <article className="protocol-card">
            <div className="protocol-card-meta">
              <span>Version {protocol.version}</span>
              <span>{protocol.steps.length} steps</span>
            </div>
            <h2>{protocol.title}</h2>
            <p>{protocol.summary}</p>
            <Link
              className="card-link"
              href={`/protocols/${protocol.slug}`}
              aria-label={`Open ${protocol.title}`}
            >
              View this building block <span aria-hidden="true">→</span>
            </Link>
            {props.towers && props.towers.length > 0 ? (
              <form action={addProtocolToSelectedTower} className="catalog-add-form">
                <input type="hidden" name="protocolId" value={protocol.id} />
                <label htmlFor={`destination-${protocol.id}`}>Add to a private tower</label>
                <select id={`destination-${protocol.id}`} name="destination">
                  {props.towers.map((tower) => (
                    <option key={tower.id} value={`${tower.id}:${tower.revision}`}>
                      {tower.title}
                    </option>
                  ))}
                </select>
                <button className="secondary-action" type="submit">
                  Add protocol
                </button>
              </form>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}

export function ProtocolDetailView(props: Readonly<{ protocol: PublishedProtocol }>): ReactNode {
  const { protocol } = props;
  const publishedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(protocol.publishedAt));

  return (
    <article className="protocol-detail">
      <header className="protocol-detail-header">
        <Link className="back-link" href="/protocols">
          <span aria-hidden="true">←</span> All protocols
        </Link>
        <p className="eyebrow">Published building block · Version {protocol.version}</p>
        <h1>{protocol.title}</h1>
        <p className="detail-summary">{protocol.summary}</p>
        <p className="published-date">Published {publishedDate}</p>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading">Overview</h2>
            <p>{protocol.overview}</p>
          </section>

          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading">Build it, one level at a time</h2>
            <ol className="step-list">
              {protocol.steps.map((step) => (
                <li key={step.position}>
                  <span className="step-number" aria-hidden="true">
                    {step.position}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="detail-aside" aria-label="Protocol safety and references">
          <section className="caution-card" aria-labelledby="cautions-heading">
            <p className="eyebrow">Use good judgment</p>
            <h2 id="cautions-heading">Cautions</h2>
            <ul>
              {protocol.cautions.map((caution) => (
                <li key={caution}>{caution}</li>
              ))}
            </ul>
          </section>

          {protocol.references.length > 0 ? (
            <section className="reference-card" aria-labelledby="references-heading">
              <h2 id="references-heading">References</h2>
              <ul>
                {protocol.references.map((reference) => (
                  <li key={reference.url}>
                    <a href={reference.url} rel="noreferrer">
                      {reference.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="educational-note">
            General educational wellness information—not medical advice or an individualized
            recommendation.
          </p>
        </aside>
      </div>
    </article>
  );
}
