/**
 * 🍁.Nʌsʜʌ™.🍁 — Complete Firebase Config (nashaa-717c9), Firestore Sync & Bot-Free Discord Sync
 * Ranks: founder, owner, admin, moderator, staff, member
 */

window.NASHA_CONFIG = {
  serverName: "🍁.Nʌsʜʌ™.🍁",
  defaultMembers: 2720,
  inviteCode: "nasha",
  guildId: "1367356170347479040",
  discordInvite: "https://discord.gg/nasha",
  founderEmails: ["muntasirtonmoy10@gmail.com"],
  ownerEmails: [],
  adminEmails: [],
  moderatorEmails: [],
  staffEmails: [],
  firebase: {
    apiKey: "AIzaSyDMOa5okvfJsntVlM3CP1WNp7LRWuBVjI8",
    authDomain: "nashaa-717c9.firebaseapp.com",
    projectId: "nashaa-717c9",
    storageBucket: "nashaa-717c9.firebasestorage.app",
    messagingSenderId: "692524952028",
    appId: "1:692524952028:web:39817532ab120ddf824719",
    measurementId: "G-0FM6KVTP43"
  }
};

window.NashaDB = (function () {
  const STORAGE_KEYS = {
    STATS: "nasha_live_stats_v8",
    EVENTS: "nasha_events_giveaways_v8",
    STAFF: "nasha_staff_roster_v8",
    SETTINGS: "nasha_founder_settings_v8"
  };

  const VALID_RANKS = ["founder", "owner", "admin", "moderator", "staff", "member"];

  function normalizeRank(val) {
    const clean = String(val || "member").toLowerCase().trim();
    return VALID_RANKS.includes(clean) ? clean : "member";
  }

  const DEFAULT_DATA = {
    stats: {
      members: 2720,
      online: null,
      announcement: "We now have <strong class='text-white'>2,720+ Members</strong> • #GVWY Live!"
    },
    settings: {
      maintenanceMode: false,
      autoSyncInvite: true
    },
    events: [],
    staff: []
  };

  let firebaseApp = null;
  let firestoreInstance = null;
  let firebaseAuthInstance = null;

  function initFirebase() {
    if (typeof firebase === "undefined" || !window.NASHA_CONFIG || !window.NASHA_CONFIG.firebase) {
      syncLegacyStore();
      return { enabled: false };
    }
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(window.NASHA_CONFIG.firebase);
      } else {
        firebaseApp = firebase.app();
      }
      firestoreInstance = firebase.firestore(firebaseApp);
      firebaseAuthInstance = firebase.auth(firebaseApp);
      startRealtimeSync();
      syncLegacyStore();
      return { enabled: true, app: firebaseApp, db: firestoreInstance, auth: firebaseAuthInstance };
    } catch (err) {
      console.warn("[NashaDB] Firebase init warning:", err);
      syncLegacyStore();
      return { enabled: false };
    }
  }

  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
    } catch (e) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  function writeLocal(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
    syncLegacyStore();
    window.dispatchEvent(new CustomEvent("nasha:data-updated", { detail: { key, val } }));
  }

  function normalizeStaff(st) {
    const rank = normalizeRank(st.rank || st.roleRank || st.role);
    const colorMap = {
      founder: "from-amber-400 via-yellow-300 to-amber-600",
      owner: "from-rose-400 via-amber-300 to-orange-500",
      admin: "from-cyan-400 via-sky-400 to-blue-600",
      moderator: "from-indigo-400 via-purple-400 to-blue-600",
      staff: "from-emerald-400 via-teal-400 to-cyan-600",
      member: "from-slate-400 via-sky-300 to-blue-500"
    };
    return {
      ...st,
      rank,
      role: st.role || st.bio || st.badge || rank.toUpperCase(),
      bio: st.bio || st.role || "",
      badgeColor: st.badgeColor || colorMap[rank]
    };
  }

  function syncLegacyStore() {
    const stats = readLocal(STORAGE_KEYS.STATS, DEFAULT_DATA.stats);
    const events = readLocal(STORAGE_KEYS.EVENTS, DEFAULT_DATA.events);
    const staff = readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff).map(normalizeStaff);
    window.NASHA_STORE = {
      server: {
        name: window.NASHA_CONFIG.serverName,
        members: stats.members,
        online: stats.online,
        announcement: stats.announcement,
        inviteUrl: window.NASHA_CONFIG.discordInvite
      },
      events,
      staff
    };
  }

  function startRealtimeSync() {
    if (!firestoreInstance) return;
    firestoreInstance.collection("nasha_server").doc("live_stats").onSnapshot((doc) => {
      if (doc.exists) writeLocal(STORAGE_KEYS.STATS, { ...DEFAULT_DATA.stats, ...doc.data() });
    });
    firestoreInstance.collection("nasha_server").doc("founder_settings").onSnapshot((doc) => {
      if (doc.exists) writeLocal(STORAGE_KEYS.SETTINGS, { ...DEFAULT_DATA.settings, ...doc.data() });
    });
    firestoreInstance.collection("events_giveaways").orderBy("endsAt", "asc").onSnapshot((snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      writeLocal(STORAGE_KEYS.EVENTS, list);
    });
    firestoreInstance.collection("staff_members").onSnapshot((snap) => {
      const list = [];
      snap.forEach((d) => list.push(normalizeStaff({ id: d.id, ...d.data() })));
      writeLocal(STORAGE_KEYS.STAFF, list);
    });
  }

  async function saveUserProfile(userObj) {
    if (!firestoreInstance || !userObj || !userObj.uid) return;
    await firestoreInstance.collection("user_profiles").doc(userObj.uid).set(userObj, { merge: true });
  }

  async function fetchUserProfile(uid) {
    if (!firestoreInstance || !uid) return null;
    const doc = await firestoreInstance.collection("user_profiles").doc(uid).get();
    return doc.exists ? doc.data() : null;
  }

  async function getStats() { return readLocal(STORAGE_KEYS.STATS, DEFAULT_DATA.stats); }
  async function updateStats(newStats) {
    const merged = { ...(await getStats()), ...newStats };
    writeLocal(STORAGE_KEYS.STATS, merged);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("nasha_server").doc("live_stats").set(merged, { merge: true }).catch(() => {});
    }
    return merged;
  }

  async function getSettings() { return readLocal(STORAGE_KEYS.SETTINGS, DEFAULT_DATA.settings); }
  async function updateSettings(newSettings) {
    const merged = { ...(await getSettings()), ...newSettings };
    writeLocal(STORAGE_KEYS.SETTINGS, merged);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("nasha_server").doc("founder_settings").set(merged, { merge: true }).catch(() => {});
    }
    return merged;
  }

  async function getEvents() { return readLocal(STORAGE_KEYS.EVENTS, DEFAULT_DATA.events); }
  async function addEvent(eventObj) {
    const count = eventObj.rsvps ?? eventObj.participants ?? 1;
    const item = { id: "ev-" + Date.now(), rsvps: count, participants: count, createdAt: new Date().toISOString(), ...eventObj };
    const current = await getEvents();
    current.unshift(item);
    writeLocal(STORAGE_KEYS.EVENTS, current);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("events_giveaways").doc(item.id).set(item).catch(() => {});
    }
    return item;
  }

  async function deleteEvent(id) {
    const current = (await getEvents()).filter((e) => String(e.id) !== String(id));
    writeLocal(STORAGE_KEYS.EVENTS, current);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("events_giveaways").doc(String(id)).delete().catch(() => {});
    }
  }

  async function toggleRsvp(id) {
    const current = await getEvents();
    const target = current.find((e) => String(e.id) === String(id));
    if (target) {
      target.rsvped = !target.rsvped;
      const delta = target.rsvped ? 1 : -1;
      target.rsvps = Math.max(0, (target.rsvps || 0) + delta);
      target.participants = target.rsvps;
      writeLocal(STORAGE_KEYS.EVENTS, current);
      if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
        await firestoreInstance.collection("events_giveaways").doc(String(id)).update({
          rsvps: target.rsvps,
          participants: target.participants
        }).catch(() => {});
      }
    }
    return current;
  }

  async function getStaff() { return readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff).map(normalizeStaff); }
  async function saveStaffMember(member) {
    const current = await getStaff();
    const idx = current.findIndex((s) => s.id === member.id || (member.discordId && s.discordId === member.discordId));
    const entry = normalizeStaff({ id: member.id || "st-" + Date.now(), ...member });
    if (idx >= 0) current[idx] = { ...current[idx], ...entry };
    else current.push(entry);
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("staff_members").doc(entry.id).set(entry, { merge: true }).catch(() => {});
    }
    return entry;
  }

  async function deleteStaffMember(id) {
    const current = (await getStaff()).filter((s) => String(s.id) !== String(id));
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("staff_members").doc(String(id)).delete().catch(() => {});
    }
  }

  syncLegacyStore();

  return {
    initFirebase,
    getAuth: () => firebaseAuthInstance || initFirebase().auth,
    getFirestore: () => firestoreInstance || initFirebase().db,
    saveUserProfile,
    fetchUserProfile,
    getStats,
    updateStats,
    getSettings,
    updateSettings,
    getEvents,
    addEvent,
    deleteEvent,
    toggleRsvp,
    getStaff,
    saveStaffMember,
    deleteStaffMember
  };
})();

