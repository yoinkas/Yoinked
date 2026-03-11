const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  const api = window.BoxLadderContent;
  if (!api) {
    return;
  }

  const recentPostsEl = document.getElementById("recent-posts");
  if (recentPostsEl) {
    const posts = api.getPublishedPosts().slice(0, 3);
    recentPostsEl.innerHTML = posts.length
      ? posts.map((post) => api.renderPostCard(post, { basePath: "posts/" })).join("")
      : `<p class="empty-state">No published posts yet. Open the admin panel and publish your first writeup.</p>`;
  }

  const allPostsEl = document.getElementById("all-posts");
  if (allPostsEl) {
    const posts = api.getPublishedPosts();
    allPostsEl.innerHTML = posts.length
      ? posts.map((post) => api.renderPostCard(post, { basePath: "" })).join("")
      : `<p class="empty-state">No published posts yet. Use the admin panel to create and publish one.</p>`;
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
          <p class="lede">Return to the writeups index or publish the post from the admin panel.</p>
          <a class="btn" href="index.html">Back to writeups</a>
        </article>
      `;
      return;
    }

    postViewEl.innerHTML = api.renderPostPage(post);
    document.title = `${post.title} | Box & Ladder`;
  }
});
