// ─── Signature Pad ───
App._sigCanvas = null;
App._sigCtx = null;
App._sigDrawing = false;
App._sigCallback = null;

App._openSignature = function(title, currentSig, callback) {
  this._sigCallback = callback;
  this._showOverlay(title || 'Assinatura', '<p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:12px;">Assine utilizando o mouse, touch ou caneta.</p><div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:12px;background:#fff;"><canvas id="sigCanvas" width="400" height="150" style="display:block;width:100%;height:150px;cursor:crosshair;touch-action:none;"></canvas></div><div class="flex gap-8" style="margin-bottom:12px;"><button class="btn btn-sm" onclick="App._clearSignature()">Limpar</button></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmSignature()">Confirmar assinatura</button></div>');

  var canvas = document.getElementById('sigCanvas');
  var rect = canvas.getBoundingClientRect();

  // Scale canvas to device pixels for sharp rendering
  var dpr = window.devicePixelRatio || 1;
  canvas.width = (rect.width || 400) * dpr;
  canvas.height = 150 * dpr;
  canvas.style.width = (rect.width || 400) + 'px';
  canvas.style.height = '150px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Restore existing signature if any
  if (currentSig) {
    var img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0, rect.width || 400, 150);
    };
    img.src = currentSig;
  }

  function getPos(e) {
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX || (e.touches && e.touches[0].clientX)) - r.left;
    var y = (e.clientY || (e.touches && e.touches[0].clientY)) - r.top;
    return { x: Math.max(0, Math.min(x, r.width)), y: Math.max(0, Math.min(y, 150)) };
  }

  function start(e) {
    e.preventDefault();
    App._sigDrawing = true;
    var p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e) {
    e.preventDefault();
    if (!App._sigDrawing) return;
    var p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end(e) {
    e.preventDefault();
    App._sigDrawing = false;
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end, { passive: false });

  this._sigCanvas = canvas;
  this._sigCtx = ctx;
};

App._clearSignature = function() {
  if (!this._sigCtx || !this._sigCanvas) return;
  var dpr = window.devicePixelRatio || 1;
  this._sigCtx.fillStyle = '#fff';
  this._sigCtx.fillRect(0, 0, this._sigCanvas.width / dpr, 150);
};

App._confirmSignature = function() {
  if (!this._sigCanvas) return;
  var dataUrl = this._sigCanvas.toDataURL('image/png');
  // Check if signature is empty (all white)
  var isEmpty = true;
  var ctx = this._sigCtx;
  if (ctx) {
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(this._sigCanvas.width / dpr);
    var imageData = ctx.getImageData(0, 0, w, 150);
    for (var i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) { isEmpty = false; break; }
    }
  }
  if (isEmpty) { App._toast('Desenhe a assinatura antes de confirmar.', 'warning'); return; }
  this._closeOverlay();
  if (this._sigCallback) this._sigCallback(dataUrl);
  this._sigCanvas = null;
  this._sigCtx = null;
};
