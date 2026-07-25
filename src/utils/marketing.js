const Marketing = {
  TIPOS: ['Story', 'Reel', 'Carrossel', 'Foto', 'V\u00eddeo', 'Bastidores'],
  STATUS: ['ideia', 'planejado', 'produzido', 'publicado', 'cancelado'],
  STATUS_LABELS: { ideia: 'Ideia', planejado: 'Planejado', produzido: 'Produzido', publicado: 'Publicado', cancelado: 'Cancelado' },

  createItem: function(data) { return DB.addCalendarioItem(data); },
  updateItem: function(id, data) { return DB.updateCalendarioItem(id, data); },
  getItem: function(id) { return DB.getCalendarioItem(id); },
  listItems: function() { return DB.getCalendario(); },

  createIdeia: function(data) { return DB.addIdeia(data); },
  updateIdeia: function(id, data) { return DB.updateIdeia(id, data); },
  getIdeias: function() { return DB.getIdeias(); },

  ideiaParaCalendario: function(ideiaId, dataPrevista, perfilDestino) {
    var ideia = DB.getIdeias().find(function(i) { return i.id === ideiaId; });
    if (!ideia) return null;
    return DB.addCalendarioItem({ dataPrevista: dataPrevista || '', tipo: ideia.categoria || 'Story', status: 'planejado', titulo: ideia.titulo, descricao: ideia.descricao, cta: ideia.sugestaoCTA || '', perfilDestino: perfilDestino || '', observacoes: 'Criado a partir de ideia' });
  },

  addCTA: function(texto) { return DB.addCTA({ texto: texto }); },
  getCTAs: function() { return DB.getCTAs(); },
  deleteCTA: function(id) { DB.deleteCTA(id); },

  addTemplate: function(data) { return DB.addTemplate(data); },
  getTemplates: function(tipo) {
    var todos = DB.getTemplates();
    return tipo ? todos.filter(function(t) { return t.tipo === tipo; }) : todos;
  },
  updateTemplate: function(id, data) { return DB.updateTemplate(id, data); },
  deleteTemplate: function(id) { DB.deleteTemplate(id); },

  autoSuggestFromPosAtendimento: function() {
    var planos = DB.getPlanos().filter(function(p) { return p.status === 'concluido' || p.status === 'ativo'; });
    var sugestoes = [];
    for (var i = 0; i < planos.length; i++) {
      var p = planos[i];
      var client = DB.getClient(p.clientId);
      if (!client) continue;
      var jaTemSugestao = DB.getCalendario().some(function(c) { return c.planoAcompanhamentoId === p.id; });
      if (jaTemSugestao) continue;
      sugestoes.push({ planoId: p.id, clientId: p.clientId, clientName: client.name, procedimento: p.procedimento, status: p.status });
    }
    return sugestoes;
  },

  criarSugestaoConteudo: function(planoId, clientId, clientName, procedimento) {
    var jaExiste = DB.getCalendario().some(function(c) { return c.planoAcompanhamentoId === planoId; });
    if (jaExiste) return null;
    return DB.addCalendarioItem({
      dataPrevista: '', tipo: 'Reel', status: 'ideia', titulo: clientName + ' — ' + procedimento,
      descricao: 'Conte\u00fado sugerido automaticamente. Cliente autorizado e com acompanhamento conclu\u00eddo.',
      clientId: clientId, planoAcompanhamentoId: planoId, perfilDestino: ''
    });
  },

  collectHoje: function() {
    var today = DB._today();
    var items = DB.getCalendario();
    var resultados = [];

    for (var i = 0; i < items.length; i++) {
      var c = items[i];
      if (c.status === 'cancelado' || c.status === 'publicado') continue;
      if (c.status === 'ideia' && c.dataPrevista && c.dataPrevista > today) continue;
      if (c.status === 'ideia' && !c.dataPrevista) {
        resultados.push({ id: 'mkt_' + c.id, icon: '\uD83D\uDCA1', title: 'Ideia: ' + c.titulo, desc: (c.descricao || '').substring(0, 60), prioridade: 3, modulo: 'marketing', refId: c.id, btnLabel: 'Planejar', btnAction: "App.navigate('marketing')", clientName: '', badge: null, badgeType: null });
        return;
      }
      if (!c.dataPrevista) continue;

      var isOverdue = c.dataPrevista < today;
      var isToday = c.dataPrevista === today;
      if (!isOverdue && !isToday) continue;

      var prio = isOverdue ? 0 : 1;
      var badge = isOverdue ? 'Atrasado' : 'Hoje';
      var bType = isOverdue ? 'danger' : 'warning';
      var icon = isOverdue ? '\u26A0' : '\uD83D\uDCF7';

      resultados.push({ id: 'mkt_' + c.id, icon: icon, title: c.titulo + (c.perfilDestino ? ' [' + c.perfilDestino + ']' : ''), desc: (c.descricao || '').substring(0, 60), prioridade: prio, modulo: 'marketing', refId: c.id, btnLabel: badge === 'Atrasado' ? 'Publicar' : 'Produzir', btnAction: "App.navigate('marketing')", clientName: '', badge: badge, badgeType: bType });
    }

    return resultados;
  },

  getMetrics: function() {
    var items = DB.getCalendario();
    var ideias = items.filter(function(c) { return c.status === 'ideia'; }).length;
    var planejados = items.filter(function(c) { return c.status === 'planejado'; }).length;
    var publicados = items.filter(function(c) { return c.status === 'publicado'; }).length;
    var atrasados = items.filter(function(c) { var d = c.dataPrevista; return d && d < DB._today() && c.status !== 'publicado' && c.status !== 'cancelado'; }).length;
    var clientesAutorizados = 0;
    var planos = DB.getPlanos();
    planos.forEach(function(p) { if (p.clientId && DB.getCalendario().some(function(c) { return c.clientId === p.clientId && c.status === 'publicado'; })) clientesAutorizados++; });
    var tipoDist = {};
    items.filter(function(c) { return c.status === 'publicado'; }).forEach(function(c) { tipoDist[c.tipo] = (tipoDist[c.tipo] || 0) + 1; });
    return { ideias: ideias, planejados: planejados, publicados: publicados, atrasados: atrasados, clientesAutorizados: clientesAutorizados, tipoDistribuicao: tipoDist };
  }
};
