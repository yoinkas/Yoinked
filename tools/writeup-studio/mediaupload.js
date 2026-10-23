/* mediaupload.js — no URL prompts. /image and /video open a file picker.
   Also keeps uploaded videos rendered as real <video> elements.
   app.js untouched. */
(function () {
  'use strict';

  var SENT_IMG = '__MEDIA_UPLOAD_IMAGE__';
  var SENT_VID = '__MEDIA_UPLOAD_VIDEO__';
  var uploading = false;

  /* ---------- prompt override ---------- */
  var origPrompt = window.prompt;
  window.prompt = function (msg, def) {
    if (typeof msg === 'string') {
      if (/^Image URL/i.test(msg)) return SENT_IMG;
      if (/^Video URL/i.test(msg)) return SENT_VID;
    }
    return origPrompt.apply(window, arguments);
  };

  /* ---------- css ---------- */
  function injectCSS() {
    if (document.getElementById('mediaupload-css')) return;
    var s = document.createElement('style');
    s.id = 'mediaupload-css';
    s.textContent = [
      '.media-drop{outline:2px dashed var(--accent);outline-offset:-8px;background:rgba(108,123,255,.04)}',
      '.media-prog{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:10px 18px;color:var(--text);font-size:13px;font-weight:600;z-index:5000;box-shadow:0 12px 34px rgba(0,0,0,.5);display:none}',
      '.media-prog.show{display:block}',
      '.block[data-type=video] .vid-frame{position:relative;padding-bottom:0 !important;height:auto !important}',
      '.block[data-type=video] .vid-frame video{position:static !important;width:100% !important;height:auto !important;max-height:70vh;background:#000;border-radius:10px;display:block}',
      '.block[data-type=video] .media-video{width:100%}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- helpers ---------- */
  function fireSave() {
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's', code: 'KeyS', keyCode: 83, which: 83,
        ctrlKey: true, bubbles: true, cancelable: true
      }));
    } catch (e) {}
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__muT);
    window.__muT = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function showProg(msg) {
    var el = document.getElementById('media-prog');
    if (!el) {
      el = document.createElement('div');
      el.className = 'media-prog';
      el.id = 'media-prog';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
  }
  function hideProg() {
    var el = document.getElementById('media-prog');
    if (el) el.classList.remove('show');
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = accept;
      inp.style.position = 'fixed';
      inp.style.left = '-9999px';
      document.body.appendChild(inp);
      var done = false;
      inp.onchange = function () {
        done = true;
        var f = inp.files && inp.files[0] ? inp.files[0] : null;
        setTimeout(function () { inp.remove(); }, 100);
        resolve(f);
      };
      window.addEventListener('focus', function once() {
        setTimeout(function () {
          window.removeEventListener('focus', once);
          if (!done && !inp.files.length) { inp.remove(); resolve(null); }
        }, 400);
      }, { once: true });
      inp.click();
    });
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error('read failed')); };
      r.onprogress = function (e) {
        if (e.lengthComputable) {
          var pct = Math.round(e.loaded / e.total * 100);
          showProg('Reading ' + file.name + ' — ' + pct + '%');
        }
      };
      r.readAsDataURL(file);
    });
  }

  /* ---------- image compression ----------
     Screenshots straight off the clipboard are multi-megabyte PNGs. Downscale
     and re-encode so a writeup does not blow the localStorage quota. */
  var IMG_MAX = 1600, IMG_QUALITY = 0.86, IMG_SKIP_BYTES = 400 * 1024;

  function optimizeImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type)) return resolve(null);
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w <= IMG_MAX && h <= IMG_MAX && file.size <= IMG_SKIP_BYTES) return resolve(reader.result);
          var sc = Math.min(1, IMG_MAX / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * sc)), ch = Math.max(1, Math.round(h * sc));
          var cvs = document.createElement('canvas');
          cvs.width = cw; cvs.height = ch;
          var ctx = cvs.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          var out;
          try { out = cvs.toDataURL('image/jpeg', IMG_QUALITY); } catch (e) { out = reader.result; }
          resolve(out);
        };
        img.onerror = function () { resolve(reader.result); };
        img.src = reader.result;
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- image flow ---------- */
  function handleImageBlock(blk) {
    uploading = true;
    showProg('Choose an image...');
    pickFile('image/*').then(function (file) {
      if (!file) {
        blk.remove();
        fireSave();
        uploading = false;
        hideProg();
        toast('Image upload cancelled');
        return;
      }
      showProg('Reading ' + file.name + '...');
      return optimizeImage(file).then(function (url) {
        if (!url) { throw new Error('read failed'); }
        var img = blk.querySelector('img');
        if (img) { img.setAttribute('src', url); img.style.display = ''; }
        var cap = blk.querySelector('.img-cap');
        if (cap && !cap.textContent.trim()) cap.textContent = file.name;
        fireSave();
        uploading = false;
        hideProg();
        toast('Image added: ' + file.name);
      });
    }).catch(function (err) {
      console.error('[mediaupload]', err);
      uploading = false;
      hideProg();
      toast('Upload failed');
    });
  }

  /* ---------- video flow ---------- */
  function handleVideoBlock(blk) {
    uploading = true;
    showProg('Choose a video...');
    pickFile('video/*').then(function (file) {
      if (!file) {
        blk.remove();
        fireSave();
        uploading = false;
        hideProg();
        toast('Video upload cancelled');
        return;
      }
      showProg('Reading ' + file.name + '...');
      return readFile(file).then(function (url) {
        blk.setAttribute('data-src', url);
        renderVideoInBlock(blk, url);
        fireSave();
        uploading = false;
        hideProg();
        toast('Video added: ' + file.name);
      });
    }).catch(function (err) {
      console.error('[mediaupload]', err);
      uploading = false;
      hideProg();
      toast('Upload failed');
    });
  }

  /* ---------- the actual fix: force a real <video> into the block ---------- */
  function renderVideoInBlock(blk, url) {
    var c = blk.querySelector('.block-content');
    if (!c) return;
    /* Skip if the right video already exists */
    var existing = c.querySelector('video');
    if (existing && existing.getAttribute('src') === url) return;
    c.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'vid-frame media-video';
    wrap.setAttribute('contenteditable', 'false');
    var v = document.createElement('video');
    v.src = url;
    v.controls = true;
    v.preload = 'metadata';
    v.setAttribute('playsinline', '');
    wrap.appendChild(v);
    c.appendChild(wrap);
    /* Stop the app's URL-prompt-on-click */
    ['mousedown', 'click', 'dblclick'].forEach(function (evt) {
      wrap.addEventListener(evt, function (e) { e.stopPropagation(); }, true);
    });
  }

  function fixVideoBlocks() {
    var blocks = document.querySelectorAll('.block[data-type=video]');
    for (var i = 0; i < blocks.length; i++) {
      var blk = blocks[i];
      var src = blk.getAttribute('data-src') || '';
      if (!/^data:video\//.test(src) && !/^blob:/.test(src)) continue;
      renderVideoInBlock(blk, src);
    }
  }

  /* ---------- scan DOM for sentinels ---------- */
  function scanForPlaceholders() {
    if (uploading) return;
    var imgs = document.querySelectorAll('.block[data-type=image] img[src="' + SENT_IMG + '"]');
    if (imgs.length) {
      var b1 = imgs[0].closest('.block');
      if (b1) {
        imgs[0].removeAttribute('src');
        imgs[0].style.display = 'none';
        handleImageBlock(b1);
        return;
      }
    }
    var vids = document.querySelectorAll('.block[data-type=video][data-src="' + SENT_VID + '"]');
    if (vids.length) {
      handleVideoBlock(vids[0]);
      return;
    }
  }

  /* ---------- topbar Upload button ---------- */
  function buildButton() {
    if (document.getElementById('media-upload-btn')) return;
    var right = document.querySelector('.topbar-right');
    if (!right) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.id = 'media-upload-btn';
    btn.title = 'Upload images/videos from disk (or drag & drop onto the editor)';
    btn.innerHTML = '<i class="fa-solid fa-file-arrow-up"></i><span>Upload</span>';

    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*,video/*';
    inp.multiple = true;
    inp.className = 'file-hidden';
    inp.id = 'media-upload-input';

    var importBtn = document.getElementById('import-btn');
    var newBtn = document.getElementById('new-note-btn');
    if (newBtn && newBtn.parentNode === right) right.insertBefore(btn, newBtn);
    else if (importBtn && importBtn.parentNode === right) right.insertBefore(btn, importBtn);
    else right.appendChild(btn);
    btn.parentNode.insertBefore(inp, btn.nextSibling);

    btn.addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () {
      if (this.files && this.files.length) insertFiles(this.files);
      this.value = '';
    });
  }

  /* ---------- batch insert (button + drag-drop) ---------- */
  function insertFiles(files) {
    var w = window.WriteUp;
    if (!w) return;
    var n = w.getCurrent();
    if (!n) return;
    var accepted = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (/^image\//.test(f.type) || /^video\//.test(f.type)) accepted.push(f);
    }
    if (!accepted.length) { toast('Only images and videos supported'); return; }
    fireSave();
    var pos = n.blocks.length;
    var a = document.activeElement;
    if (a && a.closest) {
      var blk = a.closest('.block');
      if (blk) {
        var id = blk.getAttribute('data-id');
        for (var j = 0; j < n.blocks.length; j++) {
          if (n.blocks[j].id === id) { pos = j + 1; break; }
        }
      }
    }
    (function step(idx) {
      if (idx >= accepted.length) {
        w.persist();
        w.render();
        fixVideoBlocks();
        hideProg();
        toast(accepted.length + ' file' + (accepted.length === 1 ? '' : 's') + ' added');
        return;
      }
      var f = accepted[idx];
      var isImg = /^image\//.test(f.type);
      showProg('Reading ' + f.name + ' (' + (idx + 1) + '/' + accepted.length + ')');
      var read = isImg ? optimizeImage(f) : readFile(f);
      read.then(function (url) {
        if (!url) { step(idx + 1); return; }
        var id = 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        var blk;
        if (isImg) {
          blk = { id: id, type: 'image', src: url, caption: f.name };
        } else {
          blk = { id: id, type: 'video', src: url, customVideo: true };
        }
        n.blocks.splice(pos + idx, 0, blk);
        step(idx + 1);
      }).catch(function (err) {
        console.error('[mediaupload]', err);
        step(idx + 1);
      });
    })(0);
  }

  /* ---------- drag & drop ---------- */
  function wireDragDrop() {
    var ed = document.getElementById('editor-wrap') || document.getElementById('editor');
    if (!ed || ed.dataset.mediaDrop) return;
    ed.dataset.mediaDrop = '1';
    var depth = 0;
    ed.addEventListener('dragenter', function (e) { e.preventDefault(); depth++; ed.classList.add('media-drop'); });
    ed.addEventListener('dragover', function (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; });
    ed.addEventListener('dragleave', function (e) { e.preventDefault(); depth--; if (depth <= 0) { depth = 0; ed.classList.remove('media-drop'); } });
    ed.addEventListener('drop', function (e) {
      e.preventDefault();
      depth = 0;
      ed.classList.remove('media-drop');
      if (!e.dataTransfer) return;
      var files = [];
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        for (var i = 0; i < e.dataTransfer.files.length; i++) files.push(e.dataTransfer.files[i]);
      }
      if (files.length) insertFiles(files);
    });
  }

  /* ---------- init ---------- */
  function init() {
    injectCSS();
    buildButton();
    wireDragDrop();
    var ed = document.getElementById('editor');
    if (ed) {
      new MutationObserver(function () {
        setTimeout(function () {
          scanForPlaceholders();
          fixVideoBlocks();
        }, 20);
      }).observe(ed, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data-src'] });
    }
    setTimeout(function () { scanForPlaceholders(); fixVideoBlocks(); }, 400);
    setTimeout(function () { scanForPlaceholders(); fixVideoBlocks(); }, 1200);
    setTimeout(fixVideoBlocks, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();