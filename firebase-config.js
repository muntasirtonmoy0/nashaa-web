/**
 * 🍁.Nʌsʜʌ™.🍁 — Firebase Configuration, Role Permissions & Firestore Sync
 * Matches GitHub repo structure:
 * index.html, events-giveaway.html, gallery.html, staff-info.html, FAQ-about.html,
 * admin-panel.html, founder-panel.html, profile.html, style.css
 */

window.NASHA_CONFIG = {
  serverName: "🍁.Nʌsʜʌ™.🍁",
  defaultMembers: 2720,
  defaultBoosts: 15,
  maxBoosts: 36,
  discordInvite: "https://discord.gg/nasha",
  founderEmails: ["founder@nasha.gg", "chief@nasha.gg"],
  adminEmails: ["admin@nasha.gg", "staff@nasha.gg"],
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};

window.NashaDB = (function () {
  const STORAGE_KEYS = {
    STATS: "nasha_live_stats_v3",
    EVENTS: "nasha_events_giveaways_v3",
    STAFF: "nasha_staff_roster_v3",
    SETTINGS: "nasha_founder_settings_v3"
  };

  const DEFAULT_DATA = {
    stats: {
      members: 2720,
      boosts: 15,
      maxBoosts: 36,
      announcement: "🎉 WE NOW HAVE 2,720+ MEMBERS IN 🍁.Nʌsʜʌ™.🍁 — Level 3 Perks & #GVWY Live!"
    },
    settings: {
      maintenanceMode: false,
      discordWebhookUrl: "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN",
      autoSyncBot: true
    },
    events: [
      {
        id: "ev-1",
        type: "giveaway",
        channel: "#GVWY",
        title: "2x Discord Nitro Monthly Drop",
        prize: "2x Nitro Boost ($9.99)",
        endsAt: "2026-12-01T20:00:00",
        description: "React in #GVWY and stay active in #CHAT to qualify for our milestone celebration drop.",
        rsvps: 184
      },
      {
        id: "ev-2",
        type: "event",
        channel: "#MUSIC-VC",
        title: "Midnight Acoustic & Lo-Fi Chill Session",
        prize: "Custom .RICH Role + 50k OwO",
        endsAt: "2026-11-29T23:00:00",
        description: "Join Music VC 1 & 2 for live tracks, late-night karaoke, and community vibe checks.",
        rsvps: 96
      },
      {
        id: "ev-3",
        type: "tournament",
        channel: "#EVENT",
        title: "Chess in the Park & Valo Custom Lobby",
        prize: "1x Nitro Basic + Hall of Fame Pin",
        endsAt: "2026-12-04T21:30:00",
        description: "Bracketed 1v1 Chess followed by 5v5 custom lobbies hosted by .CHIEF. & .SOORAN. staff.",
        rsvps: 142
      }
    ],
    staff: [
      {
        id: "st-1",
        name: "TONMOY",
        handle: "@pika_chu0_0",
        discordId: "1089451239847125012",
        roleRank: ".CHIEF.",
        accessTier: "founder",
        badge: "Founder & Bot Architect",
        bio: "Lead developer & server architect behind 🍁.Nʌsʜʌ™.🍁 automation, custom bots, and community events."
      },
      {
        id: "st-2",
        name: "DUCHESS",
        handle: "@nsh_duchess",
        discordId: "984512039481203948",
        roleRank: ".DUCHESS.",
        accessTier: "founder",
        badge: "Co-Founder & Community Lead",
        bio: "Curates server aesthetics, #LAW enforcement, welcome experience, and late-night VC events."
      },
      {
        id: "st-3",
        name: "SOORAN",
        handle: "@nsh_sooran",
        discordId: "871230948120394812",
        roleRank: ".SOORAN.",
        accessTier: "admin",
        badge: "Head Moderator & Event Host",
        bio: "Runs #GVWY drops, Chess in the Park tournaments, and staff shift coordination."
      },
      {
        id: "st-4",
        name: "RICHY",
        handle: "@nsh_richy",
        discordId: "765432109876543210",
        roleRank: ".RICHY.",
        accessTier: "admin",
        badge: "Booster & Economy Manager",
        bio: "Manages #RICH booster perks, #HEX color roles, and OwO/economy milestones."
      }
    ]
  };

  let firestoreInstance = null;
  let firebaseAuthInstance = null;

  function isFirebaseConfigured() {
    const cfg = window.NASHA_CONFIG && window.NASHA_CONFIG.firebase;
    return Boolean(cfg && cfg.apiKey && !cfg.apiKey.startsWith("YOUR_"));
  }

  function initFirebase() {
    if (!isFirebaseConfigured() || typeof firebase === "undefined") {
      return { enabled: false };
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.NASHA_CONFIG.firebase);
      }
      firestoreInstance = firebase.firestore();
      firebaseAuthInstance = firebase.auth();
      startRealtimeSync();
      return { enabled: true, db: firestoreInstance, auth: firebaseAuthInstance };
    } catch (err) {
      console.warn("[NashaDB] Firebase init fallback to local mode:", err);
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
    window.dispatchEvent(new CustomEvent("nasha:data-updated", { detail: { key, val } }));
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
      if (list.length) writeLocal(STORAGE_KEYS.EVENTS, list);
    });
    firestoreInstance.collection("staff_members").onSnapshot((snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      if (list.length) writeLocal(STORAGE_KEYS.STAFF, list);
    });
  }

  async function getStats() {
    return readLocal(STORAGE_KEYS.STATS, DEFAULT_DATA.stats);
  }

  async function updateStats(newStats) {
    const merged = { ...(await getStats()), ...newStats };
    writeLocal(STORAGE_KEYS.STATS, merged);
    if (firestoreInstance) {
      await firestoreInstance.collection("nasha_server").doc("live_stats").set(merged, { merge: true });
    }
    return merged;
  }

  async function getSettings() {
    return readLocal(STORAGE_KEYS.SETTINGS, DEFAULT_DATA.settings);
  }

  async function updateSettings(newSettings) {
    const merged = { ...(await getSettings()), ...newSettings };
    writeLocal(STORAGE_KEYS.SETTINGS, merged);
    if (firestoreInstance) {
      await firestoreInstance.collection("nasha_server").doc("founder_settings").set(merged, { merge: true });
    }
    return merged;
  }

  async function getEvents() {
    return readLocal(STORAGE_KEYS.EVENTS, DEFAULT_DATA.events);
  }

  async function addEvent(eventObj) {
    const item = {
      id: "ev-" + Date.now(),
      rsvps: 1,
      createdAt: new Date().toISOString(),
      ...eventObj
    };
    const current = await getEvents();
    current.unshift(item);
    writeLocal(STORAGE_KEYS.EVENTS, current);
    if (firestoreInstance) {
      await firestoreInstance.collection("events_giveaways").doc(item.id).set(item);
    }
    return item;
  }

  async function deleteEvent(id) {
    const current = (await getEvents()).filter((e) => e.id !== id);
    writeLocal(STORAGE_KEYS.EVENTS, current);
    if (firestoreInstance) {
      await firestoreInstance.collection("events_giveaways").doc(id).delete();
    }
  }

  async function toggleRsvp(id) {
    const current = await getEvents();
    const target = current.find((e) => e.id === id);
    if (target) {
      target.rsvps = (target.rsvps || 0) + 1;
      writeLocal(STORAGE_KEYS.EVENTS, current);
      if (firestoreInstance) {
        await firestoreInstance.collection("events_giveaways").doc(id).update({ rsvps: target.rsvps });
      }
    }
    return current;
  }

  async function getStaff() {
    return readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff);
  }

  async function saveStaffMember(member) {
    const current = await getStaff();
    const idx = current.findIndex((s) => s.id === member.id || (member.discordId && s.discordId === member.discordId));
    const entry = {
      id: member.id || "st-" + Date.now(),
      accessTier: member.roleRank === ".CHIEF." || member.roleRank === ".DUCHESS." ? "founder" : "admin",
      ...member
    };
    if (idx >= 0) current[idx] = { ...current[idx], ...entry };
    else current.push(entry);
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance) {
      await firestoreInstance.collection("staff_members").doc(entry.id).set(entry, { merge: true });
    }
    return entry;
  }

  async function deleteStaffMember(id) {
    const current = (await getStaff()).filter((s) => s.id !== id);
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance) {
      await firestoreInstance.collection("staff_members").doc(id).delete();
    }
  }

  return {
    initFirebase,
    isFirebaseConfigured,
    getAuth: () => firebaseAuthInstance,
    getFirestore: () => firestoreInstance,
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

document.addEventListener("DOMContentLoaded", () => {
  window.NashaDB.initFirebase();
});
