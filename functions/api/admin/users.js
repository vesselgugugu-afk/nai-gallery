import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    `SELECT u.discord_id, u.username, u.avatar, u.role, u.created_at, u.updated_at, u.last_login_at,
            COUNT(DISTINCT ub.batch_id) AS unlock_count,
            COUNT(DISTINCT dl.id) AS download_count,
            MAX(ub.last_seen_at) AS last_active
     FROM users u
     LEFT JOIN user_batch_unlocks ub ON u.discord_id = ub.discord_id
     LEFT JOIN downloads_log dl ON u.discord_id = dl.discord_id
     GROUP BY u.discord_id
     ORDER BY u.created_at DESC`,
  ).all();

  const blocked = await env.DB.prepare(
    `SELECT discord_id, note, created_at, created_by
     FROM blacklist ORDER BY created_at DESC`,
  ).all();

  const allowed = await env.DB.prepare(
    `SELECT discord_id, note, created_at, created_by
     FROM whitelist ORDER BY created_at DESC`,
  ).all();

  return json({
    users: rows.results || [],
    blacklist: blocked.results || [],
    whitelist: allowed.results || [],
  });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const list = body.list === "whitelist" ? "whitelist" : "blacklist";
  const rawIds = Array.isArray(body.discord_ids)
    ? body.discord_ids
    : (body.discord_id ? [body.discord_id] : []);
  const note = String(body.note || "").trim() || null;
  const now = new Date().toISOString();
  const seen = new Set();
  const discordIds = [];
  let selfCount = 0;
  for (const raw of rawIds) {
    const id = String(raw ?? "").trim();
    if (!/^\d{17,20}$/.test(id) || seen.has(id)) continue;
    if (id === auth.session.discord_id) {
      selfCount += 1;
      continue;
    }
    seen.add(id);
    discordIds.push(id);
  }
  if (!discordIds.length) {
    const selfError = list === "whitelist" ? "cannot_whitelist_self" : "cannot_blacklist_self";
    return json({ error: selfCount ? selfError : "invalid_discord_id" }, 400);
  }

  // "list" is constrained to a fixed enum above, so interpolating the table
  // name is safe here.
  for (const discordId of discordIds) {
    await env.DB.prepare(
      `INSERT INTO ${list} (discord_id, note, created_at, created_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(discord_id) DO UPDATE SET note = excluded.note`,
    ).bind(discordId, note, now, auth.session.discord_id).run();
  }

  const countKey = list === "whitelist" ? "whitelisted" : "blacklisted";
  return json({ ok: true, [countKey]: discordIds.length });
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const list = url.searchParams.get("list") === "whitelist" ? "whitelist" : "blacklist";
  const discordId = String(url.searchParams.get("discord_id") || "").trim();
  if (!/^\d{17,20}$/.test(discordId)) return json({ error: "invalid_discord_id" }, 400);
  await env.DB.prepare(`DELETE FROM ${list} WHERE discord_id = ?`).bind(discordId).run();
  return json({ ok: true });
}
