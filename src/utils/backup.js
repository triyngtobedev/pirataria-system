const Backup = {
  SCHEMA_VERSION: 1,
  SYSTEM_VERSION: '1.0.0',

  exportData() {
    const collections = DB.exportAll();
    const meta = {
      schemaVersion: this.SCHEMA_VERSION,
      systemVersion: this.SYSTEM_VERSION,
      exportedAt: new Date().toISOString(),
      counts: {},
    };
    DB._collections.forEach(c => {
      const val = collections[c];
      meta.counts[c] = Array.isArray(val) ? val.length : (val ? 1 : 0);
    });

    return { meta, collections };
  },

  download() {
    App._withLoading(null, 'Exportando backup...', function() {
      const data = Backup.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const filename = `pirataria-backup-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      App._toast('Backup exportado com sucesso.', 'success');
    });
  },

  validate(fileContent) {
    if (!fileContent || typeof fileContent !== 'object') {
      return { valid: false, error: 'Arquivo inválido ou corrompido.' };
    }
    if (!fileContent.meta || !fileContent.collections) {
      return { valid: false, error: 'Estrutura do arquivo não reconhecida. Verifique se é um backup do Body Art OS.' };
    }
    if (!fileContent.meta.schemaVersion) {
      return { valid: false, error: 'Versão do schema não encontrada. Arquivo incompatível.' };
    }
    if (fileContent.meta.schemaVersion > this.SCHEMA_VERSION) {
      return { valid: false, error: 'Backup de uma versão mais recente do sistema. Atualize o Body Art OS antes de restaurar.' };
    }
    const required = DB._collections;
    const missing = required.filter(c => !(c in fileContent.collections));
    if (missing.length > 0) {
      return { valid: false, error: 'Coleções ausentes no arquivo: ' + missing.join(', ') };
    }
    return { valid: true, meta: fileContent.meta };
  },

  restore(file, onComplete) {
    App._showLoading('Lendo arquivo de backup...');
    const reader = new FileReader();
    reader.onload = function(e) {
      App._hideLoading();
      try {
        const content = JSON.parse(e.target.result);
        const validation = Backup.validate(content);
        if (!validation.valid) {
          App._toast(validation.error, 'error');
          return;
        }

        const meta = validation.meta;
        const counts = meta.counts || {};
        const summary =
          `Data do backup: ${new Date(meta.exportedAt).toLocaleString('pt-BR')}\n` +
          `Versão: ${meta.systemVersion || '—'}\n` +
          `Clientes: ${counts.clientes || 0}\n` +
          `Agendamentos: ${counts.agenda || 0}\n` +
          `Histórico: ${counts.historico || 0}\n` +
          `Fila: ${counts.atendimento || 0}\n` +
          `Profissionais: ${counts.profissionais || 0}\n` +
          `Serviços: ${counts.servicos || 0}\n\n` +
          `Tem certeza que deseja substituir todos os dados atuais?`;

        App._confirm(summary, function() {
          DB.importAll(content.collections);
          localStorage.removeItem('pirataria_schema_version');
          const r = Migrations.run();
          App._toast('Dados restaurados com sucesso.' + (r.count > 0 ? ' ' + r.count + ' migração(ões) aplicada(s).' : ''), 'success');
          if (onComplete) onComplete();
        });
      } catch (err) {
        App._hideLoading();
        App._toast('Erro ao ler o arquivo. Verifique se é um JSON válido.', 'error');
      }
    };
    reader.onerror = function() {
      App._hideLoading();
      App._toast('Erro ao ler o arquivo.', 'error');
    };
    reader.readAsText(file);
  },
};
