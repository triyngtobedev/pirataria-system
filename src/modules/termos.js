App._termoFilter = { search: '', procedure: '', professional: '', status: '' };

App.renderTermos = function() {
  const el = document.getElementById('moduleContent');
  const termos = DB.getTermos();
  const profs = Repos.studio.professionals.active();
  el.innerHTML = `
    <div class="rp-controls">
      <div class="rp-filters">
        <input type="text" id="termoSearch" placeholder="Buscar por cliente..." oninput="App._filterTermos()" style="width:170px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
        <select id="termoStatusFilter" onchange="App._filterTermos()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="signed">Assinado</option>
        </select>
        <select id="termoProfFilter" onchange="App._filterTermos()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos profissionais</option>
          ${profs.map(p => '<option value="' + p.id + '">' + App._esc(p.displayName) + '</option>').join('')}
        </select>
      </div>
    </div>
    <div id="termoList">${this._renderTermoList(termos)}</div>`;
};

App._filterTermos = function() {
  let list = DB.getTermos();
  const search = (document.getElementById('termoSearch').value || '').trim().toLowerCase();
  const status = document.getElementById('termoStatusFilter').value;
  const prof = document.getElementById('termoProfFilter').value;
  if (search) list = list.filter(t => t.clientName.toLowerCase().includes(search));
  if (status) list = list.filter(t => t.status === status);
  if (prof) list = list.filter(t => t.professional === prof);
  document.getElementById('termoList').innerHTML = this._renderTermoList(list);
};

