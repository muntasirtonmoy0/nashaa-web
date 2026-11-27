/**
 * 🍁.Nʌsʜʌ™.🍁 — Navigation Bar (Admin Panel shown only in Profile for authorized emails)
 */

window.attachTiltCards = function () {
  document.querySelectorAll(".tilt-card").forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = "1";
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
};

window.showToast = function (msg) {
  let toast = document.getElementById("nasha-global-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "nasha-global-toast";
    toast.style.cssText =
      "position:fixed;bottom:24px;right:24px;z-index:3000;background:rgba(7,17,36,0.95);" +
      "border:1px solid rgba(56,189,248,0.55);color:#e0f2fe;padding:0.8rem 1.2rem;" +
      "border-radius:14px;font-size:0.85rem;font-weight:600;box-shadow:0 12px 35px rgba(0,0,0,0.65);" +
      "transition:opacity 0.3s ease,transform 0.3s ease;opacity:0;transform:translateY(12px);pointer-events:none;";
    document.body.appendChild(toast);
  }
  toast.textContent = "🍁 " + msg;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  clearTimeout(window._nashaToastTimer);
  window._nashaToastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
  }, 2600);
};

window.copyInviteLink = function () {
  const link = (window.NASHA_CONFIG && window.NASHA_CONFIG.discordInvite) || "https://discord.gg/nasha";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).catch(() => {});
  }
  window.showToast("Copied Discord Invite: " + link);
};

