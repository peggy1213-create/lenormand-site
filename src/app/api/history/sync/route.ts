import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type IncomingReading = { id: string; data: unknown; updatedAt: string };
type IncomingTombstone = { id: string; deletedAt: string };
type SyncBody = { readings?: IncomingReading[]; tombstones?: IncomingTombstone[] };

const MAX_ITEMS = 1000; // hard cap on how many rows one request may touch
const MAX_DATA_BYTES = 100_000; // per-reading blob cap

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function tsOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export async function POST(req: Request) {
  // Require a signed-in user.
  let userId: string | null = null;
  try {
    const auth = await getAuth(new URL(req.url).origin);
    const session = await auth.api.getSession({ headers: req.headers });
    userId = session?.user?.id ?? null;
  } catch {
    return jsonError("auth_unavailable", 503);
  }
  if (!userId) return jsonError("unauthorized", 401);

  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("bad_request", 400);
  }

  const readings = Array.isArray(body.readings) ? body.readings.slice(0, MAX_ITEMS) : [];
  const tombstones = Array.isArray(body.tombstones) ? body.tombstones.slice(0, MAX_ITEMS) : [];

  let db: D1Database;
  try {
    const { env } = await getCloudflareContext({ async: true });
    db = env.DB;
  } catch {
    return jsonError("runtime_unavailable", 503);
  }
  if (!db) return jsonError("db_unavailable", 503);

  // Current server state for this user, keyed by id.
  type Row = { id: string; updatedAt: number; deleted: number; createdAt: number };
  const existing = new Map<string, Row>();
  const cur = await db
    .prepare("SELECT id, updatedAt, deleted, createdAt FROM reading WHERE userId = ?")
    .bind(userId)
    .all<Row>();
  for (const r of cur.results ?? []) existing.set(r.id, r);

  const upsert = db.prepare(
    `INSERT INTO reading (userId, id, data, updatedAt, deleted, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId, id) DO UPDATE SET
       data = excluded.data,
       updatedAt = excluded.updatedAt,
       deleted = excluded.deleted`,
  );
  const stmts: D1PreparedStatement[] = [];

  // Live readings: apply only if strictly newer than what we hold.
  for (const r of readings) {
    if (!r || typeof r.id !== "string" || typeof r.updatedAt !== "string") continue;
    const ts = tsOf(r.updatedAt);
    if (ts === 0) continue;
    const ex = existing.get(r.id);
    if (ex && ts <= ex.updatedAt) continue;
    const dataStr = JSON.stringify(r.data ?? {});
    if (dataStr.length > MAX_DATA_BYTES) continue;
    stmts.push(upsert.bind(userId, r.id, dataStr, ts, 0, ex?.createdAt ?? ts));
    existing.set(r.id, { id: r.id, updatedAt: ts, deleted: 0, createdAt: ex?.createdAt ?? ts });
  }

  // Tombstones: apply only if newer than what we hold.
  for (const t of tombstones) {
    if (!t || typeof t.id !== "string" || typeof t.deletedAt !== "string") continue;
    const ts = tsOf(t.deletedAt);
    if (ts === 0) continue;
    const ex = existing.get(t.id);
    if (ex && ts <= ex.updatedAt) continue;
    stmts.push(upsert.bind(userId, t.id, "", ts, 1, ex?.createdAt ?? ts));
    existing.set(t.id, { id: t.id, updatedAt: ts, deleted: 1, createdAt: ex?.createdAt ?? ts });
  }

  if (stmts.length > 0) {
    try {
      await db.batch(stmts);
    } catch (e) {
      console.error("history sync write error:", e);
      return jsonError("db_write_error", 502);
    }
  }

  // Return the full authoritative state so every device converges.
  const all = await db
    .prepare("SELECT id, data, updatedAt, deleted FROM reading WHERE userId = ?")
    .bind(userId)
    .all<{ id: string; data: string; updatedAt: number; deleted: number }>();

  const outReadings: { id: string; data: unknown; updatedAt: string }[] = [];
  const outTombstones: { id: string; deletedAt: string }[] = [];
  for (const row of all.results ?? []) {
    if (row.deleted) {
      outTombstones.push({ id: row.id, deletedAt: new Date(row.updatedAt).toISOString() });
    } else {
      let data: unknown = {};
      try {
        data = JSON.parse(row.data || "{}");
      } catch {
        data = {};
      }
      outReadings.push({ id: row.id, data, updatedAt: new Date(row.updatedAt).toISOString() });
    }
  }

  return Response.json({
    readings: outReadings,
    tombstones: outTombstones,
    serverTime: new Date().toISOString(),
  });
}
