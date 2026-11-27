/**
 * 🍁.Nʌsʜʌ™.🍁 — Individual User Auth & Per-User Profile Controller
 * Uses Firebase Compat Auth initialized from firebase-config.js (nashaa-717c9).
 */

window.NashaAuth = (function () {
  const SESSION_KEY = "nasha_active_session_v5";
  const PROFILES_KEY = "nasha_profiles_by_uid_v5";
  let currentUser = null;

  function loadProfilesMap() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveUserProfileToMap(userObj) {
    if (!userObj || !userObj.uid) return;
    const map = loadProfilesMap();
    map[userObj.uid] = { ...userObj };
    localStorage.setItem(PROFILES_KEY, JSON.stringify(map));
  }

  function getSavedProfile(uid) {
    if (!uid) return null;
    const map = loadProfilesMap();
    return map[uid] || null;
  }

  function resolveRoleFromEmail(email, explicitRole) {
    if (explicitRole) return explicitRole;
    const lower = (email || "").toLowerCase().trim();
    const cfg = window.NASHA_CONFIG || {};
    if ((cfg.founderEmails || []).map((e) => e.toLowerCase()).includes(lower)) return "founder";
    if ((cfg.adminEmails || []).map((e) => e.toLowerCase()).includes(lower)) return "admin";
    return "member";
  }

  function buildIndividualUser({ uid, name, email, photoURL, provider }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const stableUid = uid || ("usr_" + btoa(cleanEmail || String(Date.now())).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16));
    const existing = getSavedProfile(stableUid);
    const computedRole = resolveRoleFromEmail(cleanEmail, existing && existing.role);

    const merged = {
      uid: stableUid,
      name: (existing && existing.name) || name || (cleanEmail ? cleanEmail.split("@")[0] : "Member"),
      email: cleanEmail,
      discordId: (existing && existing.discordId) || "",
      discordHandle: (existing && existing.discordHandle) || "",
      hexColor: (existing && existing.hexColor) || "#38bdf8",
      photoURL: photoURL || (existing && existing.photoURL) || "",
      provider: provider || (existing && existing.provider) || "google",
      role: computedRole
    };

    saveUserProfileToMap(merged);
    if (window.NashaDB && window.NashaDB.saveUserProfile) {
      window.NashaDB.saveUserProfile(merged).catch(() => {});
    }
    return merged;
  }

  function loadStoredSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      currentUser = raw ? JSON.parse(raw) : null;
    } catch (e) {
      currentUser = null;
    }
    return currentUser;
  }

  function setSession(userObj) {
    currentUser = userObj;
    if (userObj) {
      saveUserProfileToMap(userObj);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent("nasha:auth-changed", { detail: { user: currentUser } }));
  }

  function updateProfile(updates) {
    const user = getUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    setSession(updated);
    if (window.NashaDB && window.NashaDB.saveUserProfile) {
      window.NashaDB.saveUserProfile(updated).catch(() => {});
    }
    return updated;
  }

  function hasAccess(requiredRole) {
    const user = getUser();
    if (!user) return false;
    if (requiredRole === "founder") return user.role === "founder";
    if (requiredRole === "admin") return user.role === "founder" || user.role === "admin";
    return true;
  }

  function injectModalStyles() {
    if (document.getElementById("nasha-injected-ui-styles")) return;
    const style = document.createElement("style");
    style.id = "nasha-injected-ui-styles";
    style.textContent = `
      .nasha-profile-wrap { position: relative; display: inline-flex; align-items: center; }
      .nasha-profile-icon-btn {
        position: relative; width: 42px; height: 42px; border-radius: 50%;
        border: 1px solid rgba(56, 189, 248, 0.55);
        background: radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.25), rgba(10, 22, 46, 0.92));
        color: #e0f2fe; display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; box-shadow: 0 0 18px rgba(56, 189, 248, 0.28);
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        text-decoration: none;
      }
      .nasha-profile-icon-btn:hover { transform: scale(1.06); border-color: #7dd3fc; box-shadow: 0 0 26px rgba(56, 189, 248, 0.55); }
      .nasha-avatar-circle { font-weight: 800; font-size: 1rem; color: #fff; }
      .nasha-online-badge {
        position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px;
        border-radius: 50%; background: #22c55e; border: 2px solid #030712; box-shadow: 0 0 8px #22c55e;
      }
      .nasha-profile-dropdown {
        position: absolute; top: calc(100% + 12px); right: 0; width: 260px;
        background: rgba(7, 17, 36, 0.98); border: 1px solid rgba(56, 189, 248, 0.55);
        border-radius: 16px; padding: 0.6rem;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.78), 0 0 30px rgba(56, 189, 248, 0.2);
        display: none; flex-direction: column; gap: 0.25rem; z-index: 1500;
      }
      .nasha-profile-dropdown.open { display: flex; }
      .nasha-dropdown-header { padding: 0.6rem 0.7rem 0.75rem; border-bottom: 1px solid rgba(56, 189, 248, 0.16); margin-bottom: 0.3rem; }
      .nasha-dropdown-item {
        display: flex; align-items: center; gap: 0.5rem; width: 100%; text-align: left;
        background: transparent; border: none; color: #e2e8f0; text-decoration: none;
        font-size: 0.86rem; font-weight: 500; padding: 0.55rem 0.7rem; border-radius: 10px;
        cursor: pointer; transition: background 0.2s ease, color 0.2s ease;
      }
      .nasha-dropdown-item:hover { background: rgba(56, 189, 248, 0.15); color: #fff; }
      .nasha-dropdown-item.danger { color: #fda4af; }
      .nasha-dropdown-item.danger:hover { background: rgba(244, 63, 94, 0.18); }

      .nasha-modal-backdrop {
        position: fixed; inset: 0; background: rgba(2, 6, 23, 0.84); backdrop-filter: blur(10px);
        display: none; align-items: center; justify-content: center; padding: 1rem; z-index: 2000;
      }
      .nasha-modal-backdrop.open { display: flex; }
      .nasha-modal-card {
        position: relative; width: min(440px, 100%);
        background: linear-gradient(180deg, rgba(11, 24, 52, 0.97), rgba(5, 11, 26, 0.99));
        border: 1px solid rgba(56, 189, 248, 0.55); border-radius: 22px; padding: 2rem;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(56, 189, 248, 0.22);
        color: #f1f5f9;
      }
      .nasha-modal-close {
        position: absolute; top: 1rem; right: 1rem; width: 34px; height: 34px; border-radius: 50%;
        border: 1px solid rgba(56, 189, 248, 0.3); background: rgba(15, 23, 42, 0.85);
        color: #fff; font-size: 1.25rem; cursor: pointer;
      }
      .nasha-modal-badge { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; color: #38bdf8; margin-bottom: 0.4rem; }
      .nasha-modal-title { margin: 0 0 0.35rem; font-size: 1.5rem; }
      .nasha-modal-sub { margin: 0 0 1.25rem; color: #94a3b8; font-size: 0.88rem; }
      .nasha-auth-tabs {
        display: grid; grid-template-columns: 1fr 1fr; background: rgba(3, 7, 18, 0.75);
        padding: 4px; border-radius: 12px; margin-bottom: 1rem;
      }
      .nasha-tab-btn { background: transparent; border: none; color: #94a3b8; padding: 0.5rem; border-radius: 9px; font-weight: 600; cursor: pointer; }
      .nasha-tab-btn.active { background: rgba(56, 189, 248, 0.2); color: #fff; }
      .nasha-btn-google {
        width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.65rem;
        background: #fff; color: #0f172a; border: none; border-radius: 12px; padding: 0.72rem 1rem;
        font-weight: 700; font-size: 0.94rem; cursor: pointer;
      }
      .nasha-divider { text-align: center; margin: 1rem 0; position: relative; }
      .nasha-divider::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(148, 163, 184, 0.22); }
      .nasha-divider span { position: relative; background: #08132b; padding: 0 0.65rem; font-size: 0.72rem; color: #94a3b8; letter-spacing: 0.1em; }
      .nasha-auth-form { display: flex; flex-direction: column; gap: 0.85rem; }
      .nasha-auth-error {
        display: none; background: rgba(244, 63, 94, 0.16); border: 1px solid rgba(244, 63, 94, 0.45);
        color: #fda4af; padding: 0.55rem 0.75rem; border-radius: 10px; font-size: 0.84rem;
      }
    `;
    document.head.appendChild(style);
  }

  function injectModalHTML() {
    injectModalStyles();
    if (document.getElementById("nasha-auth-modal")) return;
    const wrapper = document.createElement("div");
    wrapper.id = "nasha-auth-modal";
    wrapper.className = "nasha-modal-backdrop";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="nasha-modal-card" role="dialog" aria-modal="true" aria-labelledby="nashaAuthTitle">
        <button type="button" class="nasha-modal-close" id="nashaAuthClose" aria-label="Close modal">&times;</button>
        <div class="nasha-modal-badge">🍁.Nʌsʜʌ™.🍁 INDIVIDUAL ACCOUNT SIGN-IN</div>
        <h2 id="nashaAuthTitle" class="nasha-modal-title">Sign In to Your Account</h2>
        <p class="nasha-modal-sub" id="nashaAuthSub">
          Each Google or Email account gets its own separate profile, #HEX color, and Discord link.
        </p>

        <div class="nasha-auth-tabs" role="tablist">
          <button type="button" class="nasha-tab-btn active" data-auth-tab="login">Sign In</button>
          <button type="button" class="nasha-tab-btn" data-auth-tab="signup">Create Account</button>
        </div>

        <button type="button" id="nashaGoogleSignInBtn" class="nasha-btn-google">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div class="nasha-divider"><span>OR WITH EMAIL</span></div>

        <form id="nashaEmailAuthForm" class="nasha-auth-form">
          <div id="nashaNameFieldWrap" style="display:none;">
            <label class="nasha-label" for="nashaDisplayName">Your Name</label>
            <input class="nasha-input" type="text" id="nashaDisplayName" placeholder="Your display name" />
          </div>
          <div>
            <label class="nasha-label" for="nashaEmailInput">Email Address</label>
            <input class="nasha-input" type="email" id="nashaEmailInput" required placeholder="you@example.com" />
          </div>
          <div>
            <label class="nasha-label" for="nashaPasswordInput">Password</label>
            <input class="nasha-input" type="password" id="nashaPasswordInput" required placeholder="••••••••" minlength="6" />
          </div>
          <div id="nashaAuthError" class="nasha-auth-error" role="alert"></div>
          <button type="submit" id="nashaEmailSubmitBtn" class="nasha-btn-primary" style="width:100%;justify-content:center;">
            Sign In with Email
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(wrapper);
    bindModalEvents();
  }

  function bindModalEvents() {
    const modal = document.getElementById("nasha-auth-modal");
    const closeBtn = document.getElementById("nashaAuthClose");
    const tabBtns = modal.querySelectorAll(".nasha-tab-btn");
    const nameWrap = document.getElementById("nashaNameFieldWrap");
    const submitBtn = document.getElementById("nashaEmailSubmitBtn");
    const form = document.getElementById("nashaEmailAuthForm");
    const googleBtn = document.getElementById("nashaGoogleSignInBtn");
    let mode = "login";

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        mode = btn.dataset.authTab;
        nameWrap.style.display = mode === "signup" ? "block" : "none";
        submitBtn.textContent = mode === "signup" ? "Create Account" : "Sign In with Email";
        showError("");
      });
    });

    googleBtn.addEventListener("click", async () => {
      showError("");
      const fbAuth = window.NashaDB && window.NashaDB.getAuth();
      if (!fbAuth || typeof firebase === "undefined") {
        showError("Firebase Auth failed to initialize. Check that Firebase compat SDK scripts are loaded and Google sign-in is enabled in Firebase Console.");
        return;
      }
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const res = await fbAuth.signInWithPopup(provider);
        const u = res.user;
        const cloudProfile = window.NashaDB.fetchUserProfile ? await window.NashaDB.fetchUserProfile(u.uid).catch(() => null) : null;
        if (cloudProfile) saveUserProfileToMap(cloudProfile);

        const userObj = buildIndividualUser({
          uid: u.uid,
          name: u.displayName || (u.email ? u.email.split("@")[0] : "Google User"),
          email: u.email || "",
          photoURL: u.photoURL || "",
          provider: "google"
        });
        setSession(userObj);
        closeModal();
      } catch (err) {
        showError(err.message || "Google sign-in failed.");
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError("");
      const email = document.getElementById("nashaEmailInput").value.trim().toLowerCase();
      const password = document.getElementById("nashaPasswordInput").value;
      const displayName = document.getElementById("nashaDisplayName").value.trim() || email.split("@")[0];
      const fbAuth = window.NashaDB && window.NashaDB.getAuth();

      if (fbAuth && typeof firebase !== "undefined") {
        try {
          let cred;
          if (mode === "signup") {
            cred = await fbAuth.createUserWithEmailAndPassword(email, password);
            await cred.user.updateProfile({ displayName });
          } else {
            cred = await fbAuth.signInWithEmailAndPassword(email, password);
          }
          const cloudProfile = window.NashaDB.fetchUserProfile ? await window.NashaDB.fetchUserProfile(cred.user.uid).catch(() => null) : null;
          if (cloudProfile) saveUserProfileToMap(cloudProfile);

          const userObj = buildIndividualUser({
            uid: cred.user.uid,
            name: cred.user.displayName || displayName,
            email: cred.user.email || email,
            photoURL: cred.user.photoURL || "",
            provider: "email"
          });
          setSession(userObj);
          closeModal();
        } catch (err) {
          showError(err.message || "Email authentication failed.");
        }
      } else {
        const userObj = buildIndividualUser({
          uid: null,
          name: displayName,
          email,
          photoURL: "",
          provider: "email"
        });
        setSession(userObj);
        closeModal();
      }
    });
  }

  function showError(msg) {
    const el = document.getElementById("nashaAuthError");
    if (el) {
      el.textContent = msg;
      el.style.display = msg ? "block" : "none";
    }
  }

  function openModal(defaultTab = "login", customSubtitle = "") {
    injectModalHTML();
    const modal = document.getElementById("nasha-auth-modal");
    const subEl = document.getElementById("nashaAuthSub");
    if (subEl && customSubtitle) subEl.textContent = customSubtitle;
    const targetTab = modal.querySelector(`[data-auth-tab="${defaultTab}"]`);
    if (targetTab) targetTab.click();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    const modal = document.getElementById("nasha-auth-modal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function signOut() {
    const fbAuth = window.NashaDB && window.NashaDB.getAuth();
    if (fbAuth) fbAuth.signOut().catch(() => {});
    setSession(null);
  }

  function getUser() {
    return currentUser || loadStoredSession();
  }

  function renderAuthGate(containerId, requiredRole, title, desc) {
    const el = document.getElementById(containerId);
    if (!el) return false;
    const user = getUser();
    const allowed = hasAccess(requiredRole);

    if (allowed) {
      el.style.display = "none";
      return true;
    }

    el.style.display = "block";
    if (!user) {
      el.innerHTML = `
        <div class="glass-card" style="max-width:560px;margin:0 auto;text-align:center;padding:2.25rem;">
          <div class="channel-tag" style="margin-bottom:0.75rem;">🔒 AUTH GATE • SIGN IN REQUIRED</div>
          <h2 style="margin:0 0 0.6rem;">${title}</h2>
          <p style="color:var(--text-muted);margin:0 0 1.4rem;">${desc}</p>
          <button type="button" class="nasha-btn-primary" onclick="window.NashaAuth.openModal('login', '${desc.replace(/'/g, "\\'")}')">
            Open Sign-In Modal
          </button>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="glass-card" style="max-width:560px;margin:0 auto;text-align:center;padding:2.25rem;border-color:rgba(244,63,94,0.45);">
          <div class="channel-tag" style="margin-bottom:0.75rem;color:#fda4af;border-color:rgba(244,63,94,0.4);">⛔ INSUFFICIENT CLEARANCE</div>
          <h2 style="margin:0 0 0.6rem;">${requiredRole === "founder" ? "Founder Access Only" : "Admin / Staff Access Only"}</h2>
          <p style="color:var(--text-muted);margin:0 0 1.4rem;">
            Signed in as <strong>${user.name}</strong> (Role: <code>${user.role.toUpperCase()}</code>). Switch to an authorized account to open this panel.
          </p>
          <button type="button" class="nasha-btn-secondary" onclick="window.NashaAuth.openModal('login')">
            Switch Account
          </button>
        </div>
      `;
    }
    return false;
  }

  function init() {
    loadStoredSession();
    injectModalHTML();
    const fbAuth = window.NashaDB && window.NashaDB.getAuth();
    if (fbAuth) {
      fbAuth.onAuthStateChanged(async (user) => {
        if (user) {
          const cloudProfile = window.NashaDB.fetchUserProfile ? await window.NashaDB.fetchUserProfile(user.uid).catch(() => null) : null;
          if (cloudProfile) saveUserProfileToMap(cloudProfile);

          const userObj = buildIndividualUser({
            uid: user.uid,
            name: user.displayName || (user.email ? user.email.split("@")[0] : "Member"),
            email: user.email || "",
            photoURL: user.photoURL || "",
            provider: (user.providerData && user.providerData[0] && user.providerData[0].providerId) || "firebase"
          });
          setSession(userObj);
        } else if (loadStoredSession()?.provider === "google" || loadStoredSession()?.provider === "firebase") {
          setSession(null);
        }
      });
    }
  }

  return {
    init,
    openModal,
    closeModal,
    signOut,
    getUser,
    updateProfile,
    hasAccess,
    renderAuthGate
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.NashaAuth.init();
});
