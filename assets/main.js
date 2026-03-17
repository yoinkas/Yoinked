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
  const storageKey = "hacking-layout-v1";
  const editorPassword = "cozydk";

  if (!moveButton || !saveButton || !resetButton || !cards.length) {
    return;
  }

  let moveModeEnabled = false;
  let dragState = null;
  let layoutState = {};

  function clampOffset(value) {
    return Math.round(Math.max(-1600, Math.min(1600, value)));
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

  function applyCardOffset(card, offset) {
    const x = clampOffset(offset?.x || 0);
    const y = clampOffset(offset?.y || 0);
    card.style.setProperty("--move-x", `${x}px`);
    card.style.setProperty("--move-y", `${y}px`);
    card.dataset.moveX = String(x);
    card.dataset.moveY = String(y);
  }

  function applyLayout(nextState) {
    cards.forEach((card) => {
      const id = card.dataset.moveId;
      const saved = nextState[id] || { x: 0, y: 0 };
      applyCardOffset(card, saved);
    });
  }

  function snapshotLayout() {
    const snapshot = {};
    cards.forEach((card) => {
      snapshot[card.dataset.moveId] = {
        x: clampOffset(Number(card.dataset.moveX || 0)),
        y: clampOffset(Number(card.dataset.moveY || 0)),
      };
    });
    return snapshot;
  }

  function setMoveMode(enabled) {
    moveModeEnabled = enabled;
    document.body.classList.toggle("hacking-move-mode", enabled);
    moveButton.textContent = enabled ? "Exit Move" : "Move";
    saveButton.hidden = !enabled;
    resetButton.hidden = !enabled;
  }

  function pointerPosition(event) {
    if (event.touches?.length) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }

  function startDrag(event) {
    if (!moveModeEnabled) {
      return;
    }

    const card = event.currentTarget;
    const point = pointerPosition(event);

    dragState = {
      card,
      startPointerX: point.x,
      startPointerY: point.y,
      startX: Number(card.dataset.moveX || 0),
      startY: Number(card.dataset.moveY || 0),
    };

    event.preventDefault();
  }

  function updateDrag(event) {
    if (!dragState) {
      return;
    }

    const point = pointerPosition(event);
    const nextX = dragState.startX + (point.x - dragState.startPointerX);
    const nextY = dragState.startY + (point.y - dragState.startPointerY);
    applyCardOffset(dragState.card, { x: nextX, y: nextY });
    event.preventDefault();
  }

  function endDrag() {
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
    cards.forEach((card) => applyCardOffset(card, { x: 0, y: 0 }));
    window.localStorage.removeItem(storageKey);
  });

  cards.forEach((card) => {
    card.addEventListener("mousedown", startDrag);
    card.addEventListener("touchstart", startDrag, { passive: false });
  });

  window.addEventListener("mousemove", updateDrag);
  window.addEventListener("touchmove", updateDrag, { passive: false });
  window.addEventListener("mouseup", endDrag);
  window.addEventListener("touchend", endDrag);

  layoutState = readStoredLayout();
  applyLayout(layoutState);
}

document.addEventListener("DOMContentLoaded", async () => {
  const api = window.BoxLadderContent;
  if (!api) {
    setupHackingLayoutEditor();
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

  setupHackingLayoutEditor();
});
