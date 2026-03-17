const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

function applyHomepageContent(api) {
  const content = api.loadHomepageContent();
  document.querySelectorAll("[data-home-field]").forEach((element) => {
    const field = element.getAttribute("data-home-field");
    const value = content[field];
    if (!field || typeof value !== "string" || !value.trim()) {
      return;
    }

    if (element.hasAttribute("data-home-html")) {
      element.innerHTML = value;
      return;
    }

    element.textContent = value;
  });

  document.querySelectorAll("[data-home-attr]").forEach((element) => {
    const field = element.getAttribute("data-home-field");
    const attribute = element.getAttribute("data-home-attr");
    const value = content[field];
    if (!field || !attribute || typeof value !== "string" || !value.trim()) {
      return;
    }

    element.setAttribute(attribute, value);
  });

  document.querySelectorAll("[data-home-alt-field]").forEach((element) => {
    const field = element.getAttribute("data-home-alt-field");
    const value = content[field];
    if (!field || typeof value !== "string" || !value.trim()) {
      return;
    }

    element.setAttribute("alt", value);
  });

  const heroGrid = document.querySelector(".hero-grid");
  if (heroGrid) {
    heroGrid.classList.toggle("hero-grid-reversed", content.heroMediaPosition === "left");
  }

  const heroMediaShell = document.getElementById("hero-media-shell");
  if (heroMediaShell) {
    const heroEmbed = api.renderEmbedFrame(content.heroEmbedUrl, "Homepage hero media");
    if (heroEmbed) {
      heroMediaShell.innerHTML = heroEmbed;
    } else {
      heroMediaShell.innerHTML = `
        <img
          class="hero-meme"
          src="${content.heroImageSrc}"
          alt="${content.heroImageAlt}"
          data-home-field="heroImageSrc"
          data-home-attr="src"
          data-home-alt-field="heroImageAlt"
        />
      `;
    }
  }
}

function applyHomepageCardOrdering(api) {
  const content = api.loadHomepageContent();

  document.querySelectorAll("[data-home-card-group='about']").forEach((group) => {
    const cards = new Map(
      Array.from(group.querySelectorAll("[data-home-card-id]")).map((card) => [card.getAttribute("data-home-card-id"), card])
    );
    (content.aboutCardOrder || []).forEach((cardId) => {
      const card = cards.get(cardId);
      if (card) {
        group.appendChild(card);
      }
    });
  });

  document.querySelectorAll("[data-home-card-group='recent']").forEach((group) => {
    const cards = new Map(
      Array.from(group.querySelectorAll("[data-home-card-id]")).map((card) => [card.getAttribute("data-home-card-id"), card])
    );
    (content.recentCardOrder || []).forEach((cardId) => {
      const card = cards.get(cardId);
      if (card) {
        group.appendChild(card);
      }
    });
  });
}

function applyHomepageSections(api) {
  const content = api.loadHomepageContent();
  const hiddenSections = new Set(content.hiddenSections || []);

  document.querySelectorAll("[data-home-section]").forEach((section) => {
    const sectionId = section.getAttribute("data-home-section");
    section.hidden = hiddenSections.has(sectionId);
  });

  const customSectionsEl = document.getElementById("custom-home-sections");
  if (customSectionsEl) {
    customSectionsEl.innerHTML = (content.customSections || []).map((section) => api.renderHomepageSection(section)).join("");
  }

  const siteMain = document.getElementById("site-main");
  if (siteMain) {
    const orderedSections = new Map(
      Array.from(siteMain.querySelectorAll("[data-home-order-id]")).map((section) => [section.getAttribute("data-home-order-id"), section])
    );

    (content.sectionOrder || []).forEach((sectionId) => {
      const section = orderedSections.get(sectionId);
      if (section) {
        siteMain.appendChild(section);
      }
    });
  }
}

function logVisitor() {
  const payload = {
    page: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language || "",
  };

  fetch("/api/track-visit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Ignore tracking failures so they never affect page use.
  });
}

