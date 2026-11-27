/**
 * 🍁.Nʌsʜʌ™.🍁 — Firebase Config (nashaa-717c9), Firestore Sync & NASHA_STORE Bridge
 */

window.NASHA_CONFIG = {
  serverName: "🍁.Nʌsʜʌ™.🍁",
  defaultMembers: 2720,
  defaultBoosts: 15,
  maxBoosts: 36,
  discordInvite: "https://discord.gg/nasha",
  founderEmails: ["muntasirtonmoy10@gmail.com"],
  adminEmails: ["muntasirtonmoy10@gmail.com"],
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
    STATS: "nasha_live_stats_v5",
    EVENTS: "nasha_events_giveaways_v5",
    STAFF: "nasha_staff_roster_v5",
    SETTINGS: "nasha_founder_settings_v5"
  };

  const DEFAULT_DATA = {
    stats: {
      members: 2720,
      boosts: 15,
      maxBoosts: 36,
      announcement: "We now have <strong class='text-white'>2,720+ Members</strong> • Boost Goal <strong class='text-cyan-300'>15/36</strong> • #GVWY Live!"
    },
    settings: {
      maintenanceMode: false,
      discordWebhookUrl: "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN",
      autoSyncBot: true
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

  function syncLegacyStore() {
    const stats = readLocal(STORAGE_KEYS.STATS, DEFAULT_DATA.stats);
    const events = readLocal(STORAGE_KEYS.EVENTS, DEFAULT_DATA.events);
    const staff = readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff);
    window.NASHA_STORE = {
      server: {
        name: window.NASHA_CONFIG.serverName,
        members: stats.members,
        boosts: stats.boosts,
        boostGoal: stats.maxBoosts || 36,
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
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
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
    if (firestoreInstance) await firestoreInstance.collection("nasha_server").doc("live_stats").set(merged, { merge: true });
    return merged;
  }
  async function getSettings() { return readLocal(STORAGE_KEYS.SETTINGS, DEFAULT_DATA.settings); }
  async function updateSettings(newSettings) {
    const merged = { ...(await getSettings()), ...newSettings };
    writeLocal(STORAGE_KEYS.SETTINGS, merged);
    if (firestoreInstance) await firestoreInstance.collection("nasha_server").doc("founder_settings").set(merged, { merge: true });
    return merged;
  }
  async function getEvents() { return readLocal(STORAGE_KEYS.EVENTS, DEFAULT_DATA.events); }
  async function addEvent(eventObj) {
    const count = eventObj.rsvps ?? eventObj.participants ?? 1;
    const item = { id: "ev-" + Date.now(), rsvps: count, participants: count, createdAt: new Date().toISOString(), ...eventObj };
    const current = await getEvents();
    current.unshift(item);
    writeLocal(STORAGE_KEYS.EVENTS, current);
    if (firestoreInstance) await firestoreInstance.collection("events_giveaways").doc(item.id).set(item);
    return item;
  }
  async function deleteEvent(id) {
    const current = (await getEvents()).filter((e) => String(e.id) !== String(id));
    writeLocal(STORAGE_KEYS.EVENTS, current);
    if (firestoreInstance) await firestoreInstance.collection("events_giveaways").doc(String(id)).delete();
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
      if (firestoreInstance) await firestoreInstance.collection("events_giveaways").doc(String(id)).update({ rsvps: target.rsvps, participants: target.participants });
    }
    return current;
  }
  async function getStaff() { return readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff); }
  async function saveStaffMember(member) {
    const current = await getStaff();
    const idx = current.findIndex((s) => s.id === member.id || (member.discordId && s.discordId === member.discordId));
    const entry = { id: member.id || "st-" + Date.now(), ...member };
    if (idx >= 0) current[idx] = { ...current[idx], ...entry };
    else current.push(entry);
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance) await firestoreInstance.collection("staff_members").doc(entry.id).set(entry, { merge: true });
    return entry;
  }
  async function deleteStaffMember(id) {
    const current = (await getStaff()).filter((s) => String(s.id) !== String(id));
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance) await firestoreInstance.collection("staff_members").doc(String(id)).delete();
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

window.NashaDB.initFirebase();
