const Prioritizacao = {
  // Retorna score (0-100), prioridade (label) e motivos[]
  calcular: function(tipo, contexto) {
    var score = 50;
    var motivos = [];

    if (!contexto) return { score: score, prioridade: this._label(score), motivos: motivos };

    // 1. Tempo desde a última interação
    if (contexto.ultimaInteracao) {
      var horas = (Date.now() - new Date(contexto.ultimaInteracao).getTime()) / 3600000;
      if (horas > 48) { score += 20; motivos.push('Cliente aguarda h\u00e1 mais de 48h'); }
      else if (horas > 24) { score += 15; motivos.push('Cliente aguarda h\u00e1 mais de 24h'); }
      else if (horas > 4) { score += 10; motivos.push('Aguardando h\u00e1 ' + Math.round(horas) + 'h'); }
      else if (horas > 1) { score += 5; motivos.push('Aguardando h\u00e1 ' + Math.round(horas) + 'h'); }
    }

    // 2. Horário do compromisso (próximo = mais urgente)
    if (contexto.horario) {
      var hoje = DB._today();
      var dataCompromisso = contexto.data || hoje;
      var dataHora = new Date(dataCompromisso + 'T' + contexto.horario);
      var diffMin = (dataHora.getTime() - Date.now()) / 60000;
      if (diffMin < 0) { score += 20; motivos.push('Atrasado'); }
      else if (diffMin < 60) { score += 15; motivos.push('Em menos de 1h'); }
      else if (diffMin < 180) { score += 10; motivos.push('Nas pr\u00f3ximas 3h'); }
      else if (diffMin < 720) { score += 5; motivos.push('Hoje'); }
    } else if (contexto.data === DB._today()) {
      score += 5; motivos.push('Para hoje');
    }

    // 3. Cliente aguardando resposta (status aguardando_estudio)
    if (contexto.aguardandoResposta) { score += 15; motivos.push('Cliente aguarda resposta'); }

    // 4. Agendamento para hoje
    if (contexto.agendamentoHoje) { score += 10; motivos.push('Agendamento hoje'); }

    // 5. Pagamento pendente
    if (contexto.pagamentoPendente) { score += 10; motivos.push('Pagamento pendente'); }

    // 6. Follow-up vencido (CRM nextAction vencida)
    if (contexto.followUpVencido) { score += 15; motivos.push('Follow-up vencido'); }

    // 7. Oportunidade com alta probabilidade (score ≥ 80)
    if (contexto.oportunidadeAlta && contexto.oportunidadeScore >= 80) { score += 10; motivos.push('Alta chance de convers\u00e3o'); }

    // 8. Mensagem não respondida
    if (contexto.mensagemNaoRespondida) {
      score += 10; motivos.push('Mensagem n\u00e3o respondida');
      if (contexto.prioridade === 'high') { score += 5; motivos.push('Prioridade alta'); }
    }

    // 9. Confirmação pendente
    if (contexto.pendenteConfirmacao) {
      score += 10; motivos.push('Confirma\u00e7\u00e3o pendente');
      if (contexto.isToday) { score += 5; motivos.push('Confirmar hoje'); }
    }

    // 10. Notificação crítica
    if (contexto.notificacaoCritica) { score += 15; motivos.push('Notifica\u00e7\u00e3o cr\u00edtica'); }

    // Bônus: cliente VIP (3+ visitas)
    if (contexto.clienteVip) { score += 5; motivos.push('Cliente VIP'); }

    // Limitar score entre 0 e 100
    score = Math.max(0, Math.min(100, score));

    return { score: score, prioridade: this._label(score), motivos: motivos.slice(0, 4) };
  },

  // Converte score para label e nível numérico
  _label: function(score) {
    if (score >= 85) return 'Cr\u00edtica';
    if (score >= 65) return 'Alta';
    if (score >= 40) return 'M\u00e9dia';
    return 'Baixa';
  },

  nivel: function(score) {
    if (score >= 85) return 0;
    if (score >= 65) return 1;
    if (score >= 40) return 2;
    return 3;
  }
};
