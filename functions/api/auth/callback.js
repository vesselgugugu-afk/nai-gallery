import { createSessionCookie } from "../../_lib/session.js";
import { upsertUser, isWhitelisted } from "../../_lib/db.js";
import { requestAuditFields } from "../../_lib/request.js";
import { base64UrlEncode, hmacSha256 } from "../../_lib/crypto.js";
import {
  GUILD_WHITELIST_KEY,
  GUILD_BLACKLIST_KEY,
  readGuildList,
  fetchUserGuilds,
  fetchMemberRoles,
} from "../../_lib/guild-access.js";

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function validState(request, env, state) {
  const cookieState = readCookie(request, "nai_oauth_state");
  if (!state || state !== cookieState) return false;
  const [nonce, timestamp, signature] = state.split(".");
  if (!nonce || !timestamp || !signature) return false;
  if (Date.now() - Number(timestamp) > 10 * 60 * 1000) return false;
  const expected = base64UrlEncode(await hmacSha256(env.SESSION_SECRET, `${nonce}.${timestamp}`));
  return signature === expected;
}

async function recordLogin(env, request, user, result, reason) {
  const audit = await requestAuditFields(request, env);
  await env.DB.prepare(
    `INSERT INTO login_logs (discord_id, username, ip_hash, user_agent, timestamp, result, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      user.id,
      user.username || "",
      audit.ip_hash,
      audit.user_agent,
      new Date().toISOString(),
      result,
      reason || null,
    )
    .run();
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);
  if (!(await validState(request, env, state))) {
    return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);
  }

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
  });
  if (!tokenResponse.ok) return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);

  const token = await tokenResponse.json();
  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!userResponse.ok) return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);

  const user = await userResponse.json();

  const blocked = await env.DB.prepare("SELECT 1 AS blocked FROM blacklist WHERE discord_id = ? LIMIT 1")
    .bind(user.id)
    .first();
  if (blocked) {
    await recordLogin(env, request, user, "blocked", "personal_blacklist");
    return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/`, 302);
  }

  const baseUrl = env.PUBLIC_BASE_URL || url.origin;
  const whitelist = await readGuildList(env, GUILD_WHITELIST_KEY);
  const blacklist = await readGuildList(env, GUILD_BLACKLIST_KEY);
  const hasGuildAccessRules = whitelist.length > 0 || blacklist.length > 0;

  if (hasGuildAccessRules) {
    const guilds = await fetchUserGuilds(token.access_token);
    if (!guilds) {
      await recordLogin(env, request, user, "blocked", "guild_lookup_failed");
      return Response.redirect(`${baseUrl}/?auth=failed`, 302);
    }
    const userGuildIds = new Set(guilds.map(g => g.id));

    // A personal whitelist entry exempts a user from the server/role
    // blacklist checks below. The individual user blacklist is checked
    // earlier and always wins, regardless of whitelist.
    const personallyWhitelisted = await isWhitelisted(env, user.id);

    // 1) Server/role blacklist: block unless personally whitelisted.
    const serverBlacklist = blacklist.filter(g => !g.role_id);
    let blacklisted = serverBlacklist.some(g => userGuildIds.has(g.guild_id));
    if (!blacklisted) {
      const roleBlacklist = blacklist.filter(g => g.role_id);
      for (const rule of roleBlacklist) {
        if (!userGuildIds.has(rule.guild_id)) continue;
        const roles = await fetchMemberRoles(token.access_token, rule.guild_id);
        // Fail closed: an unverifiable role lookup is treated as blacklisted,
        // but a personal whitelist can still exempt it below.
        if (roles === null || roles.includes(rule.role_id)) {
          blacklisted = true;
          break;
        }
      }
    }
    if (blacklisted && !personallyWhitelisted) {
      await recordLogin(env, request, user, "blocked", "guild_blacklist");
      return Response.redirect(`${baseUrl}/`, 302);
    }

    // 2) Server/role whitelist acts as an admission gate when configured.
    if (whitelist.length) {
      const serverWhitelist = whitelist.filter(g => !g.role_id);
      const roleWhitelist = whitelist.filter(g => g.role_id);
      let whitelisted = serverWhitelist.some(g => userGuildIds.has(g.guild_id));
      if (!whitelisted) {
        for (const rule of roleWhitelist) {
          if (!userGuildIds.has(rule.guild_id)) continue;
          const roles = await fetchMemberRoles(token.access_token, rule.guild_id);
          if (Array.isArray(roles) && roles.includes(rule.role_id)) {
            whitelisted = true;
            break;
          }
        }
      }
      if (!whitelisted) {
        await recordLogin(env, request, user, "blocked", "guild_whitelist");
        return Response.redirect(`${baseUrl}/?auth=not_in_guild`, 302);
      }
    }
  } else {
    // Legacy Discord guild + role verification (only used when no D1 server list is set).
    // DISCORD_GUILD_ROLE_PAIRS accepts comma-separated guild:role pairs.
    // The older DISCORD_GUILD_ID + DISCORD_REQUIRED_ROLE_ID settings remain supported.
    if (env.DISCORD_GUILD_ID) {
      const guildIds = env.DISCORD_GUILD_ID.split(',').map(s => s.trim()).filter(Boolean);
      let inGuild = false;
      let memberRoles = [];
      for (const gid of guildIds) {
        const memberUrl = `https://discord.com/api/users/@me/guilds/${gid}/member`;
        const memberResp = await fetch(memberUrl, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        if (memberResp.ok) {
          inGuild = true;
          if (env.DISCORD_REQUIRED_ROLE_ID) {
            const member = await memberResp.json();
            memberRoles = member.roles || [];
          }
          break;
        }
      }
      if (!inGuild) {
        await recordLogin(env, request, user, "blocked", "not_in_guild");
        return Response.redirect(`${baseUrl}/?auth=not_in_guild`, 302);
      }
      if (env.DISCORD_REQUIRED_ROLE_ID && !memberRoles.includes(env.DISCORD_REQUIRED_ROLE_ID)) {
        await recordLogin(env, request, user, "blocked", "role_denied");
        return Response.redirect(`${baseUrl}/?auth=role_denied`, 302);
      }
    }

    if (env.DISCORD_GUILD_ROLE_PAIRS) {
      const pairs = env.DISCORD_GUILD_ROLE_PAIRS.split(',')
        .map(pair => pair.trim().split(':').map(value => value.trim()))
        .filter(([guildId, roleId]) => guildId && roleId);
      let allowed = false;
      for (const [guildId, roleId] of pairs) {
        const memberResp = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        if (memberResp.ok) {
          const member = await memberResp.json();
          if ((member.roles || []).includes(roleId)) {
            allowed = true;
            break;
          }
        }
      }
      if (!allowed) {
        await recordLogin(env, request, user, "blocked", "role_denied");
        return Response.redirect(`${baseUrl}/?auth=role_denied`, 302);
      }
    }
  }

  await upsertUser(env, user);
  await env.DB.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE discord_id = ?")
    .bind(new Date().toISOString(), new Date().toISOString(), user.id)
    .run();
  await recordLogin(env, request, user, "success");
  const cookie = await createSessionCookie(env, user.id);
  const headers = new Headers({ Location: `${env.PUBLIC_BASE_URL || url.origin}/` });
  headers.append("Set-Cookie", cookie);
  headers.append("Set-Cookie", "nai_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return new Response(null, {
    status: 302,
    headers,
  });
}