window.NashaNavbar = (function () {
  // Public links only — Admin & Owner/Founder controls live inside Profile for authorized emails
  const NAV_LINKS = [
    { href: "index.html", label: "Home" },
    { href: "events-giveaway.html", label: "Events & #GVWY" },
    { href: "gallery.html", label: "Gallery" },
    { href: "staff-info.html", label: "Staff Info" },
    { href: "FAQ-about.html", label: "About & FAQ" }
  ];

  function getActiveFile() {
    const path = decodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
    return path === "" ? "index.html" : path;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function renderNavbar() {
    const host = document.getElementById("shared-navbar") || document.getElementById("nasha-navbar-root");
    if (!host) return;
    const active = getActiveFile();
    const user = window.NashaAuth ? window.NashaAuth.getUser() : null;
    const canAdmin = window.NashaAuth ? window.NashaAuth.hasAccess("admin") : false;

    const linksHtml = NAV_LINKS.map((link) => {
      const isActive = active.toLowerCase() === link.href.toLowerCase();
      return `<a href="${link.href}" class="nasha-nav-link ${isActive ? "active" : ""}">${link.label}</a>`;
    }).join("");

    const initials = user && user.name ? user.name.trim().charAt(0).toUpperCase() : "";
    const roleLabel = user ? (user.role === "founder" ? "OWNER / FOUNDER" : user.role.toUpperCase()) : "GUEST";

    const adminDropdownLink = canAdmin
      ? `<a href="admin-panel.html" class="nasha-dropdown-item">🛡️ Admin Panel</a>`
      : "";

    const profileWidgetHtml = user
      ? `
        <div class="nasha-profile-wrap" id="nashaProfileWrap">
          <button type="button" class="nasha-profile-icon-btn signed-in" id="nashaProfileTrigger" aria-label="Account Profile Menu" title="${escapeHtml(user.name)} (${roleLabel})">
            <span class="nasha-avatar-circle">${escapeHtml(initials)}</span>
            <span class="nasha-online-badge"></span>
          </button>
          <div class="nasha-profile-dropdown" id="nashaProfileDropdown">
            <div class="nasha-dropdown-header">
              <div style="font-weight:700;color:#fff;">${escapeHtml(user.name)}</div>
              <div style="font-size:0.76rem;color:#7dd3fc;">${escapeHtml(user.email)}</div>
              <span class="channel-tag" style="margin-top:0.35rem;font-size:0.7rem;">ROLE: ${roleLabel}</span>
            </div>
            <a href="profile.html" class="nasha-dropdown-item">👤 My Profile &amp; Discord Link</a>
            ${adminDropdownLink}
            <button type="button" id="nashaSwitchAcctBtn" class="nasha-dropdown-item">🔄 Switch Account</button>
            <button type="button" id="nashaLogoutBtn" class="nasha-dropdown-item danger">🚪 Sign Out</button>
          </div>
        </div>
      `
      : `
        <a href="profile.html" class="nasha-profile-icon-btn" id="nashaProfileLoginBtn" aria-label="Profile & Sign In" title="Profile / Sign In">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </a>
      `;

    host.innerHTML = `
      <div class="nasha-navbar" id="nashaTopNav">
        <div class="nasha-scroll-progress" id="nashaScrollProgress"></div>
        <div class="nasha-nav-inner">
          <a href="index.html" class="nasha-brand">
            <span class="nasha-brand-icon">🍁</span>
            <span class="nasha-brand-text">.Nʌsʜʌ™.</span>
          </a>

          <nav class="nasha-nav-links" aria-label="Primary Navigation">
            ${linksHtml}
          </nav>

          <div class="nasha-nav-actions">
            ${profileWidgetHtml}
            <button type="button" class="nasha-burger" id="nashaMobileToggle" aria-label="Toggle navigation">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
        <div class="nasha-mobile-drawer" id="nashaMobileDrawer">
          ${linksHtml}
          <a href="profile.html" class="nasha-nav-link ${active.toLowerCase() === "profile.html" ? "active" : ""}">My Profile</a>
          ${canAdmin ? `<a href="admin-panel.html" class="nasha-nav-link ${active.toLowerCase() === "admin-panel.html" ? "active" : ""}">Admin Panel</a>` : ""}
        </div>
      </div>
    `;

    const triggerBtn = document.getElementById("nashaProfileTrigger");
    const dropdown = document.getElementById("nashaProfileDropdown");
    if (triggerBtn && dropdown) {
      triggerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== triggerBtn) {
          dropdown.classList.remove("open");
        }
      });
    }

    const switchBtn = document.getElementById("nashaSwitchAcctBtn");
    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        if (dropdown) dropdown.classList.remove("open");
        if (window.NashaAuth) window.NashaAuth.openModal("login");
      });
    }

    const logoutBtn = document.getElementById("nashaLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (window.NashaAuth) window.NashaAuth.signOut();
      });
    }

    const mobileToggle = document.getElementById("nashaMobileToggle");
    const mobileDrawer = document.getElementById("nashaMobileDrawer");
    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener("click", () => mobileDrawer.classList.toggle("open"));
    }
  }

  function initScrollEffects() {
    const progressEl = document.getElementById("nashaScrollProgress");
    const navEl = document.getElementById("nashaTopNav");

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      if (progressEl) progressEl.style.width = pct + "%";
      if (navEl) navEl.classList.toggle("scrolled", scrollTop > 24);
    }, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed", "is-visible");
        }
      });
    }, { threshold: 0.08 });

    document
      .querySelectorAll(".reveal-on-scroll, .reveal-up, .reveal-left, .reveal-right")
      .forEach((el) => observer.observe(el));

    window.attachTiltCards();
  }

  function initBioluminescentCanvas() {
    let canvas = document.getElementById("bioluminescent-canvas") || document.getElementById("nasha-canopy-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "bioluminescent-canvas";
      document.body.prepend(canvas);
    }
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let mouse = { x: w / 2, y: h / 2 };

    window.addEventListener("resize", () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    const spores = Array.from({ length: 70 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.3 + 0.6,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.45 - 0.1,
      alpha: Math.random() * 0.65 + 0.25,
      hue: Math.random() > 0.35 ? 192 : 225
    }));

    let t = 0;
    function frame() {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, h * (0.35 + i * 0.18));
        for (let x = 0; x <= w; x += 40) {
          const y = h * (0.35 + i * 0.18) + Math.sin(x * 0.0025 + t + i * 1.4) * 45;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.045 - i * 0.01})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      spores.forEach((p) => {
        p.x += p.vx + Math.sin(t + p.y * 0.01) * 0.15;
        p.y += p.vy;
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          p.x -= dx * 0.008;
          p.y -= dy * 0.008;
        }
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 68%, ${p.alpha})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#00e5ff";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      requestAnimationFrame(frame);
    }
    frame();
  }

  function init() {
    renderNavbar();
    initBioluminescentCanvas();
    initScrollEffects();
    window.addEventListener("nasha:auth-changed", renderNavbar);
  }

  return { init, renderNavbar };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.NashaNavbar.init();
});
