/* codeblocks.js — add-on: colour themes + wipe button for code blocks.
   Hooks into app.js via MutationObserver + delegated clicks. Never edits app.js. */
(function () {
  'use strict';

  var THEMES = ['code', 'term', 'vscode', 'github', 'light', 'paper', 'neon', 'mono'];
  var LS_KEY = 'writeup_code_themes';
  var themes = {};
  try { themes = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { themes = {}; }
  function saveThemes() { try { localStorage.setItem(LS_KEY, JSON.stringify(themes)); } catch (e) {} }

  function injectCSS() {
    if (document.getElementById('codeblocks-css')) return;
    var s = document.createElement('style');
    s.id = 'codeblocks-css';
    s.textContent = [
      /* keep the header reachable regardless of theme */
      '.block[data-type=code] .code-head{display:flex !important}',
      /* theme + wipe buttons live in the tools cluster */
      '.code-tools .code-theme-btn{background:transparent;border:0;color:var(--faint);cursor:pointer;width:26px;height:24px;border-radius:var(--r-xs);font-size:11.5px;display:inline-flex;align-items:center;justify-content:center;padding:0}',
      '.code-tools .code-theme-btn:hover{background:var(--hover);color:var(--accent)}',
      '.code-tools .code-wipe{background:transparent;border:0;color:var(--faint);cursor:pointer;width:26px;height:24px;border-radius:var(--r-xs);font-size:11.5px;display:inline-flex;align-items:center;justify-content:center;padding:0}',
      '.code-tools .code-wipe:hover{background:rgba(229,96,110,.16);color:var(--red)}',
      /* never let the code area collapse */
      '.block[data-type=code] .block-content{min-height:38px !important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function getBlockId(blk) { return blk.getAttribute('data-id'); }

  function applyTheme(blk, theme) {
    if (THEMES.indexOf(theme) < 0) theme = 'code';
    blk.setAttribute('data-theme', theme);
    var id = getBlockId(blk);
    if (id) { themes[id] = theme; saveThemes(); }
    var tb = blk.querySelector('.code-theme-btn');
    if (tb) tb.title = 'Code style: ' + theme + ' (click to cycle)';
  }

  function cycleTheme(blk) {
    var cur = blk.getAttribute('data-theme') || 'code';
    var i = THEMES.indexOf(cur);
    if (i < 0) i = 0;
    var nxt = THEMES[(i + 1) % THEMES.length];
    applyTheme(blk, nxt);
    toast('Code style: ' + nxt);
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__cbT);
    window.__cbT = setTimeout(function () { t.classList.remove('show'); }, 1500);
  }

  function wipeBlock(blk) {
    if (!confirm('Clear this code block?')) return;
    var c = blk.querySelector('.block-content');
    if (c) { c.textContent = ''; c.dispatchEvent(new Event('input', { bubbles: true })); }
    toast('Cleared');
  }

  function decorateBlock(blk) {
    if (!blk || blk.getAttribute('data-type') !== 'code') return;
    var head = blk.querySelector('.code-head');
    if (!head) return;

    var id = getBlockId(blk);
    var saved = (id && themes[id]) || blk.getAttribute('data-theme') || 'code';
    blk.setAttribute('data-theme', saved);

    var tools = blk.querySelector('.code-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'code-tools';
      head.appendChild(tools);
    }
    if (!tools.querySelector('.code-theme-btn')) {
      var tb = document.createElement('button');
      tb.type = 'button'; tb.className = 'code-theme-btn';
      tb.title = 'Code style: ' + saved + ' (click to cycle)';
      tb.setAttribute('contenteditable', 'false');
      tb.innerHTML = '<i class="fa-solid fa-palette"></i>';
      tools.insertBefore(tb, tools.firstChild);
    }
    if (!tools.querySelector('.code-wipe')) {
      var wb = document.createElement('button');
      wb.type = 'button'; wb.className = 'code-wipe';
      wb.title = 'Clear this code block';
      wb.setAttribute('contenteditable', 'false');
      wb.innerHTML = '<i class="fa-solid fa-broom"></i>';
      tools.appendChild(wb);
    }
  }

  function scanAll() {
    var all = document.querySelectorAll('.block[data-type=code]');
    for (var i = 0; i < all.length; i++) decorateBlock(all[i]);
  }

  document.addEventListener('mousedown', function (e) {
    if (!e.target.closest) return;
    if (e.target.closest('.code-theme-btn') || e.target.closest('.code-wipe')) {
      e.preventDefault(); e.stopPropagation();
    }
  }, true);

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var blk = e.target.closest('.block[data-type=code]');
    if (!blk) return;
    if (e.target.closest('.code-theme-btn')) { e.preventDefault(); e.stopPropagation(); cycleTheme(blk); return; }
    if (e.target.closest('.code-wipe')) { e.preventDefault(); e.stopPropagation(); wipeBlock(blk); return; }
  }, true);

  function init() {
    injectCSS();
    var editor = document.getElementById('editor');
    if (!editor) { setTimeout(init, 150); return; }
    new MutationObserver(function () { setTimeout(scanAll, 30); })
      .observe(editor, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-id', 'data-theme'] });
    scanAll();
    setTimeout(scanAll, 400);
    setTimeout(scanAll, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
