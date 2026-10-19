/* codeblocks.js â€” standalone add-on: theme picker + wipe button for code blocks.
   Hooks into app.js via MutationObserver + delegated clicks. Never edits app.js. */
(function () {
  'use strict';

  var THEMES = ['term', 'minimal', 'vscode', 'github', 'light', 'paper', 'neon', 'mono'];
  var LS_KEY = 'writeup_code_themes';
  var themes = {};
  try { themes = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { themes = {}; }
  function saveThemes() { try { localStorage.setItem(LS_KEY, JSON.stringify(themes)); } catch (e) {} }

  function injectCSS() {
    if (document.getElementById('codeblocks-css')) return;
    var s = document.createElement('style');
    s.id = 'codeblocks-css';
    s.textContent = [
      /* ---- theme picker + wipe button styles ---- */
      '.code-theme-btn{background:var(--hover);color:var(--muted);border:1px solid var(--border);border-radius:6px;padding:2px 7px;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;line-height:1;margin-left:4px}',
      '.code-theme-btn:hover{color:var(--text);border-color:var(--accent)}',
      '.code-wipe{background:transparent;border:1px solid transparent;color:var(--faint);cursor:pointer;padding:2px 6px;border-radius:6px;font-size:12px;font-family:inherit;height:22px;display:inline-flex;align-items:center;margin-left:4px}',
      '.code-wipe:hover{background:rgba(229,96,110,.16);color:var(--red);border-color:rgba(229,96,110,.35)}',
      /* ---- NEVER hide code-head (keeps buttons reachable) ---- */
      '.block[data-type=code] .code-head{display:flex !important}',
      /* ---- TERM (default) ---- */
      /* ---- MINIMAL ---- */
      '.block[data-type=code][data-theme=minimal] .term-dots{display:none}',
      '.block[data-type=code][data-theme=minimal] .block-content::before{display:none}',
      '.block[data-type=code][data-theme=minimal] .block-content{box-shadow:none}',
      /* ---- VSCODE ---- */
      '.block[data-type=code][data-theme=vscode] .code-head{background:#252526;background-image:none;border-color:#3c3c3c}',
      '.block[data-type=code][data-theme=vscode] .block-content{background:#1e1e1e;color:#d4d4d4;border-color:#3c3c3c;box-shadow:none;font-family:Consolas,Menlo,monospace}',
      '.block[data-type=code][data-theme=vscode] .block-content::before{display:none}',
      '.block[data-type=code][data-theme=vscode] .code-lang{background:rgba(86,156,214,.18);color:#569cd6}',
      /* ---- GITHUB ---- */
      '.block[data-type=code][data-theme=github] .code-head{background:#161b22;background-image:none;border-color:#30363d}',
      '.block[data-type=code][data-theme=github] .term-dots{display:none}',
      '.block[data-type=code][data-theme=github] .block-content{background:#0d1117;color:#c9d1d9;border-color:#30363d;box-shadow:none}',
      '.block[data-type=code][data-theme=github] .block-content::before{display:none}',
      '.block[data-type=code][data-theme=github] .code-lang{background:rgba(88,166,255,.15);color:#58a6ff}',
      /* ---- LIGHT ---- */
      '.block[data-type=code][data-theme=light] .code-head{background:#f6f8fa;background-image:none;border-color:#d0d7de;color:#57606a}',
      '.block[data-type=code][data-theme=light] .term-title{color:#57606a}',
      '.block[data-type=code][data-theme=light] .block-content{background:#f6f8fa;color:#24292f;border-color:#d0d7de;box-shadow:none}',
      '.block[data-type=code][data-theme=light] .block-content::before{color:#0969da}',
      '.block[data-type=code][data-theme=light] .code-lang{background:rgba(9,105,218,.12);color:#0969da}',
      '.block[data-type=code][data-theme=light] .code-copy{color:#57606a}',
      /* ---- PAPER ---- */
      '.block[data-type=code][data-theme=paper] .code-head{background:#fdf6e3;background-image:none;border-color:#d8c9a5}',
      '.block[data-type=code][data-theme=paper] .term-title{color:#657b83}',
      '.block[data-type=code][data-theme=paper] .block-content{background:#fdf6e3;color:#586e75;border-color:#d8c9a8;box-shadow:none}',
      '.block[data-type=code][data-theme=paper] .block-content::before{color:#93a1a1}',
      '.block[data-type=code][data-theme=paper] .code-lang{background:rgba(88,110,117,.12);color:#586e75}',
      '.block[data-type=code][data-theme=paper] .code-copy{color:#657b83}',
      /* ---- NEON ---- */
      '.block[data-type=code][data-theme=neon] .code-head{background:#0a0014;background-image:none;border-color:rgba(255,0,255,.35);color:#ff66ff}',
      '.block[data-type=code][data-theme=neon] .term-title{color:#ff66ff}',
      '.block[data-type=code][data-theme=neon] .block-content{background:#0a0014;color:#00ff9d;border-color:rgba(255,0,255,.35);text-shadow:0 0 6px rgba(0,255,157,.35);box-shadow:none}',
      '.block[data-type=code][data-theme=neon] .block-content::before{color:#ff66ff}',
      '.block[data-type=code][data-theme=neon] .code-lang{background:rgba(255,0,255,.15);color:#ff66ff}',
      /* ---- MONO â€” collapse the chrome, keep the bar visible so buttons work ---- */
      '.block[data-type=code][data-theme=mono] .term-dots,',
      '.block[data-type=code][data-theme=mono] .term-title{display:none !important}',
      '.block[data-type=code][data-theme=mono] .code-head{background:transparent !important;background-image:none !important;border:0 !important;padding:2px 6px !important;justify-content:flex-end}',
      '.block[data-type=code][data-theme=mono] .block-content{border-radius:10px;box-shadow:none}',
      '.block[data-type=code][data-theme=mono] .block-content::before{display:none}',
      /* ---- TRASH MOVED TO LEFT, SIDE-BY-SIDE WITH DRAG HANDLE ---- */
      '.block-del{right:auto !important;left:-58px !important;top:4px !important}',
      '.block::before{content:"" !important;position:absolute !important;left:-64px !important;top:0 !important;bottom:0 !important;width:64px !important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function getBlockId(blk) { return blk.getAttribute('data-id'); }

  function applyTheme(blk, theme) {
    if (THEMES.indexOf(theme) < 0) theme = 'term';
    blk.setAttribute('data-theme', theme);
    var id = getBlockId(blk);
    if (id) { themes[id] = theme; saveThemes(); }
    var tb = blk.querySelector('.code-theme-btn');
    if (tb) tb.title = 'Code style: ' + theme + ' (click to cycle)';
  }

  function cycleTheme(blk) {
    var cur = blk.getAttribute('data-theme') || 'term';
    var i = THEMES.indexOf(cur);
    if (i < 0) i = 0;
    var nxt = THEMES[(i + 1) % THEMES.length];
    applyTheme(blk, nxt);
    var t = document.getElementById('toast');
    if (t) { t.textContent = 'Code style: ' + nxt; t.classList.add('show'); clearTimeout(window.__cbT); window.__cbT = setTimeout(function () { t.classList.remove('show'); }, 1500); }
  }

  function wipeBlock(blk) {
    if (!confirm('Clear this code block?')) return;
    var c = blk.querySelector('.block-content');
    if (c) { c.textContent = ''; c.dispatchEvent(new Event('input', { bubbles: true })); }
    var t = document.getElementById('toast');
    if (t) { t.textContent = 'Cleared'; t.classList.add('show'); clearTimeout(window.__cbT); window.__cbT = setTimeout(function () { t.classList.remove('show'); }, 1500); }
  }

  function decorateBlock(blk) {
    if (!blk || blk.getAttribute('data-type') !== 'code') return;
    var head = blk.querySelector('.code-head');
    if (!head) return;

    var id = getBlockId(blk);
    var saved = (id && themes[id]) || blk.getAttribute('data-theme') || 'term';
    blk.setAttribute('data-theme', saved);

    if (!head.querySelector('.code-theme-btn')) {
      var tb = document.createElement('button');
      tb.type = 'button'; tb.className = 'code-theme-btn';
      tb.title = 'Code style: ' + saved + ' (click to cycle)';
      tb.setAttribute('contenteditable', 'false');
      tb.innerHTML = '<i class="fa-solid fa-palette"></i>';
      head.appendChild(tb);
    }

    if (!head.querySelector('.code-wipe')) {
      var wb = document.createElement('button');
      wb.type = 'button'; wb.className = 'code-wipe';
      wb.title = 'Clear this code block';
      wb.setAttribute('contenteditable', 'false');
      wb.innerHTML = '<i class="fa-solid fa-broom"></i>';
      head.appendChild(wb);
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