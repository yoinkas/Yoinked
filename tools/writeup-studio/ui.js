/* ui.js — shell chrome: theme, outline (TOC), focus mode, menus, shortcuts.
   Talks to app.js only through window.WriteUp. */
(function () {
  'use strict';

  var THEMES = ['dark', 'light'];
  var THEME_KEY = 'writeup_theme';
  var WIDTH_KEY = 'writeup_width';
  var WIDTHS = [
    { id: 'w-narrow', label: 'Narrow' },
    { id: 'w-default', label: 'Comfortable' },
    { id: 'w-wide', label: 'Wide' },
    { id: 'w-full', label: 'Full width' }
  ];
  var WIDTH_DEFAULT = 1;

  var el = {};
  function $(id) { return document.getElementById(id); }
  function on(id, ev, fn) { var n = $(id); if (n) n.addEventListener(ev, fn); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function toast(m) { if (window.WriteUp && window.WriteUp.toast) window.WriteUp.toast(m); else console.log('[ui]', m); }

  /* ---------------- theme ---------------- */
  function applyTheme(t) {
    if (THEMES.indexOf(t) < 0) t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    var btn = $('theme-btn'), lab = $('theme-label');
    if (lab) lab.textContent = t === 'light' ? 'Light' : 'Dark';
    if (btn) {
      var i = btn.querySelector('i');
      if (i) i.className = 'fa-solid ' + (t === 'light' ? 'fa-sun' : 'fa-moon');
    }
  }
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
  function cycleTheme() {
    var t = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(t);
    toast(t === 'light' ? 'Light theme' : 'Dark theme');
  }

  /* ---------------- editor width ---------------- */
  function applyWidth(idx) {
    if (idx < 0 || idx >= WIDTHS.length) idx = WIDTH_DEFAULT;
    var ed = $('editor');
    if (ed) {
      ed.className = 'editor-content';
      for (var i = 0; i < WIDTHS.length; i++) if (WIDTHS[i].id !== 'w-default') ed.classList.remove(WIDTHS[i].id);
      if (WIDTHS[idx].id !== 'w-default') ed.classList.add(WIDTHS[idx].id);
    }
    var lab = $('width-label');
    if (lab) lab.textContent = WIDTHS[idx].label;
    try { localStorage.setItem(WIDTH_KEY, String(idx)); } catch (e) {}
  }
  function currentWidth() {
    var v = 1;
    try { var s = localStorage.getItem(WIDTH_KEY); if (s !== null) v = parseInt(s, 10) || 1; } catch (e) {}
    return v;
  }
  function cycleWidth() {
    var next = (currentWidth() + 1) % WIDTHS.length;
    applyWidth(next);
    toast('Editor width: ' + WIDTHS[next].label);
  }

  /* ---------------- focus mode ---------------- */
  function toggleFocus(force) {
    var on = force !== undefined ? force : !document.body.classList.contains('focus-mode');
    document.body.classList.toggle('focus-mode', on);
    var lab = $('focus-btn');
    if (lab) {
      var i = lab.querySelector('i');
      if (i) i.className = 'fa-solid ' + (on ? 'fa-compress' : 'fa-expand');
      var s = lab.querySelector('span');
      if (s) s.textContent = on ? 'Exit focus mode' : 'Focus mode';
    }
    return on;
  }

  /* ---------------- outline (TOC) ---------------- */
  var tocOpen = false;
  var headings = [];

  function buildToc() {
    var list = $('toc-list');
    var ed = $('editor');
    if (!list || !ed) return;
    headings = [];
    var blocks = ed.querySelectorAll('.block');
    for (var i = 0; i < blocks.length; i++) {
      var t = blocks[i].getAttribute('data-type');
      if (t !== 'h1' && t !== 'h2' && t !== 'h3' && t !== 'h4') continue;
      var c = blocks[i].querySelector('.block-content');
      var label = (c && (c.innerText || c.textContent) || '').trim();
      if (!label) continue;
      headings.push({ id: blocks[i].getAttribute('data-id'), level: parseInt(t.slice(1), 10), label: label });
    }
    if (!headings.length) {
      list.innerHTML = '<div class="toc-empty">No headings yet.<br>Add an <b>H1</b>, <b>H2</b> or <b>H3</b> block to build the outline.</div>';
      return;
    }
    /* normalise: if the document has no H1, the shallowest heading becomes level 1 */
    var min = 9;
    for (var m = 0; m < headings.length; m++) if (headings[m].level < min) min = headings[m].level;
    var html = '';
    for (var j = 0; j < headings.length; j++) {
      var lvl = Math.max(1, headings[j].level - min + 1);
      html += '<a class="toc-item lvl-' + lvl + '" data-toc="' + esc(headings[j].id) + '">' + esc(headings[j].label) + '</a>';
    }
    list.innerHTML = html;
  }

  function toggleToc(force) {
    tocOpen = force !== undefined ? force : !tocOpen;
    var panel = $('toc-panel');
    if (panel) panel.classList.toggle('open', tocOpen);
    document.body.classList.toggle('toc-open', tocOpen);
    var btn = $('toc-toggle');
    if (btn) btn.classList.toggle('on', tocOpen);
    if (tocOpen) {
      buildToc();
      /* only one side panel at a time */
      if (window.WriteUpTips && window.WriteUpTips.close) window.WriteUpTips.close();
    }
  }

  function scrollToBlock(id) {
    var ed = $('editor');
    if (!ed) return;
    var blk = ed.querySelector('.block[data-id="' + id + '"]');
    if (!blk) return;
    blk.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var c = blk.querySelector('.block-content');
    if (c) {
      c.style.transition = 'background .6s';
      c.style.background = 'var(--accent-soft)';
      setTimeout(function () { c.style.background = ''; }, 700);
    }
  }

  function spyToc() {
    if (!tocOpen) return;
    var wrap = $('editor-wrap');
    if (!wrap) return;
    var top = wrap.getBoundingClientRect().top + 60;
    var active = -1;
    for (var i = 0; i < headings.length; i++) {
      var blk = $('editor').querySelector('.block[data-id="' + headings[i].id + '"]');
      if (!blk) continue;
      var r = blk.getBoundingClientRect();
      if (r.top <= top) active = i; else break;
    }
    var items = document.querySelectorAll('#toc-list .toc-item');
    for (var j = 0; j < items.length; j++) items[j].classList.toggle('active', j === active);
  }

  /* ---------------- reading progress ---------------- */
  function updateProgress() {
    var wrap = $('editor-wrap');
    var bar = $('read-progress');
    if (!wrap || !bar) return;
    var h = wrap.scrollHeight - wrap.clientHeight;
    var pct = h > 8 ? (wrap.scrollTop / h) * 100 : 0;
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  /* ---------------- note context menu ---------------- */
  var noteMenuEl = null;
  function closeNoteMenu() {
    if (noteMenuEl) { noteMenuEl.remove(); noteMenuEl = null; }
  }
  function noteMenu(anchor, noteId) {
    closeNoteMenu();
    var W = window.WriteUp;
    if (!W) return;
    var n = W.findNote ? W.findNote(noteId) : null;
    if (!n) return;
    var m = document.createElement('div');
    m.className = 'menu note-context-menu';
    m.innerHTML =
      '<div class="menu-label">' + esc(n.title || 'Untitled') + '</div>' +
      '<button class="menu-item" data-act="rename"><i class="fa-solid fa-pen"></i><span>Rename</span></button>' +
      '<button class="menu-item" data-act="duplicate"><i class="fa-solid fa-copy"></i><span>Duplicate</span></button>' +
      '<button class="menu-item" data-act="pin"><i class="fa-solid fa-thumbtack"></i><span>' + (n.pinned ? 'Unpin' : 'Pin to top') + '</span></button>' +
      '<div class="menu-sep"></div>' +
      '<button class="menu-item" data-act="md"><i class="fa-brands fa-markdown"></i><span>Export Markdown</span></button>' +
      '<button class="menu-item" data-act="html"><i class="fa-solid fa-globe"></i><span>Export HTML</span></button>' +
      '<div class="menu-sep"></div>' +
      '<button class="menu-item danger" data-act="delete"><i class="fa-solid fa-trash"></i><span>Delete</span></button>';
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var top = r.bottom + 6, left = r.right - 220;
    if (left < 8) left = 8;
    if (top + m.offsetHeight > window.innerHeight - 8) top = Math.max(8, window.innerHeight - m.offsetHeight - 8);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    m.style.position = 'fixed';
    noteMenuEl = m;

    m.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.menu-item') : null;
      if (!b) return;
      var act = b.getAttribute('data-act');
      closeNoteMenu();
      if (act === 'rename') {
        var t = prompt('Rename writeup:', n.title || '');
        if (t !== null && t.trim()) W.renameNote(noteId, t.trim());
      } else if (act === 'duplicate') W.duplicateNote(noteId);
      else if (act === 'pin') W.togglePin(noteId);
      else if (act === 'md') { W.openNote(noteId); setTimeout(function () { W.exportMD(); }, 60); }
      else if (act === 'html') { W.openNote(noteId); setTimeout(function () { W.exportHTML(); }, 60); }
      else if (act === 'delete') W.deleteNote(noteId);
    });
  }

  /* ---------------- overflow menu ---------------- */
  function bindMenu(btnId, menuId) {
    var b = $(btnId), m = $(menuId);
    if (!b || !m) return;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = m.classList.toggle('open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    m.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.menu-item')) {
        m.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- sidebar (mobile) ---------------- */
  function toggleSidebar(force) {
    var sb = $('sidebar');
    if (!sb) return;
    var open = force !== undefined ? force : !sb.classList.contains('open');
    sb.classList.toggle('open', open);
    document.body.classList.toggle('side-open', open);
  }

  /* ---------------- sort ---------------- */
  var SORTS = [
    { id: 'updated', label: 'Recently updated' },
    { id: 'created', label: 'Recently created' },
    { id: 'title', label: 'Title (A–Z)' },
    { id: 'platform', label: 'Platform' }
  ];
  function cycleSort() {
    var W = window.WriteUp;
    if (!W) return;
    var cur = W.getSort ? W.getSort() : 'updated';
    var i = 0;
    for (var k = 0; k < SORTS.length; k++) if (SORTS[k].id === cur) i = k;
    var next = SORTS[(i + 1) % SORTS.length];
    W.setSort(next.id);
    var b = $('sort-btn');
    if (b) b.title = 'Sorted by ' + next.label;
    toast('Sorted by ' + next.label);
  }

  /* ---------------- shortcuts ---------------- */
  function openShortcuts() {
    var m = $('shortcuts-modal');
    if (m) m.style.display = 'flex';
  }
  function closeShortcuts() {
    var m = $('shortcuts-modal');
    if (m) m.style.display = 'none';
  }

  /* ---------------- global keys ---------------- */
  function onKey(e) {
    var mod = e.ctrlKey || e.metaKey;
    var k = (e.key || '').toLowerCase();

    if (mod && e.shiftKey && k === 'o') { e.preventDefault(); toggleToc(); return; }
    if (mod && e.shiftKey && k === 'f') { e.preventDefault(); toggleFocus(); return; }
    if (mod && e.shiftKey && k === 'l') { e.preventDefault(); cycleTheme(); return; }
    if (mod && e.shiftKey && k === 's') { e.preventDefault(); toggleSidebar(); return; }
    if (mod && k === '/') { e.preventDefault(); openShortcuts(); return; }
    if (mod && k === 'n') { e.preventDefault(); if (window.WriteUp) { var b = $('new-note-btn'); if (b) b.click(); } return; }
    if (mod && k === 'e') {
      e.preventDefault();
      if (window.WriteUp) window.WriteUp.exportMD();
      return;
    }
    if (e.key === 'Escape') {
      closeNoteMenu();
      var mm = $('more-menu');
      if (mm) { mm.classList.remove('open'); }
      var sb = $('sidebar');
      if (sb && sb.classList.contains('open') && window.innerWidth <= 820) toggleSidebar(false);
    }
  }

  /* ---------------- deep links ---------------- */
  function applyHash() {
    var h = (location.hash || '').replace('#', '').toLowerCase();
    if (!h) return;
    if (h.indexOf('note=') === 0) {
      var id = h.slice(5);
      if (id && window.WriteUp) window.WriteUp.openNote(id);
      return;
    }
    if (h === 'toc' || h === 'outline') toggleToc(true);
    else if (h === 'focus') toggleFocus(true);
    else if (h === 'print') document.body.classList.add('printing');
    else if (h === 'search' && window.Search) window.Search.open();
    else if (h === 'shortcuts') openShortcuts();
    else if (h === 'new') { var b = $('new-note-btn'); if (b) b.click(); }
  }

  /* ---------------- boot ---------------- */
  function init() {
    el.editor = $('editor');

    /* theme */
    var t = 'dark';
    try { var s = localStorage.getItem(THEME_KEY); if (s) t = s; } catch (e) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches && !t) t = 'light';
    applyTheme(t);
    applyWidth(currentWidth());

    /* menus */
    bindMenu('more-btn', 'more-menu');

    on('theme-btn', 'click', cycleTheme);
    on('width-btn', 'click', cycleWidth);
    on('focus-btn', 'click', function () { toggleFocus(); });
    on('toc-btn', 'click', function () { toggleToc(); });
    on('toc-toggle', 'click', function () { toggleToc(); });
    on('toc-close', 'click', function () { toggleToc(false); });
    on('sort-btn', 'click', cycleSort);
    on('shortcuts-btn', 'click', openShortcuts);
    on('shortcuts-x', 'click', closeShortcuts);
    on('sidebar-toggle', 'click', function () { toggleSidebar(); });
    on('scrim', 'click', function () { toggleSidebar(false); });

    var sc = $('shortcuts-modal');
    if (sc) sc.addEventListener('mousedown', function (e) { if (e.target === sc) closeShortcuts(); });

    on('btn-pdf', 'click', function () {
      if (window.WriteUp) window.WriteUp.printNote();
    });
    on('btn-json', 'click', function () {
      try {
        var data = localStorage.getItem('writeup_notes_v4') || '[]';
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'writeup-backup.json';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
        toast('Backup downloaded');
      } catch (e) { toast('Backup failed'); }
    });
    on('btn-clear', 'click', function () {
      if (!confirm('This deletes every writeup stored in this browser. Continue?')) return;
      try {
        localStorage.removeItem('writeup_notes_v4');
        localStorage.removeItem('writeup_notes_active');
      } catch (e) {}
      location.reload();
    });
    on('btn-save-disk', 'click', function () {
      /* the host page may own this button (e.g. the Yoinked project sync) */
      if (window.WriteUpProject && window.WriteUpProject.save) { window.WriteUpProject.save(); return; }
      if (window.WriteUp) window.WriteUp.saveNow();
      toast('Saved');
    });

    /* TOC list clicks */
    var list = $('toc-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('.toc-item') : null;
        if (!a) return;
        scrollToBlock(a.getAttribute('data-toc'));
      });
    }

    /* rebuild outline when the document changes */
    var ed = $('editor');
    if (ed && window.MutationObserver) {
      var t = null;
      new MutationObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () {
          if (tocOpen) buildToc();
          /* refresh derived blocks (in-document table of contents, equations) */
          if (window.WriteUp && window.WriteUp.refreshDerived) {
            try { window.WriteUp.refreshDerived(); } catch (e) {}
          }
        }, 120);
      }).observe(ed, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-type', 'data-id'] });
    }

    /* progress + spy */
    var wrap = $('editor-wrap');
    if (wrap) {
      wrap.addEventListener('scroll', function () { updateProgress(); spyToc(); }, { passive: true });
      updateProgress();
    }

    /* dismiss popovers */
    document.addEventListener('mousedown', function (e) {
      var t2 = e.target;
      if (t2 && t2.closest) {
        if (!t2.closest('.note-context-menu') && !t2.closest('.note-more')) closeNoteMenu();
        if (!t2.closest('.menu-wrap') && !t2.closest('.menu') && !t2.closest('.ai-wrap')) {
          var mm = $('more-menu');
          if (mm) { mm.classList.remove('open'); }
        }
      }
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', function () { updateProgress(); });
    window.addEventListener('hashchange', applyHash);
    window.addEventListener('beforeprint', function () { document.body.classList.add('printing'); });
    window.addEventListener('afterprint', function () { document.body.classList.remove('printing'); });
    setTimeout(applyHash, 60);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.WriteUpUI = {
    noteMenu: noteMenu,
    toggleToc: toggleToc,
    toggleFocus: toggleFocus,
    cycleTheme: cycleTheme,
    openShortcuts: openShortcuts,
    toast: toast
  };
})();
