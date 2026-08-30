const fs = require("fs");
const path = require("path");
const {
  PORTFOLIO_COOKIE_NAME,
  buildSessionCookie,
  createSessionToken,
  parseCookies,
  verifyPin,
  verifySessionToken,
} = require("../lib/portfolio-auth");

const portfolioTemplatePath = path.join(process.cwd(), "templates", "portfolio.html");

function sendHtml(response, html, statusCode = 200) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.end(html);
}

function sendJson(response, body, statusCode = 200) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function renderLockedPage(error = "") {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Portfolio Access | Yoinked by Yoinkas</title>
  <meta name="description" content="Locked portfolio access for Yoinked by Yoinkas." />
  <link rel="stylesheet" href="/assets/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
</head>
<body class="page-portfolio">
  <header class="site-header">
    <div class="container">
      <a class="logo" href="/index.html">Yoinked by Yoinkas</a>
      <nav class="nav">
        <a href="/index.html">Home</a>
        <a href="/cybersecurity.html">CyberSecurity</a>
        <a href="/hacking.html">Hacking</a>
        <a href="/101.html">101</a>
        <a class="nav-current" href="/portfolio">Portfolio</a>
        <a href="/index.html#about">About</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="portfolio-lock-hero" aria-labelledby="portfolio-title">
      <div class="container portfolio-lock-grid">
        <article class="portfolio-lock-panel">
          <p class="eyebrow">Access Layer</p>
          <h1 id="portfolio-title">Portfolio is locked.</h1>
          <p class="lede">Enter the 64-bit ping to unlock the portfolio blueprint.</p>

          <form class="portfolio-lock-form" id="portfolioLockForm">
            <label for="portfolio-ping">64-bit ping</label>
            <div class="portfolio-lock-row">
              <input id="portfolio-ping" name="pin" type="text" inputmode="text" placeholder="0000000000000000" maxlength="16" autocomplete="off" required />
              <button class="btn" type="submit">Unlock</button>
            </div>
            <p class="portfolio-lock-status" id="portfolioLockStatus">${error}</p>
          </form>
        </article>

        <aside class="portfolio-blueprint-card" aria-label="Portfolio blueprint">
          <div class="portfolio-code-window">
            <span>const portfolio = {</span>
            <span>  route: "/portfolio",</span>
            <span>  status: "locked",</span>
            <span>  auth: "64_bit_ping"</span>
            <span>};</span>
          </div>
        </aside>
      </div>
    </section>
  </main>

  <script>
    const form = document.getElementById("portfolioLockForm");
    const statusEl = document.getElementById("portfolioLockStatus");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      statusEl.textContent = "Checking ping...";

      const body = JSON.stringify({ pin: form.pin.value });
      const result = await fetch("/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => null);

      if (result && result.ok) {
        window.location.reload();
        return;
      }

      statusEl.textContent = "Access denied.";
    });
  </script>
</body>
</html>`;
}

module.exports = async function handler(request, response) {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[PORTFOLIO_COOKIE_NAME];

  if (request.method === "POST") {
    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    if (!verifyPin(body.pin)) {
      sendJson(response, { error: "Access denied." }, 401);
      return;
    }

    response.setHeader("Set-Cookie", buildSessionCookie(createSessionToken()));
    sendJson(response, { ok: true });
    return;
  }

  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET, POST");
    response.end("Method Not Allowed");
    return;
  }

  if (!verifySessionToken(token)) {
    sendHtml(response, renderLockedPage());
    return;
  }

  const html = fs.readFileSync(portfolioTemplatePath, "utf8");
  sendHtml(response, html);
};
