document.addEventListener("DOMContentLoaded", () => {
  const terminalScore = document.querySelector("[data-score-terminal]");
  const terminalScoreDetail = document.querySelector("[data-score-terminal-detail]");
  const quizScore = document.querySelector("[data-score-quiz]");
  const quizScoreDetail = document.querySelector("[data-score-quiz-detail]");
  const matchScore = document.querySelector("[data-score-match]");
  const matchScoreDetail = document.querySelector("[data-score-match-detail]");
  const quizRoot = document.querySelector("[data-quiz-root]");
  const matchGame = document.querySelector("[data-match-game]");
  const termsRoot = document.querySelector("[data-match-terms]");
  const definitionsRoot = document.querySelector("[data-match-definitions]");
  const matchStatus = document.querySelector("[data-match-status]");
  const resetButton = document.querySelector("[data-match-reset]");
  let selectedTerm = null;
  const quizQuestions = [
    {
      id: "quiz-1",
      question: "What command shows your current working directory?",
      answer: "pwd",
      choices: ["pwd", "ls", "cd", "cat"],
    },
    {
      id: "quiz-2",
      question: "What is the main security problem with FTP?",
      answer: "It sends credentials and traffic in plaintext.",
      choices: [
        "It only works on Linux.",
        "It sends credentials and traffic in plaintext.",
        "It blocks file downloads by default.",
        "It always requires multi-factor authentication.",
      ],
    },
    {
      id: "quiz-3",
      question: "Which command is commonly used to list files in a Linux directory?",
      answer: "ls",
      choices: ["pwd", "ls", "mv", "whoami"],
    },
    {
      id: "quiz-4",
      question: "Why is a password like password123 weak?",
      answer: "It is common, predictable, and easy to guess with a dictionary attack.",
      choices: [
        "It is too long to remember.",
        "It is common, predictable, and easy to guess with a dictionary attack.",
        "It only works on one website.",
        "It cannot be typed on mobile.",
      ],
    },
  ];
  const quizAnswers = new Map();
  const matchPairs = [
    {
      id: "directory",
      term: "Directory",
      definition: "A folder used to organize files.",
    },
    {
      id: "ftp",
      term: "FTP",
      definition: "A file transfer protocol that is insecure because it does not encrypt traffic by default.",
    },
    {
      id: "packet-capture",
      term: "Packet Capture",
      definition: "A recorded set of network traffic that can be reviewed in tools like Wireshark.",
    },
    {
      id: "brute-force",
      term: "Brute Force",
      definition: "A method of trying many passwords or values until one works.",
    },
    {
      id: "web-shell",
      term: "Web Shell",
      definition: "A malicious script uploaded to a web server to execute commands remotely.",
    },
    {
      id: "privilege-escalation",
      term: "Privilege Escalation",
      definition: "The act of gaining higher-level permissions after initial access.",
    },
  ];

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function updateTerminalScore(current = 0, total = 15) {
    if (terminalScore) {
      terminalScore.textContent = `${current}/${total}`;
    }

    if (terminalScoreDetail) {
      terminalScoreDetail.textContent = `${current}/${total} complete`;
    }
  }

  function updateQuizScore() {
    const total = quizQuestions.length;
    let current = 0;

    quizQuestions.forEach((question) => {
      if (quizAnswers.get(question.id) === question.answer) {
        current += 1;
      }
    });

    if (quizScore) {
      quizScore.textContent = `${current}/${total}`;
    }

    if (quizScoreDetail) {
      quizScoreDetail.textContent = `${current}/${total} correct`;
    }
  }

  function updateMatchStatus() {
    if (!matchGame || !matchStatus) {
      return;
    }

    const totalMatches = matchPairs.length;
    const currentMatches = definitionsRoot?.querySelectorAll(".page-101-definition-slot.is-complete").length ?? 0;
    matchStatus.textContent = `${currentMatches} of ${totalMatches} matched.`;

    if (matchScore) {
      matchScore.textContent = `${currentMatches}/${totalMatches}`;
    }

    if (matchScoreDetail) {
      matchScoreDetail.textContent = `${currentMatches}/${totalMatches} matched`;
    }

    if (currentMatches === totalMatches) {
      matchStatus.textContent = "All 6 matched. Board cleared.";
    }
  }

  function buildQuizCards() {
    if (!quizRoot) {
      return;
    }

    quizRoot.innerHTML = "";

    quizQuestions.forEach((question, index) => {
      const card = document.createElement("article");
      card.className = "page-101-quiz-card";
      card.innerHTML = `
        <div class="page-101-quiz-card-header">
          <p class="eyebrow">Quiz ${index + 1}</p>
          <h3>${question.question}</h3>
        </div>
        <div class="page-101-quiz-options" data-quiz-options></div>
        <p class="page-101-quiz-feedback" data-quiz-feedback>Select an answer.</p>
      `;

      const optionsRoot = card.querySelector("[data-quiz-options]");
      const feedback = card.querySelector("[data-quiz-feedback]");

      question.choices.forEach((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "page-101-quiz-option";
        button.textContent = choice;
        button.addEventListener("click", () => {
          quizAnswers.set(question.id, choice);
          card.querySelectorAll(".page-101-quiz-option").forEach((option) => {
            option.classList.remove("is-selected", "is-correct", "is-wrong");
          });

          button.classList.add("is-selected");

          if (choice === question.answer) {
            button.classList.add("is-correct");
            feedback.textContent = "Correct.";
            feedback.className = "page-101-quiz-feedback is-correct";
          } else {
            button.classList.add("is-wrong");
            feedback.textContent = "Not quite. Try again.";
            feedback.className = "page-101-quiz-feedback is-wrong";
          }

          updateQuizScore();
        });

        optionsRoot?.appendChild(button);
      });

      quizRoot.appendChild(card);
    });

    updateQuizScore();
  }

  function wireDragEvents(termChip) {
    termChip.addEventListener("dragstart", () => {
      termChip.classList.add("is-dragging");
    });

    termChip.addEventListener("dragend", () => {
      termChip.classList.remove("is-dragging");
    });

    termChip.addEventListener("click", () => {
      if (termChip.classList.contains("is-locked")) {
        return;
      }

      document.querySelectorAll(".page-101-term-chip.is-selected").forEach((chip) => {
        chip.classList.remove("is-selected");
      });

      if (selectedTerm === termChip) {
        selectedTerm = null;
        return;
      }

      selectedTerm = termChip;
      termChip.classList.add("is-selected");
    });
  }

  function clearSelectedTerm() {
    selectedTerm?.classList.remove("is-selected");
    selectedTerm = null;
  }

  function lockMatch(slot, dropzone, termChip) {
    slot.classList.add("is-complete");
    dropzone.innerHTML = "";
    termChip.draggable = false;
    termChip.classList.remove("is-selected");
    termChip.classList.add("is-locked");
    dropzone.appendChild(termChip);
    clearSelectedTerm();
    updateMatchStatus();
  }

  function flashWrong(slot) {
    slot.classList.add("is-wrong");
    window.setTimeout(() => slot.classList.remove("is-wrong"), 500);
  }

  function buildMatchGame() {
    if (!matchGame || !termsRoot || !definitionsRoot) {
      return;
    }

    const shuffledTerms = shuffle(matchPairs);
    const shuffledDefinitions = shuffle(matchPairs);
    clearSelectedTerm();

    termsRoot.innerHTML = "";
    definitionsRoot.innerHTML = "";

    shuffledTerms.forEach((pair) => {
      const termButton = document.createElement("button");
      termButton.type = "button";
      termButton.className = "page-101-term-chip";
      termButton.draggable = true;
      termButton.dataset.matchId = pair.id;
      termButton.textContent = pair.term;
      wireDragEvents(termButton);
      termsRoot.appendChild(termButton);
    });

    shuffledDefinitions.forEach((pair) => {
      const slot = document.createElement("article");
      slot.className = "page-101-definition-slot";
      slot.dataset.matchId = pair.id;
      slot.innerHTML = `
        <div class="page-101-definition-dropzone" data-dropzone>
          <span>Drop the matching term here</span>
        </div>
        <p>${pair.definition}</p>
      `;

      const dropzone = slot.querySelector("[data-dropzone]");
      dropzone?.addEventListener("dragover", (event) => {
        if (slot.classList.contains("is-complete")) {
          return;
        }

        event.preventDefault();
        slot.classList.add("is-hover");
      });

      dropzone?.addEventListener("dragleave", () => {
        slot.classList.remove("is-hover");
      });

      dropzone?.addEventListener("drop", (event) => {
        event.preventDefault();
        slot.classList.remove("is-hover");

        if (slot.classList.contains("is-complete")) {
          return;
        }

        const draggingTerm = document.querySelector(".page-101-term-chip.is-dragging");
        if (!draggingTerm) {
          return;
        }

        if (draggingTerm.dataset.matchId !== slot.dataset.matchId) {
          flashWrong(slot);
          return;
        }

        lockMatch(slot, dropzone, draggingTerm);
      });

      dropzone?.addEventListener("click", () => {
        if (!selectedTerm || slot.classList.contains("is-complete")) {
          return;
        }

        if (selectedTerm.dataset.matchId !== slot.dataset.matchId) {
          flashWrong(slot);
          return;
        }

        lockMatch(slot, dropzone, selectedTerm);
      });

      definitionsRoot.appendChild(slot);
    });

    updateMatchStatus();
  }

  resetButton?.addEventListener("click", buildMatchGame);
  buildQuizCards();
  buildMatchGame();

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
        "readme.txt": "Welcome to 101. Use the terminal to explore the fake filesystem and recover the training flags.",
        missions: {
          "briefing.txt": "Mission briefing: a careless operator scattered flags across the system. Read files, follow clues, and do not skip basic recon.",
          "clue.log": "Clue: the first flag is sitting in plain sight. The second one is somewhere in Downloads. The last one is hidden, so your usual ls output will not be enough.",
          "first-flag.txt": "FLAG{dir_hunter_101}",
        },
        Downloads: {
          "packet-copy.pcap": "Dummy capture file for practice.",
          "notes.txt": "Reminder: incoming.flag matters. Hidden files matter too.",
          "incoming.flag": "FLAG{download_received}",
          ".secret": "FLAG{hidden_file_found}",
        },
        vault: {
          "flag-report.txt": "Mission complete. You recovered every flag and practiced pwd, ls, cd, cat, and find like a proper beginner operator.",
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
      label: "Use whoami to identify the current user.",
      hint: "There is a command that prints the logged-in username.",
      complete: (ctx) => ctx.command === "whoami" && ctx.cwd === "/home/student",
    },
    {
      label: "Move into the missions directory.",
      hint: "Use cd followed by the directory name you want to enter.",
      complete: (ctx) => ctx.command === "cd missions" && ctx.cwd === "/home/student/missions",
    },
    {
      label: "Read briefing.txt.",
      hint: "Use cat to print the mission file.",
      complete: (ctx) => ctx.command === "cat briefing.txt",
    },
    {
      label: "List the files in missions with ls.",
      hint: "There is more than one file in this directory. Check the full list.",
      complete: (ctx) => ctx.command === "ls" && ctx.cwd === "/home/student/missions",
    },
    {
      label: "Find the first flag in first-flag.txt.",
      hint: "There is another text file in this directory that contains your first flag.",
      complete: (ctx) => ctx.command === "cat first-flag.txt",
    },
    {
      label: "Use cd .. to move back one directory.",
      hint: "Two dots mean one level up.",
      complete: (ctx) => ctx.command === "cd .." && ctx.cwd === "/home/student",
    },
    {
      label: "Search for incoming.flag with find.",
      hint: "Use find from your current location and search by exact file name.",
      complete: (ctx) => ctx.command === "find . -name incoming.flag" && ctx.cwd === "/home/student",
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
    {
      label: "Move into vault.",
      hint: "Leave Downloads and enter the final directory waiting in your home folder.",
      complete: (ctx) => ctx.command === "cd ../vault" && ctx.cwd === "/home/student/vault",
    },
    {
      label: "Read flag-report.txt to close the mission.",
      hint: "There is one final text file in vault.",
      complete: (ctx) => ctx.command === "cat flag-report.txt",
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
    updateTerminalScore(completedTasks.size, tasks.length);
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

  function walkFind(node, currentPath, matcher, results) {
    Object.entries(node).forEach(([name, value]) => {
      const nextPath = `${currentPath}/${name}`;
      if (matcher(name)) {
        results.push(nextPath);
      }

      if (isDirectory(value)) {
        walkFind(value, nextPath, matcher, results);
      }
    });
  }

  function handleFind(args) {
    const searchRoot = args[0];
    const flag = args[1];
    const pattern = args[2];

    if (!searchRoot || flag !== "-name" || !pattern) {
      printLine("find usage: find <path> -name <filename>", "error");
      return;
    }

    const rootPath = resolvePath(searchRoot);
    const rootNode = getNode(rootPath);
    if (!isDirectory(rootNode)) {
      printLine(`find: ${searchRoot}: no such directory`, "error");
      return;
    }

    const results = [];
    walkFind(rootNode, pathString(rootPath), (name) => name === pattern, results);
    printLine(results.length ? results.join("\n") : "find: no matches");
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
        printLine("Available commands: pwd, whoami, ls, ls -la, cd, cat, find, clear, help");
        break;
      case "whoami":
        printLine("student");
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
      case "find":
        handleFind(args);
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

  printLine("Welcome to the 101 starter terminal.", "success");
  printLine("Objective: recover three training flags from the fake filesystem and finish the report in vault.");
  printLine("Use basic recon first. Type help if you want the list of available commands.");

  updatePrompt();
  renderTasks();
  renderFlags();
  updateTerminalScore(completedTasks.size, tasks.length);
  input.focus();
});
