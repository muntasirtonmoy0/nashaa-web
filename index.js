require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "YOUR_DISCORD_BOT_TOKEN";
const GUILD_ID = process.env.GUILD_ID || "YOUR_NASHA_DISCORD_SERVER_ID";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

async function syncNashaStats(guild) {
  try {
    const targetGuild = guild || (await client.guilds.fetch(GUILD_ID));
    if (!targetGuild || targetGuild.id !== GUILD_ID) return;

    // Fetch fresh guild data so memberCount and premiumSubscriptionCount stay accurate
    const freshGuild = await targetGuild.fetch();
    const members = Number(freshGuild.memberCount || 0);
    const boosts = Number(freshGuild.premiumSubscriptionCount || 0);
    const maxBoosts = 36;

    await db.collection("nasha_server").doc("live_stats").set(
      {
        members,
        boosts,
        maxBoosts,
        announcement: `We now have <strong class='text-white'>${members.toLocaleString()}+ Members</strong> • Boost Goal <strong class='text-cyan-300'>${boosts}/${maxBoosts}</strong> • #GVWY Live!`,
        lastSyncedAt: new Date().toISOString()
      },
      { merge: true }
    );

    console.log(`[Nasha Sync] ${freshGuild.name}: ${members} members | ${boosts}/${maxBoosts} boosts`);
  } catch (err) {
    console.error("[Nasha Sync Error]", err);
  }
}

client.once("clientReady", async () => {
  console.log(`[Bot Online] Logged in as ${client.user.tag}`);
  await syncNashaStats();
});

client.on("guildMemberAdd", (member) => syncNashaStats(member.guild));
client.on("guildMemberRemove", (member) => syncNashaStats(member.guild));
client.on("guildUpdate", (oldGuild, newGuild) => {
  if (
    oldGuild.memberCount !== newGuild.memberCount ||
    oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount
  ) {
    syncNashaStats(newGuild);
  }
});

// Optional periodic safety sync every 5 minutes
setInterval(() => {
  if (client.isReady()) {
    syncNashaStats();
  }
}, 5 * 60 * 1000);

client.login(BOT_TOKEN);
