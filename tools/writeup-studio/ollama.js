/* ollama.js — minimal Ollama REST client. No deps. */
(function () {
  'use strict';
  var cfg = { base: 'http://localhost:11434', model: 'qwen2.5:3b', temperature: 0 };
  try { var s = localStorage.getItem('writeup_ollama_cfg'); if (s) { var p = JSON.parse(s); for (var k in p) if (p[k] != null) cfg[k] = p[k]; } } catch (e) {}
  function save() { try { localStorage.setItem('writeup_ollama_cfg', JSON.stringify(cfg)); } catch (e) {} }
  function url(p) { return String(cfg.base || '').replace(/\/+$/, '') + p; }
  function friendly(e) {
    var m = (e && e.message) || String(e || '');
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return new Error('Cannot reach Ollama at ' + cfg.base + ' — running? If yes, set OLLAMA_ORIGINS to include ' + location.origin + ' and restart Ollama.');
    if (/HTTP 403/.test(m)) return new Error('Ollama blocked this origin (403). Add ' + location.origin + ' to OLLAMA_ORIGINS and restart Ollama.');
    if (/HTTP 404/.test(m)) return new Error('Ollama does not have the model "' + cfg.model + '". Pull it with: ollama pull ' + cfg.model);
    return e instanceof Error ? e : new Error(m);
  }
  /* prefer small, fast, instruct-tuned models that are actually installed */
  var PREFERRED = ['llama3.2:3b', 'llama3.2', 'llama3:8b', 'llama3', 'qwen2.5:3b', 'qwen2.5', 'mistral', 'gemma3', 'phi3', 'tinyllama'];
  function pickModel(list) {
    if (!list || !list.length) return null;
    for (var i = 0; i < PREFERRED.length; i++) {
      for (var j = 0; j < list.length; j++) {
        if (list[j] === PREFERRED[i] || list[j].indexOf(PREFERRED[i] + ':') === 0) return list[j];
      }
    }
    return list[0];
  }
  function req(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: {} };
    if (opts.body != null) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    return fetch(url(path), init).then(function (r) { if (!r.ok) throw new Error('Ollama HTTP ' + r.status); return r.json(); }).catch(function (e) { throw friendly(e); });
  }
  window.Ollama = {
    get config() { return cfg; },
    setConfig: function (patch) { for (var k in patch) if (patch[k] != null) cfg[k] = patch[k]; save(); },
    ensureModel: function () {
      return this.listModels().then(function (list) {
        if (!list || !list.length) return cfg.model;
        for (var i = 0; i < list.length; i++) if (list[i] === cfg.model) return cfg.model;
        var picked = pickModel(list);
        if (picked) { cfg.model = picked; save(); }
        return cfg.model;
      }).catch(function () { return cfg.model; });
    },
    ping: function (ms) {
      ms = ms || 2500;
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms);
      var init = ctl ? { signal: ctl.signal } : {};
      return fetch(url('/api/tags'), init).then(function (r) { clearTimeout(t); return r.ok; }).catch(function () { clearTimeout(t); return false; });
    },
    listModels: function () { return req('/api/tags').then(function (d) { return (d.models || []).map(function (m) { return m.name; }).sort(); }); },
    chat: function (messages, opts) {
      opts = opts || {};
      var body = { model: opts.model || cfg.model, messages: messages, stream: false, options: { temperature: opts.temperature == null ? cfg.temperature : opts.temperature, num_ctx: opts.num_ctx || 8192 } };
      if (opts.format) body.format = opts.format;
      return req('/api/chat', { method: 'POST', body: body }).catch(function (e) {
        /* model missing -> fall back to one that is actually installed, then retry once */
        if (!/HTTP 404/.test(e.message || '')) throw e;
        return this.ensureModel().then(function (m) {
          if (!m || m === body.model) throw e;
          body.model = m;
          return req('/api/chat', { method: 'POST', body: body });
        });
      }).then(function (d) { return (d.message && d.message.content) || ''; });
    },
    chatJSON: function (messages, schema, opts) {
      opts = opts || {};
      var msgs = messages.slice();
      var last = msgs[msgs.length - 1];
      if (last && last.role === 'user') msgs[msgs.length - 1] = { role: 'user', content: last.content + '\n\nRespond with ONLY valid JSON matching this schema:\n' + JSON.stringify(schema) };
      var o = {}; for (var k in opts) o[k] = opts[k]; o.format = schema;
      return this.chat(msgs, o).then(function (raw) {
        var t = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        try { return JSON.parse(t); } catch (e1) { var m = t.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch (e2) {} } throw new Error('Model did not return valid JSON'); }
      });
    }
  };
})();