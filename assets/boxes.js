(() => {
  const boxMetadata = {
    "Jackpot": { platform: "thm", difficulty: "medium", os: "linux" },
    "Tony the Tiger": { platform: "thm", difficulty: "easy", os: "linux" },
    "Gallery": { platform: "thm", difficulty: "easy", os: "linux" },
    "h4cked": { platform: "thm", difficulty: "easy", os: "linux" },
    "Opacity": { platform: "thm", difficulty: "easy", os: "linux" },
    "Pyrat": { platform: "thm", difficulty: "easy", os: "linux" },
    "Lian_Yu": { platform: "thm", difficulty: "easy", os: "linux" },
    "Operation End-Game": { platform: "thm", difficulty: "hard", os: "windows" },
    "B3dr0ck": { platform: "thm", difficulty: "easy", os: "linux" },
    "THE GUESTBOOK": { platform: "thm", difficulty: "unknown", os: "other" },
    "Airplane": { platform: "thm", difficulty: "medium", os: "linux" },
  };

  const generatedBoxes = [
    {
      name: "Airplane",
      platform: "TryHackMe",
      href: "posts/airplane.html",
      cover: "assets/airplane.svg",
      coverAlt: "Airplane writeup cover",
      description: "A medium Linux walkthrough covering LFI, process enumeration, GDB command execution, and privilege escalation.",
    },
  ];

  function renderHackingCard(box) {
    const article = document.createElement("article");
    article.className = "card hacking-note-card hacking-feature-card";
    article.innerHTML = `
      <p class="eyebrow">${box.platform} Write-Up</p>
      <h3></h3>
      <img class="hacking-feature-image" alt="" />
      <p></p>
      <a class="btn">Open Write-Up</a>
    `;
    article.querySelector("h3").textContent = box.name;
    const image = article.querySelector("img");
    image.src = box.cover;
    image.alt = box.coverAlt || `${box.name} writeup cover`;
    article.querySelector("p:not(.eyebrow)").textContent = box.description;
    article.querySelector("a").href = box.href;
    return article;
  }

  const grid = document.getElementById("shared-box-cards");
  if (!grid) return;
  generatedBoxes.forEach((box) => grid.appendChild(renderHackingCard(box)));

  const cards = Array.from(grid.querySelectorAll(".hacking-feature-card"));
  cards.forEach((card) => {
    const title = card.querySelector("h3")?.textContent.trim() || "";
    const metadata = boxMetadata[title] || { platform: "other", difficulty: "unknown", os: "other" };
    Object.assign(card.dataset, metadata);
  });

  const platformFilter = document.getElementById("box-platform-filter");
  const difficultyFilter = document.getElementById("box-difficulty-filter");
  const osFilter = document.getElementById("box-os-filter");
  const nameFilter = document.getElementById("box-name-filter");
  const resetButton = document.getElementById("box-filter-reset");
  const count = document.getElementById("box-filter-count");
  const empty = document.getElementById("box-filter-empty");
  const DEFAULT_LIMIT = 12;
  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  const rotation = Math.floor(Date.now() / FOUR_DAYS_MS);

  function rotationScore(card) {
    const title = card.querySelector("h3")?.textContent.trim() || "";
    let hash = rotation | 0;
    for (let index = 0; index < title.length; index += 1) hash = Math.imul(hash ^ title.charCodeAt(index), 16777619);
    return hash >>> 0;
  }
  const rotatingCards = cards.slice().sort((left, right) => rotationScore(left) - rotationScore(right));

  function applyFilters() {
    const filters = {
      platform: platformFilter?.value || "all",
      difficulty: difficultyFilter?.value || "all",
      os: osFilter?.value || "all",
    };
    const query = nameFilter?.value.trim().toLowerCase() || "";
    const isBrowsing = query || Object.values(filters).some((value) => value !== "all");
    const allowedByRotation = new Set(rotatingCards.slice(0, DEFAULT_LIMIT));
    let visible = 0;
    cards.forEach((card) => {
      const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
      const matchesMetadata = Object.entries(filters).every(([key, value]) => value === "all" || card.dataset[key] === value);
      const matchesSearch = !query || title.includes(query);
      const matchesRotation = isBrowsing || allowedByRotation.has(card);
      const matches = matchesMetadata && matchesSearch && matchesRotation;
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    if (count) count.textContent = isBrowsing
      ? `Showing ${visible} matching ${visible === 1 ? "box" : "boxes"}`
      : `Featured rotation: ${visible} of ${cards.length} boxes`;
    if (empty) empty.hidden = visible !== 0;
  }

  [platformFilter, difficultyFilter, osFilter].forEach((select) => select?.addEventListener("change", applyFilters));
  nameFilter?.addEventListener("input", applyFilters);
  resetButton?.addEventListener("click", () => {
    [platformFilter, difficultyFilter, osFilter].forEach((select) => { if (select) select.value = "all"; });
    if (nameFilter) nameFilter.value = "";
    applyFilters();
  });
  applyFilters();
  window.YoinkedBoxes = { metadata: boxMetadata, generated: generatedBoxes };
})();
