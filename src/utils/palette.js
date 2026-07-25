var Palette = {
  _actions: [],
  _open: false,
  _selected: -1,

  _defaultActions: [
    { id: 'novo-cliente', icon: 'person', title: 'Novo cliente', desc: 'Abrir formulário de cadastro de cliente', action: function() { App.navigate('clientes'); setTimeout(function() { App.showAddClient(); }, 150); } },
    { id: 'novo-agendamento', icon: 'calendar', title: 'Novo agendamento', desc: 'Criar um novo agendamento na agenda', action: function() { App.navigate('agenda'); setTimeout(function() { App.showAddAppointment(); }, 150); } },
    { id: 'agenda-hoje', icon: 'calendar', title: 'Agenda de hoje', desc: 'Ir para a agenda com foco no dia atual', action: function() { App.navigate('agenda'); } },
    { id: 'abrir-caixa', icon: 'coin', title: 'Abrir caixa', desc: 'Iniciar o caixa do dia', action: function() { App.navigate('financeiro'); setTimeout(function() { App._setFinTab('caixa'); App._renderFinCaixa(document.getElementById('finContent')); }, 150); } },
    { id: 'novo-lancamento', icon: 'coin', title: 'Novo lançamento financeiro', desc: 'Registrar receita ou despesa manual', action: function() { App.navigate('financeiro'); setTimeout(function() { App._showManualEntry('entrada'); }, 150); } },
    { id: 'nova-venda', icon: 'cart', title: 'Nova venda', desc: 'Iniciar uma venda no estoque', action: function() { App.navigate('estoque'); setTimeout(function() { App._setEstoqueTab('vendas'); App._renderEstoqueTab(); }, 150); } },
    { id: 'novo-produto', icon: 'box', title: 'Novo produto', desc: 'Cadastrar um novo produto no estoque', action: function() { App.navigate('estoque'); setTimeout(function() { App._showAddProduct(); }, 150); } },
    { id: 'relatorios', icon: 'chart', title: 'Relatórios', desc: 'Abrir o módulo de relatórios', action: function() { App.navigate('relatorios'); } },
    { id: 'exportar-backup', icon: 'box', title: 'Exportar backup', desc: 'Baixar um arquivo com todos os dados do sistema', action: function() { Backup.download(); } },
    { id: 'clientes', icon: 'person', title: 'Clientes', desc: 'Abrir o módulo de clientes', action: function() { App.navigate('clientes'); } },
    { id: 'agenda', icon: 'calendar', title: 'Agenda', desc: 'Abrir o módulo de agenda', action: function() { App.navigate('agenda'); } },
    { id: 'atendimento', icon: 'clock', title: 'Atendimento', desc: 'Abrir a fila de atendimento do dia', action: function() { App.navigate('atendimento'); } },
    { id: 'financeiro', icon: 'coin', title: 'Financeiro', desc: 'Abrir o módulo financeiro', action: function() { App.navigate('financeiro'); } },
    { id: 'estoque', icon: 'box', title: 'Estoque', desc: 'Abrir o módulo de estoque e vendas', action: function() { App.navigate('estoque'); } },
    { id: 'os', icon: 'document', title: 'Ordens de Serviço', desc: 'Consultar ordens de serviço emitidas', action: function() { App.navigate('os'); } },
    { id: 'termos', icon: 'document', title: 'Termos de Consentimento', desc: 'Consultar termos registrados', action: function() { App.navigate('termos'); } },
    { id: 'lembretes', icon: 'bell', title: 'Lembretes', desc: 'Gerenciar lembretes do estúdio', action: function() { App.navigate('lembretes'); } },
    { id: 'comissoes', icon: 'coin', title: 'Comissões', desc: 'Consultar comissões dos profissionais', action: function() { App.navigate('comissoes'); } },
    { id: 'vales', icon: 'tag', title: 'Vales', desc: 'Gerenciar créditos e vales dos clientes', action: function() { App.navigate('vales'); } },
    { id: 'pacotes', icon: 'box', title: 'Pacotes', desc: 'Gerenciar pacotes de serviços', action: function() { App.navigate('pacotes'); } },
    { id: 'studio', icon: 'box', title: 'Studio', desc: 'Configurações do estúdio', action: function() { App.navigate('studio'); } },
    { id: 'lembrete-novo', icon: 'bell', title: 'Novo lembrete', desc: 'Criar um novo lembrete', action: function() { App.navigate('lembretes'); setTimeout(function() { App._showAddLembrete(); }, 150); } },
  ],

  init: function() {
    this._actions = this._defaultActions.slice();
    this._build();
    this._bindKeys();
  },

  _build: function() {
    var el = document.createElement('div');
    el.id = 'paletteOverlay';
    el.className = 'palette-overlay';
    el.innerHTML = '<div class="palette-modal"><div class="palette-input-wrap"><svg class="palette-search-icon" viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.5"/><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><input type="text" id="paletteInput" class="palette-input" placeholder="O que voc\u00ea deseja fazer?" autocomplete="off" spellcheck="false"></div><div class="palette-results" id="paletteResults"></div><div class="palette-footer"><span class="palette-footer-hint"><span class="palette-kbd">&uarr;</span><span class="palette-kbd">&darr;</span> navegar</span><span class="palette-footer-hint"><span class="palette-kbd">Enter</span> selecionar</span><span class="palette-footer-hint"><span class="palette-kbd">Esc</span> fechar</span></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function(e) { if (e.target === el) Palette.close(); });
  },

  open: function() {
    if (this._open) return;
    this._open = true;
    this._selected = -1;
    var overlay = document.getElementById('paletteOverlay');
    var input = document.getElementById('paletteInput');
    overlay.classList.add('show');
    setTimeout(function() { input.focus(); }, 50);
    this._filter('');
  },

  close: function() {
    this._open = false;
    var overlay = document.getElementById('paletteOverlay');
    overlay.classList.remove('show');
  },

  _filter: function(query) {
    var q = query.toLowerCase().trim();
    var filtered = q ? this._actions.filter(function(a) { return a.title.toLowerCase().indexOf(q) >= 0 || a.desc.toLowerCase().indexOf(q) >= 0; }) : this._actions;
    this._selected = filtered.length > 0 ? 0 : -1;
    this._render(filtered);
  },

  _render: function(items) {
    var el = document.getElementById('paletteResults');
    var svgs = {
      person: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 18c0-4 3-7 7-7s7 3 7 7" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
      calendar: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><rect x="2" y="3" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="1" x2="6" y2="5" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="1" x2="14" y2="5" stroke="currentColor" stroke-width="1.5"/></svg>',
      clock: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="10" y1="6" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="10" x2="13" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      coin: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="8" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="8" x2="10" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="13" x2="12" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      cart: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M2 4h2l2 8h10l2-7H7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="16" r="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="16" r="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
      box: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><rect x="2" y="5" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M2 5l5-3h6l5 3" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="10" y1="6" x2="10" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>',
      document: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="12" x2="11" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      bell: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M6 14h8l2 3H4l2-3z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/><path d="M6 10c0-3 2-5 4-5s4 2 4 5v3H6v-3z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
      chart: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><rect x="2" y="10" width="4" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="8" y="5" width="4" height="13" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="14" y="8" width="4" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
      tag: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M2 2h7l9 9-7 7-9-9V2z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    };

    if (items.length === 0) {
      el.innerHTML = '<div class="palette-empty">Nenhum resultado encontrado.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var svg = svgs[item.icon] || svgs.box;
      var sel = i === this._selected ? ' palette-item-selected' : '';
      html += '<div class="palette-item' + sel + '" data-index="' + i + '" onclick="Palette._exec(' + i + ')"><div class="palette-item-icon">' + svg + '</div><div class="palette-item-body"><span class="palette-item-title">' + App._esc(item.title) + '</span><span class="palette-item-desc">' + App._esc(item.desc) + '</span></div></div>';
    }
    el.innerHTML = html;
    if (this._selected >= 0) {
      var selectedEl = el.querySelector('.palette-item-selected');
      if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
    }
  },

  _exec: function(index) {
    var items = this._getFiltered();
    if (index < 0 || index >= items.length) return;
    this.close();
    items[index].action();
  },

  _getFiltered: function() {
    var input = document.getElementById('paletteInput');
    if (!input) return this._actions;
    var q = input.value.toLowerCase().trim();
    return q ? this._actions.filter(function(a) { return a.title.toLowerCase().indexOf(q) >= 0 || a.desc.toLowerCase().indexOf(q) >= 0; }) : this._actions;
  },

  _bindKeys: function() {
    var self = this;

    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (self._open) self.close();
        else self.open();
        return;
      }
      if (e.key === 'Escape' && self._open) {
        self.close();
        return;
      }
      if (!self._open) return;

      var input = document.getElementById('paletteInput');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var items = document.querySelectorAll('.palette-item');
        self._selected = Math.min(self._selected + 1, items.length - 1);
        self._render(self._getFiltered());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        self._selected = Math.max(self._selected - 1, 0);
        self._render(self._getFiltered());
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var items = document.querySelectorAll('.palette-item');
        if (self._selected >= 0 && self._selected < items.length) {
          items[self._selected].click();
        }
      }
    });

    document.addEventListener('input', function(e) {
      if (e.target && e.target.id === 'paletteInput') {
        self._selected = 0;
        self._filter(e.target.value);
      }
    });
  },
};
