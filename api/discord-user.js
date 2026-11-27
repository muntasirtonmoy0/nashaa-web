// api/discord-user.js — Vercel Serverless Function (queries Discord REST API directly without inviting any bot)
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || !/^\d{17,20}$/.test(String(id))) {
    return res.status(400).json({ error: "Invalid Discord Snowflake ID" });
  }

  const token = process.env.DISCORD_LOOKUP_TOKEN;

  try {
    let user = null;

    if (token) {
      const r = await fetch(`https://discord.com/api/v10/users/${id}`, {
        headers: { Authorization: `Bot ${token}` }
      });
      if (r.ok) user = await r.json();
    }

    // Fallback to public lookup API if DISCORD_LOOKUP_TOKEN is not set in Vercel yet
    if (!user) {
      const fallback = await fetch(`https://japi.rest/discord/v1/user/${id}`);
      if (fallback.ok) {
        const json = await fallback.json();
        user = json.data || json;
      }
    }

    if (!user || !user.id) {
      return res.status(404).json({ error: "Discord user not found" });
    }

    const avatarExt = user.avatar && user.avatar.startsWith("a_") ? "gif" : "png";
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${avatarExt}?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;

    const decoAsset = user.avatar_decoration_data && user.avatar_decoration_data.asset;
    const decorationUrl = decoAsset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${decoAsset}.png?size=256`
      : null;

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      avatarUrl,
      decorationUrl
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch Discord profile" });
  }
}
