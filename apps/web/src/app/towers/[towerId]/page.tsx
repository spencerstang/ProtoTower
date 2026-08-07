import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerPersonalTowerRepository } from "@/lib/personal-towers";
import { createServerPracticeCheckInRepository } from "@/lib/practice-checkins";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";
import { isFeatureEnabled } from "@protostack/configuration";
import {
  parsePracticeDate,
  practiceDateWindow,
  type PracticeCheckIn,
  type PracticeQueryResult,
} from "@protostack/tracking-engine";
import { maximumItemsPerTower, towerIdSchema } from "@protostack/tower-engine";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addTowerItemAction,
  deleteTower,
  moveTowerItemDown,
  moveTowerItemUp,
  removeTowerItemAction,
  renameTower,
  setPracticeCheckIn,
} from "../actions";

const errorMessages = {
  invalid: "That change was invalid. Refresh the page and try again.",
  "practice-invalid": "That practice date or request was invalid. Review the date and try again.",
  "practice-not-found":
    "That private practice target is unavailable. Refresh the tower before trying again.",
  "practice-unavailable": "Private practice history is temporarily unavailable. Try again shortly.",
  stale: "This tower changed in another request. Review the latest version before trying again.",
  unavailable: "Your change could not be completed right now. Try again shortly.",
} as const;

const statusMessages = {
  "practice-recorded": "Practice recorded.",
  "practice-undone": "Practice record removed.",
  saved: "Tower saved.",
} as const;

function formatPracticeDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default async function TowerDetailPage(props: {
  params: Promise<{ towerId: string }>;
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const { towerId: rawTowerId } = await props.params;
  const parsedId = towerIdSchema.safeParse(rawTowerId);
  if (!parsedId.success) notFound();

  const principal = await getVerifiedPrincipal();
  if (principal.status === "available" && principal.principal.kind === "anonymous") {
    redirect("/sign-in");
  }
  const searchParams = await props.searchParams;
  const error = typeof searchParams["error"] === "string" ? searchParams["error"] : null;
  const status = typeof searchParams["status"] === "string" ? searchParams["status"] : null;
  const repository = await createServerPersonalTowerRepository();
  const towerResult =
    principal.status === "available"
      ? await repository.findById(parsedId.data)
      : { status: "unavailable" as const };
  if (towerResult.status === "unavailable") {
    return (
      <main id="main-content">
        <SiteHeader status="Private towers" />
        <section className="tower-shell">
          <div className="state-card" role="status">
            <h1>Your tower is temporarily unavailable</h1>
            <p>The public catalog remains available. Try again shortly.</p>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const tower = towerResult.value;
  if (!tower) notFound();
  const practiceEnabled = isFeatureEnabled("protocolTracking");
  const practiceReference = new Date();
  const practiceRange = practiceDateWindow(practiceReference);
  const defaultPracticeDate = parsePracticeDate(practiceReference.toISOString().slice(0, 10));
  const catalogPromise = createServerProtocolCatalogRepository().listPublished();
  const practicePromise: Promise<PracticeQueryResult<readonly PracticeCheckIn[]>> = practiceEnabled
    ? createServerPracticeCheckInRepository().then((practiceRepository) =>
        practiceRepository.listRecent(tower.id, practiceRange),
      )
    : Promise.resolve({ status: "available", value: [] });
  const [catalog, practiceHistory] = await Promise.all([catalogPromise, practicePromise]);
  const protocols = catalog.status === "available" ? catalog.value : [];
  const exactProtocol = (protocolId: string, version: number) =>
    protocols.find((protocol) => protocol.id === protocolId && protocol.version === version);
  const availableProtocols = protocols.filter(
    (protocol) => !tower.items.some((item) => item.protocolId === protocol.id),
  );

  return (
    <main id="main-content">
      <SiteHeader status="Private tower" />
      <section className="tower-shell" aria-labelledby="tower-heading">
        <Link className="back-link" href="/towers">
          ← All towers
        </Link>
        <div className="tower-builder-heading">
          <div>
            <p className="eyebrow">Goal-specific tower</p>
            <h1 id="tower-heading">{tower.title}</h1>
            <p>
              {tower.items.length} of {maximumItemsPerTower} protocol blocks
            </p>
          </div>
          <form action={deleteTower} className="danger-form">
            <input type="hidden" name="towerId" value={tower.id} />
            <input type="hidden" name="revision" value={tower.revision} />
            <button className="danger-action" type="submit">
              Delete tower
            </button>
          </form>
        </div>

        {status && status in statusMessages ? (
          <p className="notice" role="status">
            {statusMessages[status as keyof typeof statusMessages]}
          </p>
        ) : null}
        {error && error in errorMessages ? (
          <p className="notice notice-error" role="alert">
            {errorMessages[error as keyof typeof errorMessages]}
          </p>
        ) : null}

        <form action={renameTower} className="inline-form tower-rename">
          <input type="hidden" name="towerId" value={tower.id} />
          <input type="hidden" name="revision" value={tower.revision} />
          <label htmlFor="title">Tower name</label>
          <input id="title" name="title" defaultValue={tower.title} maxLength={80} required />
          <button className="secondary-action" type="submit">
            Rename
          </button>
        </form>

        <section className="tower-levels" aria-labelledby="tower-levels-heading">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Ordered foundation</p>
              <h2 id="tower-levels-heading">Tower blocks</h2>
            </div>
          </div>
          {tower.items.length === 0 ? (
            <div className="state-card tower-empty">
              <h3>This tower has no blocks yet.</h3>
              <p>
                Add a published protocol below. Saving a protocol here does not track completion.
              </p>
            </div>
          ) : (
            <ol className="tower-item-list">
              {tower.items.map((item, index) => {
                const protocol = exactProtocol(item.protocolId, item.protocolVersion);
                return (
                  <li key={item.protocolId}>
                    <div>
                      <span className="tower-position">Level {item.position}</span>
                      <h3>{protocol?.title ?? "Unavailable protocol version"}</h3>
                      <p>
                        {protocol
                          ? `${protocol.summary} · Pinned version ${item.protocolVersion}`
                          : `Pinned version ${item.protocolVersion} is retained without exposing retired content.`}
                      </p>
                      {practiceEnabled ? (
                        <form action={setPracticeCheckIn} className="practice-record-form">
                          <input type="hidden" name="towerId" value={tower.id} />
                          <input type="hidden" name="protocolId" value={item.protocolId} />
                          <input
                            type="hidden"
                            name="protocolVersion"
                            value={item.protocolVersion}
                          />
                          <input type="hidden" name="recorded" value="true" />
                          <label htmlFor={`practice-date-${item.protocolId}`}>Practice date</label>
                          <input
                            id={`practice-date-${item.protocolId}`}
                            name="practiceDate"
                            type="date"
                            min={practiceRange.from}
                            max={practiceRange.to}
                            defaultValue={defaultPracticeDate}
                            required
                          />
                          <button
                            className="secondary-action"
                            type="submit"
                            aria-label={`Record ${protocol?.title ?? "protocol"} as practiced`}
                          >
                            Practiced
                          </button>
                        </form>
                      ) : null}
                    </div>
                    <div className="item-actions">
                      <form action={moveTowerItemUp}>
                        <input type="hidden" name="towerId" value={tower.id} />
                        <input type="hidden" name="revision" value={tower.revision} />
                        <input type="hidden" name="protocolId" value={item.protocolId} />
                        <button
                          type="submit"
                          disabled={index === 0}
                          aria-label={`Move ${protocol?.title ?? "protocol"} up`}
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveTowerItemDown}>
                        <input type="hidden" name="towerId" value={tower.id} />
                        <input type="hidden" name="revision" value={tower.revision} />
                        <input type="hidden" name="protocolId" value={item.protocolId} />
                        <button
                          type="submit"
                          disabled={index === tower.items.length - 1}
                          aria-label={`Move ${protocol?.title ?? "protocol"} down`}
                        >
                          ↓
                        </button>
                      </form>
                      <form action={removeTowerItemAction}>
                        <input type="hidden" name="towerId" value={tower.id} />
                        <input type="hidden" name="revision" value={tower.revision} />
                        <input type="hidden" name="protocolId" value={item.protocolId} />
                        <button type="submit">Remove</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {practiceEnabled ? (
          <section className="practice-history" aria-labelledby="practice-history-heading">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Private recent history</p>
                <h2 id="practice-history-heading">Recorded practice</h2>
                <p>
                  A check-in records only what you chose to enter. It is not proof of completion,
                  benefit, or a health outcome.
                </p>
              </div>
            </div>
            {practiceHistory.status === "unavailable" ? (
              <div className="state-card practice-state" role="status">
                <h3>Private practice history is temporarily unavailable</h3>
                <p>Your tower and the public catalog remain available.</p>
              </div>
            ) : practiceHistory.value.length === 0 ? (
              <div className="state-card practice-state">
                <h3>No recent practice recorded</h3>
                <p>Use a Practiced button above to add a private calendar-date check-in.</p>
              </div>
            ) : (
              <ul className="practice-history-list">
                {practiceHistory.value.map((checkIn) => {
                  const protocol = exactProtocol(checkIn.protocolId, checkIn.protocolVersion);
                  const isCurrentBlock = tower.items.some(
                    (item) =>
                      item.protocolId === checkIn.protocolId &&
                      item.protocolVersion === checkIn.protocolVersion,
                  );
                  const formattedDate = formatPracticeDate(checkIn.practiceDate);
                  return (
                    <li
                      key={`${checkIn.protocolId}:${checkIn.protocolVersion}:${checkIn.practiceDate}`}
                    >
                      <div>
                        <span className="tower-position">
                          {isCurrentBlock ? "Current tower block" : "Removed from current tower"}
                        </span>
                        <h3>{protocol?.title ?? "Unavailable protocol version"}</h3>
                        <p>
                          Pinned version {checkIn.protocolVersion} ·{" "}
                          <time dateTime={checkIn.practiceDate}>{formattedDate}</time>
                        </p>
                      </div>
                      <form action={setPracticeCheckIn}>
                        <input type="hidden" name="towerId" value={tower.id} />
                        <input type="hidden" name="protocolId" value={checkIn.protocolId} />
                        <input
                          type="hidden"
                          name="protocolVersion"
                          value={checkIn.protocolVersion}
                        />
                        <input type="hidden" name="practiceDate" value={checkIn.practiceDate} />
                        <input type="hidden" name="recorded" value="false" />
                        <button
                          className="secondary-action"
                          type="submit"
                          aria-label={`Undo ${protocol?.title ?? "protocol"} practice on ${formattedDate}`}
                        >
                          Undo
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        <section className="tower-catalog" aria-labelledby="tower-catalog-heading">
          <p className="eyebrow">Published catalog</p>
          <h2 id="tower-catalog-heading">Add a protocol block</h2>
          {catalog.status === "unavailable" ? (
            <div className="state-card" role="status">
              <h3>The catalog is temporarily unavailable</h3>
              <p>Your saved tower has not changed.</p>
            </div>
          ) : availableProtocols.length === 0 ? (
            <p>Every current protocol is already in this tower.</p>
          ) : (
            <ul className="add-protocol-list">
              {availableProtocols.map((protocol) => (
                <li key={protocol.id}>
                  <div>
                    <h3>{protocol.title}</h3>
                    <p>{protocol.summary}</p>
                    <small>Current published version {protocol.version}</small>
                  </div>
                  <form action={addTowerItemAction}>
                    <input type="hidden" name="towerId" value={tower.id} />
                    <input type="hidden" name="revision" value={tower.revision} />
                    <input type="hidden" name="protocolId" value={protocol.id} />
                    <button
                      className="secondary-action"
                      type="submit"
                      disabled={tower.items.length >= maximumItemsPerTower}
                    >
                      Add to {tower.title}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
