"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PublishedProtocol } from "@protostack/protocol-engine";
import type { SetupAction, SetupFieldError } from "@/lib/setup-form-state";
import {
  maximumMetricsPerTower,
  metricPresets,
  metricScale,
  shapesForKind,
  metricKindSchema,
  type MetricKind,
  type MetricPreset,
  type MetricShape,
} from "@protostack/outcomes-engine";
import {
  cadenceChoiceLabels,
  firstTowerProtocolLimit,
  type TowerCadence,
} from "@protostack/tower-engine";

import {
  customMeasureSlots,
  customProtocolSlots,
  type SetupProtocolChoice,
} from "../lib/tower-setup-form";

const setupErrors = {
  protocols: "Choose 1–3 library or custom protocols.",
  final: "Add at least one final outcome. Ongoing and proxy measures are optional.",
  dates: "Add at least one specific date, or choose another rhythm.",
  invalid: "Check the setup and try again. Names stay on one line.",
  limit: "The twelve-tower limit has been reached.",
  stale: "This tower changed in another request. Review it and try again.",
  unavailable: "Tower setup is temporarily unavailable.",
} as const;

const customShapeLabels: Record<MetricShape, string> = {
  number: "Number · actual decimal value",
  text: "Text · written response",
  weight: "Weight",
  rating: "Rating from 1 to 5",
  blood_pressure: "Blood pressure",
  qualitative: "Short note",
  count: "Count · whole number",
  hours: "Hours",
  complete_incomplete: "Complete or incomplete",
  scale_1_5: "Rating from 1 to 5",
  percent: "Percentage · 0–100%",
};

const cadences = Object.keys(cadenceChoiceLabels) as TowerCadence[];

export type SetupStarter = SetupProtocolChoice & Readonly<{ details?: PublishedProtocol }>;

