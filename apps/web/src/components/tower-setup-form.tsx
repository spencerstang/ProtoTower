"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PublishedProtocol } from "@protostack/protocol-engine";
import type { SetupAction, SetupFieldError } from "@/lib/setup-form-state";
import { metricPresets } from "@protostack/outcomes-engine";
import { cadenceChoiceLabels, type TowerCadence } from "@protostack/tower-engine";

const setupErrors = {
  protocols: "Choose 1–3 protocols. Edit a starter or add your own.",
  final: "Add at least one final outcome. Ongoing and proxy measures are optional.",
  dates: "Add at least one specific date, or choose another rhythm.",
  invalid: "Check the setup and try again. Names stay on one line.",
  limit: "The twelve-tower limit has been reached.",
  stale: "This tower changed in another request. Review it and try again.",
  unavailable: "Tower setup is temporarily unavailable.",
} as const;

const customShapes = [
  ["number", "Number · actual decimal value"],
  ["text", "Text · written response"],
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

export type SetupStarter = Readonly<{
  id: string;
  version: number;
  title: string;
  howTo: string;
  details?: PublishedProtocol;
}>;

export function TowerSetupForm(props: {
  action: SetupAction;
  starters: readonly SetupStarter[];
  catalogUnavailable: boolean;
  error: string | null;
  submitLabel: string;
  defaultTitle?: string;
  towerId?: string;
  revision?: number;
}) {
  const [errors, setErrors] = useState<readonly SetupFieldError[]>([]);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    for (const element of form.querySelectorAll("[data-setup-invalid]")) {
      element.removeAttribute("aria-invalid");
      element.removeAttribute("aria-describedby");
      element.removeAttribute("data-setup-invalid");
    }
    for (const error of errors) {
      const field = document.getElementById(error.field);
      if (field && form.contains(field)) {
        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", `error-${error.field}`);
        field.setAttribute("data-setup-invalid", "true");
      }
    }
    if (errors.length) summaryRef.current?.focus();
  }, [errors]);
  const fieldError = (field: string) => {
    const error = errors.find((item) => item.field === field);
    return error ? (
      <p className="form-error field-error" id={`error-${field}`}>
        {error.message}
      </p>
    ) : null;
  };
  const error =
    props.error && props.error in setupErrors
      ? setupErrors[props.error as keyof typeof setupErrors]
      : null;
  const finals = metricPresets.filter((preset) => preset.kind === "final");
  const ongoing = metricPresets.filter((preset) => preset.kind === "ongoing");
  const proxies = metricPresets.filter((preset) => preset.kind === "proxy");

  return (
    <form
      ref={formRef}
      className="stacked-form setup-form"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const result = await props.action(data);
            setErrors(result.errors);
          } catch {
            setErrors([
              {
                field: "setup-name",
                message:
                  "The setup could not be saved. Your responses are still here; please try again.",
              },
            ]);
          }
        });
      }}
    >
      {errors.length ? (
        <div ref={summaryRef} tabIndex={-1} className="setup-error-summary" role="alert">
          <h2>Review these fields</h2>
          <p>Your responses have been kept.</p>
          <ul>
            {errors.map((error, index) => (
              <li key={`${error.field}-${index}`}>
                <a href={`#${error.field}`}>{error.message}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {props.towerId ? <input type="hidden" name="towerId" value={props.towerId} /> : null}
      {props.revision !== undefined ? (
        <input type="hidden" name="revision" value={props.revision} />
      ) : null}

      <section aria-labelledby="setup-name">
        <h2 id="setup-name" tabIndex={-1}>
          Goal
        </h2>
        {fieldError("setup-name")}
        <label htmlFor="title">Goal or context</label>
        <input
          id="title"
          name="title"
          maxLength={80}
          required
          autoFocus
          defaultValue={props.defaultTitle ?? ""}
        />
        {fieldError("title")}
        <label htmlFor="definition">One-line definition, optional</label>
        <input id="definition" name="definition" maxLength={160} autoComplete="off" />
        {fieldError("definition")}
        <p className="form-help">You can leave the definition blank. It never blocks the tower.</p>
      </section>

      <section aria-labelledby="setup-protocols">
        <h2 id="setup-protocols" tabIndex={-1}>
          Protocols
        </h2>
        {fieldError("setup-protocols")}
        <p className="form-help">
          Start with two relevant protocols. You can choose 1–3 and expand your tower later.
        </p>
        {props.catalogUnavailable ? (
          <p className="form-help">
            The starter list is temporarily unavailable. A custom protocol still works.
          </p>
        ) : null}
        <ul className="setup-choice-list">
          {props.starters.map((starter) => (
            <li key={starter.id}>
              <label>
                <input type="checkbox" name="starter" value={`${starter.id}@${starter.version}`} />
                {starter.title}
              </label>
              {starter.details ? <ProtocolPreview protocol={starter.details} /> : null}
              <label htmlFor={`starter-title-${starter.id}`}>Name</label>
              <input
                id={`starter-title-${starter.id}`}
                name={`starterTitle.${starter.id}`}
                defaultValue={starter.title}
                maxLength={80}
              />
              {fieldError(`starter-title-${starter.id}`)}
              <label htmlFor={`starter-how-${starter.id}`}>How to</label>
              <textarea
                rows={3}
                id={`starter-how-${starter.id}`}
                name={`starterHowTo.${starter.id}`}
                defaultValue={starter.howTo}
                maxLength={280}
              />
              {fieldError(`starter-how-${starter.id}`)}
            </li>
          ))}
        </ul>
        <label htmlFor="custom-protocol-name">Custom protocol name</label>
        <input id="custom-protocol-name" name="customTitle1" maxLength={80} />
        {fieldError("custom-protocol-name")}
        <label htmlFor="custom-how-to">Custom how-to</label>
        <textarea id="custom-how-to" name="customHowTo1" maxLength={280} rows={3} />
        {fieldError("custom-how-to")}
        <details>
          <summary>Add another custom protocol</summary>
          <label htmlFor="custom-protocol-name-2">Second custom protocol name</label>
          <input id="custom-protocol-name-2" name="customTitle2" maxLength={80} />
          {fieldError("custom-protocol-name-2")}
          <label htmlFor="custom-how-to-2">Second custom how-to</label>
          <textarea id="custom-how-to-2" name="customHowTo2" maxLength={280} rows={3} />
          {fieldError("custom-how-to-2")}
          <label htmlFor="custom-protocol-name-3">Third custom protocol name</label>
          <input id="custom-protocol-name-3" name="customTitle3" maxLength={80} />
          {fieldError("custom-protocol-name-3")}
          <label htmlFor="custom-how-to-3">Third custom how-to</label>
          <textarea id="custom-how-to-3" name="customHowTo3" maxLength={280} rows={3} />
          {fieldError("custom-how-to-3")}
        </details>
      </section>

      <section aria-labelledby="setup-outcomes">
        <h2 id="setup-outcomes" tabIndex={-1}>
          Outcome measures
        </h2>
        {fieldError("setup-outcomes")}
        <p className="form-help">
          Choose at least one outcome to follow. Ongoing and practice measures are optional.
        </p>
        <fieldset>
          <legend>Outcome</legend>
          {finals.map((preset) => (
            <PresetChoice key={preset.key} presetKey={preset.key} label={preset.label} />
          ))}
        </fieldset>
        <details>
          <summary>Add ongoing measures</summary>
          <fieldset>
            <legend>Ongoing</legend>
            {ongoing.map((preset) => (
              <PresetChoice key={preset.key} presetKey={preset.key} label={preset.label} />
            ))}
          </fieldset>
        </details>
        <details>
          <summary>Add proxy measures</summary>
          <fieldset>
            <legend>Proxy</legend>
            {proxies.map((preset) => (
              <PresetChoice key={preset.key} presetKey={preset.key} label={preset.label} />
            ))}
          </fieldset>
        </details>
        <details>
          <summary>Add a custom measure</summary>
          <CustomMetricSlot index={1} errors={errors} />
          <CustomMetricSlot index={2} errors={errors} />
        </details>
      </section>

      <section aria-labelledby="setup-rhythm">
        <h2 id="setup-rhythm" tabIndex={-1}>
          Check-in rhythm
        </h2>
        {fieldError("setup-rhythm")}
        <fieldset>
          <legend>How often</legend>
          {cadences.map((cadence) => (
            <label key={cadence}>
              <input
                type="radio"
                name="cadence"
                value={cadence}
                defaultChecked={cadence === "weekly"}
                required
              />
              {cadenceChoiceLabels[cadence]}
            </label>
          ))}
        </fieldset>
        <details>
          <summary>Specific dates</summary>
          <p className="form-help">Used only when the rhythm is specific dates.</p>
          {[1, 2, 3, 4, 5, 6].map((slot) => (
            <input key={slot} type="date" name="customDate" aria-label={`Specific date ${slot}`} />
          ))}
        </details>
      </section>

      <section aria-labelledby="setup-visibility">
        <h2 id="setup-visibility">Visibility</h2>
        <fieldset className="visibility-fieldset">
          <legend>Who can see it</legend>
          <label>
            <input type="radio" name="audience" value="private" defaultChecked required />
            Private
          </label>
          <label>
            <input type="radio" name="audience" value="shared" />
            Shared
          </label>
          <div className="identity-choice">
            <p className="form-help">Named or anonymous applies only when this tower is shared.</p>
            <label>
              <input type="radio" name="identity" value="named" defaultChecked />
              Named
            </label>
            <label>
              <input type="radio" name="identity" value="anonymous" />
              Anonymous
            </label>
            <p className="form-help">
              Sharing with other people is not available yet. This choice is saved for when it is.
            </p>
          </div>
        </fieldset>
      </section>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="primary-action" type="submit" disabled={pending}>
        {pending ? "Saving…" : props.submitLabel}
      </button>
    </form>
  );
}

function PresetChoice(props: { presetKey: string; label: string }) {
  return (
    <label>
      <input type="checkbox" name="preset" value={props.presetKey} />
      {props.label}
      <input type="hidden" name={`presetLabel.${props.presetKey}`} value={props.label} />
    </label>
  );
}

function CustomMetricSlot(props: { index: 1 | 2; errors: readonly SetupFieldError[] }) {
  const suffix = props.index === 1 ? "" : ` ${props.index}`;
  const errorFor = (name: string) => {
    const field = `custom-metric-${name}-${props.index}`;
    const error = props.errors.find((item) => item.field === field);
    return error ? (
      <p className="form-error" id={`error-${field}`}>
        {error.message}
      </p>
    ) : null;
  };
  return (
    <>
      <label htmlFor={`custom-metric-name-${props.index}`}>Custom measure name{suffix}</label>
      <input
        id={`custom-metric-name-${props.index}`}
        name={`customMetricLabel${props.index}`}
        maxLength={80}
      />
      {errorFor("name")}
      <label htmlFor={`custom-metric-kind-${props.index}`}>Measure role{suffix}</label>
      <select
        id={`custom-metric-kind-${props.index}`}
        name={`customMetricKind${props.index}`}
        defaultValue="final"
      >
        <option value="final">Outcome · what changes</option>
        <option value="ongoing">Ongoing · what you monitor</option>
        <option value="proxy">Practice · what you do</option>
      </select>
      <label htmlFor={`custom-metric-shape-${props.index}`}>What you record{suffix}</label>
      <select
        id={`custom-metric-shape-${props.index}`}
        name={`customMetricShape${props.index}`}
        defaultValue=""
      >
        <option value="">No custom measure</option>
        {customShapes.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {errorFor("shape")}
      <label htmlFor={`custom-metric-unit-${props.index}`}>Unit for Number, optional{suffix}</label>
      <input
        id={`custom-metric-unit-${props.index}`}
        name={`customMetricUnit${props.index}`}
        maxLength={24}
      />
      {errorFor("unit")}
    </>
  );
}

function ProtocolPreview({ protocol }: { protocol: PublishedProtocol }) {
  return (
    <details className="protocol-preview">
      <summary>View details: {protocol.title}</summary>
      <p>{protocol.overview}</p>
      <ol>
        {protocol.steps.map((step) => (
          <li key={step.position}>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
      <h3>Cautions</h3>
      <ul>
        {protocol.cautions.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {protocol.references.length ? (
        <>
          <h3>Sources</h3>
          <ul>
            {protocol.references.map((reference) => (
              <li key={reference.url}>
                <a href={reference.url} target="_blank" rel="noreferrer">
                  {reference.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="form-help">
        Published version {protocol.version}. General educational information, not an individualized
        treatment plan.
      </p>
    </details>
  );
}
