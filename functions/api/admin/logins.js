import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  const [rows, countRow] = await Promise.all([
    env.DB.prepare(
      `SELECT l.id, l.discord_id, u.username, l.ip_hash, l.user_agent, l.timestamp, l.result, l.reason
       FROM login_logs l
       LEFT JOIN users u ON u.discord_id = l.discord_id
       ORDER BY l.timestamp DESC, l.id DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(limit, offset)
      .all(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM login_logs").first(),
  ]);

  return json({
    logins: rows.results || [],
    total: Number(countRow?.count || 0),
  });
}
