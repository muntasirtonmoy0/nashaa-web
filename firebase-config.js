/**
 * 🍁.Nʌsʜʌ™.🍁 — Complete Firebase Config (nashaa-717c9), Live Discord PFP/Deco Sync, Claim Keys & Activity Logs
 * Load BEFORE auth-modal.js and navbar.js on every HTML page.
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

window.ROLE_PERMISSIONS = {
  founder: {
    label: "Founder",
    perms: [
      "Full access to Admin Panel & Founder Panel",
      "Assign or remove email ranks (founder, owner, admin, moderator, staff, member)",
      "Pre-register staff Discord IDs, generate Claim Keys, and edit display names",
      "View all staff activity logs",
      "Publish & delete announcements, giveaways/events, and update live server stats"
    ]
  },
  owner: {
    label: "Owner",
    perms: [
      "Full access to Admin Panel & Founder Panel",
      "Assign or remove email ranks, generate Claim Keys, and edit staff display names",
      "View all staff activity logs",
      "Publish & delete announcements, giveaways/events, and update live server stats"
    ]
  },
  admin: {
    label: "Admin",
    perms: [
      "Access Admin Panel",
      "Publish & delete announcements, giveaways, and server events",
      "Moderate RSVPs and log staff actions"
    ]
  },
  moderator: {
    label: "Moderator",
    perms: [
      "Access Admin Panel",
      "Publish & delete announcements and community events",
      "Moderate active event entries"
    ]
  },
  staff: {
    label: "Staff",
    perms: [
      "Access Admin Panel",
      "Publish announcements and community events"
    ]
  },
  member: {
    label: "Member",
    perms: [
      "View public pages, events, and announcements",
      "RSVP to giveaways/events and customize personal profile"
    ]
  }
};

window.NashaDB = (function () {
  const STORAGE_KEYS = {
    STATS: "nasha_live_stats_v10",
    EVENTS: "nasha_events_giveaways_v10",
    STAFF: "nasha_staff_roster_v10",
    USER_PROFILES: "nasha_all_user_profiles_v10",
    SETTINGS: "nasha_founder_settings_v10",
    ANNOUNCEMENTS: "nasha_announcements_v10",
    ROLE_ASSIGNMENTS: "nasha_role_assignments_v10",
    ACTIVITY: "nasha_staff_activity_v10"
  };

  const VALID_RANKS = ["founder", "owner", "admin", "moderator", "staff", "member"];
  const STAFF_RANKS = ["founder", "owner", "admin", "moderator", "staff"];

  function normalizeRank(val) {
    const clean = String(val || "member").toLowerCase().trim();
    return VALID_RANKS.includes(clean) ? clean : "member";
  }

  const DEFAULT_DATA = {
    stats: {
      members: 2720,
      online: null,
      widgetMembers: [],
      announcement: "We now have <strong class='text-white'>2,720+ Members</strong> • Giveaways Live!"
    },
    settings: {
      maintenanceMode: false,
      autoSyncInvite: true
    },
    events: [],
    staff: [],
    userProfiles: [],
    announcements: [],
    roleAssignments: [],
    activity: []
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

  function getBadgeColor(rank) {
    const colorMap = {
      founder: "from-amber-400 via-yellow-300 to-amber-600",
      owner: "from-rose-400 via-amber-300 to-orange-500",
      admin: "from-cyan-400 via-sky-400 to-blue-600",
      moderator: "from-indigo-400 via-purple-400 to-blue-600",
      staff: "from-emerald-400 via-teal-400 to-cyan-600",
      member: "from-slate-400 via-sky-300 to-blue-500"
    };
    return colorMap[rank] || colorMap.member;
  }

  function buildCombinedStaffDirectory() {
    const manualStaff = readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff);
    const profiles = readLocal(STORAGE_KEYS.USER_PROFILES, DEFAULT_DATA.userProfiles);
    const assignments = readLocal(STORAGE_KEYS.ROLE_ASSIGNMENTS, DEFAULT_DATA.roleAssignments);
    const stats = readLocal(STORAGE_KEYS.STATS, DEFAULT_DATA.stats);
    const widgetOnline = Array.isArray(stats.widgetMembers) ? stats.widgetMembers : [];

    const byKey = new Map();

    profiles.forEach((p) => {
      const cleanEmail = String(p.email || "").trim().toLowerCase();
      const assigned = assignments.find((a) => String(a.email || "").toLowerCase() === cleanEmail);
      const effectiveRank = normalizeRank((assigned && assigned.role) || p.role);
      if (!STAFF_RANKS.includes(effectiveRank)) return;

      const hasDiscordId = p.discordId && /^\d{17,20}$/.test(String(p.discordId));
      const isOnlineInWidget = widgetOnline.some(
        (wm) =>
          (hasDiscordId && String(wm.id) === String(p.discordId)) ||
          (p.discordHandle && String(wm.username || "").toLowerCase() === String(p.discordHandle).replace(/^@/, "").toLowerCase())
      );

      const mapKey = hasDiscordId ? String(p.discordId) : (p.uid || cleanEmail);
      byKey.set(mapKey, {
        id: p.uid || cleanEmail,
        uid: p.uid || "",
        email: cleanEmail,
        name: p.name || cleanEmail.split("@")[0] || "Staff",
        rank: effectiveRank,
        discordId: p.discordId || "Not Linked",
        discordHandle: p.discordHandle || "",
        avatarUrl: p.avatarUrl || (hasDiscordId ? "" : (p.photoURL || "")),
        decorationUrl: p.decorationUrl || "",
        hexColor: p.hexColor || "#38bdf8",
        onlineInDiscord: isOnlineInWidget,
        role: `${effectiveRank.charAt(0).toUpperCase() + effectiveRank.slice(1)} • Verified Account`,
        badgeColor: getBadgeColor(effectiveRank),
        source: "profile"
      });
    });

    manualStaff.forEach((st) => {
      const rank = normalizeRank(st.rank || st.roleRank || st.role);
      const hasDiscordId = st.discordId && /^\d{17,20}$/.test(String(st.discordId));
      const mapKey = hasDiscordId ? String(st.discordId) : (st.uid || st.email || st.id);
      const existing = byKey.get(mapKey);
      const isOnlineInWidget = widgetOnline.some((wm) => hasDiscordId && String(wm.id) === String(st.discordId));

      const resolvedAvatar =
        st.avatarUrl ||
        (existing && existing.avatarUrl) ||
        (hasDiscordId ? "" : ((existing && existing.photoURL) || ""));
      const resolvedDeco =
        st.decorationUrl ||
        (existing && existing.decorationUrl) ||
        "";
      const resolvedName =
        (st.lockCustomName && st.name) ||
        st.name ||
        (existing && existing.name) ||
        "Staff";

      byKey.set(mapKey, {
        ...(existing || {}),
        ...st,
        id: st.id || mapKey,
        uid: st.uid || (existing && existing.uid) || "",
        email: st.claimedByEmail || st.email || (existing && existing.email) || "",
        name: resolvedName,
        rank,
        discordId: st.discordId || (existing && existing.discordId) || "Not Linked",
        discordHandle: st.discordHandle || (existing && existing.discordHandle) || "",
        avatarUrl: resolvedAvatar,
        decorationUrl: resolvedDeco,
        onlineInDiscord: isOnlineInWidget || Boolean(existing && existing.onlineInDiscord),
        role: st.bio || st.role || `${rank.charAt(0).toUpperCase() + rank.slice(1)}`,
        badgeColor: getBadgeColor(rank)
      });
    });

    const rankOrder = { founder: 1, owner: 2, admin: 3, moderator: 4, staff: 5, member: 6 };
    return Array.from(byKey.values()).sort((a, b) => (rankOrder[a.rank] || 9) - (rankOrder[b.rank] || 9));
  }

  function syncLegacyStore() {
    const stats = readLocal(STORAGE_KEYS.STATS, DEFAULT_DATA.stats);
    const events = readLocal(STORAGE_KEYS.EVENTS, DEFAULT_DATA.events);
    const staff = buildCombinedStaffDirectory();
    const announcements = readLocal(STORAGE_KEYS.ANNOUNCEMENTS, DEFAULT_DATA.announcements);
    const roleAssignments = readLocal(STORAGE_KEYS.ROLE_ASSIGNMENTS, DEFAULT_DATA.roleAssignments);
    const activity = readLocal(STORAGE_KEYS.ACTIVITY, DEFAULT_DATA.activity);

    window.NASHA_STORE = {
      server: {
        name: window.NASHA_CONFIG.serverName,
        members: stats.members,
        online: stats.online,
        announcement: stats.announcement,
        inviteUrl: window.NASHA_CONFIG.discordInvite
      },
      events,
      staff,
      announcements,
      roleAssignments,
      activity
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
      const prevList = readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff);
      const list = [];
      snap.forEach((d) => {
        const remote = { id: d.id, ...d.data() };
        const local = prevList.find((x) => x.id === remote.id || (remote.discordId && x.discordId === remote.discordId)) || {};
        list.push({
          ...local,
          ...remote,
          name: remote.name || local.name,
          avatarUrl: remote.avatarUrl || local.avatarUrl || "",
          decorationUrl: remote.decorationUrl || local.decorationUrl || ""
        });
      });
      writeLocal(STORAGE_KEYS.STAFF, list);
    });

    firestoreInstance.collection("user_profiles").onSnapshot((snap) => {
      const prevList = readLocal(STORAGE_KEYS.USER_PROFILES, DEFAULT_DATA.userProfiles);
      const list = [];
      snap.forEach((d) => {
        const remote = { uid: d.id, ...d.data() };
        const local = prevList.find((x) => x.uid === remote.uid || (remote.email && x.email === remote.email)) || {};
        list.push({
          ...local,
          ...remote,
          name: remote.name || local.name,
          avatarUrl: remote.avatarUrl || local.avatarUrl || "",
          decorationUrl: remote.decorationUrl || local.decorationUrl || ""
        });
      });
      writeLocal(STORAGE_KEYS.USER_PROFILES, list);
    });

    firestoreInstance.collection("announcements").orderBy("createdAt", "desc").onSnapshot((snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      writeLocal(STORAGE_KEYS.ANNOUNCEMENTS, list);
    });

    firestoreInstance.collection("role_assignments").onSnapshot((snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data(), role: normalizeRank(d.data().role) }));
      writeLocal(STORAGE_KEYS.ROLE_ASSIGNMENTS, list);
    });

    firestoreInstance.collection("staff_activity").orderBy("timestamp", "desc").limit(50).onSnapshot((snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      writeLocal(STORAGE_KEYS.ACTIVITY, list);
    });
  }

  async function logActivity(actionText, category = "general") {
    const user = window.NashaAuth && window.NashaAuth.getUser ? window.NashaAuth.getUser() : null;
    const entry = {
      id: "act-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      actorName: (user && user.name) || "Staff",
      actorEmail: (user && user.email) || "",
      actorRole: normalizeRank(user && user.role),
      action: actionText,
      category,
      timestamp: new Date().toISOString()
    };
    const current = readLocal(STORAGE_KEYS.ACTIVITY, DEFAULT_DATA.activity);
    current.unshift(entry);
    writeLocal(STORAGE_KEYS.ACTIVITY, current.slice(0, 50));

    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("staff_activity").doc(entry.id).set(entry).catch(() => {});
    }
    return entry;
  }

  async function getActivity() {
    return readLocal(STORAGE_KEYS.ACTIVITY, DEFAULT_DATA.activity);
  }

  async function getAllUserProfiles() {
    return readLocal(STORAGE_KEYS.USER_PROFILES, DEFAULT_DATA.userProfiles);
  }

  async function updateUserProfileByFounder(uid, updates) {
    if (!uid) return null;
    const list = await getAllUserProfiles();
    const idx = list.findIndex((u) => u.uid === uid);
    const updated = { ...(idx >= 0 ? list[idx] : { uid }), ...updates };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    writeLocal(STORAGE_KEYS.USER_PROFILES, list);

    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("user_profiles").doc(uid).set(updated, { merge: true }).catch(() => {});
    }
    await logActivity(`Founder updated staff profile "${updated.name || uid}"`, "staff");
    return updated;
  }

  async function getRoleAssignments() {
    return readLocal(STORAGE_KEYS.ROLE_ASSIGNMENTS, DEFAULT_DATA.roleAssignments);
  }

  async function assignRoleToEmail(email, role) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanRole = normalizeRank(role);
    if (!cleanEmail) return null;

    const docId = cleanEmail.replace(/[^a-zA-Z0-9._-]/g, "_");
    const entry = {
      id: docId,
      email: cleanEmail,
      role: cleanRole,
      updatedAt: new Date().toISOString()
    };

    const current = await getRoleAssignments();
    const idx = current.findIndex((r) => String(r.email).toLowerCase() === cleanEmail);
    if (idx >= 0) current[idx] = entry;
    else current.push(entry);
    writeLocal(STORAGE_KEYS.ROLE_ASSIGNMENTS, current);

    const profiles = await getAllUserProfiles();
    const matchedProfile = profiles.find((p) => String(p.email || "").toLowerCase() === cleanEmail);
    if (matchedProfile && matchedProfile.uid) {
      await updateUserProfileByFounder(matchedProfile.uid, { role: cleanRole });
    }

    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("role_assignments").doc(docId).set(entry, { merge: true }).catch(() => {});
    }
    await logActivity(`Assigned rank "${cleanRole}" to ${cleanEmail}`, "role");
    return entry;
  }

  async function removeRoleAssignment(email) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const docId = cleanEmail.replace(/[^a-zA-Z0-9._-]/g, "_");
    const current = (await getRoleAssignments()).filter((r) => String(r.email).toLowerCase() !== cleanEmail);
    writeLocal(STORAGE_KEYS.ROLE_ASSIGNMENTS, current);

    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("role_assignments").doc(docId).delete().catch(() => {});
    }
    await logActivity(`Removed custom rank assignment for ${cleanEmail}`, "role");
  }

  async function getAnnouncements() {
    return readLocal(STORAGE_KEYS.ANNOUNCEMENTS, DEFAULT_DATA.announcements);
  }

  async function addAnnouncement({ title, tag, message }) {
    const item = {
      id: "annc-" + Date.now(),
      title: String(title || "").trim(),
      tag: String(tag || "UPDATE").trim(),
      message: String(message || "").trim(),
      author: (window.NashaAuth && window.NashaAuth.getUser && window.NashaAuth.getUser()?.name) || "Staff",
      createdAt: new Date().toISOString()
    };
    const current = await getAnnouncements();
    current.unshift(item);
    writeLocal(STORAGE_KEYS.ANNOUNCEMENTS, current);

    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("announcements").doc(item.id).set(item).catch(() => {});
    }
    await logActivity(`Published announcement: "${item.title}"`, "announcement");
    return item;
  }

  async function deleteAnnouncement(id) {
    const current = (await getAnnouncements()).filter((a) => String(a.id) !== String(id));
    writeLocal(STORAGE_KEYS.ANNOUNCEMENTS, current);

    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("announcements").doc(String(id)).delete().catch(() => {});
    }
    await logActivity(`Deleted announcement ID ${id}`, "announcement");
  }

  async function saveUserProfile(userObj) {
    if (!userObj || !userObj.uid) return;
    const list = await getAllUserProfiles();
    const idx = list.findIndex((u) => u.uid === userObj.uid);
    const existing = idx >= 0 ? list[idx] : {};
    const merged = {
      ...existing,
      ...userObj,
      name: (existing && existing.name) || userObj.name,
      avatarUrl: (existing && existing.avatarUrl) || userObj.avatarUrl || "",
      decorationUrl: (existing && existing.decorationUrl) || userObj.decorationUrl || ""
    };
    if (idx >= 0) list[idx] = merged;
    else list.push(merged);
    writeLocal(STORAGE_KEYS.USER_PROFILES, list);

    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("user_profiles").doc(userObj.uid).set(merged, { merge: true }).catch(() => {});
    }
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
    await logActivity(`Created ${item.type || "event"}: "${item.title}"`, "event");
    return item;
  }

  async function deleteEvent(id) {
    const current = (await getEvents()).filter((e) => String(e.id) !== String(id));
    writeLocal(STORAGE_KEYS.EVENTS, current);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("events_giveaways").doc(String(id)).delete().catch(() => {});
    }
    await logActivity(`Deleted event ID ${id}`, "event");
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

  async function getStaff() {
    return buildCombinedStaffDirectory();
  }

  async function saveStaffMember(member, skipLog = false) {
    const current = readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff);
    const idx = current.findIndex((s) => s.id === member.id || (member.discordId && s.discordId === member.discordId));
    const entry = {
      id: member.id || (member.discordId ? "st-" + member.discordId : "st-" + Date.now()),
      ...member,
      rank: normalizeRank(member.rank)
    };
    if (idx >= 0) current[idx] = { ...current[idx], ...entry };
    else current.push(entry);
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("staff_members").doc(entry.id).set(entry, { merge: true }).catch(() => {});
    }
    if (!skipLog) {
      await logActivity(`Synced staff ${entry.name} (${entry.rank})`, "staff");
    }
    return entry;
  }

  async function deleteStaffMember(id) {
    const current = readLocal(STORAGE_KEYS.STAFF, DEFAULT_DATA.staff).filter((s) => String(s.id) !== String(id));
    writeLocal(STORAGE_KEYS.STAFF, current);
    if (firestoreInstance && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
      await firestoreInstance.collection("staff_members").doc(String(id)).delete().catch(() => {});
    }
    await logActivity(`Removed staff entry ID ${id}`, "staff");
  }

  syncLegacyStore();

  return {
    initFirebase,
    getAuth: () => firebaseAuthInstance || initFirebase().auth,
    getFirestore: () => firestoreInstance || initFirebase().db,
    saveUserProfile,
    fetchUserProfile,
    getAllUserProfiles,
    updateUserProfileByFounder,
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
    deleteStaffMember,
    getAnnouncements,
    addAnnouncement,
    deleteAnnouncement,
    getRoleAssignments,
    assignRoleToEmail,
    removeRoleAssignment,
    logActivity,
    getActivity
  };
})();

window.fetchLiveDiscordUser = async function (discordId) {
  if (!discordId || !/^\d{17,20}$/.test(String(discordId))) return null;
  try {
    const res = await fetch(`/api/discord-user?id=${encodeURIComponent(discordId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

window.refreshAllStaffDiscordProfiles = async function () {
  if (!window.NashaDB) return;
  const staffList = await window.NashaDB.getStaff();
  for (const st of staffList) {
    if (!st.discordId || !/^\d{17,20}$/.test(String(st.discordId))) continue;
    const live = await window.fetchLiveDiscordUser(st.discordId);
    if (!live) continue;

    const nextName = st.lockCustomName ? st.name : (live.globalName || st.name);
    const nextHandle = live.username ? `@${live.username}` : st.discordHandle;
    const changed =
      st.avatarUrl !== live.avatarUrl ||
      st.decorationUrl !== live.decorationUrl ||
      st.discordHandle !== nextHandle ||
      st.name !== nextName;

    if (changed) {
      await window.NashaDB.saveStaffMember(
        {
          ...st,
          id: st.id && st.id.startsWith("st-") ? st.id : `st-${st.discordId}`,
          name: nextName,
          discordHandle: nextHandle,
          avatarUrl: live.avatarUrl,
          decorationUrl: live.decorationUrl || "",
          lastDiscordSync: new Date().toISOString()
        },
        true
      );
    }
  }
};

window.syncDiscordNoBot = async function () {
  const settings = await window.NashaDB.getSettings();
  if (settings && settings.autoSyncInvite === false) return;
  const rawCode = window.NASHA_CONFIG && window.NASHA_CONFIG.inviteCode;
  if (!rawCode || rawCode === "YOUR_PERMANENT_INVITE_CODE") return;
  const code = String(rawCode).replace(/^https?:\/\/discord\.gg\//i, "").trim();
  if (!code) return;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.approximate_member_count === "number") {
      const current = await window.NashaDB.getStats();
      const nextMembers = Math.max(Number(current.members || 0), Number(data.approximate_member_count));
      await window.NashaDB.updateStats({
        members: nextMembers,
        online: typeof data.approximate_presence_count === "number" ? data.approximate_presence_count : current.online,
        announcement: `We now have <strong class='text-white'>${nextMembers.toLocaleString()}+ Members</strong> • Giveaways Live!`
      });
    }
  } catch (err) {
    console.warn("[Discord Invite Sync Error]", err);
  }
};

window.syncDiscordWidgetOnline = async function () {
  const settings = await window.NashaDB.getSettings();
  if (settings && settings.autoSyncInvite === false) return null;
  const guildId = window.NASHA_CONFIG && window.NASHA_CONFIG.guildId;
  if (!guildId || guildId === "YOUR_GUILD_ID") return null;

  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${encodeURIComponent(guildId)}/widget.json`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const updates = {};
    if (typeof data.presence_count === "number") updates.online = data.presence_count;
    if (Array.isArray(data.members)) updates.widgetMembers = data.members;
    if (Object.keys(updates).length) {
      await window.NashaDB.updateStats(updates);
    }
    return data.presence_count ?? null;
  } catch (err) {
    return null;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.NashaDB.initFirebase();
  window.syncDiscordNoBot();
  window.syncDiscordWidgetOnline();
  window.refreshAllStaffDiscordProfiles();
  setInterval(() => {
    window.syncDiscordNoBot();
    window.syncDiscordWidgetOnline();
  }, 60 * 1000);
});
