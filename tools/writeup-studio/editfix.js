/* editfix.js â€” universal trash button + numbered list counter reset.
   Never edits app.js. Attaches to blocks via MutationObserver. */
(function () {
  'use strict';

  function injectCSS() {
    if (document.getElementById('editfix-css')) return;
    var s = document.createElement('style');
    s.id = 'editfix-css';
    s.textContent = [
      /* --- Numbered list: reset counter at the start of each group --- */
      '#editor > .block[data-type=numbered]:first-child,',
      '#editor > .block:not([data-type=numbered]) + .block[data-type=numbered] {',
      '  counter-reset: num;',
      '}',

      /* --- Trash button on LEFT of every block --- */
      '.block-del {',
      '  position: absolute;',
      '  right: auto !important;',
      '  left: -58px !important;',
      '  top: 4px !important;',
      '  width: 24px;',
      '  height: 26px;',
      '  display: none;',
      '  align-items: center;',
      '  justify-content: center;',
      '  color: var(--faint);',
      '  cursor: pointer;',
      '  border-radius: 5px;',
      '  font-size: 13px;',
      '  border: 0;',
      '  background: transparent;',
      '  padding: 0;',
      '  z-index: 3;',
      '  font-family: inherit;',
      '}',
      '.block:hover .block-del { display: flex; }',
      '.block-del:hover {',
      '  background: rgba(229,96,110,.16);',
      '  color: var(--red);',
      '}',
      '.block-del:active { transform: scale(.92); }'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fireSave() {
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's', code: 'KeyS', keyCode: 83, which: 83,
        ctrlKey: true, bubbles: true, cancelable: true
      }));
    } catch (e) {}
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__efT);
    window.__efT = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function deleteBlock(blk) {
    var blocks = document.querySelectorAll('#editor > .block');
    if (blocks.length <= 1) {
      showToast('Note needs at least one block');
      return;
    }
    blk.parentNode.removeChild(blk);
    fireSave();
    showToast('Block deleted');
  }

  function addTrash(blk) {
    if (!blk || !blk.querySelector) return;
    if (blk.querySelector(':scope > .block-del')) return;
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'block-del';
    del.title = 'Delete this block';
    del.setAttribute('contenteditable', 'false');
    del.innerHTML = '<i class="fa-solid fa-trash"></i>';
    blk.appendChild(del);
  }

  function scanAll() {
    var blocks = document.querySelectorAll('#editor > .block');
    for (var i = 0; i < blocks.length; i++) addTrash(blocks[i]);
  }

  /* Capture-phase click â€” beats app.js and preventDefault stops caret loss */
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var del = e.target.closest('.block-del');
    if (!del) return;
    var blk = del.closest('.block');
    if (!blk) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    deleteBlock(blk);
  }, true);

  /* Also kill mousedown so contenteditable doesn't take focus */
  document.addEventListener('mousedown', function (e) {
    if (!e.target.closest) return;
    if (e.target.closest('.block-del')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  function init() {
    injectCSS();
    var editor = document.getElementById('editor');
    if (!editor) { setTimeout(init, 150); return; }
    new MutationObserver(function () { setTimeout(scanAll, 20); })
      .observe(editor, { childList: true, subtree: true });
    scanAll();
    setTimeout(scanAll, 300);
    setTimeout(scanAll, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();