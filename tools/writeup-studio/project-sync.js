(function () {
  'use strict';
  var button = document.getElementById('btn-save-disk');
  var status = document.getElementById('project-path');
  var syncing = false;
  if (button) button.innerHTML = '<i class="fa-solid fa-folder-plus"></i><span>Add to Yoinked</span>';
  var toolsButton = document.getElementById('custom-tools-btn');
  if (toolsButton) toolsButton.innerHTML = '<i class="fa-solid fa-ellipsis"></i><span>More</span>';
  function newestLocalNote() {
    try {
      var notes = JSON.parse(localStorage.getItem('writeup_notes_v4') || '[]');
      if (!Array.isArray(notes) || !notes.length) return null;
      return notes.slice().sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); })[0];
    } catch (_error) { return null; }
  }
  function show(message, isError) { if (status) { status.textContent = message; status.classList.toggle('project-error', Boolean(isError)); } }
  async function saveToProject(event) {
    if (event) event.preventDefault(); if (syncing) return;
    var note = newestLocalNote(); if (!note) return show('Nothing to save yet.', true);
    syncing = true; if (button) button.setAttribute('aria-busy', 'true'); show('Saving project draft...');
    try {
      var form = new FormData(); form.append('writeup', JSON.stringify(note));
      var response = await fetch('/api/save', { method: 'POST', body: form }); var result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Save failed');
      show('Saved: ' + result.previewPath);
    } catch (error) { show('Project save failed. Start with npm run serve.', true); console.error(error); }
    finally { syncing = false; if (button) button.removeAttribute('aria-busy'); }
  }
  if (button) button.addEventListener('click', saveToProject);
  fetch('/api/config').then(function (response) { return response.ok ? response.json() : Promise.reject(); })
    .then(function (config) { show('Drafts: ' + config.draftRoot); })
    .catch(function () { show('Browser-only mode. Run npm run serve to save into Yoinked.', true); });
})();
