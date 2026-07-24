const Migrations = {
  SCHEMA_VERSION: 1,
  _key: 'pirataria_schema_version',

  _getVersion() {
    try { return parseInt(localStorage.getItem(this._key), 10) || 0; } catch { return 0; }
  },

  _setVersion(v) {
    localStorage.setItem(this._key, String(v));
  },

  _list: [],

  register(fromVer, toVer, description, fn) {
    this._list.push({ from: fromVer, to: toVer, description, fn });
    this._list.sort((a, b) => a.from - b.from);
  },

  async run() {
    const fromVer = this._getVersion();
    const toVer = this.SCHEMA_VERSION;

    if (fromVer >= toVer) return { ok: true, count: 0 };

    const pending = this._list.filter(m => m.from >= fromVer && m.to <= toVer);
    if (pending.length === 0) {
      this._setVersion(toVer);
      return { ok: true, count: 0 };
    }

    const startTime = Date.now();
    let executed = 0;

    for (const migration of pending) {
      try {
        migration.fn();
        executed++;
        this._setVersion(migration.to);
      } catch (err) {
        const msg = 'Migração ' + migration.from + '→' + migration.to + ' falhou: ' + err.message;
        try { Audit.action('migration_error', 'system', '', msg); } catch {}
        App._toast(msg, 'error');
        return { ok: false, error: msg, executed };
      }
    }

    const elapsed = Date.now() - startTime;
    const logMsg = executed + ' migração(ões) executada(s) (' + elapsed + 'ms): ' + fromVer + ' → ' + toVer;
    try { Audit.action('migration', 'system', '', logMsg); } catch {}

    if (executed > 0) {
      App._toast('Banco atualizado: ' + logMsg, 'success');
    }

    return { ok: true, count: executed };
  },
};

// ─── Migrações registradas ───
// Para adicionar uma nova migração:
// Migrations.register(versãoAtual, novaVersão, 'descrição', function() {
//   const dados = DB._get('colecao');
//   // transformar dados
//   DB._set('colecao', dados);
// });

// Exemplo (já aplicado na versão 1, mantido como referência):
// Migrations.register(0, 1, 'Criar coleções iniciais', function() {
//   if (DB._get('usuarios').length === 0) {
//     DB._set('usuarios', []);
//   }
// });
