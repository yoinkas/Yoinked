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

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
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

  populateForm(null);
  renderPosts();
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
