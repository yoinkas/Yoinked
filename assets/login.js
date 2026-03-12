document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const statusEl = document.getElementById("login-status");
  if (!form || !statusEl) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get("next") || "/admin";

  function setStatus(message) {
    statusEl.textContent = message;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Signing in...");

    const password = form.elements.password.value;
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      form.reset();
      setStatus(payload.error || "Sign in failed.");
      return;
    }

    window.location.assign(nextPath);
  });
});

