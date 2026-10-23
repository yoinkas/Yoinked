/* pasteimg.js — Ctrl+V a screenshot from clipboard into an image block.
   Standalone. app.js untouched. */
(function () {
  'use strict';

  var busy = false;

  function injectCSS() {
    if (document.getElementById('pasteimg-css')) return;
    var s = document.createElement('style');
    s.id = 'pasteimg-css';
    s.textContent = [
      '.paste-hint{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--panel2);border:1px solid var(--accent);border-radius:10px;padding:10px 18px;color:var(--text);font-size:13px;font-weight:600;z-index:5000;box-shadow:0 12px 34px rgba(0,0,0,.55);display:none}',
      '.paste-hint.show{display:block}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__piT);
    window.__piT = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function showHint(msg) {
    var el = document.getElementById('paste-hint');
    if (!el) {
      el = document.createElement('div');
      el.className = 'paste-hint';
      el.id = 'paste-hint';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
  }
  function hideHint() {
    var el = document.getElementById('paste-hint');
    if (el) el.classList.remove('show');
  }

  function fireSave() {
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's', code: 'KeyS', keyCode: 83, which: 83,
        ctrlKey: true, bubbles: true, cancelable: true
      }));
    } catch (e) {}
  }

  function uid() {
    return 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function currentBlockId() {
    var a = document.activeElement;
    if (!a || !a.closest) return null;
    var blk = a.closest('.block');
    return blk ? blk.getAttribute('data-id') : null;
  }

  function insertImageAfterBlock(anchorId, dataUrl, label) {
    var w = window.WriteUp;
    if (!w) return false;
    var n = w.getCurrent();
    if (!n || !n.blocks) return false;

    /* Sync current DOM into the model first */
    fireSave();

    /* Re-fetch the note (save may have rebuilt) */
    n = w.getCurrent();
    if (!n) return false;

    var pos = n.blocks.length;
    if (anchorId) {
      for (var i = 0; i < n.blocks.length; i++) {
        if (n.blocks[i].id === anchorId) { pos = i + 1; break; }
      }
    }

    var newBlock = { id: uid(), type: 'image', src: dataUrl, caption: label || '' };
    n.blocks.splice(pos, 0, newBlock);
    w.persist();
    w.render();
    w.toast('Screenshot pasted');
    return true;
  }

  function readBlobAsDataURL(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error || new Error('read failed')); };
      r.readAsDataURL(blob);
    });
  }

  function extractImage(clipboardData) {
    if (!clipboardData) return null;
    var items = clipboardData.items;
    if (items && items.length) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.kind === 'file' && it.type && /^image\//.test(it.type)) {
          var f = it.getAsFile ? it.getAsFile() : null;
          if (f) return f;
        }
      }
    }
    var files = clipboardData.files;
    if (files && files.length) {
      for (var j = 0; j < files.length; j++) {
        if (files[j].type && /^image\//.test(files[j].type)) return files[j];
      }
    }
    return null;
  }

  function handlePaste(e) {
    if (busy) return;
    var img = extractImage(e.clipboardData || window.clipboardData);
    if (!img) return; /* let the app's normal text paste through */

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    busy = true;
    showHint('Processing screenshot...');
    var anchorId = currentBlockId();
    var stamp = new Date().toLocaleString();

    readBlobAsDataURL(img).then(function (url) {
      var ok = insertImageAfterBlock(anchorId, url, 'Pasted ' + stamp);
      hideHint();
      busy = false;
      if (!ok) toast('Could not insert screenshot');
    }).catch(function (err) {
      console.error('[pasteimg]', err);
      hideHint();
      busy = false;
      toast('Screenshot paste failed');
    });
  }

  function init() {
    injectCSS();
    /* Capture phase so we beat the app's paste handler */
    document.addEventListener('paste', handlePaste, true);
    var ed = document.getElementById('editor');
    if (ed) {
      ed.addEventListener('paste', handlePaste, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();