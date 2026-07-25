const Onboarding = {
  STEPS: [
    { id: 'studio', label: 'Dados do Est\u00fadio' },
    { id: 'horarios', label: 'Hor\u00e1rios' },
    { id: 'profissionais', label: 'Profissionais' },
    { id: 'servicos', label: 'Servi\u00e7os' },
    { id: 'pagamentos', label: 'Pagamentos' },
    { id: 'joias', label: 'Categorias de Joias' },
    { id: 'agenda_config', label: 'Agenda' },
    { id: 'notificacoes', label: 'Notifica\u00e7\u00f5es' },
    { id: 'revisao', label: 'Revis\u00e3o Final' }
  ],

  KEY: 'pirataria_onboarding',

  isComplete: function() {
    var s = this.getState();
    return s && s.complete === true;
  },

  getState: function() {
    try {
      var raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  saveState: function(data) {
    var current = this.getState() || {};
    var merged = {};
    Object.keys(current).forEach(function(k) { merged[k] = current[k]; });
    Object.keys(data).forEach(function(k) { merged[k] = data[k]; });
    merged.updatedAt = new Date().toISOString();
    localStorage.setItem(this.KEY, JSON.stringify(merged));
    return merged;
  },

  getCurrentStep: function() {
    var s = this.getState();
    if (!s || !s.currentStep) return 0;
    var idx = this.STEPS.findIndex(function(st) { return st.id === s.currentStep; });
    return idx >= 0 ? idx : 0;
  },

  markComplete: function() {
    var s = this.getState() || {};
    s.complete = true;
    s.completedAt = new Date().toISOString();
    s.currentStep = 'complete';
    localStorage.setItem(this.KEY, JSON.stringify(s));
  },

  reset: function() {
    localStorage.removeItem(this.KEY);
  },

  getProgress: function() {
    var s = this.getState();
    if (!s || !s.currentStep) return { step: 0, total: this.STEPS.length, percent: 0 };
    if (s.complete) return { step: this.STEPS.length, total: this.STEPS.length, percent: 100 };
    var idx = this.STEPS.findIndex(function(st) { return st.id === s.currentStep; });
    var step = idx >= 0 ? idx : 0;
    return { step: step, total: this.STEPS.length, percent: Math.round(step / this.STEPS.length * 100) };
  },

  applyDefaults: function() {
    var s = this.getState();
    if (!s) return;

    // Studio
    if (s.studioName) {
      Repos.studio.settings.save({
        studioName: s.studioName,
        fantasia: s.fantasia || '',
        cnpj: s.cnpj || '',
        address: s.address || '',
        city: s.city || '',
        phone: s.phone || '',
        whatsapp: s.whatsapp || '',
        instagram: s.instagram || '',
        email: s.email || '',
        businessHours: s.businessHours || ''
      });
    }

    if (s.businessHours) {
      Repos.studio.settings.save({ businessHours: s.businessHours });
    }

    // Profissionais
    if (s.profissionais && s.profissionais.length > 0) {
      s.profissionais.forEach(function(nome) {
        if (nome.trim()) {
          DB.addProfessional({ name: nome, displayName: nome, commissionPct: '0' });
        }
      });
    }

    // Serviços
    if (s.servicos && s.servicos.length > 0) {
      s.servicos.forEach(function(nome) {
        if (nome.trim()) {
          var existing = Repos.studio.services.list();
          if (!existing.some(function(x) { return x.name === nome; })) {
            Repos.studio.services.create({ name: nome });
          }
        }
      });
    }

    // Formas de pagamento
    if (s.pagamentos && s.pagamentos.length > 0) {
      s.pagamentos.forEach(function(nome) {
        if (nome.trim()) {
          Repos.financeiro.paymentMethods.create({ name: nome });
        }
      });
    }

    // Categorias de joias
    if (s.joias && s.joias.length > 0 && typeof Repos.produtos !== 'undefined') {
      s.joias.forEach(function(nome) {
        if (nome.trim()) {
          Repos.produtos.categories.create({ name: nome });
        }
      });
    }
  },

  getConfigChecklist: function() {
    var settings = Repos.studio.settings.get();
    var profs = Repos.studio.professionals.active();
    var servicos = Repos.studio.services.active();
    var pagamentos = Repos.financeiro.paymentMethods.list();
    var cats = (typeof Repos.produtos !== 'undefined') ? Repos.produtos.categories.list() : [];

    var items = [
      { label: 'Nome do est\u00fadio', ok: !!(settings.studioName && settings.studioName !== 'Pirataria Body Art') },
      { label: 'Endere\u00e7o configurado', ok: !!settings.address },
      { label: 'Telefone configurado', ok: !!settings.phone },
      { label: 'Instagram configurado', ok: !!settings.instagram },
      { label: 'Hor\u00e1rio de funcionamento', ok: !!settings.businessHours },
      { label: 'Profissionais cadastrados', ok: profs.length > 0 },
      { label: 'Servi\u00e7os cadastrados', ok: servicos.length > 0 },
      { label: 'Formas de pagamento', ok: pagamentos.length > 0 },
      { label: 'Categorias de estoque', ok: cats.length > 0 }
    ];
    return items;
  },

  getCompleteness: function() {
    var checklist = this.getConfigChecklist();
    var ok = checklist.filter(function(i) { return i.ok; }).length;
    var total = checklist.length;
    return {
      percent: total > 0 ? Math.round(ok / total * 100) : 0,
      items: checklist,
      naoConfigurados: checklist.filter(function(i) { return !i.ok; })
    };
  }
};
