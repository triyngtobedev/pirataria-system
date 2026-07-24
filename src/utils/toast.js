App._toast = function(message, type) {
  type = type || 'info';
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3500);
};

App._confirmCallback = null;

App._confirm = function(message, callback) {
  this._confirmCallback = callback;
  this._showOverlay('Confirmação', `
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">${this._esc(message)}</p>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App._doConfirm()">Confirmar</button>
    </div>
  `);
};

App._doConfirm = function() {
  this._closeOverlay();
  if (typeof this._confirmCallback === 'function') {
    this._confirmCallback();
    this._confirmCallback = null;
  }
};