function setupHackingLayoutEditor() {
  if (!document.body.classList.contains("page-hacking")) {
    return;
  }

  const moveButton = document.getElementById("hacking-move-toggle");
  const saveButton = document.getElementById("hacking-move-save");
  const resetButton = document.getElementById("hacking-move-reset");
  const cards = Array.from(document.querySelectorAll(".hacking-media-card[data-move-id]"));
  const storageKey = "hacking-layout-v2";
  const editorPassword = "cozydk";

  if (!moveButton || !saveButton || !resetButton || !cards.length) {
    return;
  }

  let moveModeEnabled = false;
  let dragState = null;
  let layoutState = {};
  const placeholders = new Map();

  function clampHorizontal(value, width) {
    const max = Math.max(12, document.documentElement.scrollWidth - width - 12);
    return Math.round(Math.max(12, Math.min(max, value)));
  }

  function clampVertical(value, height) {
    const max = Math.max(12, document.documentElement.scrollHeight - height - 12);
    return Math.round(Math.max(12, Math.min(max, value)));
  }

  function readStoredLayout() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeStoredLayout(nextState) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextState));
  }

  function getPlaceholderRect(card) {
    const placeholder = placeholders.get(card.dataset.moveId);
    return placeholder?.getBoundingClientRect();
  }

  function defaultPositionForCard(card) {
    const rect = getPlaceholderRect(card);
    const width = rect?.width || card.getBoundingClientRect().width || 320;
    const height = rect?.height || card.getBoundingClientRect().height || 220;
    const left = (rect?.left || 0) + window.scrollX;
    const top = (rect?.top || 0) + window.scrollY;
    return { left, top, width, height };
  }

  function applyCardPosition(card, position) {
    const currentRect = card.getBoundingClientRect();
    const width = Math.round(position?.width || currentRect.width || defaultPositionForCard(card).width);
    const height = Math.round(currentRect.height || defaultPositionForCard(card).height);
    const left = clampHorizontal(Number(position?.left || 0), width);
    const top = clampVertical(Number(position?.top || 0), height);
    card.style.setProperty("--move-left", `${left}px`);
    card.style.setProperty("--move-top", `${top}px`);
    card.style.setProperty("--move-width", `${width}px`);
    card.dataset.moveLeft = String(left);
    card.dataset.moveTop = String(top);
    card.dataset.moveWidth = String(width);
  }

  function applyLayout(nextState) {
    cards.forEach((card) => {
      const id = card.dataset.moveId;
      const fallback = defaultPositionForCard(card);
      applyCardPosition(card, nextState[id] || fallback);
      card.classList.add("is-free-positioned");
    });
  }

  function snapshotLayout() {
    const snapshot = {};
    cards.forEach((card) => {
      snapshot[card.dataset.moveId] = {
        left: Number(card.dataset.moveLeft || 0),
        top: Number(card.dataset.moveTop || 0),
        width: Number(card.dataset.moveWidth || 0),
      };
    });
    return snapshot;
  }

  function createPlaceholders() {
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const placeholder = document.createElement("div");
      placeholder.className = "hacking-media-placeholder";
      placeholder.style.width = `${Math.round(rect.width)}px`;
      placeholder.style.height = `${Math.round(rect.height)}px`;
      card.insertAdjacentElement("afterend", placeholder);
      placeholders.set(card.dataset.moveId, placeholder);
    });
  }

  function setMoveMode(enabled) {
    moveModeEnabled = enabled;
    document.body.classList.toggle("hacking-move-mode", enabled);
    moveButton.textContent = enabled ? "Exit Move" : "Move";
    saveButton.hidden = !enabled;
    resetButton.hidden = !enabled;
  }

  function startDrag(event) {
    if (!moveModeEnabled) {
      return;
    }

    const card = event.currentTarget;
    dragState = {
      card,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startLeft: Number(card.dataset.moveLeft || 0),
      startTop: Number(card.dataset.moveTop || 0),
    };

    card.classList.add("is-dragging");
    card.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function updateDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const nextLeft = dragState.startLeft + (event.clientX - dragState.startPointerX);
    const nextTop = dragState.startTop + (event.clientY - dragState.startPointerY);
    applyCardPosition(dragState.card, {
      left: nextLeft,
      top: nextTop,
      width: Number(dragState.card.dataset.moveWidth || 0),
    });
    event.preventDefault();
  }

  function endDrag(event) {
    if (!dragState || (event && event.pointerId !== dragState.pointerId)) {
      return;
    }

    dragState.card.classList.remove("is-dragging");
    dragState = null;
  }

  moveButton.addEventListener("click", () => {
    if (!moveModeEnabled) {
      const password = window.prompt("Password for move mode");
      if (password !== editorPassword) {
        return;
      }
    }

    setMoveMode(!moveModeEnabled);
  });

  saveButton.addEventListener("click", () => {
    layoutState = snapshotLayout();
    writeStoredLayout(layoutState);
    setMoveMode(false);
  });

  resetButton.addEventListener("click", () => {
    layoutState = {};
    applyLayout(layoutState);
    window.localStorage.removeItem(storageKey);
  });

  cards.forEach((card) => {
    card.querySelectorAll("img").forEach((image) => {
      image.setAttribute("draggable", "false");
      image.addEventListener("dragstart", (event) => event.preventDefault());
    });
    card.addEventListener("pointerdown", startDrag);
  });

  window.addEventListener("pointermove", updateDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  createPlaceholders();
  layoutState = readStoredLayout();
  applyLayout(layoutState);
}

