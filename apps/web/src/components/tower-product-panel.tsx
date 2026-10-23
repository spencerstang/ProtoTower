import {
  maximumMetricsPerTower,
  metricPresets,
  metricReadingLine,
  parseMetricSubmission,
  type MetricReading,
} from "@protostack/outcomes-engine";
import { summarizeCheckIn } from "@protostack/tracking-engine";
import {
  cadenceChoiceLabels,
  cadencePeriodLabels,
  maximumTowerProtocols,
  visibilityLabel,
  type PersonalTower,
  type TowerCadence,
} from "@protostack/tower-engine";
import type { StoredTowerCheckIn } from "@/lib/tower-checkins";
import {
  addCustomMetric,
  addCustomTowerProtocol,
  addPresetMetric,
  addStarterTowerProtocol,
  recordTowerCheckIn,
  removeTowerMetric,
  removeTowerProtocol,
  saveTowerDefinition,
  saveTowerProtocol,
  saveTowerRhythm,
  saveTowerVisibility,
} from "@/app/towers/product-actions";
import type { SetupStarter } from "./tower-setup-form";

const customShapes = [
  ["ongoing:weight", "Ongoing · weight"],
  ["ongoing:rating", "Ongoing · rating from 1 to 5"],
  ["ongoing:blood_pressure", "Ongoing · blood pressure"],
  ["ongoing:qualitative", "Ongoing · short note"],
  ["proxy:count", "Proxy · count"],
  ["proxy:hours", "Proxy · hours"],
  ["proxy:rating", "Proxy · rating from 1 to 5"],
  ["final:complete_incomplete", "Final · complete or incomplete"],
  ["final:scale_1_5", "Final · rating from 1 to 5"],
  ["final:percent", "Final · percent successful"],
] as const;

const cadences = Object.keys(cadenceChoiceLabels) as TowerCadence[];

export type TowerCheckInView =
  | Readonly<{ status: "closed" }>
  | Readonly<{ status: "incomplete" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "open"; period: string; record: StoredTowerCheckIn | null }>;