const customProtocolNames = ["Custom protocol", "Second custom protocol", "Third custom protocol"];

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
  const [selectedStarters, setSelectedStarters] = useState<readonly string[]>([]);
  const [activeCustomProtocols, setActiveCustomProtocols] = useState<readonly number[]>([]);
  const [visibleCustomProtocols, setVisibleCustomProtocols] = useState(1);
  const [selectedPresets, setSelectedPresets] = useState<readonly string[]>([]);
  const [measureSlots, setMeasureSlots] = useState<readonly number[]>([]);
  const [cadence, setCadence] = useState<TowerCadence>("weekly");
  const protocolCount = selectedStarters.length + activeCustomProtocols.length;
  const atProtocolLimit = protocolCount >= firstTowerProtocolLimit;
  const atMeasureLimit = selectedPresets.length + measureSlots.length >= maximumMetricsPerTower;
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
      onChange={(event) => {
        const data = new FormData(event.currentTarget);
        setSelectedStarters(
          data.getAll("starter").filter((value): value is string => typeof value === "string"),
        );
        setActiveCustomProtocols(
          customProtocolSlots.filter((slot) =>
            [data.get(`customTitle${slot}`), data.get(`customHowTo${slot}`)].some(
              (value) => typeof value === "string" && value.trim() !== "",
            ),
          ),
        );
        setSelectedPresets(
          data.getAll("preset").filter((value): value is string => typeof value === "string"),
        );
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        if (protocolCount === 0 || protocolCount > firstTowerProtocolLimit) {
          setErrors([
            {
              field: "setup-protocols",
              message: "Choose between one and three protocols to start.",
            },
          ]);
          return;
        }
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
          <label htmlFor="title">Goal (required)</label>
        </h2>
        {fieldError("setup-name")}
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
      </section>

      <section aria-labelledby="setup-protocols">
        <h2 id="setup-protocols" tabIndex={-1}>
          Protocols
        </h2>
        {fieldError("setup-protocols")}
        <p className="form-help" role="status">
          Choose 1–3 protocols (required). {protocolCount} of {firstTowerProtocolLimit} selected.
        </p>
        {props.catalogUnavailable ? (
          <p className="form-help">
            The library is temporarily unavailable. You can add a custom protocol.
          </p>
        ) : null}
        <ul className="setup-choice-list">
          {props.starters.map((starter) => {
            const choice = `${starter.id}@${starter.version}`;
            const selected = selectedStarters.includes(choice);
            return (
              <li key={choice}>
                <label>
                  <input
                    type="checkbox"
                    name="starter"
                    value={choice}
                    disabled={!selected && atProtocolLimit}
                  />
                  {starter.title}
                </label>
                {starter.details ? (
                  <ProtocolPreview protocol={starter.details} />
                ) : (
                  <p>{starter.howTo}</p>
                )}
                <div hidden={!selected}>
                  <label htmlFor={`starter-note-${starter.id}`}>
                    My version of {starter.title} (optional)
                  </label>
                  <textarea
                    id={`starter-note-${starter.id}`}
                    name={`starterNote.${starter.id}`}
                    maxLength={280}
                    rows={2}
                  />
                  {fieldError(`starter-note-${starter.id}`)}
                </div>
              </li>
            );
          })}
        </ul>
        {customProtocolSlots.slice(0, visibleCustomProtocols).map((slot) => {
          const suffix = slot === 1 ? "" : `-${slot}`;
          const active = activeCustomProtocols.includes(slot);
          const label = customProtocolNames[slot - 1];
          return (
            <fieldset key={slot} disabled={!active && atProtocolLimit}>
              <legend>
                {label}
                {active ? " (name and instructions required)" : " (optional)"}
              </legend>
              <label htmlFor={`custom-protocol-name${suffix}`}>{label} name</label>
              <input
                id={`custom-protocol-name${suffix}`}
                name={`customTitle${slot}`}
                maxLength={80}
                aria-required={active}
              />
              {fieldError(`custom-protocol-name${suffix}`)}
              <label htmlFor={`custom-how-to${suffix}`}>{label} instructions</label>
              <textarea
                id={`custom-how-to${suffix}`}
                name={`customHowTo${slot}`}
                maxLength={280}
                rows={3}
                aria-required={active}
              />
              {fieldError(`custom-how-to${suffix}`)}
            </fieldset>
          );
        })}
        {visibleCustomProtocols < firstTowerProtocolLimit ? (
          <button
            type="button"
            className="secondary-action"
            disabled={atProtocolLimit}
            onClick={() => setVisibleCustomProtocols(visibleCustomProtocols + 1)}
          >
            Add another custom protocol
          </button>
        ) : null}
      </section>

      <section aria-labelledby="setup-outcomes">
        <h2 id="setup-outcomes" tabIndex={-1}>
          Outcome measures
        </h2>
        {fieldError("setup-outcomes")}
        <p className="form-help">
          At least one outcome measure is required. Ongoing and practice measures are optional.
        </p>
        {(
          [
            ["Outcome presets", finals],
            ["Ongoing presets", ongoing],
            ["Practice presets", proxies],
          ] as const
        ).map(([heading, presets]) => (
          <fieldset key={heading}>
            <legend>{heading}</legend>
            {presets.map((preset) => (
              <PresetChoice
                key={preset.key}
                preset={preset}
                selected={selectedPresets.includes(preset.key)}
                atLimit={atMeasureLimit}
                error={fieldError(`preset-label-${preset.key}`)}
              />
            ))}
          </fieldset>
        ))}
        <section aria-labelledby="setup-custom-measures">
          <h3 id="setup-custom-measures">Custom measures</h3>
          {measureSlots.map((slot, index) => (
            <CustomMetricSlot
              key={slot}
              index={slot}
              position={index + 1}
              errors={errors}
              onRemove={() => setMeasureSlots(measureSlots.filter((item) => item !== slot))}
            />
          ))}
          <button
            type="button"
            className="secondary-action"
            disabled={atMeasureLimit}
            onClick={() => {
              const slot = customMeasureSlots.find((item) => !measureSlots.includes(item));
              if (slot !== undefined) setMeasureSlots([...measureSlots, slot]);
            }}
          >
            Add a custom measure
          </button>
          {atMeasureLimit ? (
            <p className="form-help" role="status">
              Up to {maximumMetricsPerTower} measures per tower.
            </p>
          ) : null}
        </section>
      </section>

      <section aria-labelledby="setup-rhythm">
        <h2 id="setup-rhythm" tabIndex={-1}>
          Check-in rhythm
        </h2>
        {fieldError("setup-rhythm")}
        <fieldset>
          <legend>How often (required)</legend>
          {cadences.map((cadence) => (
            <label key={cadence}>
              <input
                type="radio"
                name="cadence"
                value={cadence}
                defaultChecked={cadence === "weekly"}
                required
                onChange={() => setCadence(cadence)}
              />
              {cadenceChoiceLabels[cadence]}
            </label>
          ))}
        </fieldset>
        <fieldset hidden={cadence !== "custom"} disabled={cadence !== "custom"}>
          <legend>Specific dates (at least one required)</legend>
          {[1, 2, 3, 4, 5, 6].map((slot) => (
            <input key={slot} type="date" name="customDate" aria-label={`Specific date ${slot}`} />
          ))}
        </fieldset>
      </section>

      <section aria-labelledby="setup-visibility">
        <h2 id="setup-visibility">Visibility</h2>
        <fieldset className="visibility-fieldset">
          <legend>Who can see it (required)</legend>
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

function PresetChoice(props: {
  preset: MetricPreset;
  selected: boolean;
  atLimit: boolean;
  error: React.ReactNode;
}) {
  const { preset } = props;
  return (
    <div>
      <label>
        <input
          type="checkbox"
          name="preset"
          value={preset.key}
          disabled={!props.selected && props.atLimit}
        />
        {`${preset.label} (${metricScale(preset.shape)})`}
      </label>
      <div hidden={!props.selected}>
        <label htmlFor={`preset-label-${preset.key}`}>
          Display name for {preset.label} (optional)
        </label>
        <input
          id={`preset-label-${preset.key}`}
          name={`presetLabel.${preset.key}`}
          maxLength={80}
          placeholder={preset.label}
        />
        {props.error}
      </div>
    </div>
  );
}

function CustomMetricSlot(props: {
  index: number;
  position: number;
  errors: readonly SetupFieldError[];
  onRemove: () => void;
}) {
  const suffix = ` ${props.position}`;
  const [kind, setKind] = useState<MetricKind>("final");
  const [shape, setShape] = useState("");
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
    <fieldset>
      <legend>Custom measure{suffix}</legend>
      <label htmlFor={`custom-metric-name-${props.index}`}>
        Custom measure name{suffix} (required)
      </label>
      <input
        id={`custom-metric-name-${props.index}`}
        name={`customMetricLabel${props.index}`}
        maxLength={80}
        aria-required="true"
      />
      {errorFor("name")}
      <label htmlFor={`custom-metric-kind-${props.index}`}>Measure role{suffix} (required)</label>
      <select
        id={`custom-metric-kind-${props.index}`}
        name={`customMetricKind${props.index}`}
        value={kind}
        onChange={(event) => {
          const nextKind = metricKindSchema.parse(event.currentTarget.value);
          setKind(nextKind);
          if (!shapesForKind(nextKind).some((item) => item === shape)) setShape("");
        }}
      >
        <option value="final">Outcome · what changes</option>
        <option value="ongoing">Ongoing · what you monitor</option>
        <option value="proxy">Practice · what you do</option>
      </select>
      <label htmlFor={`custom-metric-shape-${props.index}`}>
        Response type for custom measure{suffix} (required)
      </label>
      <select
        id={`custom-metric-shape-${props.index}`}
        name={`customMetricShape${props.index}`}
        value={shape}
        onChange={(event) => setShape(event.currentTarget.value)}
        aria-required="true"
      >
        <option value="">Choose a response type</option>
        {shapesForKind(kind).map((value) => (
          <option key={value} value={value}>
            {customShapeLabels[value]}
          </option>
        ))}
      </select>
      {errorFor("shape")}
      <div hidden={shape !== "number"}>
        <label htmlFor={`custom-metric-unit-${props.index}`}>
          Unit for custom measure{suffix} (optional)
        </label>
        <input
          id={`custom-metric-unit-${props.index}`}
          name={`customMetricUnit${props.index}`}
          maxLength={24}
          disabled={shape !== "number"}
        />
        {errorFor("unit")}
      </div>
      <button type="button" onClick={props.onRemove}>
        Remove custom measure{suffix}
      </button>
    </fieldset>
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
