const ADMIN_IDLE_TIMEOUT_MS = 2 * 60 * 1000;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

async function logoutAdminSession() {
  try {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
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

function renderMenu(label, items) {
  return `
    <details class="admin-menu">
      <summary class="admin-menu__toggle" aria-label="${escapeHtml(label)}">...</summary>
      <div class="admin-menu__list">
        ${items.map((item) => `
          <button
            type="button"
            class="admin-menu__item${item.danger ? " admin-menu__item-danger" : ""}"
            data-admin-action="${escapeHtml(item.action)}"
            data-admin-target="${escapeHtml(item.target || "")}"
            data-admin-direction="${escapeHtml(item.direction || "")}"
          >${escapeHtml(item.label)}</button>
        `).join("")}
      </div>
    </details>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const api = window.BoxLadderContent;
  const homepageResetButton = document.getElementById("homepage-reset");
  const homepageAddSectionButton = document.getElementById("homepage-add-section");
  const homepageRestoreSectionsButton = document.getElementById("homepage-restore-sections");
  const homepageStatusEl = document.getElementById("homepage-status");
  const homepagePreviewEl = document.getElementById("homepage-preview");
  const logoutButton = document.getElementById("logout-button");

  if (!api || !homepageResetButton || !homepageAddSectionButton || !homepageRestoreSectionsButton || !homepageStatusEl || !homepagePreviewEl) {
    return;
  }

  function setHomepageStatus(message) {
    homepageStatusEl.textContent = message;
  }

  function getHomepageState() {
    return api.loadHomepageContent();
  }

  function closeMenu(target) {
    const menu = target.closest(".admin-menu");
    if (menu instanceof HTMLDetailsElement) {
      menu.open = false;
    }
  }

  function promptFields(fields, title) {
    const result = {};

    for (const field of fields) {
      const value = window.prompt(`${title}: ${field.label}`, field.value || "");
      if (value === null) {
        return null;
      }

      result[field.name] = value;
    }

    return result;
  }

  function promptForHomepageSection(section = {}) {
    return promptFields([
      { name: "title", label: "Section title", value: section.title || "" },
      { name: "kicker", label: "Section kicker", value: section.kicker || "" },
      { name: "body", label: "Section body", value: section.body || "" },
      { name: "buttonText", label: "Button text", value: section.buttonText || "" },
      { name: "buttonHref", label: "Button link", value: section.buttonHref || "" },
    ], "Custom section");
  }

  function renderHero(state) {
    const mediaLabel = state.heroMediaPosition === "left" ? "Move image right" : "Move image left";

    return `
      <section class="hero admin-edit-section">
        <div class="container hero-grid${state.heroMediaPosition === "left" ? " hero-grid-reversed" : ""}">
          <div class="admin-edit-block">
            <div class="admin-edit-controls">
              ${renderMenu("Hero actions", [
                { action: "edit-hero-copy", label: "Edit section" },
                { action: "move-section", target: "hero", direction: "up", label: "Move section up" },
                { action: "move-section", target: "hero", direction: "down", label: "Move section down" },
                { action: "hide-section", target: "hero", label: "Delete section", danger: true },
              ])}
            </div>
            <p class="eyebrow">${escapeHtml(state.heroEyebrow)}</p>
            <h1>${state.heroTitle}</h1>
            <p class="lede">${escapeHtml(state.heroLede)}</p>
            <div class="hero-actions">
              <span class="btn">${escapeHtml(state.heroPrimaryText)}</span>
              <span class="btn ghost">${escapeHtml(state.heroSecondaryText)}</span>
            </div>
          </div>
          <article class="hero-card admin-edit-block">
            <div class="admin-edit-controls">
              ${renderMenu("Hero media actions", [
                { action: "edit-hero-card", label: "Edit section" },
                { action: "move-hero-media", label: mediaLabel },
              ])}
            </div>
            <div class="hero-card__top">
              <span class="pill">${escapeHtml(state.heroPillPrimary)}</span>
              <span class="pill pill-alt">${escapeHtml(state.heroPillSecondary)}</span>
            </div>
            <h3>${escapeHtml(state.heroCardTitle)}</h3>
            <p>${escapeHtml(state.heroCardBody)}</p>
            <img class="hero-meme" src="${escapeHtml(state.heroImageSrc)}" alt="${escapeHtml(state.heroImageAlt)}" />
          </article>
        </div>
      </section>
    `;
  }

  function renderAbout(state) {
    const cards = {
      "about-card-1": { title: state.aboutCard1Title, body: state.aboutCard1Body, number: "1" },
      "about-card-2": { title: state.aboutCard2Title, body: state.aboutCard2Body, number: "2" },
      "about-card-3": { title: state.aboutCard3Title, body: state.aboutCard3Body, number: "3" },
    };

    return `
      <section class="section admin-edit-section">
        <div class="container">
          <div class="section-header admin-edit-block">
            <div class="admin-edit-controls">
              ${renderMenu("About section actions", [
                { action: "edit-about-section", label: "Edit section" },
                { action: "move-section", target: "about", direction: "up", label: "Move section up" },
                { action: "move-section", target: "about", direction: "down", label: "Move section down" },
                { action: "hide-section", target: "about", label: "Delete section", danger: true },
              ])}
            </div>
            <h2>${escapeHtml(state.aboutHeading)}</h2>
            <p>${escapeHtml(state.aboutIntro)}</p>
          </div>
          <div class="feature-grid">
            ${(state.aboutCardOrder || []).map((cardId) => {
              const card = cards[cardId];
              if (!card) {
                return "";
              }

              return `
                <article class="admin-edit-block">
                  <div class="admin-edit-controls">
                    ${renderMenu(`About card ${card.number} actions`, [
                      { action: "edit-about-card", target: card.number, label: "Edit section" },
                      { action: "move-card", target: cardId, direction: "up", label: "Move left" },
                      { action: "move-card", target: cardId, direction: "down", label: "Move right" },
                    ])}
                  </div>
                  <h3>${escapeHtml(card.title)}</h3>
                  <p>${escapeHtml(card.body)}</p>
                </article>
              `;
            }).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderRecent(state) {
    const cards = {
      "recent-card-1": {
        title: state.recentCard1Title,
        body: state.recentCard1Body,
        linkText: state.recentCard1LinkText,
        linkHref: state.recentCard1LinkHref,
        number: "1",
      },
      "recent-card-2": {
        title: state.recentCard2Title,
        body: state.recentCard2Body,
        linkText: state.recentCard2LinkText,
        linkHref: state.recentCard2LinkHref,
        number: "2",
      },
    };

    return `
      <section class="section tint admin-edit-section">
        <div class="container">
          <div class="section-header admin-edit-block">
            <div class="admin-edit-controls">
              ${renderMenu("Tracks section actions", [
                { action: "edit-recent-section", label: "Edit section" },
                { action: "move-section", target: "recent", direction: "up", label: "Move section up" },
                { action: "move-section", target: "recent", direction: "down", label: "Move section down" },
                { action: "hide-section", target: "recent", label: "Delete section", danger: true },
              ])}
            </div>
            <h2>${escapeHtml(state.recentHeading)}</h2>
            <p>${escapeHtml(state.recentIntro)}</p>
          </div>
          <div class="feature-grid">
            ${(state.recentCardOrder || []).map((cardId) => {
              const card = cards[cardId];
              if (!card) {
                return "";
              }

              return `
                <article class="admin-edit-block">
                  <div class="admin-edit-controls">
                    ${renderMenu(`Track card ${card.number} actions`, [
                      { action: "edit-recent-card", target: card.number, label: "Edit section" },
                      { action: "move-recent-card", target: cardId, direction: "up", label: "Move left" },
                      { action: "move-recent-card", target: cardId, direction: "down", label: "Move right" },
                    ])}
                  </div>
                  <h3>${escapeHtml(card.title)}</h3>
                  <p>${escapeHtml(card.body)}</p>
                  <span class="text-link">${escapeHtml(card.linkText)}</span>
                  <p class="meta">${escapeHtml(card.linkHref)}</p>
                </article>
              `;
            }).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderCustomSection(section) {
    return `
      <section class="section admin-edit-section">
        <div class="container">
          <article class="card custom-home-card admin-edit-block">
            <div class="admin-edit-controls">
              ${renderMenu("Custom section actions", [
                { action: "edit-custom-section", target: section.id, label: "Edit section" },
                { action: "move-section", target: `custom:${section.id}`, direction: "up", label: "Move section up" },
                { action: "move-section", target: `custom:${section.id}`, direction: "down", label: "Move section down" },
                { action: "delete-custom-section", target: section.id, label: "Delete section", danger: true },
              ])}
            </div>
            ${section.kicker ? `<p class="eyebrow">${escapeHtml(section.kicker)}</p>` : ""}
            <h2>${escapeHtml(section.title)}</h2>
            ${section.body ? `<p class="lede">${nl2br(section.body)}</p>` : ""}
            ${section.buttonText && section.buttonHref ? `<span class="btn">${escapeHtml(section.buttonText)}</span><p class="meta">${escapeHtml(section.buttonHref)}</p>` : ""}
          </article>
        </div>
      </section>
    `;
  }

  function renderContact(state) {
    return `
      <section class="section admin-edit-section">
        <div class="container">
          <article class="contact admin-edit-block">
            <div class="admin-edit-controls">
              ${renderMenu("Contact section actions", [
                { action: "edit-contact-section", label: "Edit section" },
                { action: "move-section", target: "contact", direction: "up", label: "Move section up" },
                { action: "move-section", target: "contact", direction: "down", label: "Move section down" },
                { action: "hide-section", target: "contact", label: "Delete section", danger: true },
              ])}
            </div>
            <div>
              <h2>${escapeHtml(state.contactTitle)}</h2>
              <p>${escapeHtml(state.contactBody)}</p>
            </div>
            <span class="btn">${escapeHtml(state.contactButtonText)}</span>
          </article>
        </div>
      </section>
    `;
  }

  function renderFooter(state) {
    return `
      <section class="section admin-edit-section">
        <div class="container">
          <article class="card admin-edit-block">
            <div class="admin-edit-controls">
              ${renderMenu("Footer actions", [
                { action: "edit-footer", label: "Edit section" },
              ])}
            </div>
            <h3>Footer</h3>
            <p>${escapeHtml(state.footerText)}</p>
          </article>
        </div>
      </section>
    `;
  }

  function renderHomepageEditor() {
    const state = getHomepageState();
    const hidden = new Set(state.hiddenSections || []);
    const sections = {
      hero: !hidden.has("hero") ? renderHero(state) : "",
      about: !hidden.has("about") ? renderAbout(state) : "",
      recent: !hidden.has("recent") ? renderRecent(state) : "",
      contact: !hidden.has("contact") ? renderContact(state) : "",
    };

    (state.customSections || []).forEach((section) => {
      sections[`custom:${section.id}`] = renderCustomSection(section);
    });

    homepagePreviewEl.innerHTML = `
      ${(state.sectionOrder || []).map((sectionId) => sections[sectionId] || "").join("")}
      ${renderFooter(state)}
    `;
  }

  function updateFields(fields, message) {
    const state = getHomepageState();
    const next = promptFields(fields.map((field) => ({
      ...field,
      value: state[field.name] || "",
    })), "Edit");
    if (!next) {
      return;
    }

    api.saveHomepageContent({ ...state, ...next });
    renderHomepageEditor();
    setHomepageStatus(message);
  }

  homepageAddSectionButton.addEventListener("click", () => {
    const section = promptForHomepageSection();
    if (!section) {
      return;
    }

    api.addHomepageSection(section);
    renderHomepageEditor();
    setHomepageStatus("Added custom homepage section.");
  });

  homepageResetButton.addEventListener("click", () => {
    api.saveHomepageContent({
      ...api.getHomepageDefaults(),
      hiddenSections: [],
      customSections: [],
    });
    renderHomepageEditor();
    setHomepageStatus("Reset homepage to defaults.");
  });

  homepageRestoreSectionsButton.addEventListener("click", () => {
    api.restoreHomepageSections();
    renderHomepageEditor();
    setHomepageStatus("Restored hidden sections.");
  });

  homepagePreviewEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.adminAction) {
      return;
    }

    closeMenu(target);

    if (target.dataset.adminAction === "edit-hero-copy") {
      updateFields([
        { name: "heroEyebrow", label: "Hero eyebrow" },
        { name: "heroTitle", label: "Hero title (HTML allowed)" },
        { name: "heroLede", label: "Hero lede" },
        { name: "heroPrimaryText", label: "Primary button text" },
        { name: "heroPrimaryHref", label: "Primary button link" },
        { name: "heroSecondaryText", label: "Secondary button text" },
        { name: "heroSecondaryHref", label: "Secondary button link" },
      ], "Updated hero copy.");
      return;
    }

    if (target.dataset.adminAction === "edit-hero-card") {
      updateFields([
        { name: "heroPillPrimary", label: "Pill 1 text" },
        { name: "heroPillSecondary", label: "Pill 2 text" },
        { name: "heroCardTitle", label: "Card title" },
        { name: "heroCardBody", label: "Card body" },
        { name: "heroImageSrc", label: "Image source" },
        { name: "heroImageAlt", label: "Image alt text" },
      ], "Updated hero card.");
      return;
    }

    if (target.dataset.adminAction === "move-hero-media") {
      api.toggleHeroMediaPosition();
      renderHomepageEditor();
      setHomepageStatus("Moved hero image block.");
      return;
    }

    if (target.dataset.adminAction === "edit-about-section") {
      updateFields([
        { name: "aboutHeading", label: "About heading" },
        { name: "aboutIntro", label: "About intro" },
      ], "Updated about section.");
      return;
    }

    if (target.dataset.adminAction === "edit-about-card") {
      const number = target.dataset.adminTarget;
      updateFields([
        { name: `aboutCard${number}Title`, label: `About card ${number} title` },
        { name: `aboutCard${number}Body`, label: `About card ${number} body` },
      ], `Updated about card ${number}.`);
      return;
    }

    if (target.dataset.adminAction === "edit-recent-section") {
      updateFields([
        { name: "recentHeading", label: "Tracks heading" },
        { name: "recentIntro", label: "Tracks intro" },
      ], "Updated tracks section.");
      return;
    }

    if (target.dataset.adminAction === "edit-recent-card") {
      const number = target.dataset.adminTarget;
      updateFields([
        { name: `recentCard${number}Title`, label: `Track ${number} title` },
        { name: `recentCard${number}Body`, label: `Track ${number} body` },
        { name: `recentCard${number}LinkText`, label: `Track ${number} link text` },
        { name: `recentCard${number}LinkHref`, label: `Track ${number} link href` },
      ], `Updated track ${number}.`);
      return;
    }

    if (target.dataset.adminAction === "edit-contact-section") {
      updateFields([
        { name: "contactTitle", label: "Contact title" },
        { name: "contactBody", label: "Contact body" },
        { name: "contactButtonText", label: "Contact button text" },
        { name: "contactButtonHref", label: "Contact button link" },
      ], "Updated contact section.");
      return;
    }

    if (target.dataset.adminAction === "edit-footer") {
      updateFields([{ name: "footerText", label: "Footer text" }], "Updated footer.");
      return;
    }

    if (target.dataset.adminAction === "edit-custom-section") {
      const section = (getHomepageState().customSections || []).find((item) => item.id === target.dataset.adminTarget);
      if (!section) {
        return;
      }

      const next = promptForHomepageSection(section);
      if (!next) {
        return;
      }

      api.updateHomepageSection(section.id, next);
      renderHomepageEditor();
      setHomepageStatus("Updated custom section.");
      return;
    }

    if (target.dataset.adminAction === "delete-custom-section") {
      if (!window.confirm("Delete this custom section?")) {
        return;
      }

      api.deleteHomepageSection(target.dataset.adminTarget);
      renderHomepageEditor();
      setHomepageStatus("Deleted custom section.");
      return;
    }

    if (target.dataset.adminAction === "hide-section") {
      api.hideHomepageSection(target.dataset.adminTarget);
      renderHomepageEditor();
      setHomepageStatus("Section hidden.");
      return;
    }

    if (target.dataset.adminAction === "move-section") {
      api.moveHomepageSection(target.dataset.adminTarget, target.dataset.adminDirection);
      renderHomepageEditor();
      setHomepageStatus("Section moved.");
      return;
    }

    if (target.dataset.adminAction === "move-card") {
      api.moveHomepageCard("about", target.dataset.adminTarget, target.dataset.adminDirection);
      renderHomepageEditor();
      setHomepageStatus("About card moved.");
      return;
    }

    if (target.dataset.adminAction === "move-recent-card") {
      api.moveHomepageCard("recent", target.dataset.adminTarget, target.dataset.adminDirection);
      renderHomepageEditor();
      setHomepageStatus("Track card moved.");
    }
  });

  renderHomepageEditor();
  setHomepageStatus(api.canUseStorage() ? "Inline homepage editor ready." : "Local storage is unavailable in this browser.");
  startAdminSessionActivityTracking();

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logoutAdminSession();
    });
  }
});
