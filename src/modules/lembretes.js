App.renderLembretes = function() {
  const el = document.getElementById('moduleContent');
  const list = DB.getLembretes();
  const users = DB.getUsers().filter(u => u.active);
  el.innerHTML = `
    <div class="rp-controls">
      <div class="rp-filters">
        <input type="text" id="lemSearch" placeholder="Buscar por título..." oninput="App._filterLems()" style="width:170px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
        <select id="lemStatusFilter" onchange="App._filterLems()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="completed">Concluído</option>
        </select>
        <select id="lemPriorityFilter" onchange="App._filterLems()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todas prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="App._showAddLembrete()">+ Novo</button>
      </div>
    </div>
    <div id="lemList">${this._renderLemList(list)}</div>`;
};

App._filterLems = function() {
  let list = DB.getLembretes();
  const s = (document.getElementById('lemSearch').value || '').trim().toLowerCase();
  const st = document.getElementById('lemStatusFilter').value;
  const pr = document.getElementById('lemPriorityFilter').value;
  if (s) list = list.filter(l => l.title.toLowerCase().includes(s));
  if (st) list = list.filter(l => l.status === st);
  if (pr) list = list.filter(l => l.priority === pr);
  document.getElementById('lemList').innerHTML = this._renderLemList(list);
};

