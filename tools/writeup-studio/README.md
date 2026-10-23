# Writeup Studio

A local-first, block-based editor for Hack The Box / TryHackMe / self-hosted lab
writeups. Everything runs in the browser — no build step, no accounts, no cloud.

```bash
npm install
npm run serve        # http://localhost:3000
npm test             # functional smoke tests (jsdom)
```

Set `PORT` to run a second instance: `PORT=3100 npm run serve`.

---

## What's in the box

### Editor
- **Block model** — text, H1–H4, bullet/numbered lists, to-dos, quotes, callouts
  (info / success / warning / danger / tip), code, image, video, embed, link,
  divider and an "HTB / THM box info" card.
- **Slash commands** — type `/` to insert any block.
- **Markdown shortcuts** — `# `, `- `, `1. `, `> `, `[] `, `---` convert as you type.
- **Drag to reorder**, a per-block control rail (grip / add / delete), and inline
  formatting toolbar (bold, italic, underline, strike, code, link, colours).
- **Code blocks** with language cycling, terminal ⇄ code view, copy button and
  eight themes (term, minimal, vscode, github, light, paper, neon, mono).
- **Smart drag & drop** — grab a block by its grip and move it up or down. Push the
  pointer into the top or bottom band of the editor and the page scrolls itself,
  faster the closer you get to the edge; in the middle it simply waits until you
  move up or down again.
- Every block (code blocks included) has a rail in the left gutter: grip, **+** to
  add a block, and a trash to delete it. Code blocks also carry their own
  palette / copy / wipe / delete buttons in the header.
- **Drag & drop** images/videos onto the page, or paste a screenshot straight
  from the clipboard (`pasteimg.js`). Uploads are downscaled automatically so
  they don't blow the storage quota.

### Navigation
- **Outline panel** — live table of contents built from your headings, with
  scroll-spy highlighting. `Ctrl+Shift+O`.
- **Command palette / search** — `Ctrl+K` searches titles, box names, body
  content and AI technique tags.
- **AI tagging** — a local Ollama instance extracts vulnerabilities, tools,
  techniques, services, CVEs and a one-line summary. Tags show up in the
  sidebar and can be used as filters.

### Organisation
- Pin writeups, sort by updated / created / title / platform.
- Per-note menu: rename, duplicate, pin, export Markdown / HTML, delete.
- Relative timestamps and word counts in the sidebar.
- Last-open writeup is restored on reload.

### Tips
- Insert a tip anywhere with the `/tip` command — the popup opens straight
  into the editor so you can write it immediately.
- **Select any text and hit `Add tip`** — a floating bubble appears next to your
  selection; clicking it inserts a tip block right below that block, with the
  selected text as the tip's title, and opens the popup in edit mode. Your
  original text is never modified.
- A tip renders as a highlighted marker in the document — the accent bar makes
  it obvious where your notes are, without cluttering the page.
- **Click the marker and a popup dialog appears** with the tip's note, so the
  page itself stays clean. No side panel is involved.
- The popup has an **Edit** mode (title + body) and a **Delete tip** button, and
  lists the other tips in the writeup as chips so you can jump between them.
- The 💡 button in the top bar opens a browser listing every tip in the writeup.
- The `/tip` command is non-destructive too: on an empty block it becomes the tip,
  otherwise the tip is inserted after it.
- Tips are stored on the writeup and included in the HTML export.

### Power features
- **Command palette** — `Ctrl+P` runs any app action (new, rename, duplicate, pin,
  delete, import, export, print, outline, tips, theme, focus, width, sort, search).
- **Mermaid diagrams** — `/mermaid` renders flowcharts, attack paths and network
  graphs straight in the page. Edit the syntax inline, the diagram redraws.
- **Image lightbox** — click any image for a full-size view with zoom and
  previous/next navigation through the writeup.
- **User tags** — `/tag` labels a writeup; tags show on the card, aggregate in a
  sidebar bar, and filter the list when clicked.
- **Checklist block** — `/checklist` collects every to-do in the writeup with a
  progress bar.
- **Snippets** — type `;nmap` (or your own) to expand a full command. Edit them
  in localStorage under `writeup_snippets`.
- **Block move / duplicate** — `Alt+Shift+↑` / `Alt+Shift+↓` move the focused
  block, `Alt+Shift+D` duplicates it.
- **Smart token highlighting** — CVEs, IP addresses, CTF flags and hashes are
  highlighted automatically. Click a CVE to open the NVD entry, click anything
  else to copy it.
- **Code line numbers** — the `≡` button in a code header toggles a line-number
  gutter; the setting is saved per block.
- **Stopwatch** — `/timer` times how long a step took, and the elapsed time is
  stored with the writeup.

### Output
- **Standalone HTML** export with a generated table of contents.
- **Markdown** export.
- **JSON** backup of every writeup.
- **Print / Save as PDF** via a dedicated print stylesheet.
- **Disk sync** — the active writeup is mirrored to `writeups/*.json` through
  the bundled Express server, and writeups written elsewhere are merged back in.

### Interface
- Dark and light themes (`Ctrl+Shift+L`).
- Focus mode (`Ctrl+Shift+F`) — hides all chrome.
- Editor width presets: narrow, comfortable, wide, full.
- Reading-progress bar, reading time, live word/character/block counters.
- Fully responsive down to phone width.
- Print stylesheet, reduced-motion support, keyboard accessible.

---

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| New writeup | `Ctrl` `N` |
| Search everything | `Ctrl` `K` |
| Save now | `Ctrl` `S` |
| Export Markdown | `Ctrl` `E` |
| Print / PDF | `Ctrl` `P` |
| Bold / italic / underline | `Ctrl` `B` / `I` / `U` |
| Toggle outline | `Ctrl` `Shift` `O` |
| Focus mode | `Ctrl` `Shift` `F` |
| Cycle theme | `Ctrl` `Shift` `L` |
| Toggle sidebar | `Ctrl` `Shift` `S` |
| Shortcut help | `Ctrl` `/` |
| Insert block | `/` |

---

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell |
| `styles.css` | Design system (tokens, layout, components, print) |
| `app.js` | Editor core — blocks, persistence, export/import, `window.WriteUp` API |
| `ui.js` | Theme, outline, focus mode, menus, shortcuts, deep links |
| `ai.js` | Ollama-powered tagging |
| `ollama.js` | Minimal Ollama REST client |
| `search.js` | `Ctrl+K` command palette |
| `codeblocks.js` | Code-block themes + wipe button |
| `editfix.js` | Block delete affordance fallback |
| `mediaupload.js` | File picker + drag & drop + image compression |
| `pasteimg.js` | Paste a screenshot into the document |
| `backend-sync.js` | Mirror writeups to the local server and merge them back |
| `storage.js` | IndexedDB store (used for media blobs) |
| `server.js` | Express server: static files + `/api/writeups` |
| `dev/` | Development helpers (seed data, layout probe) |
| `tools/` | Screenshot helper used during development |

## Extend it

`app.js` exposes a small public API on `window.WriteUp` so add-ons never have
to patch the editor internals:

```js
WriteUp.getNotes()          // array of writeups
WriteUp.getCurrent()         // the open writeup
WriteUp.openNote(id)         // switch writeups
WriteUp.render()             // re-render the editor
WriteUp.renderNotes()        // re-render the sidebar
WriteUp.persist()            // flush to storage
WriteUp.renameNote(id, title)
WriteUp.duplicateNote(id)
WriteUp.togglePin(id)
WriteUp.deleteNote(id)
WriteUp.mergeNotes(list)     // import / sync
WriteUp.exportHTML() / exportMD() / printNote()
```
