/* ai.js â€” Ollama-powered tagging for WriteUp. */
(function () {
  'use strict';

  var SCHEMA = {
    type: 'object',
    properties: {
      vulnerabilities: { type: 'array', items: { type: 'string' } },
      tools:           { type: 'array', items: { type: 'string' } },
      techniques:      { type: 'array', items: { type: 'string' } },
      services:        { type: 'array', items: { type: 'string' } },
      os:              { type: 'array', items: { type: 'string' } },
      cves:            { type: 'array', items: { type: 'string' } },
      summary:         { type: 'string' }
    },
    required: ['vulnerabilities', 'tools', 'techniques']
  };

  var SYSTEM =
    'You are a cybersecurity writeup tagger. Read the writeup and extract concise canonical tags.\n' +
    'Rules:\n' +
    '- vulnerabilities: lowercase short canonical names. e.g. "sql injection", "command injection", "lfi", "rfi", "ssrf", "xss", "idor", "xxe", "ssti", "rce", "privilege escalation", "buffer overflow", "path traversal", "insecure deserialization", "weak credentials", "default credentials", "log4shell".\n' +
    '- tools: lowercase names actually used. e.g. "nmap", "gobuster", "ffuf", "feroxbuster", "burp", "sqlmap", "metasploit", "hydra", "john", "hashcat", "netcat", "socat", "linpeas", "winpeas", "impacket", "bloodhound", "crackmapexec", "wpscan", "nikto".\n' +
    '- techniques: short lowercase phrases. e.g. "reverse shell", "port forwarding", "pivoting", "suid", "cron", "kerberoasting", "pass-the-hash", "dll hijacking", "unquoted service path", "password spraying", "file upload bypass", "ldap enumeration".\n' +
    '- services: lowercase. e.g. "ssh", "http", "smb", "ftp", "rdp", "smtp", "mysql", "mssql", "redis", "docker", "kubernetes", "ldap".\n' +
    '- os: lowercase, only if obvious: "linux", "windows", "freebsd", "macos".\n' +
    '- cves: any CVE IDs mentioned, uppercase.\n' +
    '- summary: one sentence, max 120 chars.\n' +
    'Only include what is clearly present. Do not invent. Return only JSON.';

  var MAX_CHARS = 14000;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function htmlToText(h) { var d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function hashStr(s) { var h = 5381, i = s.length; while (i) h = ((h * 33) ^ s.charCodeAt(--i)) >>> 0; return h.toString(36); }
  function toast(m) { if (window.WriteUp && window.WriteUp.toast) window.WriteUp.toast(m); else console.log('[ai]', m); }

  function noteToText(n) {
    var parts = ['Title: ' + (n.title || 'Untitled')];
    var bs = n.blocks || [];
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i], t = b.type;
      if (t === 'box' && b.box) parts.push('[Box] name=' + (b.box.name||'') + ' platform=' + (b.box.platform||'') + ' difficulty=' + (b.box.difficulty||'') + ' os=' + (b.box.os||''));
      else if (t === 'code') parts.push('[Code ' + (b.lang||'') + ']\n' + (b.src||''));
      else if (t === 'image') { if (b.caption) parts.push('[Image] ' + htmlToText(b.caption)); }
      else if (t === 'video' || t === 'embed') parts.push('[' + t + '] ' + (b.src||''));
      else if (t === 'link') parts.push('[Link] ' + (b.title||'') + ' ' + (b.url||''));
      else if (b.html) { var x = htmlToText(b.html); if (x) parts.push('[' + t + '] ' + x); }
    }
    var s = parts.join('\n');
    return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) : s;
  }

  function cleanList(a) {
    if (!Array.isArray(a)) return [];
    var seen = {}, out = [];
    for (var i = 0; i < a.length; i++) {
      var s = String(a[i] == null ? '' : a[i]).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
      if (!s || s.length > 40 || seen[s]) continue;
      seen[s] = 1; out.push(s);
    }
    return out;
  }

  function normalize(raw) {
    raw = raw || {};
    var g = {
      vulnerabilities: cleanList(raw.vulnerabilities),
      tools: cleanList(raw.tools),
      techniques: cleanList(raw.techniques),
      services: cleanList(raw.services),
      os: cleanList(raw.os),
      cves: (Array.isArray(raw.cves) ? raw.cves : []).map(function (s) { return String(s||'').toUpperCase().trim(); }).filter(function (s) { return /^CVE-\d{4}-\d+$/i.test(s); })
    };
    var all = [], seen = {};
    var order = ['vulnerabilities','techniques','tools','services','os','cves'];
    for (var i = 0; i < order.length; i++) for (var j = 0; j < g[order[i]].length; j++) { var s = g[order[i]][j]; if (!seen[s]) { seen[s] = 1; all.push(s); } }
    g.all = all;
    return g;
  }

  function analyzeNote(n, force) {
    if (!n) return Promise.reject(new Error('No note'));
    var text = noteToText(n);
    var h = hashStr(text);
    if (!force && n.ai && n.ai.hash === h && n.ai.tags) return Promise.resolve(n.ai);
    return window.Ollama.chatJSON(
      [{ role: 'system', content: SYSTEM }, { role: 'user', content: 'Writeup:\n\n' + text }],
      SCHEMA, { temperature: 0 }
    ).then(function (raw) {
      var tags = normalize(raw);
      n.ai = { tags: tags, summary: tags.summary || '', hash: h, analyzedAt: Date.now(), model: window.Ollama.config.model };
      return n.ai;
    });
  }

  function tagIndex() {
    var notes = window.WriteUp.getNotes() || [];
    var idx = {};
    for (var i = 0; i < notes.length; i++) {
      var t = (notes[i].ai && notes[i].ai.tags && notes[i].ai.tags.all) || [];
      for (var j = 0; j < t.length; j++) { if (!idx[t[j]]) idx[t[j]] = { count: 0 }; idx[t[j]].count++; }
    }
    return idx;
  }

  function setFilter(tag) { window.__tagFilter = tag || null; window.WriteUp.renderNotes(); renderSidebar(); }

  var busyEl = null;
  function setBusy(on, txt) { if (!busyEl) busyEl = document.getElementById('ai-progress'); if (busyEl) { busyEl.style.display = on ? 'inline-flex' : 'none'; busyEl.textContent = txt || ''; } }

  function buildTopbar() {
    if (document.getElementById('ai-menu-btn')) return;
    var right = document.querySelector('.topbar-right'); if (!right) return;
    var w = document.createElement('div'); w.className = 'ai-wrap';
    w.innerHTML =
      '<span class="ai-progress" id="ai-progress" style="display:none"></span>' +
      '<button type="button" class="btn ai-btn" id="ai-menu-btn" title="AI tools"><i class="fa-solid fa-wand-magic-sparkles"></i><span>AI</span><span class="ai-dot" id="ai-dot"></span></button>' +
      '<div class="ai-menu" id="ai-menu" style="display:none">' +
      '<div class="ai-menu-status" id="ai-menu-status">Checking Ollamaâ€¦</div><div class="ai-menu-sep"></div>' +
      '<button type="button" class="ai-menu-item" data-act="one"><i class="fa-solid fa-tag"></i> Analyze this note</button>' +
      '<button type="button" class="ai-menu-item" data-act="all"><i class="fa-solid fa-list-check"></i> Analyze all notes</button>' +
      '<button type="button" class="ai-menu-item" data-act="clear"><i class="fa-solid fa-eraser"></i> Clear tags on this note</button>' +
      '<div class="ai-menu-sep"></div>' +
      '<button type="button" class="ai-menu-item" data-act="settings"><i class="fa-solid fa-gear"></i> Settingsâ€¦</button>' +
      '</div>';
    var nb = document.getElementById('new-note-btn');
    if (nb && nb.parentNode === right) right.insertBefore(w, nb); else right.appendChild(w);
    document.getElementById('ai-menu-btn').addEventListener('click', function (e) {
      e.stopPropagation(); var m = document.getElementById('ai-menu');
      m.style.display = m.style.display === 'block' ? 'none' : 'block';
      refreshStatus();
    });
    document.addEventListener('mousedown', function (e) {
      var m = document.getElementById('ai-menu'); if (!m || m.style.display !== 'block') return;
      if (e.target.closest && e.target.closest('.ai-wrap')) return;
      m.style.display = 'none';
    });
    document.getElementById('ai-menu').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.ai-menu-item') : null; if (!b) return;
      document.getElementById('ai-menu').style.display = 'none'; onAction(b.getAttribute('data-act'));
    });
    refreshDot();
  }

  function refreshDot() {
    var d = document.getElementById('ai-dot'); if (!d) return;
    d.className = 'ai-dot'; d.title = 'Checkingâ€¦';
    window.Ollama.ping().then(function (ok) {
      d.classList.add(ok ? 'on' : 'off'); d.title = ok ? 'Ollama connected' : 'Ollama offline';
    });
  }
  function refreshStatus() {
    var s = document.getElementById('ai-menu-status'); if (!s) return;
    s.textContent = 'Checking Ollamaâ€¦';
    window.Ollama.ping().then(function (ok) {
      s.textContent = ok ? ('Connected Â· ' + window.Ollama.config.model) : 'Ollama offline at ' + window.Ollama.config.base;
      var d = document.getElementById('ai-dot'); if (d) { d.classList.remove('on','off'); d.classList.add(ok ? 'on' : 'off'); }
    });
  }

  function onAction(a) {
    if (a === 'one')    return analyzeCurrent(true);
    if (a === 'all')    return analyzeAll();
    if (a === 'clear')  return clearCurrent();
    if (a === 'settings') return openSettings();
  }

  function analyzeCurrent(force) {
    var c = window.WriteUp.getCurrent(); if (!c) return;
    setBusy(true, 'Analyzingâ€¦');
    analyzeNote(c, !!force)
      .then(function () { window.WriteUp.persist(); window.WriteUp.renderNotes(); renderSidebar(); toast('Tagged ' + ((c.ai.tags.all || []).length) + ' terms'); })
      .catch(function (e) { toast('AI: ' + e.message); })
      .then(function () { setBusy(false); });
  }
  function clearCurrent() {
    var c = window.WriteUp.getCurrent(); if (!c) return;
    delete c.ai; window.WriteUp.persist(); window.WriteUp.renderNotes(); renderSidebar(); toast('Tags cleared');
  }
  function analyzeAll() {
    var notes = window.WriteUp.getNotes() || []; if (!notes.length) return;
    if (!confirm('Analyze ' + notes.length + ' notes with ' + window.Ollama.config.model + '?')) return;
    var i = 0, ok = 0, fail = 0;
    (function step() {
      if (i >= notes.length) { window.WriteUp.persist(); window.WriteUp.renderNotes(); renderSidebar(); setBusy(false); toast('Done: ' + ok + ' tagged' + (fail ? ', ' + fail + ' failed' : '')); return; }
      var n = notes[i++];
      setBusy(true, i + '/' + notes.length + 'â€¦');
      analyzeNote(n).then(function () { ok++; }).catch(function (e) { fail++; console.warn(n.title, e); }).then(function () { window.WriteUp.persist(); window.WriteUp.renderNotes(); renderSidebar(); setTimeout(step, 40); });
    })();
  }

  function buildSidebar() {
    if (document.getElementById('ai-tags-section')) return;
    var sb = document.getElementById('sidebar'); if (!sb) return;
    var s = document.createElement('div');
    s.className = 'ai-tags-section'; s.id = 'ai-tags-section';
    s.innerHTML = '<div class="ai-tags-head"><span class="ai-tags-title">Techniques</span><span class="ai-tags-count" id="ai-tags-count">0</span><button type="button" class="ai-tags-clear" id="ai-tags-clear" title="Clear" style="display:none">clear</button></div><div class="ai-tags-list" id="ai-tags-list"></div>';
    var search = sb.querySelector('.side-search');
    if (search && search.parentNode) search.parentNode.insertBefore(s, search.nextSibling); else sb.insertBefore(s, sb.firstChild);
    document.getElementById('ai-tags-clear').addEventListener('click', function (e) { e.stopPropagation(); setFilter(null); });
    document.getElementById('ai-tags-list').addEventListener('click', function (e) {
      var r = e.target.closest ? e.target.closest('.ai-tag-row') : null; if (!r) return;
      var t = r.getAttribute('data-tag'); setFilter(window.__tagFilter === t ? null : t);
    });
  }

  function renderSidebar() {
    var list = document.getElementById('ai-tags-list'); if (!list) return;
    var idx = tagIndex();
    var keys = Object.keys(idx).sort(function (a, b) { return (idx[b].count - idx[a].count) || a.localeCompare(b); });
    var cEl = document.getElementById('ai-tags-count'); if (cEl) cEl.textContent = keys.length;
    var clEl = document.getElementById('ai-tags-clear'); if (clEl) clEl.style.display = window.__tagFilter ? 'inline-block' : 'none';
    if (!keys.length) { list.innerHTML = '<div class="ai-tags-empty">No tags yet. Use AI â†’ Analyze all notes.</div>'; return; }
    var html = '';
    for (var i = 0; i < keys.length; i++) html += '<div class="ai-tag-row' + (window.__tagFilter === keys[i] ? ' on' : '') + '" data-tag="' + esc(keys[i]) + '"><span class="ai-tag-name">' + esc(keys[i]) + '</span><span class="ai-tag-n">' + idx[keys[i]].count + '</span></div>';
    list.innerHTML = html;
  }

  function openSettings() {
    var prev = document.getElementById('ai-settings'); if (prev) prev.remove();
    var c = window.Ollama.config;
    var back = document.createElement('div'); back.className = 'modal-back'; back.id = 'ai-settings'; back.style.display = 'flex';
    back.innerHTML = '<div class="modal"><div class="modal-head"><div><h2>AI settings</h2><p>Connect to your local Ollama instance</p></div><button type="button" class="modal-x" id="ai-set-x"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<label class="m-field">Ollama base URL<input id="ai-base" autocomplete="off"></label>' +
      '<label class="m-field">Model<select id="ai-model"><option>(loadingâ€¦)</option></select></label>' +
      '<div class="m-err" id="ai-set-err" style="display:none"></div>' +
      '<div class="m-actions"><button type="button" class="btn" id="ai-test">Test</button><button type="button" class="btn" id="ai-set-cancel">Cancel</button><button type="button" class="btn primary" id="ai-set-save">Save</button></div></div>';
    document.body.appendChild(back);
    document.getElementById('ai-base').value = c.base;
    function err(m) { var e = document.getElementById('ai-set-err'); if (!e) return; if (!m) { e.style.display = 'none'; return; } e.style.display = 'block'; e.textContent = m; }
    function load() {
      var s = document.getElementById('ai-model'); s.innerHTML = '<option>(loadingâ€¦)</option>';
      window.Ollama.listModels().then(function (list) {
        s.innerHTML = '';
        if (!list.length) { s.innerHTML = '<option>(no models)</option>'; return; }
        for (var i = 0; i < list.length; i++) { var o = document.createElement('option'); o.value = list[i]; o.textContent = list[i]; if (list[i] === c.model) o.selected = true; s.appendChild(o); }
      }).catch(function (e) { s.innerHTML = '<option>(unreachable)</option>'; err(e.message); });
    }
    load();
    function close() { back.remove(); }
    document.getElementById('ai-set-x').onclick = close;
    document.getElementById('ai-set-cancel').onclick = close;
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    document.getElementById('ai-test').onclick = function () {
      err(''); window.Ollama.setConfig({ base: document.getElementById('ai-base').value.trim() || c.base });
      window.Ollama.ping(3000).then(function (ok) { if (ok) { err(''); load(); } else err('Unreachable'); });
    };
    document.getElementById('ai-set-save').onclick = function () {
      var b = document.getElementById('ai-base').value.trim(); var m = document.getElementById('ai-model').value;
      if (!b) { err('Base URL required'); return; }
      window.Ollama.setConfig({ base: b, model: m || c.model }); close(); refreshDot();
    };
  }

  function init() {
    if (!window.Ollama || !window.WriteUp) { setTimeout(init, 200); return; }
    buildTopbar(); buildSidebar(); renderSidebar();
    window.WriteUp.getNotes().forEach(function (n) { if (n.ai && n.ai.tags) {} });
    setInterval(refreshDot, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 400);

  window.AI = { analyze: analyzeNote, analyzeAll: analyzeAll, index: tagIndex, setFilter: setFilter };
})();
