const Notificacao = {
  PRIORIDADES: { baixa: 1, media: 2, alta: 3, critica: 4 },
  PRIORIDADE_LABELS: { baixa: 'Baixa', media: 'M\u00e9dia', alta: 'Alta', critica: 'Cr\u00edtica' },

  create: function(data) {
    if (data.origemModulo && data.origemId) {
      var existentes = DB.getNotificacoesPorOrigem(data.origemModulo, data.origemId);
      var temDuplicata = existentes.some(function(n) {
        return n.status === 'nao_lida' && n.titulo === data.titulo;
      });
      if (temDuplicata) return null;
    }
    var n = DB.addNotificacao(data);
    Notificacao._updateBadge();
    return n;
  },

  markAsRead: function(id) {
    DB.updateNotificacao(id, { status: 'lida', readAt: DB._now() });
    Notificacao._updateBadge();
  },

  markAllAsRead: function() {
    var naoLidas = DB.getNotificacoesNaoLidas();
    naoLidas.forEach(function(n) {
      DB.updateNotificacao(n.id, { status: 'lida', readAt: DB._now() });
    });
    Notificacao._updateBadge();
  },

  archive: function(id) {
    DB.updateNotificacao(id, { status: 'arquivada', archivedAt: DB._now() });
    Notificacao._updateBadge();
  },

  archiveAllRead: function() {
    var lidas = DB.getNotificacoes().filter(function(n) { return n.status === 'lida'; });
    lidas.forEach(function(n) {
      DB.updateNotificacao(n.id, { status: 'arquivada', archivedAt: DB._now() });
    });
    Notificacao._updateBadge();
  },

  list: function() {
    return DB.getNotificacoes();
  },

  unreadCount: function() {
    var cache = Notificacao._unreadCache;
    if (cache && Date.now() - cache.time < 2000) return cache.count;
    var count = DB.getNotificacoesNaoLidas().length;
    Notificacao._unreadCache = { count: count, time: Date.now() };
    return count;
  },

  _unreadCache: null,

  _updateBadge: function() {
    Notificacao._unreadCache = null;
    var el = document.getElementById('notifBadge');
    if (!el) return;
    var count = Notificacao.unreadCount();
    el.textContent = count > 99 ? '99+' : count || '';
    el.style.display = count > 0 ? 'flex' : 'none';
  },

  collectRecent: function() {
    var hoje = DB._today();
    var ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    var todas = DB.getNotificacoes().filter(function(n) { return n.status !== 'arquivada'; });

    return {
      hoje: todas.filter(function(n) { return n.createdAt && n.createdAt.slice(0, 10) === hoje; }),
      ontem: todas.filter(function(n) { return n.createdAt && n.createdAt.slice(0, 10) === ontem; }),
      anteriores: todas.filter(function(n) { return n.createdAt && n.createdAt.slice(0, 10) < ontem; }),
      naoLidas: Notificacao.unreadCount()
    };
  },

  clearByReference: function(modulo, origemId) {
    var existentes = DB.getNotificacoesPorOrigem(modulo, origemId);
    existentes.forEach(function(n) {
      if (n.status === 'nao_lida') DB.updateNotificacao(n.id, { status: 'lida', readAt: DB._now() });
    });
    Notificacao._updateBadge();
  },

  collectHojeResumo: function() {
    var naoLidas = Notificacao.unreadCount();
    var criticas = DB.getNotificacoesNaoLidas().filter(function(n) { return n.prioridade === 'critica'; }).length;
    return { naoLidas: naoLidas, criticas: criticas };
  }
};
