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

document.addEventListener("DOMContentLoaded", async () => {
  const api = window.BoxLadderContent;
  if (!api) {
    return;
  }

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
    allPostsEl.innerHTML = posts.length
      ? posts.map((post) => api.renderPostCard(post, { basePath: "" })).join("")
      : `<p class="empty-state">No published posts yet. Create and publish one when you are ready.</p>`;
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