window.syncDiscordNoBot = async function () {
  const settings = await window.NashaDB.getSettings();
  if (settings && settings.autoSyncInvite === false) return;
  const rawCode = window.NASHA_CONFIG && window.NASHA_CONFIG.inviteCode;
  if (!rawCode || rawCode === "YOUR_PERMANENT_INVITE_CODE") return;
  const code = String(rawCode).replace(/^https?:\/\/discord\.gg\//i, "").trim();
  if (!code) return;

  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`);
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.approximate_member_count === "number") {
      const liveMembers = data.approximate_member_count;
      await window.NashaDB.updateStats({
        members: liveMembers,
        announcement: `We now have <strong class='text-white'>${liveMembers.toLocaleString()}+ Members</strong> • #GVWY Live!`
      });
    }
  } catch (err) {
    console.warn("[Discord No-Bot Sync]", err);
  }
};

window.syncDiscordWidgetOnline = async function () {
  const settings = await window.NashaDB.getSettings();
  if (settings && settings.autoSyncInvite === false) return null;
  const guildId = window.NASHA_CONFIG && window.NASHA_CONFIG.guildId;
  if (!guildId || guildId === "YOUR_GUILD_ID") return null;

  try {
    const res = await fetch(`https://discord.com/api/guilds/${encodeURIComponent(guildId)}/widget.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.presence_count === "number") {
      await window.NashaDB.updateStats({ online: data.presence_count });
      return data.presence_count;
    }
    return null;
  } catch (err) {
    return null;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.NashaDB.initFirebase();
  window.syncDiscordNoBot();
  window.syncDiscordWidgetOnline();
  setInterval(() => {
    window.syncDiscordNoBot();
    window.syncDiscordWidgetOnline();
  }, 60 * 1000);
});
