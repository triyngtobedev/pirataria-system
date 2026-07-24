App._esc = function(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

App._showOverlay = function(title, bodyHtml) {
  const overlay = document.getElementById('overlay');
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayBody').innerHTML = bodyHtml;
  overlay.classList.add('show');
};

App._closeOverlay = function() {
  document.getElementById('overlay').classList.remove('show');
};

App._serviceOptions = function(selected) {
  return Repos.studio.services.active().map(s =>
    `<option value="${this._esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${this._esc(s.name)}</option>`
  ).join('');
};

App._professionalOptions = function(selected, includeEmpty) {
  const opts = Repos.studio.professionals.active().map(p =>
    `<option value="${this._esc(p.id)}" ${p.id === selected ? 'selected' : ''}>${this._esc(p.displayName)}</option>`
  ).join('');
  return includeEmpty ? '<option value="">—</option>' + opts : opts;
};
