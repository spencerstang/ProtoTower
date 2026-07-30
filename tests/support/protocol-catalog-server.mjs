import { createServer } from "node:http";

const port = Number.parseInt(process.env.PROTOCOL_CATALOG_MOCK_PORT ?? "54329", 10);
const expectedKey = "synthetic-playwright-anon-key";

const catalog = [
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "desk-movement-breaks",
    version: 1,
    title: "Desk movement breaks",
    summary: "A synthetic routine for adding gentle movement pauses to desk time.",
    overview:
      "Use ordinary transitions as reminders to stand, change position, or take a short comfortable walk.",
    steps: [
      {
        position: 1,
        title: "Choose a transition",
        description: "Use a routine transition as a movement cue.",
      },
      {
        position: 2,
        title: "Move comfortably",
        description: "Stand, change position, or walk briefly within your normal ability.",
      },
      {
        position: 3,
        title: "Resume without pressure",
        description: "Return to the next task without treating a missed break as failure.",
      },
    ],
    cautions: [
      "Stay within your normal range of comfortable movement.",
      "Stop if movement causes pain or dizziness.",
    ],
    reference_links: [],
    published_at: "2026-07-29T12:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "evening-wind-down",
    version: 1,
    title: "Evening wind-down",
    summary: "A synthetic routine for creating a calm transition into the evening.",
    overview:
      "Pair a small environmental change with a short planning step to make the end of the day feel deliberate.",
    steps: [
      {
        position: 1,
        title: "Mark the transition",
        description: "Choose a consistent evening cue, such as dimming a lamp.",
      },
      {
        position: 2,
        title: "Prepare one thing",
        description: "Set out one ordinary item that will make tomorrow easier.",
      },
      {
        position: 3,
        title: "Choose a quiet activity",
        description: "Spend a few comfortable minutes on a low-pressure activity.",
      },
    ],
    cautions: [
      "Keep pathways and rooms safely lit.",
      "Choose an activity that fits your needs and environment.",
    ],
    reference_links: [
      {
        label: "Synthetic educational reference",
        url: "https://example.com/evening-transition",
      },
    ],
    published_at: "2026-07-29T12:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "morning-light-routine",
    version: 2,
    title: "Morning outdoor cue",
    summary:
      "A revised synthetic routine for pairing a safe outdoor pause with the start of the day.",
    overview:
      "Build the first level of a habit tower with a brief, repeatable outdoor cue that stays comfortable.",
    steps: [
      {
        position: 1,
        title: "Pick a repeatable cue",
        description: "Choose a normal morning action that can remind you to step outside.",
      },
      {
        position: 2,
        title: "Use a comfortable outdoor space",
        description: "Spend a brief period in a safe location without looking directly at the sun.",
      },
      {
        position: 3,
        title: "Return to the day",
        description: "End the pause whenever conditions feel uncomfortable.",
      },
    ],
    cautions: [
      "Never look directly at the sun.",
      "Use an accessible location and stop if conditions are uncomfortable.",
    ],
    reference_links: [
      {
        label: "Synthetic educational reference",
        url: "https://example.com/morning-outdoor-cue",
      },
    ],
    published_at: "2026-07-29T13:00:00.000Z",
  },
];

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"status":"ok"}');
    return;
  }

  if (url.pathname !== "/rest/v1/published_protocol_catalog") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end("[]");
    return;
  }

  if (
    request.headers["apikey"] !== expectedKey ||
    request.headers["authorization"] !== `Bearer ${expectedKey}`
  ) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end('{"message":"synthetic authorization failure"}');
    return;
  }

  const slugFilter = url.searchParams.get("slug");
  if (slugFilter === "eq.catalog-unavailable") {
    response.writeHead(503, { "content-type": "application/json" });
    response.end('{"message":"synthetic provider diagnostic"}');
    return;
  }

  const rows =
    slugFilter?.startsWith("eq.") === true
      ? catalog.filter((protocol) => protocol.slug === slugFilter.slice(3))
      : catalog;

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(rows));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Synthetic protocol catalog listening on http://127.0.0.1:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