export function TowerProductPanel(props: {
  tower: PersonalTower;
  checkIn: TowerCheckInView;
  starters: readonly SetupStarter[];
  catalogUnavailable: boolean;
}) {
  const { tower } = props;
  const summary = props.checkIn.status === "open" ? summaryFor(tower, props.checkIn.record) : null;
  const usedPresets = new Set(
    tower.metrics.flatMap((metric) => (metric.presetKey ? [metric.presetKey] : [])),
  );
  const availablePresets = metricPresets.filter((preset) => !usedPresets.has(preset.key));
  const dateSlots = [...tower.customDates];
  while (dateSlots.length < 6) dateSlots.push("");

  return (
    <div className="product-panel">
      <p className="tower-meta">
        {cadenceChoiceLabels[tower.cadence]} · {visibilityLabel(tower.audience, tower.identity)}
      </p>
      {tower.definition ? <p>{tower.definition}</p> : null}

      <section className="check-in" aria-labelledby="check-in-heading">
        <p className="eyebrow">Same form every time</p>
        <h2 id="check-in-heading">{cadencePeriodLabels[tower.cadence]}</h2>
        {props.checkIn.status === "closed" ? (
          <p>This date is not on the tower&apos;s list, so the check-in stays closed.</p>
        ) : null}
        {props.checkIn.status === "incomplete" ? (
          <p>Add one final outcome before the first check-in.</p>
        ) : null}
        {props.checkIn.status === "unavailable" ? (
          <p role="status">Check-in history is temporarily unavailable. Your tower is unchanged.</p>
        ) : null}
        {summary ? (
          <div className="check-in-summary" role="status">
            <h3>{summary.title}</h3>
            {summary.details.length > 0 ? (
              <ul>
                {summary.details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            <p>{summary.closing}</p>
          </div>
        ) : null}
        {props.checkIn.status === "open" ? (
          <form action={recordTowerCheckIn} className="stacked-form check-in-form">
            <input type="hidden" name="towerId" value={tower.id} />
            <fieldset>
              <legend>Ongoing</legend>
              {tower.metrics
                .filter((metric) => metric.kind === "ongoing")
                .map((metric) => (
                  <MetricFields
                    key={metric.id}
                    metric={metric}
                    saved={savedResponse(props.checkIn, metric.id)}
                  />
                ))}
              {tower.metrics.every((metric) => metric.kind !== "ongoing") ? (
                <p className="form-help">
                  No ongoing measure on this tower. You can add one below.
                </p>
              ) : (
                <p className="form-help">Leave an ongoing measure blank to skip it.</p>
              )}
            </fieldset>
            <fieldset>
              <legend>Completion</legend>
              {tower.metrics
                .filter((metric) => metric.kind === "proxy" || metric.kind === "final")
                .map((metric) => (
                  <MetricFields
                    key={metric.id}
                    metric={metric}
                    saved={savedResponse(props.checkIn, metric.id)}
                  />
                ))}
            </fieldset>
            <details>
              <summary>Optional protocol checklist</summary>
              <ul className="setup-choice-list">
                {tower.protocols.map((protocol) => (
                  <li key={protocol.id}>
                    <label>
                      <input
                        type="checkbox"
                        name="ran"
                        value={protocol.id}
                        defaultChecked={
                          props.checkIn.status === "open" &&
                          props.checkIn.record?.markedProtocolIds.includes(protocol.id) === true
                        }
                      />
                      {protocol.title}
                    </label>
                    <p className="form-help">{protocol.howTo}</p>
                  </li>
                ))}
              </ul>
            </details>
            <button className="primary-action" type="submit">
              Save check-in
            </button>
          </form>
        ) : null}
      </section>

      <section aria-labelledby="owned-protocols-heading">
        <h2 id="owned-protocols-heading">Protocols</h2>
        <ul className="owned-protocol-list">
          {tower.protocols.map((protocol) => (
            <li key={protocol.id}>
              <form action={saveTowerProtocol} className="stacked-form">
                <input type="hidden" name="towerId" value={tower.id} />
                <input type="hidden" name="revision" value={tower.revision} />
                <input type="hidden" name="protocolId" value={protocol.id} />
                <label htmlFor={`protocol-name-${protocol.id}`}>Name</label>
                <input
                  id={`protocol-name-${protocol.id}`}
                  name="title"
                  defaultValue={protocol.title}
                  maxLength={80}
                  required
                />
                <label htmlFor={`protocol-how-${protocol.id}`}>How to</label>
                <input
                  id={`protocol-how-${protocol.id}`}
                  name="howTo"
                  defaultValue={protocol.howTo}
                  maxLength={280}
                  required
                />
                <button className="secondary-action" type="submit">
                  Save protocol
                </button>
              </form>
              <form action={removeTowerProtocol}>
                <input type="hidden" name="towerId" value={tower.id} />
                <input type="hidden" name="revision" value={tower.revision} />
                <input type="hidden" name="protocolId" value={protocol.id} />
                <button type="submit">Remove protocol</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addCustomTowerProtocol} className="stacked-form">
          <label htmlFor="added-protocol-name">Custom protocol name</label>
          <input id="added-protocol-name" name="title" maxLength={80} required />
          <label htmlFor="added-protocol-how">Custom how-to</label>
          <input id="added-protocol-how" name="howTo" maxLength={280} required />
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <button
            className="secondary-action"
            type="submit"
            disabled={tower.protocols.length >= maximumTowerProtocols}
          >
            Add protocol
          </button>
        </form>
        <form action={addStarterTowerProtocol} className="inline-form">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <label htmlFor="starter-protocol">Starter protocol</label>
          <select
            id="starter-protocol"
            name="starter"
            required
            disabled={props.starters.length === 0}
          >
            {props.starters.map((starter) => (
              <option key={starter.id} value={`${starter.id}@${starter.version}`}>
                {starter.title}
              </option>
            ))}
          </select>
          <button
            className="secondary-action"
            type="submit"
            disabled={
              props.catalogUnavailable ||
              props.starters.length === 0 ||
              tower.protocols.length >= maximumTowerProtocols
            }
          >
            Add starter
          </button>
        </form>
      </section>

      <section aria-labelledby="owned-outcomes-heading">
        <h2 id="owned-outcomes-heading">Outcomes</h2>
        <ul className="metric-list">
          {tower.metrics.map((metric) => (
            <li key={metric.id}>
              <span>
                {metric.kind} · {metric.label}
              </span>
              <form action={removeTowerMetric}>
                <input type="hidden" name="towerId" value={tower.id} />
                <input type="hidden" name="revision" value={tower.revision} />
                <input type="hidden" name="metricId" value={metric.id} />
                <button type="submit">Remove measure</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addPresetMetric} className="inline-form">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <label htmlFor="preset-metric">Preset measure</label>
          <select
            id="preset-metric"
            name="preset"
            required
            disabled={availablePresets.length === 0}
          >
            {availablePresets.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.kind} · {preset.label}
              </option>
            ))}
          </select>
          <button
            className="secondary-action"
            type="submit"
            disabled={
              availablePresets.length === 0 || tower.metrics.length >= maximumMetricsPerTower
            }
          >
            Add preset
          </button>
        </form>
        <form action={addCustomMetric} className="stacked-form">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <label htmlFor="custom-measure-name">Custom measure name</label>
          <input id="custom-measure-name" name="customMetricLabel" maxLength={80} required />
          <label htmlFor="custom-measure-shape">What you record</label>
          <select
            id="custom-measure-shape"
            name="customMetricShape"
            required
            defaultValue="proxy:count"
          >
            {customShapes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            className="secondary-action"
            type="submit"
            disabled={tower.metrics.length >= maximumMetricsPerTower}
          >
            Add custom measure
          </button>
        </form>
      </section>

      <section aria-labelledby="definition-heading">
        <h2 id="definition-heading">Definition</h2>
        <form action={saveTowerDefinition} className="inline-form">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <label htmlFor="tower-definition">One-line definition, optional</label>
          <input
            id="tower-definition"
            name="definition"
            defaultValue={tower.definition ?? ""}
            maxLength={160}
          />
          <button className="secondary-action" type="submit">
            Save definition
          </button>
        </form>
      </section>

      <section aria-labelledby="rhythm-heading">
        <h2 id="rhythm-heading">Check-in rhythm</h2>
        <form action={saveTowerRhythm} className="stacked-form">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <fieldset>
            <legend>How often</legend>
            {cadences
              .filter((cadence) => cadence !== "custom")
              .map((cadence) => (
                <label key={cadence}>
                  <input
                    type="radio"
                    name="cadence"
                    value={cadence}
                    defaultChecked={tower.cadence === cadence}
                  />
                  {cadenceChoiceLabels[cadence]}
                </label>
              ))}
          </fieldset>
          <button className="secondary-action" type="submit">
            Save rhythm
          </button>
        </form>
        <form action={saveTowerRhythm} className="stacked-form">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <input type="hidden" name="cadence" value="custom" />
          <p className="form-help">
            Specific dates use the same check-in. A date opens only on that day.
          </p>
          {dateSlots.map((date, index) => (
            <input
              key={`${date}-${index}`}
              type="date"
              name="customDate"
              defaultValue={date}
              aria-label={`Specific date ${index + 1}`}
            />
          ))}
          <button className="secondary-action" type="submit">
            Save specific dates
          </button>
        </form>
      </section>

      <section aria-labelledby="visibility-heading">
        <h2 id="visibility-heading">Visibility</h2>
        <form action={saveTowerVisibility} className="stacked-form">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <fieldset className="visibility-fieldset">
            <legend>Who can see it</legend>
            <label>
              <input
                type="radio"
                name="audience"
                value="private"
                defaultChecked={tower.audience === "private"}
              />
              Private
            </label>
            <label>
              <input
                type="radio"
                name="audience"
                value="shared"
                defaultChecked={tower.audience === "shared"}
              />
              Shared
            </label>
            <div className="identity-choice">
              <p className="form-help">
                Named or anonymous applies only when this tower is shared.
              </p>
              <label>
                <input
                  type="radio"
                  name="identity"
                  value="named"
                  defaultChecked={tower.identity !== "anonymous"}
                />
                Named
              </label>
              <label>
                <input
                  type="radio"
                  name="identity"
                  value="anonymous"
                  defaultChecked={tower.identity === "anonymous"}
                />
                Anonymous
              </label>
              <p className="form-help">
                Sharing with other people is not available yet. This choice is saved for when it is.
              </p>
            </div>
          </fieldset>
          <button className="secondary-action" type="submit">
            Save visibility
          </button>
        </form>
      </section>
    </div>
  );
}

function savedResponse(
  checkIn: TowerCheckInView,
  metricId: string,
): StoredTowerCheckIn["responses"][number] | null {
  if (checkIn.status !== "open" || !checkIn.record) return null;
  return checkIn.record.responses.find((response) => response.metricId === metricId) ?? null;
}

function MetricFields(props: {
  metric: PersonalTower["metrics"][number];
  saved: StoredTowerCheckIn["responses"][number] | null;
}) {
  const { metric, saved } = props;
  const skipped = saved?.skipped === true;
  return (
    <div className="metric-fields">
      <p>{metric.label}</p>
      {metric.shape === "weight" ||
      metric.shape === "rating" ||
      metric.shape === "scale_1_5" ||
      metric.shape === "count" ||
      metric.shape === "hours" ||
      metric.shape === "percent" ? (
        <input
          name={`numeric.${metric.id}`}
          type="number"
          inputMode="decimal"
          aria-label={metric.label}
          defaultValue={skipped ? "" : (saved?.numericValue ?? "")}
          required={metric.kind === "final"}
          {...numberBounds(metric.shape)}
        />
      ) : null}
      {metric.shape === "blood_pressure" ? (
        <>
          <label htmlFor={`systolic-${metric.id}`}>Systolic</label>
          <input
            id={`systolic-${metric.id}`}
            name={`numeric.${metric.id}`}
            type="number"
            min={70}
            max={250}
            step={1}
            defaultValue={skipped ? "" : (saved?.numericValue ?? "")}
          />
          <label htmlFor={`diastolic-${metric.id}`}>Diastolic</label>
          <input
            id={`diastolic-${metric.id}`}
            name={`secondary.${metric.id}`}
            type="number"
            min={40}
            max={150}
            step={1}
            defaultValue={skipped ? "" : (saved?.secondaryNumeric ?? "")}
          />
        </>
      ) : null}
      {metric.shape === "qualitative" ? (
        <input
          name={`text.${metric.id}`}
          aria-label={metric.label}
          maxLength={280}
          defaultValue={skipped ? "" : (saved?.textValue ?? "")}
        />
      ) : null}
      {metric.shape === "complete_incomplete" ? (
        <fieldset>
          <legend>{metric.label}</legend>
          <label>
            <input
              type="radio"
              name={`completion.${metric.id}`}
              value="complete"
              defaultChecked={saved?.completion === "complete"}
              required
            />
            Complete
          </label>
          <label>
            <input
              type="radio"
              name={`completion.${metric.id}`}
              value="incomplete"
              defaultChecked={saved?.completion === "incomplete"}
            />
            Incomplete
          </label>
        </fieldset>
      ) : null}
      {metric.kind !== "final" ? (
        <label>
          <input type="checkbox" name={`skip.${metric.id}`} value="yes" defaultChecked={skipped} />
          Skip {metric.label}
        </label>
      ) : null}
    </div>
  );
}

function numberBounds(shape: PersonalTower["metrics"][number]["shape"]): {
  min: number;
  max: number;
  step: number;
} {
  switch (shape) {
    case "weight":
      return { min: 0.01, max: 1000, step: 0.01 };
    case "rating":
    case "scale_1_5":
      return { min: 1, max: 5, step: 1 };
    case "count":
      return { min: 0, max: 10000, step: 1 };
    case "hours":
      return { min: 0, max: 24, step: 0.01 };
    case "percent":
      return { min: 0, max: 100, step: 1 };
    default:
      return { min: 0, max: 10000, step: 1 };
  }
}

function summaryFor(
  tower: PersonalTower,
  record: StoredTowerCheckIn | null,
): ReturnType<typeof summarizeCheckIn> | null {
  if (!record) return null;
  const readings: { label: string; reading: MetricReading }[] = [];
  for (const response of record.responses) {
    const metric = tower.metrics.find((item) => item.id === response.metricId);
    if (!metric) return null;
    try {
      const reading = parseMetricSubmission(metric, {
        skipped: response.skipped,
        numeric: response.numericValue,
        secondary: response.secondaryNumeric,
        text: response.textValue,
        completion: response.completion,
      });
      if (metricReadingLine(metric.label, reading)) {
        readings.push({ label: metric.label, reading });
      }
    } catch {
      return null;
    }
  }
  const titles = tower.protocols
    .filter((protocol) => record.markedProtocolIds.includes(protocol.id))
    .map((protocol) => protocol.title);
  return summarizeCheckIn(readings, titles);
}
