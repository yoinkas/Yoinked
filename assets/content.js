(() => {
  const STORAGE_KEY = "boxladder.posts.v1";
  const HOMEPAGE_KEY = "boxladder.homepage.v1";

  function getHomepageDefaults() {
    return {
      heroEyebrow: "Security Writeups",
      heroTitle: `Clean, methodical walkthroughs for <span>TryHackMe</span> and <span>Hack The Box</span>.`,
      heroLede: "Focused on reproducible steps, tooling notes, and what I learned along the way. Built for review before interviews and CTF sprints.",
      heroPrimaryText: "CyberSecurity",
      heroPrimaryHref: "cybersecurity.html",
      heroSecondaryText: "Hacking",
      heroSecondaryHref: "hacking.html",
      heroPillPrimary: "Latest",
      heroPillSecondary: "Field notes",
      heroCardTitle: "Writeups built for review",
      heroCardBody: "Each walkthrough focuses on clean recon notes, repeatable commands, and lessons worth keeping.",
      aboutHeading: "What you will find",
      aboutIntro: "Each post sticks to a repeatable workflow: recon, foothold, privilege escalation, and takeaways.",
      aboutCard1Title: "Recon snapshots",
      aboutCard1Body: "Clean notes on scans, enumeration, and decision points.",
      aboutCard2Title: "Tooling notes",
      aboutCard2Body: "Commands that matter, plus the flags I forget if I do not write them down.",
      aboutCard3Title: "Lessons learned",
      aboutCard3Body: "What went wrong, how it was fixed, and what I will do next time.",
      recentHeading: "Two separate tracks",
      recentIntro: "CyberSecurity and Hacking now live on separate pages so the site stays divided cleanly.",
      recentCard1Title: "CyberSecurity",
      recentCard1Body: "Security notes, broader thinking, and selected material with a wider operational view.",
      recentCard1LinkText: "Open CyberSecurity",
      recentCard1LinkHref: "cybersecurity.html",
      recentCard2Title: "Hacking",
      recentCard2Body: "Hands-on research, labs, exploit paths, and offensive workflow notes all live on their own page.",
      recentCard2LinkText: "Open Hacking",
      recentCard2LinkHref: "hacking.html",
      contactTitle: "Need to ship a post fast?",
      contactBody: "Draft locally, tighten the writeup, and publish when you are ready.",
      contactButtonText: "Browse research",
      contactButtonHref: "hacking.html",
      footerText: "Yoinked by Yoinkas | Security writeups",
    };
  }

  function canUseStorage() {
    try {
      const key = "__boxladder_test__";
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `post-${Date.now()}`;
  }

  function plainText(value) {
    return String(value || "").replace(/\r\n/g, "\n").trim();
  }

  function summarize(value) {
    const text = plainText(value).replace(/\s+/g, " ");
    if (text.length <= 180) {
      return text;
    }

    return `${text.slice(0, 177).trimEnd()}...`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderRichText(value) {
    const blocks = plainText(value).split(/\n{2,}/).filter(Boolean);
    return blocks
      .map((block) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const code = block.replace(/^```/, "").replace(/```$/, "").trim();
          return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }

        if (block.startsWith("## ")) {
          return `<h2>${escapeHtml(block.slice(3))}</h2>`;
        }

        if (block.startsWith("# ")) {
          return `<h2>${escapeHtml(block.slice(2))}</h2>`;
        }

        return `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`;
      })
      .join("");
  }

  function formatDate(value) {
    if (!value) {
      return "Unscheduled";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unscheduled";
    }

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function loadPosts() {
    if (!canUseStorage()) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function savePosts(posts) {
    if (!canUseStorage()) {
      return posts;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return posts;
  }

  function normalizePost(input, existingPost) {
    const now = new Date().toISOString();
    const tags = Array.isArray(input.tags)
      ? input.tags
      : String(input.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

    const galleryImages = Array.isArray(input.galleryImages)
      ? input.galleryImages.filter(Boolean)
      : [];

    const title = plainText(input.title);
    const excerpt = plainText(input.excerpt) || summarize(input.content);
    const status = input.status === "draft" ? "draft" : "published";
    const slugBase = plainText(input.slug) || title;

    return {
      id: existingPost?.id || `post-${Date.now()}`,
      slug: slugify(slugBase),
      title,
      category: plainText(input.category) || "Writeup",
      excerpt,
      content: plainText(input.content),
      tags,
      coverImage: input.coverImage || existingPost?.coverImage || "",
      galleryImages,
      status,
      createdAt: existingPost?.createdAt || now,
      updatedAt: now,
      publishedAt:
        status === "published"
          ? existingPost?.publishedAt || now
          : existingPost?.publishedAt || "",
    };
  }

  function upsertPost(input) {
    const posts = loadPosts();
    const existingIndex = posts.findIndex((post) => post.id === input.id);
    const existingPost = existingIndex >= 0 ? posts[existingIndex] : null;
    const normalized = normalizePost(input, existingPost);

    if (existingIndex >= 0) {
      posts[existingIndex] = normalized;
    } else {
      posts.push(normalized);
    }

    savePosts(posts);
    return normalized;
  }

  function deletePost(id) {
    const posts = loadPosts().filter((post) => post.id !== id);
    savePosts(posts);
    return posts;
  }

  function getPublishedPosts() {
    return loadPosts()
      .filter((post) => post.status === "published")
      .sort((left, right) => {
        const leftTime = new Date(left.publishedAt || left.updatedAt).getTime();
        const rightTime = new Date(right.publishedAt || right.updatedAt).getTime();
        return rightTime - leftTime;
      });
  }

  function getPost(identifier) {
    return loadPosts().find((post) => post.id === identifier || post.slug === identifier) || null;
  }

  function renderTags(tags) {
    if (!tags?.length) {
      return "";
    }

    return `<div class="tag-list">${tags
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("")}</div>`;
  }

  function renderPostCard(post, options = {}) {
    const href = `${options.basePath || "posts/"}post.html?slug=${encodeURIComponent(post.slug)}`;
    const image = post.coverImage
      ? `<img class="card-media" src="${post.coverImage}" alt="${escapeHtml(post.title)} cover image" />`
      : "";

    return `
      <article class="card card-post" data-post-id="${escapeHtml(post.id)}">
        ${image}
        <p class="meta">${escapeHtml(post.category)} | ${formatDate(post.publishedAt)}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
        ${renderTags(post.tags)}
        <a class="text-link" href="${href}">Read writeup</a>
      </article>
    `;
  }

  function renderPostPage(post) {
    const heroImage = post.coverImage
      ? `<img class="post-cover" src="${post.coverImage}" alt="${escapeHtml(post.title)} cover image" />`
      : "";

    const gallery = post.galleryImages?.length
      ? `
        <section class="post-gallery">
          <h2>Screenshots</h2>
          <div class="image-grid">
            ${post.galleryImages
              .map(
                (image, index) =>
                  `<figure class="image-card"><img src="${image}" alt="${escapeHtml(
                    `${post.title} screenshot ${index + 1}`
                  )}" /></figure>`
              )
              .join("")}
          </div>
        </section>
      `
      : "";

    return `
      <article class="post-shell" data-post-id="${escapeHtml(post.id)}">
        <p class="meta">${escapeHtml(post.category)} | ${formatDate(post.publishedAt)}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="lede">${escapeHtml(post.excerpt)}</p>
        ${renderTags(post.tags)}
        ${heroImage}
        <section class="post-body">
          ${renderRichText(post.content)}
        </section>
        ${gallery}
      </article>
    `;
  }

  function exportPosts() {
    return JSON.stringify(loadPosts(), null, 2);
  }

  function importPosts(rawValue) {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      throw new Error("Imported data must be an array of posts.");
    }

    savePosts(parsed);
    return parsed;
  }

  function loadHomepageContent() {
    const defaults = getHomepageDefaults();

    if (!canUseStorage()) {
      return {
        ...defaults,
        hiddenSections: [],
        customSections: [],
      };
    }

    try {
      const raw = window.localStorage.getItem(HOMEPAGE_KEY);
      if (!raw) {
        return {
          ...defaults,
          hiddenSections: [],
          customSections: [],
        };
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return {
          ...defaults,
          hiddenSections: [],
          customSections: [],
        };
      }

      return {
        ...defaults,
        ...parsed,
        hiddenSections: Array.isArray(parsed.hiddenSections) ? parsed.hiddenSections : [],
        customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
      };
    } catch (error) {
      return {
        ...defaults,
        hiddenSections: [],
        customSections: [],
      };
    }
  }

  function saveHomepageContent(content) {
    if (!canUseStorage()) {
      return content;
    }

    const normalized = {
      ...(content && typeof content === "object" ? content : {}),
      hiddenSections: Array.isArray(content?.hiddenSections) ? content.hiddenSections : [],
      customSections: Array.isArray(content?.customSections) ? content.customSections : [],
    };
    window.localStorage.setItem(HOMEPAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function updateHomepageField(field, value) {
    const current = loadHomepageContent();
    current[field] = String(value || "");
    saveHomepageContent(current);
    return current;
  }

  function hideHomepageSection(sectionId) {
    const current = loadHomepageContent();
    current.hiddenSections = Array.from(new Set([...(current.hiddenSections || []), String(sectionId || "")].filter(Boolean)));
    return saveHomepageContent(current);
  }

  function restoreHomepageSections() {
    const current = loadHomepageContent();
    current.hiddenSections = [];
    return saveHomepageContent(current);
  }

  function addHomepageSection(input) {
    const current = loadHomepageContent();
    const nextSection = {
      id: `section-${Date.now()}`,
      kicker: plainText(input.kicker),
      title: plainText(input.title) || "New section",
      body: plainText(input.body),
      buttonText: plainText(input.buttonText),
      buttonHref: plainText(input.buttonHref),
    };

    current.customSections = [...(current.customSections || []), nextSection];
    saveHomepageContent(current);
    return nextSection;
  }

  function updateHomepageSection(sectionId, input) {
    const current = loadHomepageContent();
    current.customSections = (current.customSections || []).map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      return {
        ...section,
        kicker: plainText(input.kicker),
        title: plainText(input.title) || "New section",
        body: plainText(input.body),
        buttonText: plainText(input.buttonText),
        buttonHref: plainText(input.buttonHref),
      };
    });

    saveHomepageContent(current);
    return current.customSections.find((section) => section.id === sectionId) || null;
  }

  function deleteHomepageSection(sectionId) {
    const current = loadHomepageContent();
    current.customSections = (current.customSections || []).filter((section) => section.id !== sectionId);
    return saveHomepageContent(current);
  }

  function renderHomepageSection(section) {
    const kicker = section.kicker ? `<p class="eyebrow">${escapeHtml(section.kicker)}</p>` : "";
    const body = section.body ? `<p class="lede">${escapeHtml(section.body).replace(/\n/g, "<br />")}</p>` : "";
    const action = section.buttonText && section.buttonHref
      ? `<a class="btn" href="${escapeHtml(section.buttonHref)}">${escapeHtml(section.buttonText)}</a>`
      : "";

    return `
      <section class="section custom-home-section" data-custom-section-id="${escapeHtml(section.id)}">
        <div class="container">
          <div class="card custom-home-card">
            ${kicker}
            <h2>${escapeHtml(section.title)}</h2>
            ${body}
            ${action}
          </div>
        </div>
      </section>
    `;
  }

  window.BoxLadderContent = {
    HOMEPAGE_KEY,
    STORAGE_KEY,
    getHomepageDefaults,
    canUseStorage,
    loadPosts,
    savePosts,
    upsertPost,
    deletePost,
    getPublishedPosts,
    getPost,
    exportPosts,
    importPosts,
    loadHomepageContent,
    saveHomepageContent,
    updateHomepageField,
    hideHomepageSection,
    restoreHomepageSections,
    addHomepageSection,
    updateHomepageSection,
    deleteHomepageSection,
    renderHomepageSection,
    renderPostCard,
    renderPostPage,
  };
})();
