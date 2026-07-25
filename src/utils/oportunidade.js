const Oportunidade = {
  CATEGORIAS: [
    'orcamento_parado', 'retorno_sem_agendamento', 'upgrade_joia', 'troca_joia',
    'plano_concluido', 'cliente_recorrente_ausente', 'conversa_sem_resposta',
    'aniversariante', 'vip_sem_contato', 'sem_retorno_pos_orcamento'
  ],
  CATEGORIA_LABELS: {
    orcamento_parado: 'Or\u00e7amento Parado',
    retorno_sem_agendamento: 'Retorno Sem Agendamento',
    upgrade_joia: 'Upgrade de Joias',
    troca_joia: 'Troca de Joia',
    plano_concluido: 'Plano Conclu\u00eddo',
    cliente_recorrente_ausente: 'Cliente Recorrente Ausente',
    conversa_sem_resposta: 'Conversa Sem Resposta',
    aniversariante: 'Aniversariante',
    vip_sem_contato: 'VIP Sem Contato',
    sem_retorno_pos_orcamento: 'Sem Retorno P\u00f3s-Or\u00e7amento'
  },

  _make: function(categoria, clientId, clientName, descricao, valor, score, origemModulo, origemId, btnLabel, btnTarget) {
    return { id: 'op_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6), categoria: categoria, categoriaLabel: this.CATEGORIA_LABELS[categoria] || categoria, clientId: clientId, clientName: clientName, descricao: descricao, valorEstimado: valor || 0, score: score || 50, origemModulo: origemModulo, origemId: origemId, btnLabel: btnLabel || 'Abrir', btnTarget: btnTarget || '', createdAt: DB._now() };
  },

  collect: function() {
    var hoje = DB._today();
    var ops = [];

    // 1. Orçamento parado (>7 dias sem resposta)
    var seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
    DB.getOrcamentos().forEach(function(o) {
      if ((o.status === 'enviado' || o.status === 'visualizado' || o.status === 'em_negociacao') && o.updatedAt && o.updatedAt < seteDias) {
        ops.push(Oportunidade._make('orcamento_parado', o.clientId, o.nomeCliente, 'Or\u00e7amento #' + o.numero + ' aguardando resposta h\u00e1 mais de 7 dias.', parseFloat(o.valorFinal) || 0, 90, 'orcamentos', o.id, 'Abrir or\u00e7amento', 'orcamentos'));
      }
    });

    // 2. Sem retorno pós-orçamento (cliente recebeu orçamento mas não agendou)
    var trintaDias = new Date(Date.now() - 30 * 86400000).toISOString();
    DB.getOrcamentos().forEach(function(o) {
      if (o.status === 'aprovado' && o.clientId) {
        var temAgendamento = DB.getAppointments().some(function(a) { return a.clientId === o.clientId && a.date >= hoje; });
        if (!temAgendamento) {
          ops.push(Oportunidade._make('sem_retorno_pos_orcamento', o.clientId, o.nomeCliente, 'Or\u00e7amento #' + o.numero + ' aprovado mas sem agendamento.', parseFloat(o.valorFinal) || 0, 85, 'orcamentos', o.id, 'Criar agendamento', 'agenda'));
        }
      }
    });

    // 3. Retorno sem agendamento (etapa de acompanhamento vencida sem novo agendamento)
    DB.getPlanosAtivos().forEach(function(p) {
      var etapas = DB.getEtapas(p.id);
      etapas.forEach(function(e) {
        if (e.status === 'pendente' && e.dataPrevista && e.dataPrevista <= hoje) {
          var client = DB.getClient(p.clientId);
          if (client) {
            ops.push(Oportunidade._make('retorno_sem_agendamento', p.clientId, client.name, 'Etapa ' + e.label + ' vencida em ' + e.dataPrevista + '. Cliente precisa de retorno.', 0, 80, 'posatendimento', e.id, 'Agendar retorno', 'agenda'));
          }
        }
      });
    });

    // 4. Plano de acompanhamento concluído (cliente apto para novo procedimento)
    DB.getPlanos().forEach(function(p) {
      if (p.status === 'concluido') {
        var client = DB.getClient(p.clientId);
        if (client) {
          var ultimaVisita = client.lastVisit || p.dataProcedimento;
          var dias = Math.floor((Date.now() - new Date(ultimaVisita).getTime()) / 86400000);
          if (dias > 60) {
            ops.push(Oportunidade._make('plano_concluido', p.clientId, client.name, 'Acompanhamento conclu\u00eddo h\u00e1 ' + dias + ' dias. Cliente apto para novo procedimento.', 0, 70, 'posatendimento', p.id, 'Agendar', 'agenda'));
          }
        }
      }
    });

    // 5. Cliente recorrente ausente (>90 dias sem visitar)
    var noventaDias = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    DB.getClients().forEach(function(c) {
      if ((c.totalVisits || 0) >= 2 && c.lastVisit && c.lastVisit < noventaDias) {
        ops.push(Oportunidade._make('cliente_recorrente_ausente', c.id, c.name, 'Cliente recorrente sem visitar h\u00e1 mais de 90 dias (desde ' + c.lastVisit + ').', 0, 75, 'clientes', c.id, 'Ver cliente', 'clientes'));
      }
    });

    // 6. Conversa sem resposta (inbox aguardando estúdio >24h)
    var umDia = Date.now() - 86400000;
    DB.getConversas().forEach(function(c) {
      if (c.status === 'aguardando_estudio' && c.ultimaInteracao && new Date(c.ultimaInteracao).getTime() < umDia) {
        ops.push(Oportunidade._make('conversa_sem_resposta', c.clientId, c.clientName, 'Conversa aguardando resposta h\u00e1 mais de 24h.', 0, 85, 'inbox', c.id, 'Abrir conversa', 'inbox'));
      }
    });

    // 7. Aniversariantes do mês
    var mesAtual = hoje.slice(5, 7);
    DB.getClients().forEach(function(c) {
      if (c.createdAt) {
        var mesCadastro = c.createdAt.slice(5, 7);
        if (mesCadastro === mesAtual && c.createdAt.slice(0, 4) < hoje.slice(0, 4)) {
          ops.push(Oportunidade._make('aniversariante', c.id, c.name, 'Cliente faz anivers\u00e1rio de cadastro neste m\u00eas. Aproveite para reconectar.', 0, 50, 'clientes', c.id, 'Enviar mensagem', 'inbox'));
        }
      }
    });

    // 8. VIP sem contato recente (>60 dias)
    var sessentaDias = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    DB.getClients().forEach(function(c) {
      if ((c.totalVisits || 0) >= 3 && c.lastVisit && c.lastVisit < sessentaDias) {
        ops.push(Oportunidade._make('vip_sem_contato', c.id, c.name, 'Cliente VIP (' + c.totalVisits + ' atendimentos) sem contato h\u00e1 mais de 60 dias.', 0, 80, 'clientes', c.id, 'Ver cliente', 'clientes'));
      }
    });

    ops.sort(function(a, b) { return b.score - a.score; });
    return ops;
  },

  getResumo: function() {
    var all = this.collect();
    var criticas = all.filter(function(o) { return o.score >= 80; }).length;
    var valorPotencial = all.reduce(function(s, o) { return s + (o.valorEstimado || 0); }, 0);
    var categorias = {};
    all.forEach(function(o) { categorias[o.categoria] = (categorias[o.categoria] || 0) + 1; });
    return { total: all.length, criticas: criticas, valorPotencial: valorPotencial, categorias: categorias };
  },

  getMelhorOportunidade: function() {
    var all = this.collect();
    return all.length > 0 ? all[0] : null;
  },

  getAltoValor: function() {
    return this.collect().filter(function(o) { return o.valorEstimado > 0; });
  },

  getEsquecidas: function() {
    var seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
    return this.collect().filter(function(o) { return o.createdAt && o.createdAt < seteDias; });
  }
};
