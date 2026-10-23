/* tips.js — the /tip block.
   A tip is a highlighted marker in the document. Clicking it opens a popup
   dialog with the tip's note. The page itself stays clean. */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function current() { return window.WriteUp ? window.WriteUp.getCurrent() : null; }
  function tips() {
    var n = current();
    if (!n) return [];
    var out = [];
    var bs = n.blocks || [];
    for (var i = 0; i < bs.length; i++) if (bs[i].type === 'tip') out.push(bs[i]);
    return out;
  }
  function findTip(id) {
    var all = tips();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function save() {
    if (!window.WriteUp) return;
    window.WriteUp.persist();
    window.WriteUp.renderNotes();
  }
  function tipTitle(t) {
    var d = document.createElement('div');
    d.innerHTML = (t && t.html) || '';
    return (d.textContent || '').trim();
  }
  function tipBody(t) { return (t && t.body) || ''; }

  var activeId = null;
  var mode = 'view';   /* view | edit | browse */

  /* ---------------- modal ---------------- */
  function modal() { return document.getElementById('tip-modal'); }
  function isOpen() { var m = modal(); return !!(m && m.style.display === 'flex'); }

  function render() {
    var m = modal();
    if (!m) return;
    var all = tips();
    var t = activeId ? findTip(activeId) : null;

    var titleEl = document.getElementById('tip-modal-title');
    var subEl = document.getElementById('tip-modal-sub');
    var viewEl = document.getElementById('tip-modal-view');
    var editEl = document.getElementById('tip-modal-edit');
    var titleIn = document.getElementById('tip-modal-title-input');
    var bodyIn = document.getElementById('tip-modal-body');
    var navEl = document.getElementById('tip-modal-nav');
    var editBtn = document.getElementById('tip-modal-edit-btn');
    var saveBtn = document.getElementById('tip-modal-save');
    var cancelBtn = document.getElementById('tip-modal-cancel');
    var delBtn = document.getElementById('tip-modal-delete');

    var editing = mode === 'edit';
    if (editEl) editEl.style.display = editing ? '' : 'none';
    if (viewEl) viewEl.style.display = editing ? 'none' : '';
    if (editBtn) editBtn.style.display = editing ? 'none' : '';
    if (saveBtn) saveBtn.style.display = editing ? '' : 'none';
    if (cancelBtn) cancelBtn.style.display = editing ? '' : 'none';
    if (delBtn) delBtn.style.display = (t && mode !== 'browse') ? '' : 'none';

    if (mode === 'browse') {
      if (titleEl) titleEl.textContent = 'Tips';
      if (subEl) subEl.textContent = all.length ? all.length + ' tip' + (all.length === 1 ? '' : 's') + ' in this writeup' : 'No tips in this writeup';
      if (viewEl) {
        viewEl.className = 'tip-view tip-browse';
        if (!all.length) {
          viewEl.innerHTML = '<div class="tip-empty">Type <b>/tip</b> in a block to add one.</div>';
        } else {
          var h = '';
          for (var i = 0; i < all.length; i++) {
            var item = all[i];
            var body = tipBody(item);
            h += '<button class="tip-card" data-tip="' + esc(item.id) + '">'
              + '<span class="tip-card-title">' + esc(tipTitle(item) || 'Untitled tip') + '</span>'
              + (body ? '<span class="tip-card-body">' + esc(body.slice(0, 140)) + (body.length > 140 ? '…' : '') + '</span>' : '')
              + '</button>';
          }
          viewEl.innerHTML = h;
        }
      }
      if (navEl) navEl.innerHTML = '';
      return;
    }

    if (!t) {
      if (titleEl) titleEl.textContent = 'Tip';
      if (subEl) subEl.textContent = 'This tip no longer exists';
      if (viewEl) viewEl.innerHTML = '';
      if (navEl) navEl.innerHTML = '';
      return;
    }
    if (titleEl) titleEl.textContent = tipTitle(t) || 'Untitled tip';
    if (subEl) subEl.textContent = editing ? 'Editing tip' : 'Tip ' + (all.indexOf(t) + 1) + ' of ' + all.length;
    if (viewEl) {
      viewEl.className = 'tip-view';
      var body = tipBody(t);
      viewEl.innerHTML = body
        ? '<div class="tip-text">' + esc(body).replace(/\n/g, '<br>') + '</div>'
        : '<div class="tip-empty">This tip has no note yet — press <b>Edit</b> to write one.</div>';
    }
    if (editing) {
      if (titleIn && document.activeElement !== titleIn) titleIn.value = tipTitle(t);
      if (bodyIn && document.activeElement !== bodyIn) bodyIn.value = tipBody(t);
    }
    if (navEl) {
      var others = all.filter(function (x) { return !t || x.id !== t.id; });
      if (others.length) {
        var nh = '<div class="tip-nav-label">Other tips</div><div class="tip-nav-list">';
        for (var j = 0; j < others.length; j++) {
          nh += '<button class="tip-chip" data-tip="' + esc(others[j].id) + '">' + esc(tipTitle(others[j]) || 'Untitled tip') + '</button>';
        }
        navEl.innerHTML = nh + '</div>';
      } else navEl.innerHTML = '';
    }
  }

  function show(tipId, nextMode) {
    var m = modal();
    if (!m) return;
    if (tipId) activeId = tipId;
    mode = nextMode || 'view';
    m.style.display = 'flex';
    render();
    if (mode === 'edit') {
      var bodyIn = document.getElementById('tip-modal-body');
      if (bodyIn) setTimeout(function () { bodyIn.focus(); }, 30);
    }
  }
  function open(tipId) { show(tipId, 'view'); }
  function browse() { show(null, 'browse'); }
  function edit(tipId) { show(tipId, 'edit'); }
  function close() {
    var m = modal();
    if (m) m.style.display = 'none';
    mode = 'view';
  }
  function toggle(tipId) {
    if (isOpen() && (!tipId || tipId === activeId)) { close(); return; }
    open(tipId);
  }

  /* ---------------- document markers ---------------- */
  function refreshMarkers() {
    var ed = document.getElementById('editor');
    if (!ed) return;
    var blocks = ed.querySelectorAll('.block[data-type=tip]');
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var t = findTip(b.getAttribute('data-id'));
      var c = b.querySelector(':scope > .block-content');
      if (!t || !c) continue;
      var label = tipTitle(t);
      if (label && c.textContent.trim() !== label) c.innerHTML = t.html;
      b.classList.toggle('tip-active', !!(activeId && t.id === activeId));
    }
  }

  /* ---------------- insert ---------------- */
  function insertTipAfter(blockId, tip) {
    var n = current();
    if (!n) return null;
    var blocks = n.blocks || [];
    var idx = -1;
    for (var i = 0; i < blocks.length; i++) if (blocks[i].id === blockId) { idx = i; break; }
    if (idx < 0) {
      blocks.push(tip);
    } else {
      var cur = blocks[idx];
      var isEmptyText = cur.type === 'text' && !String(cur.html || '').replace(/<[^>]+>/g, '').trim();
      if (isEmptyText) blocks[idx] = tip;
      else blocks.splice(idx + 1, 0, tip);
    }
    n.blocks = blocks;
    save();
    if (window.WriteUp) window.WriteUp.render();
    return tip;
  }
  function newTip(title, body) {
    return {
      id: 'tip-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      type: 'tip',
      html: esc(title || ''),
      body: body || ''
    };
  }

  /* ---------------- select text -> add a tip ---------------- */
  var selBtn = null, pendingSel = null;

  function hideSelBtn() { if (selBtn) selBtn.style.display = 'none'; }
  function selectionInfo() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    var node = r.startContainer;
    var el = node.nodeType === 1 ? node : node.parentNode;
    if (!el || !el.closest) return null;
    var content = el.closest('.block-content');
    if (!content) return null;
    var ed = document.getElementById('editor');
    if (!ed || !ed.contains(content)) return null;
    var blk = content.closest('.block');
    if (!blk) return null;
    var rect = r.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;
    var quote = (sel.toString() || '').replace(/\s+/g, ' ').trim();
    if (!quote) return null;
    return { block: blk, blockId: blk.getAttribute('data-id'), quote: quote, rect: rect };
  }
  function showSelBtn(info) {
    if (!selBtn) {
      selBtn = document.createElement('button');
      selBtn.id = 'tip-sel-btn';
      selBtn.className = 'tip-sel-btn';
      selBtn.type = 'button';
      selBtn.innerHTML = '<i class="fa-solid fa-lightbulb"></i><span>Add tip</span>';
      selBtn.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
      selBtn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var info2 = pendingSel;
        hideSelBtn();
        if (!info2) return;
        addTipFromSelection(info2);
      });
      document.body.appendChild(selBtn);
    }
    pendingSel = info;
    var w = 108;
    var left = info.rect.right + 10;
    if (left + w > window.innerWidth - 8) left = Math.max(8, info.rect.left - w - 10);
    var top = info.rect.top - 13;
    if (top < 8) top = info.rect.bottom + 8;
    selBtn.style.left = left + 'px';
    selBtn.style.top = top + 'px';
    selBtn.style.display = 'flex';
  }
  function addTipFromSelection(info) {
    var tip = newTip(info.quote, '');
    if (!tip) return;
    insertTipAfter(info.blockId, tip);
    activeId = tip.id;
    edit(tip.id);
  }
  function checkSelection() {
    var info = selectionInfo();
    if (!info) { hideSelBtn(); return; }
    showSelBtn(info);
  }

  /* ---------------- wiring ---------------- */
  function onEditorClick(e) {
    var blk = e.target.closest ? e.target.closest('.block[data-type=tip]') : null;
    if (!blk) return;
    if (e.target.closest('.tip-title')) return;
    e.preventDefault();
    e.stopPropagation();
    open(blk.getAttribute('data-id'));
  }

  function init() {
    var ed = document.getElementById('editor');
    if (!ed) { setTimeout(init, 200); return; }
    ed.addEventListener('click', onEditorClick, true);
    ed.addEventListener('mouseup', function () { setTimeout(checkSelection, 10); });
    ed.addEventListener('keyup', function () { setTimeout(checkSelection, 10); });
    document.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('#tip-sel-btn')) return;
      hideSelBtn();
    });

    var back = document.getElementById('tip-modal');
    if (back) {
      back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    }
    var x = document.getElementById('tip-modal-x');
    if (x) x.addEventListener('click', close);
    var editBtn = document.getElementById('tip-modal-edit-btn');
    if (editBtn) editBtn.addEventListener('click', function () { edit(activeId); });
    var cancelBtn = document.getElementById('tip-modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { mode = 'view'; render(); });
    var saveBtn = document.getElementById('tip-modal-save');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var t = activeId ? findTip(activeId) : null;
      if (!t) { close(); return; }
      var ti = document.getElementById('tip-modal-title-input');
      var bi = document.getElementById('tip-modal-body');
      if (ti) t.html = esc(ti.value);
      if (bi) t.body = bi.value;
      save();
      mode = 'view';
      render();
      refreshMarkers();
    });
    var delBtn = document.getElementById('tip-modal-delete');
    if (delBtn) delBtn.addEventListener('click', function () {
      var t = activeId ? findTip(activeId) : null;
      if (!t) return;
      var n = current();
      if (!n) return;
      n.blocks = (n.blocks || []).filter(function (b) { return b.id !== t.id; });
      activeId = null;
      save();
      if (window.WriteUp) window.WriteUp.render();
      close();
    });
    var listEl = document.getElementById('tip-modal-view');
    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.tip-card') : null;
        if (!b) return;
        activeId = b.getAttribute('data-tip');
        mode = 'view';
        render();
      });
    }
    var navEl = document.getElementById('tip-modal-nav');
    if (navEl) {
      navEl.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.tip-chip') : null;
        if (!b) return;
        activeId = b.getAttribute('data-tip');
        mode = 'view';
        render();
      });
    }
    /* the top bar button always opens the "all tips" browser */
    var btn = document.getElementById('tips-btn');
    if (btn) btn.addEventListener('click', function () {
      if (isOpen() && mode === 'browse') { close(); return; }
      browse();
    });
    var menuBtn = document.getElementById('tips-menu-btn');
    if (menuBtn) menuBtn.addEventListener('click', function () {
      if (isOpen() && mode === 'browse') { close(); return; }
      browse();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { close(); }
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.WriteUpTips = {
    open: open, close: close, toggle: toggle, edit: edit, browse: browse,
    render: render, insertTipAfter: insertTipAfter, newTip: newTip,
    count: function () { return tips().length; }
  };
})();
