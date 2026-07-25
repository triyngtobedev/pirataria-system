App._dirtyCount = 0;

App._markDirty = function() { this._dirtyCount++; };
App._markClean = function() { this._dirtyCount = 0; };
App._isDirty = function() { return this._dirtyCount > 0; };

App._checkDirty = function(callback) {
  if (!this._isDirty()) { if (callback) callback(); return; }
  this._confirm('Existem altera\u00e7\u00f5es n\u00e3o salvas. Deseja realmente sair?', function() {
    App._markClean();
    if (callback) callback();
  });
};

window.addEventListener('beforeunload', function(e) {
  if (App._isDirty()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

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
  // Track dirty state on input/change events inside overlays
  setTimeout(function() {
    overlay.querySelectorAll('input, select, textarea').forEach(function(el) {
      el.addEventListener('input', function() { App._markDirty(); });
      el.addEventListener('change', function() { App._markDirty(); });
    });
  }, 10);
};

App._closeOverlay = function() {
  document.getElementById('overlay').classList.remove('show');
  App._markClean();
};

App._loadingEl = null;
App._loadingCount = 0;

App._showLoading = function(msg) {
  this._loadingCount++;
  if (this._loadingCount > 1) return;
  if (!this._loadingEl) {
    this._loadingEl = document.createElement('div');
    this._loadingEl.className = 'loading-overlay show';
    this._loadingEl.innerHTML = '<div class="loading-box"><div class="loading-spinner-inline"></div><span class="loading-msg">' + this._esc(msg || 'Carregando...') + '</span></div>';
    document.body.appendChild(this._loadingEl);
  }
};

App._hideLoading = function() {
  this._loadingCount = Math.max(0, this._loadingCount - 1);
  if (this._loadingCount === 0 && this._loadingEl) {
    this._loadingEl.remove();
    this._loadingEl = null;
  }
};

App._withLoading = function(buttonId, msg, fn) {
  const btn = buttonId ? document.getElementById(buttonId) : null;
  if (btn) btn.disabled = true;
  this._showLoading(msg);
  try {
    const result = fn();
    this._hideLoading();
    if (btn) btn.disabled = false;
    return result;
  } catch (err) {
    this._hideLoading();
    if (btn) btn.disabled = false;
    App._toast('Erro: ' + (err.message || 'operação falhou'), 'error');
    throw err;
  }
};

App._locks = {};

App._withGuard = function(key, fn) {
  if (this._locks[key]) return;
  this._locks[key] = true;
  try {
    const result = fn();
    this._locks[key] = false;
    return result;
  } catch (err) {
    this._locks[key] = false;
    throw err;
  }
};

App._guardOverlay = function(btn, fn) {
  if (this._locks['overlay']) return;
  this._locks['overlay'] = true;
  if (btn) btn.disabled = true;
  try {
    fn();
  } catch (err) {
    App._toast('Erro: ' + (err.message || 'operação falhou'), 'error');
  } finally {
    this._locks['overlay'] = false;
    if (btn) btn.disabled = false;
  }
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
