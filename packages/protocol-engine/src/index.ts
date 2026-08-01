import { z } from "zod";

const trimmedText = (maximumLength: number) => z.string().trim().min(1).max(maximumLength);

export const protocolIdSchema = z.uuid().brand<"ProtocolId">();
export type ProtocolId = z.infer<typeof protocolIdSchema>;

export const protocolSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .brand<"ProtocolSlug">();
export type ProtocolSlug = z.infer<typeof protocolSlugSchema>;

export const protocolStepSchema = z
  .object({
    position: z.int().positive(),
    title: trimmedText(120),
    description: trimmedText(1_000),
  })
  .strict();
export type ProtocolStep = Readonly<z.infer<typeof protocolStepSchema>>;

export const protocolReferenceSchema = z
  .object({
    label: trimmedText(160),
    url: z.url().refine((value) => new URL(value).protocol === "https:", {
      message: "Protocol references must use HTTPS.",
    }),
  })
  .strict();
export type ProtocolReference = Readonly<z.infer<typeof protocolReferenceSchema>>;

const cautionSchema = trimmedText(500);

export const publishedProtocolSchema = z
  .object({
    id: protocolIdSchema,
    slug: protocolSlugSchema,
    version: z.int().positive(),
    title: trimmedText(140),
    summary: trimmedText(500),
    overview: trimmedText(4_000),
    steps: z.array(protocolStepSchema).min(1).max(20),
    cautions: z.array(cautionSchema).min(1).max(20),
    references: z.array(protocolReferenceSchema).max(20),
    publishedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((protocol, context) => {
    const stepTitles = new Set<string>();
    protocol.steps.forEach((step, index) => {
      if (step.position !== index + 1) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "position"],
          message: "Protocol steps must have contiguous positions beginning at 1.",
        });
      }

      const normalizedTitle = step.title.toLocaleLowerCase("en-US");
      if (stepTitles.has(normalizedTitle)) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "title"],
          message: "Protocol step titles must be unique.",
        });
      }
      stepTitles.add(normalizedTitle);
    });

    const normalizedCautions = protocol.cautions.map((caution) =>
      caution.toLocaleLowerCase("en-US"),
    );
    if (new Set(normalizedCautions).size !== normalizedCautions.length) {
      context.addIssue({
        code: "custom",
        path: ["cautions"],
        message: "Protocol cautions must be unique.",
      });
    }
  });

export type PublishedProtocol = Readonly<z.infer<typeof publishedProtocolSchema>>;

export type CatalogQueryResult<T> =
  Readonly<{ status: "available"; value: T }> | Readonly<{ status: "unavailable" }>;

export interface ProtocolCatalogRepository {
  listPublished(): Promise<CatalogQueryResult<readonly PublishedProtocol[]>>;
  findPublishedBySlug(slug: ProtocolSlug): Promise<CatalogQueryResult<PublishedProtocol | null>>;
}

export function parsePublishedProtocol(input: unknown): PublishedProtocol {
  return publishedProtocolSchema.parse(input);
}

export function parseProtocolSlug(input: unknown): ProtocolSlug {
  return protocolSlugSchema.parse(input);
}

export const protocolEngineStatus = "read-only-catalog" as const;
