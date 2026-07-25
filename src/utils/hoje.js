const Hoje = {
  _seq: 0,

  collect() {
    const today = DB._today();
    this._seq = 0;

    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const seteDiasMs = 7 * 86400000;
    const sessentaDiasMs = 60 * 86400000;

    const inProgressAgenda = Repos.agenda.byDate(today).filter(function(a) { return a.status === 'in_progress'; });
    const inProgressWalkin = Repos.atendimento.queue.list().filter(function(q) { return q.status === 'in_progress'; });
    const ordens = DB.getOrdensServico();
    const termos = DB.getTermos();
    const ledger = DB.getLedger(today);
    const cashier = DB.getOpenCashier();
    const lembretes = DB.getLembretes();
    const clientes = DB.getClients();
    const vales = DB.getVales();
    const queue = Repos.atendimento.queue.list();

    // ── Bloco 1: Ações Prioritárias ──
    var acoes = [];

    const activeItems = inProgressAgenda.map(function(a) { return { item: a, type: 'agenda' }; })
      .concat(inProgressWalkin.map(function(w) { return { item: w, type: 'walkin' }; }));

    activeItems.forEach(function(entry) {
      var item = entry.item;
      var clientName = item.clientName;
      var service = item.service || '';
      var professional = item.professional || '';

      var hasOS = ordens.some(function(o) { return o.clientName === clientName && o.date === today; });
      var matchingTermos = termos.filter(function(t) { return t.clientName === clientName && t.procedure === service; });
      var hasTermo = matchingTermos.length > 0;
      var termoSigned = matchingTermos.some(function(t) { return t.status === 'signed' || !!t.signature; });
      var hasPayment = ledger.some(function(l) { return l.description && l.description.indexOf(clientName) >= 0; });

      if (!hasOS) {
        acoes.push(Hoje._card(
          'na_os_' + item.id, 'atendimento', item.id, clientName,
          '\u2610', 'Criar Ordem de Servi\u00e7o',
          'Atendimento em andamento sem OS vinculada.',
          0,
          'Criar OS',
          "App._showOverlay('Gerar Ordem de Servi\u00e7o',App._buildOSFormHtml({id:'" + item.id + "',type:'" + entry.type + "',clientName:'" + App._esc(clientName) + "',service:'" + App._esc(service) + "',professional:'" + App._esc(professional) + "',value:'',notes:''}))"
        ));
      } else if (!hasTermo) {
        acoes.push(Hoje._card(
          'na_termo_' + item.id, 'atendimento', item.id, clientName,
          '\u270E', 'Gerar Termo de Consentimento',
          'OS criada. Termo de consentimento ainda n\u00e3o foi gerado.',
          1,
          'Gerar Termo',
          "App._showOverlay('Novo Termo de Consentimento',App._buildTermoFormHtml({id:'" + item.id + "',type:'" + entry.type + "',clientName:'" + App._esc(clientName) + "',service:'" + App._esc(service) + "',professional:'" + App._esc(professional) + "'}))"
        ));
      } else if (!termoSigned) {
        var pendingTermo = matchingTermos.filter(function(t) { return t.status !== 'signed' || !t.signature; })[0] || matchingTermos[0];
        acoes.push(Hoje._card(
          'na_assinatura_' + pendingTermo.id, 'termos', pendingTermo.id, clientName,
          '\u270D', 'Coletar Assinatura',
          'Termo criado, aguardando assinatura do cliente.',
          2,
          'Assinar',
          "App._signTermoDigital('" + pendingTermo.id + "')"
        ));
      } else if (!hasPayment) {
        acoes.push(Hoje._card(
          'na_pagamento_' + item.id, 'financeiro', item.id, clientName,
          '\u2605', 'Registrar Pagamento',
          'Documentos assinados. Pagamento ainda n\u00e3o foi registrado.',
          3,
          'Registrar',
          "App.navigate('financeiro')"
        ));
      }
    });

    if (cashier && !cashier.closedAt) {
      acoes.push(Hoje._card(
        'na_caixa_' + cashier.id, 'financeiro', cashier.id, null,
        '\u2605', 'Fechar Caixa',
        'Caixa aberto aguardando fechamento.',
        4,
        'Fechar Caixa',
        "App.navigate('financeiro')"
      ));
    }

    var now = new Date();
    var currentMin = now.getHours() * 60 + now.getMinutes();
    var todayApps = Repos.agenda.byDate(today);
    todayApps.forEach(function(a) {
      if (a.status !== 'confirmed') return;
      var parts = (a.time || '00:00').split(':').map(Number);
      var aptMin = parts[0] * 60 + parts[1];
      if (aptMin < currentMin) {
        acoes.push(Hoje._card(
          'na_atrasado_' + a.id, 'agenda', a.id, a.clientName,
          '\u23F0', 'Cliente atrasado',
          a.clientName + ' confirmou mas n\u00e3o compareceu no hor\u00e1rio.',
          5,
          'Contato',
          "App.navigate('agenda')"
        ));
      }
    });

    var blocoAcoes = Hoje._deduplicate(acoes);

    // ── IA: Sugestões inteligentes no topo ──
    var iaCards = Hoje._sugestoesIA();
    if (iaCards.length > 0) {
      blocoAcoes = iaCards.concat(blocoAcoes);
    }

    // ── Bloco 2: Agenda Operacional ──
    var blocoAgenda = Repos.agenda.byDate(today)
      .filter(function(a) { return a.status !== 'cancelled'; })
      .sort(function(a, b) { return a.time > b.time ? 1 : -1; });

    // ── Bloco 3: Retornos (Pós-Atendimento + Lembretes) ──
    var retornos = [];
    var clientesComPlano = {};

    // Planos de acompanhamento têm prioridade
    var planosRetornos = PosAtendimento.collectRetornos();
    planosRetornos.forEach(function(r) {
      if (r.clientId) clientesComPlano[r.clientId] = true;
      var btnAction = "App.openClientPanel('" + r.clientId + "')";
      retornos.push(Hoje._card(
        'pos_' + r.etapaId, 'posatendimento', r.etapaId, r.clientName,
        r.icon, r.clientName + ' \u2014 ' + r.etapa,
        r.desc,
        r.prioridade,
        'Concluir etapa',
        "if(confirm('Concluir etapa " + r.etapa + "?')){PosAtendimento.concluirEtapa('" + r.etapaId + "','');App.refreshHoje();}",
        r.badge, r.badgeType
      ));
    });

    lembretes.filter(function(l) { return l.date === today && l.status === 'pending'; }).forEach(function(l) {
      if (l.clientId && clientesComPlano[l.clientId]) return;
      var prio = l.priority === 'high' ? 0 : l.priority === 'medium' ? 1 : 2;
      retornos.push(Hoje._card(
        'ret_lembrete_' + l.id, 'lembretes', l.id, l.clientName || null,
        '\u23F0', l.title,
        l.description || 'Lembrete pendente',
        prio,
        'Concluir',
        "App.navigate('lembretes')"
      ));
    });

    var limiteSeteDias = Date.now() - seteDiasMs;
    ordens.filter(function(o) { return o.status === 'open' && new Date(o.createdAt).getTime() < limiteSeteDias; }).forEach(function(o) {
      retornos.push(Hoje._card(
        'ret_os_' + o.id, 'os', o.id, o.clientName,
        '\u2610', 'OS #' + o.osNumber + ' em aberto',
        'Ordem de Servi\u00e7o aberta h\u00e1 mais de 7 dias.',
        1,
        'Visualizar',
        "App.navigate('os')"
      ));
    });

    var blocoRetornos = Hoje._deduplicate(retornos);

    // ── Bloco 4: Negociações (CRM + Inbox) ──
    var blocoNegociacoes = [];
    var negociacoesCRM = CRM.collectNegociacoes();
    var negociacoesInbox = Inbox.collectHoje();
    var clientesEmConversa = {};

    negociacoesInbox.forEach(function(n) {
      if (n.clientId) clientesEmConversa[n.clientId] = true;
      var isOverdue = n.date && n.date < today;
      var isToday = n.date === today;
      var prio = isOverdue ? 0 : isToday ? 1 : 2;
      var badge = isOverdue ? 'Atrasada' : isToday ? 'Hoje' : null;
      var badgeType = isOverdue ? 'danger' : isToday ? 'warning' : null;
      var icon = isOverdue ? '\u26A0' : '\u2709';
      var desc = n.action;
      if (n.note) desc += ' \u2014 ' + n.note;
      blocoNegociacoes.push(Hoje._card(
        'conv_' + (n.conversaId || n.clientId), 'inbox', n.conversaId || null, n.clientName,
        icon, n.clientName + ' \u2014 ' + n.action,
        desc + (n.origin ? ' [' + (Inbox.ORIGEM_LABELS[n.origin] || n.origin) + ']' : ''),
        prio,
        'Abrir',
        "App.navigate('inbox')",
        badge, badgeType
      ));
    });

    // ── Orçamentos ──
    var orcamentosHoje = Orcamento.collectHoje();
    orcamentosHoje.forEach(function(n) {
      if (n.clientId && clientesEmConversa[n.clientId]) return;
      if (n.clientId) clientesEmConversa[n.clientId] = true;
      blocoNegociacoes.push(Hoje._card(
        'orc_' + (n.orcamentoId || n.clientId), 'orcamentos', n.orcamentoId || null, n.clientName,
        n.icon, n.clientName + ' \u2014 ' + n.action,
        n.desc,
        n.prioridade,
        'Abrir',
        "App.navigate('orcamentos')",
        n.badge, n.badgeType
      ));
    });

    var limiteSessentaDias = new Date(Date.now() - sessentaDiasMs).toISOString().slice(0, 10);
    negociacoesCRM.forEach(function(n) {
      if (clientesEmConversa[n.clientId]) return;
      var isOverdue = n.date && n.date < today;
      var isToday = n.date === today;
      var prio = isOverdue ? 0 : isToday ? 1 : 2;
      var badge = isOverdue ? 'Atrasada' : isToday ? 'Hoje' : null;
      var badgeType = isOverdue ? 'danger' : isToday ? 'warning' : null;
      var icon = isOverdue ? '\u26A0' : '\u2605';
      var desc = n.action;
      if (n.note) desc += ' \u2014 ' + n.note;
      blocoNegociacoes.push(Hoje._card(
        'neg_' + n.clientId, 'clientes', n.clientId, n.clientName,
        icon, n.clientName + ' \u2014 ' + n.action,
        desc,
        prio,
        'Agendar',
        "App.navigate('agenda')",
        badge, badgeType
      ));
    });

    if (blocoNegociacoes.length === 0) {
      var clientIdsComVale = {};
      vales.filter(function(v) { return v.status === 'ativo'; }).forEach(function(v) {
        if (v.clientId) clientIdsComVale[v.clientId] = true;
      });
      clientes.forEach(function(c) {
        if (c.interest && (!c.lastVisit || c.lastVisit < limiteSessentaDias)) {
          blocoNegociacoes.push(Hoje._card(
            'neg_interest_' + c.id, 'clientes', c.id, c.name,
            '\u2605', c.name + ' \u2014 ' + c.interest,
            'Cliente demonstrou interesse mas n\u00e3o agendou recentemente.',
            0,
            'Agendar',
            "App.navigate('agenda')"
          ));
        }
        if (clientIdsComVale[c.id] && (!c.lastVisit || c.lastVisit < limiteSessentaDias)) {
          blocoNegociacoes.push(Hoje._card(
            'neg_vale_' + c.id, 'clientes', c.id, c.name,
            '\u2605', c.name + ' \u2014 Vale dispon\u00edvel',
            'Cliente possui vale de cr\u00e9dito ativo.',
            1,
            'Agendar',
            "App.navigate('agenda')"
          ));
        }
      });
    }

    blocoNegociacoes = Hoje._deduplicate(blocoNegociacoes);

    // ── Bloco 5: Pendências de Ontem ──
    var pendencias = [];

    var yesterdayWalkins = queue.filter(function(q) { return q.date === ontem && q.status === 'done'; });
    var yesterdayAgenda = Repos.agenda.byDate(ontem).filter(function(a) { return a.status === 'completed'; });

    yesterdayWalkins.forEach(function(q) {
      if (!ordens.some(function(o) { return o.clientName === q.clientName && o.date === ontem; })) {
        pendencias.push(Hoje._card(
          'pen_avulso_' + q.id, 'atendimento', q.id, q.clientName,
          '\u2610', 'Avulso sem OS',
          q.clientName + ' foi atendido ontem sem ordem de servi\u00e7o.',
          0,
          'Criar OS',
          "App.navigate('atendimento')"
        ));
      }
    });

    yesterdayAgenda.forEach(function(a) {
      if (!ordens.some(function(o) { return o.clientName === a.clientName && o.date === ontem; })) {
        pendencias.push(Hoje._card(
          'pen_agenda_' + a.id, 'atendimento', a.id, a.clientName,
          '\u2610', 'Atendimento sem OS',
          a.clientName + ' foi atendido ontem sem ordem de servi\u00e7o.',
          0,
          'Criar OS',
          "App.navigate('atendimento')"
        ));
      }
    });

    ordens.filter(function(o) { return o.status === 'open' && o.date < today; }).forEach(function(o) {
      pendencias.push(Hoje._card(
        'pen_os_' + o.id, 'os', o.id, o.clientName,
        '\u2610', 'OS #' + o.osNumber + ' pendente',
        'Ordem de Servi\u00e7o de ' + o.date + ' ainda em aberto.',
        1,
        'Visualizar',
        "App.navigate('os')"
      ));
    });

    var blocoPendencias = Hoje._deduplicate(pendencias);

    // ── Bloco 6: Marketing ──
    var blocoMarketing = Marketing.collectHoje();

    // ── Metadados ──
    var totalAcoes = blocoAcoes.length + blocoAgenda.length + blocoRetornos.length
      + blocoNegociacoes.length + blocoPendencias.length + blocoMarketing.length;

    return {
      blocoAcoes: blocoAcoes,
      blocoAgenda: blocoAgenda,
      blocoRetornos: blocoRetornos,
      blocoNegociacoes: blocoNegociacoes,
      blocoPendencias: blocoPendencias,
      blocoMarketing: blocoMarketing,
      metadados: {
        totalAcoes: totalAcoes,
        totalAgenda: blocoAgenda.length,
        caixaAberto: !!(cashier && !cashier.closedAt),
        dataReferencia: today
      }
    };
  },

  _card: function(id, modulo, refId, clientName, icon, title, desc, prioridade, btnLabel, btnAction, badge, badgeType) {
    Hoje._seq++;
    return {
      id: id,
      modulo: modulo,
      refId: refId,
      clientName: clientName || '',
      icon: icon,
      title: title,
      desc: desc,
      badge: badge || null,
      badgeType: badgeType || null,
      prioridade: prioridade,
      timestamp: Date.now(),
      _ordem: Hoje._seq,
      grupo: clientName || null,
      btnLabel: btnLabel,
      btnAction: btnAction
    };
  },

  _deduplicate: function(cards) {
    var groups = {};
    var groupOrder = [];
    var ungrouped = [];

    cards.forEach(function(c) {
      if (c.grupo) {
        if (!groups[c.grupo]) {
          groups[c.grupo] = [];
          groupOrder.push(c.grupo);
        }
        groups[c.grupo].push(c);
      } else {
        ungrouped.push(c);
      }
    });

    var result = [];

    groupOrder.forEach(function(key) {
      var group = groups[key];
      group.sort(function(a, b) {
        if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
        return a._ordem - b._ordem;
      });
      result.push(group[0]);
    });

    ungrouped.forEach(function(c) {
      result.push(c);
    });

    result.sort(function(a, b) {
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
      return a._ordem - b._ordem;
    });

    return result;
  },

  _sugestoesIA: function() {
    return AIHub.getPrioridades().map(function(i) {
      var iconMap = { alerta: '\u26A0', oportunidade: '\u2728', info: '\u2139\uFE0F' };
      var prioMap = { 0: 0, 1: 1, 2: 2, 3: 3 };
      return Hoje._card(
        'ia_' + i.id, 'aihub', i.origemId, '',
        iconMap[i.tipo] || '\u2728', i.titulo,
        i.descricao,
        prioMap[i.prioridade] !== undefined ? prioMap[i.prioridade] : 2,
        i.actionLabel || 'Ver',
        i.actionTarget === 'navigate' ? "App.navigate('" + i.actionParams + "')" : i.actionTarget === 'cliente' ? "App.openClientPanel('" + i.actionParams + "')" : "App.navigate('aihub')",
        'IA', 'info'
      );
    });
  }
};
