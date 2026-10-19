(() => {
  // Add every new box here once. Both hacking.html and boxes.html render this list.
  const boxes = [
    {
      name: "Airplane",
      platform: "TryHackMe",
      href: "posts/airplane.html",
      cover: "assets/airplane.svg",
      coverAlt: "Airplane writeup cover",
      description: "A complete medium-difficulty Linux walkthrough with the original screenshots, videos, and embedded references preserved.",
      path: "LFI, process enumeration, GDB command execution, sudo find",
      tags: ["tryhackme", "lfi", "command-execution", "gdb", "privilege-escalation", "linux"],
      status: "done",
    },
  ];

  function renderHackingCard(box) {
    const article = document.createElement("article");
    article.className = "card hacking-note-card hacking-feature-card";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = `${box.platform} Write-Up`;

    const title = document.createElement("h3");
    title.textContent = box.name;

    const image = document.createElement("img");
    image.className = "hacking-feature-image";
    image.src = box.cover;
    image.alt = box.coverAlt || `${box.name} writeup cover`;

    const description = document.createElement("p");
    description.textContent = box.description;

    const link = document.createElement("a");
    link.className = "btn";
    link.href = box.href;
    link.textContent = "Open Write-Up";

    article.append(eyebrow, title, image, description, link);
    return article;
  }

  function renderDirectoryRow(box) {
    const row = document.createElement("tr");
    row.dataset.tags = box.tags.join(" ");

    const iconCell = document.createElement("td");
    const iconLink = document.createElement("a");
    iconLink.className = "dir-icon folder-icon";
    iconLink.href = box.href;
    iconLink.setAttribute("aria-label", `Open ${box.name} writeup`);
    iconCell.appendChild(iconLink);

    const nameCell = document.createElement("td");
    const nameLink = document.createElement("a");
    nameLink.href = box.href;
    nameLink.textContent = `${box.name}/`;
    nameCell.appendChild(nameLink);

    const platformCell = document.createElement("td");
    platformCell.textContent = box.platform;

    const pathCell = document.createElement("td");
    pathCell.textContent = box.path;

    const statusCell = document.createElement("td");
    statusCell.className = "directory-size";
    statusCell.textContent = box.status;

    row.append(iconCell, nameCell, platformCell, pathCell, statusCell);
    return row;
  }

  const hackingGrid = document.getElementById("shared-box-cards");
  if (hackingGrid) {
    boxes.forEach((box) => hackingGrid.appendChild(renderHackingCard(box)));
  }

  const directoryBody = document.getElementById("boxTableBody");
  if (directoryBody) {
    boxes.forEach((box) => directoryBody.appendChild(renderDirectoryRow(box)));
  }

  window.YoinkedBoxes = boxes;
})();
