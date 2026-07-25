const MemoriaOperacional = {
  KEY: 'pirataria_memoria',

  _load: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || this._iniciar(); } catch(e) { return this._iniciar(); }
  },

  _save: function(m) {
    localStorage.setItem(this.KEY, JSON.stringify(m));
  },

  _iniciar: function() {
    return {
      uso: { sessao: 0, ultimoReset: DB._now() },
      temposResposta: [], temposAgendamento: [], temposExecucao: [],
      conversoes: [], cancelamentos: [],
      faturamentoDiario: {}, servicos: {}, origens: {},
      clientes: {}, horariosOciosos: [],
      ultimaAtualizacao: null
    };
  },

  // Alimentar via EventBus
  alimentar: function(evento, payload) {
    var m = this._load();
    m.uso.sessao++;
    m.ultimaAtualizacao = DB._now();

    if (evento === 'whatsapp.message.received' && payload) {
      // Rastrear tempo de resposta
    }
    if (evento === 'whatsapp.message.sent' && payload) {
      // Marcar resposta enviada
    }
    if (evento === 'agenda.created' && payload) {
      if (payload.service) m.servicos[payload.service] = (m.servicos[payload.service] || 0) + 1;
      if (payload.clientId) {
        if (!m.clientes[payload.clientId]) m.clientes[payload.clientId] = { visitas: 0, totalGasto: 0, agendamentos: 0, cancelamentos: 0, origens: [] };
        m.clientes[payload.clientId].agendamentos = (m.clientes[payload.clientId].agendamentos || 0) + 1;
      }
    }
    if (evento === 'agenda.cancelled' && payload) {
      if (payload.clientId && m.clientes[payload.clientId]) m.clientes[payload.clientId].cancelamentos = (m.clientes[payload.clientId].cancelamentos || 0) + 1;
    }
    if (evento === 'finance.payment.received' && payload) {
      var hoje = DB._today();
      m.faturamentoDiario[hoje] = (m.faturamentoDiario[hoje] || 0) + (parseFloat(payload.value) || 0);
      if (payload.clientId && m.clientes[payload.clientId]) {
        m.clientes[payload.clientId].totalGasto = (m.clientes[payload.clientId].totalGasto || 0) + (parseFloat(payload.value) || 0);
        m.clientes[payload.clientId].visitas = (m.clientes[payload.clientId].visitas || 0) + 1;
      }
    }

    this._save(m);
  },

  // Insights
  getInsights: function() {
    var m = this._load();
    var insights = [];

    // Serviço mais vendido
    var servicoTop = Object.keys(m.servicos).sort(function(a, b) { return m.servicos[b] - m.servicos[a]; });
    if (servicoTop.length > 0) insights.push({ tipo: 'info', label: 'Servi\u00e7o mais vendido', valor: servicoTop[0] + ' (' + m.servicos[servicoTop[0]] + 'x)', tendencia: '' });

    // Faturamento dos últimos 7 dias
    var hoje = DB._today();
    var seteDias = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    var fat7d = 0, count7d = 0;
    Object.keys(m.faturamentoDiario).forEach(function(d) {
      if (d >= seteDias && d <= hoje) { fat7d += m.faturamentoDiario[d]; count7d++; }
    });
    if (count7d > 0) insights.push({ tipo: 'info', label: 'Faturamento m\u00e9dio (7 dias)', valor: 'R$ ' + (fat7d / count7d).toFixed(2).replace('.', ','), tendencia: '' });

    // Clientes VIP (mais de 3 visitas)
    var vips = Object.keys(m.clientes).filter(function(id) { return (m.clientes[id].visitas || 0) >= 3; });
    if (vips.length > 0) insights.push({ tipo: 'info', label: 'Clientes VIP (3+ visitas)', valor: vips.length + ' clientes', tendencia: '' });

    // Clientes com alta taxa de cancelamento
    var altaTaxa = Object.keys(m.clientes).filter(function(id) {
      var c = m.clientes[id];
      var total = (c.agendamentos || 0);
      return total >= 3 && (c.cancelamentos || 0) / total > 0.3;
    });
    if (altaTaxa.length > 0) insights.push({ tipo: 'alerta', label: 'Clientes com alta taxa de cancelamento', valor: altaTaxa.length + ' clientes', tendencia: 'Aten\u00e7\u00e3o' });

    // Total de eventos processados
    insights.push({ tipo: 'info', label: 'Eventos processados', valor: m.uso.sessao + ' eventos', tendencia: '' });

    return insights;
  },

  // Perfil de cliente
  getPerfilCliente: function(clientId) {
    var m = this._load();
    var c = m.clientes[clientId];
    if (!c) return null;
    var total = c.agendamentos || 0;
    var taxaCancelamento = total > 0 ? Math.round((c.cancelamentos || 0) / total * 100) : 0;
    return {
      visitas: c.visitas || 0,
      totalGasto: c.totalGasto || 0,
      agendamentos: c.agendamentos || 0,
      cancelamentos: c.cancelamentos || 0,
      taxaCancelamento: taxaCancelamento,
      scoreRelacionamento: Math.min(100, ((c.visitas || 0) * 20 + (c.totalGasto || 0) / 10)),
      probabilidadeConversao: total > 3 ? 'Alta' : total > 1 ? 'M\u00e9dia' : 'Baixa',
      frequenciaRetorno: c.visitas > 0 && c.totalGasto > 0 ? 'Regular' : 'Ocasional'
    };
  },

  // Tendências
  getTendencias: function() {
    var m = this._load();
    var hoje = DB._today();
    var seteDias = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    var trintaDias = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    var fat7d = 0, fat30d = 0;
    Object.keys(m.faturamentoDiario).forEach(function(d) {
      if (d >= seteDias) fat7d += m.faturamentoDiario[d];
      if (d >= trintaDias) fat30d += m.faturamentoDiario[d];
    });

    return { faturamento7d: fat7d, faturamento30d: fat30d, servicos: m.servicos, clientesAtivos: Object.keys(m.clientes).length };
  },

  // Sugestões para o Copiloto/Operador
  getSugestoes: function() {
    var insights = this.getInsights();
    var sugestoes = [];
    insights.forEach(function(i) {
      if (i.tipo === 'alerta') {
        sugestoes.push('Aten\u00e7\u00e3o: ' + i.label + ' (' + i.valor + ')');
      }
    });
    return sugestoes;
  },

  // Limpar dados
  reset: function() {
    this._save(this._iniciar());
  }
};

// Auto-registrar no EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  var eventos = [
    'whatsapp.message.received', 'whatsapp.message.sent',
    'agenda.created', 'agenda.cancelled',
    'crm.updated', 'finance.payment.received'
  ];
  eventos.forEach(function(evt) {
    EventBus.on(evt, function(payload) {
      MemoriaOperacional.alimentar(evt, payload);
    });
  });
})();
