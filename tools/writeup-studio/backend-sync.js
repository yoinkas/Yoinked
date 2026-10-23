/* backend-sync.js — mirrors the active writeup to the local server (server.js)
   and pulls writeups written by other machines back into the browser store.
   Never blocks the UI: failures are logged, never surfaced as errors. */
(function () {
  'use strict';

  var KEY = 'writeup_notes_v4';
  var timer = null;
  var lastError = 0;

  function setDiskState(state, msg) {
    var el = document.getElementById('disk-state');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'disk-state ' + (state || '');
  }

  function sync(value) {
    var notes;
    try { notes = JSON.parse(value); } catch (e) { return; }
    if (!Array.isArray(notes) || !notes.length) return;
    var sorted = notes.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    var latest = sorted[0];
    if (!latest) return;
    var fd = new FormData();
    fd.append('writeup', JSON.stringify(latest));
    setDiskState('syncing', 'Saving to disk…');
    fetch('/api/save', { method: 'POST', body: fd })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.success) setDiskState('ok', 'Saved to disk');
        else setDiskState('err', 'Disk sync failed');
      })
      .catch(function () {
        if (Date.now() - lastError > 8000) { setDiskState('err', 'Server offline'); }
        lastError = Date.now();
      });
  }

  function schedule(value) {
    clearTimeout(timer);
    timer = setTimeout(function () { sync(value); }, 1500);
  }

  function install() {
    var proto = window.Storage && window.Storage.prototype;
    if (!proto || proto.__writeupPatched) return;
    var orig = proto.setItem;
    proto.setItem = function (key, value) {
      if (key === KEY) {
        try { orig.call(this, key, value); }
        catch (e) { console.warn('[backend-sync] localStorage full — relying on disk sync'); }
        schedule(value);
        return;
      }
      return orig.call(this, key, value);
    };
    proto.__writeupPatched = true;
  }

  function pull() {
    setTimeout(function () {
      fetch('/api/writeups').then(function (r) { return r.ok ? r.json() : null; })
        .then(function (list) {
          if (!list || !list.length) return;
          if (window.WriteUp && window.WriteUp.mergeNotes) {
            var added = window.WriteUp.mergeNotes(list);
            if (added) console.log('[backend-sync] merged ' + added + ' writeup(s) from disk');
          }
        })
        .catch(function () {});
    }, 1500);
  }

  function init() {
    install();
    pull();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.WriteUpBackend = { sync: sync, setDiskState: setDiskState };
})();
