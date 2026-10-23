/* extras.js — power-user features:
   1. command palette (Ctrl+P)
   2. snippets (text expansion)
   3. image lightbox
   4. code block line numbers
   5. smart token highlighting (CVE / IP / flag / hash) with click-to-copy
   6. checklist + timer + mermaid block behaviour
   7. keyboard block move / duplicate                                       */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function W() { return window.WriteUp; }
  function ed() { return document.getElementById('editor'); }
  function toast(m) { if (W() && W().toast) W().toast(m); }
  function el(id) { return document.getElementById(id); }
  function childByClass(root, cls) {
    if (!root) return null;
    for (var i = 0; i < root.children.length; i++) {
      if (root.children[i].classList && root.children[i].classList.contains(cls)) return root.children[i];
    }
    return null;
  }

  /* ============================================================
     1. COMMAND PALETTE
     ============================================================ */
  var ACTIONS = [
    { id: 'new', name: 'New writeup', icon: 'fa-plus', hint: 'Ctrl+N', run: function () { var b = el('new-note-btn'); if (b) b.click(); } },
    { id: 'rename', name: 'Rename this writeup', icon: 'fa-pen', run: function () {
        var n = W() && W().getCurrent(); if (!n) return;
        var t = prompt('Rename writeup:', n.title || '');
        if (t && t.trim()) { W().renameNote(n.id, t.trim()); }
      } },
    { id: 'duplicate', name: 'Duplicate this writeup', icon: 'fa-copy', run: function () {
        var n = W() && W().getCurrent(); if (n) W().duplicateNote(n.id);
      } },
    { id: 'pin', name: 'Pin / unpin this writeup', icon: 'fa-thumbtack', run: function () {
        var n = W() && W().getCurrent(); if (n) W().togglePin(n.id);
      } },
    { id: 'delete', name: 'Delete this writeup', icon: 'fa-trash', run: function () {
        var n = W() && W().getCurrent(); if (n) W().deleteNote(n.id);
      } },
    { id: 'import', name: 'Import HTML / Markdown / JSON', icon: 'fa-file-import', run: function () {
        var i = el('import-file'); if (i) i.click();
      } },
    { id: 'export-html', name: 'Export standalone HTML', icon: 'fa-globe', run: function () { if (W()) W().exportHTML(); } },
    { id: 'export-md', name: 'Export Markdown', icon: 'fa-brands fa-markdown', run: function () { if (W()) W().exportMD(); } },
    { id: 'export-json', name: 'Export JSON backup', icon: 'fa-file-code', run: function () { var b = el('btn-json'); if (b) b.click(); } },
    { id: 'print', name: 'Print / Save as PDF', icon: 'fa-file-pdf', run: function () { if (W()) W().printNote(); } },
    { id: 'outline', name: 'Toggle outline', icon: 'fa-sitemap', hint: 'Ctrl+Shift+O', run: function () { var b = el('toc-btn'); if (b) b.click(); } },
    { id: 'tips', name: 'Browse all tips', icon: 'fa-lightbulb', run: function () { if (window.WriteUpTips) window.WriteUpTips.browse(); } },
    { id: 'theme', name: 'Switch theme (dark / light)', icon: 'fa-moon', hint: 'Ctrl+Shift+L', run: function () { var b = el('theme-btn'); if (b) b.click(); } },
    { id: 'focus', name: 'Toggle focus mode', icon: 'fa-expand', hint: 'Ctrl+Shift+F', run: function () { var b = el('focus-btn'); if (b) b.click(); } },
    { id: 'width', name: 'Cycle editor width', icon: 'fa-arrows-left-right', run: function () { var b = el('width-btn'); if (b) b.click(); } },
    { id: 'sort', name: 'Cycle sort order', icon: 'fa-arrow-down-short-wide', run: function () { var b = el('sort-btn'); if (b) b.click(); } },
    { id: 'search', name: 'Search all writeups', icon: 'fa-magnifying-glass', hint: 'Ctrl+K', run: function () { if (window.Search) window.Search.open(); } },
    { id: 'shortcuts', name: 'Keyboard shortcuts', icon: 'fa-keyboard', hint: 'Ctrl+/', run: function () { var b = el('shortcuts-btn'); if (b) b.click(); } }
  ];

  var palette = null, pInput = null, pList = null, pSel = 0, pItems = [];

  function buildPalette() {
    if (palette) return;
    palette = document.createElement('div');
    palette.className = 'cmd-back';
    palette.id = 'cmd-palette';
    palette.innerHTML =
      '<div class="cmd-box">' +
      '<div class="cmd-row"><i class="fa-solid fa-terminal"></i>' +
      '<input id="cmd-input" placeholder="Type a command…" autocomplete="off" spellcheck="false">' +
      '<kbd>esc</kbd></div>' +
      '<div class="cmd-list" id="cmd-list"></div>' +
      '<div class="cmd-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> run</span></div>' +
      '</div>';
    document.body.appendChild(palette);
    pInput = el('cmd-input');
    pList = el('cmd-list');
    palette.addEventListener('mousedown', function (e) { if (e.target === palette) closePalette(); });
    pInput.addEventListener('input', renderPalette);
    pInput.addEventListener('keydown', onPaletteKey);
    pList.addEventListener('click', function (e) {
      var row = e.target.closest ? e.target.closest('.cmd-row-item') : null;
      if (!row) return;
      var act = pItems[parseInt(row.getAttribute('data-idx'), 10)];
      closePalette();
      if (act) act.run();
    });
  }
  function renderPalette() {
    var q = (pInput.value || '').trim().toLowerCase();
    pItems = ACTIONS.filter(function (a) {
      return !q || a.name.toLowerCase().indexOf(q) >= 0;
    });
    pSel = 0;
    if (!pItems.length) { pList.innerHTML = '<div class="cmd-empty">No matching command</div>'; return; }
    var h = '';
    for (var i = 0; i < pItems.length; i++) {
      h += '<div class="cmd-row-item' + (i === pSel ? ' on' : '') + '" data-idx="' + i + '">'
        + '<i class="fa-solid ' + pItems[i].icon + '"></i>'
        + '<span>' + esc(pItems[i].name) + '</span>'
        + (pItems[i].hint ? '<kbd>' + esc(pItems[i].hint) + '</kbd>' : '')
        + '</div>';
    }
    pList.innerHTML = h;
  }
  function onPaletteKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); pSel = Math.min(pSel + 1, pItems.length - 1); renderPalette(); scrollSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pSel = Math.max(pSel - 1, 0); renderPalette(); scrollSel(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var act = pItems[pSel];
      closePalette();
      if (act) act.run();
    } else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  }
  function scrollSel() {
    var on = pList && pList.querySelector('.cmd-row-item.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }
  function openPalette() {
    buildPalette();
    palette.style.display = 'flex';
    pInput.value = '';
    renderPalette();
    pInput.focus();
  }
  function closePalette() { if (palette) palette.style.display = 'none'; }

  /* ============================================================
     2. SNIPPETS (text expansion)
     ============================================================ */
  var SNIP_KEY = 'writeup_snippets';
  var snippets = [];
  function loadSnippets() {
    try {
      var raw = localStorage.getItem(SNIP_KEY);
      snippets = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(snippets)) snippets = [];
    } catch (e) { snippets = []; }
    if (!snippets.length) {
      snippets = [
        { key: ';nmap', text: 'nmap -sC -sV -p- <TARGET>' },
        { key: ';gobuster', text: 'gobuster dir -u <URL> -w <WORDLIST> -t 50' },
        { key: ';linpeas', text: 'linpeas -a' },
        { key: ';pwn', text: 'python3 -c "import pty;pty.spawn(\'/bin/bash\')"' }
      ];
    }
  }
  function saveSnippets() {
    try { localStorage.setItem(SNIP_KEY, JSON.stringify(snippets)); } catch (e) {}
  }
  function expandSnippets(text) {
    if (!text) return null;
    for (var i = 0; i < snippets.length; i++) {
      var s = snippets[i];
      if (s.key && text.indexOf(s.key) >= 0) {
        return text.split(s.key).join(s.text);
      }
    }
    return null;
  }

  /* ============================================================
     3. IMAGE LIGHTBOX
     ============================================================ */
  var lightbox = null;
  function buildLightbox() {
    if (lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.id = 'lightbox';
    lightbox.innerHTML =
      '<button class="lb-close" title="Close (Esc)"><i class="fa-solid fa-xmark"></i></button>' +
      '<button class="lb-nav lb-prev" title="Previous"><i class="fa-solid fa-chevron-left"></i></button>' +
      '<img class="lb-img" alt="">' +
      '<button class="lb-nav lb-next" title="Next"><i class="fa-solid fa-chevron-right"></i></button>' +
      '<div class="lb-bar"><span class="lb-count"></span><button class="lb-zoom-out"><i class="fa-solid fa-minus"></i></button><span class="lb-zoom">100%</span><button class="lb-zoom-in"><i class="fa-solid fa-plus"></i></button></div>';
    document.body.appendChild(lightbox);
    lightbox.addEventListener('mousedown', function (e) { if (e.target === lightbox || e.target.classList.contains('lb-img')) closeLightbox(); });
    lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lb-prev').addEventListener('click', function () { stepLightbox(-1); });
    lightbox.querySelector('.lb-next').addEventListener('click', function () { stepLightbox(1); });
    lightbox.querySelector('.lb-zoom-in').addEventListener('click', function () { zoomLightbox(0.25); });
    lightbox.querySelector('.lb-zoom-out').addEventListener('click', function () { zoomLightbox(-0.25); });
  }
  var lbImages = [], lbIndex = 0, lbZoom = 1;
  function openLightbox(src) {
    buildLightbox();
    var e = ed();
    lbImages = e ? Array.prototype.slice.call(e.querySelectorAll('.img-wrap img')) : [];
    lbIndex = 0;
    for (var i = 0; i < lbImages.length; i++) {
      if (lbImages[i].getAttribute('src') === src) { lbIndex = i; break; }
    }
    lbZoom = 1;
    lightbox.style.display = 'flex';
    paintLightbox();
  }
  function closeLightbox() { if (lightbox) lightbox.style.display = 'none'; }
  function stepLightbox(d) {
    if (!lbImages.length) return;
    lbIndex = (lbIndex + d + lbImages.length) % lbImages.length;
    lbZoom = 1;
    paintLightbox();
  }
  function zoomLightbox(d) {
    lbZoom = Math.max(0.25, Math.min(4, lbZoom + d));
    paintLightbox();
  }
  function paintLightbox() {
    var img = lightbox.querySelector('.lb-img');
    var cnt = lightbox.querySelector('.lb-count');
    var zm = lightbox.querySelector('.lb-zoom');
    if (lbImages[lbIndex]) img.setAttribute('src', lbImages[lbIndex].getAttribute('src'));
    img.style.transform = 'scale(' + lbZoom + ')';
    if (cnt) cnt.textContent = (lbIndex + 1) + ' / ' + lbImages.length;
    if (zm) zm.textContent = Math.round(lbZoom * 100) + '%';
  }

  /* ============================================================
     4. SMART TOKEN HIGHLIGHTING
     ============================================================ */
  var TOKENS = [
    { re: /\bCVE-\d{4}-\d{4,7}\b/gi, cls: 'tok-cve', title: 'Click to open the NVD entry' },
    { re: /\b(?:HTB|THM|CTF|FLAG)\{[^}\n]{2,80}\}/g, cls: 'tok-flag', title: 'Click to copy the flag' },
    { re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, cls: 'tok-ip', title: 'Click to copy' },
    { re: /\b[0-9a-f]{32}\b|\b[0-9a-f]{40}\b|\b[0-9a-f]{64}\b/gi, cls: 'tok-hash', title: 'Click to copy' }
  ];
  function stripTokenSpans(c) {
    var spans = c.querySelectorAll('span[data-tok]');
    for (var i = spans.length - 1; i >= 0; i--) {
      var sp = spans[i];
      while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
      sp.parentNode.removeChild(sp);
    }
  }
  function highlightTokens(blk) {
    var c = childByClass(blk, 'block-content');
    if (!c || c.getAttribute('contenteditable') !== 'true') return;
    var plain = c.textContent || '';
    if (c.getAttribute('data-hl') === plain) return;   /* already highlighted */
    stripTokenSpans(c);
    if (!c.firstChild) { c.setAttribute('data-hl', plain); return; }
    var walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) { if (n.nodeValue) nodes.push(n); }
    for (var j = 0; j < nodes.length; j++) {
      var node = nodes[j], text = node.nodeValue, hits = [];
      for (var t = 0; t < TOKENS.length; t++) {
        var def = TOKENS[t], re = def.re;
        re.lastIndex = 0;
        var m;
        while ((m = re.exec(text))) {
          if (!m[0].length) { re.lastIndex++; continue; }
          hits.push({ index: m.index, len: m[0].length, cls: def.cls, title: def.title });
          if (re.lastIndex === m.index) re.lastIndex++;
        }
      }
      if (!hits.length) continue;
      /* keep the left-most match, drop anything that overlaps it */
      hits.sort(function (a, b) { return a.index - b.index || b.len - a.len; });
      var kept = [], lastEnd = -1;
      for (var h = 0; h < hits.length; h++) {
        if (hits[h].index >= lastEnd) { kept.push(hits[h]); lastEnd = hits[h].index + hits[h].len; }
      }
      var frag = document.createDocumentFragment(), pos = 0;
      for (var p = 0; p < kept.length; p++) {
        var hit = kept[p];
        if (hit.index > pos) frag.appendChild(document.createTextNode(text.slice(pos, hit.index)));
        var sp = document.createElement('span');
        sp.className = hit.cls;
        sp.setAttribute('data-tok', '1');
        sp.setAttribute('title', hit.title);
        sp.textContent = text.substr(hit.index, hit.len);
        frag.appendChild(sp);
        pos = hit.index + hit.len;
      }
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    }
    c.setAttribute('data-hl', plain);
  }
  function unhighlightTokens(blk) {
    var c = childByClass(blk, 'block-content');
    if (!c) return;
    if (!c.querySelector('span[data-tok]')) return;
    stripTokenSpans(c);
    c.removeAttribute('data-hl');
  }

  /* ============================================================
     5. CODE LINE NUMBERS
     ============================================================ */
  function toggleLineNumbers(blk) {
    var c = childByClass(blk, 'block-content');
    if (!c) return;
    var on = !blk.classList.contains('has-lines');
    blk.setAttribute('data-lines', on ? '1' : '0');
    blk.classList.toggle('has-lines', on);
    var lines = c.textContent.split('\n').length;
    var num = childByClass(blk, 'code-numbers');
    if (on) {
      if (!num) {
        num = document.createElement('div');
        num.className = 'code-numbers';
        blk.insertBefore(num, c);
      }
      num.innerHTML = '';
      for (var i = 1; i <= lines; i++) num.appendChild(document.createElement('span')).textContent = i;
    } else if (num) num.remove();
    blk.setAttribute('data-lines', on ? '1' : '0');
  }
  function refreshLineNumbers(blk) {
    if (!blk.classList.contains('has-lines')) return;
    var c = childByClass(blk, 'block-content');
    var num = childByClass(blk, 'code-numbers');
    if (!c || !num) return;
    var lines = c.textContent.split('\n').length;
    while (num.children.length > lines) num.removeChild(num.lastChild);
    while (num.children.length < lines) num.appendChild(document.createElement('span')).textContent = num.children.length + 1;
    for (var i = 0; i < num.children.length; i++) num.children[i].textContent = i + 1;
  }

  /* ============================================================
     6. CHECKLIST / TIMER / MERMAID
     ============================================================ */
  function renderChecklist(blk) {
    var c = childByClass(blk, 'block-content');
    if (!c) return;
    var n = W() && W().getCurrent();
    var todos = [];
    if (n) {
      var walk = function (arr) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].type === 'todo') todos.push(arr[i]);
          if (arr[i].children) walk(arr[i].children);
        }
      };
      walk(n.blocks || []);
    }
    var showDone = blk.getAttribute('data-show-done') !== '0';
    var open = todos.filter(function (t) { return !t.checked; });
    var done = todos.filter(function (t) { return t.checked; });
    var list = open.concat(showDone ? done : []);
    var pct = todos.length ? Math.round((done.length / todos.length) * 100) : 0;
    var h = '<div class="cl-head"><div class="cl-bar"><span style="width:' + pct + '%"></span></div>'
      + '<span class="cl-count">' + done.length + ' / ' + todos.length + '</span></div>';
    if (!todos.length) h += '<div class="cl-empty">No to-dos in this writeup yet.</div>';
    else {
      h += '<ul class="cl-list">';
      for (var i = 0; i < list.length; i++) {
        var t = list[i];
        var label = t.html ? t.html.replace(/<[^>]+>/g, '') : '';
        h += '<li class="' + (t.checked ? 'done' : '') + '"><span class="cl-box">'
          + (t.checked ? '<i class="fa-solid fa-check"></i>' : '') + '</span>'
          + '<span class="cl-label">' + esc(label) + '</span></li>';
      }
      h += '</ul>';
    }
    c.innerHTML = h;
  }
  function renderTimer(blk) {
    var c = childByClass(blk, 'block-content');
    if (!c) return;
    var started = Number(blk.getAttribute('data-started') || 0);
    var elapsed = Number(blk.getAttribute('data-elapsed') || 0);
    var running = blk.getAttribute('data-running') === '1';
    var total = elapsed + (running && started ? Date.now() - started : 0);
    var s = Math.floor(total / 1000);
    var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    c.innerHTML = '<div class="tm-face"><span class="tm-time">' + (hh ? pad(hh) + ':' : '') + pad(mm) + ':' + pad(ss) + '</span>'
      + '<button class="tm-btn tm-toggle" type="button">' + (running ? 'Pause' : 'Start') + '</button>'
      + '<button class="tm-btn tm-reset" type="button">Reset</button></div>';
    c.setAttribute('data-elapsed', total);
  }
  function renderMermaid(blk) {
    var box = childByClass(blk, 'block-content');
    if (!box) return;
    var src = box.querySelector('.mermaid-src');
    var out = box.querySelector('.mermaid-out');
    if (!src || !out) return;
    var code = src.textContent || '';
    if (!code.trim()) { out.innerHTML = '<div class="mermaid-hint">Write Mermaid syntax, e.g. <code>graph TD; A--&gt;B;</code></div>'; return; }
    if (!window.mermaid) { out.innerHTML = '<div class="mermaid-hint">Mermaid is still loading…</div>'; return; }
    if (blk.getAttribute('data-code') === code && blk.getAttribute('data-rendered') === '1') return;
    try {
      if (!window.__mermaidReady) {
        window.mermaid.initialize({ startOnLoad: false, theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark', securityLevel: 'loose' });
        window.__mermaidReady = true;
      }
      var id = 'mmd' + Math.random().toString(36).slice(2, 9);
      Promise.resolve(window.mermaid.render(id, code)).then(function (res) {
        out.innerHTML = res && res.svg ? res.svg : '<div class="mermaid-hint">Could not render this diagram.</div>';
        blk.setAttribute('data-code', code);
        blk.setAttribute('data-rendered', '1');
      }).catch(function (err) {
        out.innerHTML = '<div class="mermaid-hint">Diagram error: ' + esc(err && err.message ? err.message : 'unknown') + '</div>';
      });
    } catch (e) {
      out.innerHTML = '<div class="mermaid-hint">Diagram error: ' + esc(e.message) + '</div>';
    }
  }

  /* ============================================================
     7. KEYBOARD BLOCK MOVE / DUPLICATE
     ============================================================ */
  function blockOf(node) {
    while (node && node !== ed()) {
      if (node.classList && node.classList.contains('block')) return node;
      node = node.parentNode;
    }
    return null;
  }
  function moveBlock(blk, dir) {
    var n = W() && W().getCurrent();
    if (!n || !blk) return;
    var id = blk.getAttribute('data-id');
    var idx = -1;
    for (var i = 0; i < n.blocks.length; i++) if (n.blocks[i].id === id) { idx = i; break; }
    if (idx < 0) return;
    var to = idx + dir;
    if (to < 0 || to >= n.blocks.length) return;
    var tmp = n.blocks[idx];
    n.blocks[idx] = n.blocks[to];
    n.blocks[to] = tmp;
    W().persist();
    W().render();
    var els = ed().querySelectorAll('.block');
    for (var j = 0; j < els.length; j++) if (els[j].getAttribute('data-id') === id) { focusContent(els[j]); break; }
  }
  function duplicateBlock(blk) {
    var n = W() && W().getCurrent();
    if (!n || !blk) return;
    var id = blk.getAttribute('data-id');
    var idx = -1;
    for (var i = 0; i < n.blocks.length; i++) if (n.blocks[i].id === id) { idx = i; break; }
    if (idx < 0) return;
    var copy = JSON.parse(JSON.stringify(n.blocks[idx]));
    copy.id = 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    if (copy.children) {
      copy.children = copy.children.map(function (c) { return JSON.parse(JSON.stringify(c)); });
    }
    n.blocks.splice(idx + 1, 0, copy);
    W().persist();
    W().render();
    toast('Block duplicated');
  }
  function focusContent(blk) {
    var c = childByClass(blk, 'block-content');
    if (!c) return;
    try { c.focus(); } catch (e) {}
  }

  /* ============================================================
     wiring
     ============================================================ */
  function onEditorClick(e) {
    /* lightbox on images */
    var img = e.target.closest ? e.target.closest('.img-wrap img') : null;
    if (img) { e.preventDefault(); e.stopPropagation(); openLightbox(img.getAttribute('src')); return; }
    /* token clicks */
    var tok = e.target.closest ? e.target.closest('span[data-tok]') : null;
    if (tok) {
      e.preventDefault(); e.stopPropagation();
      var txt = tok.textContent || '';
      if (tok.classList.contains('tok-cve')) {
        window.open('https://nvd.nist.gov/vuln/detail/' + txt, '_blank', 'noopener');
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
      toast('Copied ' + txt);
      return;
    }
    /* line numbers toggle */
    var ln = e.target.closest ? e.target.closest('.code-lines-btn') : null;
    if (ln) {
      var blk = blockOf(ln);
      e.preventDefault(); e.stopPropagation();
      if (blk) toggleLineNumbers(blk);
      return;
    }
    /* timer buttons */
    var tm = e.target.closest ? e.target.closest('.tm-btn') : null;
    if (tm) {
      var tblk = blockOf(tm);
      e.preventDefault(); e.stopPropagation();
      if (!tblk) return;
      if (tm.classList.contains('tm-reset')) {
        tblk.setAttribute('data-elapsed', '0');
        tblk.setAttribute('data-started', '0');
        tblk.setAttribute('data-running', '0');
      } else {
        if (tblk.getAttribute('data-running') === '1') {
          tblk.setAttribute('data-elapsed', String(renderTimerNow(tblk)));
          tblk.setAttribute('data-running', '0');
        } else {
          tblk.setAttribute('data-started', String(Date.now()));
          tblk.setAttribute('data-running', '1');
        }
      }
      renderTimer(tblk);
      W().persist();
      return;
    }
  }
  function renderTimerNow(blk) {
    var started = Number(blk.getAttribute('data-started') || 0);
    var elapsed = Number(blk.getAttribute('data-elapsed') || 0);
    return elapsed + (started ? Date.now() - started : 0);
  }

  function onKeydown(e) {
    /* command palette */
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault(); openPalette(); return;
    }
    if (e.key === 'Escape' && palette && palette.style.display === 'flex') { closePalette(); return; }
    /* block move / duplicate */
    if (e.altKey && e.shiftKey) {
      var blk = blockOf(e.target);
      if (e.key === 'ArrowUp') { e.preventDefault(); if (blk) moveBlock(blk, -1); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (blk) moveBlock(blk, 1); return; }
      if (e.key === 'D' || e.key === 'd') { e.preventDefault(); if (blk) duplicateBlock(blk); return; }
    }
  }

  function onEditorInput(e) {
    /* snippet expansion */
    var tgt = e.target;
    if (!tgt || !tgt.classList || !tgt.classList.contains('block-content')) return;
    var blk = blockOf(tgt);
    if (!blk) return;
    var type = blk.getAttribute('data-type');
    if (type !== 'text' && type !== 'quote') return;
    var text = tgt.textContent || '';
    var expanded = expandSnippets(text);
    if (expanded && expanded !== text) {
      var caret = tgt.textContent.length;
      tgt.textContent = expanded;
      try {
        var sel = window.getSelection();
        var r = document.createRange();
        r.setStart(tgt.firstChild || tgt, Math.min(caret, expanded.length));
        r.collapse(true);
        sel.removeAllRanges(); sel.addRange(r);
      } catch (err) {}
      toast('Snippet expanded');
    }
  }

  var timerHandle = null;
  function tickTimers() {
    var t = ed();
    if (!t) return;
    var timers = t.querySelectorAll('.block[data-type=timer]');
    for (var i = 0; i < timers.length; i++) {
      if (timers[i].getAttribute('data-running') === '1') renderTimer(timers[i]);
    }
  }

  function syncLineNumbers(blk) {
    var on = blk.getAttribute('data-lines') === '1';
    blk.classList.toggle('has-lines', on);
    var num = childByClass(blk, 'code-numbers');
    if (!on) { if (num) num.remove(); return; }
    if (!num) {
      num = document.createElement('div');
      num.className = 'code-numbers';
      var content = childByClass(blk, 'block-content');
      if (content) blk.insertBefore(num, content); else return;
    }
    refreshLineNumbers(blk);
  }
  function refreshDerived() {
    var t = ed();
    if (!t) return;
    var cl = t.querySelectorAll('.block[data-type=checklist]');
    for (var i = 0; i < cl.length; i++) renderChecklist(cl[i]);
    var tm = t.querySelectorAll('.block[data-type=timer]');
    for (var j = 0; j < tm.length; j++) renderTimer(tm[j]);
    var mm = t.querySelectorAll('.block[data-type=mermaid]');
    for (var k = 0; k < mm.length; k++) renderMermaid(mm[k]);
    var cb = t.querySelectorAll('.block[data-type=code]');
    for (var q = 0; q < cb.length; q++) syncLineNumbers(cb[q]);
    var tx = t.querySelectorAll('.block[data-type=text],.block[data-type=quote]');
    for (var r = 0; r < tx.length; r++) {
      var tc2 = childByClass(tx[r], 'block-content');
      if (tc2 && document.activeElement !== tc2) highlightTokens(tx[r]);
    }
  }

  function init() {
    loadSnippets();
    if (!ed()) { setTimeout(init, 200); return; }
    var e = ed();
    e.addEventListener('click', onEditorClick, true);
    e.addEventListener('input', onEditorInput);
    e.addEventListener('focusout', function (ev) {
      var blk = blockOf(ev.target);
      if (!blk) return;
      var type = blk.getAttribute('data-type');
      if (type === 'text' || type === 'quote') highlightTokens(blk);
      if (type === 'code') refreshLineNumbers(blk);
    });
    e.addEventListener('focusin', function (ev) {
      var blk = blockOf(ev.target);
      if (!blk) return;
      var type = blk.getAttribute('data-type');
      if (type === 'text' || type === 'quote') unhighlightTokens(blk);
    });
    document.addEventListener('keydown', onKeydown);
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(tickTimers, 1000);
    refreshDerived();
    setTimeout(refreshDerived, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.WriteUpExtras = {
    openPalette: openPalette,
    openLightbox: openLightbox,
    snippets: function () { return snippets; },
    setSnippets: function (list) { snippets = list || []; saveSnippets(); },
    expand: expandSnippets,
    refresh: refreshDerived
  };
})();
