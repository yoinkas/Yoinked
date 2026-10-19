'use strict';
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DRAFT_ROOT = path.join(PROJECT_ROOT, 'drafts', 'writeups');
const DATA_DIR = path.join(DRAFT_ROOT, 'data');
const PREVIEW_DIR = path.join(DRAFT_ROOT, 'previews');
const MEDIA_DIR = path.join(DRAFT_ROOT, 'media');
for (const directory of [DATA_DIR, PREVIEW_DIR, MEDIA_DIR]) fs.mkdirSync(directory, { recursive: true });

app.disable('x-powered-by');
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));
app.use('/draft-media', express.static(MEDIA_DIR, { fallthrough: false }));
app.use('/drafts', express.static(path.join(PROJECT_ROOT, 'drafts'), { fallthrough: false }));
app.use('/yoinked', express.static(PROJECT_ROOT, { extensions: ['html'], fallthrough: false }));

function slugify(value) {
  return String(value || 'untitled').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `untitled-${Date.now()}`;
}
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeRichHtml(value) {
  return String(value || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, '');
}
function noteMeta(note) {
  const box = Array.isArray(note.blocks) ? note.blocks.find((block) => block && block.type === 'box') : null;
  return (box && box.box) || {};
}
function noteTitle(note) {
  const title = String(note.title || '').trim();
  const machineName = String(noteMeta(note).name || '').trim();
  return (!title || /^untitled$/i.test(title)) && machineName ? machineName : (title || machineName || 'Untitled writeup');
}
function blockHtml(block) {
  if (!block || typeof block !== 'object') return '';
  const rich = safeRichHtml(block.html);
  switch (block.type) {
    case 'h1': case 'h2': return `<h2>${rich}</h2>`;
    case 'h3': return `<h3>${rich}</h3>`;
    case 'bullet': return `<ul><li>${rich}</li></ul>`;
    case 'numbered': return `<ol><li>${rich}</li></ol>`;
    case 'todo': return `<p>${block.checked ? '&#9745;' : '&#9744;'} ${rich}</p>`;
    case 'quote': return `<blockquote>${rich}</blockquote>`;
    case 'callout': return `<div class="callout"><p>${rich}</p></div>`;
    case 'divider': return '<hr />';
    case 'code': return `<pre><code>${escapeHtml(block.src || '')}</code></pre>`;
    case 'image': {
      const src = String(block.src || '');
      if (!/^(https?:\/\/|\/draft-media\/)/i.test(src)) return '';
      return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(block.caption || '')}" /><figcaption>${escapeHtml(block.caption || '')}</figcaption></figure>`;
    }
    case 'video': case 'embed': case 'link': {
      const url = String(block.url || block.src || '');
      if (!/^https?:\/\//i.test(url)) return '';
      return `<p><a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(block.title || block.caption || url)}</a></p>`;
    }
    case 'box': return '';
    default: return rich ? `<p>${rich}</p>` : '';
  }
}
function renderPreview(note, slug) {
  const meta = noteMeta(note);
  const title = noteTitle(note);
  const content = (Array.isArray(note.blocks) ? note.blocks : []).map(blockHtml).join('\n');
  const cover = /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(String(meta.cover || ''))
    ? `<figure><img src="${meta.cover}" alt="${escapeHtml(title)} cover" /></figure>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" /><title>${escapeHtml(title)} | Yoinked draft</title><link rel="stylesheet" href="../../../assets/styles.css" /></head><body>
<header class="site-header"><div class="container"><a class="logo" href="../../../index.html">Yoinked by Yoinkas</a></div></header>
<main><section class="section"><article class="container post"><p class="meta">${escapeHtml(meta.platform || 'Writeup')} &middot; Draft preview</p>
<h1>${escapeHtml(title)}</h1>${cover}<div class="info-grid"><div><h3>Quick facts</h3><ul><li>Difficulty: ${escapeHtml(meta.difficulty || 'Unspecified')}</li>
<li>OS: ${escapeHtml(meta.os || 'Unspecified')}</li><li>Slug: ${escapeHtml(slug)}</li></ul></div></div>${content}</article></section></main></body></html>`;
}
function atomicWrite(filePath, contents) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, contents, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

const upload = multer({
  storage: multer.diskStorage({ destination: MEDIA_DIR, filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
    callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`);
  }}),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
  fileFilter: (_request, file, callback) => callback(null, /^(image|video)\//.test(file.mimetype)),
});

app.get('/api/config', (_request, response) => response.json({ projectRoot: PROJECT_ROOT, draftRoot: DRAFT_ROOT }));
app.get('/api/writeups', (_request, response) => {
  try {
    const notes = fs.readdirSync(DATA_DIR).filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    response.json(notes);
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: 'Could not load local drafts.' });
  }
});
app.post('/api/save', upload.array('media'), (request, response) => {
  try {
    const note = JSON.parse(request.body.writeup || '{}');
    if (!note || typeof note !== 'object' || !Array.isArray(note.blocks)) return response.status(400).json({ success: false, message: 'Invalid writeup data.' });
    const resolvedTitle = noteTitle(note);
    const slug = slugify(resolvedTitle);
    note.id = String(note.id || `note-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    note.title = resolvedTitle.slice(0, 200);
    note.savedToProjectAt = Date.now(); note.projectSlug = slug;
    if (request.files && request.files.length) note.mediaFiles = request.files.map((file) => ({
      filename: file.filename, originalName: path.basename(file.originalname), mimetype: file.mimetype, path: `/draft-media/${file.filename}`,
    }));
    const jsonPath = path.join(DATA_DIR, `${slug}.json`); const previewPath = path.join(PREVIEW_DIR, `${slug}.html`);
    atomicWrite(jsonPath, `${JSON.stringify(note, null, 2)}\n`); atomicWrite(previewPath, renderPreview(note, slug));
    response.json({ success: true, slug, jsonPath: path.relative(PROJECT_ROOT, jsonPath), previewPath: path.relative(PROJECT_ROOT, previewPath), previewUrl: `/drafts/writeups/previews/${slug}.html` });
  } catch (error) {
    console.error(error); response.status(error instanceof SyntaxError ? 400 : 500).json({ success: false, message: 'Could not save this writeup.' });
  }
});
app.use((error, _request, response, _next) => {
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : (Number(error.status) || 500);
  if (status >= 500) console.error(error);
  response.status(status).json({ success: false, message: status === 404 ? 'Not found.' : (error.message || 'Unexpected server error.') });
});
app.listen(PORT, '127.0.0.1', () => { console.log(`Writeup Studio: http://127.0.0.1:${PORT}`); console.log(`Drafts: ${DRAFT_ROOT}`); });
