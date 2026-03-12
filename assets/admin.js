const ADMIN_IDLE_TIMEOUT_MS = 2 * 60 * 1000;

async function logoutAdminSession() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch (error) {
    // Ignore logout errors and continue redirecting.
  }

  window.location.assign("/login/");
}

async function refreshAdminSession() {
  try {
    const response = await fetch("/api/refresh-session", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

function startAdminSessionActivityTracking() {
  let idleTimer = 0;
  let refreshTimer = 0;

  const resetTimers = () => {
    window.clearTimeout(idleTimer);
    window.clearTimeout(refreshTimer);

    refreshTimer = window.setTimeout(async () => {
      const ok = await refreshAdminSession();
      if (!ok) {
        logoutAdminSession();
      }
    }, Math.max(ADMIN_IDLE_TIMEOUT_MS - 15000, 1000));

    idleTimer = window.setTimeout(() => {
      logoutAdminSession();
    }, ADMIN_IDLE_TIMEOUT_MS);
  };

  ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, resetTimers, { passive: true });
  });

  resetTimers();
}

document.addEventListener("DOMContentLoaded", () => {
  const api = window.BoxLadderContent;
  if (!api) {
    return;
  }

  const homepageForm = document.getElementById("homepage-form");
  const homepageResetButton = document.getElementById("homepage-reset");
  const homepageAddSectionButton = document.getElementById("homepage-add-section");
  const homepageRestoreSectionsButton = document.getElementById("homepage-restore-sections");
  const homepageStatusEl = document.getElementById("homepage-status");
  const homepagePreviewEl = document.getElementById("homepage-preview");
  const homepageSectionListEl = document.getElementById("homepage-section-list");
  const logoutButton = document.getElementById("logout-button");
  if (!homepageForm || !homepageResetButton || !homepageAddSectionButton || !homepageRestoreSectionsButton || !homepageStatusEl || !homepagePreviewEl || !homepageSectionListEl) {
    return;
  }

  function setHomepageStatus(message) {
    homepageStatusEl.textContent = message;
  }

  function getHomepageState() {
    return api.loadHomepageContent();
  }

  function getFormFields() {
    return [
      "heroEyebrow",
      "heroTitle",
      "heroLede",
      "heroPrimaryText",
      "heroPrimaryHref",
      "heroSecondaryText",
      "heroSecondaryHref",
      "heroPillPrimary",
      "heroPillSecondary",
      "heroCardTitle",
      "heroCardBody",
      "aboutHeading",
      "aboutIntro",
      "aboutCard1Title",
      "aboutCard1Body",
      "aboutCard2Title",
      "aboutCard2Body",
      "aboutCard3Title",
      "aboutCard3Body",
      "recentHeading",
      "recentIntro",
      "recentCard1Title",
      "recentCard1Body",
      "recentCard1LinkText",
      "recentCard1LinkHref",
      "recentCard2Title",
      "recentCard2Body",
      "recentCard2LinkText",
      "recentCard2LinkHref",
      "contactTitle",
      "contactBody",
      "contactButtonText",
      "contactButtonHref",
      "footerText",
    ];
  }

  function fillHomepageForm() {
    const state = getHomepageState();
    getFormFields().forEach((field) => {
      if (homepageForm.elements[field]) {
        homepageForm.elements[field].value = state[field] || "";
      }
    });
  }

  function renderHomepagePreview() {
    const state = getHomepageState();
    const customSections = Array.isArray(state.customSections) ? state.customSections : [];

    homepagePreviewEl.innerHTML = `
      <article class="hero-card">
        <p class="eyebrow">${state.heroEyebrow}</p>
        <h2>${state.heroTitle}</h2>
        <p class="lede">${state.heroLede}</p>
        <div class="hero-actions">
          <span class="btn">${state.heroPrimaryText}</span>
          <span class="btn ghost">${state.heroSecondaryText}</span>
        </div>
        <div class="callout">
          <div class="hero-card__top">
            <span class="pill">${state.heroPillPrimary}</span>
            <span class="pill pill-alt">${state.heroPillSecondary}</span>
          </div>
          <h3>${state.heroCardTitle}</h3>
          <p>${state.heroCardBody}</p>
        </div>
      </article>
      <article class="card">
        <h3>${state.aboutHeading}</h3>
        <p>${state.aboutIntro}</p>
      </article>
      <article class="card">
        <h3>${state.aboutCard1Title}</h3>
        <p>${state.aboutCard1Body}</p>
      </article>
      <article class="card">
        <h3>${state.aboutCard2Title}</h3>
        <p>${state.aboutCard2Body}</p>
      </article>
      <article class="card">
        <h3>${state.aboutCard3Title}</h3>
        <p>${state.aboutCard3Body}</p>
      </article>
      <article class="card">
        <h3>${state.recentHeading}</h3>
        <p>${state.recentIntro}</p>
      </article>
      <article class="card">
        <h3>${state.recentCard1Title}</h3>
        <p>${state.recentCard1Body}</p>
        <p class="meta">${state.recentCard1LinkText} -> ${state.recentCard1LinkHref}</p>
      </article>
      <article class="card">
        <h3>${state.recentCard2Title}</h3>
        <p>${state.recentCard2Body}</p>
        <p class="meta">${state.recentCard2LinkText} -> ${state.recentCard2LinkHref}</p>
      </article>
      ${customSections.map((section) => api.renderHomepageSection(section)).join("")}
      <article class="contact">
        <div>
          <h3>${state.contactTitle}</h3>
          <p>${state.contactBody}</p>
        </div>
        <span class="btn">${state.contactButtonText}</span>
      </article>
      <article class="card">
        <h3>Footer</h3>
        <p>${state.footerText}</p>
      </article>
    `;
  }

  function renderHomepageSections() {
    const state = getHomepageState();
    const hiddenSections = new Set(state.hiddenSections || []);
    const builtinSections = [
      { id: "hero", label: "Hero", body: "Main intro, buttons, pills, and highlight card." },
      { id: "about", label: "About", body: "The intro and three cards under What you will find." },
      { id: "recent", label: "Tracks", body: "The two-track section linking out to CyberSecurity and Hacking." },
      { id: "contact", label: "Contact", body: "Bottom CTA and footer-adjacent callout block." },
    ];
    const customSections = state.customSections || [];
    const builtinMarkup = builtinSections.map((section) => `
      <article class="admin-post-card">
        <div>
          <p class="meta">Built-in section${hiddenSections.has(section.id) ? " | hidden" : ""}</p>
          <h3>${section.label}</h3>
          <p>${section.body}</p>
        </div>
        <div class="admin-card-actions">
          <button type="button" class="btn ghost" data-home-action="${hiddenSections.has(section.id) ? "restore-built-in" : "hide-built-in"}" data-id="${section.id}">
            ${hiddenSections.has(section.id) ? "Restore" : "Hide section"}
          </button>
        </div>
      </article>
    `).join("");
    const customMarkup = customSections.length
      ? customSections.map((section) => `
          <article class="admin-post-card">
            <div>
              <p class="meta">Custom section</p>
              <h3>${section.title}</h3>
              <p>${section.body || "No body text set."}</p>
            </div>
            <div class="admin-card-actions">
              <button type="button" class="btn ghost" data-home-action="edit-section" data-id="${section.id}">Edit</button>
              <button type="button" class="section-delete-btn" data-home-action="delete-section" data-id="${section.id}" aria-label="Delete section">x</button>
            </div>
          </article>
        `).join("")
      : `<p class="empty-state">No custom homepage sections yet.</p>`;

    homepageSectionListEl.innerHTML = builtinMarkup + customMarkup;
  }

  function refreshHomepageUI() {
    fillHomepageForm();
    renderHomepagePreview();
    renderHomepageSections();
  }

  function promptForHomepageSection(section = {}) {
    const title = window.prompt("Section title", section.title || "");
    if (title === null) {
      return null;
    }

    const kicker = window.prompt("Section kicker", section.kicker || "");
    if (kicker === null) {
      return null;
    }

    const body = window.prompt("Section body", section.body || "");
    if (body === null) {
      return null;
    }

    const buttonText = window.prompt("Button text (optional)", section.buttonText || "");
    if (buttonText === null) {
      return null;
    }

    const buttonHref = window.prompt("Button link (optional)", section.buttonHref || "");
    if (buttonHref === null) {
      return null;
    }

    return { title, kicker, body, buttonText, buttonHref };
  }

  homepageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const current = api.loadHomepageContent();
    const payload = getFormFields().reduce((accumulator, field) => {
      accumulator[field] = homepageForm.elements[field].value;
      return accumulator;
    }, { ...current });

    api.saveHomepageContent(payload);
    refreshHomepageUI();
    setHomepageStatus("Saved homepage content.");
  });

  homepageResetButton.addEventListener("click", () => {
    api.saveHomepageContent({
      ...api.getHomepageDefaults(),
      hiddenSections: [],
      customSections: [],
    });
    refreshHomepageUI();
    setHomepageStatus("Reset homepage to defaults.");
  });

  homepageAddSectionButton.addEventListener("click", () => {
    const section = promptForHomepageSection();
    if (!section) {
      return;
    }

    api.addHomepageSection(section);
    refreshHomepageUI();
    setHomepageStatus("Added custom homepage section.");
  });

  homepageRestoreSectionsButton.addEventListener("click", () => {
    api.restoreHomepageSections();
    refreshHomepageUI();
    setHomepageStatus("Restored hidden built-in sections.");
  });

  homepageSectionListEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.homeAction;
    const id = target.dataset.id;
    if (!action || !id) {
      return;
    }

    if (action === "hide-built-in") {
      api.hideHomepageSection(id);
      refreshHomepageUI();
      setHomepageStatus("Built-in homepage section hidden.");
      return;
    }

    if (action === "restore-built-in") {
      const state = api.loadHomepageContent();
      api.saveHomepageContent({
        ...state,
        hiddenSections: (state.hiddenSections || []).filter((sectionId) => sectionId !== id),
      });
      refreshHomepageUI();
      setHomepageStatus("Built-in homepage section restored.");
      return;
    }

    const section = (api.loadHomepageContent().customSections || []).find((item) => item.id === id);
    if (!section) {
      return;
    }

    if (action === "edit-section") {
      const next = promptForHomepageSection(section);
      if (!next) {
        return;
      }

      api.updateHomepageSection(id, next);
      refreshHomepageUI();
      setHomepageStatus("Updated custom homepage section.");
    }

    if (action === "delete-section") {
      if (!window.confirm("Delete this custom section?")) {
        return;
      }

      api.deleteHomepageSection(id);
      refreshHomepageUI();
      setHomepageStatus("Deleted custom homepage section.");
    }
  });

  refreshHomepageUI();
  setHomepageStatus(
    api.canUseStorage()
      ? "Homepage admin ready. Changes apply to this browser's homepage state."
      : "Local storage is unavailable in this browser."
  );

  startAdminSessionActivityTracking();

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logoutAdminSession();
    });
  }
});