App._renderLemList = function(list) {
  if (list.length === 0) return L.empty('Nenhum lembrete encontrado.');
  const today = DB._today();
  const priorityLabels = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  const priorityClasses = { high: 'badge-cancelled', medium: 'badge-scheduled', low: 'badge-completed' };
  const statusLabels = { pending: 'Pendente', completed: 'Concluído' };
  const statusClasses = { pending: 'badge-scheduled', completed: 'badge-completed' };

  return '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Título</th><th>Prioridade</th><th>Responsável</th><th>Cliente</th><th>Status</th><th></th></tr></thead><tbody>' +
    list.map(l => {
      const isLate = l.status === 'pending' && l.date < today;
      const rowCls = isLate ? ' style="background:rgba(185,28,28,0.04);"' : '';
      const clientLink = l.clientId ? '<button class="btn btn-sm" onclick="App.navigate(\'clientes\');setTimeout(function(){App.openClientPanel(\'' + l.clientId + '\')},120)" style="font-size:0.7rem;padding:2px 6px;color:var(--gold);border-color:transparent;">' + App._esc(l.clientName) + '</button>' : (l.clientName ? App._esc(l.clientName) : '—');
      return '<tr' + rowCls + '><td class="text-muted text-sm">' + l.date + (isLate ? ' <span style="color:#f87171;">!</span>' : '') + '</td><td><strong>' + App._esc(l.title) + '</strong>' + (l.description ? '<br><span class="text-muted text-sm">' + App._esc(l.description) + '</span>' : '') + '</td><td>' + C.badge(priorityLabels[l.priority] || l.priority, l.priority) + '</td><td class="text-sm">' + App._esc(l.responsible || '—') + '</td><td class="text-sm">' + clientLink + '</td><td>' + C.badge(statusLabels[l.status] || l.status, l.status) + '</td><td><div class="actions">' + (l.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="App._completeLembrete(\'' + l.id + '\')">Concluir</button>' : '') + '<button class="btn btn-sm" onclick="App._editLembrete(\'' + l.id + '\')">Editar</button><button class="btn btn-sm btn-danger" onclick="App._deleteLembrete(\'' + l.id + '\')">Remover</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
};

App._showAddLembrete = function() {
  const clients = DB.getClients();
  const users = DB.getUsers().filter(u => u.active);
  this._showOverlay('Novo lembrete', `
    <div class="form-group"><label>Título *</label><input type="text" id="lemTitle"></div>
    <div class="form-group"><label>Descrição</label><textarea id="lemDesc" rows="2"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Data *</label><input type="date" id="lemDate" value="${DB._today()}"></div>
      <div class="form-group"><label>Hora</label><input type="time" id="lemTime" value="12:00"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Prioridade</label>
        <select id="lemPriority"><option value="low">Baixa</option><option value="medium" selected>Média</option><option value="high">Alta</option></select>
      </div>
      <div class="form-group"><label>Responsável</label>
        <select id="lemResponsible"><option value="">—</option>${users.map(u => '<option value="' + App._esc(u.name) + '">' + App._esc(u.name) + '</option>').join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Cliente (opcional)</label>
      <select id="lemClient"><option value="">—</option>${clients.map(c => '<option value="' + c.id + '">' + App._esc(c.name) + '</option>').join('')}</select>
    </div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._addLembrete()">Salvar</button></div>
  `);
};

App._addLembrete = function() {
  const title = document.getElementById('lemTitle').value.trim();
  if (!title) return;
  const clientSel = document.getElementById('lemClient');
  const clientId = clientSel.value || null;
  const clientName = clientId ? (Repos.clientes.list().find(c => c.id === clientId) || {}).name : '';
  DB.addLembrete({ title, description: document.getElementById('lemDesc').value.trim(), date: document.getElementById('lemDate').value, time: document.getElementById('lemTime').value, priority: document.getElementById('lemPriority').value, responsible: document.getElementById('lemResponsible').value, clientId, clientName });
  Audit.action('create', 'lembretes', '', 'Lembrete: ' + title);
  this._closeOverlay(); App._toast('Lembrete criado.', 'success'); this.renderLembretes();
};

App._editLembrete = function(id) {
  const l = DB.getLembrete(id); if (!l) return;
  const clients = DB.getClients(); const users = DB.getUsers().filter(u => u.active);
  this._showOverlay('Editar lembrete', `
    <div class="form-group"><label>Título *</label><input type="text" id="lemTitle" value="${this._esc(l.title)}"></div>
    <div class="form-group"><label>Descrição</label><textarea id="lemDesc" rows="2">${this._esc(l.description)}</textarea></div>
    <div class="form-row"><div class="form-group"><label>Data *</label><input type="date" id="lemDate" value="${l.date}"></div><div class="form-group"><label>Hora</label><input type="time" id="lemTime" value="${l.time}"></div></div>
    <div class="form-row"><div class="form-group"><label>Prioridade</label><select id="lemPriority"><option value="low" ${l.priority === 'low' ? 'selected' : ''}>Baixa</option><option value="medium" ${l.priority === 'medium' ? 'selected' : ''}>Média</option><option value="high" ${l.priority === 'high' ? 'selected' : ''}>Alta</option></select></div>
    <div class="form-group"><label>Responsável</label><select id="lemResponsible"><option value="">—</option>${users.map(u => '<option value="' + App._esc(u.name) + '"' + (u.name === l.responsible ? ' selected' : '') + '>' + App._esc(u.name) + '</option>').join('')}</select></div></div>
    <div class="form-group"><label>Cliente</label><select id="lemClient"><option value="">—</option>${clients.map(c => '<option value="' + c.id + '"' + (c.id === l.clientId ? ' selected' : '') + '>' + App._esc(c.name) + '</option>').join('')}</select></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._doEditLembrete('${id}')">Salvar</button></div>
  `);
};

App._doEditLembrete = function(id) {
  const title = document.getElementById('lemTitle').value.trim(); if (!title) return;
  const clientSel = document.getElementById('lemClient'); const clientId = clientSel.value || null;
  const clientName = clientId ? (Repos.clientes.list().find(c => c.id === clientId) || {}).name : '';
  DB.updateLembrete(id, { title, description: document.getElementById('lemDesc').value.trim(), date: document.getElementById('lemDate').value, time: document.getElementById('lemTime').value, priority: document.getElementById('lemPriority').value, responsible: document.getElementById('lemResponsible').value, clientId, clientName });
  Audit.action('update', 'lembretes', id, 'Lembrete editado: ' + title);
  this._closeOverlay(); App._toast('Lembrete atualizado.', 'success'); this.renderLembretes();
};

App._completeLembrete = function(id) {
  DB.updateLembrete(id, { status: 'completed' });
  Audit.action('complete', 'lembretes', id, 'Lembrete concluído');
  this.renderLembretes();
  EventBus.emit('meudia.updated');
};

App._deleteLembrete = function(id) {
  App._confirm('Remover este lembrete?', function() {
    Audit.action('delete', 'lembretes', id, 'Lembrete removido');
    DB.deleteLembrete(id);
    App.renderLembretes();
  });
};

// ─── Painel de lembretes (usado no módulo inicial) ───
App._renderLembretePanel = function() {
  const today = DB._today();
  const all = DB.getLembretes();
  const pending = all.filter(l => l.status === 'pending');
  const todayLems = pending.filter(l => l.date === today);
  const lateLems = pending.filter(l => l.date < today);
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  if (pending.length === 0) return '';

  const topLems = [...lateLems, ...todayLems].sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)).slice(0, 5);

  let html = '<div class="rp-section"><div class="section-title">Lembretes</div><div class="rp-grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr));">';
  html += '<div class="rp-card rp-card-red"><span class="rp-num">' + lateLems.length + '</span><span class="rp-lbl">Atrasados</span></div>';
  html += '<div class="rp-card rp-card-yellow"><span class="rp-num">' + todayLems.length + '</span><span class="rp-lbl">Hoje</span></div>';
  html += '<div class="rp-card"><span class="rp-num">' + pending.length + '</span><span class="rp-lbl">Pendentes</span></div>';
  html += '</div>';

  if (topLems.length > 0) {
    html += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">';
    topLems.forEach(l => {
      const pCls = { high: 'color:#f87171;', medium: 'color:var(--yellow);', low: 'color:var(--green);' };
      html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.78rem;border-bottom:1px solid var(--border-light);">';
      html += '<span style="font-size:0.65rem;' + (pCls[l.priority] || '') + '">&#9679;</span>';
      html += '<span style="flex:1;">' + App._esc(l.title) + '</span>';
      html += '<span class="text-muted text-sm">' + (l.date === today ? 'Hoje' : l.date) + '</span>';
      html += '<button class="btn btn-sm btn-success" style="padding:2px 8px;font-size:0.68rem;" onclick="App._completeLembrete(\'' + l.id + '\')">OK</button>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '<div style="margin-top:8px;"><button class="btn btn-sm" onclick="App.navigate(\'lembretes\')" style="font-size:0.72rem;">Ver todos</button></div>';
  html += '</div>';
  return html;
};
