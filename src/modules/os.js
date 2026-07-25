App._osFilter = { status: '', period: '', professional: '', search: '' };

App.renderOS = function() {
  const el = document.getElementById('moduleContent');
  const ordens = DB.getOrdensServico();
  const profs = Repos.studio.professionals.active();

  el.innerHTML = `
    <div class="rp-controls">
      <div class="rp-filters">
        <input type="text" id="osSearch" placeholder="Buscar por cliente..." oninput="App._filterOS()" style="width:180px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
        <select id="osStatusFilter" onchange="App._filterOS()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos status</option>
          <option value="open">Aberta</option>
          <option value="completed">Concluída</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <select id="osProfFilter" onchange="App._filterOS()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos profissionais</option>
          ${profs.map(p => '<option value="' + p.id + '">' + App._esc(p.displayName) + '</option>').join('')}
        </select>
      </div>
    </div>
    <div id="osList">
      ${this._renderOSList(ordens)}
    </div>`;
};

App._filterOS = function() {
  let ordens = DB.getOrdensServico();
  const search = (document.getElementById('osSearch').value || '').trim().toLowerCase();
  const status = document.getElementById('osStatusFilter').value;
  const prof = document.getElementById('osProfFilter').value;
  if (search) ordens = ordens.filter(o => o.clientName.toLowerCase().includes(search));
  if (status) ordens = ordens.filter(o => o.status === status);
  if (prof) ordens = ordens.filter(o => o.professional === prof);
  document.getElementById('osList').innerHTML = this._renderOSList(ordens);
};

