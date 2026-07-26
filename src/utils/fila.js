const Fila = {
  collect: function() {
    var hoje = DB._today();
    var itens = [];
    var agora = Date.now();

    // 1. Conversas aguardando resposta do estúdio
    DB.getConversas().forEach(function(c) {
      if (c.status === 'encerrada') return;
      var score = 50;
      var motivos = [];

      if (c.status === 'aguardando_estudio') { score += 25; motivos.push('Aguardando resposta do est\u00fadio'); }
      if (c.priority === 'high') { score += 15; motivos.push('Prioridade alta'); }
      if (c.nextDate && c.nextDate < hoje) { score += 10; motivos.push('Pr\u00f3xima a\u00e7\u00e3o vencida'); }
      if (c.ultimaInteracao) {
        var horas = (agora - new Date(c.ultimaInteracao).getTime()) / 3600000;
        if (horas > 24) { score += Math.min(Math.floor(horas / 24) * 5, 20); motivos.push('Aguardando h\u00e1 ' + Math.floor(horas) + 'h'); }
      }
      if (c.clientId) {
        var client = DB.getClient(c.clientId);
        if (client && (client.totalVisits || 0) >= 3) { score += 10; motivos.push('Cliente VIP'); }
      }

      var ops = DB.getOrcamentos().filter(function(o) { return (c.clientId && o.clientId === c.clientId) || o.nomeCliente === c.clientName; });
      var valorOrc = ops.reduce(function(s, o) { return s + (parseFloat(o.valorFinal) || 0); }, 0);
      if (valorOrc > 0) { score += Math.min(Math.floor(valorOrc / 50), 15); motivos.push('Or\u00e7amento: R$ ' + valorOrc.toFixed(2).replace('.', ',')); }

      itens.push({
        id: 'conv_' + c.id, tipo: 'conversa', refId: c.id, clientName: c.clientName, clientId: c.clientId,
        prioridade: Math.min(score, 100), motivos: motivos, tempoAguardando: c.ultimaInteracao ? Math.floor((agora - new Date(c.ultimaInteracao).getTime()) / 60000) : null,
        origemModulo: 'inbox', labelAcao: 'Abrir conversa', targetAcao: 'inbox'
      });
    });

    // 2. Orçamentos em negociação
    DB.getOrcamentos().forEach(function(o) {
      if (o.status !== 'enviado' && o.status !== 'visualizado' && o.status !== 'em_negociacao') return;
      var score = 60;
      var motivos = ['Or\u00e7amento ' + Fila._statusLabel(o.status)];

      if (o.validade && o.validade < hoje) { score += 20; motivos.push('Validade expirada'); }
      else if (o.validade) {
        var diasRestantes = Math.floor((new Date(o.validade).getTime() - agora) / 86400000);
        if (diasRestantes <= 3) { score += 15; motivos.push('Vence em ' + diasRestantes + ' dias'); }
      }
      if (o.updatedAt) {
        var diasParado = Math.floor((agora - new Date(o.updatedAt).getTime()) / 86400000);
        if (diasParado > 7) { score += 15; motivos.push('Parado h\u00e1 ' + diasParado + ' dias'); }
      }
      var valor = parseFloat(o.valorFinal) || 0;
      if (valor > 0) { score += Math.min(Math.floor(valor / 50), 15); motivos.push('Valor: R$ ' + o.valorFinal); }

      itens.push({
        id: 'orc_' + o.id, tipo: 'orcamento', refId: o.id, clientName: o.nomeCliente, clientId: o.clientId,
        prioridade: Math.min(score, 100), motivos: motivos, tempoAguardando: o.updatedAt ? Math.floor((agora - new Date(o.updatedAt).getTime()) / 60000) : null,
        origemModulo: 'orcamentos', labelAcao: 'Abrir or\u00e7amento', targetAcao: 'orcamentos'
      });
    });

    // 3. Pós-atendimento: etapas vencidas
    DB.getPlanosAtivos().forEach(function(p) {
      DB.getEtapas(p.id).forEach(function(e) {
        if (e.status !== 'pendente' || !e.dataPrevista) return;
        var score = 55;
        var motivos = ['Etapa ' + e.label + ' pendente'];
        if (e.dataPrevista < hoje) {
          var diasAtraso = Math.floor((agora - new Date(e.dataPrevista).getTime()) / 86400000);
          score += Math.min(diasAtraso * 5, 25);
          motivos.push('Atrasada h\u00e1 ' + diasAtraso + ' dias');
        }
        var client = DB.getClient(p.clientId);
        itens.push({
          id: 'pos_' + e.id, tipo: 'posatendimento', refId: e.id, clientName: client ? client.name : '—', clientId: p.clientId,
          prioridade: Math.min(score, 100), motivos: motivos, tempoAguardando: e.dataPrevista ? Math.floor((agora - new Date(e.dataPrevista).getTime()) / 60000) : null,
          origemModulo: 'posatendimento', labelAcao: 'Agendar retorno', targetAcao: 'agenda'
        });
      });
    });

    // 4. Clientes com próxima ação vencida (CRM)
    var clientes = DB.getClients();
    clientes.forEach(function(c) {
      if (!c.crmNextAction || !c.crmNextDate) return;
      if (c.crmNextDate >= hoje) return;
      var score = 50;
      var motivos = ['Pr\u00f3xima a\u00e7\u00e3o vencida: ' + (c.crmNextAction || '')];
      if (c.crmPriority === 'high') { score += 15; motivos.push('Prioridade alta'); }
      if ((c.totalVisits || 0) >= 3) { score += 10; motivos.push('Cliente VIP'); }
      var diasAtraso = Math.floor((agora - new Date(c.crmNextDate).getTime()) / 86400000);
      if (diasAtraso > 0) { score += Math.min(diasAtraso * 3, 15); motivos.push('Atrasado h\u00e1 ' + diasAtraso + ' dias'); }

      itens.push({
        id: 'crm_' + c.id, tipo: 'crm', refId: c.id, clientName: c.name, clientId: c.id,
        prioridade: Math.min(score, 100), motivos: motivos,
        tempoAguardando: Math.floor((agora - new Date(c.crmNextDate).getTime()) / 60000),
        origemModulo: 'clientes', labelAcao: 'Ver cliente', targetAcao: 'clientes'
      });
    });

    // 5. Atendimentos em andamento
    var inProgressAgenda = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status === 'in_progress'; });
    var inProgressWalkin = DB.getQueue().filter(function(q) { return q.status === 'in_progress'; });
    inProgressAgenda.forEach(function(a) {
      itens.push({
        id: 'apd_' + a.id, tipo: 'atendimento', refId: a.id, clientName: a.clientName, clientId: a.clientId,
        prioridade: 100, motivos: ['Em atendimento agora'], tempoAguardando: 0,
        origemModulo: 'atendimento', labelAcao: 'Abrir atendimento', targetAcao: 'atendimento'
      });
    });
    inProgressWalkin.forEach(function(q) {
      itens.push({
        id: 'wlk_' + q.id, tipo: 'atendimento', refId: q.id, clientName: q.clientName, clientId: null,
        prioridade: 100, motivos: ['Em atendimento agora'], tempoAguardando: 0,
        origemModulo: 'atendimento', labelAcao: 'Abrir atendimento', targetAcao: 'atendimento'
      });
    });

    itens.sort(function(a, b) { return b.prioridade - a.prioridade || (a.tempoAguardando || 0) - (b.tempoAguardando || 0); });
    return itens;
  },

  _statusLabel: function(s) {
    var labels = { enviado: 'Enviado', visualizado: 'Visualizado', em_negociacao: 'Em negocia\u00e7\u00e3o' };
    return labels[s] || s;
  },

  getResumo: function() {
    var all = this.collect();
    var criticos = all.filter(function(i) { return i.prioridade >= 80; }).length;
    var maiorEspera = 0;
    all.forEach(function(i) { if (i.tempoAguardando && i.tempoAguardando > maiorEspera) maiorEspera = i.tempoAguardando; });
    var porTipo = {};
    all.forEach(function(i) { porTipo[i.tipo] = (porTipo[i.tipo] || 0) + 1; });
    return { total: all.length, criticos: criticos, maiorEsperaMin: maiorEspera, porTipo: porTipo };
  },

  getTempoMedioPorPrioridade: function() {
    var all = this.collect();
    var faixas = { '0-40': [], '41-60': [], '61-80': [], '81-100': [] };
    all.forEach(function(i) {
      if (i.prioridade <= 40) faixas['0-40'].push(i.tempoAguardando || 0);
      else if (i.prioridade <= 60) faixas['41-60'].push(i.tempoAguardando || 0);
      else if (i.prioridade <= 80) faixas['61-80'].push(i.tempoAguardando || 0);
      else faixas['81-100'].push(i.tempoAguardando || 0);
    });
    var result = {};
    Object.keys(faixas).forEach(function(k) {
      var arr = faixas[k];
      result[k] = arr.length > 0 ? Math.round(arr.reduce(function(s, v) { return s + v; }, 0) / arr.length) : 0;
    });
    return result;
  }
};