App._renderTermoList = function(list) {
  if (list.length === 0) return C.emptyState('Nenhum termo de consentimento encontrado.');
  return '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Cliente</th><th>Procedimento</th><th>Profissional</th><th>Status</th><th></th></tr></thead><tbody>' +
    list.map(t => {
      const d = t.createdAt ? t.createdAt.slice(0, 10) : '—';
      return '<tr><td class="text-muted text-sm">' + d + '</td><td>' + App._esc(t.clientName) + '</td><td class="text-sm">' + App._esc(t.procedure) + '</td><td class="text-muted text-sm">' + (t.professional ? Repos.studio.professionals.label(t.professional) : '—') + '</td><td>' + C.badge(t.status === 'signed' ? 'Assinado' : 'Pendente', t.status === 'signed' ? 'completed' : 'scheduled') + '</td><td><div class="actions"><button class="btn btn-sm" onclick="App._viewTermo(\'' + t.id + '\')">Detalhes</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
};

App._viewTermo = function(id) {
  const t = DB.getTermo(id);
  if (!t) return;
  this._showOverlay('Termo de Consentimento', `
    <div class="os-detail">
      <div class="os-detail-row"><span class="os-detail-label">Cliente</span><span class="os-detail-value">${App._esc(t.clientName)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Procedimento</span><span class="os-detail-value">${App._esc(t.procedure)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Profissional</span><span class="os-detail-value">${t.professional ? Repos.studio.professionals.label(t.professional) : '—'}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Status</span><span class="os-detail-value">${C.badge(t.status === 'signed' ? 'Assinado' : 'Pendente', t.status === 'signed' ? 'completed' : 'scheduled')}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Criado em</span><span class="os-detail-value">${t.createdAt ? t.createdAt.slice(0, 19).replace('T', ' ') : '—'}</span></div>
      ${t.signedAt ? '<div class="os-detail-row"><span class="os-detail-label">Assinado em</span><span class="os-detail-value">' + t.signedAt.slice(0, 19).replace('T', ' ') + '</span></div>' : ''}
      <div class="os-detail-row"><span class="os-detail-label">Assinatura</span><span class="os-detail-value">${t.signature ? '<span style="color:var(--green);">\u2713 Assinado</span>' : '<span style="color:var(--text-dim);">— Sem assinatura</span>'}</span></div>
      ${t.signature ? '<div style="margin-top:8px;padding:8px;background:var(--surface-2);border-radius:4px;text-align:center;"><img src="' + t.signature + '" style="max-width:200px;max-height:50px;display:block;margin:0 auto;"></div>' : ''}
    </div>
    <div style="margin-top:14px;padding:12px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:4px;font-size:0.84rem;line-height:1.6;white-space:pre-wrap;max-height:200px;overflow-y:auto;">${App._esc(t.termText)}</div>
    ${t.notes ? '<div style="margin-top:10px;font-size:0.8rem;color:var(--text-muted);">Obs: ' + App._esc(t.notes) + '</div>' : ''}
    <div class="overlay-actions" style="margin-top:16px;">
      <button class="btn" onclick="App._closeOverlay()">Fechar</button>
      ${t.status === 'pending' && !t.signature ? '<button class="btn btn-success" onclick="App._signTermoDigital(\'' + id + '\')">Assinar agora</button>' : ''}
      ${t.status === 'pending' && t.signature ? '<button class="btn btn-success" onclick="App._signTermoConfirm(\'' + id + '\')">Confirmar assinatura</button>' : ''}
      <button class="btn btn-primary" onclick="App._printTermo('${id}')">Imprimir</button>
    </div>
    <div style="margin-top:16px;">${App._renderAnexosSection('termo', id, t.clientName)}</div>
  `);
};

App._signTermoDigital = function(id) {
  var t = DB.getTermo(id);
  if (!t) return;
  App._openSignature('Assinar Termo de Consentimento', t.signature || null, function(dataUrl) {
    DB.updateTermo(id, { signature: dataUrl, status: 'signed' });
    if (t.clientId) Events.emit('crm.termo_assinado', { clientId: t.clientId, refId: id });
    Audit.action('sign', 'termos', id, 'Termo de consentimento assinado digitalmente');
    App._toast('Termo assinado com sucesso!', 'success');
    App.refreshHoje();
    if (App.currentModule === 'atendimento') {
      App.renderAtendimento();
    } else {
      App._viewTermo(id);
    }
  });
};

App._signTermoConfirm = function(id) {
  App._confirm('Confirmar assinatura do termo?', function() {
    DB.updateTermo(id, { status: 'signed' });
    Audit.action('sign', 'termos', id, 'Termo de consentimento assinado');
    App._closeOverlay();
    App.renderTermos();
  });
};

App._printTermo = function(id) {
  const t = DB.getTermo(id);
  if (!t) return;
  Audit.action('print', 'termos', id, 'Impressão do termo de ' + t.clientName);
  const win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Termo de Consentimento</title><style>');
  win.document.write('body{font-family:Georgia,serif;font-size:12pt;color:#222;padding:40px;max-width:210mm;margin:0 auto;}');
  win.document.write('h1{font-size:18pt;text-align:center;margin-bottom:4px;}');
  win.document.write('.sub{font-size:10pt;color:#666;text-align:center;margin-bottom:24px;display:block;}');
  win.document.write('h2{font-size:13pt;margin:24px 0 12px;border-bottom:1px solid #ccc;padding-bottom:4px;}');
  win.document.write('p{line-height:1.6;text-align:justify;}');
  win.document.write('.field{font-weight:bold;}');
  win.document.write('.signature{margin-top:40px;}');
  win.document.write('.signature .line{width:250px;border-top:1px solid #222;margin-top:40px;padding-top:6px;font-size:10pt;text-align:center;}');
  win.document.write('.footer{margin-top:40px;font-size:9pt;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:12px;}');
  win.document.write('@media print{body{padding:20px;}.no-print{display:none;}}');
  win.document.write('</style></head><body>');
  win.document.write('<h1>Pirataria Body Art</h1>');
  win.document.write('<span class="sub">Santo Antônio Além do Carmo, Centro Histórico de Salvador</span>');
  win.document.write('<h2>TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO</h2>');
  win.document.write('<p><span class="field">Cliente:</span> ' + App._esc(t.clientName) + '</p>');
  win.document.write('<p><span class="field">Procedimento:</span> ' + App._esc(t.procedure) + '</p>');
  win.document.write('<p><span class="field">Profissional responsável:</span> ' + (t.professional ? Repos.studio.professionals.label(t.professional) : '—') + '</p>');
  win.document.write('<p><span class="field">Data:</span> ' + (t.createdAt ? t.createdAt.slice(0, 10) : '—') + '</p>');
  win.document.write('<h2>Declaração</h2>');
  win.document.write('<p>' + App._esc(t.termText).replace(/\n/g, '</p><p>') + '</p>');
  if (t.notes) win.document.write('<p><span class="field">Observações:</span> ' + App._esc(t.notes) + '</p>');
  win.document.write('<div class="signature">');
  win.document.write('<p>Declaro que li e compreendi todas as informações acima e consinto com a realização do procedimento.</p>');
  win.document.write('<div class="line">Assinatura do cliente</div>');
  if (t.status === 'signed') win.document.write('<p style="margin-top:12px;font-size:10pt;color:#666;">Assinado em: ' + (t.signedAt || '—') + '</p>');
  win.document.write('</div>');
  win.document.write('<div class="footer">Documento gerado pelo Pirataria System em ' + new Date().toLocaleString('pt-BR') + '</div>');
  win.document.write('<div class="no-print" style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="padding:10px 24px;font-size:12pt;cursor:pointer;">Imprimir</button></div>');
  win.document.close();
};

// ─── Integração com OS ───
App._checkTermoAndGerarOS = function(data) {
  const termos = DB.getTermos().filter(t => t.clientName === data.clientName && t.procedure === data.service && t.status === 'signed');
  if (termos.length > 0) {
    this._showOverlay('Gerar Ordem de Serviço', this._buildOSFormHtml(data));
    return;
  }
  App._confirm('Cliente ainda não possui termo de consentimento assinado para este procedimento. Deseja gerar o termo agora?', function() {
    App._showOverlay('Novo Termo de Consentimento', App._buildTermoFormHtml(data));
  });
};

App._buildOSFormHtml = function(data) {
  const methods = DB.getPaymentMethods();
  return `
    <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:14px;">OS para <strong>${App._esc(data.clientName)}</strong></p>
    <div class="form-row"><div class="form-group"><label>Serviço</label><input type="text" id="osService" value="${App._esc(data.service)}"></div>
    <div class="form-group"><label>Profissional</label><select id="osProfessional">${App._professionalOptions(data.professional)}</select></div></div>
    <div class="form-row"><div class="form-group"><label>Valor (R$)</label><input type="text" id="osValue" value="${App._esc(data.value || '')}"></div>
    <div class="form-group"><label>Pagamento</label><select id="osPayment">${methods.map(m => '<option value="' + App._esc(m.name) + '">' + App._esc(m.name) + '</option>').join('')}</select></div></div>
    <div class="form-group"><label>Observações</label><textarea id="osNotes" rows="2"></textarea></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmGerarOS('${data.id}', '${data.type}')">Gerar OS</button></div>`;
};

App._buildTermoFormHtml = function(data) {
  return `
    <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:14px;">Termo para <strong>${App._esc(data.clientName)}</strong></p>
    <div class="form-group"><label>Procedimento</label><input type="text" id="termoProcedure" value="${App._esc(data.service)}"></div>
    <div class="form-group"><label>Profissional</label><select id="termoProfessional">${App._professionalOptions(data.professional)}</select></div>
    <div class="form-group"><label>Texto do termo</label>
      <textarea id="termoText" rows="6">Eu, ${App._esc(data.clientName)}, declaro que fui informado(a) de forma clara e detalhada sobre o procedimento de ${App._esc(data.service)} a ser realizado por ${data.professional ? Repos.studio.professionals.label(data.professional) : '—'}, tendo esclarecido todas as minhas dúvidas e autorizo a realização do mesmo.</textarea></div>
    <div class="form-group"><label>Observações</label><textarea id="termoNotes" rows="2"></textarea></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App._saveTermoAndContinue('${data.id}', '${data.type}')">Salvar termo e continuar</button>
    </div>`;
};

App._saveTermoAndContinue = function(refId, type) {
  const procedure = document.getElementById('termoProcedure').value.trim();
  const professional = document.getElementById('termoProfessional').value;
  const termText = document.getElementById('termoText').value.trim();
  const notes = document.getElementById('termoNotes').value.trim();
  if (!procedure || !termText) return;

  let clientName = '', clientId = null;
  let isActive = false;
  if (type === 'agenda' || type === 'agenda_complete') {
    const a = Repos.agenda.get(refId);
    if (a) { clientName = a.clientName; clientId = a.clientId; isActive = a.status === 'in_progress'; }
  } else if (type === 'walkin') {
    const q = Repos.atendimento.queue.list().find(x => x.id === refId);
    if (q) { clientName = q.clientName; isActive = q.status === 'in_progress'; }
  }
  if (!clientName) return;

  DB.addTermo({ clientName, clientId, procedure, professional, termText, notes, status: 'signed' });
  Audit.action('create', 'termos', refId, 'Termo de consentimento criado para ' + clientName);
  App._closeOverlay();
  App._toast('Termo de consentimento salvo!', 'success');

  App.refreshHoje();
  if (isActive && App.currentModule === 'atendimento') {
    App.renderAtendimento();
  } else {
    App._showOverlay('Gerar Ordem de Serviço', App._buildOSFormHtml({ id: refId, type, clientName, service: procedure, professional, value: '' }));
  }
};
