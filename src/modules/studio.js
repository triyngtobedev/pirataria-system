App.renderStudio = function() {
  const container = document.getElementById('moduleContent');
  const s = Repos.studio.settings.get();
  const profs = Repos.studio.professionals.list();
  const servs = Repos.studio.services.list();
  const hours = Repos.studio.hours.get();
  const dayLabels = { mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom' };

  container.innerHTML = `
    <div class="module-section">
      <div class="section-title">Profissionais</div>
      <div class="card" id="profsSection">
        <table>
          <thead><tr><th>Nome</th><th>Exibição</th><th>Comissão</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${profs.map(p => `
              <tr>
                <td>${this._esc(p.name)}</td>
                <td>${this._esc(p.displayName)}</td>
                <td class="text-sm">${p.commissionPct ? p.commissionPct + '%' : '0%'}</td>
                <td><span class="badge ${p.active ? 'badge-completed' : 'badge-cancelled'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
                <td><div class="actions">
                  <button class="btn btn-sm" onclick="App.editProfessional('${p.id}')">Editar</button>
                  <button class="btn btn-sm ${p.active ? 'btn-warning' : 'btn-success'}" onclick="App.toggleProfessional('${p.id}')">${p.active ? 'Desativar' : 'Ativar'}</button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button class="btn btn-sm btn-primary mt-12" onclick="App.showAddProfessional()">+ Adicionar profissional</button>
      </div>
    </div>

    <div class="module-section">
      <div class="section-title">Serviços</div>
      <div class="card" id="servsSection">
        <table>
          <thead><tr><th>Nome</th><th>Valor padrão</th><th>Duração padrão</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${servs.map(s => `
              <tr>
                <td>${this._esc(s.name)}</td>
                <td>${s.defaultPrice ? 'R$ ' + this._esc(s.defaultPrice) : '—'}</td>
                <td>${s.defaultDuration || '—'} min</td>
                <td><span class="badge ${s.active ? 'badge-completed' : 'badge-cancelled'}">${s.active ? 'Ativo' : 'Inativo'}</span></td>
                <td><div class="actions">
                  <button class="btn btn-sm" onclick="App.editService('${s.id}')">Editar</button>
                  <button class="btn btn-sm ${s.active ? 'btn-warning' : 'btn-success'}" onclick="App.toggleService('${s.id}')">${s.active ? 'Desativar' : 'Ativar'}</button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button class="btn btn-sm btn-primary mt-12" onclick="App.showAddService()">+ Adicionar serviço</button>
      </div>
    </div>

    <div class="module-section">
      <div class="section-title">Horário de funcionamento</div>
      <div class="card" id="hoursCard">
        <div class="form-row">
          <div class="form-group"><label>Abertura</label><input type="time" id="hoursOpen" value="${hours.open}"></div>
          <div class="form-group"><label>Fechamento</label><input type="time" id="hoursClose" value="${hours.close}"></div>
        </div>
        <div class="form-group"><label>Dias de funcionamento</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
            ${Object.entries(dayLabels).map(([k, v]) =>
              `<label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;cursor:pointer;">
                <input type="checkbox" value="${k}" ${hours.days.includes(k) ? 'checked' : ''} style="width:auto;"> ${v}
              </label>`
            ).join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-sm mt-12" onclick="App.saveBusinessHours()">Salvar horários</button>
      </div>
    </div>

    <div class="module-section">
      <div class="section-title">Informações do Studio</div>
      <div class="card">
        <div class="form-group"><label>Nome do estúdio</label><input type="text" id="cfgName" value="${this._esc(s.studioName)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Nome fantasia</label><input type="text" id="cfgFantasia" value="${this._esc(s.fantasia || '')}"></div>
          <div class="form-group"><label>CNPJ</label><input type="text" id="cfgCnpj" value="${this._esc(s.cnpj || '')}"></div>
        </div>
        <div class="form-group"><label>Endereço</label><input type="text" id="cfgAddress" value="${this._esc(s.address)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Cidade / UF</label><input type="text" id="cfgCity" value="${this._esc(s.city || '')}"></div>
          <div class="form-group"><label>Telefone</label><input type="text" id="cfgPhone" value="${this._esc(s.phone)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>WhatsApp</label><input type="text" id="cfgWhatsapp" value="${this._esc(s.whatsapp || '')}"></div>
          <div class="form-group"><label>Instagram</label><input type="text" id="cfgInsta" value="${this._esc(s.instagram)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>E-mail</label><input type="text" id="cfgEmail" value="${this._esc(s.email || '')}"></div>
          <div class="form-group"><label>Horário de funcionamento</label><input type="text" id="cfgHours" value="${this._esc(s.businessHours || '')}" placeholder="Ex: Seg-Sex 10h-19h, Sáb 10h-17h"></div>
        </div>
        <div class="form-group"><label>Sobre</label><textarea id="cfgAbout" rows="3">${this._esc(s.about)}</textarea></div>
        <button class="btn btn-primary btn-sm mt-12" onclick="App.saveStudio()">Salvar informações</button>
      </div>
    </div>

    <div class="module-section">
      <div class="section-title">Google Calendar</div>
      <div class="card">
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;line-height:1.5;">
          Conecte o Google Calendar para sincronizar automaticamente os agendamentos.
        </p>
        <div class="form-group"><label>Client ID do Google</label>
          <input type="text" id="cfgGClientId" value="${this._esc(s.gClientId || '')}" placeholder="Cole seu Client ID do Google Cloud">
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:8px;">
          ${GoogleCalendar.isConnected()
            ? '<span style="color:var(--green);">\u2713 Conectado</span> \u2022 Calend\u00e1rio: ' + App._esc(GoogleCalendar.getConfig().calendarName || '—') + ' \u2022 Eventos: ' + (GoogleCalendar.getConfig().eventosSincronizados || 0) + ' \u2022 \u00daltima sinc: ' + (GoogleCalendar.getConfig().ultimaSincronizacao ? new Date(GoogleCalendar.getConfig().ultimaSincronizacao).toLocaleString('pt-BR') : '—')
            : '<span style="color:var(--text-dim);">\u25CB Desconectado</span>'}
        </div>
        <div class="flex gap-8">
          ${GoogleCalendar.isConnected()
            ? '<button class="btn btn-sm" onclick="GoogleCalendar.syncAll()">Sincronizar agora</button><button class="btn btn-sm btn-danger" onclick="GoogleCalendar.disconnect()">Desconectar</button>'
            : '<button class="btn btn-primary btn-sm" onclick="GoogleCalendar.authorize(document.getElementById(\'cfgGClientId\').value.trim())">Conectar Google Calendar</button>'}
          <button class="btn btn-sm" onclick="App.saveStudio()">Salvar Client ID</button>
        </div>
      </div>
    </div>

    <div class="module-section">
      <div class="section-title">Backup e Restaura\u00e7\u00e3o</div>
      <div class="card">
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:14px;line-height:1.5;">
          Exporte todos os dados do sistema para um arquivo JSON ou restaure um backup anterior.
          A restauração substitui completamente os dados atuais.
        </p>
        <div class="flex gap-8">
          <button class="btn btn-primary btn-sm" onclick="Backup.download()">Exportar backup</button>
          <label class="btn btn-sm" style="cursor:pointer;">
            Importar backup
            <input type="file" accept=".json" style="display:none;" onchange="App._onImportBackup(this)">
          </label>
        </div>
      </div>
    </div>`;
};

// ─── Profissionais ───
App.showAddProfessional = function() {
  this._showOverlay('Adicionar profissional', `
    <div class="form-group"><label>Identificador</label><input type="text" id="profName" placeholder="Ex: digao"></div>
    <div class="form-group"><label>Nome de exibição</label><input type="text" id="profDisplay" placeholder="Ex: Digão"></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.addProfessional()">Salvar</button>
    </div>
  `);
};

App.addProfessional = function() {
  if (!Validation.form([
    { id: 'profName', rules: ['required'], label: 'Identificador' },
    { id: 'profDisplay', rules: ['required'], label: 'Nome de exibição' },
  ])) return;
  Repos.studio.professionals.create({
    name: document.getElementById('profName').value.trim(),
    displayName: document.getElementById('profDisplay').value.trim()
  });
  this._closeOverlay();
  App._toast('Profissional adicionado.', 'success');
  this.renderStudio();
};

App.editProfessional = function(id) {
  const p = Repos.studio.professionals.list().find(x => x.id === id);
  if (!p) return;
  this._showOverlay('Editar profissional', `
    <div class="form-group"><label>Identificador</label><input type="text" id="profName" value="${this._esc(p.name)}"></div>
    <div class="form-group"><label>Nome de exibição</label><input type="text" id="profDisplay" value="${this._esc(p.displayName)}"></div>
    <div class="form-group"><label>Comissão (%)</label><input type="text" id="profCommission" value="${this._esc(p.commissionPct || '0')}" placeholder="0"></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.doEditProfessional('${id}')">Salvar</button>
    </div>
  `);
};

App.doEditProfessional = function(id) {
  if (!Validation.form([
    { id: 'profName', rules: ['required'], label: 'Identificador' },
    { id: 'profDisplay', rules: ['required'], label: 'Nome de exibição' },
  ])) return;
  Repos.studio.professionals.update(id, {
    name: document.getElementById('profName').value.trim(),
    displayName: document.getElementById('profDisplay').value.trim(),
    commissionPct: document.getElementById('profCommission').value.trim() || '0'
  });
  this._closeOverlay();
  App._toast('Profissional atualizado.', 'success');
  this.renderStudio();
};

App.toggleProfessional = function(id) {
  const p = Repos.studio.professionals.list().find(x => x.id === id);
  if (!p) return;
  Repos.studio.professionals.update(id, { active: !p.active });
  this.renderStudio();
};

// ─── Serviços ───
App.showAddService = function() {
  this._showOverlay('Adicionar serviço', `
    <div class="form-group"><label>Nome</label><input type="text" id="servName" placeholder="Ex: Piercing"></div>
    <div class="form-row">
      <div class="form-group"><label>Valor padrão (R$)</label><input type="text" id="servPrice" placeholder="0,00"></div>
      <div class="form-group"><label>Duração padrão (min)</label><input type="number" id="servDuration" value="60" min="15" step="15"></div>
    </div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.addService()">Salvar</button>
    </div>
  `);
};

App.addService = function() {
  if (!Validation.form([
    { id: 'servName', rules: ['required'], label: 'Nome do serviço' },
    { id: 'servPrice', rules: ['money'], label: 'Valor' },
    { id: 'servDuration', rules: ['required', 'duration'], label: 'Duração' },
  ])) return;
  Repos.studio.services.create({
    name: document.getElementById('servName').value.trim(),
    defaultPrice: document.getElementById('servPrice').value.trim(),
    defaultDuration: document.getElementById('servDuration').value
  });
  this._closeOverlay();
  App._toast('Serviço adicionado.', 'success');
  this.renderStudio();
};

App.editService = function(id) {
  const s = Repos.studio.services.list().find(x => x.id === id);
  if (!s) return;
  this._showOverlay('Editar serviço', `
    <div class="form-group"><label>Nome</label><input type="text" id="servName" value="${this._esc(s.name)}"></div>
    <div class="form-row">
      <div class="form-group"><label>Valor padrão (R$)</label><input type="text" id="servPrice" value="${this._esc(s.defaultPrice)}"></div>
      <div class="form-group"><label>Duração padrão (min)</label><input type="number" id="servDuration" value="${s.defaultDuration || '60'}" min="15" step="15"></div>
    </div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.doEditService('${id}')">Salvar</button>
    </div>
  `);
};

App.doEditService = function(id) {
  if (!Validation.form([
    { id: 'servName', rules: ['required'], label: 'Nome do serviço' },
    { id: 'servPrice', rules: ['money'], label: 'Valor' },
    { id: 'servDuration', rules: ['required', 'duration'], label: 'Duração' },
  ])) return;
  Repos.studio.services.update(id, {
    name: document.getElementById('servName').value.trim(),
    defaultPrice: document.getElementById('servPrice').value.trim(),
    defaultDuration: document.getElementById('servDuration').value
  });
  this._closeOverlay();
  App._toast('Serviço atualizado.', 'success');
  this.renderStudio();
};

App.toggleService = function(id) {
  const s = Repos.studio.services.list().find(x => x.id === id);
  if (!s) return;
  Repos.studio.services.update(id, { active: !s.active });
  this.renderStudio();
};

// ─── Horários ───
App.saveBusinessHours = function() {
  if (!Validation.form([
    { id: 'hoursOpen', rules: ['required', 'time'], label: 'Abertura' },
    { id: 'hoursClose', rules: ['required', 'time'], label: 'Fechamento' },
  ])) return;
  const days = Array.from(document.querySelectorAll('#hoursCard input[type="checkbox"]')).filter(c => c.checked).map(c => c.value);
  if (days.length === 0) { App._toast('Selecione ao menos um dia de funcionamento.', 'warning'); return; }
  Repos.studio.hours.save({
    open: document.getElementById('hoursOpen').value,
    close: document.getElementById('hoursClose').value,
    days
  });
  App._toast('Horários salvos.', 'success');
  this.renderStudio();
};

// ─── Studio Info ───
App.saveStudio = function() {
  if (!Validation.form([
    { id: 'cfgName', rules: ['required'], label: 'Nome do estúdio' },
    { id: 'cfgPhone', rules: ['phone'], label: 'Telefone' },
    { id: 'cfgInsta', rules: ['instagram'], label: 'Instagram' },
  ])) return;
  var gClientId = document.getElementById('cfgGClientId');
  Repos.studio.settings.save({
    studioName: document.getElementById('cfgName').value.trim(),
    fantasia: document.getElementById('cfgFantasia').value.trim(),
    cnpj: document.getElementById('cfgCnpj').value.trim(),
    address: document.getElementById('cfgAddress').value.trim(),
    city: document.getElementById('cfgCity').value.trim(),
    phone: document.getElementById('cfgPhone').value.trim(),
    whatsapp: document.getElementById('cfgWhatsapp').value.trim(),
    instagram: document.getElementById('cfgInsta').value.trim(),
    email: document.getElementById('cfgEmail').value.trim(),
    businessHours: document.getElementById('cfgHours').value.trim(),
    about: document.getElementById('cfgAbout').value.trim(),
    gClientId: gClientId ? gClientId.value.trim() : ''
  });
  App._toast('Informações salvas.', 'success');
  this.renderStudio();
};

// ─── Backup ───
App._onImportBackup = function(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  Backup.restore(file, function() {
    Audit.action('restore', 'studio', '', 'Backup restaurado');
    Events.emit('backup.restored', {});
    App.renderStudio();
  });
  input.value = '';
};
