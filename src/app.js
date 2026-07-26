const App = {
  currentModule: null,
  _agendaView: 'week',
  _weekOffset: 0,
  _focusedDay: null,
  _profFilter: 'todos',
  _panelClientId: null,
  _isFirstAccess: false,

  init() {
    Migrations.run();
    Auth.init();
    if (DB.getUsers().length === 0) {
      this._showSetup();
    } else if (Auth.isAuthenticated()) {
      this._boot();
    } else {
      this._showLogin();
    }
  },

  _boot() {
    Palette.init();
    DB.seed();
    document.getElementById('loginOverlay').classList.remove('show');
    document.getElementById('appShell').classList.add('show');
    this._applyPermissions();
    this.bindNav();
    if (typeof Notificacao !== 'undefined') Notificacao._updateBadge();
    this._updateVersionDisplay();
    if (typeof FechamentoDia !== 'undefined' && FechamentoDia.precisaAuditar()) {
      var resumo = FechamentoDia.auditar();
      if (resumo) {
        var pends = Object.keys(resumo.pendencias).filter(function(k) { return resumo.pendencias[k] > 0; }).length;
        var total = Object.keys(resumo.realizacoes).reduce(function(s, k) { return s + resumo.realizacoes[k]; }, 0);
        if (total > 0 || pends > 0) {
          var self = this;
          setTimeout(function() {
            self._showFechamentoResumo(resumo);
          }, 800);
        }
      }
    }
    if (typeof Onboarding !== 'undefined' && !Onboarding.isComplete()) {
      if (typeof App.renderOnboarding === 'function') {
        App.renderOnboarding();
        return;
      }
    }
    this.navigate(this._getDefaultModule());
    var self = this;
    if (this._isFirstAccess) {
      setTimeout(function() {
        self._promptSeedData();
      }, 600);
    }
    this._isFirstAccess = false;
  },

  _updateVersionDisplay() {
    var el = document.getElementById('versionHash');
    if (!el) return;
    try {
      var meta = document.querySelector('meta[name="version"]');
      var ver = meta ? meta.getAttribute('content') : null;
      el.textContent = 'v' + (ver || '1.0.0');
    } catch(e) {}
  },

  _showDiagnostics() {
    var ver = '1.0.0';
    try {
      var m = document.querySelector('meta[name="version"]');
      if (m) ver = m.getAttribute('content') || ver;
    } catch(e) {}
    var swStatus = 'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? 'Ativo' : 'Registrado') : 'N\u00e3o suportado';
    var storage = '';
    try {
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function(e) {
          var usado = (e.usage / 1024 / 1024).toFixed(1);
          var total = (e.quota / 1024 / 1024).toFixed(1);
          document.getElementById('diagStorage').textContent = usado + ' MB de ' + total + ' MB usados';
        });
        storage = 'Consultando...';
      } else {
        storage = 'Indispon\u00edvel';
      }
    } catch(e) { storage = 'Erro'; }

    var html = '<div class="os-detail">' +
      '<div class="os-detail-row"><span class="os-detail-label">Vers\u00e3o</span><span class="os-detail-value">' + ver + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Ambiente</span><span class="os-detail-value">' + (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'Desenvolvimento' : 'Produ\u00e7\u00e3o') + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Service Worker</span><span class="os-detail-value">' + swStatus + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Armazenamento</span><span class="os-detail-value" id="diagStorage">' + storage + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Navegador</span><span class="os-detail-value">' + (navigator.userAgent || '').substring(0, 80) + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">M\u00f3dulos</span><span class="os-detail-value">' + Object.keys(MODULE_TITLES).length + ' registrados</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Armazenamento local</span><span class="os-detail-value">' + (typeof localStorage !== 'undefined' ? Object.keys(localStorage).filter(function(k) { return k.startsWith('pirataria_'); }).length + ' cole\u00e7\u00f5es' : 'Indispon\u00edvel') + '</span></div>' +
    '</div>';
    this._showOverlay('Diagn\u00f3stico do Sistema', html);
  },

  _applyPermissions() {
    document.querySelectorAll('[data-module]').forEach(link => {
      const mod = link.dataset.module;
      link.style.display = Permissions.canAccess(mod) ? '' : 'none';
    });
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      const s = Auth.session();
      logoutBtn.textContent = 'Sair (' + (s ? s.userName : '') + ')';
    }
  },

  _getDefaultModule() {
    if (Permissions.canAccess('hoje')) return 'hoje';
    const modules = Permissions.allowedModules();
    return modules.length > 0 ? modules[0] : null;
  },

  _showSetup() {
    document.getElementById('setupOverlay').classList.add('show');
  },

  _doSetup() {
    var name = document.getElementById('setupName').value.trim();
    var login = document.getElementById('setupUser').value.trim();
    var pass = document.getElementById('setupPass').value;
    var pass2 = document.getElementById('setupPass2').value;
    var errorEl = document.getElementById('setupError');
    errorEl.style.display = 'none';
    if (!name || !login || !pass) { errorEl.textContent = 'Preencha todos os campos.'; errorEl.style.display = 'block'; return; }
    if (login.length < 3) { errorEl.textContent = 'Usu\u00e1rio deve ter pelo menos 3 caracteres.'; errorEl.style.display = 'block'; return; }
    if (pass.length < 4) { errorEl.textContent = 'Senha deve ter pelo menos 4 caracteres.'; errorEl.style.display = 'block'; return; }
    if (pass !== pass2) { errorEl.textContent = 'Senhas n\u00e3o conferem.'; errorEl.style.display = 'block'; return; }
    DB.addUser({ name: name, login: login, password: Auth._hash(pass), role: 'admin' });
    document.getElementById('setupOverlay').classList.remove('show');
    document.getElementById('loginUser').value = login;
    document.getElementById('loginPass').value = pass;
    this._isFirstAccess = true;
    this._doLogin();
  },

  _showLogin() {
    document.getElementById('loginOverlay').classList.add('show');
    document.getElementById('appShell').classList.remove('show');
  },

  _doLogin() {
    const login = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    if (!login || !password) return;
    const result = Auth.login(login, password);
    if (result.ok) {
      this._boot();
    } else {
      document.getElementById('loginError').textContent = result.error;
      document.getElementById('loginError').style.display = 'block';
    }
  },

  _doLogout() {
    Auth.logout();
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').style.display = 'none';
    this._showLogin();
  },

  _promptSeedData() {
    var self = this;
    this._showOverlay('Configura\u00e7\u00e3o inicial', '<p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:18px;line-height:1.5;">Deseja iniciar o sistema com dados b\u00e1sicos para facilitar o uso?<br><br>Ser\u00e3o criados:<br>\u2022 Categorias de estoque (Agulhas, Tintas, EPIs, Higiene, Descart\u00e1veis)<br>\u2022 Formas de pagamento (Dinheiro, PIX, D\u00e9bito, Cr\u00e9dito, Transfer\u00eancia)<br>\u2022 Servi\u00e7os padr\u00e3o (Tatuagem, Piercing, Retoque, Avalia\u00e7\u00e3o)</p><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay();App._promptStudioSetup()">N\u00e3o agora</button><button class="btn btn-primary" onclick="App._closeOverlay();App._applySeedData();setTimeout(function(){App._promptStudioSetup()},100)">Sim, criar dados b\u00e1sicos</button></div>');
  },

  _applySeedData() {
    var criados = [];

    // Categorias de estoque (se vazio)
    if (Repos.produtos.categories.list().length === 0) {
      ['Agulhas', 'Tintas', 'EPIs', 'Higiene', 'Materiais descart\u00e1veis'].forEach(function(n) { Repos.produtos.categories.create({ name: n }); });
      criados.push('categorias');
    }

    // Formas de pagamento (se vazio)
    if (Repos.financeiro.paymentMethods.list().length === 0) {
      ['Dinheiro', 'PIX', 'D\u00e9bito', 'Cr\u00e9dito', 'Transfer\u00eancia'].forEach(function(n) { Repos.financeiro.paymentMethods.create({ name: n }); });
      criados.push('formas de pagamento');
    }

    // Servi\u00e7os padr\u00e3o
    if (Repos.studio.services.list().length === 0 || Repos.studio.services.list().length <= 3) {
      var existing = Repos.studio.services.list().map(function(s) { return s.name; });
      ['Tatuagem', 'Piercing', 'Retoque', 'Avalia\u00e7\u00e3o'].forEach(function(n) {
        if (existing.indexOf(n) === -1) Repos.studio.services.create({ name: n });
      });
      criados.push('servi\u00e7os');
    }

    if (criados.length > 0) {
      App._toast('Dados b\u00e1sicos criados: ' + criados.join(', ') + '.', 'success');
    }
  },

  _promptStudioSetup() {
    var s = Repos.studio.settings.get();
    this._showOverlay('Configurar est\u00fadio', '<p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:16px;">Informe os dados do est\u00fadio. Voc\u00ea pode preencher apenas o essencial e completar depois pelo m\u00f3dulo Studio.</p><div class="form-group"><label>Nome do est\u00fadio *</label><input type="text" id="cfgName" value="' + App._esc(s.studioName) + '"></div><div class="form-row"><div class="form-group"><label>Nome fantasia</label><input type="text" id="cfgFantasia" value="' + App._esc(s.fantasia || '') + '"></div><div class="form-group"><label>CNPJ</label><input type="text" id="cfgCnpj" value="' + App._esc(s.cnpj || '') + '"></div></div><div class="form-group"><label>Endere\u00e7o</label><input type="text" id="cfgAddress" value="' + App._esc(s.address || '') + '"></div><div class="form-row"><div class="form-group"><label>Cidade / UF</label><input type="text" id="cfgCity" value="' + App._esc(s.city || '') + '"></div><div class="form-group"><label>Telefone</label><input type="text" id="cfgPhone" value="' + App._esc(s.phone || '') + '"></div></div><div class="form-row"><div class="form-group"><label>WhatsApp</label><input type="text" id="cfgWhatsapp" value="' + App._esc(s.whatsapp || '') + '"></div><div class="form-group"><label>Instagram</label><input type="text" id="cfgInsta" value="' + App._esc(s.instagram || '') + '"></div></div><div class="form-row"><div class="form-group"><label>E-mail</label><input type="text" id="cfgEmail" value="' + App._esc(s.email || '') + '"></div><div class="form-group"><label>Hor\u00e1rio de funcionamento</label><input type="text" id="cfgHours" value="' + App._esc(s.businessHours || '') + '" placeholder="Ex: Seg-Sex 10h-19h, S\u00e1b 10h-17h"></div></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Pular</button><button class="btn btn-primary" onclick="App._saveStudioSetup()">Salvar</button></div>');
  },

  _saveStudioSetup() {
    var data = {
      studioName: document.getElementById('cfgName').value.trim() || 'Pirataria Body Art',
      fantasia: document.getElementById('cfgFantasia').value.trim(),
      cnpj: document.getElementById('cfgCnpj').value.trim(),
      address: document.getElementById('cfgAddress').value.trim(),
      city: document.getElementById('cfgCity').value.trim(),
      phone: document.getElementById('cfgPhone').value.trim(),
      whatsapp: document.getElementById('cfgWhatsapp').value.trim(),
      instagram: document.getElementById('cfgInsta').value.trim(),
      email: document.getElementById('cfgEmail').value.trim(),
      businessHours: document.getElementById('cfgHours').value.trim()
    };
    Repos.studio.settings.save(data);
    this._closeOverlay();
    App._toast('Est\u00fadio configurado com sucesso!', 'success');
  },

  _gerarComissao: function(professional, type, refId, description, operationValue) {
    if (!professional || !operationValue || operationValue <= 0) return null;
    var pct = Repos.studio.professionals.commission(professional);
    if (!pct || pct <= 0) return null;
    return Repos.comissoes.create({
      professional: professional,
      type: type,
      refId: refId,
      description: description,
      operationValue: operationValue,
      percent: pct,
      commissionValue: operationValue * (pct / 100),
      operationDate: DB._today(),
    });
  },

  _checkPacoteEUsar: function(clientId, service, refId, professional, callback) {
    if (!clientId || !service) { if (callback) callback(); return; }
    try {
      var pacotes = Repos.pacotes.activeByClientAndService(clientId, service);
      if (pacotes.length > 0) {
        var result = Repos.pacotes.use(clientId, service, refId, professional);
        if (result && result.used) {
          App._toast('Uso de pacote registrado: ' + result.pacote.remainingQty + ' sessões restantes.', 'info');
        }
      }
    } catch(e) {}
    if (callback) callback();
  },

  _showFechamentoResumo: function(resumo) {
    if (!resumo) return;
    var html = '<div class="os-detail">' +
      '<div class="os-detail-row"><span class="os-detail-label">Data</span><span class="os-detail-value">' + resumo.data + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Atendimentos</span><span class="os-detail-value">' + resumo.realizacoes.atendimentosRealizados + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Agendamentos</span><span class="os-detail-value">' + resumo.realizacoes.agendamentosCriados + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Cancelamentos</span><span class="os-detail-value">' + resumo.realizacoes.cancelamentos + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Recebido</span><span class="os-detail-value">R$ ' + resumo.realizacoes.totalRecebido.toFixed(2).replace('.', ',') + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Tarefas conclu\u00eddas</span><span class="os-detail-value">' + resumo.tarefas.concluidas + '</span></div>' +
      '<div class="os-detail-row"><span class="os-detail-label">Transferidas</span><span class="os-detail-value">' + resumo.tarefas.transferidas + '</span></div>' +
    '</div>';
    var pends = Object.keys(resumo.pendencias).filter(function(k) { return resumo.pendencias[k] > 0; });
    if (pends.length > 0) {
      html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);"><strong>Pend\u00eancias transferidas:</strong></div>';
      pends.forEach(function(k) {
        var labels = { mensagensSemResposta: 'WhatsApp', confirmacoesPendentes: 'Confirma\u00e7\u00f5es', preAgendamentosNaoConcluidos: 'Pr\u00e9-agendamentos', followUpsVencidos: 'Follow-ups', pagamentosPendentes: 'Pagamentos', posAtendimentosPendentes: 'P\u00f3s-atendimentos', oportunidadesSemAcao: 'Oportunidades', publicacoesNaoRealizadas: 'Publica\u00e7\u00f5es', notificacoesCriticasAbertas: 'Notifica\u00e7\u00f5es' };
        html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.82rem;border-bottom:1px solid var(--border-light);"><span>' + (labels[k] || k) + '</span><span>' + resumo.pendencias[k] + '</span></div>';
      });
    }
    var plano = FechamentoDia.getPlanoProximoDia();
    if (plano && plano.pendenciasTransferidas && plano.pendenciasTransferidas.length > 0) {
      html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);"><strong>Plano do dia seguinte:</strong></div>';
      plano.pendenciasTransferidas.forEach(function(p) {
        html += '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.78rem;color:var(--text-muted);"><span>' + p.label + '</span><span>' + p.quantidade + '</span></div>';
      });
    }
    html += '<div class="overlay-actions" style="margin-top:16px;"><button class="btn btn-primary" onclick="App._closeOverlay()">Iniciar dia</button></div>';
    this._showOverlay('Resumo do dia anterior', html);
  },

  bindNav() {
    document.querySelectorAll('[data-module]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(link.dataset.module);
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
