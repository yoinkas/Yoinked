const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

async function isAdminSessionActive() {
  try {
    const response = await fetch("/api/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return Boolean(payload?.authenticated);
  } catch (error) {
    return false;
  }
}

function promptForPostEdits(post) {
  const title = window.prompt("Edit title", post.title || "");
  if (title === null) {
    return null;
  }

  const excerpt = window.prompt("Edit excerpt", post.excerpt || "");
  if (excerpt === null) {
    return null;
  }

  const content = window.prompt("Edit body text", post.content || "");
  if (content === null) {
    return null;
  }

  return {
    ...post,
    title,
    excerpt,
    content,
  };
}

function buildAdminControls(postId) {
  const controls = document.createElement("div");
  controls.className = "post-admin-controls";
  controls.innerHTML = `
    <button type="button" class="post-admin-btn" data-admin-action="edit" data-id="${postId}" aria-label="Edit post">Edit</button>
    <button type="button" class="post-admin-btn post-admin-btn-delete" data-admin-action="delete" data-id="${postId}" aria-label="Delete post">x</button>
  `;
  return controls;
}

function decorateAdminControls(root) {
  const posts = root.querySelectorAll("[data-post-id]");
  posts.forEach((postEl) => {
    if (postEl.querySelector(".post-admin-controls")) {
      return;
    }

    const postId = postEl.getAttribute("data-post-id");
    if (!postId) {
      return;
    }

    postEl.append(buildAdminControls(postId));
  });
}

function attachAdminControls(root, api, rerender) {
  if (root.dataset.adminControlsBound === "1") {
    decorateAdminControls(root);
    return;
  }

  root.dataset.adminControlsBound = "1";
  decorateAdminControls(root);
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.adminAction;
    const postId = target.dataset.id;
    if (!action || !postId) {
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm("Delete this post?");
      if (!confirmed) {
        return;
      }

      api.deletePost(postId);
      rerender();
      decorateAdminControls(root);
      return;
    }

    if (action === "edit") {
      const post = api.getPost(postId);
      if (!post) {
        return;
      }

      const updated = promptForPostEdits(post);
      if (!updated) {
        return;
      }

      api.upsertPost(updated);
      rerender();
      decorateAdminControls(root);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const api = window.BoxLadderContent;
  if (!api) {
    return;
  }

  const recentPostsEl = document.getElementById("recent-posts");
  let adminMode = false;

  function renderRecentPosts() {
    if (!recentPostsEl) {
      return;
    }

    const posts = api.getPublishedPosts().slice(0, 3);
    recentPostsEl.innerHTML = posts.length
      ? posts.map((post) => api.renderPostCard(post, { basePath: "posts/" })).join("")
      : `<p class="empty-state">No published posts yet. Publish your first writeup when it is ready.</p>`;

    if (adminMode) {
      decorateAdminControls(recentPostsEl);
    }
  }

  if (recentPostsEl) {
    renderRecentPosts();
  }

  const allPostsEl = document.getElementById("all-posts");
  function renderAllPosts() {
    if (!allPostsEl) {
      return;
    }

    const posts = api.getPublishedPosts();
    allPostsEl.innerHTML = posts.length
      ? posts.map((post) => api.renderPostCard(post, { basePath: "" })).join("")
      : `<p class="empty-state">No published posts yet. Create and publish one when you are ready.</p>`;

    if (adminMode) {
      decorateAdminControls(allPostsEl);
    }
  }

  if (allPostsEl) {
    renderAllPosts();
  }

  const postViewEl = document.getElementById("post-view");
  function renderPostView() {
    if (!postViewEl) {
      return;
    }

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

    if (adminMode) {
      decorateAdminControls(postViewEl);
    }
  }

  if (postViewEl) {
    renderPostView();
  }

  isAdminSessionActive().then((authenticated) => {
    if (!authenticated) {
      return;
    }

    adminMode = true;

    if (recentPostsEl) {
      attachAdminControls(recentPostsEl, api, renderRecentPosts);
    }

    if (allPostsEl) {
      attachAdminControls(allPostsEl, api, renderAllPosts);
    }

    if (postViewEl) {
      attachAdminControls(postViewEl, api, renderPostView);
    }
  });
});
