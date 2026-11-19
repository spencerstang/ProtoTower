import type { Database } from "@protostack/database";
import type { PublishedProtocol } from "@protostack/protocol-engine";
import {
  parseAdherenceStatus,
  type AdherenceStatus,
  type PersonalTower,
} from "@protostack/tower-engine";
import { currentTowerPeriod, utcCalendarDate } from "@protostack/tracking-engine";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StarterProtocolPin = Readonly<{
  id: string;
  version: number;
  title: string;
  slug: string;
}>;

export type StarterSurface = Readonly<{
  overlapNote: string | null;
  metricLabel: string | null;
  primary: Readonly<StarterProtocolPin & { stepTitle: string; stepDescription: string }> | null;
  secondary: StarterProtocolPin | null;
  showCautions: boolean;
  cautionLines: readonly string[];
  adherence: readonly { protocolId: string; status: AdherenceStatus }[];
  outcomeSkipped: boolean;
  outcomeText: string | null;
}>;

function publishedMatch(
  protocols: readonly PublishedProtocol[],
  id: string | null,
  version: number | null,
): PublishedProtocol | null {
  if (!id || version === null) return null;
  return protocols.find((protocol) => protocol.id === id && protocol.version === version) ?? null;
}

export async function loadStarterSurface(
  client: SupabaseClient<Database>,
  tower: PersonalTower,
  protocols: readonly PublishedProtocol[],
): Promise<StarterSurface | null> {
  if (!tower.starterMatchKey) return null;
  const { data: rule, error } = await client
    .from("starter_rules")
    .select(
      "match_key,overlap_note,metric_label,primary_protocol_id,primary_version,primary_title,primary_slug,primary_step_title,primary_step_description,secondary_protocol_id,secondary_version,secondary_title,secondary_slug,show_cautions,caution_lines",
    )
    .eq("match_key", tower.starterMatchKey)
    .maybeSingle();
  if (error || !rule) return null;
  if (rule.match_key !== tower.starterMatchKey) return null;

  const primaryPublished = publishedMatch(
    protocols,
    rule.primary_protocol_id,
    rule.primary_version,
  );
  const secondaryPublished = publishedMatch(
    protocols,
    rule.secondary_protocol_id,
    rule.secondary_version,
  );
  const primaryStep = primaryPublished?.steps[0];
  const primary =
    rule.primary_protocol_id &&
    rule.primary_version &&
    rule.primary_title &&
    rule.primary_slug &&
    (primaryStep || (rule.primary_step_title && rule.primary_step_description))
      ? {
          id: rule.primary_protocol_id,
          version: rule.primary_version,
          title: primaryPublished?.title ?? rule.primary_title,
          slug: primaryPublished?.slug ?? rule.primary_slug,
          stepTitle: primaryStep?.title ?? rule.primary_step_title ?? "",
          stepDescription: primaryStep?.description ?? rule.primary_step_description ?? "",
        }
      : null;
  const secondary =
    rule.secondary_protocol_id &&
    rule.secondary_version &&
    rule.secondary_title &&
    rule.secondary_slug
      ? {
          id: rule.secondary_protocol_id,
          version: rule.secondary_version,
          title: secondaryPublished?.title ?? rule.secondary_title,
          slug: secondaryPublished?.slug ?? rule.secondary_slug,
        }
      : null;

  const today = utcCalendarDate(new Date());
  const period = currentTowerPeriod({
    cadence: "weekly",
    customDates: [],
    anchorDate: utcCalendarDate(new Date(tower.createdAt)),
    today,
  });
  const adherenceQuery = period
    ? await client
        .from("starter_adherence")
        .select("protocol_id,status")
        .eq("tower_id", tower.id)
        .eq("period_start", period)
    : { data: [], error: null };
  const outcomeQuery = period
    ? await client
        .from("starter_outcome_readings")
        .select("skipped,text_value")
        .eq("tower_id", tower.id)
        .eq("period_start", period)
        .maybeSingle()
    : { data: null, error: null };
  if (adherenceQuery.error || outcomeQuery.error) return null;

  const adherence = (adherenceQuery.data ?? []).flatMap((row) => {
    const status = parseAdherenceStatus(row.status);
    return status ? [{ protocolId: row.protocol_id, status }] : [];
  });

  return {
    overlapNote: rule.overlap_note,
    metricLabel: rule.metric_label,
    primary,
    secondary,
    showCautions: rule.show_cautions,
    cautionLines: secondaryPublished?.cautions ?? rule.caution_lines,
    adherence,
    outcomeSkipped: outcomeQuery.data?.skipped ?? false,
    outcomeText: outcomeQuery.data?.text_value ?? null,
  };
}
