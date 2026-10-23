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
}>;

export function TowerSetupForm(props: {
  action: (formData: FormData) => void | Promise<void>;
  starters: readonly SetupStarter[];
  catalogUnavailable: boolean;
  error: string | null;
  submitLabel: string;
  defaultTitle?: string;
  towerId?: string;
  revision?: number;
}) {
  const error =
    props.error && props.error in setupErrors
      ? setupErrors[props.error as keyof typeof setupErrors]
      : null;
  const finals = metricPresets.filter((preset) => preset.kind === "final");
  const ongoing = metricPresets.filter((preset) => preset.kind === "ongoing");
  const proxies = metricPresets.filter((preset) => preset.kind === "proxy");

  return (
    <form action={props.action} className="stacked-form setup-form">
      {props.towerId ? <input type="hidden" name="towerId" value={props.towerId} /> : null}
      {props.revision !== undefined ? (
        <input type="hidden" name="revision" value={props.revision} />
      ) : null}

      <section aria-labelledby="setup-name">
        <h2 id="setup-name">Name</h2>
        <label htmlFor="title">Goal or context</label>
        <input
          id="title"
          name="title"
          maxLength={80}
          required
          autoFocus
          defaultValue={props.defaultTitle ?? ""}
        />
        <label htmlFor="definition">One-line definition, optional</label>
        <input id="definition" name="definition" maxLength={160} autoComplete="off" />
        <p className="form-help">You can leave the definition blank. It never blocks the tower.</p>
      </section>

      <section aria-labelledby="setup-protocols">
        <h2 id="setup-protocols">Protocols</h2>
        <p className="form-help">Start with 1–3. Edit any name or how-to before you save.</p>
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
              <label htmlFor={`starter-title-${starter.id}`}>Name</label>
              <input
                id={`starter-title-${starter.id}`}
                name={`starterTitle.${starter.id}`}
                defaultValue={starter.title}
                maxLength={80}
              />
              <label htmlFor={`starter-how-${starter.id}`}>How to</label>
              <input
                id={`starter-how-${starter.id}`}
                name={`starterHowTo.${starter.id}`}
                defaultValue={starter.howTo}
                maxLength={280}
              />
            </li>
          ))}
        </ul>
        <label htmlFor="custom-protocol-name">Custom protocol name</label>
        <input id="custom-protocol-name" name="customTitle1" maxLength={80} />
        <label htmlFor="custom-how-to">Custom how-to</label>
        <input id="custom-how-to" name="customHowTo1" maxLength={280} />
        <details>
          <summary>Add another custom protocol</summary>
          <label htmlFor="custom-protocol-name-2">Second custom protocol name</label>
          <input id="custom-protocol-name-2" name="customTitle2" maxLength={80} />
          <label htmlFor="custom-how-to-2">Second custom how-to</label>
          <input id="custom-how-to-2" name="customHowTo2" maxLength={280} />
          <label htmlFor="custom-protocol-name-3">Third custom protocol name</label>
          <input id="custom-protocol-name-3" name="customTitle3" maxLength={80} />
          <label htmlFor="custom-how-to-3">Third custom how-to</label>
          <input id="custom-how-to-3" name="customHowTo3" maxLength={280} />
        </details>
      </section>

      <section aria-labelledby="setup-outcomes">
        <h2 id="setup-outcomes">Outcomes</h2>
        <p className="form-help">
          Choose at least one final. Ongoing and proxy measures are optional.
        </p>
        <fieldset>
          <legend>Final</legend>
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
          <CustomMetricSlot index={1} />
          <CustomMetricSlot index={2} />
        </details>
      </section>

      <section aria-labelledby="setup-rhythm">
        <h2 id="setup-rhythm">Check-in rhythm</h2>
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
      <button className="primary-action" type="submit">
        {props.submitLabel}
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

function CustomMetricSlot(props: { index: 1 | 2 }) {
  const suffix = props.index === 1 ? "" : ` ${props.index}`;
  return (
    <>
      <label htmlFor={`custom-metric-name-${props.index}`}>Custom measure name{suffix}</label>
      <input
        id={`custom-metric-name-${props.index}`}
        name={`customMetricLabel${props.index}`}
        maxLength={80}
      />
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
    </>
  );
}
