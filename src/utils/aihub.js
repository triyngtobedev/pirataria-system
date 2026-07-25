const AIHub = {
  _history: [],
  _maxHistory: 500,
  _insightId: 0,

  _nextId: function() { return 'ai_' + (++this._insightId) + '_' + Date.now().toString(36); },

  _make: function(tipo, categoria, prioridade, titulo, descricao, origemModulo, origemId, actionLabel, actionTarget, actionParams) {
    return { id: this._nextId(), tipo: tipo, categoria: categoria, prioridade: prioridade, titulo: titulo, descricao: descricao, origemModulo: origemModulo, origemId: origemId || null, actionLabel: actionLabel || '', actionTarget: actionTarget || '', actionParams: actionParams || '', createdAt: DB._now() };
  },

  // ─── Histórico ───
  _log: function(insight, status) {
    this._history.push({ insightId: insight.id, tipo: insight.tipo, prioridade: insight.prioridade, titulo: insight.titulo, status: status || 'apareceu', createdAt: DB._now() });
    if (this._history.length > this._maxHistory) this._history.splice(0, this._history.length - this._maxHistory);
  },

  getHistory: function() { return this._history.slice().reverse(); },

  markResolved: function(insightId) {
    var h = this._history.find(function(x) { return x.insightId === insightId; });
    if (h) h.status = 'resolvido';
  },

  // ─── Insights ───

  _analiseCRM: function() {
    var insights = [];
    var hoje = DB._today();
    var clientes = DB.getClients();

    // Clientes sem resposta (criados há mais de 30 dias sem agendamento)
    var trintaDias = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    clientes.forEach(function(c) {
      if (c.createdAt && c.createdAt.slice(0, 10) < trintaDias && (!c.lastVisit || c.lastVisit < trintaDias)) {
        var apps = DB.getAppointments().filter(function(a) { return a.clientId === c.id; });
        if (apps.length === 0) {
          insights.push(AIHub._make('oportunidade', 'crm', 2, c.name + ' sem retorno', 'Cliente cadastrado h\u00e1 mais de 30 dias sem agendamento.', 'clientes', c.id, 'Agendar', 'navigate', 'agenda'));
        }
      }
    });

    // Cliente VIP (mais de 3 visitas)
    clientes.forEach(function(c) {
      if ((c.totalVisits || 0) >= 3) {
        insights.push(AIHub._make('info', 'crm', 3, c.name + ' — Cliente VIP', (c.totalVisits || 0) + ' atendimentos realizados. Considere programa de fidelidade.', 'clientes', c.id, 'Ver cliente', 'cliente', c.id));
      }
    });

    // Cliente recorrente (visitou nos últimos 15 dias)
    var quinzeDias = new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10);
    clientes.forEach(function(c) {
      if (c.lastVisit && c.lastVisit >= quinzeDias) {
        insights.push(AIHub._make('info', 'crm', 3, c.name + ' — Retorno recente', 'Cliente visitou recentemente (' + c.lastVisit + ').', 'clientes', c.id, 'Ver', 'cliente', c.id));
      }
    });

    return insights;
  },

  _analiseOrcamentos: function() {
    var insights = [];
    var hoje = DB._today();
    var orcamentos = DB.getOrcamentos();

    // Orçamento parado há mais de 7 dias
    var seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
    orcamentos.forEach(function(o) {
      if ((o.status === 'enviado' || o.status === 'visualizado' || o.status === 'em_negociacao') && o.updatedAt && o.updatedAt < seteDias) {
        insights.push(AIHub._make('alerta', 'orcamentos', 1, 'Or\u00e7amento #' + o.numero + ' parado', 'Or\u00e7amento de ' + o.nomeCliente + ' sem resposta h\u00e1 mais de 7 dias.', 'orcamentos', o.id, 'Abrir', 'navigate', 'orcamentos'));
      }
    });

    // Orçamento vencendo em 3 dias
    var tresDias = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    orcamentos.forEach(function(o) {
      if (o.status === 'enviado' && o.validade && o.validade <= tresDias && o.validade >= DB._today()) {
        insights.push(AIHub._make('alerta', 'orcamentos', 1, 'Or\u00e7amento #' + o.numero + ' vencendo', 'Or\u00e7amento de ' + o.nomeCliente + ' vence em breve.', 'orcamentos', o.id, 'Abrir', 'navigate', 'orcamentos'));
      }
    });

    return insights;
  },

  _analisePosAtendimento: function() {
    var insights = [];
    var hoje = DB._today();
    var planos = DB.getPlanos();

    // Plano ativo com etapa vencida
    planos.forEach(function(p) {
      if (p.status !== 'ativo') return;
      var etapas = DB.getEtapas(p.id);
      etapas.forEach(function(e) {
        if (e.status === 'pendente' && e.dataPrevista && e.dataPrevista < hoje) {
          var client = DB.getClient(p.clientId);
          insights.push(AIHub._make('alerta', 'posatendimento', 0, (client ? client.name : 'Cliente') + ' — Retorno vencido', 'Etapa ' + e.label + ' vencida em ' + e.dataPrevista + '.', 'posatendimento', e.id, 'Ver cliente', 'cliente', p.clientId));
        }
      });
    });

    // Plano concluído sem marketing
    planos.forEach(function(p) {
      if (p.status !== 'concluido') return;
      var temConteudo = DB.getCalendario().some(function(c) { return c.planoAcompanhamentoId === p.id; });
      if (!temConteudo) {
        var client = DB.getClient(p.clientId);
        insights.push(AIHub._make('oportunidade', 'posatendimento', 2, (client ? client.name : 'Cliente') + ' — Depoimento', 'Plano de acompanhamento conclu\u00eddo. Cliente apto para depoimento ou conte\u00fado.', 'posatendimento', p.id, 'Criar conte\u00fado', 'navigate', 'marketing'));
      }
    });

    return insights;
  },

  _analiseMarketing: function() {
    var insights = [];
    var hoje = DB._today();

    // Conteúdo atrasado
    var calendario = DB.getCalendario();
    calendario.forEach(function(c) {
      if (c.dataPrevista && c.dataPrevista < hoje && c.status !== 'publicado' && c.status !== 'cancelado') {
        insights.push(AIHub._make('alerta', 'marketing', 1, 'Conte\u00fado atrasado: ' + c.titulo, 'Data prevista: ' + c.dataPrevista, 'marketing', c.id, 'Abrir', 'navigate', 'marketing'));
      }
    });

    return insights;
  },

  _analiseFinanceiro: function() {
    var insights = [];
    var hoje = DB._today();

    // Caixa aberto
    var cashier = DB.getOpenCashier();
    if (cashier && !cashier.closedAt) {
      var horasAberto = Math.round((Date.now() - new Date(cashier.openedAt).getTime()) / 3600000);
      if (horasAberto > 4) {
        insights.push(AIHub._make('alerta', 'financeiro', 1, 'Caixa aberto h\u00e1 ' + horasAberto + 'h', 'Considere fechar o caixa.', 'financeiro', cashier.id, 'Fechar', 'navigate', 'financeiro'));
      }
    }

    return insights;
  },

  _analiseEstoque: function() {
    var insights = [];
    var produtos = DB.getProducts();

    // Estoque crítico
    produtos.forEach(function(p) {
      if (!p.active) return;
      var stock = parseInt(p.stock) || 0;
      var min = parseInt(p.minStock) || 0;
      if (min > 0 && stock <= min) {
        insights.push(AIHub._make('alerta', 'estoque', 1, p.name + ' — Estoque cr\u00edtico', 'Estoque: ' + stock + ' | M\u00ednimo: ' + min, 'estoque', p.id, 'Abrir', 'navigate', 'estoque'));
      }
    });

    return insights;
  },

  _analiseConhecimento: function() {
    var insights = [];
    var artigos = DB.getKBArticles();

    // Artigos favoritos
    var favoritos = artigos.filter(function(a) { return a.favorito && a.ativo !== false; });
    if (favoritos.length > 0) {
      insights.push(AIHub._make('info', 'conhecimento', 3, favoritos.length + ' artigo(s) favorito(s) na base', 'Consulte a Base de Conhecimento para acess\u00e1-los.', 'conhecimento', null, 'Abrir', 'navigate', 'conhecimento'));
    }

    return insights;
  },

  _analiseHoje: function() {
    var insights = [];
    var hoje = DB._today();
    var apps = DB.getAppointmentsByDate(hoje);
    var concluidos = apps.filter(function(a) { return a.status === 'completed'; }).length;
    var total = apps.length;

    // Muitos cancelamentos
    var cancelados = apps.filter(function(a) { return a.status === 'cancelled'; }).length;
    if (total > 0 && cancelados / total > 0.3) {
      insights.push(AIHub._make('alerta', 'agenda', 1, 'Taxa de cancelamento alta', (cancelados / total * 100).toFixed(0) + '% dos agendamentos de hoje foram cancelados.', 'agenda', null, 'Ver agenda', 'navigate', 'agenda'));
    }

    return insights;
  },

  _analiseInbox: function() {
    var insights = [];
    var conversas = DB.getConversas();

    // Conversas aguardando resposta do estúdio há mais de 24h
    var umDia = Date.now() - 86400000;
    conversas.forEach(function(c) {
      if (c.status === 'aguardando_estudio' && c.ultimaInteracao) {
        var ultima = new Date(c.ultimaInteracao).getTime();
        if (ultima < umDia) {
          insights.push(AIHub._make('alerta', 'inbox', 0, 'Conversa aguardando: ' + c.clientName, 'Cliente aguarda resposta h\u00e1 mais de 24h.', 'inbox', c.id, 'Abrir', 'navigate', 'inbox'));
        }
      }
    });

    return insights;
  },

  // ─── Coletores públicos ───

  _analiseWhatsApp: function() {
    var insights = [];
    var wpp = typeof Inbox.collectWhatsApp === 'function' ? Inbox.collectWhatsApp() : [];
    if (wpp.length === 0) return insights;

    // Quem responder primeiro
    if (wpp.length > 0) {
      insights.push(AIHub._make('alerta', 'whatsapp', 0, wpp[0].clientName + ' — ' + wpp[0].motivoLabel, wpp[0].statusLabel + ' | ' + wpp[0].tempoLabel + ' | ' + wpp[0].nextAction, 'inbox', wpp[0].id, 'Responder', 'navigate', 'inbox'));
    }

    // Conversa com maior risco de perda (mais tempo sem resposta + prioridade)
    var maiorRisco = wpp.filter(function(i) { return i.status === 'aguardando_estudio'; }).sort(function(a, b) { return (b.tempoDesdeUltima || 0) - (a.tempoDesdeUltima || 0); });
    if (maiorRisco.length > 0 && maiorRisco[0].tempoDesdeUltima > 120) {
      insights.push(AIHub._make('alerta', 'whatsapp', 1, 'Risco de perda: ' + maiorRisco[0].clientName, 'Cliente aguarda h\u00e1 ' + maiorRisco[0].tempoLabel + '. Priorizar resposta.', 'inbox', maiorRisco[0].id, 'Responder', 'navigate', 'inbox'));
    }

    // Conversa com maior chance de conversão (motivo agendamento/orçamento)
    var maiorChance = wpp.filter(function(i) { return i.motivo === 'agendamento' || i.motivo === 'orcamento'; });
    if (maiorChance.length > 0) {
      insights.push(AIHub._make('oportunidade', 'whatsapp', 2, maiorChance[0].clientName + ' — ' + maiorChance[0].motivoLabel, 'Cliente com inten\u00e7\u00e3o de ' + maiorChance[0].motivoLabel.toLowerCase() + '. Priorizar atendimento.', 'inbox', maiorChance[0].id, 'Atender', 'navigate', 'inbox'));
    }

    // Acima do tempo ideal (>2h sem resposta)
    var acimaDoIdeal = wpp.filter(function(i) { return i.status === 'aguardando_estudio' && i.tempoDesdeUltima !== null && i.tempoDesdeUltima > 120; }).length;
    if (acimaDoIdeal > 0) {
      insights.push(AIHub._make('alerta', 'whatsapp', 2, acimaDoIdeal + ' conversa' + (acimaDoIdeal !== 1 ? 's' : '') + ' acima do tempo ideal', 'Tempo de resposta superior a 2h.', 'inbox', null, 'Ver conversas', 'navigate', 'inbox'));
    }

    return insights;
  },

  _analiseInstagram: function() {
    var insights = [];
    var ig = Marketing.getResumoInstagram();
    if (ig.hoje > 0) {
      insights.push(AIHub._make('alerta', 'instagram', 1, ig.hoje + ' publica\u00e7\u00e3o' + (ig.hoje !== 1 ? '\u00f5es' : '') + ' para hoje', 'Conte\u00fado(s) agendado(s) para publica\u00e7\u00e3o hoje.', 'marketing', null, 'Ver marketing', 'navigate', 'marketing'));
    }
    if (ig.atrasados > 0) {
      insights.push(AIHub._make('alerta', 'instagram', 1, ig.atrasados + ' publica\u00e7\u00e3o' + (ig.atrasados !== 1 ? '\u00f5es' : '') + ' atrasada' + (ig.atrasados !== 1 ? 's' : ''), 'Conte\u00fado(s) com data vencida sem publica\u00e7\u00e3o.', 'marketing', null, 'Ver atrasados', 'navigate', 'marketing'));
    }
    if (ig.prontos > 0) {
      insights.push(AIHub._make('info', 'instagram', 2, ig.prontos + ' conte\u00fado' + (ig.prontos !== 1 ? 's' : '') + ' pronto' + (ig.prontos !== 1 ? 's' : '') + ' para publicar', 'Materiais produzidos aguardando publica\u00e7\u00e3o.', 'marketing', null, 'Ver prontos', 'navigate', 'marketing'));
    }
    return insights;
  },

  _analiseAgendamento: function() {
    var insights = [];
    var hoje = DB._today();
    var conversas = DB.getConversas().filter(function(c) { return c.status !== 'encerrada'; });
    var solicitacoes = 0;
    for (var i = 0; i < conversas.length; i++) {
      var msgs = DB.getMensagens(conversas[i].id);
      for (var j = 0; j < msgs.length; j++) {
        if (msgs[j].type === 'recebida' && AgendamentoAssistente.detectarIntencao(msgs[j].content)) {
          solicitacoes++;
          break;
        }
      }
    }
    if (solicitacoes > 0) {
      insights.push(AIHub._make('alerta', 'agendamento', 1, solicitacoes + ' solicita\u00e7\u00e3o' + (solicitacoes !== 1 ? '\u00f5es' : '') + ' de agendamento aguardando', 'Clientes demonstraram interesse em agendar. Ofere\u00e7a hor\u00e1rios dispon\u00edveis.', 'inbox', null, 'Ver conversas', 'navigate', 'inbox'));
    }
    var hojeApps = DB.getAppointmentsByDate(hoje);
    var criadosHoje = hojeApps.filter(function(a) {
      return a.createdAt && a.createdAt.slice(0, 10) === hoje;
    }).length;
    if (criadosHoje > 0) {
      insights.push(AIHub._make('info', 'agendamento', 3, criadosHoje + ' agendamento' + (criadosHoje !== 1 ? 's' : '') + ' criado' + (criadosHoje !== 1 ? 's' : '') + ' hoje', 'Novos agendamentos registrados no sistema.', 'agenda', null, 'Ver agenda', 'navigate', 'agenda'));
    }
    return insights;
  },

  _analiseConfirmacao: function() {
    var insights = [];
    var resumo = Confirmacao.getResumo();
    if (resumo.riscoAlto > 0) {
      insights.push(AIHub._make('alerta', 'confirmacao', 0, resumo.riscoAlto + ' agendamento' + (resumo.riscoAlto !== 1 ? 's' : '') + ' com alto risco de falta', 'Priorize a confirma\u00e7\u00e3o destes clientes.', 'agenda', null, 'Ver confirma\u00e7\u00f5es', 'navigate', 'confirmacao'));
    }
    if (resumo.hojeNaoConfirmados > 0) {
      insights.push(AIHub._make('alerta', 'confirmacao', 1, resumo.hojeNaoConfirmados + ' agendamento' + (resumo.hojeNaoConfirmados !== 1 ? 's' : '') + ' de hoje n\u00e3o confirmado' + (resumo.hojeNaoConfirmados !== 1 ? 's' : ''), 'Clientes com agendamento hoje sem confirma\u00e7\u00e3o.', 'agenda', null, 'Confirmar agora', 'navigate', 'confirmacao'));
    }
    if (resumo.pendentes > 0) {
      insights.push(AIHub._make('info', 'confirmacao', 2, resumo.pendentes + ' confirma\u00e7\u00e3o' + (resumo.pendentes !== 1 ? '\u00f5es' : '') + ' pendente' + (resumo.pendentes !== 1 ? 's' : ''), 'Total de agendamentos aguardando confirma\u00e7\u00e3o.', 'agenda', null, 'Ver todas', 'navigate', 'confirmacao'));
    }
    return insights;
  },

  _analiseComunicacao: function() {
    var insights = [];
    var r = Comunicacao.getResumoOperacional();
    if (r.whatsapp.pendentes > 0) {
      insights.push(AIHub._make('alerta', 'comunicacao', 0, r.whatsapp.pendentes + ' conversa' + (r.whatsapp.pendentes !== 1 ? 's' : '') + ' sem resposta no WhatsApp', 'Priorize o atendimento no WhatsApp.', 'inbox', null, 'Abrir WhatsApp', 'navigate', 'inbox'));
    }
    if (r.agenda.confirmar > 0) {
      insights.push(AIHub._make('alerta', 'comunicacao', 1, r.agenda.confirmar + ' agendamento' + (r.agenda.confirmar !== 1 ? 's' : '') + ' pendente' + (r.agenda.confirmar !== 1 ? 's' : '') + ' de confirma\u00e7\u00e3o', 'Confirme os agendamentos pendentes.', 'agenda', null, 'Ver agenda', 'navigate', 'agenda'));
    }
    if (r.instagram.pendente > 0) {
      insights.push(AIHub._make('alerta', 'comunicacao', 2, r.instagram.pendente + ' publica\u00e7\u00e3o' + (r.instagram.pendente !== 1 ? '\u00f5es' : '') + ' atrasada' + (r.instagram.pendente !== 1 ? 's' : '') + ' no Instagram', r.instagram.pendente + ' conte\u00fado' + (r.instagram.pendente !== 1 ? 's' : '') + ' aguardando publica\u00e7\u00e3o.', 'marketing', null, 'Ver marketing', 'navigate', 'marketing'));
    }
    if (r.calendario.pendente > 0) {
      insights.push(AIHub._make('info', 'comunicacao', 2, 'Google Calendar com eventos pendentes', r.calendario.label, 'comunicacao', null, 'Abrir', 'navigate', 'comunicacao'));
    }
    return insights;
  },

  _analiseFila: function() {
    var insights = [];
    var fila = Fila.collect();
    var criticos = fila.filter(function(i) { return i.prioridade >= 80; });
    criticos.forEach(function(i) {
      insights.push(AIHub._make('alerta', 'fila', 0, i.clientName + ' — ' + i.tipo + ' (prioridade ' + i.prioridade + ')', 'Motivos: ' + i.motivos.slice(0, 2).join('; '), 'fila', i.id, i.labelAcao || 'Abrir', 'navigate', i.targetAcao || 'filas'));
    });
    var tempoMedio = Fila.getTempoMedioPorPrioridade();
    if (tempoMedio['81-100'] > 30) {
      insights.push(AIHub._make('alerta', 'fila', 1, 'Tempo de espera alto para prioridade cr\u00edtica', 'M\u00e9dia de ' + Math.floor(tempoMedio['81-100'] / 60) + 'h' + (tempoMedio['81-100'] % 60) + 'min para prioridade 81-100.', 'fila', null, 'Ver fila', 'navigate', 'filas'));
    }
    return insights;
  },

  _analiseOnboarding: function() {
    var insights = [];
    if (typeof Onboarding === 'undefined' || Onboarding.isComplete()) return insights;
    var comp = Onboarding.getCompleteness();
    if (comp.percent < 100) {
      insights.push(AIHub._make('alerta', 'onboarding', 0, 'Configura\u00e7\u00e3o incompleta (' + comp.percent + '%)', comp.naoConfigurados.length + ' item(ns) pendente(s): ' + comp.naoConfigurados.map(function(i) { return i.label; }).join(', '), 'onboarding', null, 'Continuar configura\u00e7\u00e3o', 'navigate', 'studio'));
    }
    if (comp.percent >= 80 && comp.percent < 100) {
      insights.push(AIHub._make('info', 'onboarding', 2, 'Quase l\u00e1', 'Faltam ' + comp.naoConfigurados.length + ' configura\u00e7\u00f5es. Revise o checklist.', 'onboarding', null, 'Ver checklist', 'navigate', 'studio'));
    }
    return insights;
  },

  _analiseOportunidades: function() {
    var insights = [];
    var ops = Oportunidade.collect();
    var criticas = ops.filter(function(o) { return o.score >= 80; });
    criticas.forEach(function(o) {
      insights.push(AIHub._make('oportunidade', 'oportunidades', 1, o.clientName + ' — ' + o.categoriaLabel, o.descricao, 'oportunidades', o.id, o.btnLabel || 'Abrir', 'navigate', o.btnTarget || 'oportunidades'));
    });
    var total = ops.length;
    if (total > 0) {
      insights.push(AIHub._make('info', 'oportunidades', 3, total + ' oportunidade' + (total !== 1 ? 's' : '') + ' dispon\u00edvel' + (total !== 1 ? 'is' : ''), 'Acesse a Central de Oportunidades para visualizar todas.', 'oportunidades', null, 'Abrir', 'navigate', 'oportunidades'));
    }
    return insights;
  },

  collect: function() {
    return [].concat(
      this._analiseOnboarding(),
      this._analiseWhatsApp(),
      this._analiseInstagram(),
      this._analiseAgendamento(),
      this._analiseConfirmacao(),
      this._analiseComunicacao(),
      this._analiseCRM(),
      this._analiseOrcamentos(),
      this._analisePosAtendimento(),
      this._analiseMarketing(),
      this._analiseFinanceiro(),
      this._analiseEstoque(),
      this._analiseConhecimento(),
      this._analiseHoje(),
      this._analiseInbox(),
      this._analiseOportunidades(),
      this._analiseFila()
    );
  },

  getInsights: function() { return this.collect(); },

  getPrioridades: function() {
    return this.collect().filter(function(i) { return i.prioridade <= 1; });
  },

  getOpportunities: function() {
    return this.collect().filter(function(i) { return i.tipo === 'oportunidade'; });
  },

  getWarnings: function() {
    return this.collect().filter(function(i) { return i.tipo === 'alerta'; });
  },

  getMetrics: function() {
    var all = this.collect();
    var prioridades = all.filter(function(i) { return i.prioridade <= 1; }).length;
    var oportunidades = all.filter(function(i) { return i.tipo === 'oportunidade'; }).length;
    var alertas = all.filter(function(i) { return i.tipo === 'alerta'; }).length;
    var info = all.filter(function(i) { return i.tipo === 'info'; }).length;
    return { total: all.length, prioridades: prioridades, oportunidades: oportunidades, alertas: alertas, info: info };
  },

  // ─── Score Operacional (0-100) ───

  getScore: function() {
    var score = 100;

    // Penalidade por pendências (atendimentos in_progress sem OS + sem termo)
    var hoje = DB._today();
    var inProgress = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status === 'in_progress'; }).length + DB.getQueue().filter(function(q) { return q.status === 'in_progress'; }).length;
    score -= Math.min(inProgress * 5, 30);

    // Penalidade por orçamentos parados
    var orcamentosParados = DB.getOrcamentos().filter(function(o) { return o.status === 'enviado' || o.status === 'visualizado' || o.status === 'em_negociacao'; }).length;
    score -= Math.min(orcamentosParados * 3, 15);

    // Penalidade por retornos vencidos
    var etapasVencidas = DB.getEtapasVencidas().length;
    score -= Math.min(etapasVencidas * 5, 20);

    // Penalidade por caixa aberto
    var cashier = DB.getOpenCashier();
    if (cashier && !cashier.closedAt) {
      var horas = (Date.now() - new Date(cashier.openedAt).getTime()) / 3600000;
      if (horas > 4) score -= 5;
    }

    // Penalidade por conteúdo atrasado
    var conteudoAtrasado = DB.getCalendario().filter(function(c) { return c.dataPrevista && c.dataPrevista < hoje && c.status !== 'publicado' && c.status !== 'cancelado'; }).length;
    score -= Math.min(conteudoAtrasado * 3, 10);

    // Penalidade por estoque crítico
    var estoqueCritico = DB.getProducts().filter(function(p) { return p.active && parseInt(p.stock) <= parseInt(p.minStock); }).length;
    score -= Math.min(estoqueCritico * 3, 10);

    // Penalidade por conversas sem resposta
    var convAtrasadas = DB.getConversas().filter(function(c) { return c.status === 'aguardando_estudio' && c.ultimaInteracao && new Date(c.ultimaInteracao).getTime() < Date.now() - 86400000; }).length;
    score -= Math.min(convAtrasadas * 5, 10);

    return Math.max(0, Math.min(100, score));
  },

  // ─── Context Builder ───

  buildContext: function() {
    var hoje = DB._today();
    return {
      data: hoje,
      score: this.getScore(),
      crm: { clientes: DB.getClients().length, comNextAction: CRM.collectNegociacoes().length },
      agenda: { hoje: DB.getAppointmentsByDate(hoje).length },
      inbox: { abertas: DB.getConversas().filter(function(c) { return c.status !== 'encerrada'; }).length },
      orcamentos: { abertos: DB.getOrcamentos().filter(function(o) { return o.status !== 'rascunho' && o.status !== 'recusado' && o.status !== 'expirado'; }).length },
      posAtendimento: { planosAtivos: DB.getPlanosAtivos().length },
      marketing: { calendario: DB.getCalendario().filter(function(c) { return c.status !== 'cancelado'; }).length },
      conhecimento: { artigos: DB.getKBArticles().filter(function(a) { return a.ativo !== false; }).length },
      financeiro: { caixaAberto: !!(DB.getOpenCashier() && !DB.getOpenCashier().closedAt) },
      estoque: { produtos: DB.getProducts().filter(function(p) { return p.active; }).length }
    };
  },

  // ─── Provider interface (futuro) ───
  _providers: { local: true },

  registerProvider: function(name, fn) { this._providers[name] = fn; },

  runProvider: function(name) {
    if (typeof this._providers[name] === 'function') return this._providers[name](this.buildContext());
    return [];
  }
};
