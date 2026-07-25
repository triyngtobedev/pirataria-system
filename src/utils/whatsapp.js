const WhatsApp = {
  KEY: 'pirataria_whatsapp',

  getConfig: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch(e) { return {}; }
  },

  saveConfig: function(data) {
    var current = this.getConfig();
    var merged = {};
    Object.keys(current).forEach(function(k) { merged[k] = current[k]; });
    Object.keys(data).forEach(function(k) { merged[k] = data[k]; });
    merged.updatedAt = new Date().toISOString();
    localStorage.setItem(this.KEY, JSON.stringify(merged));
    return merged;
  },

  getStatus: function() {
    var cfg = this.getConfig();
    return {
      configured: !!(cfg.apiUrl && cfg.apiKey && cfg.instanceName),
      apiUrl: cfg.apiUrl || '',
      instanceName: cfg.instanceName || '',
      connected: cfg.connected === true,
      ultimaSincronizacao: cfg.ultimaSincronizacao || null,
      falha: cfg.ultimaFalha || null,
      totalImportadas: cfg.totalImportadas || 0,
      falhasEnvio: cfg.falhasEnvio || 0
    };
  },

  testConnection: function() {
    var cfg = this.getConfig();
    if (!cfg.apiUrl || !cfg.apiKey || !cfg.instanceName) return Promise.reject('Configuração incompleta');
    return fetch(cfg.apiUrl + '/instance/connectionState/' + cfg.instanceName, {
      headers: { 'apiKey': cfg.apiKey, 'Content-Type': 'application/json' }
    }).then(function(r) { return r.json(); }).then(function(data) {
      var connected = data && (data.instance && data.instance.state === 'open');
      WhatsApp.saveConfig({ connected: connected, ultimaFalha: connected ? null : 'Conex\u00e3o fechada' });
      return connected;
    });
  },

  // Enviar mensagem de texto
  sendMessage: function(phone, text) {
    var cfg = this.getConfig();
    if (!cfg.apiUrl || !cfg.apiKey || !cfg.instanceName) return Promise.reject('WhatsApp não configurado');
    var phoneClean = phone.replace(/\D/g, '');
    if (!phoneClean) return Promise.reject('Telefone inválido');

    return fetch(cfg.apiUrl + '/message/sendText/' + cfg.instanceName, {
      method: 'POST',
      headers: { 'apiKey': cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phoneClean, text: text })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data && data.status && data.status === 'ERROR') {
        WhatsApp.saveConfig({ falhasEnvio: (WhatsApp.getConfig().falhasEnvio || 0) + 1, ultimaFalha: 'Falha ao enviar: ' + (data.message || 'erro') });
        throw new Error(data.message || 'Falha no envio');
      }
      return data;
    });
  },

  // Enviar mensagem com base na conversa do Inbox
  sendFromInbox: function(conversaId, text) {
    if (!text) return Promise.reject('Texto vazio');
    var c = DB.getConversa(conversaId);
    if (!c) return Promise.reject('Conversa não encontrada');
    var phone = c.phone || '';
    if (!phone) {
      if (c.clientId) {
        var cl = DB.getClient(c.clientId);
        if (cl && cl.phone) phone = cl.phone;
      }
    }
    if (!phone) return Promise.reject('Telefone não disponível');

    var self = this;
    return this.sendMessage(phone, text).then(function(result) {
      Inbox.addMensagem(conversaId, 'enviada', text);
      return result;
    });
  },

  // Importar conversas recentes
  syncMessages: function() {
    var cfg = this.getConfig();
    if (!cfg.apiUrl || !cfg.apiKey || !cfg.instanceName) return Promise.reject('WhatsApp não configurado');

    var self = this;
    return fetch(cfg.apiUrl + '/chat/find/' + cfg.instanceName, {
      headers: { 'apiKey': cfg.apiKey, 'Content-Type': 'application/json' }
    }).then(function(r) { return r.json(); }).then(function(data) {
      var chats = Array.isArray(data) ? data : (data.chats || []);
      var count = 0;

      chats.forEach(function(chat) {
        var remoteJid = chat.remoteJid || chat.id || '';
        var name = chat.name || chat.pushName || 'Contato ' + remoteJid.split('@')[0];
        var phone = remoteJid.split('@')[0] || '';

        // Buscar conversa existente ou criar
        var conversas = DB.getConversas();
        var existing = conversas.filter(function(c) { return c.phone && c.phone.replace(/\D/g, '').indexOf(phone) >= 0; });

        var conv;
        if (existing.length > 0) {
          conv = existing[0];
          DB.updateConversa(conv.id, { ultimaInteracao: new Date().toISOString(), clientName: name });
        } else {
          conv = DB.addConversa({ clientName: name, phone: phone, origin: 'whatsapp', status: 'aberta' });
        }

        // Buscar mensagens do chat
        if (chat.lastMessage) {
          var lastMsg = chat.lastMessage;
          var msgType = lastMsg.fromMe ? 'enviada' : 'recebida';
          var msgContent = lastMsg.text || lastMsg.body || lastMsg.message || '';
          if (msgContent) {
            DB.addMensagem({ conversaId: conv.id, type: msgType, content: msgContent });
          }
        }

        count++;
      });

      self.saveConfig({ ultimaSincronizacao: new Date().toISOString(), totalImportadas: (cfg.totalImportadas || 0) + count, ultimaFalha: null, connected: true });
      return count;
    }).catch(function(err) {
      self.saveConfig({ ultimaFalha: 'Erro ao sincronizar: ' + (err.message || 'erro') });
      throw err;
    });
  },

  // Coletar alertas para o Meu Dia
  getAlertas: function() {
    var status = this.getStatus();
    var alertas = [];
    if (!status.configured) {
      alertas.push({ tipo: 'config', mensagem: 'WhatsApp n\u00e3o configurado', gravidade: 'alta' });
    } else if (!status.connected) {
      alertas.push({ tipo: 'conexao', mensagem: 'WhatsApp desconectado', gravidade: 'alta' });
    }
    if (status.falha) {
      alertas.push({ tipo: 'falha', mensagem: status.falha, gravidade: 'media' });
    }
    if (status.falhasEnvio > 0) {
      alertas.push({ tipo: 'envio', mensagem: status.falhasEnvio + ' falha(s) de envio', gravidade: 'media' });
    }
    return alertas;
  },

  // Coletar insights para o AI Hub
  getInsights: function() {
    var insights = [];
    var status = this.getStatus();
    if (!status.configured) {
      insights.push({ tipo: 'alerta', prioridade: 2, titulo: 'WhatsApp Evolution n\u00e3o configurado', descricao: 'Configure a Evolution API no Studio para integrar o WhatsApp.', modulo: 'whatsapp', acao: 'Configurar', alvo: 'studio' });
    } else if (!status.connected) {
      insights.push({ tipo: 'alerta', prioridade: 1, titulo: 'WhatsApp desconectado', descricao: 'A instância Evolution API n\u00e3o est\u00e1 conectada.', modulo: 'whatsapp', acao: 'Verificar', alvo: 'studio' });
    }
    if (status.falhasEnvio > 0) {
      insights.push({ tipo: 'alerta', prioridade: 2, titulo: status.falhasEnvio + ' falha(s) de envio no WhatsApp', descricao: 'Mensagens n\u00e3o foram entregues.', modulo: 'whatsapp', acao: 'Ver Inbox', alvo: 'inbox' });
    }
    if (status.ultimaSincronizacao) {
      var horas = Math.floor((Date.now() - new Date(status.ultimaSincronizacao).getTime()) / 3600000);
      if (horas > 2) {
        insights.push({ tipo: 'info', prioridade: 2, titulo: '\u00daltima sincroniza\u00e7\u00e3o h\u00e1 ' + horas + 'h', descricao: 'Sincronize o WhatsApp para novas conversas.', modulo: 'whatsapp', acao: 'Sincronizar', alvo: '' });
      }
    }
    return insights;
  }
};
