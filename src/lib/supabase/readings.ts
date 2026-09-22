import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reading, ApiFollowUp } from "@/lib/storage";

type DbReading = {
  id: string;
  user_id: string;
  created_at: string;
  spread: string;
  question: string | null;
  cards: { cardId: number; position: number }[];
  notes: string | null;
  tags: string[] | null;
  lang: string;
  api_reading_text: string | null;
  api_follow_ups: ApiFollowUp[] | null;
};

function toReading(row: DbReading): Reading {
  return {
    id: row.id,
    createdAt: row.created_at,
    spread: row.spread as Reading["spread"],
    question: row.question ?? undefined,
    cards: row.cards,
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    lang: row.lang as Reading["lang"],
    apiReadingText: row.api_reading_text ?? undefined,
    apiFollowUps: row.api_follow_ups ?? undefined,
  };
}

export async function fetchReadings(supabase: SupabaseClient): Promise<Reading[]> {
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch readings:", error);
    return [];
  }

  return (data as DbReading[]).map(toReading);
}

export async function upsertReading(
  supabase: SupabaseClient,
  userId: string,
  reading: Reading,
): Promise<void> {
  const { error } = await supabase.from("readings").upsert({
    id: reading.id,
    user_id: userId,
    created_at: reading.createdAt,
    spread: reading.spread,
    question: reading.question ?? null,
    cards: reading.cards,
    notes: reading.notes ?? null,
    tags: reading.tags ?? [],
    lang: reading.lang,
    api_reading_text: reading.apiReadingText ?? null,
    api_follow_ups: reading.apiFollowUps ?? null,
  });

  if (error) console.error("Failed to upsert reading:", error);
}

export async function updateReadingField(
  supabase: SupabaseClient,
  id: string,
  fields: Partial<{
    notes: string | null;
    tags: string[];
    api_reading_text: string | null;
    api_follow_ups: ApiFollowUp[] | null;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from("readings")
    .update(fields)
    .eq("id", id);

  if (error) console.error("Failed to update reading:", error);
}

export async function deleteReadingsFromDb(
  supabase: SupabaseClient,
  ids: string[],
): Promise<void> {
  const { error } = await supabase
    .from("readings")
    .delete()
    .in("id", ids);

  if (error) console.error("Failed to delete readings:", error);
}
