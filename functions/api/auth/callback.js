import { createSessionCookie } from "../../_lib/session.js";
import { upsertUser } from "../../_lib/db.js";
import { base64UrlEncode, hmacSha256 } from "../../_lib/crypto.js";
import {
  GUILD_WHITELIST_KEY,
  GUILD_BLACKLIST_KEY,
  readGuildList,
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
    return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/`, 302);
  }

  const baseUrl = env.PUBLIC_BASE_URL || url.origin;
  const whitelist = await readGuildList(env, GUILD_WHITELIST_KEY);
  const blacklist = await readGuildList(env, GUILD_BLACKLIST_KEY);
  const hasGuildAccessRules = whitelist.length > 0 || blacklist.length > 0;

  if (hasGuildAccessRules) {
    const guildsResp = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!guildsResp.ok) {
      return Response.redirect(`${baseUrl}/?auth=failed`, 302);
    }
    const guilds = await guildsResp.json();
    const userGuildIds = new Set((Array.isArray(guilds) ? guilds : []).map(g => g.id));

    const serverBlacklist = blacklist.filter(g => !g.role_id);
    const roleBlacklist = blacklist.filter(g => g.role_id);
    if (serverBlacklist.some(g => userGuildIds.has(g.guild_id))) {
      return Response.redirect(`${baseUrl}/`, 302);
    }
    for (const rule of roleBlacklist) {
      if (!userGuildIds.has(rule.guild_id)) continue;
      const roles = await fetchMemberRoles(token.access_token, rule.guild_id);
      if (roles.includes(rule.role_id)) {
        return Response.redirect(`${baseUrl}/`, 302);
      }
    }

    if (whitelist.length) {
      const serverWhitelist = whitelist.filter(g => !g.role_id);
      const roleWhitelist = whitelist.filter(g => g.role_id);
      let allowed = serverWhitelist.some(g => userGuildIds.has(g.guild_id));
      if (!allowed) {
        for (const rule of roleWhitelist) {
          if (!userGuildIds.has(rule.guild_id)) continue;
          const roles = await fetchMemberRoles(token.access_token, rule.guild_id);
          if (roles.includes(rule.role_id)) {
            allowed = true;
            break;
          }
        }
      }
      if (!allowed) {
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
        return Response.redirect(`${baseUrl}/?auth=not_in_guild`, 302);
      }
      if (env.DISCORD_REQUIRED_ROLE_ID && !memberRoles.includes(env.DISCORD_REQUIRED_ROLE_ID)) {
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
        return Response.redirect(`${baseUrl}/?auth=role_denied`, 302);
      }
    }
  }

  await upsertUser(env, user);
  await env.DB.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE discord_id = ?")
    .bind(new Date().toISOString(), new Date().toISOString(), user.id)
    .run();
  const cookie = await createSessionCookie(env, user.id);
  const headers = new Headers({ Location: `${env.PUBLIC_BASE_URL || url.origin}/` });
  headers.append("Set-Cookie", cookie);
  headers.append("Set-Cookie", "nai_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return new Response(null, {
    status: 302,
    headers,
  });
}
