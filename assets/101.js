document.addEventListener("DOMContentLoaded", () => {
  const shell = document.querySelector("[data-terminal-shell]");
  if (!shell) {
    return;
  }

  const output = shell.querySelector("[data-terminal-output]");
  const form = shell.querySelector("[data-terminal-form]");
  const input = shell.querySelector("[data-terminal-input]");
  const prompt = shell.querySelector("[data-terminal-prompt]");
  const hintButton = shell.querySelector("[data-terminal-hint]");
  const taskList = document.querySelector("[data-terminal-tasks]");
  const flagList = document.querySelector("[data-terminal-flags]");

  const fileSystem = {
    home: {
      student: {
        "readme.txt": "Welcome to 101. Use the terminal to explore the fake filesystem.",
        missions: {
          "welcome.txt": "Mission briefing: learn pwd, ls, cd, and cat before you move on.",
          "first-flag.txt": "FLAG{dir_hunter_101}",
        },
        Downloads: {
          "packet-copy.pcap": "Dummy capture file for practice.",
          "incoming.flag": "FLAG{download_received}",
          ".secret": "FLAG{hidden_file_found}",
        },
      },
    },
  };

  const tasks = [
    {
      label: "Use pwd to see where you are.",
      hint: "Try the command that prints your working directory.",
      complete: (ctx) => ctx.command === "pwd" && ctx.cwd === "/home/student",
    },
    {
      label: "Use ls to see what is available.",
      hint: "List the files in your current location before you move anywhere.",
      complete: (ctx) => ctx.command === "ls" && ctx.cwd === "/home/student",
    },
    {
      label: "Move into the missions directory.",
      hint: "Use cd followed by the directory name you want to enter.",
      complete: (ctx) => ctx.command === "cd missions" && ctx.cwd === "/home/student/missions",
    },
    {
      label: "Read welcome.txt.",
      hint: "Use cat to print the file contents.",
      complete: (ctx) => ctx.command === "cat welcome.txt",
    },
    {
      label: "Find the first flag in first-flag.txt.",
      hint: "There is another text file in this directory that contains your first flag.",
      complete: (ctx) => ctx.command === "cat first-flag.txt",
    },
    {
      label: "Question: what command takes you back one directory? Use it now.",
      hint: "Two dots mean one level up.",
      complete: (ctx) => ctx.command === "cd .." && ctx.cwd === "/home/student",
    },
    {
      label: "Move into Downloads.",
      hint: "Enter the Downloads directory from your current location.",
      complete: (ctx) => ctx.command === "cd Downloads" && ctx.cwd === "/home/student/Downloads",
    },
    {
      label: "Open incoming.flag and collect the second flag.",
      hint: "Use cat on the file named incoming.flag.",
      complete: (ctx) => ctx.command === "cat incoming.flag",
    },
    {
      label: "Use ls -la to reveal hidden files.",
      hint: "You need the flag that shows all files, including hidden ones.",
      complete: (ctx) => (ctx.command === "ls -la" || ctx.command === "ls -al") && ctx.cwd === "/home/student/Downloads",
    },
    {
      label: "Read .secret to collect the final flag.",
      hint: "Now that you can see hidden files, open the hidden one.",
      complete: (ctx) => ctx.command === "cat .secret",
    },
  ];

  let cwd = ["home", "student"];
  const foundFlags = new Set();
  const completedTasks = new Set();

  function pathString(parts = cwd) {
    return `/${parts.join("/")}`;
  }

  function getNode(parts = cwd) {
    let node = fileSystem;
    for (const part of parts) {
      node = node?.[part];
      if (!node) {
        return null;
      }
    }
    return node;
  }

  function isDirectory(node) {
    return node && typeof node === "object";
  }

  function printLine(text, type = "") {
    const line = document.createElement("p");
    line.className = `terminal-line${type ? ` ${type}` : ""}`;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function renderTasks() {
    if (!taskList) {
      return;
    }

    const activeIndex = tasks.findIndex((_, index) => !completedTasks.has(index));
    taskList.innerHTML = tasks
      .map((task, index) => {
        const classes = [
          completedTasks.has(index) ? "is-complete" : "",
          activeIndex === index ? "is-active" : "",
        ].filter(Boolean).join(" ");
        return `<li class="${classes}">${task.label}</li>`;
      })
      .join("");
  }

  function renderFlags() {
    if (!flagList) {
      return;
    }

    if (!foundFlags.size) {
      flagList.innerHTML = `<p class="page-101-empty">No flags collected yet.</p>`;
      return;
    }

    flagList.innerHTML = Array.from(foundFlags)
      .map((flag) => `<p class="page-101-flag-chip">${flag}</p>`)
      .join("");
  }

  function updatePrompt() {
    prompt.textContent = `student@yoinkas:${pathString()}$`;
  }

  function revealFlag(text) {
    const match = text.match(/FLAG\{[^}]+\}/g);
    if (!match) {
      return;
    }

    match.forEach((flag) => foundFlags.add(flag));
    renderFlags();
  }

  function completeTasks(commandText) {
    const context = {
      command: commandText.trim(),
      cwd: pathString(),
    };

    tasks.forEach((task, index) => {
      if (!completedTasks.has(index) && task.complete(context)) {
        completedTasks.add(index);
        printLine(`Task complete: ${task.label}`, "success");
      }
    });

    if (completedTasks.size === tasks.length) {
      printLine("Lab complete. You found every flag and finished the walkthrough.", "success");
    }

    renderTasks();
  }

  function resolvePath(target) {
    const base = target.startsWith("/") ? [] : [...cwd];
    const rawParts = target.split("/").filter(Boolean);
    const resolved = [...base];

    for (const part of rawParts) {
      if (part === ".") {
        continue;
      }

      if (part === "..") {
        resolved.pop();
        continue;
      }

      resolved.push(part);
    }

    return resolved;
  }

  function handleLs(args) {
    const node = getNode();
    if (!isDirectory(node)) {
      printLine("ls: current location is not a directory", "error");
      return;
    }

    const showHidden = args.includes("-la") || args.includes("-al");
    const entries = Object.keys(node).filter((name) => showHidden || !name.startsWith("."));
    printLine(entries.length ? entries.join("    ") : "(empty)");
  }

  function handleCd(args) {
    const target = args[0];
    if (!target) {
      cwd = ["home", "student"];
      updatePrompt();
      return;
    }

    const nextPath = resolvePath(target);
    const nextNode = getNode(nextPath);
    if (!isDirectory(nextNode)) {
      printLine(`cd: no such directory: ${target}`, "error");
      return;
    }

    cwd = nextPath;
    updatePrompt();
  }

  function handleCat(args) {
    const target = args[0];
    if (!target) {
      printLine("cat: missing file name", "error");
      return;
    }

    const nextPath = resolvePath(target);
    const fileName = nextPath[nextPath.length - 1];
    const parent = getNode(nextPath.slice(0, -1));
    const value = parent?.[fileName];

    if (typeof value !== "string") {
      printLine(`cat: ${target}: no such file`, "error");
      return;
    }

    printLine(value);
    revealFlag(value);
  }

  function showHint() {
    const nextTask = tasks.find((_, index) => !completedTasks.has(index));
    if (!nextTask) {
      printLine("Hint: You already cleared the whole lab.", "warning");
      return;
    }

    printLine(`Hint: ${nextTask.hint}`, "warning");
  }

  function runCommand(commandText) {
    const trimmed = commandText.trim();
    printLine(`${prompt.textContent} ${trimmed}`, "command");

    if (!trimmed) {
      return;
    }

    const [command, ...args] = trimmed.split(/\s+/);

    switch (command) {
      case "help":
        printLine("Available commands: pwd, ls, ls -la, cd, cat, clear, help");
        break;
      case "pwd":
        printLine(pathString());
        break;
      case "ls":
        handleLs(args);
        break;
      case "cd":
        handleCd(args);
        break;
      case "cat":
        handleCat(args);
        break;
      case "clear":
        output.innerHTML = "";
        break;
      default:
        printLine(`${command}: command not found`, "error");
        break;
    }

    completeTasks(trimmed);
  }

  hintButton?.addEventListener("click", showHint);

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const commandText = input.value;
    input.value = "";
    runCommand(commandText);
  });

  printLine("Welcome to the 101 terminal lab.", "success");
  printLine("Your mission is to explore this dummy filesystem, collect the flags, and answer the walkthrough question.");
  printLine("Type help if you want the list of available commands.");

  updatePrompt();
  renderTasks();
  renderFlags();
  input.focus();
});
