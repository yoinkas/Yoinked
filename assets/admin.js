async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

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

  const form = document.getElementById("admin-form");
  if (!form) {
    return;
  }

  const postList = document.getElementById("admin-post-list");
  const statusEl = document.getElementById("admin-status");
  const exportButton = document.getElementById("export-posts");
  const importInput = document.getElementById("import-posts");
  const resetButton = document.getElementById("reset-form");
  const logoutButton = document.getElementById("logout-button");
  const homepageForm = document.getElementById("homepage-form");
  const homepageResetButton = document.getElementById("homepage-reset");
  const homepageAddSectionButton = document.getElementById("homepage-add-section");
  const homepageRestoreSectionsButton = document.getElementById("homepage-restore-sections");
  const homepageStatusEl = document.getElementById("homepage-status");
  const homepagePreviewEl = document.getElementById("homepage-preview");
  const homepageSectionListEl = document.getElementById("homepage-section-list");

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function setHomepageStatus(message) {
    if (homepageStatusEl) {
      homepageStatusEl.textContent = message;
    }
  }

  function getHomepageDefaults() {
    return {
      heroTitle: `Clean, methodical walkthroughs for <span>TryHackMe</span> and <span>Hack The Box</span>.`,
      heroLede: `Focused on reproducible steps, tooling notes, and what I learned along the way. Built for review before interviews and CTF sprints.`,
      heroCardTitle: "Writeups built for review",
      heroCardBody: "Each walkthrough focuses on clean recon notes, repeatable commands, and lessons worth keeping.",
      aboutIntro: "Each post sticks to a repeatable workflow: recon, foothold, privilege escalation, and takeaways.",
      recentIntro: "CyberSecurity and Hacking now live on separate pages so the site stays divided cleanly.",
      contactTitle: "Need to ship a post fast?",
      contactBody: "Draft locally, tighten the writeup, and publish when you are ready.",
    };
  }

  function getHomepageState() {
    return {
      ...getHomepageDefaults(),
      ...api.loadHomepageContent(),
    };
  }

  function fillHomepageForm() {
    if (!homepageForm) {
      return;
    }

    const state = getHomepageState();
    homepageForm.elements.heroTitle.value = state.heroTitle || "";
    homepageForm.elements.heroLede.value = state.heroLede || "";
    homepageForm.elements.heroCardTitle.value = state.heroCardTitle || "";
    homepageForm.elements.heroCardBody.value = state.heroCardBody || "";
    homepageForm.elements.aboutIntro.value = state.aboutIntro || "";
    homepageForm.elements.recentIntro.value = state.recentIntro || "";
    homepageForm.elements.contactTitle.value = state.contactTitle || "";
    homepageForm.elements.contactBody.value = state.contactBody || "";
  }

  function renderHomepagePreview() {
    if (!homepagePreviewEl) {
      return;
    }

    const state = getHomepageState();
    const customSections = Array.isArray(state.customSections) ? state.customSections : [];

    homepagePreviewEl.innerHTML = `
      <article class="hero-card">
        <p class="eyebrow">Homepage</p>
        <h2>${state.heroTitle}</h2>
        <p class="lede">${state.heroLede}</p>
        <div class="callout">
          <h3>${state.heroCardTitle}</h3>
          <p>${state.heroCardBody}</p>
        </div>
      </article>
      <article class="card">
        <h3>About</h3>
        <p>${state.aboutIntro}</p>
      </article>
      <article class="card">
        <h3>Track intro</h3>
        <p>${state.recentIntro}</p>
      </article>
      ${customSections.map((section) => api.renderHomepageSection(section)).join("")}
      <article class="contact">
        <div>
          <h3>${state.contactTitle}</h3>
          <p>${state.contactBody}</p>
        </div>
      </article>
    `;
  }

  function renderHomepageSections() {
    if (!homepageSectionListEl) {
      return;
    }

    const state = getHomepageState();
    const hiddenSections = new Set(state.hiddenSections || []);
    const builtinSections = [
      { id: "hero", label: "Hero", body: "Main homepage intro and CTA block." },
      { id: "about", label: "About", body: "What you will find section." },
      { id: "recent", label: "Tracks", body: "CyberSecurity and Hacking split section." },
      { id: "contact", label: "Contact", body: "Bottom CTA block." },
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
          <button type="button" class="btn ghost" data-home-action="toggle-built-in" data-id="${section.id}">
            ${hiddenSections.has(section.id) ? "Restore" : "Edit in form"}
          </button>
          <button type="button" class="section-delete-btn" data-home-action="${hiddenSections.has(section.id) ? "restore-built-in" : "hide-built-in"}" data-id="${section.id}" aria-label="${hiddenSections.has(section.id) ? "Restore" : "Hide"} section">x</button>
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

  function populateForm(post) {
    form.elements.id.value = post?.id || "";
    form.elements.title.value = post?.title || "";
    form.elements.slug.value = post?.slug || "";
    form.elements.category.value = post?.category || "";
    form.elements.excerpt.value = post?.excerpt || "";
    form.elements.tags.value = post?.tags?.join(", ") || "";
    form.elements.content.value = post?.content || "";
    form.elements.status.value = post?.status || "published";
    form.elements.existingCoverImage.value = post?.coverImage || "";
    form.elements.existingGalleryImages.value = JSON.stringify(post?.galleryImages || []);

    const preview = document.getElementById("cover-preview");
    preview.innerHTML = post?.coverImage
      ? `<img src="${post.coverImage}" alt="Cover preview" />`
      : `<p class="inline-note">No cover image selected.</p>`;
  }

  function renderPosts() {
    const posts = api.loadPosts().sort((left, right) => {
      return new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime();
    });

    if (!posts.length) {
      postList.innerHTML = `<p class="empty-state">No posts saved yet. Publish one from the form to populate the site.</p>`;
      return;
    }

    postList.innerHTML = posts
      .map((post) => {
        return `
          <article class="admin-post-card">
            <div>
              <p class="meta">${post.category} | ${post.status}</p>
              <h3>${post.title}</h3>
              <p>${post.excerpt}</p>
            </div>
            <div class="admin-card-actions">
              <button type="button" class="btn ghost" data-action="edit" data-id="${post.id}">Edit</button>
              <button type="button" class="btn ghost" data-action="delete" data-id="${post.id}">Delete</button>
              <a class="text-link" href="/posts/post.html?slug=${encodeURIComponent(post.slug)}">Preview</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const coverFile = form.elements.coverImage.files[0];
    const galleryFiles = Array.from(form.elements.galleryImages.files);
    const existingGalleryImages = JSON.parse(form.elements.existingGalleryImages.value || "[]");

    const coverImage = coverFile
      ? await readFileAsDataUrl(coverFile)
      : form.elements.existingCoverImage.value;

    const newGalleryImages = galleryFiles.length
      ? await Promise.all(galleryFiles.map((file) => readFileAsDataUrl(file)))
      : existingGalleryImages;

    const post = api.upsertPost({
      id: form.elements.id.value,
      title: form.elements.title.value,
      slug: form.elements.slug.value,
      category: form.elements.category.value,
      excerpt: form.elements.excerpt.value,
      tags: form.elements.tags.value,
      content: form.elements.content.value,
      status: form.elements.status.value,
      coverImage,
      galleryImages: newGalleryImages,
    });

    populateForm(post);
    renderPosts();
    setStatus(`Saved "${post.title}" as ${post.status}.`);
  });

  postList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) {
      return;
    }

    if (action === "edit") {
      populateForm(api.getPost(id));
      setStatus("Loaded post into the editor.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "delete") {
      api.deletePost(id);
      renderPosts();
      populateForm(null);
      setStatus("Deleted post.");
    }
  });

  form.elements.coverImage.addEventListener("change", async () => {
    const preview = document.getElementById("cover-preview");
    const file = form.elements.coverImage.files[0];
    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    form.elements.existingCoverImage.value = dataUrl;
    preview.innerHTML = `<img src="${dataUrl}" alt="Cover preview" />`;
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    populateForm(null);
    setStatus("Form reset.");
  });

  exportButton.addEventListener("click", () => {
    const blob = new Blob([api.exportPosts()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boxladder-posts.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Exported posts to JSON.");
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) {
      return;
    }

    const raw = await file.text();
    api.importPosts(raw);
    populateForm(null);
    renderPosts();
    setStatus("Imported posts from JSON.");
  });

  if (homepageForm) {
    homepageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = {
        ...api.loadHomepageContent(),
        heroTitle: homepageForm.elements.heroTitle.value,
        heroLede: homepageForm.elements.heroLede.value,
        heroCardTitle: homepageForm.elements.heroCardTitle.value,
        heroCardBody: homepageForm.elements.heroCardBody.value,
        aboutIntro: homepageForm.elements.aboutIntro.value,
        recentIntro: homepageForm.elements.recentIntro.value,
        contactTitle: homepageForm.elements.contactTitle.value,
        contactBody: homepageForm.elements.contactBody.value,
      };

      api.saveHomepageContent(payload);
      refreshHomepageUI();
      setHomepageStatus("Saved homepage content.");
    });
  }

  if (homepageResetButton) {
    homepageResetButton.addEventListener("click", () => {
      api.saveHomepageContent({
        ...api.loadHomepageContent(),
        ...getHomepageDefaults(),
      });
      refreshHomepageUI();
      setHomepageStatus("Reset homepage copy to defaults.");
    });
  }

  if (homepageAddSectionButton) {
    homepageAddSectionButton.addEventListener("click", () => {
      const section = promptForHomepageSection();
      if (!section) {
        return;
      }

      api.addHomepageSection(section);
      refreshHomepageUI();
      setHomepageStatus("Added custom homepage section.");
    });
  }

  if (homepageRestoreSectionsButton) {
    homepageRestoreSectionsButton.addEventListener("click", () => {
      const state = api.loadHomepageContent();
      api.saveHomepageContent({
        ...state,
        hiddenSections: [],
      });
      refreshHomepageUI();
      setHomepageStatus("Restored hidden built-in sections.");
    });
  }

  if (homepageSectionListEl) {
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

      if (action === "toggle-built-in") {
        setHomepageStatus("Built-in sections are edited from the homepage form above.");
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
  }

  populateForm(null);
  renderPosts();
  refreshHomepageUI();
  setStatus(
    api.canUseStorage()
      ? "Local admin ready. Published posts will appear in this browser."
      : "Local storage is unavailable in this browser."
  );

  startAdminSessionActivityTracking();

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      logoutAdminSession();
    });
  }
});
