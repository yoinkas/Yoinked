/* slashclick.js — makes every /slash menu item clickable.
   Reuses the app's existing keyboard handler by dispatching ArrowDown×N + Enter.
   Never edits app.js. */
(function () {
  'use strict';

  var lastEditable = null;

  document.addEventListener('focusin', function (e) {
    if (e.target && e.target.isContentEditable) lastEditable = e.target;
  }, true);

  function findActiveEditable() {
    var a = document.activeElement;
    if (a && a.isContentEditable) return a;
    if (lastEditable && document.body.contains(lastEditable)) return lastEditable;
    var eds = document.querySelectorAll('#editor [contenteditable="true"]');
    return eds.length ? eds[0] : null;
  }

  function fire(el, key) {
    var ev;
    try {
      ev = new KeyboardEvent('keydown', {
        key: key, code: key, keyCode: key === 'Enter' ? 13 : 40,
        which: key === 'Enter' ? 13 : 40,
        bubbles: true, cancelable: true
      });
    } catch (e) {
      ev = document.createEvent('KeyboardEvent');
      ev.initKeyboardEvent('keydown', true, true, window, key, 0, '', false);
    }
    el.dispatchEvent(ev);
  }

  function activate(item) {
    var menu = document.getElementById('slash-menu');
    if (!menu || menu.style.display === 'none') return;

    var all = menu.querySelectorAll('.slash-item');
    var idx = Array.prototype.indexOf.call(all, item);
    if (idx < 0) return;

    var curSel = menu.querySelector('.slash-item.sel');
    var curIdx = curSel ? Array.prototype.indexOf.call(all, curSel) : 0;
    var n = all.length;
    var delta = ((idx - curIdx) % n + n) % n;

    var target = findActiveEditable();
    if (!target) return;
    target.focus();

    for (var i = 0; i < delta; i++) fire(target, 'ArrowDown');
    fire(target, 'Enter');
  }

  function attach() {
    var menu = document.getElementById('slash-menu');
    if (!menu) { setTimeout(attach, 150); return; }
    if (menu.dataset.slashclick) return;
    menu.dataset.slashclick = '1';

    menu.addEventListener('mousedown', function (e) {
      var item = e.target.closest ? e.target.closest('.slash-item') : null;
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      activate(item);
    }, true);

    menu.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.slash-item') : null;
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      if (document.getElementById('slash-menu').style.display !== 'none') {
        activate(item);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();