App._renderOSList = function(ordens) {
  if (ordens.length === 0) return C.emptyState('Nenhuma ordem de serviço encontrada.');
  const statusLabels = { open: 'Aberta', completed: 'Concluída', cancelled: 'Cancelada' };
  const statusClasses = { open: 'badge-scheduled', completed: 'badge-completed', cancelled: 'badge-cancelled' };
  return '<div class="table-wrap"><table><thead><tr><th>OS</th><th>Data</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>' +
    ordens.map(o => {
      const d = o.createdAt ? o.createdAt.slice(0, 10) : o.date;
      return '<tr><td><strong>#' + App._esc(o.osNumber) + '</strong></td><td class="text-muted text-sm">' + d + '</td><td>' + App._esc(o.clientName) + '</td><td class="text-sm">' + App._esc(o.service) + '</td><td class="text-muted text-sm">' + (o.professional ? Repos.studio.professionals.label(o.professional) : '—') + '</td><td>' + (o.value ? 'R$ ' + App._esc(o.value) : '—') + '</td><td>' + C.badge(statusLabels[o.status] || o.status, o.status) + '</td><td><div class="actions"><button class="btn btn-sm" onclick="App._viewOS(\'' + o.id + '\')">Detalhes</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
};

App._viewOS = function(id) {
  const o = DB.getOrdemServico(id);
  if (!o) return;
  const statusLabels = { open: 'Aberta', completed: 'Concluída', cancelled: 'Cancelada' };
  this._showOverlay('Ordem de Serviço #' + o.osNumber, `
    <div class="os-detail">
      <div class="os-detail-row"><span class="os-detail-label">OS</span><span class="os-detail-value">#${App._esc(o.osNumber)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Cliente</span><span class="os-detail-value">${App._esc(o.clientName)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Serviço</span><span class="os-detail-value">${App._esc(o.service)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Profissional</span><span class="os-detail-value">${o.professional ? Repos.studio.professionals.label(o.professional) : '—'}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Data</span><span class="os-detail-value">${o.date} às ${o.time || '—'}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Valor</span><span class="os-detail-value">${o.value ? 'R$ ' + App._esc(o.value) : '—'}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Pagamento</span><span class="os-detail-value">${App._esc(o.paymentMethod) || '—'}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Status</span><span class="os-detail-value">${C.badge(statusLabels[o.status] || o.status, o.status)}</span></div>
      ${o.notes ? '<div class="os-detail-row"><span class="os-detail-label">Observações</span><span class="os-detail-value">' + App._esc(o.notes) + '</span></div>' : ''}
      ${o.createdAt ? '<div class="os-detail-row"><span class="os-detail-label">Criada em</span><span class="os-detail-value">' + o.createdAt.slice(0, 19).replace('T', ' ') + '</span></div>' : ''}
      ${o.completedAt ? '<div class="os-detail-row"><span class="os-detail-label">Concluída em</span><span class="os-detail-value">' + o.completedAt.slice(0, 19).replace('T', ' ') + '</span></div>' : ''}
      <div class="os-detail-row"><span class="os-detail-label">Assinatura</span><span class="os-detail-value">${o.signature ? '<span style="color:var(--green);">\u2713 Assinado</span>' : '<span style="color:var(--text-dim);">— Sem assinatura</span>'}</span></div>
      ${o.signature ? '<div style="margin-top:8px;padding:8px;background:var(--surface-2);border-radius:4px;text-align:center;"><img src="' + o.signature + '" style="max-width:200px;max-height:50px;display:block;margin:0 auto;"></div>' : ''}
    </div>
    <div style="margin-top:16px;">${App._renderAnexosSection('os', id, o.clientName)}</div>
    <div class="overlay-actions" style="margin-top:16px;">
      ${o.status === 'open' && !o.signature ? '<button class="btn btn-success" onclick="App._signOS(\'' + id + '\')">Assinar</button>' : ''}
      <button class="btn" onclick="App._closeOverlay()">Fechar</button>
      <button class="btn btn-primary" onclick="App._printOS('${id}')">Imprimir</button>
      ${o.status === 'open' ? '<button class="btn btn-success" onclick="App._cancelOS(\'' + id + '\')">Cancelar OS</button>' : ''}
    </div>
  `);
};

App._printOS = function(id) {
  const o = DB.getOrdemServico(id);
  if (!o) return;
  Audit.action('print', 'os', id, 'Impressão da OS #' + o.osNumber);

  const win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OS #' + o.osNumber + '</title><style>');
  win.document.write('body{font-family:Georgia,serif;font-size:12pt;color:#222;padding:40px;max-width:210mm;margin:0 auto;}');
  win.document.write('h1{font-size:18pt;margin-bottom:4px;}');
  win.document.write('.sub{font-size:10pt;color:#666;margin-bottom:20px;display:block;}');
  win.document.write('.os-number{font-size:14pt;font-weight:bold;margin:20px 0;text-align:center;}');
  win.document.write('table{width:100%;border-collapse:collapse;margin:16px 0;}');
  win.document.write('td,th{border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:11pt;}');
  win.document.write('th{background:#f5f5f5;width:120px;}');
  win.document.write('.footer{margin-top:40px;font-size:10pt;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:16px;}');
  win.document.write('@media print{body{padding:20px;}.no-print{display:none;}}');
  win.document.write('</style></head><body>');
  win.document.write('<h1>Pirataria Body Art</h1>');
  win.document.write('<span class="sub">Santo Antônio Além do Carmo, Centro Histórico de Salvador</span>');
  win.document.write('<div class="os-number">ORDEM DE SERVIÇO #' + App._esc(o.osNumber) + '</div>');
  win.document.write('<table><tbody>');
  win.document.write('<tr><th>Cliente</th><td>' + App._esc(o.clientName) + '</td></tr>');
  win.document.write('<tr><th>Serviço</th><td>' + App._esc(o.service) + '</td></tr>');
  win.document.write('<tr><th>Profissional</th><td>' + (o.professional ? Repos.studio.professionals.label(o.professional) : '—') + '</td></tr>');
  win.document.write('<tr><th>Data</th><td>' + o.date + ' às ' + (o.time || '—') + '</td></tr>');
  win.document.write('<tr><th>Valor</th><td>' + (o.value ? 'R$ ' + App._esc(o.value) : '—') + '</td></tr>');
  win.document.write('<tr><th>Forma de pagamento</th><td>' + App._esc(o.paymentMethod || '—') + '</td></tr>');
  win.document.write('<tr><th>Status</th><td>' + (o.status === 'open' ? 'Aberta' : o.status === 'completed' ? 'Concluída' : 'Cancelada') + '</td></tr>');
  if (o.notes) win.document.write('<tr><th>Observações</th><td>' + App._esc(o.notes) + '</td></tr>');
  win.document.write('<tr><th>Assinatura do cliente</th><td style="height:60px;"></td></tr>');
  win.document.write('</tbody></table>');
  win.document.write('<div class="footer">Documento gerado pelo Pirataria System em ' + new Date().toLocaleString('pt-BR') + '</div>');
  win.document.write('<div class="no-print" style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="padding:10px 24px;font-size:12pt;cursor:pointer;">Imprimir</button></div>');
  win.document.write('</body></html>');
  win.document.close();
};

App._cancelOS = function(id) {
  App._confirm('Cancelar esta Ordem de Serviço?', function() {
    DB.updateOrdemServico(id, { status: 'cancelled' });
    Audit.action('cancel', 'os', id, 'OS #' + (DB.getOrdemServico(id) || {}).osNumber + ' cancelada');
    App._closeOverlay();
    App.renderOS();
    App.refreshHoje();
  });
};

// ─── Integração: gerar OS após concluir atendimento ───
App._promptGerarOS = function(data) {
  if (data.clientName) {
    App._checkTermoAndGerarOS(data);
  } else {
    const methods = DB.getPaymentMethods();
    App._showOverlay('Gerar Ordem de Serviço', `
      <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:14px;">OS para <strong>${App._esc(data.clientName || '')}</strong></p>
      <div class="form-row"><div class="form-group"><label>Serviço</label><input type="text" id="osService" value="${App._esc(data.service)}"></div>
      <div class="form-group"><label>Profissional</label><select id="osProfessional">${App._professionalOptions(data.professional)}</select></div></div>
      <div class="form-row"><div class="form-group"><label>Valor (R$)</label><input type="text" id="osValue" value="${App._esc(data.value || '')}"></div>
      <div class="form-group"><label>Pagamento</label><select id="osPayment">${methods.map(m => '<option value="' + App._esc(m.name) + '">' + App._esc(m.name) + '</option>').join('')}</select></div></div>
      <div class="form-group"><label>Observações</label><textarea id="osNotes" rows="2">${App._esc(data.notes || '')}</textarea></div>
      <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Pular</button><button class="btn btn-primary" onclick="App._confirmGerarOS('${data.id}', '${data.type}')">Gerar OS</button></div>
    `);
  }
};

App._confirmGerarOS = function(refId, type, btn) {
  const service = document.getElementById('osService').value.trim();
  const professional = document.getElementById('osProfessional').value;
  const value = document.getElementById('osValue').value.trim();
  const payment = document.getElementById('osPayment').value;
  const notes = document.getElementById('osNotes').value.trim();

  let clientName = '', clientId = null, date = '', time = '';
  if (type === 'agenda' || type === 'agenda_complete') {
    const a = Repos.agenda.list().find(x => x.id === refId);
    if (a) { clientName = a.clientName; clientId = a.clientId; date = a.date; time = a.time; }
  } else if (type === 'walkin') {
    const q = Repos.atendimento.queue.list().find(x => x.id === refId);
    if (q) { clientName = q.clientName; date = DB._today(); time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  }
  if (!clientName) return;

  var os = DB.addOrdemServico({ clientName, clientId, professional, service, date, time, value, paymentMethod: payment, notes, status: 'open' });
  if (clientId) Events.emit('crm.os_criada', { clientId: clientId, refId: os.id });
  Audit.action('create', 'os', refId, 'OS gerada para ' + clientName);
  App._closeOverlay();
  App._toast('Ordem de Serviço gerada com sucesso!', 'success');
  App.refreshHoje();
  if (App.currentModule === 'atendimento') App.renderAtendimento();
};

App._signOS = function(id) {
  var o = DB.getOrdemServico(id);
  if (!o) return;
  App._openSignature('Assinar OS #' + o.osNumber, o.signature || null, function(dataUrl) {
    DB.updateOrdemServico(id, { signature: dataUrl });
    Audit.action('sign', 'os', id, 'OS #' + o.osNumber + ' assinada');
    App._toast('OS assinada com sucesso!', 'success');
    App._viewOS(id);
  });
};