document.addEventListener("DOMContentLoaded", async () => {
  setupHackingLayoutEditor();

  const api = window.BoxLadderContent;
  if (!api) {
    return;
  }

  logVisitor();

  await api.fetchHomepageContent();
  applyHomepageContent(api);
  applyHomepageSections(api);
  applyHomepageCardOrdering(api);

  const recentPostsEl = document.getElementById("recent-posts");
  if (recentPostsEl) {
    const posts = api.getPublishedPosts().slice(0, 3);
    recentPostsEl.innerHTML = posts.length
      ? posts.map((post) => api.renderPostCard(post, { basePath: "posts/" })).join("")
      : `<p class="empty-state">No published posts yet. Publish your first writeup when it is ready.</p>`;
  }

  const allPostsEl = document.getElementById("all-posts");
  if (allPostsEl) {
    const posts = api.getPublishedPosts();
    const emptyMessage = document.body.classList.contains("page-hacking")
      ? ""
      : "No published posts yet. Create and publish one when you are ready.";
    allPostsEl.innerHTML = posts.length
      ? posts.map((post) => api.renderPostCard(post, { basePath: "" })).join("")
      : emptyMessage
        ? `<p class="empty-state">${emptyMessage}</p>`
        : "";
  }

  const featuredWriteupsEl = document.getElementById("featured-writeups-extra");
  if (featuredWriteupsEl) {
    const content = api.loadHomepageContent();
    const items = Array.isArray(content.featuredWriteups) ? content.featuredWriteups : [];
    featuredWriteupsEl.innerHTML = items.length
      ? items.map((item) => api.renderFeaturedWriteupCard(item)).join("")
      : "";
  }

  const postViewEl = document.getElementById("post-view");
  if (postViewEl) {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug") || params.get("id") || "";
    const post = api.getPost(slug);

    if (!post || post.status !== "published") {
      postViewEl.innerHTML = `
        <article class="post-shell">
          <p class="meta">Post not found</p>
          <h1>No published post matches this link.</h1>
          <p class="lede">Return to the writeups index or publish the post when it is ready.</p>
          <a class="btn" href="index.html">Back to writeups</a>
        </article>
      `;
      return;
    }

    postViewEl.innerHTML = api.renderPostPage(post);
    document.title = `${post.title} | Box & Ladder`;
  }
});
