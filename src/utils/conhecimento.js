const Knowledge = {
  CATEGORIAS: ['Perfura\u00e7\u00f5es', 'Joias', 'Materiais', 'Esteriliza\u00e7\u00e3o', 'Cicatriza\u00e7\u00e3o', 'Complica\u00e7\u00f5es', 'Atendimento', 'Marketing', 'Financeiro', 'Gest\u00e3o'],
  TIPOS: ['procedimento', 'faq', 'protocolo', 'checklist', 'material', 'orientacao', 'joia', 'biosseguranca'],
  TIPO_LABELS: { procedimento: 'Procedimento', faq: 'FAQ', protocolo: 'Protocolo', checklist: 'Checklist', material: 'Material', orientacao: 'Orienta\u00e7\u00e3o', joia: 'Joia', biosseguranca: 'Biosseguran\u00e7a' },

  list: function(categoria) {
    var all = DB.getKBArticles();
    return categoria ? all.filter(function(a) { return a.categoria === categoria && a.ativo !== false; }) : all.filter(function(a) { return a.ativo !== false; });
  },

  get: function(id) { return DB.getKBArticle(id); },

  create: function(data) {
    var a = DB.addKBArticle(data);
    if (a) DB.addKBVersion({ articleId: a.id, versao: 1, usuario: 'sistema', observacao: 'Artigo criado' });
    return a;
  },

  update: function(id, data, observacao) {
    var old = DB.getKBArticle(id);
    if (!old) return null;
    data._novaversao = data._novaversao !== false;
    var a = DB.updateKBArticle(id, data);
    if (a && data._novaversao) {
      DB.addKBVersion({ articleId: id, versao: a.versao, usuario: observacao ? 'manual' : 'sistema', observacao: observacao || 'Atualizado' });
    }
    return a;
  },

  toggleFavorito: function(id) {
    var a = DB.getKBArticle(id);
    if (!a) return;
    DB.updateKBArticle(id, { favorito: !a.favorito, _novaversao: false });
  },

  getVersions: function(articleId) { return DB.getKBVersions(articleId); },

  search: function(query) { return DB.searchKB(query); },

  getMetrics: function() {
    var all = this.list();
    var ativos = all.filter(function(a) { return a.ativo !== false; }).length;
    var cats = {};
    all.forEach(function(a) { if (a.categoria) cats[a.categoria] = (cats[a.categoria] || 0) + 1; });
    var favoritos = all.filter(function(a) { return a.favorito; }).length;
    return { ativos: ativos, categorias: Object.keys(cats).length, favoritos: favoritos, distribuicao: cats };
  },

  getRelated: function(tipo, categoria) {
    return DB.getKBArticles().filter(function(a) {
      return a.ativo !== false && a.id !== 'x' && (!tipo || a.tipo === tipo) && (!categoria || a.categoria === categoria);
    }).slice(0, 5);
  }
};
