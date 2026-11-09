import type { StarterSurface } from "@/lib/starter-surface";
import { recordStarterAdherence, recordStarterOutcome } from "@/app/towers/starter-actions";
import type { PersonalTower } from "@protostack/tower-engine";
import Link from "next/link";

const adherenceChoices = [
  ["done", "Did this"],
  ["not_this_period", "Not this week"],
  ["skipped", "Skip"],
] as const;

export function StarterTowerPanel(props: { tower: PersonalTower; surface: StarterSurface }) {
  const { surface } = props;
  const protocols = [surface.primary, surface.secondary].flatMap((protocol) =>
    protocol ? [protocol] : [],
  );
  const unmatched = props.tower.starterMatchKey === "unmatched";

  return (
    <div className="starter-panel">
      {unmatched ? (
        <section aria-labelledby="starter-unmatched">
          <h2 id="starter-unmatched">No reviewed pair yet</h2>
          <p>
            No reviewed protocol pair exists for this yet. ProtoTower did not add a protocol or a
            first action.
          </p>
        </section>
      ) : (
        <>
          {surface.overlapNote ? <p>{surface.overlapNote}</p> : null}
          <section aria-labelledby="starter-protocols">
            <h2 id="starter-protocols">Protocols</h2>
            <ul className="owned-protocol-list">
              {protocols.map((protocol) => (
                <li key={protocol.id}>
                  <h3>
                    <Link href={`/protocols/${protocol.slug}`}>{protocol.title}</Link>
                  </h3>
                  <p className="form-help">Published version {protocol.version}.</p>
                </li>
              ))}
            </ul>
            {props.tower.starterMatchKey === "training" ? (
              <p>A second reviewed protocol was not added.</p>
            ) : null}
          </section>

          {surface.showCautions ? (
            <section aria-labelledby="starter-cautions">
              <h2 id="starter-cautions">Cautions from the sauna routine</h2>
              <ul>
                {surface.cautionLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {surface.primary ? (
            <section className="first-action" aria-labelledby="starter-first-action">
              <p className="eyebrow">First action</p>
              <h2 id="starter-first-action">{surface.primary.stepTitle}</h2>
              <p>This is the first step of the published routine.</p>
              <p>{surface.primary.stepDescription}</p>
            </section>
          ) : null}

          <section className="check-in" aria-labelledby="starter-adherence">
            <p className="eyebrow">Practice, separate from outcomes</p>
            <h2 id="starter-adherence">This week</h2>
            <form action={recordStarterAdherence} className="stacked-form">
              <input type="hidden" name="towerId" value={props.tower.id} />
              {protocols.map((protocol) => {
                const saved = surface.adherence.find((mark) => mark.protocolId === protocol.id);
                return (
                  <fieldset key={protocol.id}>
                    <legend>{protocol.title}</legend>
                    {adherenceChoices.map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={`mark.${protocol.id}`}
                          value={value}
                          defaultChecked={saved?.status === value}
                          required
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                );
              })}
              <button className="primary-action" type="submit">
                Save practice
              </button>
            </form>
          </section>

          {surface.metricLabel ? (
            <section className="check-in" aria-labelledby="starter-outcome">
              <p className="eyebrow">Outcome, separate from practice</p>
              <h2 id="starter-outcome">Outcome this week</h2>
              <form action={recordStarterOutcome} className="stacked-form">
                <input type="hidden" name="towerId" value={props.tower.id} />
                <label htmlFor="starter-outcome-note">{surface.metricLabel}</label>
                <textarea
                  id="starter-outcome-note"
                  name="note"
                  maxLength={280}
                  rows={3}
                  defaultValue={surface.outcomeSkipped ? "" : (surface.outcomeText ?? "")}
                />
                <p className="form-help">Leave this blank to skip it. This is not a score.</p>
                <button className="primary-action" type="submit">
                  Save outcome
                </button>
              </form>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
