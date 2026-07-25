const Playbook = {
  // Gera playbooks com base na Memória Operacional e dados atuais
  gerar: function() {
    var hoje = DB._today();
    var memoria = typeof MemoriaOperacional.getTendencias === 'function' ? MemoriaOperacional.getTendencias() : { servicos: {}, clientesAtivos: 0 };
    var playbooks = [];

    // 1. Recuperar cliente parado (sem retorno há mais de 60 dias)
    var sessentaDias = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    var clientesParados = [];
    DB.getClients().forEach(function(cl) {
      if (cl.lastVisit && cl.lastVisit < sessentaDias && (cl.totalVisits || 0) > 0) {
        clientesParados.push({ name: cl.name, id: cl.id, ultimaVisita: cl.lastVisit });
      }
    });
    if (clientesParados.length > 0) {
      playbooks.push({
        id: 'pb_recuperar', categoria: 'Recupera\u00e7\u00e3o',
        titulo: 'Recuperar cliente' + (clientesParados.length > 1 ? 's' : '') + ' parado' + (clientesParados.length > 1 ? 's' : ''),
        objetivo: 'Reativar ' + clientesParados.length + ' cliente' + (clientesParados.length > 1 ? 's' : '') + ' sem retorno h\u00e1 mais de 60 dias.',
        motivo: clientesParados.length + ' cliente' + (clientesParados.length > 1 ? 's' : '') + ' n\u00e3o visitam o est\u00fadio h\u00e1 mais de 60 dias. A reativa\u00e7\u00e3o de clientes inativos tem alto potencial de retorno.',
        impacto: clientesParados.length + ' cliente' + (clientesParados.length > 1 ? 's' : '') + ' para reativar',
        confianca: 75, clientes: clientesParados.length, clientesLista: clientesParados,
        passos: ['Revisar hist\u00f3rico do cliente', 'Enviar mensagem personalizada', 'Oferecer hor\u00e1rio preferencial'],
        acao: 'Ver clientes', tipo: 'crm', payload: {}, score: 75
      });
    }

    // 2. Converter orçamento antigo
    var orcamentosAntigos = (typeof Oportunidade.collect === 'function' ? Oportunidade.collect() : []).filter(function(o) {
      return o.categoria === 'orcamento_parado' || o.categoria === 'sem_retorno_pos_orcamento';
    });
    if (orcamentosAntigos.length > 0) {
      playbooks.push({
        id: 'pb_converter_orc', categoria: 'Comercial',
        titulo: 'Converter or\u00e7amento' + (orcamentosAntigos.length > 1 ? 's' : '') + ' antigo' + (orcamentosAntigos.length > 1 ? 's' : ''),
        objetivo: 'Fechar ' + orcamentosAntigos.length + ' or\u00e7amento' + (orcamentosAntigos.length > 1 ? 's' : '') + ' aguardando resposta.',
        motivo: 'Or\u00e7amentos parados h\u00e1 muito tempo t\u00eam baixa probabilidade de convers\u00e3o espont\u00e2nea. Um contato pode reativar a negocia\u00e7\u00e3o.',
        impacto: 'Potencial de receita', confianca: 70, clientes: orcamentosAntigos.length,
        clientesLista: orcamentosAntigos.map(function(o) { return { name: o.clientName, id: o.clientId }; }),
        passos: ['Revisar or\u00e7amento', 'Entrar em contato', 'Oferecer condi\u00e7\u00e3o especial'],
        acao: 'Abrir or\u00e7amentos', tipo: 'oportunidade', payload: { target: 'orcamentos' }, score: 70
      });
    }

    // 3. Confirmar agenda do dia
    var confs = Confirmacao.collect();
    var pendentesHoje = confs.filter(function(c) { return c.statusConfirmacao === 'pendente' && c.isToday; });
    if (pendentesHoje.length > 0) {
      playbooks.push({
        id: 'pb_confirmar_agenda', categoria: 'Operacional',
        titulo: 'Confirmar agenda do dia',
        objetivo: pendentesHoje.length + ' agendamento' + (pendentesHoje.length > 1 ? 's' : '') + ' de hoje sem confirma\u00e7\u00e3o.',
        motivo: 'Agendamentos n\u00e3o confirmados t\u00eam maior risco de aus\u00eancia. A confirma\u00e7\u00e3o pr\u00f3xima ao hor\u00e1rio aumenta a taxa de presen\u00e7a.',
        impacto: pendentesHoje.length + ' confirma\u00e7\u00e3o' + (pendentesHoje.length > 1 ? '\u00f5es' : '') + ' pendente' + (pendentesHoje.length > 1 ? 's' : ''),
        confianca: 90, clientes: pendentesHoje.length, clientesLista: pendentesHoje.map(function(c) { return { name: c.clientName }; }),
        passos: ['Entrar em contato', 'Confirmar hor\u00e1rio', 'Enviar lembrete'],
        acao: 'Confirmar', tipo: 'confirmacao', payload: {}, score: 90
      });
    }

    // 4. Preencher horário vago
    var agendaHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled'; });
    var canceladosHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status === 'cancelled'; }).length;
    if (canceladosHoje > 0) {
      playbooks.push({
        id: 'pb_preencher_horario', categoria: 'Operacional',
        titulo: 'Preencher hor\u00e1rio' + (canceladosHoje > 1 ? 's' : '') + ' vago' + (canceladosHoje > 1 ? 's' : ''),
        objetivo: canceladosHoje + ' cancelamento' + (canceladosHoje > 1 ? 's' : '') + ' hoje. Oportunidade de preencher com outros clientes.',
        motivo: 'Hor\u00e1rios cancelados representam perda de faturamento se n\u00e3o forem preenchidos.',
        impacto: 'Recuperar hor\u00e1rios ociosos', confianca: 65, clientes: 0,
        clientesLista: [], passos: ['Verificar lista de espera', 'Contatar clientes interessados'],
        acao: 'Ver agenda', tipo: 'agenda', payload: {}, score: 65
      });
    }

    // 5. Cobrar pagamento pendente
    var pagPendentes = agendaHoje.filter(function(a) { return a.status === 'completed' && a.value; });
    if (pagPendentes.length > 0) {
      playbooks.push({
        id: 'pb_cobrar', categoria: 'Financeiro',
        titulo: 'Cobrar pagamento pendente',
        objetivo: pagPendentes.length + ' atendimento' + (pagPendentes.length > 1 ? 's' : '') + ' conclu\u00eddo' + (pagPendentes.length > 1 ? 's' : '') + ' sem registro de pagamento.',
        motivo: 'Registrar o pagamento no mesmo dia evita esquecimento e mant\u00e9m o fluxo de caixa organizado.',
        impacto: 'R$ ' + pagPendentes.reduce(function(s, a) { return s + (parseFloat(a.value) || 0); }, 0).toFixed(2).replace('.', ','), confianca: 85,
        clientes: pagPendentes.length, clientesLista: pagPendentes.map(function(a) { return { name: a.clientName }; }),
        passos: ['Localizar atendimento', 'Registrar pagamento', 'Emitir recibo'],
        acao: 'Registrar', tipo: 'financeiro', payload: {}, score: 85
      });
    }

    // 6. Pós-atendimento
    var retornos = typeof PosAtendimento.collectRetornos === 'function' ? PosAtendimento.collectRetornos() : [];
    var vencidos = retornos.filter(function(r) { return r.prioridade <= 1; });
    if (vencidos.length > 0) {
      playbooks.push({
        id: 'pb_pos_atendimento', categoria: 'P\u00f3s-venda',
        titulo: 'Fazer p\u00f3s-atendimento',
        objetivo: vencidos.length + ' etapa' + (vencidos.length > 1 ? 's' : '') + ' de acompanhamento vencida' + (vencidos.length > 1 ? 's' : '') + '.',
        motivo: 'O acompanhamento p\u00f3s-procedimento \u00e9 essencial para a satisfa\u00e7\u00e3o e fideliza\u00e7\u00e3o do cliente.',
        impacto: vencidos.length + ' cliente' + (vencidos.length > 1 ? 's' : '') + ' para acompanhar', confianca: 80,
        clientes: vencidos.length, clientesLista: vencidos.map(function(r) { return { name: r.clientName, id: r.clientId }; }),
        passos: ['Verificar etapa', 'Contatar cliente', 'Registrar conclus\u00e3o'],
        acao: 'Concluir etapa', tipo: 'posatendimento', payload: {}, score: 80
      });
    }

    // 7. Reativar cliente VIP
    var vipsParados = [];
    DB.getClients().forEach(function(cl) {
      if (cl.lastVisit && cl.lastVisit < sessentaDias && (cl.totalVisits || 0) >= 3) {
        vipsParados.push({ name: cl.name, id: cl.id });
      }
    });
    if (vipsParados.length > 0) {
      playbooks.push({
        id: 'pb_reativar_vip', categoria: 'Relacionamento',
        titulo: 'Reativar cliente' + (vipsParados.length > 1 ? 's' : '') + ' VIP',
        objetivo: vipsParados.length + ' cliente' + (vipsParados.length > 1 ? 's' : '') + ' VIP sem retorno h\u00e1 mais de 60 dias.',
        motivo: 'Clientes VIP t\u00eam alto valor de vida. Um contato personalizado pode reativ\u00e1-los.',
        impacto: vipsParados.length + ' cliente' + (vipsParados.length > 1 ? 's' : '') + ' VIP parado' + (vipsParados.length > 1 ? 's' : ''),
        confianca: 78, clientes: vipsParados.length, clientesLista: vipsParados,
        passos: ['Revisar hist\u00f3rico', 'Contato personalizado', 'Oferecer benef\u00edcio'],
        acao: 'Ver cliente' + (vipsParados.length > 1 ? 's' : ''), tipo: 'crm', payload: {}, score: 78
      });
    }

    // 8. Publicar conteúdo pendente
    var igPub = Marketing.collectInstagram().items.filter(function(i) { return i.isOverdue || (i.isToday && i.statusCalc !== 'publicado'); });
    if (igPub.length > 0) {
      playbooks.push({
        id: 'pb_publicar', categoria: 'Marketing',
        titulo: 'Publicar conte\u00fado pendente',
        objetivo: igPub.length + ' publica\u00e7\u00e3o' + (igPub.length > 1 ? '\u00f5es' : '') + ' atrasada' + (igPub.length > 1 ? 's' : '') + ' ou agendada para hoje.',
        motivo: 'Conte\u00fado atrasado perde relev\u00e2ncia. Manter o calend\u00e1rio editorial atualizado fortalece a presen\u00e7a digital.',
        impacto: igPub.length + ' publica\u00e7\u00e3o' + (igPub.length > 1 ? '\u00f5es' : ''), confianca: 70,
        clientes: 0, clientesLista: [], passos: ['Revisar conte\u00fado', 'Publicar no perfil correto', 'Registrar publica\u00e7\u00e3o'],
        acao: 'Publicar', tipo: 'marketing', payload: {}, score: 70
      });
    }

    // 9. Revisar clientes em risco
    var emRisco = [];
    DB.getClients().forEach(function(cl) {
      if (cl.lastVisit && cl.lastVisit < sessentaDias && (cl.totalVisits || 0) > 0 && (cl.totalVisits || 0) < 3) {
        emRisco.push({ name: cl.name, id: cl.id });
      }
    });
    if (emRisco.length > 0) {
      playbooks.push({
        id: 'pb_revisar_risco', categoria: 'Reten\u00e7\u00e3o',
        titulo: 'Revisar cliente' + (emRisco.length > 1 ? 's' : '') + ' em risco de cancelamento',
        objetivo: emRisco.length + ' cliente' + (emRisco.length > 1 ? 's' : '') + ' com baixa frequ\u00eancia e sem retorno recente.',
        motivo: 'Clientes com poucas visitas e per\u00edodo longo sem retorno t\u00eam alto risco de desist\u00eancia.',
        impacto: emRisco.length + ' cliente' + (emRisco.length > 1 ? 's' : '') + ' em risco', confianca: 72,
        clientes: emRisco.length, clientesLista: emRisco,
        passos: ['Identificar motivo da aus\u00eancia', 'Oferecer vantagem para retorno'],
        acao: 'Ver clientes', tipo: 'crm', payload: {}, score: 72
      });
    }

    playbooks.sort(function(a, b) { return b.score - a.score; });
    return playbooks;
  }
};
