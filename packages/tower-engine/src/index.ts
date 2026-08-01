import { protocolIdSchema, type ProtocolId } from "@protostack/protocol-engine";
import { z } from "zod";

export const maximumTowersPerOwner = 12;
export const maximumItemsPerTower = 20;

const forbiddenTitleCharacters = /[\p{Cc}\p{Cf}]/u;

function normalizeTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export const towerIdSchema = z.uuid().brand<"TowerId">();
export type TowerId = z.infer<typeof towerIdSchema>;

export const towerTitleSchema = z
  .string()
  .transform(normalizeTitle)
  .refine((value) => Array.from(value).length >= 1, "Tower title is required.")
  .refine((value) => Array.from(value).length <= 80, "Tower title must be 80 characters or fewer.")
  .refine(
    (value) => !forbiddenTitleCharacters.test(value),
    "Tower title contains a control character.",
  )
  .brand<"TowerTitle">();
export type TowerTitle = z.infer<typeof towerTitleSchema>;

export const towerRevisionSchema = z.int().nonnegative().brand<"TowerRevision">();
export type TowerRevision = z.infer<typeof towerRevisionSchema>;

export const towerItemSchema = z
  .object({
    protocolId: protocolIdSchema,
    protocolVersion: z.int().positive(),
    position: z.int().min(1).max(maximumItemsPerTower),
  })
  .strict();
export type TowerItem = Readonly<z.infer<typeof towerItemSchema>>;

export const personalTowerSchema = z
  .object({
    id: towerIdSchema,
    title: towerTitleSchema,
    revision: towerRevisionSchema,
    items: z.array(towerItemSchema).max(maximumItemsPerTower),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((tower, context) => {
    const protocolIds = new Set<ProtocolId>();
    tower.items.forEach((item, index) => {
      if (item.position !== index + 1) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "position"],
          message: "Tower item positions must be contiguous beginning at 1.",
        });
      }
      if (protocolIds.has(item.protocolId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "protocolId"],
          message: "A protocol can appear only once in a tower.",
        });
      }
      protocolIds.add(item.protocolId);
    });
  });
export type PersonalTower = Readonly<z.infer<typeof personalTowerSchema>>;

export type TowerQueryResult<T> =
  Readonly<{ status: "available"; value: T }> | Readonly<{ status: "unavailable" }>;

export type TowerMutationRejection = "conflict" | "invalid_input" | "limit_reached" | "not_found";

export type TowerMutationResult<T> =
  | Readonly<{ status: "available"; value: T }>
  | Readonly<{ status: "rejected"; reason: TowerMutationRejection }>
  | Readonly<{ status: "unavailable" }>;

export type SaveTowerInput = Readonly<{
  id: TowerId;
  title: TowerTitle;
  items: readonly TowerItem[];
  expectedRevision: TowerRevision;
}>;

export type DeleteTowerInput = Readonly<{
  id: TowerId;
  expectedRevision: TowerRevision;
}>;

export interface PersonalTowerRepository {
  list(): Promise<TowerQueryResult<readonly PersonalTower[]>>;
  findById(id: TowerId): Promise<TowerQueryResult<PersonalTower | null>>;
  create(title: TowerTitle): Promise<TowerMutationResult<PersonalTower>>;
  save(input: SaveTowerInput): Promise<TowerMutationResult<PersonalTower>>;
  delete(input: DeleteTowerInput): Promise<TowerMutationResult<boolean>>;
}

export function parseTowerTitle(input: unknown): TowerTitle {
  return towerTitleSchema.parse(input);
}

export function parsePersonalTower(input: unknown): PersonalTower {
  return personalTowerSchema.parse(input);
}

export function assertTowerCreationAllowed(existingTowerCount: number): void {
  z.int()
    .nonnegative()
    .max(maximumTowersPerOwner - 1)
    .parse(existingTowerCount);
}

export function addTowerItem(
  items: readonly TowerItem[],
  protocolId: ProtocolId,
  protocolVersion: number,
): readonly TowerItem[] {
  if (items.length >= maximumItemsPerTower) {
    throw new Error("Tower item limit reached.");
  }
  if (items.some((item) => item.protocolId === protocolId)) {
    throw new Error("Protocol is already in this tower.");
  }

  return [
    ...items,
    towerItemSchema.parse({ protocolId, protocolVersion, position: items.length + 1 }),
  ];
}

export function removeTowerItem(
  items: readonly TowerItem[],
  protocolId: ProtocolId,
): readonly TowerItem[] {
  return items
    .filter((item) => item.protocolId !== protocolId)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

export function moveTowerItem(
  items: readonly TowerItem[],
  protocolId: ProtocolId,
  direction: "up" | "down",
): readonly TowerItem[] {
  const index = items.findIndex((item) => item.protocolId === protocolId);
  if (index < 0) throw new Error("Tower item was not found.");

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const reordered = [...items];
  const current = reordered[index];
  const target = reordered[targetIndex];
  if (!current || !target) throw new Error("Tower order is invalid.");
  reordered[index] = target;
  reordered[targetIndex] = current;
  return reordered.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 }));
}

export const towerEngineStatus = "authenticated-goal-towers" as const;
