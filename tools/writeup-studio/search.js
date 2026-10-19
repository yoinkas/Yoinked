/* search.js â€” Ctrl+K command palette: searches titles, box names, content, and AI tags. */
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function htmlToText(h) { var d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }

  var overlay = null, input = null, results = null, items = [], sel = 0;

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'search-back';
    overlay.innerHTML =
      '<div class="search-box">' +
        '<div class="search-input-row">' +
          '<i class="fa-solid fa-magnifying-glass"></i>' +
          '<input type="text" id="search-input" placeholder="Search box name or search term..." autocomplete="off" spellcheck="false">' +
          '<kbd>Esc</kbd>' +
        '</div>' +
        '<div class="search-hints">' +
          '<span class="search-hint"><i class="fa-solid fa-cube"></i> Search box</span>' +
          '<span class="search-hint"><i class="fa-solid fa-hashtag"></i> Search term</span>' +
          '<span class="search-hint"><i class="fa-solid fa-lightbulb"></i> Try SQL, LFI, nmap, Editorial</span>' +
        '</div>' +
        '<div class="search-results" id="search-results"></div>' +
        '<div class="search-foot"><span><kbd>Up</kbd><kbd>Down</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = document.getElementById('search-input');
    results = document.getElementById('search-results');
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    input.addEventListener('input', run);
    input.addEventListener('keydown', onKey);
    results.addEventListener('click', onClick);
    results.addEventListener('mousemove', onHover);
  }

  function open() {
    build();
    overlay.style.display = 'flex';
    input.value = '';
    input.focus();
    run();
  }
  function close() { if (overlay) overlay.style.display = 'none'; }

  function run() {
    var q = input.value.trim().toLowerCase();
    var notes = (window.WriteUp && window.WriteUp.getNotes()) || [];
    var idx = (window.AI && window.AI.index && window.AI.index()) || {};
    var tags = [], titles = [], boxes = [], content = [];

    var tagKeys = Object.keys(idx);
    for (var i = 0; i < tagKeys.length; i++) {
      var t = tagKeys[i];
      if (!q || t.indexOf(q) >= 0) tags.push({ type: 'tag', label: t, count: idx[t].count });
    }
    tags = tags.slice(0, 10);

    for (var n = 0; n < notes.length; n++) {
      var note = notes[n];
      var title = (note.title || 'Untitled').toLowerCase();
      var box = null, txt = '';
      var blocks = note.blocks || [];
      for (var b = 0; b < blocks.length; b++) {
        var blk = blocks[b];
        if (blk.type === 'box' && blk.box) box = blk.box;
        if (blk.html) txt += ' ' + htmlToText(blk.html).toLowerCase();
        if (blk.src) txt += ' ' + String(blk.src).toLowerCase();
        if (blk.caption) txt += ' ' + String(blk.caption).toLowerCase();
        if (blk.title) txt += ' ' + String(blk.title).toLowerCase();
      }
      if (!q) { if (titles.length < 6) titles.push({ type: 'note', note: note }); continue; }
      if (title.indexOf(q) >= 0) titles.push({ type: 'note', note: note });
      else if (box && (box.name || '').toLowerCase().indexOf(q) >= 0) boxes.push({ type: 'note', note: note, box: box });
      else if (txt.indexOf(q) >= 0) {
        var at = txt.indexOf(q);
        content.push({ type: 'note', note: note, snippet: txt.slice(Math.max(0, at - 35), at + 65).trim() });
      }
    }
    render({ tags: tags, titles: titles, boxes: boxes, content: content }, q);
  }

  function row(idx, icon, label, sub, badge, cls) {
    var s = '<div class="search-row' + (cls ? ' ' + cls : '') + '" data-idx="' + idx + '">' +
      '<span class="search-ico"><i class="fa-solid ' + icon + '"></i></span>' +
      '<span class="search-text"><b>' + label + '</b>' + (sub ? '<span class="search-sub">' + sub + '</span>' : '') + '</span>';
    if (badge != null) s += '<span class="search-badge">' + badge + '</span>';
    return s + '</div>';
  }

  function render(g, q) {
    items = [];
    var h = '';
    if (!q) {
      h += '<div class="search-empty">Search <b>box names</b>, <b>techniques</b>, or <b>anything</b> in your writeups.</div>';
      if (g.tags.length) {
        h += '<div class="search-group"><div class="search-group-label">Techniques</div>';
        for (var t = 0; t < g.tags.length; t++) { h += row(items.length, 'fa-hashtag', esc(g.tags[t].label), '', g.tags[t].count); items.push(g.tags[t]); }
        h += '</div>';
      }
      if (g.titles.length) {
        h += '<div class="search-group"><div class="search-group-label">Recent writeups</div>';
        for (var r = 0; r < g.titles.length; r++) { h += row(items.length, 'fa-file-lines', esc(g.titles[r].note.title || 'Untitled'), '', null); items.push(g.titles[r]); }
        h += '</div>';
      }
    } else {
      if (!g.tags.length && !g.titles.length && !g.boxes.length && !g.content.length) {
        h = '<div class="search-empty">No matches for <b>' + esc(q) + '</b></div>';
      }
      if (g.tags.length) {
        h += '<div class="search-group"><div class="search-group-label">Techniques</div>';
        for (var i = 0; i < g.tags.length; i++) { h += row(items.length, 'fa-hashtag', esc(g.tags[i].label), '', g.tags[i].count); items.push(g.tags[i]); }
        h += '</div>';
      }
      if (g.titles.length) {
        h += '<div class="search-group"><div class="search-group-label">Writeups</div>';
        for (var j = 0; j < g.titles.length; j++) { h += row(items.length, 'fa-file-lines', esc(g.titles[j].note.title || 'Untitled'), '', null); items.push(g.titles[j]); }
        h += '</div>';
      }
      if (g.boxes.length) {
        h += '<div class="search-group"><div class="search-group-label">Boxes</div>';
        for (var k = 0; k < g.boxes.length; k++) {
          var bx = g.boxes[k].box;
          h += row(items.length, 'fa-cube', esc(g.boxes[k].note.title || 'Untitled'), esc((bx.platform||'') + ' - ' + (bx.difficulty||'') + ' - ' + (bx.os||'')), null);
          items.push(g.boxes[k]);
        }
        h += '</div>';
      }
      if (g.content.length) {
        h += '<div class="search-group"><div class="search-group-label">Content matches</div>';
        for (var c = 0; c < g.content.length; c++) {
          h += row(items.length, 'fa-align-left', esc(g.content[c].note.title || 'Untitled'), '...' + esc(g.content[c].snippet) + '...', null);
          items.push(g.content[c]);
        }
        h += '</div>';
      }
    }
    results.innerHTML = h;
    sel = 0; paint();
  }

  function paint() {
    var rows = results.querySelectorAll('.search-row');
    for (var i = 0; i < rows.length; i++) {
      if (i === sel) { rows[i].classList.add('on'); rows[i].scrollIntoView({ block: 'nearest' }); }
      else rows[i].classList.remove('on');
    }
  }

  function onKey(e) {
    var rows = results.querySelectorAll('.search-row');
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!rows.length) return; sel = (sel + 1) % rows.length; paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!rows.length) return; sel = (sel - 1 + rows.length) % rows.length; paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(items[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }
  function onHover(e) {
    var r = e.target.closest ? e.target.closest('.search-row') : null; if (!r) return;
    var i = parseInt(r.getAttribute('data-idx'), 10); if (!isNaN(i)) { sel = i; paint(); }
  }
  function onClick(e) {
    var r = e.target.closest ? e.target.closest('.search-row') : null; if (!r) return;
    activate(items[parseInt(r.getAttribute('data-idx'), 10)]);
  }
  function activate(it) {
    if (!it) return;
    if (it.type === 'tag') { if (window.AI && window.AI.setFilter) window.AI.setFilter(it.label); close(); return; }
    if (it.type === 'note') { if (window.WriteUp && window.WriteUp.openNote) window.WriteUp.openNote(it.note.id); close(); }
  }

  function init() {
    if (!window.WriteUp) { setTimeout(init, 200); return; }
    var right = document.querySelector('.topbar-right');
    if (right && !document.getElementById('search-btn')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.id = 'search-btn';
      btn.title = 'Search (Ctrl+K)';
      btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i><span>Search</span>';
      right.insertBefore(btn, right.firstChild);
      btn.addEventListener('click', open);
    }
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); open();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 500); });
  else setTimeout(init, 500);
  window.Search = { open: open, close: close };
})();